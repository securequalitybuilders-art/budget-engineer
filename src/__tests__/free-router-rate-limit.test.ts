// Gap #5 — free-tier rate-limit guardrail for the Bytez router.
//
// Proves (without ever requiring a paid key):
//   - per-window request/token budget enforcement (exhaustion blocks before network)
//   - 429 `Retry-After` parsing + exponential backoff retry, then graceful
//     fallback (structured miss) after `maxRetries` attempts
//   - the circuit breaker trips after 3× 429 in the window and skips the
//     provider without a network call while open
//   - the budget tracker increments on every attempt and on success
//   - a `rate-limit` Langfuse-style trace is persisted per 429

// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db/db';
import { listTelemetryEvents, type TelemetryEvent } from '@/lib/observability/langfuseClient';
import type { ChatMessage } from '@/lib/ai/remote-providers';
import {
  BYTEZ_RATE_LIMIT,
  backoffDelayMs,
  budgetAllows,
  bytezAvailable,
  circuitStats,
  consumeBudget,
  embedFree,
  estimateTokens,
  generateFree,
  getRateLimitState,
  isCircuitOpen,
  parseRetryAfter,
  recordRateLimit429,
  resetRateLimitState,
} from '@/lib/llm/freeRouter';

const MSG = [{ role: 'user', content: 'minimum ceiling height of a habitable room?' }] as ChatMessage[];

type FetchHandler = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

let fetchCalls = 0;
let handler: FetchHandler = () => Promise.resolve(new Response('ok', { status: 200 }));

function always429(retryAfter = '2'): void {
  handler = () => Promise.resolve(new Response('rate limited', { status: 429, headers: { 'retry-after': retryAfter } }));
}

function alwaysOk(body: unknown = { error: null, output: { role: 'assistant', content: 'hello' } }): void {
  handler = () =>
    Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }));
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 10));
}

beforeEach(async () => {
  fetchCalls = 0;
  handler = () => Promise.resolve(new Response('ok', { status: 200 }));
  vi.stubGlobal(
    'fetch',
    ((input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls += 1;
      return handler(input, init);
    }) as typeof fetch,
  );
  resetRateLimitState();
  await db.telemetryEvents.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Retry-After parsing', () => {
  it('parses delay-seconds into milliseconds', () => {
    expect(parseRetryAfter('2')).toBe(2000);
    expect(parseRetryAfter('0')).toBe(0);
  });

  it('parses an HTTP-date', () => {
    const future = new Date(Date.now() + 5000).toUTCString();
    const ms = parseRetryAfter(future);
    expect(ms).toBeGreaterThanOrEqual(4000);
    expect(ms).toBeLessThanOrEqual(6000);
  });

  it('falls back for missing/unparseable values', () => {
    expect(parseRetryAfter(null)).toBe(1000);
    expect(parseRetryAfter('soon')).toBe(1000);
  });
});

describe('exponential backoff with jitter', () => {
  it('doubles from the base with injectable jitter', () => {
    expect(backoffDelayMs(0, { jitterMs: () => 0 })).toBe(1000);
    expect(backoffDelayMs(1, { jitterMs: () => 0 })).toBe(2000);
    expect(backoffDelayMs(2, { jitterMs: () => 0 })).toBe(4000);
  });

  it('caps at the max delay', () => {
    expect(backoffDelayMs(5, { jitterMs: () => 0 })).toBe(30_000);
  });

  it('honours Retry-After as a floor and respects the cap', () => {
    expect(backoffDelayMs(1, { jitterMs: () => 0 }, 5000)).toBe(5000);
    expect(backoffDelayMs(5, { jitterMs: () => 0 }, 100_000)).toBe(30_000);
  });

  it('defaults jitter to a 0–500ms range', () => {
    const d = backoffDelayMs(0);
    expect(d).toBeGreaterThanOrEqual(1000);
    expect(d).toBeLessThanOrEqual(1500);
  });
});

describe('token estimation', () => {
  it('estimates ~4 chars/token and never returns 0 for non-empty text', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('hello world')).toBe(3);
  });
});

