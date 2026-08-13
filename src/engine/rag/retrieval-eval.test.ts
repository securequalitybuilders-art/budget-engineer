// Labeled retrieval-eval gate (Data Quality Gap #3).
//
// Runs the production local-first retrieval path — `hybridSearchAsync` (BM25
// phrase-boost + dense RRF) + `rerankHybrid` (deterministic lexical tier) —
// over the embedded four-document registry corpus (By-Laws 1977, SI 56/2025,
// SAZ catalogue, ZIQS SMM) and scores each labeled query from
// `eval/retrieval-eval.json` with recall@k / precision@k / MRR / NDCG@k.
//
// Determinism: `useRemoteDense: false` + `method: 'lexical'` force the offline
// tiers so the gate never depends on a Bytez key or the ONNX model download.
// The rerank 0.7 threshold governs answer generation, NOT this gate — the gate
// measures retrieval quality on the served (post-rerank) list regardless of
// whether the top confidence clears the clarification threshold.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createIndex, type RagIndex } from './ragIndex'
import { REGISTRY_DOCS } from './corpus/loader-enterprise'
import { hybridSearchAsync } from './hybridSearch'
import { rerankHybrid } from './reranker'
import {
  countRelevantInCorpus,
  evaluateBatch,
  evaluateRetrieval,
  type RetrievalEvalCase,
} from './retrieval-eval-metrics'

const RETRIEVAL_EVAL_JSON = fileURLToPath(new URL('../../../eval/retrieval-eval.json', import.meta.url))

function isRetrievalEvalCase(value: unknown): value is RetrievalEvalCase {
  if (typeof value !== 'object' || value === null) return false
  const c = value as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.query === 'string' &&
    typeof c.k === 'number' &&
    c.k > 0 &&
    Array.isArray(c.expectedSectionIds) &&
    c.expectedSectionIds.every((s) => typeof s === 'string') &&
    Array.isArray(c.expectedSourceTypes) &&
    c.expectedSourceTypes.every((s) => typeof s === 'string') &&
    Array.isArray(c.expectedContains) &&
    c.expectedContains.every((s) => typeof s === 'string') &&
    typeof c.minRecall === 'number' &&
    (c.minMrr === undefined || typeof c.minMrr === 'number')
  )
}

function loadRetrievalEvalCases(): RetrievalEvalCase[] {
  const raw = JSON.parse(readFileSync(RETRIEVAL_EVAL_JSON, 'utf8')) as unknown
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`retrieval-eval.json must be a non-empty array (got ${Array.isArray(raw) ? raw.length : typeof raw})`)
  }
  const bad = raw.findIndex((c) => !isRetrievalEvalCase(c))
  if (bad !== -1) throw new Error(`retrieval-eval.json case #${bad} failed structural validation`)
  return raw as RetrievalEvalCase[]
}

function buildRegistryIndex(): RagIndex {
  return createIndex(REGISTRY_DOCS)
}

async function runRetrieval(index: RagIndex, query: string, k: number) {
  const hits = await hybridSearchAsync(index, query, { k, useRemoteDense: false, cache: false })
  return rerankHybrid(query, hits, { method: 'lexical', threshold: 0.7 })
}

describe('retrieval-eval (labeled gate)', () => {
  it('loads a valid labeled dataset from eval/retrieval-eval.json', () => {
    const cases = loadRetrievalEvalCases()
    expect(cases.length).toBeGreaterThanOrEqual(6)
    const ids = new Set(cases.map((c) => c.id))
    expect(ids.size).toBe(cases.length)
    for (const c of cases) {
      expect(c.expectedContains.length).toBeGreaterThan(0)
      expect(c.minRecall).toBeGreaterThan(0)
    }
  })

  it('scores every labeled query against the real hybrid search + rerank pipeline', async () => {
    const cases = loadRetrievalEvalCases()
    const index = buildRegistryIndex()
    const totalChunks = index.size
    expect(totalChunks).toBeGreaterThan(0)

    const results = []
    for (const caseDef of cases) {
      const ranked = await runRetrieval(index, caseDef.query, caseDef.k)
      const totalRelevant = countRelevantInCorpus(index.allChunks(), caseDef)
      const result = evaluateRetrieval(caseDef, ranked.hits, totalRelevant)
      results.push(result)
      // per-query diagnostic line for CI/verbose runs
      const top = result.hits.slice(0, 3).map((h) => h.sectionId).join(' | ')
      const rel = result.relevantIndices.map((i) => i + 1).join(',') || '-'
      console.log(
        `[retrieval-eval] ${result.caseId}: recall@${result.k}=${result.recallAtK.toFixed(3)} ` +
          `precision=${result.precisionAtK.toFixed(3)} mrr=${result.mrr.toFixed(3)} ` +
          `ndcg@${result.k}=${result.ndcgAtK.toFixed(3)} relevant@${rel} totalRel=${result.totalRelevant} ` +
          `top=${top}`,
      )
    }

    const batch = evaluateBatch(results)
    console.log(
      `[retrieval-eval] BATCH: avg recall@5=${batch.avgRecallAtK.toFixed(3)} ` +
        `avg mrr=${batch.avgMrr.toFixed(3)} avg ndcg@5=${batch.avgNdcgAtK.toFixed(3)} ` +
        `worst recall=${batch.worstRecall.toFixed(3)} pass=${batch.pass}`,
    )

    // per-case gates
    for (const r of results) {
      expect(r.recallAtK, `${r.caseId} recall@${r.k} >= ${r.minRecall}`).toBeGreaterThanOrEqual(r.minRecall)
      expect(r.mrr, `${r.caseId} mrr >= ${r.minMrr ?? 0.5}`).toBeGreaterThanOrEqual(r.minMrr ?? 0.5)
      expect(r.passSourceType, `${r.caseId} top-1 source ${r.topSourceTypes[0] ?? 'none'} in ${r.caseId}`)
        .toBe(true)
      expect(r.topSourceTypes[0], `${r.caseId} top-1 source type present`).toBeTruthy()
    }

    // batch gates
    expect(batch.pass, `batch gate failed (${JSON.stringify(batch.gates)})`).toBe(true)
    expect(batch.failures).toEqual([])
  }, 60_000)
})
