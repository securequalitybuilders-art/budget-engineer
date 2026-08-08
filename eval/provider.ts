import type { ProviderResponse } from 'promptfoo'
import { GOLDEN_CASES } from './golden-dataset'
import { runGoldenCase } from './run-golden'
import { buildGoldenRagIndex } from './compliance-fixture'

const goldenById = new Map(GOLDEN_CASES.map((c) => [c.id, c]))
const ragIndex = buildGoldenRagIndex()

export async function callGoldenProvider(_prompt: string, context: { vars?: Record<string, unknown> }): Promise<ProviderResponse> {
  const caseId = String(context.vars?.caseId ?? '')
  const caseItem = goldenById.get(caseId)
  if (!caseItem) {
    return { output: JSON.stringify({ error: 'unknown caseId' }), metadata: { goldenPass: false, goldenSkipped: false, goldenReasons: [`unknown caseId ${caseId}`] } }
  }
  const outcome = await runGoldenCase(caseItem, { ragIndex, rerankThreshold: 0.5 })
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