describe('budget tracker', () => {
  it('allows within the default window and reflects consumed requests', () => {
    expect(budgetAllows('bytez', BYTEZ_RATE_LIMIT)).toBe(true);
    consumeBudget('bytez', 25, BYTEZ_RATE_LIMIT);
    expect(getRateLimitState('bytez')?.requests).toBe(1);
    expect(getRateLimitState('bytez')?.tokens).toBe(25);
    expect(budgetAllows('bytez', BYTEZ_RATE_LIMIT)).toBe(true);
  });

  it('blocks once the request budget is exhausted', () => {
    const limit = { requestsPerWindow: 2, windowMs: 60_000 };
    consumeBudget('bytez', 1, limit);
    consumeBudget('bytez', 1, limit);
    expect(budgetAllows('bytez', limit)).toBe(false);
  });

  it('blocks once the token budget is exhausted', () => {
    const limit = { requestsPerWindow: 100, windowMs: 60_000, maxTokensPerWindow: 10 };
    consumeBudget('bytez', 10, limit);
    expect(budgetAllows('bytez', limit)).toBe(false);
  });

  it('resets the window after windowMs elapses', () => {
    const limit = { requestsPerWindow: 1, windowMs: 60_000 };
    consumeBudget('bytez', 1, limit, 1000);
    expect(budgetAllows('bytez', limit, 1000)).toBe(false);
    expect(budgetAllows('bytez', limit, 1000 + 60_000)).toBe(true);
  });
});

describe('429 backoff-retry then graceful fallback', () => {
  it('retries with backoff honouring Retry-After, then returns a structured miss', async () => {
    always429('2');
    const sleeps: number[] = [];
    const res = await generateFree(MSG, {
      apiKey: 'test-key',
      maxRetries: 3,
      jitterMs: () => 0,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      now: () => 1_000_000,
    });

    expect(fetchCalls).toBe(4);
    expect(sleeps.length).toBe(3);
    expect(sleeps[0]).toBe(2000);
    expect(sleeps[1]).toBe(2000);
    expect(sleeps[2]).toBe(4000);
    expect(res.text).toBeNull();
    expect(res.error).toContain('429');
    expect(getRateLimitState('bytez')?.requests).toBe(4);
  });

  it('honours the retry-exhausted fallback decision in the persisted trace', async () => {
    always429('2');
    const res = await generateFree(MSG, {
      apiKey: 'test-key',
      maxRetries: 1,
      jitterMs: () => 0,
      sleep: async () => {},
      now: () => 1_000_000,
    });
    expect(res.text).toBeNull();

    await flush();
    const events = await listTelemetryEvents({ type: 'rate-limit' });
    expect(events.length).toBe(2);
    const decisions = events.map((e) => (e.payload as { fallbackDecision?: string }).fallbackDecision);
    expect(decisions.filter((d) => d === 'retry').length).toBe(1);
    expect(decisions.filter((d) => d === 'fallback').length).toBe(1);
    for (const e of events) {
      expect((e.payload as { provider?: string }).provider).toBe('bytez');
      expect(e.type).toBe('rate-limit');
    }
  });

  it('does not retry non-429 failures', async () => {
    handler = () => Promise.resolve(new Response('boom', { status: 503, statusText: 'Unavailable' }));
    const res = await generateFree(MSG, { apiKey: 'test-key', maxRetries: 3, sleep: async () => {} });
    expect(fetchCalls).toBe(1);
    expect(res.text).toBeNull();
    expect(res.error).toContain('503');
  });
});

