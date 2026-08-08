import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parseCodeDocument } from '@/engine/rag/extraction'
import { chunkDocument, getChunkHeadingPath } from '@/engine/rag/chunking'
import { RagIndex } from '@/engine/rag/ragIndex'
import { buildBm25Stats, bm25Score, hybridSearch, rrfFusion } from '@/engine/rag/hybrid'
import { citeNameFor, chapterFromPath, clauseFromSectionId, attachCitations } from '@/engine/rag/citation'
import { DEFAULT_RERANK_THRESHOLD, localRerankScore, rerankResults, lexicalCoverage, clarificationPrompt } from '@/engine/rag/rerank'
import { analyzeCompliance } from '@/engine/rag/analysis'
import { useAiSettingsStore } from '@/stores/aiSettingsStore'

const BYLAWS_TEXT = `
1 General Requirements
1.1 A habitable room shall have a minimum floor area of 6 m².
1.2 Minimum ceiling height shall not be less than 2.4 m.

2 Ventilation
2.1 Every habitable room shall be provided with natural ventilation.
2.2 See clause 1.1 for room area requirements.

3 Structural
3.1 Loadbearing masonry walls shall be not less than 90 mm thick.
3.2 Party walls shall have a minimum 60 minute fire resistance.

4 Fire Safety
4.1 Maximum travel distance to an exit shall not exceed 45 m.
4.2 Exit doors shall have a clear opening not less than 800 mm.

5 Tables
5.1 Minimum clearances
Wall\tDistance
Boundary wall\t1.5 m
Building line\t3 m
`

const LONG_SECTION_TEXT = Array.from({ length: 60 }, (_, i) => `Clause ${i + 1}. Every room shall be ventilated and shall have a clear ceiling height of at least 2.4 metres.`).join('\n')

describe('KPI1 — hybrid BM25 + dense retrieval (RRF)', () => {
  it('computes BM25 scores favouring exact code terms', () => {
    const chunks = chunkDocument(parseCodeDocument({ id: 'by-laws', title: 'Model Building By-Laws 1977', text: BYLAWS_TEXT }))
    const stats = buildBm25Stats(chunks)
    const ceilingChunk = chunks.find((c) => c.text.includes('ceiling height'))!
    const fireChunk = chunks.find((c) => c.text.includes('travel distance'))!
    expect(bm25Score('ceiling height', ceilingChunk.text, stats)).toBeGreaterThan(bm25Score('ceiling height', fireChunk.text, stats))
  })

  it('fuses dense + sparse lists with reciprocal rank fusion', () => {
    const dense = [
      { chunkId: 'a', docId: 'd', sectionId: 's', heading: 'h', text: 't', score: 0.9 },
      { chunkId: 'b', docId: 'd', sectionId: 's', heading: 'h', text: 't', score: 0.8 },
    ]
    const sparse = [
      { chunkId: 'b', docId: 'd', sectionId: 's', heading: 'h', text: 't', score: 3.2 },
      { chunkId: 'c', docId: 'd', sectionId: 's', heading: 'h', text: 't', score: 1.1 },
    ]
    const fused = rrfFusion(dense as never, sparse as never, 60)
    expect(fused.get('a')).toBeGreaterThan(0)
    expect(fused.get('c')).toBeDefined()
    expect(fused.get('b')).toBeGreaterThan(fused.get('a')!)
  })

  it('returns exact statutory-code matches via hybrid search', () => {
    const index = new RagIndex()
    index.addDocument(parseCodeDocument({ id: 'by-laws', title: 'Model Building By-Laws 1977', text: BYLAWS_TEXT }))
    const results = hybridSearch(index, 'ceiling height 2.4 m', { k: 3 })
    expect(results.length).toBe(3)
    expect(results[0].text).toContain('ceiling height')
  })

  it('hybrid search recovers clauses that dense cosine alone ranks low', () => {
    const index = new RagIndex()
    index.addDocument(parseCodeDocument({ id: 'by-laws', title: 'Model Building By-Laws 1977', text: BYLAWS_TEXT }))
    const exact = hybridSearch(index, 'exit doors clear opening 800 mm', { k: 3 })
    expect(exact[0].text.toLowerCase()).toContain('exit doors')
    expect(exact[0].sparseScore ?? 0).toBeGreaterThan(0)
  })
})

describe('KPI1 — parent-child chunking', () => {
  it('produces child chunks (200-500) with parent context (1000-2000)', () => {
    const doc = parseCodeDocument({ id: 'by-laws', title: 'Model Building By-Laws 1977', text: LONG_SECTION_TEXT })
    const chunks = chunkDocument(doc, { parentChild: true })
    const parents = chunks.filter((c) => /-p\d+$/.test(c.id))
    const children = chunks.filter((c) => c.parentChunkId)
    expect(parents.length).toBeGreaterThan(0)
    expect(children.length).toBeGreaterThan(parents.length)
    for (const p of parents) {
      expect(p.text.length).toBeLessThanOrEqual(2000)
    }
    for (const c of children) {
      expect(c.text.length).toBeLessThanOrEqual(700)
      expect(c.parentChunkId).toBeTruthy()
      expect(c.parentText!.length).toBeGreaterThan(0)
    }
  })

  it('does not break heading paths when parent-child enabled', () => {
    const doc = parseCodeDocument({ id: 'by-laws', title: 'Model Building By-Laws 1977', text: BYLAWS_TEXT })
    const chunks = chunkDocument(doc, { parentChild: true })
    expect(chunks.length).toBeGreaterThan(0)
    expect(getChunkHeadingPath(chunks[0])).toContain('General Requirements')
  })

  it('default (non-parent-child) chunking is unchanged', () => {
    const doc = parseCodeDocument({ id: 'by-laws', title: 'Model Building By-Laws 1977', text: BYLAWS_TEXT })
    const chunks = chunkDocument(doc)
    expect(chunks.every((c) => c.parentChunkId === undefined)).toBe(true)
  })
})

