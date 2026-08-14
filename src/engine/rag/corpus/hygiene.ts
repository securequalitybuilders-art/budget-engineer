/**
 * Node-only corpus hygiene: deterministic duplicate detection, dead-OCR / stub
 * detection, wrong-content detection, and a fix pass that quarantines bad files
 * and replaces registry files with the embedded clean copies.
 *
 * IMPORTANT: uses `node:fs` / `node:path` / `node:crypto`, so keep it OUT of
 * browser import paths (same convention as `corpusLoader.ts`). The in-app agent
 * uses the browser-safe embedded corpus (`codeCorpus.ts` / `curatedCorpus.ts`);
 * this module only ever runs on the Node/MCP/CLI side.
 *
 * Ground truth for the fix pass:
 *   - `corpus/ziqs-smm.txt` was a pure dead-OCR stub (100% "-- N of M --" page
 *     markers). The only in-repo grounded ZIQS SMM rule text lives in
 *     `src/lib/ai/prompts/ziqs_smm_prompt.ts` (REGULATORY_GROUNDING item 3), so
 *     the clean source is composed from those exact rules.
 *   - `corpus/by-laws-1977.txt` was a wrong-content course book; the clean copy
 *     is `BY_LAWS_1977_TEXT`.
 *   - `corpus/saz-catalogue.txt` / `corpus/si-56-2025.txt` were raw extractions;
 *     the clean copies are `SAZ_CATALOGUE_TEXT` / `SI_56_2025_TEXT`.
 *   - 4 exact-duplicate pairs + 7 dead-OCR stubs were identified across the
 *     committed corpus (see AGENTS.md L5 sessions).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { createHash } from 'node:crypto'
import { BY_LAWS_1977_TEXT, SI_56_2025_TEXT, ZIQS_SMM_TEXT } from '../codeCorpus'
import { SAZ_CATALOGUE_TEXT } from '../curatedCorpus'

const CORPUS_EXTENSIONS = /\.(txt|md|csv)$/i
const MARKER_RE = /^--\s*\d+\s+of\s+\d+\s*--/

export const QUARANTINE_DIR = '.quarantine'
export const QUARANTINE_DUPS = join(QUARANTINE_DIR, 'duplicates')
export const QUARANTINE_DEAD = join(QUARANTINE_DIR, 'dead')

/** Normalized text used for exact-duplicate hashing (case + whitespace folded). */
export function normalizeForHash(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export interface TextProbe {
  /** sha256 of the normalized text. */
  hash: string
  lineCount: number
  nonBlankLines: number
  /** Fraction of non-blank lines that are "-- N of M --" page markers. */
  markerRatio: number
  avgWordLen: number
  junkTokenRatio: number
  nonAsciiRatio: number
  dead: boolean
  stub: boolean
  reasons: string[]
}

/**
 * Lexical metrics are computed on at most this many bytes of the file. The
 * dead-OCR / stub / mojibake heuristics only need a representative prefix — a
 * 6 MB textbook tail cannot hide a stub that a 512 KB head would miss, and it
 * keeps `auditDir` fast on the real corpus (58 files incl. 20 MB CSVs).
 */
const PROBE_SAMPLE_BYTES = 512 * 1024

/**
 * Dead-OCR / stub heuristics. CSV files are exempt from the lexical heuristics
 * (tables legitimately contain numeric/unit "junk" tokens and short cell text).
 */
export function probeText(text: string, fileName: string): TextProbe {
  const hash = sha256Hex(normalizeForHash(text))
  const isCsv = /\.csv$/i.test(fileName)
  const sample = text.length > PROBE_SAMPLE_BYTES ? text.slice(0, PROBE_SAMPLE_BYTES) : text
  const nonBlank = text.split(/\r?\n/).filter((l) => /\S/.test(l))
  const markers = nonBlank.filter((l) => MARKER_RE.test(l.trim())).length
  const markerRatio = nonBlank.length ? markers / nonBlank.length : 0
  const words = (sample.toLowerCase().match(/[a-z]{2,}/g) ?? [])
  const avgWordLen = words.length ? words.reduce((s, w) => s + w.length, 0) / words.length : 0
  const tokens = sample.split(/[^a-z0-9]+/i).filter(Boolean)
  const junkTokens = tokens.filter(
    (tk) => tk.length > 2 && (/(?:þ|ð|\uFFFD)/i.test(tk) || (!isCsv && /^[^a-z]/i.test(tk))),
  )
  const junkTokenRatio = tokens.length ? junkTokens.length / tokens.length : 0
  const nonAscii = (sample.match(/\P{ASCII}/gu) ?? []).length
  const nonAsciiRatio = sample.length ? nonAscii / sample.length : 0

  const reasons: string[] = []
  const stub = !isCsv && markerRatio > 0.9 && nonBlank.length > 20
  if (stub) reasons.push(`stub: ${markers}/${nonBlank.length} lines are OCR page markers`)
  if (!isCsv && avgWordLen > 15) reasons.push(`avg word length ${avgWordLen.toFixed(1)} > 15`)
  if (!isCsv && junkTokenRatio > 0.3) reasons.push(`junk token ratio ${(junkTokenRatio * 100).toFixed(0)}% > 30%`)
  if (!isCsv && nonAsciiRatio > 0.2 && words.length === 0)
    reasons.push(`mojibake: ${(nonAsciiRatio * 100).toFixed(0)}% non-ASCII and no dictionary words`)

  return {
    hash,
    lineCount: text.split(/\r?\n/).length,
    nonBlankLines: nonBlank.length,
    markerRatio,
    avgWordLen,
    junkTokenRatio,
    nonAsciiRatio,
    dead: reasons.length > 0,
    stub,
    reasons,
  }
}

/**
  * The clean, embedded source of truth for the four registry documents. Any
  * on-disk corpus file whose id matches a registry id is replaced with this text
  * when its hash differs — the embedded copies are the single authority.
  *
  * `ziqs-smm` is now embedded in `codeCorpus.ts` (the fifth in-app doc) with the
  * exact ZIQS SMM measurement rules composed from `ziqs_smm_prompt.ts` (the only
  * grounded ZIQS text in the codebase). Each rule ends with a full stop so
  * `extractSections` treats it as a clause with searchable text.
  */
export const ZIQS_SMM_CLEAN_TEXT = ZIQS_SMM_TEXT

export const REGISTRY_CLEAN: Record<string, { text: string; source: string }> = {
  'by-laws-1977': { text: BY_LAWS_1977_TEXT, source: 'embedded clean copy (codeCorpus.ts)' },
  'si-56-2025': { text: SI_56_2025_TEXT, source: 'embedded clean copy (codeCorpus.ts)' },
  'saz-catalogue': { text: SAZ_CATALOGUE_TEXT, source: 'embedded clean copy (curatedCorpus.ts)' },
  'ziqs-smm': {
    text: ZIQS_SMM_CLEAN_TEXT,
    source: 'composed from the ZIQS SMM rules in ziqs_smm_prompt.ts (only grounded in-repo source)',
  },
}

export function cleanSourceFor(docId: string): { text: string; source: string } | undefined {
  return REGISTRY_CLEAN[docId]
}

/**
 * Filename slugs that denote the same document as a registry id but under a
 * different name (e.g. the raw gazette extract `SI 2025-056...txt` vs the clean
 * `si-56-2025.txt`). When the canonical registry file is present, the alias
 * copy is quarantined as a duplicate — the clean copy is the single authority.
 */
export const REGISTRY_ALIASES: Record<string, string> = {
  'si-2025-056': 'si-56-2025',
}

export function registryAliasTarget(docId: string): string | undefined {
  for (const [alias, target] of Object.entries(REGISTRY_ALIASES)) {
    if (docId === alias || docId.startsWith(`${alias}-`)) return target
  }
  return undefined
}

/** Jaccard similarity over 3-gram shingles (stride-capped so large files are cheap). */
export function shingleSimilarity(a: string, b: string): number {
  const setA = shingleSet(a)
  const setB = shingleSet(b)
  return shingleJaccard(setA, setB)
}

function shingleJaccard(setA: Set<string>, setB: Set<string>): number {
  let inter = 0
  const small = setA.size < setB.size ? setA : setB
  const large = setA.size < setB.size ? setB : setA
  for (const v of small) if (large.has(v)) inter++
  const union = setA.size + setB.size - inter
  return union ? inter / union : 0
}

function shingleSet(text: string, n = 3, maxShingles = 40000): Set<string> {
  const set = new Set<string>()
  const stride = Math.max(1, Math.ceil((text.length - n + 1) / maxShingles))
  for (let i = 0; i + n <= text.length; i += stride) set.add(text.slice(i, i + n))
  return set
}

/** Builds each file's shingle set once so the O(n²) near-dup pass is not O(n² × shingles). */
interface ShingleMemo {
  get(text: string): Set<string>
}

function createShingleMemo(): ShingleMemo {
  const cache = new Map<string, Set<string>>()
  return {
    get(text: string) {
      let set = cache.get(text)
      if (!set) {
        set = shingleSet(text)
        cache.set(text, set)
      }
      return set
    },
  }
}

export interface CorpusFile {
  file: string
  size: number
  text: string
  probe: TextProbe
}

export function listCorpusDir(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => CORPUS_EXTENSIONS.test(f))
    .sort()
}

