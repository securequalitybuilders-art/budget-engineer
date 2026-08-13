// IndexedDB persistence for a built hybrid RagIndex.
//
// Goal (Data Quality Gap #4): the Node/MCP enterprise corpus builds a ~228k-chunk
// index whose embedding pass costs 60-90s. Building is cheap per chunk (~0.2ms)
// but the index is rebuilt on every MCP search/compliance call. This module lets
// the built index be persisted so a subsequent load restores it WITHOUT re-running
// the embedding pass (embeddings ride in the payload — see RagIndex.toJSON/fromJSON).
//
// Design:
//   - Separate plain-IDB database `budget-engineer-rag-index` (must NOT collide with
//     `budget-engineer-rag`, owned by embedCache.ts) with a single `rag_index_v2` store.
//   - One record per chunk (`chunk:<id>` -> { chunk, embedding }) so addChunks/removeDocument
//     persist as genuine incremental delta writes instead of rewriting the whole index.
//   - A `meta` record carries the corpus hash + the chunk-id list; load filters records by it,
//     so stale records (a removed chunk still in IDB) are never resurrected.
//   - Debounced auto-persist (`scheduleIndexPersist`/`flushIndexPersist`) for builds.
//   - Degrades to a no-op when IndexedDB is unavailable (bare Node without fake-indexeddb),
//     mirroring embedCache.

import type { CodeDocument, TextChunk } from './types'
import { RagIndex } from './ragIndex'

const DB_NAME = 'budget-engineer-rag-index'
const STORE = 'rag_index_v2'
const DB_VERSION = 1
const META_KEY = 'meta'
const chunkRecordKey = (chunkId: string) => `chunk:${chunkId}`

export interface RagIndexMeta {
  version: number
  corpusHash: string
  chunkIds: string[]
  chunkCount: number
  savedAt: number
}

interface MetaRecord {
  key: typeof META_KEY
  value: RagIndexMeta
}

interface ChunkRecord {
  key: string
  chunk: TextChunk
  embedding: number[]
}

export interface PersistResult {
  added: number
  removed: number
}

/** Deterministic corpus fingerprint. Hashes doc id + title + every section's
 * id and text (FNV-1a) so an on-disk file edit changes the hash and forces a
 * rebuild. Sections are used because CodeDocument carries no top-level text. */
export function corpusHashFor(docs: CodeDocument[]): string {
  let hash = 0x811c9dc5
  const update = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i)
      hash = (hash * 0x01000193) >>> 0
    }
  }
  for (const doc of docs) {
    update(doc.id)
    update(':')
    update(doc.title)
    update(':')
    for (const section of doc.sections) {
      update(section.id)
      update(':')
      update(String(section.text.length))
      update(':')
      update(section.text)
      update('|')
    }
    update('\x1e')
  }
  return hash.toString(16)
}

// ---------------------------------------------------------------------------
// IndexedDB plumbing (mirrors EmbeddingCache in embedCache.ts)
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase | null> | null = null

