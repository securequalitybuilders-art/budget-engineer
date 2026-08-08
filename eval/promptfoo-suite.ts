import { evaluate } from 'promptfoo'
import type { EvaluateTestSuite } from 'promptfoo'
import { GOLDEN_CASES } from './golden-dataset'
import { runGoldenCase } from './run-golden'
import { buildGoldenRagIndex } from './compliance-fixture'

const goldenById = new Map(GOLDEN_CASES.map((c) => [c.id, c]))

export interface PromptfooSuiteOptions {
  rerankThreshold?: number
}

export function buildPromptfooSuite(options: PromptfooSuiteOptions = {}): EvaluateTestSuite {
  const ragIndex = buildGoldenRagIndex()
  const rerankThreshold = options.rerankThreshold ?? 0.5

  const provider = async (_prompt: string, context: { vars: Record<string, unknown> }) => {
    const caseId = String(context.vars.caseId ?? '')
    const caseItem = goldenById.get(caseId)
    if (!caseItem) {
      return { output: '{"error":"unknown caseId"}', metadata: { goldenPass: false, goldenReasons: [`unknown caseId ${caseId}`] } }
    }
    const outcome = await runGoldenCase(caseItem, { ragIndex, rerankThreshold })
    return {
      output: JSON.stringify(outcome.output),
      metadata: {
        goldenPass: outcome.pass,
        goldenSkipped: outcome.skipped !== undefined,
        goldenReasons: outcome.reasons,
        goldenCategory: outcome.category,
      },
    }
  }

  return {
    providers: [provider as never],
    prompts: ['{{prompt}}'],
    tests: GOLDEN_CASES.map((caseItem) => ({
      description: `${caseItem.id} (${caseItem.category})${caseItem.description ? ` — ${caseItem.description}` : ''}`,
      vars: { caseId: caseItem.id, prompt: caseItem.prompt },
      assert: [
        {
          type: 'javascript',
          value: (_output: unknown, ctx: { metadata?: Record<string, unknown> }) =>
            ctx.metadata?.goldenSkipped === true || ctx.metadata?.goldenPass === true,
        },
      ],
    })),
  }
}

export interface Kpi3EvalSummary {
  total: number
  passed: number
  failed: number
  skipped: number
  failures: { id: string; reasons: string[] }[]
}

export async function runKpi3Promptfoo(options: PromptfooSuiteOptions = {}): Promise<Kpi3EvalSummary> {
  const suite = buildPromptfooSuite(options)
  const result = await evaluate(suite, { maxConcurrency: 4, showProgressBar: false })
  const failures: { id: string; reasons: string[] }[] = []
  let skipped = 0
  for (const row of result.results) {
    const metadata = row.gradingResult?.metadata ?? row.metadata
    const id = String(row.testCase?.vars?.caseId ?? row.testCase?.description ?? 'unknown')
    if (metadata?.goldenSkipped === true) {
      skipped++
      continue
    }
    if (!row.success) {
      const reasons = Array.isArray(metadata?.goldenReasons) ? (metadata.goldenReasons as string[]) : ['assertion failed']
      failures.push({ id, reasons })
    }
  }
  const total = result.results.length
  return { total, passed: total - failures.length - skipped, failed: failures.length, skipped, failures }
}
