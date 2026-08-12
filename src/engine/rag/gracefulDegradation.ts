// Graceful degradation — the never-hallucinate retrieval quality protocol.
//
// Every retrieval path (hybrid search, rerank, compliance analysis) funnels
// through here so a weak/low-confidence result is never silently presented as
// an answer. The verdict is deterministic and uses two signals:
//   1. above-threshold rerank scores (the relevance threshold), and
//   2. lexical overlap between the query and the top hit.
// A retrieval is "poor" (genuinely not found) only when nothing scores above
// threshold AND the top hit shares no token with the query. A top hit that
// matches content but scores low is "weak" — found, but flagged for manual
// verification. This prevents legitimate low-scoring queries (real corpus
// queries rerank at ~0.5–0.7, below a 0.7 threshold) from being thrown out.

import { DEFAULT_RERANK_THRESHOLD, lexicalCoverage } from './rerank'

export const NOT_FOUND_REASON = 'Regulation not found in indexed repository'
export const NOT_FOUND_MESSAGE =
  'DzeNhare could not locate this in Model Building By-Laws 1977 / SAZ / ZIQS. Please rephrase or upload document.'
export const WEAK_RETRIEVAL_MESSAGE =
  'Retrieved context is low-confidence — treat these findings as unverified and confirm them against the source clause before relying on them.'

export interface ScoredHit {
  score?: number
  rerankScore?: number
  text?: string
}

export interface RetrievalQuality {
  topScore: number
  minScore: number
  recallAtK: number
  ndcg: number
  aboveThreshold: number
  total: number
  topOverlap: number
  verdict: 'strong' | 'weak' | 'poor'
}

export interface QualityOptions {
  threshold?: number
  k?: number
  query?: string
}

export function evaluateRetrievalQuality(hits: ScoredHit[], opts: QualityOptions = {}): RetrievalQuality {
  const threshold = opts.threshold ?? DEFAULT_RERANK_THRESHOLD
  const k = opts.k ?? 6
  const top = hits.slice(0, k)
  const scored = top.map((h) => h.rerankScore ?? h.score ?? 0)
  const topScore = scored[0] ?? 0
  const minScore = scored.length > 0 ? Math.min(...scored) : 0
  const aboveThreshold = scored.filter((s) => s >= threshold).length
  const topOverlap = opts.query && top[0]?.text ? lexicalCoverage(opts.query, top[0].text) : 0
  const denom = Math.min(top.length, k)
  const recallAtK = denom > 0 ? aboveThreshold / denom : 0
  const rel = scored.map((s) => (s >= threshold ? 1 : 0))
  const dcg = rel.reduce<number>((sum, r, i) => sum + r / Math.log2(i + 2), 0)
  const ideal = rel.slice().sort((a, b) => b - a)
  const idcg = ideal.reduce<number>((sum, r, i) => sum + r / Math.log2(i + 2), 0)
  const ndcg = idcg > 0 ? dcg / idcg : 0
  const verdict: RetrievalQuality['verdict'] =
    aboveThreshold === 0
      ? topOverlap === 0
        ? 'poor'
        : 'weak'
      : aboveThreshold < denom * 0.5
        ? 'weak'
        : 'strong'
  return { topScore, minScore, recallAtK, ndcg, aboveThreshold, total: hits.length, topOverlap, verdict }
}

export interface DegradationResult {
  found: boolean
  fellBack: boolean
  fallbackReason?: string
  message: string
  needsClarification: boolean
  confidence: number
  verdict: 'strong' | 'weak' | 'poor'
}

export function applyDegradationPolicy(
  hits: ScoredHit[],
  confidence: number,
  threshold: number = DEFAULT_RERANK_THRESHOLD,
  query = '',
): DegradationResult {
  const quality = evaluateRetrievalQuality(hits, { threshold, query })
  if (quality.verdict === 'poor') {
    return {
      found: false,
      fellBack: true,
      fallbackReason: NOT_FOUND_REASON,
      message: NOT_FOUND_MESSAGE,
      needsClarification: true,
      confidence,
      verdict: quality.verdict,
    }
  }
  if (quality.verdict === 'weak') {
    return {
      found: true,
      fellBack: true,
      fallbackReason: 'low-retrieval-confidence',
      message: WEAK_RETRIEVAL_MESSAGE,
      needsClarification: confidence < threshold,
      confidence,
      verdict: quality.verdict,
    }
  }
  return {
    found: hits.length > 0,
    fellBack: false,
    message: '',
    needsClarification: confidence < threshold,
    confidence,
    verdict: quality.verdict,
  }
}
