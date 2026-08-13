import { calculateBricks } from '../src/engine/estimation/brickCalculator'
import { analyzeCompliance } from '../src/engine/rag/analysis'
import type { RagIndex } from '../src/engine/rag/ragIndex'
import { evaluateExpectations } from './assert'
import { parseBrickPrompt } from './brickPromptParser'
import type { GoldenCase } from './golden-dataset'
import { redPenTakeOff, RED_PEN_CANONICAL_ID, RED_PEN_BRICK_TOOL_ID } from './red-pen'

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

const QUOTED_RE = /\bquoted\s+(\d+(?:\.\d+)?)\b/i
const UNIT_COST_RE = /\$\s*(\d+(?:\.\d+)?)\s*(?:each|per\s+(?:unit|brick|bag|item))/i

function runRedPenCase(caseItem: GoldenCase): unknown {
  if (caseItem.id === RED_PEN_CANONICAL_ID) {
    return redPenTakeOff({ item: 'Cement (bags) - trench concrete 12 m3', trenchM3: 12, required: 420, quoted: 600, unitCost: 10 })
  }
  if (caseItem.id === RED_PEN_BRICK_TOOL_ID) {
    const parsed = parseBrickPrompt(caseItem.prompt)
    if (!parsed.ok) {
      return { valid: false, error: 'Invalid input', reasons: parsed.reasons }
    }
    const result = calculateBricks(parsed.params)
    if (!result.valid) return result
    const quoted = Number((caseItem.prompt.match(QUOTED_RE) ?? [])[1] ?? NaN)
    const unitCost = Number((caseItem.prompt.match(UNIT_COST_RE) ?? [])[1] ?? NaN)
    if (!Number.isFinite(quoted) || !Number.isFinite(unitCost)) {
      return { valid: false, error: 'quoted quantity or unit cost not parseable' }
    }
    const required = Math.round(result.quantity * 1.05)
    return redPenTakeOff({ item: 'SAZ 7 MPa common bricks (Willdale)', required, quoted, unitCost })
  }
  return { valid: false, error: `Unknown red-pen case ${caseItem.id}` }
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

  const output = caseItem.category === 'red-pen' ? runRedPenCase(caseItem) : runBrickCase(caseItem)
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
