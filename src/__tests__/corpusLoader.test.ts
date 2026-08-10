import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RagIndex } from '@/engine/rag/ragIndex'
import {
  slugId,
  humanizeTitle,
  metadataForFile,
  csvToTabText,
  parseCorpusFile,
  listCorpusFiles,
  loadCorpusDocuments,
  corpusSummary,
  buildIndexWithCorpus,
  buildCorpusIndex,
  indexFromCorpus,
} from '@/engine/rag/corpusLoader'

const SANS_TEXT = `1 General Requirements
1.1 The minimum ceiling height for any habitable room shall be 2.4m measured from finished floor to finished ceiling.
1.2 Every habitable room shall be provided with natural ventilation through openable windows.
1.3 The minimum floor area of a habitable room shall be 6m2.
`

const COST_CSV = `Material,Unit,Rate
Cement 50kg,bag,1200
Bricks,thousand,25000
"Plaster, 1:4",m2,8
`

let tmpDir: string

function makeDir(): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'be-corpus-'))
  return tmpDir
}

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

describe('corpusLoader filename conventions', () => {
  it('slugs filenames into ids', () => {
    expect(slugId('SANS 10400-O.txt')).toBe('sans-10400-o')
    expect(slugId('by-laws-1977.md')).toBe('by-laws-1977')
    expect(slugId('ziqs_smm.CSV')).toBe('ziqs-smm')
    expect(slugId('!!!.txt')).toBe('unnamed')
  })

  it('humanizes titles with known map + acronym handling', () => {
    expect(humanizeTitle('si-56-2025')).toBe('SI 56/2025 Architects Registration')
    expect(humanizeTitle('sans-10400-o')).toBe('SANS 10400 O')
    expect(humanizeTitle('historical-costs')).toBe('Historical Costs')
  })

  it('derives code and jurisdiction metadata', () => {
    expect(metadataForFile('sans10400.txt')).toEqual({
      id: 'sans10400',
      title: 'SANS 10400',
      code: 'sans',
      jurisdiction: 'south-africa',
    })
    expect(metadataForFile('ziqs-smm.csv').code).toBe('ziqs')
    expect(metadataForFile('historical-costs.csv').code).toBeUndefined()
    expect(metadataForFile('historical-costs.csv').jurisdiction).toBe('zimbabwe')
  })
})

describe('corpusLoader CSV and parsing', () => {
  it('converts CSV to tab-separated tables', () => {
    expect(csvToTabText(COST_CSV)).toBe('Material\tUnit\tRate\nCement 50kg\tbag\t1200\nBricks\tthousand\t25000\nPlaster, 1:4\tm2\t8')
  })

  it('parses a txt file into a CodeDocument with numbered sections', () => {
    const doc = parseCorpusFile('sans10400.txt', SANS_TEXT)
    expect(doc).not.toBeNull()
    expect(doc!.id).toBe('sans10400')
    expect(doc!.sections.length).toBeGreaterThan(2)
    expect(doc!.sections.some((s) => s.heading.includes('ceiling height'))).toBe(true)
  })

  it('captures CSV rows as a TableData table on a section', () => {
    const doc = parseCorpusFile('historical-costs.csv', COST_CSV)
    expect(doc).not.toBeNull()
    const withTable = doc!.sections.find((s) => s.tables && s.tables.length > 0)
    expect(withTable?.tables?.[0].headers).toEqual(['Material', 'Unit', 'Rate'])
    expect(withTable?.tables?.[0].rows).toHaveLength(3)
  })

  it('returns null for empty input', () => {
    expect(parseCorpusFile('empty.txt', '   \n')).toBeNull()
  })
})

