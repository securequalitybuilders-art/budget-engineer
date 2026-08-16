// Free-tier LLM router (multi-provider).
//
// Local-first, no-backend constitution: the app never requires a key. When a
// free-tier API key is present (an env var or an explicit `apiKey`), this
// module routes chat completions and embeddings to that provider; otherwise it
// returns a structured miss so callers can fall back to deterministic local
// engines. The module never throws — callers read the `error` field and
// degrade.
//
// Providers (all free tiers, no credit card):
//   bytez       — Bytez open-source serverless models (chat + embed)
//   nvidia      — NVIDIA NIM / integrate.api.nvidia.com (chat + embed)
//   huggingface — HF Inference API, open-source models (chat + embed)
//   openrouter  — OpenRouter :free models (chat only)
//   groq        — Groq LPU, llama-3.3-70b-versatile (chat only)
//
// Provider selection:
//   - `opts.providers`  — explicit ordered chain (highest precedence).
//   - `opts.provider`   — a single provider.
//   - `opts.apiKey`     — treated as a Bytez key (backward-compat: the router
//     was Bytez-only; a raw key kept as `Authorization` for Bytez).
//   - otherwise         — auto chain: every provider whose key is present, in
//     registry order (bytez, nvidia, huggingface, openrouter, groq).
//   On failure (network/rate-limit/parse) the router tries the next provider
//   in the chain and returns the last error if all fail.
//
// Free-tier rate-limit guardrail (Gap #5):
//   - Per-window request/token budget per provider (overridable via
//     `opts.rateLimit`). Once the window's request or token budget is spent,
//     further calls return a structured miss BEFORE hitting the network.
//   - On HTTP 429, the `Retry-After` header is honoured (numeric seconds or
//     HTTP-date) and the request is retried with exponential backoff
//     `min(2^attempt * baseMs + jitter, maxMs)`, up to `maxRetries` (default
//     3). After that the provider is considered exhausted and we fall back to
//     the next provider in the chain (structured miss) so callers degrade to
//     local engines.
//   - Circuit breaker: 3× 429 within a 5-minute window trips the breaker open
//     for 10 minutes; while open the provider is skipped entirely without a
//     network call.
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

import type { ChatMessage } from '@/lib/ai/remote-providers'
import { telemetryClient } from '@/lib/observability/langfuseClient'

const BYTEZ_BASE = 'https://api.bytez.com/models/v2'
const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1'
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const GROQ_BASE = 'https://api.groq.com/openai/v1'
const HF_BASE = 'https://api-inference.huggingface.co'
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

export const NVIDIA_RATE_LIMIT: ProviderRateLimit = {
  requestsPerWindow: 60,
  windowMs: 60_000,
  maxTokensPerWindow: 40_000,
}

export const HF_RATE_LIMIT: ProviderRateLimit = {
  requestsPerWindow: 30,
  windowMs: 60_000,
  maxTokensPerWindow: 20_000,
}

export const OPENROUTER_RATE_LIMIT: ProviderRateLimit = {
  requestsPerWindow: 60,
  windowMs: 60_000,
  maxTokensPerWindow: 40_000,
}

