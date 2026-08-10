import { describe, expect, it } from 'vitest'
import { buildDefaultRagIndex } from '@/engine/rag/codeCorpus'
import {
  SAZ_CATALOGUE_DOC,
  SAZ_CATALOGUE_TEXT,
  TYPOLOGIES_GUIDE_DOC,
  TYPOLOGIES_GUIDE_TEXT,
} from '@/engine/rag/curatedCorpus'
import { slugId } from '@/engine/rag/corpusLoader'
import { hybridSearch } from '@/engine/rag/hybrid'

describe('curated in-app corpus', () => {
  it('embeds both curated documents without page markers', () => {
    expect(SAZ_CATALOGUE_TEXT.length).toBeGreaterThan(50_000)
    expect(TYPOLOGIES_GUIDE_TEXT.length).toBeGreaterThan(50_000)
    expect(SAZ_CATALOGUE_TEXT).not.toMatch(/--\s*\d+\s+of\s+\d+\s*--/)
    expect(TYPOLOGIES_GUIDE_TEXT).not.toMatch(/--\s*\d+\s+of\s+\d+\s*--/)
  })

  it('builds documents through the standard ingestion path', () => {
    expect(SAZ_CATALOGUE_DOC.id).toBe('saz-catalogue')
    expect(SAZ_CATALOGUE_DOC.code).toBe('saz')
    expect(SAZ_CATALOGUE_DOC.jurisdiction).toBe('zimbabwe')
    expect(SAZ_CATALOGUE_DOC.sections.length).toBeGreaterThan(0)
    expect(TYPOLOGIES_GUIDE_DOC.id).toBe('building-typologies-design-guide')
    expect(TYPOLOGIES_GUIDE_DOC.sections.length).toBeGreaterThan(0)
  })

  it('buildDefaultRagIndex now indexes four documents', () => {
    const index = buildDefaultRagIndex()
    expect(index.hasDocument('by-laws-1977')).toBe(true)
    expect(index.hasDocument('si-56-2025')).toBe(true)
    expect(index.hasDocument('saz-catalogue')).toBe(true)
    expect(index.hasDocument('building-typologies-design-guide')).toBe(true)
    expect(index.size).toBeGreaterThan(0)
  })

  it('hybrid search retrieves SAZ catalogue content', () => {
    const index = buildDefaultRagIndex()
    const results = hybridSearch(index, 'Zimbabwe standards for concrete masonry units and aggregates', { k: 5 })
    const saz = results.filter((r) => r.docId === 'saz-catalogue')
    expect(saz.length).toBeGreaterThan(0)
    expect(saz[0].text.toLowerCase()).toMatch(/zws|standard/)
  })

  it('hybrid search retrieves the building typologies guide', () => {
    const index = buildDefaultRagIndex()
    const results = hybridSearch(index, 'spatial programming and dimensional standards for building design', { k: 5 })
    const typ = results.filter((r) => r.docId === 'building-typologies-design-guide')
    expect(typ.length).toBeGreaterThan(0)
  })

  it('curated doc ids match the on-disk corpus slugs for MCP dedup', () => {
    expect(slugId('saz-catalogue.txt')).toBe('saz-catalogue')
    expect(slugId('Building Typologies Design Guide.txt')).toBe('building-typologies-design-guide')
  })
})
