import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parseCodeDocument, extractSections, linkSectionParents } from '@/engine/rag/extraction'
import { chunkDocument, buildPath, getChunkHeadingPath } from '@/engine/rag/chunking'
import { embedText, cosineSimilarity, tokenize } from '@/engine/rag/embeddings'
import { RagIndex, createIndex } from '@/engine/rag/ragIndex'
import { buildCrossReferenceGraph, extractCrossReferences, findReferencedChunks } from '@/engine/rag/crossref'
import { extractConstraintsFromChunks, extractConstraintsFromText } from '@/engine/rag/constraints'
import { analyzeCompliance, buildComplianceContext, COMPLIANCE_PROMPT } from '@/engine/rag/analysis'
import { useAiSettingsStore } from '@/stores/aiSettingsStore'

const CODE_TEXT = `
1 General Requirements
1.1 A habitable room shall have a minimum floor area of 6 m².
1.2 Minimum ceiling height shall not be less than 2.4 m.

2 Ventilation
2.1 Every habitable room shall be provided with natural ventilation.
2.2 See clause 1.1 for room area requirements.

3 Tables
3.1 Minimum clearances
Wall\tDistance
Boundary wall\t1.5 m
Building line\t3 m
`

const CODE_TEXT_TWO = `
1 Fire Safety
1.1 Maximum travel distance to an exit shall not exceed 45 m.
1.2 Exit doors shall have a clear opening not less than 800 mm.

2 References
2.1 Refer to annex A for occupancy classifications.
`

describe('RAG — text extraction', () => {
  it('extracts sections with headings, levels and parent links', () => {
    const doc = parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT })
    expect(doc.sections.length).toBe(8)
    expect(doc.sections[0].heading).toBe('General Requirements')
    expect(doc.sections[0].level).toBe(1)
    expect(doc.sections[1].parentId).toBe(doc.sections[0].id)
  })

  it('keeps TSV tables attached to their section', () => {
    const doc = parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT })
    const tableSection = doc.sections.find((s) => s.heading === 'Minimum clearances')
    expect(tableSection).toBeDefined()
    expect(tableSection!.tables?.length).toBe(1)
    expect(tableSection!.tables![0].headers).toEqual(['Wall', 'Distance'])
    expect(tableSection!.tables![0].rows).toHaveLength(2)
  })

  it('links parent sections in the hierarchy', () => {
    const linked = linkSectionParents(extractSections('1 Top\n1.1 Child\n1.1.1 Grandchild\n2 Sibling'))
    expect(linked[1].parentId).toBe(linked[0].id)
    expect(linked[2].parentId).toBe(linked[1].id)
    expect(linked[3].parentId).toBeUndefined()
  })
})

describe('RAG — table-aware chunking', () => {
  it('produces chunks carrying their heading path', () => {
    const doc = parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT })
    const chunks = chunkDocument(doc)
    expect(chunks.length).toBeGreaterThanOrEqual(5)
    const c0 = chunks[0]
    expect(c0.path[0]).toBe('General Requirements')
    expect(getChunkHeadingPath(c0)).toContain('General Requirements')
  })

  it('builds a multi-level path for nested sections', () => {
    const doc = parseCodeDocument({ id: 'd', title: 'x', text: '1 Top\n1.1 Child\n1.1.1 Leaf clause text here.' })
    const path = buildPath(doc.sections, doc.sections[2].id)
    expect(path).toEqual(['Top', 'Child', 'Leaf clause text here.'])
  })

  it('does not split table chunks with tables', () => {
    const doc = parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT })
    const chunks = chunkDocument(doc)
    const withTable = chunks.find((c) => c.tables !== undefined)
    expect(withTable).toBeUndefined()
  })
})

describe('RAG — embeddings (local, deterministic)', () => {
  it('returns unit-length vectors', () => {
    const v = embedText('minimum floor area 6 m²')
    const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
    expect(mag).toBeCloseTo(1, 5)
  })

  it('embeds similar text closer than dissimilar text', () => {
    const a = embedText('minimum ceiling height')
    const b = embedText('ceiling height minimum')
    const c = embedText('maximum travel distance to exit')
    expect(cosineSimilarity(a, b)).toBeGreaterThan(cosineSimilarity(a, c))
  })

  it('tokenizes with bigrams', () => {
    expect(tokenize('Ceiling height 2.4 m')).toEqual(['ceiling', 'height', '2', '4', 'm'])
  })
})

describe('RAG — indexed storage + semantic search', () => {
  it('indexes documents and returns ranked results', () => {
    const index = new RagIndex()
    index.addDocument(parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT }))
    index.addDocument(parseCodeDocument({ id: 'fire', title: 'Fire Code', text: CODE_TEXT_TWO }))
    const results = index.search('travel distance to an exit', { k: 3 })
    expect(results.length).toBe(3)
    expect(results[0].heading).toContain('travel distance')
    expect(results[0].docId).toBe('fire')
  })

  it('filters results by document', () => {
    const index = new RagIndex()
    index.addDocument(parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT }))
    index.addDocument(parseCodeDocument({ id: 'fire', title: 'Fire Code', text: CODE_TEXT_TWO }))
    const results = index.search('travel distance', { docId: 'code' })
    expect(results.every((r) => r.docId === 'code')).toBe(true)
  })

  it('serializes and restores the index', () => {
    const index = new RagIndex()
    index.addDocument(parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT }))
    const restored = RagIndex.fromJSON(index.toJSON())
    expect(restored.size).toBe(index.size)
    expect(restored.search('ceiling height').length).toBeGreaterThan(0)
  })

  it('removes a document by id', () => {
    const index = createIndex([
      parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT }),
      parseCodeDocument({ id: 'fire', title: 'Fire Code', text: CODE_TEXT_TWO }),
    ])
    const before = index.size
    const removed = index.removeDocument('code')
    expect(removed).toBeGreaterThan(0)
    expect(index.size).toBe(before - removed)
  })
})

