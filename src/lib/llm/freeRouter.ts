// Free-tier LLM router (Bytez open-source models).
//
// Local-first, no-backend constitution: the app never requires a key. When a
// Bytez API key is present (VITE_BYTEZ_API_KEY or an explicit `apiKey`), this
// module routes chat completions and embeddings to Bytez's serverless open-
// source endpoint; otherwise it returns a structured miss so callers can fall
// back to deterministic local engines. The module never throws — callers read
// the `error` field and degrade.
//
// Free-tier rate-limit guardrail (Gap #5):
//   - Per-window request/token budget (`BYTEZ_RATE_LIMIT`, overridable via
//     `opts.rateLimit`). Once the window's request or token budget is spent,
//     further calls return a structured miss BEFORE hitting the network.
//   - On HTTP 429, the `Retry-After` header is honoured (numeric seconds or
//     HTTP-date) and the request is retried with exponential backoff
//     `min(2^attempt * baseMs + jitter, maxMs)`, up to `maxRetries` (default
//     3). After that the provider is considered exhausted and we fall back
//     (structured miss) so callers degrade to local engines.
//   - Circuit breaker: 3× 429 within a 5-minute window trips the breaker
//     open for 10 minutes; while open the provider is skipped entirely
//     without a network call.
//   - Every 429 (and the retry/fallback decision) is traced to the local
//     Langfuse-style telemetry store (`rate-limit` events) unless
//     `opts.trace === false`.
//
// Verified against https://docs.bytez.com (2026):
//   POST https://api.bytez.com/models/v2/{modelId}
//   Authorization: BYTEZ_KEY            (raw key, not Bearer)
//   feature-extraction: { "text": "…" } -> { "error": null, "output": number[] }
//   chat: { "messages": [{role,content}], "params": {…} }
//         -> { "error": null, "output": { "role": "assistant", "content": "…" } }
// Open-source models are free; closed-source require a provider key.

import type { ChatMessage } from '@/lib/ai/remote-providers'
import { telemetryClient } from '@/lib/observability/langfuseClient'

const BYTEZ_BASE = 'https://api.bytez.com/models/v2'
const REQUEST_TIMEOUT_MS = 30_000
const PROVIDER_ID = 'bytez'
const BACKOFF_BASE_MS = 1_000
const BACKOFF_MAX_MS = 30_000
const DEFAULT_MAX_RETRIES = 3
const CIRCUIT_TRIP_THRESHOLD = 3
const CIRCUIT_WINDOW_MS = 5 * 60_000
const CIRCUIT_OPEN_MS = 10 * 60_000

export const BYTEZ_MODELS = {
  chat: 'Qwen/Qwen3-4B',
  embed: 'BAAI/bge-m3',
} as const

export interface FreeGenResult {
  text: string | null
  error?: string
}

export interface FreeEmbedResult {
  embedding: number[] | null
  error?: string
}

/** Per-window request/token budget for a provider. */
export interface ProviderRateLimit {
  requestsPerWindow: number
  windowMs: number
  /** Optional cap on estimated tokens consumed in a single window. */
  maxTokensPerWindow?: number
}

/**
 * Conservative default for Bytez's free tier. There is no machine-readable
 * Bytez rate-limit metadata in the repo today, so the budget is derived here
 * (callers can override with `opts.rateLimit`).
 */
export const BYTEZ_RATE_LIMIT: ProviderRateLimit = {
  requestsPerWindow: 60,
  windowMs: 60_000,
  maxTokensPerWindow: 40_000,
}

/** Live budget snapshot for a provider (testable/observable). */
export interface RateLimitState {
  requests: number
  tokens: number
  windowStart: number
}

interface BreakerState {
  failures: number[]
  openedAt: number | null
}

const budgets = new Map<string, RateLimitState>()
const breakers = new Map<string, BreakerState>()

export interface FreeChatOptions {
  apiKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
  rateLimit?: ProviderRateLimit
  maxRetries?: number
  backoffBaseMs?: number
  backoffMaxMs?: number
  jitterMs?: () => number
  sleep?: (ms: number) => Promise<void>
  now?: () => number
  trace?: boolean
  projectId?: string
  runId?: string
}

export interface FreeEmbedOptions {
  apiKey?: string
  model?: string
  rateLimit?: ProviderRateLimit
  maxRetries?: number
  backoffBaseMs?: number
  backoffMaxMs?: number
  jitterMs?: () => number
  sleep?: (ms: number) => Promise<void>
  now?: () => number
  trace?: boolean
  projectId?: string
  runId?: string
}

export function resolveBytezKey(override?: string): string | undefined {
  if (override && override.trim()) return override.trim()
  const fromEnv = (import.meta.env?.VITE_BYTEZ_API_KEY as string | undefined)?.trim()
  return fromEnv || undefined
}

export function bytezAvailable(override?: string): boolean {
  return Boolean(resolveBytezKey(override))
}

/** Rough token estimate: ~4 chars per token, clamped to a minimum of 1. */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}

/**
 * Parse a `Retry-After` header value (RFC 9110: delay-seconds or HTTP-date).
 * Falls back to `fallbackMs` when the value is absent/unparseable.
 */
