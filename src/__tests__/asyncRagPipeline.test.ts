// Async RAG pipeline — KPI1 production path.
//
// Covers the async hybrid search (phrase-boosted BM25 + remote dense leg with
// bounded over-fetch), the 3-tier reranker, the graceful-degradation quality
// protocol, tri-lingual answer generation, the free-Bytez query rewrite path,
// and the wired degradation short-circuit inside `analyzeCompliance`.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseCodeDocument } from '@/engine/rag/extraction'
import { RagIndex, createIndex } from '@/engine/rag/ragIndex'
import {
  hybridSearchAsync,
  exactPhrasePresent,
  phraseBoostedBm25,
  type HybridHit,
} from '@/engine/rag/hybridSearch'
import { rerankHybrid } from '@/engine/rag/reranker'
import { buildDefaultRagIndex } from '@/engine/rag/codeCorpus'
import { applyDegradationPolicy, evaluateRetrievalQuality, NOT_FOUND_MESSAGE, NOT_FOUND_REASON } from '@/engine/rag/gracefulDegradation'
import { generateAnswer, buildLocalAnswer, citeHit } from '@/engine/rag/generate'
import { rewriteQuery } from '@/engine/rag/queryRewrite'
import { analyzeCompliance } from '@/engine/rag/analysis'
import * as rag from '@/engine/rag'

vi.mock('@huggingface/transformers', () => ({
  pipeline: async () => {
    throw new Error('mock: transformers unavailable in tests')
  },
}))

const state = vi.hoisted(() => ({
  bytezKey: undefined as string | undefined,
  genResult: null as { text: string | null; error?: string } | null,
  embedResult: null as { embedding: number[] | null; error?: string } | null,
}))

vi.mock('@/lib/llm/freeRouter', async () => {
  const actual = await vi.importActual<typeof import('@/lib/llm/freeRouter')>('@/lib/llm/freeRouter')
  return {
    ...actual,
    resolveBytezKey: (override?: string) => override?.trim() || state.bytezKey,
    generateFree: async () => state.genResult ?? { text: null, error: 'mock: no key' },
    embedFree: async () => state.embedResult ?? { embedding: null, error: 'mock: no embed' },
  }
})

const CODE_TEXT = `
1 General Requirements
1.1 A habitable room shall have a minimum floor area of 6 m².
1.2 Minimum ceiling height shall not be less than 2.4 m.

2 Ventilation
2.1 Every habitable room shall be provided with natural ventilation.
2.2 See clause 1.1 for room area requirements.

3 Masonry
3.1 Walls shall be at least 230 mm thick.
3.2 Common bricks shall comply with SAZ standards.
`

const SAZ_TEXT = `
3 Masonry
3.3 Masonry units shall comply with SAZ standards for common bricks of 7MPa minimum compressive strength.
3.4 Bedding mortar shall be 1:3 cement sand.
`

function tinyIndex(): RagIndex {
  return createIndex([parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT + SAZ_TEXT })])
}

function syntheticPhraseIndex(): RagIndex {
  return createIndex([
    parseCodeDocument({
      id: 'synthetic',
      title: 'Synthetic',
      text: `
1 Materials
1.1 The SAZ 7 MPa common brick is approved for loadbearing walls.
1.2 Bricks are common on every site and many walls use them.
1.3 Windows and doors require lintels above the opening.
`,
    }),
  ])
}

