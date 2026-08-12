// Telemetry observability: LangfuseClient local-first tracing (Dexie v15
// `telemetryEvents`), root-cause classification, the guarded log* facade, and
// the engine wiring (hybrid search / RAG analysis / answer generation / rerank
// all emit events fire-and-forget without breaking the caller).

// @vitest-environment node
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db/db';
import {
  classifyRootCause,
  telemetryClient,
  telemetryEventId,
  listTelemetryEvents,
  summarizeTelemetry,
  clearTelemetryEvents,
  type TelemetryEvent,
} from '@/lib/observability/langfuseClient';
import {
  logRAG,
  logToolCall,
  logAgentNode,
  logThoughtTrajectory,
} from '@/lib/observability/telemetry';
import { buildDefaultRagIndex } from '@/engine/rag/codeCorpus';
import { hybridSearch } from '@/engine/rag/hybrid';
import { hybridSearchAsync } from '@/engine/rag/hybridSearch';
import { analyzeCompliance } from '@/engine/rag/analysis';
import { generateAnswer } from '@/engine/rag/generate';
import { rerankHybrid } from '@/engine/rag/reranker';

beforeEach(async () => {
  await db.telemetryEvents.clear();
});

afterAll(async () => {
  await db.telemetryEvents.clear();
});

describe('classifyRootCause', () => {
  it('flags poor-retrieval when no hits or confidence below threshold with clarification', () => {
    expect(classifyRootCause({ confidence: 0, threshold: 0.7, needsClarification: true, hitCount: 0 })).toBe('poor-retrieval');
    expect(classifyRootCause({ confidence: 0.2, threshold: 0.7, needsClarification: true, hitCount: 5 })).toBe('poor-retrieval');
  });

  it('flags outdated-doc when a citation references an unknown document', () => {
    expect(
      classifyRootCause({
        confidence: 0.9,
        threshold: 0.7,
        needsClarification: false,
        hitCount: 5,
        citedDocIds: ['by-laws-1977', 'old-edition-doc'],
        knownDocIds: ['by-laws-1977'],
      }),
    ).toBe('outdated-doc');
  });

  it('flags hallucination when the answer cites nothing known', () => {
    expect(
      classifyRootCause({
        confidence: 0.9,
        threshold: 0.7,
        needsClarification: false,
        hitCount: 5,
        citedDocIds: ['by-laws-1977'],
        knownDocIds: ['by-laws-1977'],
        citedInAnswer: false,
      }),
    ).toBe('hallucination');
  });

  it('returns none for a well-grounded answer', () => {
    expect(
      classifyRootCause({
        confidence: 0.9,
        threshold: 0.7,
        needsClarification: false,
        hitCount: 5,
        citedDocIds: ['by-laws-1977'],
        knownDocIds: ['by-laws-1977'],
        citedInAnswer: true,
      }),
    ).toBe('none');
  });
});