describe('RAG — cross-reference mapping (knowledge graph)', () => {
  it('extracts clause references from text', () => {
    const refs = extractCrossReferences('Minimum per clause 1.1, see also section 2 and reg 15.2.')
    expect(refs.some((r) => r.to === 'clause-1.1')).toBe(true)
    expect(refs.some((r) => r.to === 'section-2')).toBe(true)
    expect(refs.some((r) => r.to === 'regulation-15.2')).toBe(true)
  })

  it('builds a graph of node ids and edges', () => {
    const doc = parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT })
    const graph = buildCrossReferenceGraph([doc])
    expect(graph.nodes).toContain(doc.sections[0].id)
    const refSection = doc.sections.find((s) => s.heading.includes('See clause 1.1'))!
    const fromRef = graph.referencesFor(refSection.id)
    expect(fromRef.length).toBeGreaterThan(0)
  })

  it('resolves referenced chunks through the index', () => {
    const doc = parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT })
    const index = new RagIndex()
    index.addDocument(doc)
    const graph = buildCrossReferenceGraph([doc], index.allChunks())
    const ref = doc.sections.find((s) => s.heading.includes('See clause 1.1'))!
    const referenced = findReferencedChunks(graph, doc.sections, ref.id)
    expect(referenced).toContain(doc.sections[1].id)
  })
})

describe('RAG — NLP constraint extraction', () => {
  it('extracts minimum constraints with units', () => {
    const extracted = extractConstraintsFromText('A habitable room shall have a minimum floor area of 6 m².')
    const area = extracted.find((c) => c.rule.category === 'room-area')
    expect(area).toBeDefined()
    expect(area!.rule.operator).toBe('min')
    expect(area!.rule.value).toBe(6)
    expect(area!.rule.unit).toBe('m²')
  })

  it('extracts maximum constraints', () => {
    const extracted = extractConstraintsFromText('Maximum travel distance to an exit shall not exceed 45 m.')
    expect(extracted.some((c) => c.rule.operator === 'max' && c.rule.value === 45 && c.rule.unit === 'm')).toBe(true)
  })

  it('extracts constraints from chunks with clause refs', () => {
    const index = new RagIndex()
    index.addDocument(parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT }))
    const results = index.search('ceiling height', { k: 3 })
    const extracted = extractConstraintsFromChunks(
      results.map((s) => ({ id: s.chunkId, docId: s.docId, sectionId: s.sectionId, heading: s.heading, path: [s.heading], text: s.text })),
    )
    expect(extracted.some((c) => c.rule.category === 'ceiling-height' && c.rule.value === 2.4)).toBe(true)
  })
})

describe('RAG — LLM analysis → structured compliance report', () => {
  beforeEach(() => {
    useAiSettingsStore.getState().setEngine('local-rules')
    useAiSettingsStore.getState().clearApiKey('gemini')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('produces a local-rules report when no remote engine is configured', async () => {
    const index = new RagIndex()
    index.addDocument(parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT }))
    const report = await analyzeCompliance(index, { query: 'minimum ceiling height', jurisdiction: 'zimbabwe' })
    expect(report.engineUsed).toBe('local-rules')
    expect(report.jurisdiction).toBe('zimbabwe')
    expect(report.findings.length).toBeGreaterThan(0)
    expect(report.sources.length).toBeGreaterThan(0)
  })

  it('routes to the remote provider when configured and parses its JSON', async () => {
    useAiSettingsStore.getState().setEngine('gemini')
    useAiSettingsStore.getState().setApiKey('gemini', 'test-key')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '{"findings":[{"ruleId":"r1","title":"Ceiling height","status":"pass","actual":"2.4 m","required":"min 2.4 m","note":"ok","sources":["sec"]}],"score":100,"warnings":[]}',
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const index = new RagIndex()
    index.addDocument(parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT }))
    const report = await analyzeCompliance(index, { query: 'ceiling height' })
    expect(report.engineUsed).toBe('gemini')
    expect(report.totalRules).toBe(1)
    expect(report.score).toBe(100)
    expect(report.findings[0].title).toBe('Ceiling height')
    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('generativelanguage.googleapis.com')
  })

  it('falls back to local rules when the remote call fails', async () => {
    useAiSettingsStore.getState().setEngine('groq')
    useAiSettingsStore.getState().setApiKey('groq', 'test-key')
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    const index = new RagIndex()
    index.addDocument(parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT }))
    const report = await analyzeCompliance(index, { query: 'minimum floor area' })
    expect(report.engineUsed).toBe('local-rules')
    expect(report.fellBack).toBe(true)
    expect(report.fallbackReason).toContain('network down')
  })

  it('builds a compliance prompt with retrieved context', () => {
    const sources = [
      { chunkId: 'c1', docId: 'd', sectionId: 'sec', heading: 'Ventilation', text: 'Every habitable room needs ventilation', score: 0.9 },
    ]
    const ctx = { query: 'ventilation', sources }
    const prompt = COMPLIANCE_PROMPT(ctx)
    expect(prompt).toContain('ventilation')
    expect(prompt).toContain('Ventilation')
    expect(buildComplianceContext(ctx)).toContain('score 0.900')
  })
})
