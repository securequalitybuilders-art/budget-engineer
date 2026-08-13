// Corpus hygiene CLI (Data Quality Gap #1).
//
// Usage:
//   node --import tsx scripts/corpus-dedup.ts [dir] [--report] [--fix] [--json <out.json>]
//
// Defaults to a read-only `--report` audit of the corpus directory. `--fix`
// applies the deterministic fix pass (registry replacements in place; dead-OCR
// stubs moved to .quarantine/dead/; duplicates moved to .quarantine/duplicates/).
// The audit report is always written to <dir>/corpus-audit.json (or the path
// given with --json). Rerunning `--fix` is a no-op (idempotent).
//
// Not part of the browser bundle or the tsc include set; verified manually.

import { writeFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { auditDir, applyFixes } from '../src/engine/rag/corpus/hygiene'

function usage(): void {
  console.error('Usage: node --import tsx scripts/corpus-dedup.ts [dir] [--report] [--fix] [--json <out.json>]')
  process.exit(1)
}

const args = process.argv.slice(2)
let dir = 'corpus'
let fix = false
let jsonOut: string | undefined

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--fix') {
    fix = true
  } else if (arg === '--report') {
    fix = false
  } else if (arg === '--json') {
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

const report = fix ? applyFixes(dir) : auditDir(dir)
const outPath = jsonOut ? (isAbsolute(jsonOut) ? jsonOut : join(process.cwd(), jsonOut)) : join(dir, 'corpus-audit.json')
writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')

console.log(`Corpus: ${dir} (mode: ${fix ? 'fix' : 'report'})`)
console.log(`Scanned: ${report.scanned} files  audit -> ${outPath}`)

if (report.replacements.length) {
  console.log(`\nReplaced from embedded clean copies (${report.replacements.length}):`)
  for (const r of report.replacements) console.log(`  - ${r.file}  [${r.source}]`)
}
if (report.deadOcr.length) {
  console.log(`\nDead-OCR / stubs quarantined -> ${dir}/.quarantine/dead/ (${report.deadOcr.length}):`)
  for (const q of report.deadOcr) console.log(`  - ${q.file}  (${q.reason})`)
}
if (report.aliasDuplicates.length) {
  console.log(`\nRegistry-alias duplicates -> ${dir}/.quarantine/duplicates/ (${report.aliasDuplicates.length}):`)
  for (const q of report.aliasDuplicates) console.log(`  - ${q.file}  (${q.reason})`)
}
if (report.exactDuplicates.length) {
  console.log(`\nExact duplicates -> ${dir}/.quarantine/duplicates/ (${report.exactDuplicates.length} groups):`)
  for (const g of report.exactDuplicates) console.log(`  - keep ${g.keep}; removed ${g.removed.map((r) => r.file).join(', ')}`)
}
if (report.nearDuplicates.length) {
  console.log(`\nNear duplicates -> ${dir}/.quarantine/duplicates/ (${report.nearDuplicates.length} groups):`)
  for (const g of report.nearDuplicates)
    for (const r of g.removed) console.log(`  - keep ${g.keep}; removed ${r.file} (similarity ${(r.similarity ?? 0).toFixed(3)})`)
}

if (report.ok) {
  console.log('\nCorpus is clean: no replacements, no dead-OCR, no duplicates.')
  process.exit(0)
}
console.log(`\n${fix ? 'Fix pass complete' : 'Issues found — run with --fix to apply'}.`)
process.exit(fix ? 0 : 1)
