/**
 * Enterprise corpus loader: builds a RagIndex from only the CLEAN sources.
 *
 * The on-disk `corpus/` directory historically mixed clean extractions with
 * dead-OCR stubs, wrong-content files, and duplicates (see `hygiene.ts`). This
 * loader guarantees the four registry documents (By-Laws 1977, SI 56/2025,
 * SAZ catalogue, ZIQS SMM) always come from their embedded clean copies, and
 * only admits on-disk files that pass the dead-OCR gate — so an enterprise
 * search/analysis run can never retrieve a page-marker stub.
 *
 * IMPORTANT: Node-only (consumes `node:fs` via `corpusLoader.ts`). The in-app
 * agent keeps using the browser-safe `buildDefaultRagIndex()`.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CodeDocument } from '../types'
import { parseCodeDocument } from '../extraction'
import { RagIndex, createIndex } from '../ragIndex'
import { BY_LAWS_1977_DOC, SI_56_2025_DOC } from '../codeCorpus'
import { SAZ_CATALOGUE_DOC } from '../curatedCorpus'
import { DEFAULT_CORPUS_DIR, listCorpusFiles, metadataForFile, parseCorpusFile } from '../corpusLoader'
import { ZIQS_SMM_CLEAN_TEXT, cleanSourceFor, probeText } from './hygiene'
import { corpusHashFor, loadIndex, scheduleIndexPersist } from '../persistence'

export const REGISTRY_DOC_IDS = ['by-laws-1977', 'si-56-2025', 'saz-catalogue', 'ziqs-smm'] as const

/** ZIQS SMM is embedded in `codeCorpus.ts` as the fifth in-app doc; its clean text
 * is composed from the grounded ZIQS rules in `ziqs_smm_prompt.ts`. This mirror
 * shares the same text so the enterprise index and the in-app index agree. */
export const ZIQS_SMM_DOC: CodeDocument = parseCodeDocument({
  id: 'ziqs-smm',
  code: 'ziqs',
  jurisdiction: 'zimbabwe',
  title: 'ZIQS Standard Method of Measurement',
  text: ZIQS_SMM_CLEAN_TEXT,
})

export const REGISTRY_DOCS: CodeDocument[] = [BY_LAWS_1977_DOC, SI_56_2025_DOC, SAZ_CATALOGUE_DOC, ZIQS_SMM_DOC]

export interface EnterpriseIndexOptions {
  debug?: (message: string) => void
}

/**
 * Collects the exact documents `buildEnterpriseIndex` admits: the four registry
 * documents (embedded clean copies) plus every on-disk corpus file that is not a
 * registry id, not dead-OCR, and not already present. Used both to build the index
 * and to fingerprint the corpus for persistence.
 */
export function collectCleanDocs(dir: string = DEFAULT_CORPUS_DIR, opts: EnterpriseIndexOptions = {}): CodeDocument[] {
  const debug = opts.debug ?? (() => {})
  const docs: CodeDocument[] = [...REGISTRY_DOCS]
  const seen = new Set(docs.map((doc) => doc.id))
  for (const file of listCorpusFiles(dir)) {
    const { id } = metadataForFile(file)
    if (cleanSourceFor(id)) {
      debug(`skip registry file ${file} — embedded clean copy is authoritative`)
      continue
    }
    const raw = readFileSync(join(dir, file), 'utf8')
    const probe = probeText(raw, file)
    if (probe.dead) {
      debug(`skip dead-OCR file ${file}: ${probe.reasons.join('; ')}`)
      continue
    }
    const doc = parseCorpusFile(file, raw)
    if (!doc || doc.sections.length === 0) continue
    if (seen.has(doc.id)) {
      debug(`skip duplicate doc ${file} (id ${doc.id})`)
      continue
    }
    seen.add(doc.id)
    docs.push(doc)
  }
  return docs
}

/**
 * Builds an index that always contains the four registry documents (from their
 * embedded clean copies) plus every on-disk corpus file that is not a registry
 * id, not dead-OCR, and not already present. Synchronous — the exact behaviour
 * the corpus tests pin.
 */
export function buildEnterpriseIndex(dir: string = DEFAULT_CORPUS_DIR, opts: EnterpriseIndexOptions = {}): RagIndex {
  return createIndex(collectCleanDocs(dir, opts))
}

/**
 * Persistence-aware enterprise index (Data Quality Gap #4): returns a restored
 * index from IndexedDB when a snapshot with the matching corpus hash exists —
 * avoiding the 60-90s embedding rebuild on every MCP call. On a miss it builds
 * the index (the same docs `buildEnterpriseIndex` admits) and schedules a
 * debounced auto-persist. When IndexedDB is unavailable (bare Node without
 * fake-indexeddb) this degrades to a plain build, matching `buildEnterpriseIndex`.
 */
export async function loadEnterpriseIndex(dir: string = DEFAULT_CORPUS_DIR, opts: EnterpriseIndexOptions = {}): Promise<RagIndex> {
  const docs = collectCleanDocs(dir, opts)
  const corpusHash = corpusHashFor(docs)
  const restored = await loadIndex({ corpusHash, requireHash: true })
  if (restored) return restored.index
  const index = createIndex(docs)
  scheduleIndexPersist(index, { corpusHash })
  return index
}
