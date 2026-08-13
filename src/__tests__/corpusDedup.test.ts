// Data Quality Gap #1 — corpus hygiene regression gate.
//
// Locks in the dedup/fix pack:
//   - `hygiene.ts` dead-OCR / duplicate detection + deterministic fix pass
//   - `loader-enterprise.ts` clean-source enterprise index
//   - the committed `corpus/` staying clean (no replacements, no dead stubs,
//     no duplicate hashes; the four registry files hold the clean text)
//
// The real-corpus block asserts against the committed `corpus/` directory; it
// degrades to a no-op if the dir is absent (e.g. shallow checkout).

import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { auditDir, applyFixes, probeText, REGISTRY_CLEAN, ZIQS_SMM_CLEAN_TEXT } from '@/engine/rag/corpus/hygiene'
import { buildEnterpriseIndex, REGISTRY_DOCS, REGISTRY_DOC_IDS } from '@/engine/rag/corpus/loader-enterprise'
import { specSourceTypeFor } from '@/engine/rag/sourceType'

function dictionaryTokenRatio(text: string): number {
  const tokens = text.split(/[^a-z0-9]+/i).filter((t) => t.length >= 2)
  if (tokens.length === 0) return 0
  const dict = tokens.filter((t) => /^[a-z]{2,}$/i.test(t)).length
  return dict / tokens.length
}

const PAGE_MARKER_STUB = Array.from({ length: 40 }, (_, i) => `-- ${i + 1} of 40 --`).join('\n')

describe('hygiene detection', () => {
  it('flags a page-marker stub as dead-OCR', () => {
    const probe = probeText(PAGE_MARKER_STUB, 'book.txt')
    expect(probe.dead).toBe(true)
    expect(probe.stub).toBe(true)
    expect(probe.reasons.join('; ')).toContain('OCR page markers')
  })

  it('treats clean regulation text as alive', () => {
    const probe = probeText(ZIQS_SMM_CLEAN_TEXT, 'ziqs-smm.txt')
    expect(probe.dead).toBe(false)
    expect(probe.reasons).toHaveLength(0)
  })

  it('does not flag CSV tables as junk (lexical heuristics exempt)', () => {
    const probe = probeText('code,desc,rate\n115,one brick wall,0.29\n', 'rates.csv')
    expect(probe.dead).toBe(false)
  })

  it('registry clean map covers all four enterprise docs', () => {
    expect(Object.keys(REGISTRY_CLEAN).sort()).toEqual(['by-laws-1977', 'saz-catalogue', 'si-56-2025', 'ziqs-smm'])
    for (const id of REGISTRY_DOC_IDS) {
      expect(REGISTRY_CLEAN[id].text.length).toBeGreaterThan(200)
    }
  })
})

