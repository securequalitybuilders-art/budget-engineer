// NotebookLM Brain — local source_get_content simulation (LINK phase).
//
// The real NotebookLM brain is the interactive half (notebooklm-py browser
// auth + source fulltext exports). This script is the deterministic local
// half: it reads extracted source texts (Model Building By-Laws 1977, SAZ,
// ZIQS, SI 56/2025, + textbook corpus), runs them through the same
// parseCodeDocument -> chunkDocument pipeline the production RAG uses
// (the source_get_content analogue: chunked 200-500 token modules instead of
// raw 100k-token pages — the "10x token savings"), builds a 40+ source
// knowledge brain manifest, and can trigger a deep-research query that emits
// a structured table for RAG ingestion.
//
// Usage:
//   node --import tsx scripts/notebooklm-brain.ts                 # build brain manifest
//   node --import tsx scripts/notebooklm-brain.ts --research "Extract all clauses Grade A-D construction fire-resistance ratings structural members"
//   node --import tsx scripts/notebooklm-brain.ts --dir <path>    # override corpus dir
//   node --import tsx scripts/notebooklm-brain.ts --min-sources 40
//
// Not part of the browser bundle or the tsc include set; verified manually.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join, isAbsolute, dirname } from 'node:path'
import {
  loadCorpusDocuments,
  buildCorpusIndex,
  DEFAULT_CORPUS_DIR,
  corpusSummary,
} from '../src/engine/rag/corpusLoader'
import { hybridSearch } from '../src/engine/rag/hybrid'
import { buildDefaultRagIndex } from '../src/engine/rag/codeCorpus'

const MIN_SOURCES_DEFAULT = 40
const OUT_DIR = 'brain'
const MANIFEST = 'brain-manifest.json'
const RESEARCH_OUT = 'deep-research.tsv'

interface ResearchResult {
  rank: number
  docId: string
  sectionId: string
  score: number
  text: string
}

function usage(): void {
  console.error(
    'Usage: node --import tsx scripts/notebooklm-brain.ts [--dir <path>] [--min-sources N] [--embedded] [--research "<query>"]',
  )
  process.exit(1)
}

function parseArgs(argv: string[]): {
  dir: string
  minSources: number
  research: string | null
  embedded: boolean
} {
  let dir = DEFAULT_CORPUS_DIR
  let minSources = MIN_SOURCES_DEFAULT
  let research: string | null = null
  let embedded = false
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dir') {
      const next = argv[i + 1]
      if (!next) usage()
      dir = next
      i++
    } else if (arg === '--min-sources') {
      const next = argv[i + 1]
      if (!next) usage()
      minSources = Number(next)
      i++
    } else if (arg === '--research') {
      const next = argv[i + 1]
      if (!next) usage()
      research = next
      i++
    } else if (arg === '--embedded') {
      embedded = true
    } else {
      usage()
    }
  }
  return { dir, minSources, research, embedded }
}

function outPath(file: string): string {
  const full = isAbsolute(file) ? file : join(process.cwd(), OUT_DIR, file)
  const parent = dirname(full)
  if (parent) mkdirSync(parent, { recursive: true })
  return full
}

function tsvEscape(value: string): string {
  return value.replace(/\t/g, ' ').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|')
}

function writeResearch(results: ResearchResult[]): void {
  const header = 'rank\tdoc_id\tsection_id\tscore\ttext'
  const rows = results.map((r) =>
    [r.rank, r.docId, r.sectionId, r.score.toFixed(4), tsvEscape(r.text)].join('\t'),
  )
  writeFileSync(outPath(RESEARCH_OUT), [header, ...rows].join('\n'), 'utf8')
  console.log(`Deep-research table written to ${OUT_DIR}/${RESEARCH_OUT} (${results.length} rows)`)
}