export function parseRetryAfter(value: string | null | undefined, fallbackMs = BACKOFF_BASE_MS): number {
  if (!value) return fallbackMs
  const trimmed = value.trim()
  const seconds = Number(trimmed)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const time = Date.parse(trimmed)
  if (Number.isFinite(time)) return Math.max(0, time - Date.now())
  return fallbackMs
}

/**
 * Exponential backoff with jitter: `min(2^attempt * baseMs + jitter, maxMs)`.
 * When a `Retry-After` value is present it is honoured as a floor (capped at
 * `maxMs`).
 */
export function backoffDelayMs(
  attempt: number,
  opts: { baseMs?: number; maxMs?: number; jitterMs?: () => number } = {},
  retryAfterMs?: number,
): number {
  const baseMs = opts.baseMs ?? BACKOFF_BASE_MS
  const maxMs = opts.maxMs ?? BACKOFF_MAX_MS
  const jitterMs = opts.jitterMs ?? (() => Math.random() * 500)
  const exponential = Math.min(baseMs * 2 ** attempt, maxMs)
  const delay = Math.min(exponential + jitterMs(), maxMs)
  if (retryAfterMs !== undefined && Number.isFinite(retryAfterMs)) {
    return Math.min(Math.max(delay, retryAfterMs), maxMs)
  }
  return delay
}

function budgetFor(providerId: string, limit: ProviderRateLimit, now: number): RateLimitState {
  const current = budgets.get(providerId)
  if (current && now - current.windowStart < limit.windowMs) return current
  const fresh: RateLimitState = { requests: 0, tokens: 0, windowStart: now }
  budgets.set(providerId, fresh)
  return fresh
}

/** True when the provider still has request (and token) budget in this window. */
export function budgetAllows(providerId: string, limit: ProviderRateLimit, now = Date.now()): boolean {
  const b = budgetFor(providerId, limit, now)
  if (b.requests >= limit.requestsPerWindow) return false
  if (limit.maxTokensPerWindow !== undefined && b.tokens >= limit.maxTokensPerWindow) return false
  return true
}

/** Record one HTTP attempt against the provider budget. */
export function consumeBudget(providerId: string, tokens: number, limit: ProviderRateLimit, now = Date.now()): RateLimitState {
  const b = budgetFor(providerId, limit, now)
  b.requests += 1
  b.tokens += tokens
  return b
}

export function getRateLimitState(providerId = PROVIDER_ID): RateLimitState | undefined {
  return budgets.get(providerId)
}

function breakerFor(providerId: string): BreakerState {
  let s = breakers.get(providerId)
  if (!s) {
    s = { failures: [], openedAt: null }
    breakers.set(providerId, s)
  }
  return s
}

/** Record a 429; tripping the breaker once `CIRCUIT_TRIP_THRESHOLD` failures land in the window. */
export function recordRateLimit429(providerId: string, now = Date.now()): void {
  const s = breakerFor(providerId)
  s.failures.push(now)
  s.failures = s.failures.filter((t) => now - t <= CIRCUIT_WINDOW_MS)
  if (s.failures.length >= CIRCUIT_TRIP_THRESHOLD) s.openedAt = now
}

/** True while the breaker is open (provider skipped without a network call). */
export function isCircuitOpen(providerId: string, now = Date.now()): boolean {
  const s = breakerFor(providerId)
  if (s.openedAt !== null) {
    if (now - s.openedAt >= CIRCUIT_OPEN_MS) {
      s.openedAt = null
      s.failures = []
      return false
    }
    return true
  }
  return false
}

/** Current breaker state for a provider (testable/observable). */
export function circuitStats(providerId = PROVIDER_ID, now = Date.now()): { failures: number; opened: boolean } {
  const opened = isCircuitOpen(providerId, now)
  const s = breakerFor(providerId)
  return { failures: s.failures.length, opened }
}

/** Reset all in-memory budget/breaker state (test isolation / manual reset). */
export function resetRateLimitState(): void {
  budgets.clear()
  breakers.clear()
}

function estimateTokensForBody(body: unknown): number {
  if (!body || typeof body !== 'object') return 0
  const b = body as { messages?: ChatMessage[]; text?: string; params?: { max_tokens?: number } }
  const textTokens = estimateTokens((b.messages ?? []).map((m) => m.content).join(' ') || b.text || '')
  const maxTokens = typeof b.params?.max_tokens === 'number' ? b.params.max_tokens : 0
  return textTokens + maxTokens
}

type PostResult =
  | { ok: true; data: unknown }
  | {
      ok: false
      status?: number
      retryAfterMs?: number
      fallbackDecision: 'retry-exhausted' | 'circuit-open' | 'budget-exhausted' | 'error'
      error: string
    }

interface PostBytezOpts {
  apiKey: string
  model: string
  body: unknown
  rateLimit: ProviderRateLimit
  maxRetries: number
  backoffBaseMs?: number
  backoffMaxMs?: number
  jitterMs?: () => number
  sleep?: (ms: number) => Promise<void>
  now?: () => number
  trace?: boolean
  projectId?: string
  runId?: string
}

