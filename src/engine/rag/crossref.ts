import type { CodeDocument, CrossReference, TextChunk } from './types'
import { chunkDocument } from './chunking'

export interface CrossReferenceGraph {
  nodes: string[]
  edges: CrossReference[]
  referencesFor(nodeId: string): CrossReference[]
}

const REF_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'clause', re: /\bclause\s+([0-9]+(?:\.[0-9]+)*)/gi },
  { label: 'section', re: /\bsection\s+([0-9]+(?:\.[0-9]+)*)/gi },
  { label: 'regulation', re: /\breg(?:ulation)?\s+([0-9]+(?:\.[0-9]+)*)/gi },
  { label: 'annex', re: /\bannex(?:ure)?\s+([a-z0-9]+)/gi },
]

export function extractCrossReferences(text: string): CrossReference[] {
  const refs: CrossReference[] = []
  const seen = new Set<string>()
  for (const { label, re } of REF_PATTERNS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const target = `${label}-${m[1].toLowerCase()}`
      const key = `${label}:${m[1].toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      const start = Math.max(0, m.index - 60)
      const end = Math.min(text.length, m.index + m[0].length + 60)
      refs.push({ from: 'text', to: target, context: text.slice(start, end).replace(/\s+/g, ' ').trim() })
    }
  }
  return refs
}

export function buildCrossReferenceGraph(docs: CodeDocument[], chunks?: TextChunk[]): CrossReferenceGraph {
  const allChunks = chunks ?? docs.flatMap((d) => chunkDocument(d))
  const nodeIds = new Set<string>()
  for (const doc of docs) {
    for (const sec of doc.sections) nodeIds.add(sec.id)
  }
  for (const chunk of allChunks) nodeIds.add(chunk.sectionId)

  const edges: CrossReference[] = []
  const refsByNode = new Map<string, CrossReference[]>()

  for (const chunk of allChunks) {
    for (const ref of extractCrossReferences(chunk.text)) {
      edges.push({ ...ref, from: chunk.sectionId })
    }
  }

  for (const edge of edges) {
    if (!refsByNode.has(edge.from)) refsByNode.set(edge.from, [])
    refsByNode.get(edge.from)!.push(edge)
  }

  return {
    nodes: [...nodeIds],
    edges,
    referencesFor(nodeId: string) {
      return refsByNode.get(nodeId) ?? []
    },
  }
}

export function resolveRefTarget(target: string, sections: { id: string }[]): string | undefined {
  const num = /(?:clause|section|regulation)-([0-9]+(?:\.[0-9]+)*)$/.exec(target)?.[1]
  if (!num) return undefined
  return sections.find((s) => s.id.endsWith(num))?.id
}

export function findReferencedChunks(graph: CrossReferenceGraph, sections: { id: string }[], fromSectionId: string, depth = 1): string[] {
  const visited = new Set<string>()
  const out: string[] = []
  const walk = (nodeId: string, remaining: number) => {
    if (remaining < 0 || visited.has(nodeId)) return
    visited.add(nodeId)
    for (const edge of graph.referencesFor(nodeId)) {
      const resolved = resolveRefTarget(edge.to, sections)
      if (resolved && !out.includes(resolved)) {
        out.push(resolved)
        walk(resolved, remaining - 1)
      }
    }
  }
  walk(fromSectionId, depth)
  return out
}