describe('circuit breaker', () => {
  it('trips after 3× 429 in the window and skips the provider while open', async () => {
    always429('1');
    for (let i = 0; i < 3; i++) {
      const res = await generateFree(MSG, { apiKey: 'test-key', maxRetries: 0, now: () => 1_000_000 });
      expect(res.text).toBeNull();
    }
    expect(circuitStats('bytez', 1_000_000).failures).toBe(3);
    expect(circuitStats('bytez', 1_000_000).opened).toBe(true);

    const skipped = await generateFree(MSG, { apiKey: 'test-key', maxRetries: 0, now: () => 1_000_000 });
    expect(fetchCalls).toBe(3);
    expect(skipped.text).toBeNull();
    expect(skipped.error).toContain('circuit open');
  });

  it('opens at the trip threshold and recovers after the open window', () => {
    resetRateLimitState();
    recordRateLimit429('bytez', 1000);
    recordRateLimit429('bytez', 2000);
    expect(isCircuitOpen('bytez', 3000)).toBe(false);
    recordRateLimit429('bytez', 3000);
    expect(isCircuitOpen('bytez', 3000)).toBe(true);

    expect(isCircuitOpen('bytez', 3000 + 600_000 - 1)).toBe(true);
    expect(isCircuitOpen('bytez', 3000 + 600_000)).toBe(false);
  });

  it('forgets failures outside the 5-minute window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    resetRateLimitState();
    recordRateLimit429('bytez');
    vi.advanceTimersByTime(10_000);
    recordRateLimit429('bytez');
    vi.advanceTimersByTime(10_000);
    recordRateLimit429('bytez');
    expect(circuitStats('bytez').failures).toBe(3);
    vi.advanceTimersByTime(300_000);
    recordRateLimit429('bytez');
    expect(circuitStats('bytez').failures).toBe(2);
    vi.useRealTimers();
  });
});

describe('budget enforcement blocks before the network', () => {
  it('returns a structured miss once the request budget is spent', async () => {
    alwaysOk();
    const limit = { requestsPerWindow: 2, windowMs: 60_000 };
    for (let i = 0; i < 2; i++) {
      const res = await generateFree(MSG, { apiKey: 'test-key', rateLimit: limit });
      expect(res.text).toBe('hello');
    }
    const blocked = await generateFree(MSG, { apiKey: 'test-key', rateLimit: limit });
    expect(fetchCalls).toBe(2);
    expect(blocked.text).toBeNull();
    expect(blocked.error).toContain('budget exhausted');
  });

  it('returns a structured miss once the token budget is spent', async () => {
    alwaysOk();
    const limit = { requestsPerWindow: 100, windowMs: 60_000, maxTokensPerWindow: 5 };
    const res = await generateFree(MSG, { apiKey: 'test-key', rateLimit: limit });
    expect(res.text).toBe('hello');
    expect(getRateLimitState('bytez')?.tokens).toBeGreaterThan(5);
    const blocked = await generateFree(MSG, { apiKey: 'test-key', rateLimit: limit });
    expect(fetchCalls).toBe(1);
    expect(blocked.error).toContain('budget exhausted');
  });
});

describe('embed path', () => {
  it('falls back on 429 without retrying past maxRetries', async () => {
    always429('1');
    const res = await embedFree('hello', { apiKey: 'test-key', maxRetries: 0 });
    expect(fetchCalls).toBe(1);
    expect(res.embedding).toBeNull();
    expect(res.error).toContain('429');
  });

  it('returns an embedding on success', async () => {
    alwaysOk({ error: null, output: [0.1, 0.2, 0.3] });
    const res = await embedFree('hello', { apiKey: 'test-key' });
    expect(res.embedding).toEqual([0.1, 0.2, 0.3]);
  });
});

describe('availability helpers', () => {
  it('reports availability from an explicit key only', () => {
    expect(bytezAvailable()).toBe(false);
    expect(bytezAvailable('  key  ')).toBe(true);
  });
});

describe('trace persistence shape', () => {
  it('persists provider/model/attempt/retryAfterMs in rate-limit events', async () => {
    always429('3');
    await generateFree(MSG, { apiKey: 'test-key', maxRetries: 0, now: () => 1_000_000 });
    await flush();
    const events = await listTelemetryEvents({ type: 'rate-limit' });
    expect(events.length).toBe(1);
    const evt = events[0] as TelemetryEvent;
    expect(evt.type).toBe('rate-limit');
    const payload = evt.payload as { provider?: string; model?: string; retryAfterMs?: number; attempt?: number };
    expect(payload.provider).toBe('bytez');
    expect(payload.model).toBe('Qwen/Qwen3-4B');
    expect(payload.retryAfterMs).toBe(3000);
    expect(payload.attempt).toBe(0);
  });
});
