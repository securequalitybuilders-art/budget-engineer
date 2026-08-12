// Track B gap-close regression suite — the three genuine deltas between the
// spec (`dzenhare-sqb-starter/lib/rag`) and the shipped local-first pipeline:
//   1. `grade` metadata extraction (DocChunk contract) threaded through chunks
//      and search results.
//   2. `filterSource` API parity on both the async (KPI1) and sync hybrid paths,
//      accepting both the spec taxonomy (bylaws_1977/saz/ziqs/si56/...) and the
//      local taxonomy (statute/standard/catalogue/...).
//   3. Parent injection in answer generation — top 4-6 reranked parents carried
//      with their citations into the local answer and the LLM prompt.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseCodeDocument } from '@/engine/rag/extraction'
import { chunkDocument, extractGrade } from '@/engine/rag/chunking'
import type { CodeDocument } from '@/engine/rag/types'
import { buildDefaultRagIndex } from '@/engine/rag/codeCorpus'
import { hybridSearchAsync, specSourceTypeFor, matchesSourceFilter, sourceTypeFor } from '@/engine/rag/hybridSearch'
import { hybridSearch } from '@/engine/rag/hybrid'
import { generateAnswer, buildLocalAnswer, topParents, GENERATE_ANSWER_PROMPT, DEFAULT_MAX_PARENTS } from '@/engine/rag/generate'
import type { HybridHit } from '@/engine/rag/hybridSearch'
import { RagIndex } from '@/engine/rag/ragIndex'

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

function doc(text: string): CodeDocument {
  return parseCodeDocument({ id: 'test-code', title: 'Test Code', text })
}

const WITH_GRADE = `1 General
1.1 All loadbearing masonry walls shall achieve the fire resistance stated in the table.
1.2 Structural members Grade A 2hrs must be protected.
1.3 Window lintels Grade C 0.5hrs.
2 Ceilings
2.1 Habitable rooms shall have a minimum ceiling height of 2.4 m.
`

function parentChildIndex() {
  const index = new RagIndex()
  index.addChunks(chunkDocument(doc(WITH_GRADE), { parentChild: true, childChars: 150, parentChars: 500 }))
  return index
}

describe('grade metadata (spec DocChunk contract)', () => {
  it('extracts a Grade [A-D] token from section text', () => {
    expect(extractGrade('Grade A 2hrs')).toBe('A')
    expect(extractGrade('grade c 0.5 hrs')).toBe('C')
    expect(extractGrade('no grade present here')).toBeUndefined()
  })

  it('stamps grade on parent-child children and parents of a graded section', () => {
    const chunks = chunkDocument(doc(WITH_GRADE), { parentChild: true, childChars: 120, parentChars: 400 })
    const graded = chunks.filter((c) => c.sectionId.includes('1.2'))
    expect(graded.length).toBeGreaterThan(0)
    for (const c of graded) expect(c.grade).toBe('A')
    const ungraded = chunks.filter((c) => c.sectionId.includes('2.1'))
    expect(ungraded.length).toBeGreaterThan(0)
    for (const c of ungraded) expect(c.grade).toBeUndefined()
  })

  it('stamps grade on paragraph chunks of a graded section', () => {
    const chunks = chunkDocument(doc(WITH_GRADE))
    const graded = chunks.filter((c) => c.sectionId.includes('1.2'))
    expect(graded.length).toBeGreaterThan(0)
    for (const c of graded) expect(c.grade).toBe('A')
  })

  it('propagates grade through hybridSearchAsync results', async () => {
    const hits = await hybridSearchAsync(parentChildIndex(), 'Grade A structural members', { k: 6 })
    const withGrade = hits.filter((h) => h.text_child.includes('Grade A'))
    expect(withGrade.length).toBeGreaterThan(0)
    expect(withGrade[0].grade).toBe('A')
  })
})

describe('filterSource parity', () => {
  it('maps doc ids to the spec source taxonomy', () => {
    expect(specSourceTypeFor('by-laws-1977')).toBe('bylaws_1977')
    expect(specSourceTypeFor('saz-catalogue')).toBe('saz')
    expect(specSourceTypeFor('si-56-2025')).toBe('si56')
    expect(specSourceTypeFor('ziqs-smm')).toBe('ziqs')
    expect(specSourceTypeFor('my-project-cost-history')).toBe('historical')
  })

  it('matches on both the spec and the local taxonomy', () => {
    expect(matchesSourceFilter('by-laws-1977', 'bylaws_1977')).toBe(true)
    expect(matchesSourceFilter('by-laws-1977', 'statute')).toBe(true)
    expect(matchesSourceFilter('saz-catalogue', 'saz')).toBe(true)
    expect(matchesSourceFilter('saz-catalogue', 'standard')).toBe(true)
    expect(matchesSourceFilter('by-laws-1977', 'saz')).toBe(false)
    expect(matchesSourceFilter('anything', undefined)).toBe(true)
  })

  it('hybridSearchAsync filters to a single source via the spec taxonomy', async () => {
    const index = buildDefaultRagIndex()
    const saz = await hybridSearchAsync(index, 'common brick', { k: 6, filterSource: 'saz' })
    expect(saz.length).toBeGreaterThan(0)
    for (const h of saz) expect(sourceTypeFor(h.docId)).toBe('standard')
    const statutes = await hybridSearchAsync(index, 'common brick', { k: 6, filterSource: 'bylaws_1977' })
    expect(statutes.length).toBeGreaterThan(0)
    for (const h of statutes) expect(sourceTypeFor(h.docId)).toBe('statute')
  })

  it('sync hybridSearch honors filterSource too', () => {
    const index = buildDefaultRagIndex()
    const saz = hybridSearch(index, 'common brick', { k: 6, filterSource: 'saz' })
    expect(saz.length).toBeGreaterThan(0)
    for (const r of saz) expect(sourceTypeFor(r.docId)).toBe('standard')
  })
})