export const GROQ_RATE_LIMIT: ProviderRateLimit = {
  requestsPerWindow: 30,
  windowMs: 60_000,
  maxTokensPerWindow: 30_000,
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

export type FreeProviderId = 'bytez' | 'nvidia' | 'huggingface' | 'openrouter' | 'groq'
export type ProviderKind = 'chat' | 'embed'

export interface FreeProviderConfig {
  id: FreeProviderId
  label: string
  envKey: string
  kinds: ProviderKind[]
  chatModel: string
  embedModel?: string
  rateLimit: ProviderRateLimit
  auth: (apiKey: string) => string
  chatUrl: (model: string) => string
  embedUrl?: (model: string) => string
  chatBody: (messages: ChatMessage[], opts: { model: string; temperature?: number; maxTokens?: number }) => unknown
  embedBody?: (text: string, model: string) => unknown
  parseChat: (data: unknown) => string
  parseEmbed?: (data: unknown) => number[]
}

const BYTEZ: FreeProviderConfig = {
  id: 'bytez',
  label: 'Bytez',
  envKey: 'VITE_BYTEZ_API_KEY',
  kinds: ['chat', 'embed'],
  chatModel: BYTEZ_MODELS.chat,
  embedModel: BYTEZ_MODELS.embed,
  rateLimit: BYTEZ_RATE_LIMIT,
  auth: (apiKey) => apiKey,
  chatUrl: (model) => `${BYTEZ_BASE}/${encodeURIComponent(model)}`,
  embedUrl: (model) => `${BYTEZ_BASE}/${encodeURIComponent(model)}`,
  chatBody: (messages, opts) => ({
    messages,
    params: { temperature: opts.temperature ?? 0, max_tokens: opts.maxTokens ?? 512 },
  }),
  embedBody: (text) => ({ text }),
  parseChat: (data) => {
    const d = data as { error?: string | null; output?: { role?: string; content?: string } }
    if (d.error) throw new Error(String(d.error))
    const text = d.output?.content?.trim()
    if (!text) throw new Error('Empty response')
    return text
  },
  parseEmbed: (data) => {
    const d = data as { error?: string | null; output?: unknown }
    if (d.error) throw new Error(String(d.error))
    if (Array.isArray(d.output) && d.output.length > 0 && d.output.every((v) => typeof v === 'number')) {
      return d.output as number[]
    }
    throw new Error('Invalid embedding')
  },
}

const NVIDIA: FreeProviderConfig = {
  id: 'nvidia',
  label: 'Nvidia',
  envKey: 'VITE_NVIDIA_API_KEY',
  kinds: ['chat', 'embed'],
  chatModel: 'meta/llama-3.3-70b-instruct',
  embedModel: 'nvidia/nv-embed-qa-4',
  rateLimit: NVIDIA_RATE_LIMIT,
  auth: (apiKey) => `Bearer ${apiKey}`,
  chatUrl: () => `${NVIDIA_BASE}/chat/completions`,
  embedUrl: () => `${NVIDIA_BASE}/embeddings`,
  chatBody: (messages, opts) => ({
    model: opts.model,
    messages,
    temperature: opts.temperature ?? 0,
    max_tokens: opts.maxTokens ?? 512,
  }),
  embedBody: (text, model) => ({ model, input: [text] }),
  parseChat: (data) => {
    const d = data as { error?: string | null; choices?: { message?: { content?: string } }[] }
    if (d.error) throw new Error(String(d.error))
    const text = d.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('Empty response')
    return text
  },
  parseEmbed: (data) => {
    const d = data as { error?: string | null; data?: { embedding?: number[] }[] }
    if (d.error) throw new Error(String(d.error))
    const embedding = d.data?.[0]?.embedding
    if (Array.isArray(embedding) && embedding.length > 0) return embedding
    throw new Error('Invalid embedding')
  },
}

const HUGGING_FACE: FreeProviderConfig = {
  id: 'huggingface',
  label: 'Hugging Face',
  envKey: 'VITE_HF_TOKEN',
  kinds: ['chat', 'embed'],
  chatModel: 'mistralai/Mistral-7B-Instruct-v0.3',
  embedModel: 'BAAI/bge-m3',
  rateLimit: HF_RATE_LIMIT,
  auth: (apiKey) => `Bearer ${apiKey}`,
  chatUrl: (model) => `${HF_BASE}/models/${encodeURIComponent(model)}/v1/chat/completions`,
  embedUrl: (model) => `${HF_BASE}/pipeline/feature-extraction/${encodeURIComponent(model)}`,
  chatBody: (messages, opts) => ({
    model: opts.model,
    messages,
    temperature: opts.temperature ?? 0,
    max_tokens: opts.maxTokens ?? 512,
  }),
  embedBody: (text) => ({ inputs: text }),
  parseChat: (data) => {
    const d = data as { error?: string | null; choices?: { message?: { content?: string } }[] }
    if (d.error) throw new Error(String(d.error))
    const text = d.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('Empty response')
    return text
  },
  parseEmbed: (data) => {
    if (Array.isArray(data) && data.length > 0 && data.every((v) => typeof v === 'number')) return data as number[]
    const d = data as { error?: string | null; embedding?: number[] }
    if (d.error) throw new Error(String(d.error))
    if (Array.isArray(d.embedding) && d.embedding.length > 0) return d.embedding
    throw new Error('Invalid embedding')
  },
}

const OPENROUTER: FreeProviderConfig = {
  id: 'openrouter',
  label: 'OpenRouter',
  envKey: 'VITE_OPENROUTER_API_KEY',
  kinds: ['chat'],
  chatModel: 'meta-llama/llama-3.3-70b-instruct:free',
  rateLimit: OPENROUTER_RATE_LIMIT,
  auth: (apiKey) => `Bearer ${apiKey}`,
  chatUrl: () => `${OPENROUTER_BASE}/chat/completions`,
  chatBody: (messages, opts) => ({
    model: opts.model,
    messages,
    temperature: opts.temperature ?? 0,
    max_tokens: opts.maxTokens ?? 512,
  }),
  parseChat: (data) => {
    const d = data as { error?: string | null; choices?: { message?: { content?: string } }[] }
    if (d.error) throw new Error(String(d.error))
    const text = d.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('Empty response')
    return text
  },
}

const GROQ: FreeProviderConfig = {
  id: 'groq',
  label: 'Groq',
  envKey: 'VITE_GROQ_API_KEY',
  kinds: ['chat'],
  chatModel: 'llama-3.3-70b-versatile',
  rateLimit: GROQ_RATE_LIMIT,
  auth: (apiKey) => `Bearer ${apiKey}`,
  chatUrl: () => `${GROQ_BASE}/chat/completions`,
  chatBody: (messages, opts) => ({
    model: opts.model,
    messages,
    temperature: opts.temperature ?? 0,
    max_tokens: opts.maxTokens ?? 512,
  }),
  parseChat: (data) => {
    const d = data as { error?: string | null; choices?: { message?: { content?: string } }[] }
    if (d.error) throw new Error(String(d.error))
    const text = d.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('Empty response')
    return text
  },
}

export const PROVIDER_CONFIGS: readonly FreeProviderConfig[] = [
  BYTEZ,
  NVIDIA,
  HUGGING_FACE,
  OPENROUTER,
  GROQ,
]

const PROVIDER_BY_ID: Record<FreeProviderId, FreeProviderConfig> = {
  bytez: BYTEZ,
  nvidia: NVIDIA,
  huggingface: HUGGING_FACE,
  openrouter: OPENROUTER,
  groq: GROQ,
}

export interface FreeChatOptions {
  apiKey?: string
  provider?: FreeProviderId
  providers?: FreeProviderId[]
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
  provider?: FreeProviderId
  providers?: FreeProviderId[]
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

/** Resolve a provider's API key: explicit override wins, else its env var. */
export function resolveProviderKey(provider: FreeProviderId, override?: string): string | undefined {
  if (override && override.trim()) return override.trim()
  const config = PROVIDER_BY_ID[provider]
  const fromEnv = (import.meta.env?.[config.envKey] as string | undefined)?.trim()
  return fromEnv || undefined
}

export function resolveBytezKey(override?: string): string | undefined {
  return resolveProviderKey('bytez', override)
}

export function resolveNvidiaKey(override?: string): string | undefined {
  return resolveProviderKey('nvidia', override)
}

export function resolveHuggingFaceKey(override?: string): string | undefined {
  return resolveProviderKey('huggingface', override)
}

export function resolveOpenRouterKey(override?: string): string | undefined {
  return resolveProviderKey('openrouter', override)
}

export function resolveGroqKey(override?: string): string | undefined {
  return resolveProviderKey('groq', override)
}

export function bytezAvailable(override?: string): boolean {
  return Boolean(resolveBytezKey(override))
}

export function nvidiaAvailable(override?: string): boolean {
  return Boolean(resolveNvidiaKey(override))
}

export function huggingFaceAvailable(override?: string): boolean {
  return Boolean(resolveHuggingFaceKey(override))
}

export function openRouterAvailable(override?: string): boolean {
  return Boolean(resolveOpenRouterKey(override))
}

export function groqAvailable(override?: string): boolean {
  return Boolean(resolveGroqKey(override))
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
  const b = body as {
    messages?: ChatMessage[]
    text?: string
    input?: unknown
    params?: { max_tokens?: number }
    max_tokens?: number
  }
  const chatText = (b.messages ?? []).map((m) => m.content).join(' ')
  const single =
    typeof b.text === 'string'
      ? b.text
      : typeof b.input === 'string'
        ? b.input
        : Array.isArray(b.input)
          ? b.input.join(' ')
          : ''
  const maxTokens =
    typeof b.params?.max_tokens === 'number' ? b.params.max_tokens : typeof b.max_tokens === 'number' ? b.max_tokens : 0
  return estimateTokens(chatText || single || '') + maxTokens
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

interface PostProviderOpts {
  provider: FreeProviderConfig
  apiKey: string
  url: string
  body: unknown
  model: string
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

async function postProviderWithRetry(opts: PostProviderOpts): Promise<PostResult> {
  const providerId = opts.provider.id
  const now = opts.now ?? Date.now
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const trace = opts.trace !== false

  if (isCircuitOpen(providerId, now())) {
    return {
      ok: false,
      fallbackDecision: 'circuit-open',
      error: `${opts.provider.label} degraded: circuit open (repeated rate limiting)`,
    }
  }
  if (!budgetAllows(providerId, opts.rateLimit, now())) {
    return {
      ok: false,
      fallbackDecision: 'budget-exhausted',
      error: `${opts.provider.label} rate limit budget exhausted for this window`,
    }
  }

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    consumeBudget(providerId, estimateTokensForBody(opts.body), opts.rateLimit, now())
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const res = await fetch(opts.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: opts.provider.auth(opts.apiKey) },
        body: JSON.stringify(opts.body),
        signal: controller.signal,
      })
      if (res.status === 429) {
        const retryAfterMs = parseRetryAfter(res.headers.get('retry-after'))
        recordRateLimit429(providerId, now())
        if (trace) {
          void telemetryClient
            .traceRateLimit({
              provider: providerId,
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
            error: `${opts.provider.label} rate limited (429) after ${opts.maxRetries + 1} attempts`,
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

function chainFor(opts: { provider?: FreeProviderId; providers?: FreeProviderId[]; apiKey?: string }, kind: ProviderKind): FreeProviderId[] {
  if (opts.providers && opts.providers.length > 0) return opts.providers
  if (opts.provider) return [opts.provider]
  if (opts.apiKey && opts.apiKey.trim()) return [PROVIDER_ID]
  return PROVIDER_CONFIGS.filter((p) => p.kinds.includes(kind))
    .map((p) => p.id)
    .filter((id) => Boolean(resolveProviderKey(id)))
}

export async function generateFree(messages: ChatMessage[], opts: FreeChatOptions = {}): Promise<FreeGenResult> {
  const chain = chainFor(opts, 'chat')
  if (chain.length === 0) return { text: null, error: 'No free-tier chat API key configured' }
  let lastError: string | undefined
  for (const id of chain) {
    const provider = PROVIDER_BY_ID[id]
    const apiKey = resolveProviderKey(id, opts.apiKey)
    if (!apiKey) continue
    const model = opts.model ?? provider.chatModel
    const result = await postProviderWithRetry({
      provider,
      apiKey,
      url: provider.chatUrl(model),
      body: provider.chatBody(messages, { model, temperature: opts.temperature, maxTokens: opts.maxTokens }),
      model,
      rateLimit: opts.rateLimit ?? provider.rateLimit,
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
    if (!result.ok) {
      lastError = result.error
      continue
    }
    try {
      const text = provider.parseChat(result.data).trim()
      return { text }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }
  return { text: null, error: lastError ?? 'All free-tier providers unavailable' }
}

export async function embedFree(text: string, opts: FreeEmbedOptions = {}): Promise<FreeEmbedResult> {
  const chain = chainFor(opts, 'embed')
  if (chain.length === 0) return { embedding: null, error: 'No free-tier embedding API key configured' }
  let lastError: string | undefined
  for (const id of chain) {
    const provider = PROVIDER_BY_ID[id]
    if (!provider.embedModel || !provider.embedUrl || !provider.embedBody || !provider.parseEmbed) continue
    const apiKey = resolveProviderKey(id, opts.apiKey)
    if (!apiKey) continue
    const model = opts.model ?? provider.embedModel
    const result = await postProviderWithRetry({
      provider,
      apiKey,
      url: provider.embedUrl(model),
      body: provider.embedBody(text, model),
      model,
      rateLimit: opts.rateLimit ?? provider.rateLimit,
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
    if (!result.ok) {
      lastError = result.error
      continue
    }
    try {
      const embedding = provider.parseEmbed(result.data)
      if (Array.isArray(embedding) && embedding.length > 0) return { embedding }
      lastError = `${provider.label} returned an invalid embedding`
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }
  return { embedding: null, error: lastError ?? 'All free-tier providers unavailable' }
}
