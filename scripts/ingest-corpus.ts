// Corpus ingestion CLI (L5 wiring).
//
// Usage:
//   node --import tsx scripts/ingest-corpus.ts [dir] [--json <out.json>]
//
// Scans a directory of source texts (.txt/.md/.csv — e.g. NotebookLM fulltext
// exports, PDF->text, historical-cost spreadsheets), runs them through the same
// parseCodeDocument -> chunkDocument pipeline the production RAG uses, prints a
// per-document summary, and optionally writes a serialized RagIndex snapshot.
//
// The default dir honours BE_CORPUS_DIR (falls back to ./corpus). With no
// --json flag the script is read-only — safe to run any time.
//
// Not part of the browser bundle or the tsc include set; verified manually.

import { writeFileSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { loadCorpusDocuments, buildCorpusIndex, DEFAULT_CORPUS_DIR, corpusSummary } from '../src/engine/rag/corpusLoader'

function usage(): void {
  console.error('Usage: node --import tsx scripts/ingest-corpus.ts [dir] [--json <out.json>]')
  process.exit(1)
}

const args = process.argv.slice(2)
let dir = DEFAULT_CORPUS_DIR
let jsonOut: string | undefined

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--json') {
    const next = args[i + 1]
    if (!next) usage()
    jsonOut = next
    i++
  } else if (!arg.startsWith('-')) {
    dir = arg
  } else {
    usage()
  }
}

const docs = loadCorpusDocuments(dir)
if (docs.length === 0) {
  console.log(`No corpus files found in ${dir} (expected .txt/.md/.csv). Add extracted sources and rerun.`)
  process.exit(0)
}

const index = buildCorpusIndex(dir)
const rows = corpusSummary(docs)

console.log(`Corpus: ${dir}`)
console.log(`Documents: ${docs.length}`)
console.log(`Index chunks: ${index.size}`)
console.log('')
for (const row of rows) {
  console.log(`  ${row.id} (${row.title}) [${row.code ?? '-'}/${row.jurisdiction}] sections=${row.sections} chunks=${row.chunks}`)
}

if (jsonOut) {
  const outPath = isAbsolute(jsonOut) ? jsonOut : join(process.cwd(), jsonOut)
  writeFileSync(outPath, JSON.stringify(index.toJSON(), null, 2), 'utf8')
  console.log(`\nSnapshot written to ${outPath}`)
}
