// Labeled retrieval-evaluation metrics (pure, dependency-free).
//
// Computes standard IR metrics (recall@k, precision@k, MRR, NDCG@k) for the
// local hybrid search + reranker over the embedded registry corpus. The
// metrics module stays side-effect free so the same functions power the
// vitest gate (`retrieval-eval.test.ts`) and the batch report used in CI.
//
// Relevance is the spec's own label: a retrieved hit counts as relevant when
// its section id is one of `expectedSectionIds` OR its text contains any
// `expectedContains` phrase (case-insensitive). The recall denominator is the
// TRUE number of relevant chunks in the corpus (computed over `allChunks()`),
// not just the retrieved set — so recall@k is a real coverage measure.

import type { HybridHit } from './hybridSearch'
import type { TextChunk } from './types'

export type EvalSourceType = 'bylaws_1977' | 'saz' | 'ziqs' | 'si56' | 'market_index' | 'historical'

export interface RetrievalEvalCase {
  id: string
  query: string
  k: number
  expectedSectionIds: string[]
  expectedSourceTypes: EvalSourceType[]
  expectedContains: string[]
  minRecall: number
  minMrr?: number
  note?: string
}

export interface RetrievalEvalMetrics {
  caseId: string
  query: string
  k: number
  hits: HybridHit[]
  relevantIndices: number[]
  totalRelevant: number
  recallAtK: number
  precisionAtK: number
  mrr: number
  ndcgAtK: number
  topSourceTypes: string[]
  passRecall: boolean
  passMrr: boolean
  passSourceType: boolean
  minRecall: number
  minMrr: number | undefined
}

export interface RetrievalEvalBatch {
  results: RetrievalEvalMetrics[]
  avgRecallAtK: number
  avgMrr: number
  avgNdcgAtK: number
  worstRecall: number
  pass: boolean
  failures: RetrievalEvalMetrics[]
  gates: {
    avgRecallAtK: number
    avgMrr: number
    avgNdcgAtK: number
    minRecallFloor: number
  }
}

export const BATCH_GATES = {
  avgRecallAtK: 0.8,
  avgMrr: 0.7,
  avgNdcgAtK: 0.75,
  minRecallFloor: 0.5,
} as const

export function hitText(hit: HybridHit): string {
  return (hit.text_child ?? '').toLowerCase()
}

export function isRelevantHit(hit: HybridHit, caseDef: RetrievalEvalCase): boolean {
  if (caseDef.expectedSectionIds.includes(hit.sectionId)) return true
  const text = hitText(hit)
  return caseDef.expectedContains.some((phrase) => phrase.length > 0 && text.includes(phrase.toLowerCase()))
}

export function countRelevantInCorpus(chunks: TextChunk[], caseDef: RetrievalEvalCase): number {
  let n = 0
  for (const chunk of chunks) {
    if (caseDef.expectedSectionIds.includes(chunk.sectionId)) {
      n += 1
      continue
    }
    const text = (chunk.text ?? '').toLowerCase()
    if (caseDef.expectedContains.some((phrase) => phrase.length > 0 && text.includes(phrase.toLowerCase()))) {
      n += 1
    }
  }
  return n
}

export function recallAtK(hits: HybridHit[], caseDef: RetrievalEvalCase, totalRelevant: number): number {
  if (totalRelevant === 0) return 0
  const relevant = hits.filter((h) => isRelevantHit(h, caseDef)).length
  return Math.min(1, relevant / totalRelevant)
}

export function precisionAtK(hits: HybridHit[], caseDef: RetrievalEvalCase, k: number): number {
  if (k === 0) return 0
  return hits.filter((h) => isRelevantHit(h, caseDef)).length / k
}

export function mrrAtK(hits: HybridHit[], caseDef: RetrievalEvalCase): number {
  for (let i = 0; i < hits.length; i += 1) {
    if (isRelevantHit(hits[i], caseDef)) return 1 / (i + 1)
  }
  return 0
}

export function ndcgAtK(hits: HybridHit[], caseDef: RetrievalEvalCase, totalRelevant: number): number {
  const k = Math.min(hits.length, caseDef.k)
  if (k === 0) return 0
  let dcg = 0
  for (let i = 0; i < k; i += 1) {
    if (isRelevantHit(hits[i], caseDef)) dcg += 1 / Math.log2(i + 2)
  }
  const idealRanks = Math.min(k, totalRelevant)
  let idcg = 0
  for (let i = 0; i < idealRanks; i += 1) {
    idcg += 1 / Math.log2(i + 2)
  }
  return idcg === 0 ? 0 : dcg / idcg
}

/** Ranks (1-indexed) of the relevant hits, in retrieved order. */
export function relevantIndices(hits: HybridHit[], caseDef: RetrievalEvalCase): number[] {
  return hits
    .map((hit, i) => ({ hit, i }))
    .filter(({ hit }) => isRelevantHit(hit, caseDef))
    .map(({ i }) => i)
}

export function evaluateRetrieval(
  caseDef: RetrievalEvalCase,
  hits: HybridHit[],
  totalRelevant: number,
): RetrievalEvalMetrics {
  const k = caseDef.k
  const topK = hits.slice(0, k)
  const relevant = relevantIndices(topK, caseDef)
  const recall = recallAtK(topK, caseDef, totalRelevant)
  const precision = precisionAtK(topK, caseDef, k)
  const mrr = mrrAtK(topK, caseDef)
  const ndcg = ndcgAtK(topK, caseDef, totalRelevant)
  const topSourceTypes = topK.map((h) => h.spec_source_type ?? h.source_type ?? 'unknown')
  const minMrr = caseDef.minMrr ?? 0.5
  return {
    caseId: caseDef.id,
    query: caseDef.query,
    k,
    hits: topK,
    relevantIndices: relevant,
    totalRelevant,
    recallAtK: recall,
    precisionAtK: precision,
    mrr,
    ndcgAtK: ndcg,
    topSourceTypes,
    passRecall: recall >= caseDef.minRecall,
    passMrr: mrr >= minMrr,
    passSourceType: caseDef.expectedSourceTypes.length === 0 || topSourceTypes.includes(caseDef.expectedSourceTypes[0] ?? ''),
    minRecall: caseDef.minRecall,
    minMrr,
  }
}

export function evaluateBatch(results: RetrievalEvalMetrics[]): RetrievalEvalBatch {
  const count = results.length || 1
  const avgRecallAtK = results.reduce((sum, r) => sum + r.recallAtK, 0) / count
  const avgMrr = results.reduce((sum, r) => sum + r.mrr, 0) / count
  const avgNdcgAtK = results.reduce((sum, r) => sum + r.ndcgAtK, 0) / count
  const worstRecall = results.reduce((worst, r) => Math.min(worst, r.recallAtK), 1)
  const failures = results.filter((r) => !r.passRecall || !r.passMrr)
  const gates = { ...BATCH_GATES }
  const pass =
    results.length > 0 &&
    avgRecallAtK >= gates.avgRecallAtK &&
    avgMrr >= gates.avgMrr &&
    avgNdcgAtK >= gates.avgNdcgAtK &&
    worstRecall >= gates.minRecallFloor &&
    failures.length === 0
  return { results, avgRecallAtK, avgMrr, avgNdcgAtK, worstRecall, pass, failures, gates }
}
