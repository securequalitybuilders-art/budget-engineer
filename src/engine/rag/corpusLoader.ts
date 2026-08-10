// Node-only external-corpus loader (L5 wiring).
//
// The KPI2 `search-codes` tool and MCP `search_codes`/`analyze_compliance` run
// against `buildDefaultRagIndex()` (the compact in-memory By-Laws 1977 corpus).
// This module lets richer source documents — extracted from NotebookLM
// (`notebooklm source_get_content` fulltext exports), PDF->text, or spreadsheets
// — be dropped into a directory as plain `.txt` / `.md` / `.csv` files and fed
// through the exact same production ingestion path (raw text -> parseCodeDocument
// -> chunkDocument) so they are searchable with zero code changes.
//
// IMPORTANT: uses `node:fs`, so keep it OUT of browser import paths. The app's
// in-memory `buildDefaultRagIndex()` stays browser-safe; this loader is consumed
// only by the MCP server (`src/mcp/domain-tools.ts`) and the ingest script
// (`scripts/ingest-corpus.ts`).
//
// Accepted filename conventions (id is derived from the file name):
//   sans10400.txt          -> id `sans10400`, code `sans`,  jurisdiction `south-africa`
//   si-56-2025.txt         -> id `si-56-2025`, code `si562025`, jurisdiction `zimbabwe`
//   ziqs-smm.csv           -> id `ziqs-smm`, code `ziqs`, jurisdiction `zimbabwe`
//   by-laws-1977.md        -> id `by-laws-1977`, code `zbc`, jurisdiction `zimbabwe`
//   historical-costs.csv   -> id `historical-costs`, generic corpus metadata
//
// `.csv` files are converted to the tab-separated table format the section
// parser already understands, so their rows are captured as TableData (table-
// aware chunking keeps them intact) instead of opaque paragraph text.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import type { CodeDocument } from './types'
import { parseCodeDocument } from './extraction'
import { chunkDocument } from './chunking'
import { RagIndex, createIndex } from './ragIndex'
import { buildDefaultRagIndex } from './codeCorpus'

export const DEFAULT_CORPUS_DIR = process.env.BE_CORPUS_DIR ?? './corpus'

const CORPUS_EXTENSIONS = /\.(txt|md|csv)$/i

// Known filename-id -> code/jurisdiction so citations carry the right registry
// identity without any per-file config.
export const KNOWN_CODE_MAP: Record<string, { code: string; jurisdiction: string }> = {
  'by-laws-1977': { code: 'zbc', jurisdiction: 'zimbabwe' },
  'by-laws-1977.md': { code: 'zbc', jurisdiction: 'zimbabwe' },
  'ziqs-smm': { code: 'ziqs', jurisdiction: 'zimbabwe' },
  'si-56-2025': { code: 'si562025', jurisdiction: 'zimbabwe' },
  'architects-act': { code: 'architects', jurisdiction: 'zimbabwe' },
  sans10400: { code: 'sans', jurisdiction: 'south-africa' },
  'sans-10400': { code: 'sans', jurisdiction: 'south-africa' },
  sans10160: { code: 'sans', jurisdiction: 'south-africa' },
  'sans-10160': { code: 'sans', jurisdiction: 'south-africa' },
  'saz-catalogue': { code: 'saz', jurisdiction: 'zimbabwe' },
}

const KNOWN_TITLES: Record<string, string> = {
  'by-laws-1977': 'Model Building By-Laws 1977',
  'ziqs-smm': 'ZIQS Standard Method of Measurement',
  'si-56-2025': 'SI 56/2025 Architects Registration',
  'architects-act': 'Architects Act (SI 56/2025)',
  sans10400: 'SANS 10400',
  'sans-10400': 'SANS 10400',
  sans10160: 'SANS 10160',
  'sans-10160': 'SANS 10160',
  'saz-catalogue': 'SAZ Standards Catalogue',
}

const ACRONYMS = /^(si|sans|saz|ziqs|rc|hvac|dpc|mep|smm|pdf|iso)$/i

export function slugId(filename: string): string {
  const base = basename(filename, extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'unnamed'
}

export function humanizeTitle(id: string): string {
  if (KNOWN_TITLES[id]) return KNOWN_TITLES[id]
  return id
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((w) => (ACRONYMS.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

export function metadataForFile(filename: string): { id: string; title: string; code?: string; jurisdiction?: string } {
  const id = slugId(filename)
  const known = KNOWN_CODE_MAP[id] ?? KNOWN_CODE_MAP[filename]
  return {
    id,
    title: humanizeTitle(id),
    code: known?.code,
    jurisdiction: known?.jurisdiction ?? 'zimbabwe',
  }
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += ch
    }
  }
  cells.push(cell.trim())
  return cells
}

export function csvToTabText(csv: string): string {
  const rows = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseCsvLine)
  return rows.map((r) => r.join('\t')).join('\n')
}

export function parseCorpusFile(filename: string, raw: string): CodeDocument | null {
  const text = /\.csv$/i.test(filename) ? csvToTabText(raw) : raw
  if (!text.trim()) return null
  const { id, title, code, jurisdiction } = metadataForFile(filename)
  return parseCodeDocument({ id, title, text, code, jurisdiction })
}

export function listCorpusFiles(dir?: string): string[] {
  const resolved = dir ?? DEFAULT_CORPUS_DIR
  if (!existsSync(resolved)) return []
  return readdirSync(resolved)
    .filter((f) => CORPUS_EXTENSIONS.test(f))
    .sort()
}

export function loadCorpusDocuments(dir?: string): CodeDocument[] {
  const docs: CodeDocument[] = []
  for (const file of listCorpusFiles(dir)) {
    const doc = parseCorpusFile(file, readFileSync(join(dir ?? DEFAULT_CORPUS_DIR, file), 'utf8'))
    if (doc && doc.sections.length > 0) docs.push(doc)
  }
  return docs
}

export function corpusSummary(docs: CodeDocument[]): Array<{ id: string; title: string; code?: string; jurisdiction?: string; sections: number; chunks: number }> {
  return docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    code: doc.code,
    jurisdiction: doc.jurisdiction,
    sections: doc.sections.length,
    chunks: chunkDocument(doc).length,
  }))
}

// Extends an existing index with every corpus document found in `dir`.
// `base` defaults to a fresh empty index (caller decides what to seed).
// Documents whose id already exists in `base` are skipped, so embedded clean
// copies (e.g. the in-memory By-Laws / SI 56 in codeCorpus.ts) take precedence
// over their extracted corpus-file counterparts.
export function buildIndexWithCorpus(base: RagIndex, dir?: string): RagIndex {
  for (const doc of loadCorpusDocuments(dir)) {
    if (base.hasDocument(doc.id)) continue
    base.addDocument(doc)
  }
  return base
}

// By-Laws 1977 in-memory corpus + any external corpus files present in `dir`.
// This is the index the MCP server's `search_codes` / `analyze_compliance` use.
export function buildCorpusIndex(dir?: string): RagIndex {
  return buildIndexWithCorpus(buildDefaultRagIndex(), dir)
}

export function indexFromCorpus(dir?: string): RagIndex {
  return createIndex(loadCorpusDocuments(dir))
}