async function postBytezWithRetry(opts: PostBytezOpts): Promise<PostResult> {
  const now = opts.now ?? Date.now
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const trace = opts.trace !== false

  if (isCircuitOpen(PROVIDER_ID, now())) {
    return { ok: false, fallbackDecision: 'circuit-open', error: 'Bytez degraded: circuit open (repeated rate limiting)' }
  }
  if (!budgetAllows(PROVIDER_ID, opts.rateLimit, now())) {
    return { ok: false, fallbackDecision: 'budget-exhausted', error: 'Bytez rate limit budget exhausted for this window' }
  }

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    consumeBudget(PROVIDER_ID, estimateTokensForBody(opts.body), opts.rateLimit, now())
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const res = await fetch(`${BYTEZ_BASE}/${encodeURIComponent(opts.model)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: opts.apiKey },
        body: JSON.stringify(opts.body),
        signal: controller.signal,
      })
      if (res.status === 429) {
        const retryAfterMs = parseRetryAfter(res.headers.get('retry-after'))
        recordRateLimit429(PROVIDER_ID, now())
        if (trace) {
          void telemetryClient
            .traceRateLimit({
              provider: PROVIDER_ID,
              model: opts.model,
              retryAfterMs,
              attempt,
              fallbackDecision: attempt < opts.maxRetries ? 'retry' : 'fallback',
              projectId: opts.projectId,
              runId: opts.runId,
            })
            .catch(() => {})
        }
        if (attempt >= opts.maxRetries) {
          return {
            ok: false,
            status: 429,
            retryAfterMs,
            fallbackDecision: 'retry-exhausted',
            error: `Bytez rate limited (429) after ${opts.maxRetries + 1} attempts`,
          }
        }
        const delay = backoffDelayMs(
          attempt,
          { baseMs: opts.backoffBaseMs, maxMs: opts.backoffMaxMs, jitterMs: opts.jitterMs },
          retryAfterMs,
        )
        await sleep(delay)
        continue
      }
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        return {
          ok: false,
          status: res.status,
          fallbackDecision: 'error',
          error: `${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 200)}` : ''}`,
        }
      }
      return { ok: true, data: await res.json() }
    } catch (err) {
      return { ok: false, fallbackDecision: 'error', error: err instanceof Error ? err.message : String(err) }
    } finally {
      clearTimeout(timer)
    }
  }
  return { ok: false, fallbackDecision: 'error', error: 'Unreachable' }
}

export async function generateFree(messages: ChatMessage[], opts: FreeChatOptions = {}): Promise<FreeGenResult> {
  const apiKey = resolveBytezKey(opts.apiKey)
  if (!apiKey) return { text: null, error: 'No Bytez API key configured' }
  const result = await postBytezWithRetry({
    apiKey,
    model: opts.model ?? BYTEZ_MODELS.chat,
    body: {
      messages,
      params: { temperature: opts.temperature ?? 0, max_tokens: opts.maxTokens ?? 512 },
    },
    rateLimit: opts.rateLimit ?? BYTEZ_RATE_LIMIT,
    maxRetries: opts.maxRetries ?? DEFAULT_MAX_RETRIES,
    backoffBaseMs: opts.backoffBaseMs,
    backoffMaxMs: opts.backoffMaxMs,
    jitterMs: opts.jitterMs,
    sleep: opts.sleep,
    now: opts.now,
    trace: opts.trace,
    projectId: opts.projectId,
    runId: opts.runId,
  })
  if (!result.ok) return { text: null, error: result.error }
  const data = result.data as { error?: string | null; output?: { role?: string; content?: string } }
  if (data.error) return { text: null, error: data.error }
  const text = data.output?.content?.trim()
  if (!text) return { text: null, error: 'Empty response from Bytez' }
  return { text }
}

export async function embedFree(text: string, opts: FreeEmbedOptions = {}): Promise<FreeEmbedResult> {
  const apiKey = resolveBytezKey(opts.apiKey)
  if (!apiKey) return { embedding: null, error: 'No Bytez API key configured' }
  const result = await postBytezWithRetry({
    apiKey,
    model: opts.model ?? BYTEZ_MODELS.embed,
    body: { text },
    rateLimit: opts.rateLimit ?? BYTEZ_RATE_LIMIT,
    maxRetries: opts.maxRetries ?? DEFAULT_MAX_RETRIES,
    backoffBaseMs: opts.backoffBaseMs,
    backoffMaxMs: opts.backoffMaxMs,
    jitterMs: opts.jitterMs,
    sleep: opts.sleep,
    now: opts.now,
    trace: opts.trace,
    projectId: opts.projectId,
    runId: opts.runId,
  })
  if (!result.ok) return { embedding: null, error: result.error }
  const data = result.data as { error?: string | null; output?: number[] }
  if (data.error) return { embedding: null, error: data.error }
  if (!Array.isArray(data.output) || data.output.length === 0) return { embedding: null, error: 'Invalid embedding from Bytez' }
  return { embedding: data.output }
}
