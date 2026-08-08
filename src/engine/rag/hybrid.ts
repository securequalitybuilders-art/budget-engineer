import type { SearchResult, TextChunk } from './types'
import { tokenize } from './embeddings'
import type { RagIndex } from './ragIndex'

export interface HybridSearchOptions {
  k?: number
  minScore?: number
  docId?: string
  overFetch?: number
  fusionK?: number
}

export interface Bm25Stats {
  docCount: number
  avgDocLength: number
  documentFrequencies: Map<string, number>
}

const K1 = 1.5
const B = 0.75

export function bm25TokenFrequency(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1)
  }
  return counts
}

export function buildBm25Stats(chunks: TextChunk[]): Bm25Stats {
  const docCount = chunks.length
  let totalLength = 0
  const documentFrequencies = new Map<string, number>()
  for (const chunk of chunks) {
    const counts = bm25TokenFrequency(chunk.text)
    for (const term of counts.keys()) {
      documentFrequencies.set(term, (documentFrequencies.get(term) ?? 0) + 1)
    }
    totalLength += [...counts.values()].reduce((sum, n) => sum + n, 0)
  }
  return { docCount, avgDocLength: docCount > 0 ? totalLength / docCount : 1, documentFrequencies }
}

export function bm25Score(query: string, text: string, stats: Bm25Stats): number {
  if (stats.docCount === 0) return 0
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return 0
  const docLength = bm25TokenFrequency(text)
  const totalTokens = [...docLength.values()].reduce((sum, n) => sum + n, 0)
  const docLen = totalTokens || 1
  const idf = (term: string) => {
    const df = stats.documentFrequencies.get(term) ?? 0
    return Math.log(1 + (stats.docCount - df + 0.5) / (df + 0.5))
  }
  let score = 0
  for (const term of queryTokens) {
    const tf = docLength.get(term) ?? 0
    if (tf === 0) continue
    score += idf(term) * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (docLen / stats.avgDocLength))))
  }
  return score
}

export function rrfFusion(
  dense: SearchResult[],
  sparse: SearchResult[],
  fusionK: number = 60,
): Map<string, number> {
  const fused = new Map<string, number>()
  const addRanked = (results: SearchResult[], weight: number) => {
    results.forEach((r, rank) => {
      const key = r.chunkId
      fused.set(key, (fused.get(key) ?? 0) + weight * (1 / (fusionK + rank + 1)))
    })
  }
  addRanked(dense, 1)
  addRanked(sparse, 1)
  return fused
}

export function hybridSearch(index: RagIndex, query: string, opts: HybridSearchOptions = {}): SearchResult[] {
  const k = opts.k ?? 5
  const overFetch = opts.overFetch ?? 60
  const fusionK = opts.fusionK ?? 60
  const denseResults = index.search(query, { k: overFetch, minScore: 0, docId: opts.docId })
  const stats = buildBm25Stats(opts.docId ? index.allChunks().filter((c) => c.docId === opts.docId) : index.allChunks())
  const sparseResults = [...index.allChunks()]
    .filter((c) => !opts.docId || c.docId === opts.docId)
    .map((chunk) => ({
      chunk: chunk as TextChunk,
      score: bm25Score(query, chunk.text, stats),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, overFetch)
    .map((r) => ({
      chunkId: r.chunk.id,
      docId: r.chunk.docId,
      sectionId: r.chunk.sectionId,
      heading: r.chunk.heading,
      text: r.chunk.text,
      score: r.score,
      path: r.chunk.path,
      chapter: r.chunk.chapter,
      docTitle: r.chunk.docTitle,
      parentText: r.chunk.parentText,
    }))

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

  const results: SearchResult[] = []
  for (const [chunkId, { dense, sparse }] of combined) {
    const score = fused.get(chunkId) ?? 0
    const minScore = opts.minScore ?? 0
    if (score < minScore) continue
    results.push({
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
      denseScore: dense?.score,
      sparseScore: sparse?.score,
    })
  }
  return results.sort((a, b) => b.score - a.score).slice(0, k)
}
