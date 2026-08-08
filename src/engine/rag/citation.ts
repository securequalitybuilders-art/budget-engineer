import type { CodeDocument, SearchResult, TextChunk } from './types'

const CITE_NAME_MAP: Record<string, string> = {
  zbc: 'By-Laws 1977',
  'by-laws': 'By-Laws 1977',
  'by-laws-1977': 'By-Laws 1977',
  mbb: 'By-Laws 1977',
  sans10400: 'SANS 10400',
  sans10400a: 'SANS 10400-A',
  'sans-10400': 'SANS 10400',
  'sans-10400-a': 'SANS 10400-A',
  sans10160: 'SANS 10160',
  'sans-10160': 'SANS 10160',
  ziqs: 'ZIQS SMM',
  'ziqs-smm': 'ZIQS SMM',
  legislation: 'Zimbabwe Legislation',
  si562025: 'SI 56/2025',
  'si-56-2025': 'SI 56/2025',
  architects: 'SI 56/2025',
  'architects-act': 'SI 56/2025',
  ema: 'EMA (Cap 20:27)',
}

const SECTION_ID_RE = /sec-\d+-([\d.]+)/
const CHAPTER_NUM_RE = /^(\d+)\s/

export function citeNameFor(chunk: { docCode?: string; docId: string; docTitle?: string }): string {
  const key = (chunk.docCode ?? chunk.docId).toLowerCase()
  if (CITE_NAME_MAP[key]) return CITE_NAME_MAP[key]
  if (chunk.docTitle) return chunk.docTitle
  return key
}

export function chapterFromPath(path: string[]): string {
  if (path.length === 0) return '1'
  const top = path[0]
  const numMatch = CHAPTER_NUM_RE.exec(top)
  return numMatch ? numMatch[1] : top
}

export function clauseFromSectionId(sectionId: string): string {
  const match = SECTION_ID_RE.exec(sectionId)
  return match ? match[1] : sectionId
}

export function citationForChunk(chunk: { docCode?: string; docId: string; docTitle?: string; sectionId: string; path?: string[]; chapter?: string }): string {
  const name = citeNameFor(chunk)
  const chapter = chunk.chapter ?? chapterFromPath(chunk.path ?? [])
  const clause = clauseFromSectionId(chunk.sectionId)
  return `[${name} Ch.${chapter} Cl.${clause}]`
}

export function citationForSection(doc: CodeDocument, section: { id: string; path: string[] }): string {
  const name = citeNameFor({ docCode: doc.code, docId: doc.id, docTitle: doc.title })
  const chapter = chapterFromPath(section.path)
  const clause = clauseFromSectionId(section.id)
  return `[${name} Ch.${chapter} Cl.${clause}]`
}

export function attachCitations(results: SearchResult[]): SearchResult[] {
  return results.map((r) => ({
    ...r,
    citation: r.citation ?? citationForChunk(r),
  }))
}

export function isChildChunk(chunk: TextChunk): boolean {
  return Boolean(chunk.parentChunkId)
}
