// Async reranker — 3 tiers, one never-hallucinate contract.
//
// Tiers (best available wins; each failure degrades to the next):
//   1. transformers — on-device `bge-reranker-base` (ONNX, optional heavy dep,
//      loaded lazily so the app bundle only pays when it runs)
//   2. remote embeddings — free sentence-similarity via `embedFree`
//      (IndexedDB cached), cosine ranking. Auto mode tries bytez, then nvidia.
//      (Neither exposes a dedicated rerank task — cosine over
//      feature-extraction is their rerank.)
//   3. lexical — deterministic `localRerankScore` (always available, offline).
//
// The 0.7 threshold is authoritative: any result set whose top confidence is
// below it is flagged `needsClarification` and carries the degradation
// protocol's "Regulation not found" payload rather than a fabricated answer.

import type { HybridHit } from './hybridSearch'
import { DEFAULT_RERANK_THRESHOLD, localRerankScore } from './rerank'
import { cosineSimilarity } from './embeddings'
import { EmbeddingCache } from './embedCache'
import { embedFree } from '@/lib/llm/freeRouter'
import { NOT_FOUND_MESSAGE, NOT_FOUND_REASON } from './gracefulDegradation'
import { telemetryClient } from '@/lib/observability/langfuseClient'

export type RerankMethod = 'auto' | 'transformers' | 'bytez' | 'nvidia' | 'lexical'

export interface RerankHybridOptions {
  threshold?: number
  method?: RerankMethod
  apiKey?: string
  embedder?: (text: string) => Promise<number[] | null>
}

export interface RerankHybridResult {
  hits: HybridHit[]
  confidence: number
  threshold: number
  method: 'transformers' | 'bytez' | 'nvidia' | 'lexical'
  needsClarification: boolean
  fellBack: boolean
  fallbackReason?: string
}

const ON_DEVICE_MODEL = 'Xenova/bge-reranker-base'

interface Ranked {
  hit: HybridHit
  score: number
}

function rankLexical(query: string, hits: HybridHit[]): Ranked[] {
  return hits
    .map((hit) => ({ hit, score: localRerankScore(query, hit.text_child) }))
    .sort((a, b) => b.score - a.score)
}

async function tryTransformersRank(query: string, hits: HybridHit[]): Promise<Ranked[] | null> {
  try {
    const { pipeline } = await import('@huggingface/transformers')
    const classifier = (await pipeline('text-classification', ON_DEVICE_MODEL)) as unknown as (
      text: string,
    ) => Promise<Array<{ score?: number }>>
    const ranked: Ranked[] = []
    for (const hit of hits) {
      const out = await classifier(`${query} [SEP] ${hit.text_child}`)
      const score = Array.isArray(out) ? out[0]?.score ?? 0 : (out as { score?: number }).score ?? 0
      ranked.push({ hit, score })
    }
    return ranked.sort((a, b) => b.score - a.score)
  } catch {
    return null
  }
}

async function tryRemoteRank(
  query: string,
  hits: HybridHit[],
  opts: RerankHybridOptions,
  provider: 'bytez' | 'nvidia',
): Promise<Ranked[] | null> {
  const embedder: (text: string) => Promise<number[] | null> =
    opts.embedder ?? (async (text) => (await embedFree(text, { apiKey: opts.apiKey, provider })).embedding)
  try {
    const cache = await EmbeddingCache.open()
    const queryVector = await embedder(query)
    if (!queryVector) return null
    const ranked: Ranked[] = []
    for (const hit of hits) {
      const key = `rerank:${provider}:${hit.chunkId}`
      let vector = await cache.get(key)
      if (!vector) {
        vector = (await embedder(hit.text_child)) ?? undefined
        if (vector) await cache.set(key, vector)
      }
      if (vector) ranked.push({ hit, score: cosineSimilarity(queryVector, vector) })
    }
    return ranked.length > 0 ? ranked.sort((a, b) => b.score - a.score) : null
  } catch {
    return null
  }
}

export async function rerankHybrid(query: string, hits: HybridHit[], opts: RerankHybridOptions = {}): Promise<RerankHybridResult> {
  const threshold = opts.threshold ?? DEFAULT_RERANK_THRESHOLD
  const method = opts.method ?? 'auto'
  const startedAt = Date.now()
  const finish = (result: RerankHybridResult): RerankHybridResult => {
    void telemetryClient
      .traceRerank({
        query,
        method: result.method,
        confidence: result.confidence,
        threshold: result.threshold,
        needsClarification: result.needsClarification,
        latencyMs: Date.now() - startedAt,
        hitCount: result.hits.length,
      })
      .catch(() => {})
    return result
  }
  let ranked: Ranked[] | null = null
  let methodUsed: RerankHybridResult['method'] = 'lexical'

  if (hits.length === 0) {
    return finish({
      hits: [],
      confidence: 0,
      threshold,
      method: methodUsed,
      needsClarification: true,
      fellBack: true,
      fallbackReason: NOT_FOUND_REASON,
    })
  }

  if (method === 'transformers' || method === 'auto') {
    ranked = await tryTransformersRank(query, hits)
    if (ranked) methodUsed = 'transformers'
  }
  const remoteProviders: Array<'bytez' | 'nvidia'> =
    method === 'auto' ? ['bytez', 'nvidia'] : method === 'bytez' ? ['bytez'] : method === 'nvidia' ? ['nvidia'] : []
  for (const provider of remoteProviders) {
    if (ranked) break
    ranked = await tryRemoteRank(query, hits, opts, provider)
    if (ranked) methodUsed = provider
  }
  if (!ranked) {
    ranked = rankLexical(query, hits)
    methodUsed = 'lexical'
  }

  const scored = ranked.map((r) => ({ ...r.hit, rerankScore: r.score }))
  const confidence = ranked[0]?.score ?? 0
  const needsClarification = confidence < threshold
  return finish({
    hits: scored,
    confidence,
    threshold,
    method: methodUsed,
    needsClarification,
    fellBack: needsClarification,
    fallbackReason: needsClarification ? NOT_FOUND_REASON : undefined,
  })
}

export { NOT_FOUND_MESSAGE, NOT_FOUND_REASON }