describe('LangfuseClient local persistence', () => {
  it('trace persists to Dexie and listTelemetryEvents returns newest-first', async () => {
    await telemetryClient.trace({
      id: telemetryEventId('evt'),
      type: 'hybrid-search',
      query: 'ceiling height',
      latencyMs: 12,
      payload: {},
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await telemetryClient.trace({
      id: telemetryEventId('evt'),
      type: 'rag',
      query: 'ventilation',
      latencyMs: 40,
      payload: {},
      createdAt: '2026-01-02T00:00:00.000Z',
    });
    const rows = await listTelemetryEvents({ limit: 10 });
    expect(rows).toHaveLength(2);
    expect(rows[0].type).toBe('rag');
  });

  it('listTelemetryEvents filters by projectId and type', async () => {
    await telemetryClient.trace({
      id: telemetryEventId('evt'),
      type: 'tool-call',
      projectId: 'proj-a',
      payload: { tool: 'calculate_brick_quantity' },
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await telemetryClient.trace({
      id: telemetryEventId('evt'),
      type: 'tool-call',
      projectId: 'proj-b',
      payload: { tool: 'calculate_tco' },
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect((await listTelemetryEvents({ projectId: 'proj-a' }))).toHaveLength(1);
    expect((await listTelemetryEvents({ type: 'tool-call' }))).toHaveLength(2);
    expect((await listTelemetryEvents({ projectId: 'proj-b', type: 'rag' }))).toHaveLength(0);
  });

  it('summarizeTelemetry aggregates latency, fallback rate, confidence and clarifications', async () => {
    await logRAG({
      query: 'q1',
      engineUsed: 'remote',
      fellBack: true,
      latencyMs: 50,
      confidence: 0.4,
      rerankThreshold: 0.7,
      hitCount: 1,
      needsClarification: true,
    });
    await logRAG({
      query: 'q2',
      engineUsed: 'local-rules',
      fellBack: false,
      latencyMs: 150,
      confidence: 0.9,
      rerankThreshold: 0.7,
      hitCount: 3,
      needsClarification: false,
    });
    const events = await listTelemetryEvents({ limit: 10 });
    const summary = summarizeTelemetry(events);
    expect(summary.total).toBe(2);
    expect(summary.byType.rag).toBe(2);
    expect(summary.byRootCause['poor-retrieval']).toBe(1);
    expect(summary.avgLatencyMs).toBe(100);
    expect(summary.fallbackRate).toBe(0.5);
    expect(summary.avgConfidence).toBe(0.65);
    expect(summary.clarifications).toBe(1);
  });

  it('clearTelemetryEvents empties the table', async () => {
    await telemetryClient.trace({
      id: telemetryEventId('evt'),
      type: 'rag',
      payload: {},
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await clearTelemetryEvents();
    expect(await listTelemetryEvents()).toHaveLength(0);
  });

  it('remote ship is disabled without VITE_LANGFUSE_* env vars and never throws', async () => {
    expect(telemetryClient.remoteEnabled).toBe(false);
    await expect(
      telemetryClient.trace({
        id: telemetryEventId('evt'),
        type: 'rag',
        payload: {},
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    ).resolves.toBeUndefined();
  });

  it('a malformed payload never breaks the caller (persistence swallows)', async () => {
    await expect(
      telemetryClient.trace({
        id: telemetryEventId('evt'),
        type: 'rag',
        payload: { nested: { deep: NaN } },
        createdAt: '2026-01-01T00:00:00.000Z',
      } as TelemetryEvent),
    ).resolves.toBeUndefined();
  });
});

describe('engine wiring emits events fire-and-forget', () => {
  it('hybridSearch records a hybrid-search event with top doc ids', async () => {
    const index = buildDefaultRagIndex();
    hybridSearch(index, 'minimum ceiling height of a habitable room', { k: 3 });
    const events = await listTelemetryEvents({ type: 'hybrid-search' });
    expect(events.length).toBe(1);
    expect(events[0].query).toBe('minimum ceiling height of a habitable room');
    expect(events[0].latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('analyzeCompliance records a rag event grounded in the embedded corpus', async () => {
    const index = buildDefaultRagIndex();
    const report = await analyzeCompliance(index, { query: 'minimum ceiling height', jurisdiction: 'zimbabwe', engine: 'local-rules' });
    expect(report.findings.length).toBeGreaterThan(0);
    const events = await listTelemetryEvents({ type: 'rag' });
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].payload.engineUsed).toBe('local-rules');
    expect(events[0].payload.jurisdiction).toBe('zimbabwe');
  });

  it('generateAnswer records an llm-gen event (local fallback without a key)', async () => {
    const index = buildDefaultRagIndex();
    const hits = await hybridSearchAsync(index, 'minimum ceiling height of a habitable room', { k: 3 });
    const result = await generateAnswer('minimum ceiling height of a habitable room', hits, { language: 'en' });
    expect(result.answer.length).toBeGreaterThan(0);
    const events = await listTelemetryEvents({ type: 'llm-gen' });
    expect(events.length).toBe(1);
    expect(events[0].payload.method).toBe('local');
    expect(typeof events[0].payload.tokenEstimate).toBe('number');
  });

  it('rerankHybrid records a rerank event including method and confidence', async () => {
    const index = buildDefaultRagIndex();
    const hits = await hybridSearchAsync(index, 'minimum ceiling height of a habitable room', { k: 3 });
    const ranked = await rerankHybrid('minimum ceiling height of a habitable room', hits, { method: 'lexical' });
    expect(ranked.hits.length).toBeGreaterThan(0);
    const events = await listTelemetryEvents({ type: 'rerank' });
    expect(events.length).toBe(1);
    expect(events[0].payload.method).toBe('lexical');
    expect(typeof events[0].payload.confidence).toBe('number');
  });

  it('the log* facade persists tool-call, agent-node and thought-trajectory events', async () => {
    await logToolCall({ tool: 'calculate_brick_quantity', ok: true, latencyMs: 7, args: { length_m: 10 } });
    await logAgentNode({ node: 'researcher', status: 'start' });
    await logThoughtTrajectory({ query: 'ceiling height', trajectory: ['rewrite', 'researcher', 'calculator'], decision: 'GO', interrupted: false, durationMs: 900 });
    const byType = summarizeTelemetry(await listTelemetryEvents({ limit: 10 })).byType;
    expect(byType['tool-call']).toBe(1);
    expect(byType['agent-node']).toBe(1);
    expect(byType['thought-trajectory']).toBe(1);
  });
});
