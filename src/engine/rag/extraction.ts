import type { CodeDocument, CodeSection, TableData } from './types'

const HEADING_RE = /^(#{1,4}\s+|([0-9]+(?:\.[0-9]+)*)\s+(?:\.\s+)?)/

function parseTable(lines: string[]): TableData | null {
  const cells = lines.map((l) => l.split('\t').map((c) => c.trim()))
  if (cells.length < 2) return null
  const width = cells[0].length
  if (width < 2) return null
  if (cells[0].some((c) => /^[-: ]+$/.test(c))) return null
  const headers = cells[0]
  const rows = cells.slice(1).filter((r) => r.length >= 2)
  if (rows.length === 0) return null
  return { headers, rows }
}

export function extractSections(text: string): CodeSection[] {
  const lines = text.split(/\r?\n/)
  const sections: CodeSection[] = []
  let current: CodeSection | null = null
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) {
      i++
      continue
    }

    if (line.includes('\t')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('\t')) {
        tableLines.push(lines[i])
        i++
      }
      const table = parseTable(tableLines)
      if (!current) current = { id: 'sec-preamble', heading: 'Preamble', level: 1, text: '' }
      if (table) {
        current.tables = current.tables ?? []
        current.tables.push(table)
      } else {
        current.text += tableLines.join('\n') + '\n'
      }
      continue
    }

    const headingMatch = HEADING_RE.exec(trimmed)
    if (headingMatch) {
      if (current) sections.push(current)
      const num = headingMatch[2]
      const level = num
        ? Math.min(num.split('.').length, 4)
        : headingMatch[1].trim().split('#').length - 1
      const id = num ? `sec-${sections.length + 1}-${num}` : `sec-${sections.length + 1}`
      const remainder = trimmed.replace(HEADING_RE, '').trim()
      const isClauseLine = num != null && remainder.endsWith('.')
      current = {
        id,
        heading: remainder || trimmed,
        level,
        text: isClauseLine ? remainder + '\n' : '',
      }
      i++
      continue
    }

    if (!current) current = { id: 'sec-preamble', heading: 'Preamble', level: 1, text: '' }
    current.text += trimmed + '\n'
    i++
  }
  if (current) sections.push(current)
  return sections
}

export function linkSectionParents(sections: CodeSection[]): CodeSection[] {
  const stack: CodeSection[] = []
  for (const sec of sections) {
    while (stack.length > 0 && stack[stack.length - 1].level >= sec.level) {
      stack.pop()
    }
    if (stack.length > 0) {
      sec.parentId = stack[stack.length - 1].id
    }
    stack.push(sec)
  }
  return sections
}

export function parseCodeDocument(input: { id: string; title: string; text: string; jurisdiction?: string; code?: string }): CodeDocument {
  const sections = linkSectionParents(extractSections(input.text))
  const remap = new Map<string, string>()
  for (const sec of sections) {
    const newId = `${input.id}:${sec.id}`
    remap.set(sec.id, newId)
    sec.id = newId
  }
  for (const sec of sections) {
    if (sec.parentId) sec.parentId = remap.get(sec.parentId)
  }
  return {
    id: input.id,
    title: input.title,
    jurisdiction: input.jurisdiction,
    code: input.code,
    sections,
  }
}