function connect(): Promise<IDBDatabase | null> {
  const idb = globalThis.indexedDB
  if (!idb) {
    dbPromise = Promise.resolve(null)
    return dbPromise
  }
  dbPromise = new Promise((resolve) => {
    const request = idb.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
  return dbPromise
}

async function db(): Promise<IDBDatabase | null> {
  if (!dbPromise) await connect()
  return dbPromise
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PersistIndexOptions {
  corpusHash?: string
}

/**
 * Persists an index, writing only the delta vs the previously-persisted snapshot:
 * new/unknown chunk records are `put`, chunks removed from the index are deleted,
 * and the meta record (corpus hash + chunk ids) is rewritten. When the corpus hash
 * changes (or nothing is known to be stored yet) the store is fully resynced.
 * Resolves `null` when IndexedDB is unavailable.
 */
export async function persistIndex(index: RagIndex, opts: PersistIndexOptions = {}): Promise<PersistResult | null> {
  const database = await db()
  if (!database) return null

  const corpusHash = opts.corpusHash ?? corpusHashFor([])
  const data = index.toJSON()
  const embeddings = data.embeddings ?? []
  const liveIds = new Set(embeddings.map(([id]) => id))
  const stored = new Set(await readStoredIds(database))

  const fullSync = stored.size === 0 || (await readMetaHash(database)) !== corpusHash
  const toAdd: ChunkRecord[] = []
  const toRemove: string[] = []

  if (fullSync) {
    for (const [id, embedding] of embeddings) {
      const chunk = index.getChunk(id)
      if (!chunk) continue
      toAdd.push({ key: chunkRecordKey(id), chunk, embedding })
    }
  } else {
    for (const [id, embedding] of embeddings) {
      if (stored.has(id)) continue
      const chunk = index.getChunk(id)
      if (!chunk) continue
      toAdd.push({ key: chunkRecordKey(id), chunk, embedding })
    }
    for (const id of stored) {
      if (!liveIds.has(id)) toRemove.push(chunkRecordKey(id))
    }
  }

  const meta: RagIndexMeta = {
    version: DB_VERSION,
    corpusHash,
    chunkIds: [...liveIds],
    chunkCount: liveIds.size,
    savedAt: Date.now(),
  }

  await new Promise<void>((resolve) => {
    const tx = database.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const rec of toAdd) store.put(rec)
    for (const key of toRemove) store.delete(key)
    store.put({ key: META_KEY, value: meta } satisfies MetaRecord)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })

  return { added: toAdd.length, removed: toRemove.length }
}

export interface LoadIndexOptions {
  corpusHash?: string
  /** When true, a persisted snapshot whose corpus hash differs is treated as a miss. */
  requireHash?: boolean
}

/**
 * Restores a persisted index without re-running the embedding pass. Resolves
 * `null` on a miss (no snapshot, hash mismatch when requireHash, or no IDB).
 */
export async function loadIndex(opts: LoadIndexOptions = {}): Promise<{ index: RagIndex; meta: RagIndexMeta } | null> {
  const database = await db()
  if (!database) return null

  const meta = await readMeta(database)
  if (!meta) return null
  if (opts.requireHash && opts.corpusHash && meta.corpusHash !== opts.corpusHash) return null

  const kept = new Set(meta.chunkIds)
  const records = await readChunkRecords(database)
  const chunks: TextChunk[] = []
  const embeddings: [string, number[]][] = []
  for (const rec of records) {
    if (!kept.has(rec.chunk.id)) continue
    chunks.push(rec.chunk)
    embeddings.push([rec.chunk.id, rec.embedding])
  }

  if (chunks.length === 0) return null
  const index = RagIndex.fromJSON({ chunks, embeddings })
  return { index, meta }
}

/** Deletes the persisted snapshot (meta + all chunk records). */
export async function clearIndex(): Promise<void> {
  const database = await db()
  if (!database) return
  await new Promise<void>((resolve) => {
    const tx = database.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

// ---------------------------------------------------------------------------
// Debounced auto-persist
// ---------------------------------------------------------------------------

const DEFAULT_PERSIST_DELAY_MS = 2000

let pendingTimer: ReturnType<typeof setTimeout> | null = null
let pendingIndex: RagIndex | null = null
let pendingOptions: PersistIndexOptions = {}

/** Schedules a debounced persist of the given index (resets any pending timer). */
export function scheduleIndexPersist(index: RagIndex, opts: PersistIndexOptions = {}, delayMs: number = DEFAULT_PERSIST_DELAY_MS): void {
  pendingIndex = index
  pendingOptions = opts
  if (pendingTimer) clearTimeout(pendingTimer)
  pendingTimer = setTimeout(() => {
    pendingTimer = null
    const target = pendingIndex
    pendingIndex = null
    if (target) void persistIndex(target, pendingOptions)
  }, delayMs)
}

/** Cancels a pending auto-persist. */
export function cancelIndexPersist(): void {
  if (pendingTimer) clearTimeout(pendingTimer)
  pendingTimer = null
  pendingIndex = null
  pendingOptions = {}
}

/** Flushes a pending auto-persist immediately (used by tests and shutdown). */
export async function flushIndexPersist(): Promise<PersistResult | null> {
  const target = pendingIndex
  const opts = pendingOptions
  if (pendingTimer) clearTimeout(pendingTimer)
  pendingTimer = null
  pendingIndex = null
  pendingOptions = {}
  if (!target) return null
  return persistIndex(target, opts)
}

// ---------------------------------------------------------------------------
// Internal record helpers
// ---------------------------------------------------------------------------

async function readMeta(database: IDBDatabase): Promise<RagIndexMeta | null> {
  return new Promise((resolve) => {
    const tx = database.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(META_KEY)
    req.onsuccess = () => {
      const rec = req.result as MetaRecord | undefined
      resolve(rec?.value ?? null)
    }
    req.onerror = () => resolve(null)
  })
}

async function readMetaHash(database: IDBDatabase): Promise<string | null> {
  const meta = await readMeta(database)
  return meta?.corpusHash ?? null
}

async function readStoredIds(database: IDBDatabase): Promise<string[]> {
  const meta = await readMeta(database)
  return meta?.chunkIds ?? []
}

async function readChunkRecords(database: IDBDatabase): Promise<ChunkRecord[]> {
  return new Promise((resolve) => {
    const tx = database.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const all = (req.result as (ChunkRecord | MetaRecord)[] ?? [])
      resolve(all.filter((rec): rec is ChunkRecord => rec.key !== META_KEY))
    }
    req.onerror = () => resolve([])
  })
}
