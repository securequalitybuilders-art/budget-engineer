// Free-tier LLM router (Bytez open-source models).
//
// Local-first, no-backend constitution: the app never requires a key. When a
// Bytez API key is present (VITE_BYTEZ_API_KEY or an explicit `apiKey`), this
// module routes chat completions and embeddings to Bytez's serverless open-
// source endpoint; otherwise it returns a structured miss so callers can fall
// back to deterministic local engines. The module never throws — callers read
// the `error` field and degrade.
//
// Verified against https://docs.bytez.com (2026):
//   POST https://api.bytez.com/models/v2/{modelId}
//   Authorization: BYTEZ_KEY            (raw key, not Bearer)
//   feature-extraction: { "text": "…" } -> { "error": null, "output": number[] }
//   chat: { "messages": [{role,content}], "params": {…} }
//         -> { "error": null, "output": { "role": "assistant", "content": "…" } }
// Open-source models are free; closed-source require a provider key.

import type { ChatMessage } from '@/lib/ai/remote-providers'

const BYTEZ_BASE = 'https://api.bytez.com/models/v2'
const REQUEST_TIMEOUT_MS = 30_000

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

export interface FreeChatOptions {
  apiKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface FreeEmbedOptions {
  apiKey?: string
  model?: string
}

export function resolveBytezKey(override?: string): string | undefined {
  if (override && override.trim()) return override.trim()
  const fromEnv = (import.meta.env?.VITE_BYTEZ_API_KEY as string | undefined)?.trim()
  return fromEnv || undefined
}

export function bytezAvailable(override?: string): boolean {
  return Boolean(resolveBytezKey(override))
}

async function postBytez(model: string, apiKey: string, body: unknown): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${BYTEZ_BASE}/${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 200)}` : ''}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function generateFree(messages: ChatMessage[], opts: FreeChatOptions = {}): Promise<FreeGenResult> {
  const apiKey = resolveBytezKey(opts.apiKey)
  if (!apiKey) return { text: null, error: 'No Bytez API key configured' }
  try {
    const data = (await postBytez(opts.model ?? BYTEZ_MODELS.chat, apiKey, {
      messages,
      params: { temperature: opts.temperature ?? 0, max_tokens: opts.maxTokens ?? 512 },
    })) as { error?: string | null; output?: { role?: string; content?: string } }
    if (data.error) return { text: null, error: data.error }
    const text = data.output?.content?.trim()
    if (!text) return { text: null, error: 'Empty response from Bytez' }
    return { text }
  } catch (err) {
    return { text: null, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function embedFree(text: string, opts: FreeEmbedOptions = {}): Promise<FreeEmbedResult> {
  const apiKey = resolveBytezKey(opts.apiKey)
  if (!apiKey) return { embedding: null, error: 'No Bytez API key configured' }
  try {
    const data = (await postBytez(opts.model ?? BYTEZ_MODELS.embed, apiKey, {
      text,
    })) as { error?: string | null; output?: number[] }
    if (data.error) return { embedding: null, error: data.error }
    if (!Array.isArray(data.output) || data.output.length === 0) return { embedding: null, error: 'Invalid embedding from Bytez' }
    return { embedding: data.output }
  } catch (err) {
    return { embedding: null, error: err instanceof Error ? err.message : String(err) }
  }
}
