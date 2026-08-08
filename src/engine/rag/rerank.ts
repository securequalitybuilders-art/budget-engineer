import type { SearchResult } from './types'
import { cosineSimilarity, embedQuery, embedText, tokenize } from './embeddings'

export const DEFAULT_RERANK_THRESHOLD = 0.7
export const LEXICAL_WEIGHT = 0.7
export const DENSE_WEIGHT = 0.3

export interface RerankOptions {
  threshold?: number
  enabled?: boolean
}

export interface RerankOutcome {
  results: SearchResult[]
  confidence: number
  threshold: number
  needsClarification: boolean
}

export function lexicalCoverage(query: string, text: string): number {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return 0
  const docTokens = new Set(tokenize(text))
  let matched = 0
  for (const t of queryTokens) {
    if (docTokens.has(t)) matched++
  }
  return matched / queryTokens.length
}

export function localRerankScore(query: string, text: string): number {
  const dense = cosineSimilarity(embedQuery(query), embedText(text))
  const lexical = lexicalCoverage(query, text)
  return LEXICAL_WEIGHT * lexical + DENSE_WEIGHT * dense
}

export function rerankResults(query: string, results: SearchResult[], opts: RerankOptions = {}): RerankOutcome {
  const threshold = opts.threshold ?? DEFAULT_RERANK_THRESHOLD
  if (opts.enabled === false || results.length === 0) {
    const confidence = results.length > 0 ? localRerankScore(query, results[0].text) : 0
    return { results, confidence, threshold, needsClarification: confidence < threshold }
  }
  const ranked = results
    .map((r) => ({ ...r, rerankScore: localRerankScore(query, r.text) }))
    .sort((a, b) => (b.rerankScore ?? 0) - (a.rerankScore ?? 0))
  const confidence = ranked[0]?.rerankScore ?? 0
  return {
    results: ranked,
    confidence,
    threshold,
    needsClarification: confidence < threshold,
  }
}

export function clarificationPrompt(query: string, confidence: number, threshold: number): string {
  return (
    `Retrieved context confidence is ${confidence.toFixed(2)} — below the ${threshold.toFixed(2)} relevance threshold for ` +
    `"${query}". No code clause was matched with confidence. ` +
    'Refine the query with a specific regulation, clause number, or exact term (e.g. "Model Building By-Laws 1977 ' +
    'minimum ceiling height").'
  )
}
