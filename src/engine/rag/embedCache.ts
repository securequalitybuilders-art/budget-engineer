// IndexedDB-backed embedding cache for the Bytez dense path.
//
// Stores chunk/query vectors keyed by a string so the remote dense tier runs
// each embed request at most once per key. Degrades to an in-memory Map when
// IndexedDB is unavailable (Node/vitest), so the cache is testable everywhere.

const DB_NAME = 'budget-engineer-rag'
const STORE = 'embeddings'
const DB_VERSION = 1

interface EmbeddingRecord {
  key: string
  vector: number[]
  at: number
}

export class EmbeddingCache {
  private mem = new Map<string, number[]>()
  private dbPromise: Promise<IDBDatabase | null> | null = null

  static async open(): Promise<EmbeddingCache> {
    const cache = new EmbeddingCache()
    await cache.connect()
    return cache
  }

  private connect(): Promise<void> {
    const idb = globalThis.indexedDB
    if (!idb) {
      this.dbPromise = Promise.resolve(null)
      return Promise.resolve()
    }
    this.dbPromise = new Promise((resolve) => {
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
    return this.dbPromise.then(() => undefined)
  }

  private async db(): Promise<IDBDatabase | null> {
    if (!this.dbPromise) await this.connect()
    return this.dbPromise
  }

  async get(key: string): Promise<number[] | undefined> {
    if (this.mem.has(key)) return this.mem.get(key)
    const db = await this.db()
    if (!db) return undefined
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => {
        const record = req.result as EmbeddingRecord | undefined
        resolve(record?.vector)
      }
      req.onerror = () => resolve(undefined)
    })
  }

  async set(key: string, vector: number[]): Promise<void> {
    this.mem.set(key, vector)
    const db = await this.db()
    if (!db) return
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ key, vector, at: Date.now() } as EmbeddingRecord)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  }

  async clear(): Promise<void> {
    this.mem.clear()
    const db = await this.db()
    if (!db) return
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  }
}