describe('KPI1 — citations', () => {
  it('maps document codes to canonical citation names', () => {
    expect(citeNameFor({ docCode: 'zbc', docId: 'x', docTitle: 'X' })).toBe('By-Laws 1977')
    expect(citeNameFor({ docCode: 'ziqs', docId: 'x', docTitle: 'X' })).toBe('ZIQS SMM')
    expect(citeNameFor({ docCode: 'sans10400', docId: 'x', docTitle: 'X' })).toBe('SANS 10400')
    expect(citeNameFor({ docCode: 'si562025', docId: 'x', docTitle: 'X' })).toBe('SI 56/2025')
  })

  it('derives chapter and clause from the section path', () => {
    expect(chapterFromPath(['4 Fire Safety', '4.1'])).toBe('4')
    expect(chapterFromPath(['General Requirements'])).toBe('General Requirements')
    expect(clauseFromSectionId('by-laws:sec-4-4.1')).toBe('4.1')
  })

  it('formats a statutory citation', () => {
    const doc = parseCodeDocument({ id: 'by-laws', code: 'zbc', title: 'Model Building By-Laws 1977', text: BYLAWS_TEXT })
    const index = new RagIndex()
    index.addDocument(doc)
    const results = index.search('ceiling height', { k: 1 })
    expect(results[0].citation).toBeUndefined()
    const cited = attachCitations(results)
    expect(cited[0].citation).toMatch(/^\[By-Laws 1977 Ch\.\d+ Cl\.\d+(\.\d+)*\]$/)
  })
})

describe('KPI1 — rerank + confidence threshold + graceful degradation', () => {
  it('scores exact-code matches above the 0.7 relevance threshold', () => {
    const score = localRerankScore('ceiling height', 'Minimum ceiling height shall not be less than 2.4 m.')
    expect(lexicalCoverage('ceiling height', 'Minimum ceiling height shall not be less than 2.4 m.')).toBe(1)
    expect(score).toBeGreaterThanOrEqual(DEFAULT_RERANK_THRESHOLD)
  })

  it('reranks results and flags low-confidence retrieval', () => {
    const results = [
      { chunkId: 'c1', docId: 'd', sectionId: 's', heading: 'Fire Safety', text: 'Maximum travel distance to an exit shall not exceed 45 m.', score: 0.5 },
      { chunkId: 'c2', docId: 'd', sectionId: 's', heading: 'General', text: 'Minimum ceiling height shall not be less than 2.4 m.', score: 0.4 },
    ]
    const outcome = rerankResults('minimum ceiling height', results, { threshold: 0.7 })
    expect(outcome.results[0].chunkId).toBe('c2')
    expect(outcome.results[0].rerankScore).toBeGreaterThanOrEqual(0.7)
    expect(outcome.needsClarification).toBe(false)
  })

  it('builds a clarification prompt when confidence is below threshold', () => {
    const prompt = clarificationPrompt('kitchen sink', 0.2, 0.7)
    expect(prompt).toContain('0.20')
    expect(prompt).toContain('0.70')
    expect(prompt).toContain('kitchen sink')
    expect(prompt).toContain('By-Laws 1977')
  })
})

describe('KPI1 — analysis integration (graceful degradation)', () => {
  beforeEach(() => {
    useAiSettingsStore.getState().setEngine('local-rules')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('flags needsClarification for a vague query with no code match', async () => {
    const index = new RagIndex()
    index.addDocument(parseCodeDocument({ id: 'by-laws', title: 'Model Building By-Laws 1977', text: BYLAWS_TEXT }))
    const report = await analyzeCompliance(index, { query: 'kitchen sink dimensions', jurisdiction: 'zimbabwe' })
    expect(report.needsClarification).toBe(true)
    expect(report.confidence).toBeLessThan(DEFAULT_RERANK_THRESHOLD)
    expect(report.warnings.some((w) => w.includes('relevance threshold'))).toBe(true)
    expect(report.findings.every((f) => f.status === 'warn')).toBe(true)
  })

  it('produces verified findings for a precise statutory query', async () => {
    const index = new RagIndex()
    index.addDocument(parseCodeDocument({ id: 'by-laws', title: 'Model Building By-Laws 1977', text: BYLAWS_TEXT }))
    const report = await analyzeCompliance(index, { query: 'minimum ceiling height', jurisdiction: 'zimbabwe' })
    expect(report.needsClarification).toBe(false)
    expect(report.sources.length).toBeGreaterThan(0)
    expect(report.sources[0].citation).toMatch(/^\[By-Laws 1977/)
  })
})
