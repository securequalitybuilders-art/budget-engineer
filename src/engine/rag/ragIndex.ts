import type { CodeDocument, SearchResult, TextChunk } from './types'
import { chunkDocument } from './chunking'
import { embedQuery, embedText, cosineSimilarity } from './embeddings'

export interface RagIndexData {
  chunks: TextChunk[]
}

export interface SearchOptions {
  k?: number
  minScore?: number
  docId?: string
}

export class RagIndex {
  private chunks: Map<string, TextChunk> = new Map()
  private chunkEmbeddings: Map<string, number[]> = new Map()
  private docIds: Set<string> = new Set()

  get size(): number {
    return this.chunks.size
  }

  get knownDocIds(): string[] {
    return [...this.docIds]
  }

  getChunk(id: string): TextChunk | undefined {
    return this.chunks.get(id)
  }

  hasDocument(docId: string): boolean {
    return this.docIds.has(docId)
  }

  addDocument(doc: CodeDocument): number {
    const chunks = chunkDocument(doc)
    let added = 0
    this.docIds.add(doc.id)
    for (const chunk of chunks) {
      if (this.chunks.has(chunk.id)) continue
      chunk.docTitle = doc.title
      chunk.docCode = doc.code
      this.chunks.set(chunk.id, chunk)
      this.chunkEmbeddings.set(chunk.id, embedText(chunk.text))
      added++
    }
    return added
  }

  addChunks(chunks: TextChunk[]): number {
    let added = 0
    for (const chunk of chunks) {
      if (this.chunks.has(chunk.id)) continue
      this.chunks.set(chunk.id, chunk)
      this.chunkEmbeddings.set(chunk.id, embedText(chunk.text))
      added++
    }
    return added
  }

  removeDocument(docId: string): number {
    let removed = 0
    for (const [id, chunk] of [...this.chunks]) {
      if (chunk.docId !== docId) continue
      this.chunks.delete(id)
      this.chunkEmbeddings.delete(id)
      removed++
    }
    this.docIds.delete(docId)
    return removed
  }

  clear(): void {
    this.chunks.clear()
    this.chunkEmbeddings.clear()
    this.docIds.clear()
  }

  search(query: string, opts: SearchOptions = {}): SearchResult[] {
    const k = opts.k ?? 5
    const minScore = opts.minScore ?? 0
    const q = embedQuery(query)
    const results: SearchResult[] = []
    for (const [id, chunk] of this.chunks) {
      if (opts.docId && chunk.docId !== opts.docId) continue
      const embedding = this.chunkEmbeddings.get(id)
      if (!embedding) continue
      const score = cosineSimilarity(q, embedding)
      if (score < minScore) continue
      results.push({
        chunkId: id,
        docId: chunk.docId,
        sectionId: chunk.sectionId,
        heading: chunk.heading,
        text: chunk.text,
        score,
        path: chunk.path,
        chapter: chunk.chapter,
        docTitle: chunk.docTitle,
        parentText: chunk.parentText,
      })
    }
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, k)
  }

  allChunks(): TextChunk[] {
    return [...this.chunks.values()]
  }

  toJSON(): RagIndexData {
    return { chunks: [...this.chunks.values()] }
  }

  static fromJSON(data: RagIndexData): RagIndex {
    const index = new RagIndex()
    for (const chunk of data.chunks) {
      index.chunks.set(chunk.id, chunk)
      index.chunkEmbeddings.set(chunk.id, embedText(chunk.text))
      if (chunk.docId) index.docIds.add(chunk.docId)
    }
    return index
  }
}

export function createIndex(docs: CodeDocument[]): RagIndex {
  const index = new RagIndex()
  for (const doc of docs) {
    index.addDocument(doc)
  }
  return index
}