function main(): void {
  const { dir, minSources, research, embedded } = parseArgs(process.argv.slice(2))

  const docs = loadCorpusDocuments(dir)
  if (docs.length === 0) {
    console.log(`No extracted sources in ${dir}. Drop NotebookLM fulltext exports there and rerun.`)
    process.exit(1)
  }

  // Fast path: `--embedded --research` runs against the compact in-app brain
  // (clean By-Laws 1977, SI 56/2025, SAZ, Typologies) without chunking the
  // 228k-chunk disk corpus — no manifest, no index build.
  if (research && embedded) {
    const index = buildDefaultRagIndex()
    console.log('[brain] embedded in-app brain (4 clean docs: By-Laws 1977, SI 56/2025, SAZ, Typologies)')
    const results = hybridSearch(index, research, { k: 25 })
    if (results.length === 0) {
      console.log('[brain] No clauses found. Widen the query.')
      process.exit(0)
    }
    const rows: ResearchResult[] = results.map((result, i) => ({
      rank: i + 1,
      docId: result.docId,
      sectionId: result.sectionId,
      score: result.score,
      text: result.text,
    }))
    for (const row of rows.slice(0, 12)) {
      console.log(`  ${row.rank}. [${row.docId}] ${row.sectionId} score=${row.score.toFixed(4)}`)
    }
    writeResearch(rows)
    return
  }

  const index = buildCorpusIndex(dir)
  const summary = corpusSummary(docs)
  const totalChunks = summary.reduce((sum, row) => sum + row.chunks, 0)
  const totalChars = docs.reduce(
    (sum, doc) => sum + doc.sections.reduce((s, sec) => s + sec.text.length, 0),
    0,
  )

  console.log(`[brain] corpus dir: ${dir}`)
  console.log(`[brain] sources: ${docs.length}  chunks: ${totalChunks}  chars: ${totalChars}`)
  console.log('[brain] source_get_content simulation: full text -> chunked 200-500 token modules (~10x token savings)')
  console.log('')

  for (const row of summary) {
    console.log(`  ${row.id} (${row.title}) [${row.code ?? '-'}/${row.jurisdiction}] sections=${row.sections} chunks=${row.chunks}`)
  }

  const qualified = summary.filter((row) => row.chunks > 0)
  if (qualified.length < minSources) {
    console.warn(`\n[brain] WARNING: ${qualified.length} usable sources < min ${minSources}. Brain is small.`)
  } else {
    console.log(`\n[brain] Knowledge brain: ${qualified.length} usable sources (>= ${minSources} required).`)
  }

  const manifest = {
    name: 'DzeNhare SQB — NotebookLM Brain (local source_get_content simulation)',
    dir,
    sources: docs.length,
    usableSources: qualified.length,
    chunks: totalChunks,
    chars: totalChars,
    chunking: 'parseCodeDocument -> chunkDocument, 200-500 token child modules',
    builtAt: new Date().toISOString(),
    documents: docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      code: doc.code ?? null,
      jurisdiction: doc.jurisdiction ?? null,
      sections: doc.sections.length,
    })),
  }
  const manifestPath = outPath(MANIFEST)
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
  console.log(`\nBrain manifest written to ${OUT_DIR}/${MANIFEST}`)

  if (research) {
    console.log(`\n[brain] deep research (scope: corpus index ${dir}): "${research}"`)
    const results = hybridSearch(index, research, { k: 25 })
    if (results.length === 0) {
      console.log('[brain] No clauses found. Widen the query or add sources.')
      process.exit(0)
    }
    const rows: ResearchResult[] = results.map((result, i) => ({
      rank: i + 1,
      docId: result.docId,
      sectionId: result.sectionId,
      score: result.score,
      text: result.text,
    }))
    for (const row of rows.slice(0, 12)) {
      console.log(`  ${row.rank}. [${row.docId}] ${row.sectionId} score=${row.score.toFixed(4)}`)
    }
    writeResearch(rows)
  }
}

main()