describe('corpusLoader directory scanning', () => {
  it('lists only supported files, sorted', () => {
    const dir = makeDir()
    writeFileSync(join(dir, 'sans10400.txt'), SANS_TEXT)
    writeFileSync(join(dir, 'notes.json'), '{}')
    writeFileSync(join(dir, 'empty.txt'), '   \n')
    expect(listCorpusFiles(dir)).toEqual(['empty.txt', 'sans10400.txt'])
  })

  it('loads corpus documents and skips unsupported/empty files', () => {
    const dir = makeDir()
    writeFileSync(join(dir, 'sans10400.txt'), SANS_TEXT)
    writeFileSync(join(dir, 'historical-costs.csv'), COST_CSV)
    writeFileSync(join(dir, 'notes.json'), '{}')
    writeFileSync(join(dir, 'empty.txt'), '   \n')
    const docs = loadCorpusDocuments(dir)
    expect(docs).toHaveLength(2)
    const ids = docs.map((d) => d.id)
    expect(ids).toContain('sans10400')
    expect(ids).toContain('historical-costs')
  })

  it('is empty-safe on a missing directory', () => {
    expect(listCorpusFiles(join(tmpdir(), 'does-not-exist'))).toEqual([])
    expect(loadCorpusDocuments(join(tmpdir(), 'does-not-exist'))).toEqual([])
  })

  it('summarizes per-document section and chunk counts', () => {
    const dir = makeDir()
    writeFileSync(join(dir, 'sans10400.txt'), SANS_TEXT)
    const docs = loadCorpusDocuments(dir)
    const rows = corpusSummary(docs)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('sans10400')
    expect(rows[0].sections).toBe(docs[0].sections.length)
    expect(rows[0].chunks).toBeGreaterThan(0)
  })
})

describe('corpusLoader index building', () => {
  it('extends a base index and makes corpus docs searchable', () => {
    const dir = makeDir()
    writeFileSync(join(dir, 'sans10400.txt'), SANS_TEXT)
    const base = new RagIndex()
    expect(base.size).toBe(0)
    const index = buildIndexWithCorpus(base, dir)
    expect(index.size).toBeGreaterThan(0)
    const results = index.search('minimum ceiling height', { k: 3 })
    expect(results.some((r) => r.docId === 'sans10400')).toBe(true)
  })

  it('leaves the base index unchanged when the dir has no files', () => {
    const base = new RagIndex()
    base.addDocument(parseCorpusFile('by-laws-1977.md', SANS_TEXT)!)
    const sizeBefore = base.size
    const index = buildIndexWithCorpus(base, join(tmpdir(), 'does-not-exist'))
    expect(index).toBe(base)
    expect(index.size).toBe(sizeBefore)
  })

  it('builds the full corpus index from a directory alone', () => {
    const dir = makeDir()
    writeFileSync(join(dir, 'sans10400.txt'), SANS_TEXT)
    const index = indexFromCorpus(dir)
    expect(index.size).toBeGreaterThan(0)
  })

  it('buildCorpusIndex seeds By-Laws 1977 on top of any corpus files', () => {
    const dir = makeDir()
    writeFileSync(join(dir, 'sans10400.txt'), SANS_TEXT)
    const index = buildCorpusIndex(dir)
    expect(index.size).toBeGreaterThan(0)
    const results = index.search('ceiling height', { k: 3 })
    expect(results.some((r) => r.docId === 'by-laws-1977')).toBe(true)
    expect(results.some((r) => r.docId === 'sans10400')).toBe(true)
  })

  it('embedded docs take precedence over same-id corpus files', () => {
    const dir = makeDir()
    writeFileSync(
      join(dir, 'by-laws-1977.txt'),
      '2 Alternate\n2.1 A completely different rule that does not collide with the embedded by-laws section ids.\n'
    )
    const index = buildCorpusIndex(dir)
    const byLaws = index.allChunks().filter((c) => c.docId === 'by-laws-1977')
    expect(byLaws.length).toBeGreaterThan(0)
    expect(byLaws.some((c) => c.sectionId.includes('sec-2-1.1'))).toBe(true)
    expect(byLaws.some((c) => c.text.includes('completely different'))).toBe(false)
  })
})
