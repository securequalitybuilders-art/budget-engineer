import type { CodeDocument, CodeSection, TextChunk } from './types'

export interface ChunkingOptions {
  maxChars?: number
  overlapChars?: number
  parentChild?: boolean
  childChars?: number
  parentChars?: number
  chapter?: string
}

const DEFAULT_MAX = 1200
const DEFAULT_OVERLAP = 120
const DEFAULT_CHILD_CHARS = 500
const DEFAULT_PARENT_CHARS = 2000

export function extractGrade(text: string): string | undefined {
  const m = /Grade\s+([A-D])\b/i.exec(text)
  return m ? m[1].toUpperCase() : undefined
}

function chapterFromTopSection(sections: CodeSection[], sectionId: string): string | undefined {
  const byId = new Map(sections.map((s) => [s.id, s]))
  let cur = byId.get(sectionId)
  let top = cur
  const guard = new Set<string>()
  while (cur && cur.parentId && !guard.has(cur.id)) {
    guard.add(cur.id)
    cur = byId.get(cur.parentId)
    if (cur) top = cur
  }
  const m = top ? /^[^:]*:?sec-\d+-(\d+)$/.exec(top.id) : null
  return m ? m[1] : undefined
}

interface OffsetPiece {
  start: number
  text: string
}

function splitPieces(text: string, maxChars: number, overlap: number, minChars: number): OffsetPiece[] {
  const pieces: OffsetPiece[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length)
    const piece = text.slice(start, end)
    if (piece.trim()) {
      if (pieces.length > 0 && piece.length < minChars) {
        pieces[pieces.length - 1] = {
          start: pieces[pieces.length - 1].start,
          text: pieces[pieces.length - 1].text + piece,
        }
      } else {
        pieces.push({ start, text: piece })
      }
    }
    if (end >= text.length) break
    start = end - overlap
  }
  return pieces
}

export function chunkSection(section: CodeSection, docId: string, path: string[], opts: ChunkingOptions = {}): TextChunk[] {
  const maxChars = opts.maxChars ?? DEFAULT_MAX
  const overlap = opts.overlapChars ?? DEFAULT_OVERLAP
  const grade = extractGrade(section.text)

  const tableText = (section.tables ?? []).map((t, ti) => {
    const rows = [t.headers, ...t.rows].map((r) => r.join(' | ')).join('\n')
    return `[Table ${ti + 1}${t.caption ? `: ${t.caption}` : ''}]\n${rows}`
  })

  if (opts.parentChild) {
    return chunkSectionParentChild(section, docId, path, {
      childChars: opts.childChars ?? DEFAULT_CHILD_CHARS,
      parentChars: opts.parentChars ?? DEFAULT_PARENT_CHARS,
      maxChars,
      overlap,
      chapter: opts.chapter,
      grade,
    })
  }

  const paragraphBlocks: string[] = []
  let acc = ''
  const paragraphs = section.text.split(/\n{2,}/).filter((p) => p.trim())
  for (const para of paragraphs) {
    const candidate = acc ? `${acc}\n${para}` : para
    if (candidate.length > maxChars && acc) {
      paragraphBlocks.push(acc)
      acc = para
    } else {
      acc = candidate
    }
  }
  if (acc) paragraphBlocks.push(acc)

  const blocks = [...paragraphBlocks, ...tableText].filter(Boolean)
  if (blocks.length === 0) return chunksForBlocks(section, docId, path, [], opts.chapter, grade)

  const base = chunksForBlocks(section, docId, path, blocks.map((b, i) => ({ block: b, id: `${section.id}-c${i + 1}` })), opts.chapter, grade)

  const expanded: TextChunk[] = []
  for (const chunk of base) {
    if (chunk.text.length <= maxChars + overlap) {
      expanded.push(chunk)
      continue
    }
    let start = 0
    let ci = 1
    while (start < chunk.text.length) {
      const piece = chunk.text.slice(start, start + maxChars)
      expanded.push({
        id: `${chunk.id}-s${ci}`,
        docId,
        sectionId: section.id,
        heading: chunk.heading,
        path,
        text: piece,
        parentId: chunk.parentId,
        chapter: chunk.chapter,
        grade,
      })
      start += maxChars - overlap
      ci++
    }
  }
  return expanded
}

function chunksForBlocks(section: CodeSection, docId: string, path: string[], blocks: { block: string; id: string }[], chapter?: string, grade?: string): TextChunk[] {
  const result: TextChunk[] = []
  for (const { block, id } of blocks) {
    result.push({
      id,
      docId,
      sectionId: section.id,
      heading: section.heading,
      path,
      text: block,
      parentId: section.parentId,
      chapter,
      grade,
    })
  }
  return result
}

function chunkSectionParentChild(
  section: CodeSection,
  docId: string,
  path: string[],
  opts: { childChars: number; parentChars: number; maxChars: number; overlap: number; chapter?: string; grade?: string },
): TextChunk[] {
  const fullText = [section.text, ...section.tables?.map((t) => `[Table]\n${[t.headers, ...t.rows].map((r) => r.join(' | ')).join('\n')}`) ?? []]
    .filter(Boolean)
    .join('\n')
  if (!fullText.trim()) return []

  const parents = splitPieces(fullText, opts.parentChars, 0, 0)
  const parentChunks: TextChunk[] = parents.map((p, i) => ({
    id: `${section.id}-p${i + 1}`,
    docId,
    sectionId: section.id,
    heading: section.heading,
    path,
    text: p.text,
    parentId: section.parentId,
    chapter: opts.chapter,
    grade: opts.grade,
  }))

  const children = splitPieces(fullText, opts.childChars, opts.overlap, Math.floor(opts.childChars / 2.5))
  const childChunks: TextChunk[] = children.map((c, i) => {
    let parentIndex = 0
    for (let pi = 0; pi < parents.length; pi++) {
      if (parents[pi].start <= c.start) parentIndex = pi
      else break
    }
    const parentChunk = parentChunks[parentIndex]
    return {
      id: `${section.id}-c${i + 1}`,
      docId,
      sectionId: section.id,
      heading: section.heading,
      path,
      text: c.text,
      parentId: section.parentId,
      parentChunkId: parentChunk?.id,
      parentText: parentChunk?.text,
      chapter: opts.chapter,
      grade: opts.grade,
    }
  })
  return [...parentChunks, ...childChunks]
}

export function chunkDocument(doc: CodeDocument, opts: ChunkingOptions = {}): TextChunk[] {
  const chunks: TextChunk[] = []
  for (const section of doc.sections) {
    const path = buildPath(doc.sections, section.id)
    const chapter = chapterFromTopSection(doc.sections, section.id) ?? (path[0] ? /^\d+/.exec(path[0])?.[0] : undefined)
    chunks.push(...chunkSection(section, doc.id, path, { ...opts, chapter }))
  }
  return chunks
}

export function buildPath(sections: CodeSection[], sectionId: string): string[] {
  const byId = new Map(sections.map((s) => [s.id, s]))
  const path: string[] = []
  let current = byId.get(sectionId)
  const guard = new Set<string>()
  while (current && !guard.has(current.id)) {
    guard.add(current.id)
    path.unshift(current.heading)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return path
}

export function getChunkHeadingPath(chunk: TextChunk): string {
  return chunk.path.join(' / ')
}
