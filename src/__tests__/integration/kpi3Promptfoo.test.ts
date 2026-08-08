// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runKpi3Promptfoo } from '../../../eval/promptfoo-suite'
import { GOLDEN_CASES } from '../../../eval/golden-dataset'

describe('KPI3 golden dataset — promptfoo regression gate (CI)', () => {
  it('evaluates every golden case and passes 100%', async () => {
    const summary = await runKpi3Promptfoo({ rerankThreshold: 0.5 })
    expect(summary.total).toBe(GOLDEN_CASES.length)
    expect(summary.skipped).toBe(0)
    expect(summary.failed).toBe(0)
    if (summary.failures.length > 0) {
      const detail = summary.failures.map((f) => `${f.id}: ${f.reasons.join('; ')}`).join('\n')
      expect(detail).toBe('')
    }
  }, 120000)
})
