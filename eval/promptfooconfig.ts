import { GOLDEN_CASES } from './golden-dataset'
import { callGoldenProvider } from './provider'

export default {
  providers: [callGoldenProvider],
  prompts: ['{{prompt}}'],
  tests: GOLDEN_CASES.map((caseItem) => ({
    description: `${caseItem.id} (${caseItem.category})${caseItem.description ? ` - ${caseItem.description}` : ''}`,
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