export function readCorpusFile(dir: string, file: string): CorpusFile {
  const text = readFileSync(join(dir, file), 'utf8')
  return { file, size: text.length, text, probe: probeText(text, file) }
}

export interface ReplacementEntry {
  file: string
  reason: string
  source: string
}

export interface QuarantineEntry {
  file: string
  reason: string
}

export interface DuplicateGroup {
  keep: string
  removed: Array<{ file: string; similarity?: number }>
}

export interface HygieneReport {
  dir: string
  scanned: number
  replacements: ReplacementEntry[]
  deadOcr: QuarantineEntry[]
  aliasDuplicates: QuarantineEntry[]
  exactDuplicates: DuplicateGroup[]
  nearDuplicates: DuplicateGroup[]
  quarantined: QuarantineEntry[]
  /** True when a fresh audit after this pass finds nothing to fix. */
  ok: boolean
}

function slugOf(file: string): string {
  const base = basename(file, extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return base || 'unnamed'
}

/** Set of registry ids whose files are actually present in the corpus dir. */
function registryIdsPresent(dir: string): Set<string> {
  const s = new Set<string>()
  for (const f of listCorpusDir(dir)) s.add(slugOf(f))
  return s
}

interface ScanResult {
  entries: CorpusFile[]
  replacements: ReplacementEntry[]
}

function scan(dir: string): ScanResult {
  const replacements: ReplacementEntry[] = []
  const entries: CorpusFile[] = []
  for (const file of listCorpusDir(dir)) {
    const entry = readCorpusFile(dir, file)
    const clean = cleanSourceFor(slugOf(file))
    if (clean && entry.probe.hash !== sha256Hex(normalizeForHash(clean.text))) {
      replacements.push({
        file,
        reason: 'registry id: on-disk extraction differs from the embedded clean copy',
        source: clean.source,
      })
      continue
    }
    entries.push(entry)
  }
  return { entries, replacements }
}

export function auditDir(dir: string): HygieneReport {
  const { entries, replacements } = scan(dir)
  const presentIds = registryIdsPresent(dir)
  const deadOcr: QuarantineEntry[] = []
  const aliasDuplicates: QuarantineEntry[] = []
  const alive: CorpusFile[] = []
  for (const e of entries) {
    if (e.probe.dead) {
      deadOcr.push({ file: e.file, reason: e.probe.reasons.join('; ') || 'dead-OCR heuristic' })
    } else {
      const target = registryAliasTarget(slugOf(e.file))
      if (target && presentIds.has(target)) {
        aliasDuplicates.push({ file: e.file, reason: `registry alias of ${target}; clean copy is authoritative` })
      } else {
        alive.push(e)
      }
    }
  }

  const byHash = new Map<string, string[]>()
  for (const e of alive) {
    const group = byHash.get(e.probe.hash) ?? []
    group.push(e.file)
    byHash.set(e.probe.hash, group)
  }
  const exactDuplicates: DuplicateGroup[] = []
  const afterExact: string[] = []
  for (const group of byHash.values()) {
    if (group.length > 1) {
      exactDuplicates.push({ keep: group[0], removed: group.slice(1).map((file) => ({ file })) })
    }
    afterExact.push(group[0])
  }

  const keptText = new Map<string, string>()
  for (const file of afterExact) {
    const e = entries.find((x) => x.file === file)
    if (e) keptText.set(file, e.text)
  }

  const nearDuplicates: DuplicateGroup[] = []
  const kept: string[] = []
  const memo = createShingleMemo()
  for (const file of afterExact) {
    let removed = false
    const text = keptText.get(file)
    if (!text) continue
    const set = memo.get(text)
    for (const other of kept) {
      const otherText = keptText.get(other)
      if (!otherText) continue
      const sizeRatio = Math.abs(text.length - otherText.length) / Math.max(text.length, otherText.length)
      if (sizeRatio > 0.3) continue
      const sim = shingleJaccard(set, memo.get(otherText))
      if (sim > 0.95) {
        nearDuplicates.push({ keep: other, removed: [{ file, similarity: sim }] })
        removed = true
        break
      }
    }
    if (!removed) kept.push(file)
  }

  const quarantined = [
    ...deadOcr.map((q) => ({ ...q })),
    ...aliasDuplicates.map((q) => ({ ...q })),
    ...exactDuplicates.flatMap((g) => g.removed.map((r) => ({ file: r.file, reason: `duplicate of ${g.keep}` }))),
    ...nearDuplicates.flatMap((g) =>
      g.removed.map((r) => ({ file: r.file, reason: `near-duplicate of ${g.keep} (similarity ${(r.similarity ?? 0).toFixed(3)})` })),
    ),
  ]

  const ok =
    replacements.length === 0 &&
    deadOcr.length === 0 &&
    aliasDuplicates.length === 0 &&
    exactDuplicates.length === 0 &&
    nearDuplicates.length === 0
  return {
    dir,
    scanned: entries.length + replacements.length,
    replacements,
    deadOcr,
    aliasDuplicates,
    exactDuplicates,
    nearDuplicates,
    quarantined,
    ok,
  }
}

function moveToQuarantine(dir: string, subdir: string, file: string): string {
  const targetDir = join(dir, subdir)
  mkdirSync(targetDir, { recursive: true })
  let target = join(targetDir, file)
  let i = 1
  while (existsSync(target)) {
    target = join(targetDir, `${basename(file, extname(file))}-${i}${extname(file)}`)
    i++
  }
  renameSync(join(dir, file), target)
  return target
}

/** True when the file is a registry source whose embedded clean copy matches. */
export function isCleanRegistryFile(dir: string, file: string): boolean {
  const clean = cleanSourceFor(slugOf(file))
  if (!clean) return false
  const probe = readCorpusFile(dir, file).probe
  return probe.hash === sha256Hex(normalizeForHash(clean.text))
}

/**
 * Applies the fix pass (deterministic + idempotent):
 *   1. Registry files whose content differs from the embedded clean copy are
 *      replaced in place.
 *   2. Dead-OCR / stub files are moved to `.quarantine/dead/`.
 *   3. Exact duplicates (same normalized sha256) keep the lexicographically
 *      first file; the rest move to `.quarantine/duplicates/`.
 *   4. Near duplicates (>0.95 Jaccard, ≤0.3 size ratio) keep the first file.
 */
export function applyFixes(dir: string): HygieneReport {
  const { entries, replacements } = scan(dir)

  for (const r of replacements) {
    const clean = cleanSourceFor(slugOf(r.file))
    if (!clean) continue
    writeFileSync(join(dir, r.file), clean.text, 'utf8')
  }

  const deadOcr: QuarantineEntry[] = []
  const aliasDuplicates: QuarantineEntry[] = []
  const presentIds = registryIdsPresent(dir)
  const alive: CorpusFile[] = []
  for (const e of entries) {
    if (e.probe.dead) {
      moveToQuarantine(dir, QUARANTINE_DEAD, e.file)
      deadOcr.push({ file: e.file, reason: e.probe.reasons.join('; ') || 'dead-OCR heuristic' })
    } else {
      const target = registryAliasTarget(slugOf(e.file))
      if (target && presentIds.has(target)) {
        moveToQuarantine(dir, QUARANTINE_DUPS, e.file)
        aliasDuplicates.push({ file: e.file, reason: `registry alias of ${target}; clean copy is authoritative` })
      } else {
        alive.push(e)
      }
    }
  }
  // Registry files that were just replaced are now clean — include them in the
  // dedup pass so an on-disk duplicate of e.g. si-56-2025 gets quarantined
  // against the freshly-written clean copy.
  for (const r of replacements) {
    alive.push(readCorpusFile(dir, r.file))
  }

  const byHash = new Map<string, CorpusFile[]>()
  for (const e of alive) {
    const group = byHash.get(e.probe.hash) ?? []
    group.push(e)
    byHash.set(e.probe.hash, group)
  }
  const exactDuplicates: DuplicateGroup[] = []
  const afterExact: CorpusFile[] = []
  for (const group of byHash.values()) {
    if (group.length > 1) {
      exactDuplicates.push({ keep: group[0].file, removed: group.slice(1).map((e) => ({ file: e.file })) })
      for (const e of group.slice(1)) moveToQuarantine(dir, QUARANTINE_DUPS, e.file)
    }
    afterExact.push(group[0])
  }

  const nearDuplicates: DuplicateGroup[] = []
  const kept: CorpusFile[] = []
  const memo = createShingleMemo()
  for (const e of afterExact) {
    let removed = false
    const set = memo.get(e.text)
    for (const other of kept) {
      const sizeRatio = Math.abs(e.text.length - other.text.length) / Math.max(e.text.length, other.text.length)
      if (sizeRatio > 0.3) continue
      const sim = shingleJaccard(set, memo.get(other.text))
      if (sim > 0.95) {
        nearDuplicates.push({ keep: other.file, removed: [{ file: e.file, similarity: sim }] })
        moveToQuarantine(dir, QUARANTINE_DUPS, e.file)
        removed = true
        break
      }
    }
    if (!removed) kept.push(e)
  }

  const quarantined = [
    ...deadOcr.map((q) => ({ ...q })),
    ...aliasDuplicates.map((q) => ({ ...q })),
    ...exactDuplicates.flatMap((g) => g.removed.map((r) => ({ file: r.file, reason: `duplicate of ${g.keep}` }))),
    ...nearDuplicates.flatMap((g) =>
      g.removed.map((r) => ({ file: r.file, reason: `near-duplicate of ${g.keep} (similarity ${(r.similarity ?? 0).toFixed(3)})` })),
    ),
  ]

  const fresh = auditDir(dir)
  return {
    dir,
    scanned: entries.length + replacements.length,
    replacements,
    deadOcr,
    aliasDuplicates,
    exactDuplicates,
    nearDuplicates,
    quarantined,
    ok: fresh.ok,
  }
}

/** Shallow listing of every top-level entry in a corpus dir (including quarantine). */
export function listAllTopLevel(dir: string): Array<{ name: string; isDir: boolean }> {
  if (!existsSync(dir)) return []
  return readdirSync(dir).map((name) => ({ name, isDir: statSync(join(dir, name)).isDirectory() }))
}