describe('async hybrid search', () => {
  beforeEach(() => {
    state.bytezKey = undefined
    state.genResult = null
    state.embedResult = null
  })

  it('retrieves the exact SAZ masonry phrase from the embedded code corpus via BM25', async () => {
    const index = buildDefaultRagIndex()
    const hits = await hybridSearchAsync(index, 'SAZ standards for common bricks', { k: 6 })
    expect(hits.length).toBeGreaterThan(0)
    const top = hits[0]
    expect(top?.docId).toBe('by-laws-1977')
    expect(top?.sectionId).toMatch(/3\.3/)
    expect(top?.text_child).toContain('7MPa')
  })

  it('ranks a literal-phrase chunk first via phraseBoostedBm25', async () => {
    const index = syntheticPhraseIndex()
    const chunks = index.allChunks()
    const stats = { docCount: chunks.length, avgDocLength: 1, documentFrequencies: new Map<string, number>() }
    for (const tok of ['saz', '7mpa', 'common', 'brick']) stats.documentFrequencies.set(tok, 1)
    const phraseHit = chunks.find((c) => c.text.includes('SAZ 7 MPa common brick'))
    const otherHit = chunks.find((c) => c.text.includes('Bricks are common'))
    expect(phraseHit).toBeDefined()
    expect(otherHit).toBeDefined()
    expect(exactPhrasePresent('SAZ 7 MPa common brick', phraseHit!.text)).toBe(true)
    expect(phraseBoostedBm25('SAZ 7 MPa common brick', phraseHit!.text, stats)).toBeGreaterThan(
      phraseBoostedBm25('SAZ 7 MPa common brick', otherHit!.text, stats),
    )
  })

  it('boosts the phrase chunk to the top of the sparse leg', async () => {
    const index = syntheticPhraseIndex()
    const chunks = index.allChunks()
    const stats = { docCount: chunks.length, avgDocLength: 1, documentFrequencies: new Map<string, number>() }
    for (const tok of ['saz', '7mpa', 'common', 'brick', 'walls', 'approved', 'lintels']) {
      stats.documentFrequencies.set(tok, 1)
    }
    const ranked = chunks
      .map((c) => ({ c, s: phraseBoostedBm25('SAZ 7 MPa common brick', c.text, stats) }))
      .sort((a, b) => b.s - a.s)
    expect(ranked[0].c.text).toContain('SAZ 7 MPa common brick')
  })

  it('runs the remote dense leg over the bounded sparse pool with a mocked embedder', async () => {
    const index = syntheticPhraseIndex()
    const phraseChunk = index.allChunks().find((c) => c.text.includes('SAZ 7 MPa common brick'))!
    const vectors = new Map<string, number[]>()
    for (const c of index.allChunks()) {
      vectors.set(c.id, c.id === phraseChunk.id ? [1, 0, 0] : [0, 1, 0])
    }
    let embedCalls = 0
    const embedder = async (text: string): Promise<number[] | null> => {
      embedCalls++
      const hit = index.allChunks().find((c) => c.text === text)
      return hit ? vectors.get(hit.id)! : [1, 0, 0]
    }
    const hits = await hybridSearchAsync(index, 'SAZ 7 MPa common brick', { k: 3, useRemoteDense: true, embedder })
    expect(hits[0].chunkId).toBe(phraseChunk.id)
    expect(embedCalls).toBeLessThanOrEqual(index.allChunks().length + 1)
  })

  it('returns empty when the corpus has no relevant chunk', async () => {
    const index = createIndex([parseCodeDocument({ id: 'empty', title: 'Empty', text: '1.1 Nothing relevant here.' })])
    const hits = await hybridSearchAsync(index, 'SAZ standards for common bricks', { k: 6, minScore: 1 })
    expect(hits).toEqual([])
  })
})

describe('reranker (3 tiers)', () => {
  let hits: HybridHit[]

  beforeEach(async () => {
    state.bytezKey = undefined
    state.genResult = null
    state.embedResult = null
    const index = tinyIndex()
    hits = await hybridSearchAsync(index, 'minimum ceiling height', { k: 6 })
    expect(hits.length).toBeGreaterThan(0)
  })

  it('falls back to lexical ranking when no embedder/key is available', async () => {
    const out = await rerankHybrid('minimum ceiling height', hits, { method: 'auto' })
    expect(out.method).toBe('lexical')
    expect(out.hits.length).toBe(hits.length)
    expect(typeof out.hits[0].rerankScore).toBe('number')
  })

  it('uses a mocked embedder for the bytez tier', async () => {
    const ceiling = hits.find((h) => h.text_child.includes('ceiling height'))
    const embedder = async (text: string): Promise<number[] | null> => {
      const related = text.includes('ceiling') || text.includes('height')
      return related ? [1, 0] : [0, 1]
    }
    const out = await rerankHybrid('ceiling height', hits, { method: 'bytez', embedder })
    expect(out.method).toBe('bytez')
    expect(out.hits[0].chunkId).toBe(ceiling?.chunkId)
  })

  it('flags empty hits with the degradation payload', async () => {
    const out = await rerankHybrid('anything', [], {})
    expect(out.hits).toEqual([])
    expect(out.needsClarification).toBe(true)
    expect(out.fellBack).toBe(true)
    expect(out.fallbackReason).toBe(NOT_FOUND_REASON)
  })

  it('re-exports the never-hallucinate constants', () => {
    expect(NOT_FOUND_MESSAGE).toContain('DzeNhare could not locate this')
    expect(NOT_FOUND_REASON).toBe('Regulation not found in indexed repository')
  })
})