function hitsWithParents(): HybridHit[] {
  return parentChildIndex()
    .allChunks()
    .filter((c) => !c.id.includes('-p'))
    .map((c, i) => ({
      chunkId: c.id,
      docId: c.docId,
      sectionId: c.sectionId,
      heading: c.heading,
      text: c.text,
      score: 1 - i * 0.01,
      path: c.path,
      chapter: c.chapter,
      docTitle: c.docTitle,
      parentText: c.parentText,
      text_child: c.text,
      text_parent: c.parentText ?? `Full passage for ${c.heading}`,
      source_type: 'statute',
      clause: 'Ch.1 Cl.1.2',
      rrf: 1 - i * 0.01,
    }))
}

describe('parent injection in generation', () => {
  it('topParents dedupes by section and caps at the default max', () => {
    const hits = [
      ...hitsWithParents(),
      ...hitsWithParents().map((h) => ({ ...h, chunkId: `${h.chunkId}-dup`, rerankScore: 0.99 })),
    ]
    const parents = topParents(hits)
    expect(parents.length).toBeLessThanOrEqual(DEFAULT_MAX_PARENTS)
    expect(parents.length).toBeLessThan(hits.length)
    const sections = new Set(parents.map((p) => p.hit.sectionId))
    expect(sections.size).toBe(parents.length)
  })

  it('skips hits without parent text', () => {
    const hits = hitsWithParents().map((h) => ({ ...h, text_parent: '' }))
    expect(topParents(hits)).toEqual([])
  })

  it('orders parents by rerank score when present', () => {
    const a = hitsWithParents()[0]
    const b = hitsWithParents()[1]
    const parents = topParents([
      { ...a, sectionId: 'sec-a', chunkId: 'a', rerankScore: 0.1 },
      { ...b, sectionId: 'sec-b', chunkId: 'b', rerankScore: 0.9 },
    ])
    expect(parents[0].hit.sectionId).toBe('sec-b')
    expect(parents[1].hit.sectionId).toBe('sec-a')
  })

  it('appends a Referenced code passages block to the local answer with citations', async () => {
    const hits = await hybridSearchAsync(parentChildIndex(), 'Grade A structural members', { k: 6 })
    const local = buildLocalAnswer('Grade A structural members', hits, 'en')
    expect(local.answer).toContain('Referenced code passages:')
    expect(local.answer).toMatch(/\[test-code Ch\.1 Cl\.1\.2\]/)
    expect(local.citations.length).toBe(hits.length)
  })

  it('injects parents into the LLM prompt with citations', () => {
    const prompt = GENERATE_ANSWER_PROMPT('min height', hitsWithParents())
    expect(prompt).toContain('Referenced parent passages')
    expect(prompt).toMatch(/\[test-code Ch\.1 Cl\.1\.2\]/)
  })

  it('keeps the not-found and lead-line behaviour intact', async () => {
    const hits = await hybridSearchAsync(buildDefaultRagIndex(), 'minimum ceiling height', { k: 3 })
    expect(hits.length).toBeGreaterThan(0)
    const out = await generateAnswer('minimum ceiling height', hits, { language: 'en' })
    expect(out.answer).toContain('Based on 3 retrieved references')
    expect(buildLocalAnswer('x', hits, 'sn').answer).toContain('nongedzero')
    expect(buildLocalAnswer('x', hits, 'nd').answer).toContain('okutholakele')
  })
})

describe('barrel re-exports', () => {
  beforeEach(() => {
    state.bytezKey = undefined
    state.genResult = null
    state.embedResult = null
  })
  it('exports the new helpers from the rag barrel', async () => {
    const rag = await import('@/engine/rag')
    expect(typeof rag.topParents).toBe('function')
    expect(typeof rag.specSourceTypeFor).toBe('function')
    expect(typeof rag.matchesSourceFilter).toBe('function')
    expect(typeof rag.extractGrade).toBe('function')
  })
})
