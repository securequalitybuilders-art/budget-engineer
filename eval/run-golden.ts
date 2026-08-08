import { calculateBricks } from '../src/engine/estimation/brickCalculator'
import { analyzeCompliance } from '../src/engine/rag/analysis'
import type { RagIndex } from '../src/engine/rag/ragIndex'
import { evaluateExpectations } from './assert'
import { parseBrickPrompt } from './brickPromptParser'
import type { GoldenCase } from './golden-dataset'

export interface GoldenCaseOutput {
  id: string
  category: string
  pass: boolean
  reasons: string[]
  skipped?: string
  output: unknown
}

export interface GoldenRunDeps {
  ragIndex?: RagIndex
  rerankThreshold?: number
}

function runBrickCase(caseItem: GoldenCase): unknown {
  const parsed = parseBrickPrompt(caseItem.prompt)
  if (!parsed.ok) {
    return { valid: false, error: 'Invalid input', reasons: parsed.reasons }
  }
  return calculateBricks(parsed.params)
}

export async function runGoldenCase(caseItem: GoldenCase, deps: GoldenRunDeps = {}): Promise<GoldenCaseOutput> {
  if (caseItem.category === 'compliance') {
    if (!deps.ragIndex) {
      return { id: caseItem.id, category: caseItem.category, pass: false, reasons: [], skipped: 'requires ragIndex', output: null }
    }
    const report = await analyzeCompliance(deps.ragIndex, {
      query: caseItem.prompt,
      jurisdiction: caseItem.jurisdiction ?? 'zimbabwe',
      rerankThreshold: deps.rerankThreshold,
    })
    const outcome = evaluateExpectations(report, caseItem.expect)
    return { id: caseItem.id, category: caseItem.category, pass: outcome.pass, reasons: outcome.reasons, output: report }
  }

  const output = runBrickCase(caseItem)
  const outcome = evaluateExpectations(output, caseItem.expect)
  return { id: caseItem.id, category: caseItem.category, pass: outcome.pass, reasons: outcome.reasons, output }
}

export async function runGoldenSuite(cases: GoldenCase[], deps: GoldenRunDeps = {}): Promise<{
  total: number
  passed: number
  failed: number
  skipped: number
  failures: GoldenCaseOutput[]
}> {
  const results = await Promise.all(cases.map((c) => runGoldenCase(c, deps)))
  const skipped = results.filter((r) => r.skipped).length
  const failures = results.filter((r) => !r.pass && !r.skipped)
  return {
    total: results.length,
    passed: results.length - failures.length - skipped,
    failed: failures.length,
    skipped,
    failures,
  }
}