describe('graceful degradation policy', () => {
  it('classifies strong / weak / poor retrievals', () => {
    const strong = evaluateRetrievalQuality([{ rerankScore: 0.9 }, { rerankScore: 0.8 }, { rerankScore: 0.75 }])
    const weak = evaluateRetrievalQuality([{ rerankScore: 0.9 }, { rerankScore: 0.4 }, { rerankScore: 0.2 }])
    const poor = evaluateRetrievalQuality([{ rerankScore: 0.3 }, { rerankScore: 0.1 }])
    expect(strong.verdict).toBe('strong')
    expect(weak.verdict).toBe('weak')
    expect(poor.verdict).toBe('poor')
    expect(poor.aboveThreshold).toBe(0)
    expect(strong.ndcg).toBe(1)
  })

  it('returns found=false only for the poor verdict', () => {
    const poor = applyDegradationPolicy([{ rerankScore: 0.2 }, { rerankScore: 0.1 }], 0.2)
    const weak = applyDegradationPolicy([{ rerankScore: 0.9 }, { rerankScore: 0.2 }, { rerankScore: 0.2 }], 0.9)
    expect(poor.found).toBe(false)
    expect(poor.fellBack).toBe(true)
    expect(poor.message).toBe(NOT_FOUND_MESSAGE)
    expect(weak.found).toBe(true)
    expect(weak.fellBack).toBe(true)
  })

  it('passes cleanly for a strong retrieval', () => {
    const out = applyDegradationPolicy([{ rerankScore: 0.92 }, { rerankScore: 0.88 }], 0.92)
    expect(out.found).toBe(true)
    expect(out.fellBack).toBe(false)
    expect(out.needsClarification).toBe(false)
  })
})

describe('answer generation', () => {
  let hits: HybridHit[]

  beforeEach(async () => {
    state.bytezKey = undefined
    state.genResult = null
    state.embedResult = null
    hits = await hybridSearchAsync(tinyIndex(), 'minimum ceiling height', { k: 3 })
    expect(hits.length).toBeGreaterThan(0)
  })

  it('returns the not-found message for empty hits', async () => {
    const out = await generateAnswer('x', [], {})
    expect(out.answer).toBe(NOT_FOUND_MESSAGE)
    expect(out.fellBack).toBe(true)
    expect(out.fallbackReason).toBe(NOT_FOUND_REASON)
  })

  it('builds a local tri-lingual answer with citations when remote is unavailable', async () => {
    const out = await generateAnswer('minimum ceiling height', hits, { language: 'en' })
    expect(out.method).toBe('local')
    expect(out.fellBack).toBe(true)
    expect(out.answer).toContain('Based on 3 retrieved references')
    expect(out.citations.length).toBe(hits.length)
    expect(out.citations[0]).toMatch(/\[ZBC Ch\.1 Cl\.1\.2\]/)
  })

  it('produces Shona and Ndebele lead lines', () => {
    expect(buildLocalAnswer('x', hits, 'sn').answer).toContain('nongedzero')
    expect(buildLocalAnswer('x', hits, 'nd').answer).toContain('okutholakele')
  })

  it('uses a remote answer when the free LLM returns valid JSON', async () => {
    state.bytezKey = 'test-key'
    state.genResult = { text: '{"answer":"The minimum ceiling height is 2.4 m.","citations":["[ZBC Ch.1 Cl.1.2]"]}' }
    const out = await generateAnswer('minimum ceiling height', hits, { language: 'en' })
    expect(out.method).toBe('remote')
    expect(out.fellBack).toBe(false)
    expect(out.answer).toContain('2.4 m')
    expect(out.citations).toEqual(['[ZBC Ch.1 Cl.1.2]'])
  })

  it('falls back to local when the remote JSON is malformed', async () => {
    state.bytezKey = 'test-key'
    state.genResult = { text: 'not json at all' }
    const out = await generateAnswer('minimum ceiling height', hits, { language: 'en' })
    expect(out.method).toBe('local')
    expect(out.fellBack).toBe(true)
    expect(out.answer).toContain('Based on')
  })

  it('cites via citationForChunk into the mandated format', () => {
    const citation = citeHit({ ...hits[0], text_child: '', text_parent: '', source_type: 'statute', clause: 'Ch.1 Cl.1.2', rrf: 0 })
    expect(citation).toMatch(/\[ZBC Ch\.1 Cl\.1\.2\]/)
  })
})

