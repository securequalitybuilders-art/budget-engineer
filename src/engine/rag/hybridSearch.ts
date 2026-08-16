// Async hybrid retrieval — the KPI1 production path.
//
// Adds an async layer over the existing sync `hybrid.ts` primitives so the
// dense leg can use the free Bytez embedding router (bounded to the sparse
// over-fetch pool so the first query costs ≤ overFetch embed calls, cached in
// IndexedDB afterwards). When no Bytez key is configured the dense leg falls
// back to the deterministic local feature-hash embeddings already used by the
// sync path. The exact-phrase BM25 boost guarantees that a literal code phrase
// (e.g. "SAZ 7 MPa common brick") is retrieved even when the vector leg is
// offline.

import type { RagIndex } from './ragIndex'
import { buildBm25Stats, bm25Score, rrfFusion } from './hybrid'
import { cosineSimilarity } from './embeddings'
import { EmbeddingCache } from './embedCache'
import { embedFree, resolveBytezKey, resolveNvidiaKey, resolveHuggingFaceKey } from '@/lib/llm/freeRouter'
import { clauseFromSectionId } from './citation'
import { sourceTypeFor, specSourceTypeFor, matchesSourceFilter } from './sourceType'
import type { SearchResult, TextChunk } from './types'

export { sourceTypeFor, specSourceTypeFor, matchesSourceFilter, type SpecSourceType } from './sourceType'

export interface HybridHit extends SearchResult {
  text_child: string
  text_parent: string
  source_type: string
  clause: string
  rrf: number
  spec_source_type?: string
}

export interface HybridSearchAsyncOptions {
  k?: number
  minScore?: number
  docId?: string
  filterSource?: string
  overFetch?: number
  fusionK?: number
  phraseWeight?: number
  apiKey?: string
  useRemoteDense?: boolean
  cache?: boolean
  embedder?: (text: string) => Promise<number[] | null>
}

export const DEFAULT_HYBRID_K = 6
export const DEFAULT_OVERFETCH = 20
export const DEFAULT_FUSION_K = 60
export const DEFAULT_PHRASE_WEIGHT = 3

export function exactPhrasePresent(query: string, text: string): boolean {
  const phrase = query.toLowerCase().trim().replace(/\s+/g, ' ')
  if (phrase.length < 4) return false
  return text.toLowerCase().includes(phrase)
}

export function phraseBoostedBm25(query: string, text: string, stats: ReturnType<typeof buildBm25Stats>, phraseWeight = DEFAULT_PHRASE_WEIGHT): number {
  const base = bm25Score(query, text, stats)
  return exactPhrasePresent(query, text) ? base + phraseWeight : base
}

export function toHybridHit(result: SearchResult): HybridHit {
  return {
    ...result,
    text_child: result.text,
    text_parent: result.parentText ?? '',
    source_type: sourceTypeFor(result.docId),
    clause: clauseFromSectionId(result.sectionId),
    rrf: result.score,
    spec_source_type: specSourceTypeFor(result.docId),
  }
}

function toSearchResult(chunk: TextChunk, score: number, sparseScore?: number): SearchResult {
  return {
    chunkId: chunk.id,
    docId: chunk.docId,
    sectionId: chunk.sectionId,
    heading: chunk.heading,
    text: chunk.text,
    score,
    path: chunk.path,
    chapter: chunk.chapter,
    docTitle: chunk.docTitle,
    parentText: chunk.parentText,
    sparseScore,
    grade: chunk.grade,
  }
}

export async function hybridSearchAsync(index: RagIndex, query: string, opts: HybridSearchAsyncOptions = {}): Promise<HybridHit[]> {
  const k = opts.k ?? DEFAULT_HYBRID_K
  const overFetch = opts.overFetch ?? DEFAULT_OVERFETCH
  const fusionK = opts.fusionK ?? DEFAULT_FUSION_K
  const minScore = opts.minScore ?? 0
  const pool = index.allChunks().filter((c) => (!opts.docId || c.docId === opts.docId) && matchesSourceFilter(c.docId, opts.filterSource))

  // Sparse leg — BM25 with an exact-phrase bonus (guaranteed phrase recall).
  const stats = buildBm25Stats(pool)
  const sparseResults: SearchResult[] = pool
    .map((chunk) => ({ chunk, score: phraseBoostedBm25(query, chunk.text, stats, opts.phraseWeight) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, overFetch)
    .map((r) => toSearchResult(r.chunk, r.score, r.score))

  // Dense leg — local feature-hash for recall, then a remote (Bytez) rescore
  // over the sparse pool when a key/embedder is available (bounded + cached).
  const useRemote =
    opts.useRemoteDense ??
    (Boolean(opts.embedder) ||
      Boolean(resolveBytezKey(opts.apiKey)) ||
      Boolean(resolveNvidiaKey(opts.apiKey)) ||
      Boolean(resolveHuggingFaceKey(opts.apiKey)))
  let denseResults: SearchResult[] = index
    .search(query, { k: overFetch, minScore: 0, docId: opts.docId })
    .filter((r) => matchesSourceFilter(r.docId, opts.filterSource))

  if (useRemote) {
    const embedder: (text: string) => Promise<number[] | null> =
      opts.embedder ?? (async (text) => (await embedFree(text, { apiKey: opts.apiKey })).embedding)
    const cache = opts.cache !== false ? await EmbeddingCache.open() : null
    const queryVector = await embedder(query)
    if (queryVector) {
      const scored: Array<{ chunk: TextChunk; score: number }> = []
      for (const r of sparseResults) {
        const key = r.chunkId
        let vector = cache ? await cache.get(key) : undefined
        if (!vector) {
          const chunk = index.getChunk(key)
          if (!chunk) continue
          vector = (await embedder(chunk.text)) ?? undefined
          if (vector && cache) await cache.set(key, vector)
        }
        if (vector) scored.push({ chunk: index.getChunk(key)!, score: cosineSimilarity(queryVector, vector) })
      }
      denseResults = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, overFetch)
        .map((s) => toSearchResult(s.chunk, s.score))
    }
  }

  const fused = rrfFusion(denseResults, sparseResults, fusionK)
  const combined = new Map<string, { dense?: SearchResult; sparse?: SearchResult }>()
  for (const d of denseResults) {
    const entry = combined.get(d.chunkId) ?? {}
    entry.dense = d
    combined.set(d.chunkId, entry)
  }
  for (const s of sparseResults) {
    const entry = combined.get(s.chunkId) ?? {}
    entry.sparse = s
    combined.set(s.chunkId, entry)
  }

  const out: HybridHit[] = []
  for (const [chunkId, { dense, sparse }] of combined) {
    const score = fused.get(chunkId) ?? 0
    if (score < minScore) continue
    out.push(
      toHybridHit({
        chunkId,
        docId: dense?.docId ?? sparse?.docId ?? '',
        sectionId: dense?.sectionId ?? sparse?.sectionId ?? '',
        heading: dense?.heading ?? sparse?.heading ?? '',
        text: dense?.text ?? sparse?.text ?? '',
        score,
        path: dense?.path ?? sparse?.path,
        chapter: dense?.chapter ?? sparse?.chapter,
        docTitle: dense?.docTitle ?? sparse?.docTitle,
        parentText: dense?.parentText ?? sparse?.parentText,
        grade: dense?.grade ?? sparse?.grade,
        denseScore: dense?.score,
        sparseScore: sparse?.score,
      }),
    )
  }
  return out.sort((a, b) => b.score - a.score).slice(0, k)
}
