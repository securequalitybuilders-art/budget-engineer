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

export const REGISTRY_DOC_IDS = ['by-laws-1977', 'si-56-2025', 'saz-catalogue', 'ziqs-smm'] as const

/** ZIQS SMM has no full-code source in-repo; the clean text is composed from the
 * grounded ZIQS rules in `ziqs_smm_prompt.ts` (see `hygiene.ts`). */
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
 * Builds an index that always contains the four registry documents (from their
 * embedded clean copies) plus every on-disk corpus file that is not a registry
 * id, not dead-OCR, and not already present.
 */
export function buildEnterpriseIndex(dir: string = DEFAULT_CORPUS_DIR, opts: EnterpriseIndexOptions = {}): RagIndex {
  const debug = opts.debug ?? (() => {})
  const base = createIndex(REGISTRY_DOCS)
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
    if (base.hasDocument(doc.id)) {
      debug(`skip duplicate doc ${file} (id ${doc.id})`)
      continue
    }
    base.addDocument(doc)
  }
  return base
}