describe('query rewrite free path', () => {
  beforeEach(() => {
    state.bytezKey = undefined
    state.genResult = null
    state.embedResult = null
  })

  it('uses the free Bytez LLM when a key is present', async () => {
    state.bytezKey = 'test-key'
    state.genResult = { text: '{"rewritten":"minimum ceiling height per regulations","vague":false}' }
    const out = await rewriteQuery('what is the min height', {}, [])
    expect(out.method).toBe('remote')
    expect(out.rewritten).toBe('minimum ceiling height per regulations')
    expect(out.rationale.join(' ')).toContain('free Bytez LLM rewrite')
  })

  it('falls back to deterministic rewriting when the free response is unusable', async () => {
    state.bytezKey = 'test-key'
    state.genResult = { text: 'garbage' }
    const out = await rewriteQuery('min ceiling height', {}, [])
    expect(out.method).toBe('local')
    expect(out.rewritten.length).toBeGreaterThan(0)
  })

  it('stays local when no key and no engine are configured', async () => {
    const out = await rewriteQuery('minimum ceiling height', {}, [])
    expect(['local', 'identity']).toContain(out.method)
  })
})

describe('analyzeCompliance degradation wiring', () => {
  it('short-circuits a poor retrieval into the explicit not-found report', async () => {
    const index = createIndex([
      parseCodeDocument({
        id: 'code',
        title: 'ZBC',
        text: '1 General\n1.1 Roofs shall be pitched. 2 General\n2.1 Fences shall be one metre high.',
      }),
    ])
    const report = await analyzeCompliance(index, { query: 'zygote quantum frobnicator', hybrid: true })
    expect(report.findings).toEqual([])
    expect(report.fellBack).toBe(true)
    expect(report.fallbackReason).toBe(NOT_FOUND_REASON)
    expect(report.warnings[0]).toBe(NOT_FOUND_MESSAGE)
    expect(report.needsClarification).toBe(true)
    expect(report.sources).toEqual([])
  })

  it('still returns findings for a strong query', async () => {
    const index = tinyIndex()
    const report = await analyzeCompliance(index, { query: 'minimum ceiling height', hybrid: true })
    expect(report.findings.length).toBeGreaterThan(0)
    expect(report.fellBack).toBe(false)
  })
})

describe('barrel exports', () => {
  it('exposes the new async pipeline modules', () => {
    expect(typeof rag.hybridSearchAsync).toBe('function')
    expect(typeof rag.rerankHybrid).toBe('function')
    expect(typeof rag.generateAnswer).toBe('function')
    expect(typeof rag.applyDegradationPolicy).toBe('function')
    expect(typeof rag.EmbeddingCache).toBe('function')
    expect(rag.NOT_FOUND_MESSAGE).toBeDefined()
  })
})