describe('hygiene fix pass (hermetic)', () => {
  function makeCorpus(): string {
    const dir = mkdtempSync(join(tmpdir(), 'be-corpus-'))
    // Registry files that differ from the embedded clean copy.
    writeFileSync(join(dir, 'si-56-2025.txt'), 'SI 2025-056 ... raw gazette extract with OCR noise and markers', 'utf8')
    // A dead-OCR stub.
    writeFileSync(join(dir, 'Neufert dead scan.txt'), PAGE_MARKER_STUB, 'utf8')
    // An exact duplicate pair.
    writeFileSync(join(dir, 'Time-Saver A.txt'), 'Time Saver content. '.repeat(20), 'utf8')
    writeFileSync(join(dir, 'Time-Saver B.txt'), 'Time Saver content. '.repeat(20), 'utf8')
    // A registry alias of si-56-2025.
    writeFileSync(join(dir, 'SI 2025-056 Architects (Amendment) Regulations, 2025 (No. 1).txt'), 'raw SI 56 gazette text', 'utf8')
    return dir
  }

  it('applies replacements, quarantine, dedup and alias removal; fresh audit is clean', () => {
    const dir = makeCorpus()
    try {
      const report = applyFixes(dir)

      // Registry replacement applied in place with the clean embedded text.
      expect(readFileSync(join(dir, 'si-56-2025.txt'), 'utf8').trim()).toBe(REGISTRY_CLEAN['si-56-2025'].text.trim())
      expect(report.replacements.map((r) => r.file)).toContain('si-56-2025.txt')

      // Dead stub moved to .quarantine/dead.
      expect(existsSync(join(dir, 'Neufert dead scan.txt'))).toBe(false)
      expect(readdirSync(join(dir, '.quarantine', 'dead'))).toContain('Neufert dead scan.txt')

      // Exact duplicate: lexicographically first kept, second quarantined.
      expect(existsSync(join(dir, 'Time-Saver B.txt'))).toBe(false)
      expect(readdirSync(join(dir, '.quarantine', 'duplicates'))).toContain('Time-Saver B.txt')

      // Registry alias quarantined once the clean si-56-2025 is present.
      expect(report.aliasDuplicates.map((q) => q.file)[0]).toContain('SI 2025-056')

      // A fresh audit finds nothing left to fix.
      const fresh = auditDir(dir)
      expect(fresh.ok).toBe(true)
      expect(fresh.scanned).toBe(2) // kept Time-Saver A + replaced clean si-56-2025
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fix pass is idempotent — a second run reports no issues', () => {
    const dir = makeCorpus()
    try {
      applyFixes(dir)
      const second = applyFixes(dir)
      expect(second.replacements).toHaveLength(0)
      expect(second.deadOcr).toHaveLength(0)
      expect(second.exactDuplicates).toHaveLength(0)
      expect(second.aliasDuplicates).toHaveLength(0)
      expect(second.ok).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('enterprise loader', () => {
  it('always ships the four registry documents', () => {
    expect(REGISTRY_DOCS.map((d) => d.id)).toEqual(['by-laws-1977', 'si-56-2025', 'saz-catalogue', 'ziqs-smm'])
    expect(REGISTRY_DOC_IDS).toHaveLength(4)
  })

  it('covers the spec source-type taxonomy for all four registry docs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'be-corpus-'))
    try {
      const index = buildEnterpriseIndex(dir) // empty dir -> the four embedded registry docs only
      for (const id of REGISTRY_DOC_IDS) {
        expect(index.hasDocument(id)).toBe(true)
        expect(specSourceTypeFor(id)).toBeTruthy()
      }
      expect(specSourceTypeFor('by-laws-1977')).toBe('bylaws_1977')
      expect(specSourceTypeFor('si-56-2025')).toBe('si56')
      expect(specSourceTypeFor('saz-catalogue')).toBe('saz')
      expect(specSourceTypeFor('ziqs-smm')).toBe('ziqs')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('skips registry files, dead-OCR stubs, and adds clean extras', () => {
    const dir = mkdtempSync(join(tmpdir(), 'be-corpus-'))
    try {
      writeFileSync(join(dir, 'si-56-2025.txt'), REGISTRY_CLEAN['si-56-2025'].text, 'utf8')
      writeFileSync(join(dir, 'stub.txt'), PAGE_MARKER_STUB, 'utf8')
      writeFileSync(join(dir, 'ziqs-smm.txt'), 'garbage from the old stub copy', 'utf8')
      writeFileSync(join(dir, 'extra.txt'), 'Extra note about boundary walls in Harare.\n', 'utf8')
      const debug: string[] = []
      const index = buildEnterpriseIndex(dir, { debug: (m) => debug.push(m) })
      // Embedded registry docs present; on-disk registry copies skipped.
      expect(index.hasDocument('by-laws-1977')).toBe(true)
      expect(index.hasDocument('si-56-2025')).toBe(true)
      expect(index.hasDocument('ziqs-smm')).toBe(true)
      expect(debug.some((m) => m.includes('si-56-2025') && m.includes('registry'))).toBe(true)
      expect(debug.some((m) => m.includes('ziqs-smm') && m.includes('registry'))).toBe(true)
      // Dead-OCR stub skipped, clean extra added.
      expect(debug.some((m) => m.includes('stub.txt') && m.includes('dead-OCR'))).toBe(true)
      expect(index.hasDocument('extra')).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('committed corpus stays clean (Data Quality Gap #1)', () => {
  const CORPUS = 'corpus'
  const skip = !existsSync(join(CORPUS, 'si-56-2025.txt'))

  it('audits clean with no duplicates or dead stubs', () => {
    if (skip) return
    const report = auditDir(CORPUS)
    expect(report.ok).toBe(true)
    expect(report.replacements).toHaveLength(0)
    expect(report.deadOcr).toHaveLength(0)
    expect(report.exactDuplicates).toHaveLength(0)
    expect(report.nearDuplicates).toHaveLength(0)
    expect(report.aliasDuplicates).toHaveLength(0)
  }, 60_000)

  it('has no duplicate content hashes across the top-level corpus', () => {
    if (skip) return
    const { probeText: probe } = { probeText }
    const hashes = readdirSync(CORPUS)
      .filter((f) => /\.(txt|md|csv)$/i.test(f))
      .map((f) => probe(readFileSync(join(CORPUS, f), 'utf8'), f).hash)
    expect(new Set(hashes).size).toBe(hashes.length)
  }, 60_000)

  it('ziqs-smm is the composed clean text, not the old page-marker stub', () => {
    if (skip) return
    const text = readFileSync(join(CORPUS, 'ziqs-smm.txt'), 'utf8')
    expect(dictionaryTokenRatio(text)).toBeGreaterThanOrEqual(0.95)
    expect(text).not.toContain('-- 1 of')
    expect(text).toContain('net volume')
  })

  it('by-laws-1977 is the clean statute, not the wrong-content course book', () => {
    if (skip) return
    const text = readFileSync(join(CORPUS, 'by-laws-1977.txt'), 'utf8')
    expect(text).toContain('ceiling height')
    expect(text).not.toMatch(/AAR1001|fen Architects/)
  })

  it('si-56-2025 matches the embedded clean copy', () => {
    if (skip) return
    const text = readFileSync(join(CORPUS, 'si-56-2025.txt'), 'utf8')
    expect(text.trim()).toBe(REGISTRY_CLEAN['si-56-2025'].text.trim())
  })
})
