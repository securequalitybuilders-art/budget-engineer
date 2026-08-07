import type { CodeDocument, CodeSection, TextChunk } from './types'

export interface ChunkingOptions {
  maxChars?: number
  overlapChars?: number
}

const DEFAULT_MAX = 1200
const DEFAULT_OVERLAP = 120

export function chunkSection(section: CodeSection, docId: string, path: string[], opts: ChunkingOptions = {}): TextChunk[] {
  const maxChars = opts.maxChars ?? DEFAULT_MAX
  const overlap = opts.overlapChars ?? DEFAULT_OVERLAP
  const chunks: TextChunk[] = []
  const baseId = section.id

  const tableText = (section.tables ?? []).map((t, ti) => {
    const rows = [t.headers, ...t.rows].map((r) => r.join(' | ')).join('\n')
    return `[Table ${ti + 1}${t.caption ? `: ${t.caption}` : ''}]\n${rows}`
  })

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
  if (blocks.length === 0) return chunks

  for (let bi = 0; bi < blocks.length; bi++) {
    let text = blocks[bi]
    if (bi < blocks.length - 1 && text.length > maxChars) {
      text = text.slice(0, maxChars)
    }
    chunks.push({
      id: `${baseId}-c${bi + 1}`,
      docId,
      sectionId: section.id,
      heading: section.heading,
      path,
      text,
      parentId: section.parentId,
    })
  }

  const expanded: TextChunk[] = []
  for (const chunk of chunks) {
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
      })
      start += maxChars - overlap
      ci++
    }
  }
  return expanded
}

export function chunkDocument(doc: CodeDocument, opts: ChunkingOptions = {}): TextChunk[] {
  const chunks: TextChunk[] = []
  for (const section of doc.sections) {
    const path = buildPath(doc.sections, section.id)
    chunks.push(...chunkSection(section, doc.id, path, opts))
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
