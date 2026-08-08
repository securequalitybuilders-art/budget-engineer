// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { GOLDEN_CASES, goldenCasesForCategory } from '../../eval/golden-dataset'
import { runGoldenSuite } from '../../eval/run-golden'
import { buildGoldenRagIndex } from '../../eval/compliance-fixture'
import { evaluateExpectations } from '../../eval/assert'
import { parseBrickPrompt } from '../../eval/brickPromptParser'
import { calculateBricks } from '../engine/estimation/brickCalculator'
import { DEFAULT_BRICK_SIZE } from '../engine/estimation/brickCalculator'

describe('KPI3 golden dataset — deterministic gate', () => {
  const allCategories = ['tool-quantity', 'tool-correctness', 'safety', 'compliance', 'red-team'] as const

  it('has a non-empty dataset with unique ids', () => {
    expect(GOLDEN_CASES.length).toBeGreaterThan(0)
    const ids = GOLDEN_CASES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('dataset covers all five KPI3 categories', () => {
    for (const category of allCategories) {
      expect(GOLDEN_CASES.some((c) => c.category === category), `${category} missing`).toBe(true)
    }
  })

  for (const category of allCategories) {
    it(`${category} cases all pass deterministically`, async () => {
      const cases = goldenCasesForCategory(category)
      expect(cases.length).toBeGreaterThan(0)
      const { total, passed, failed, skipped, failures } = await runGoldenSuite(cases, {
        ragIndex: buildGoldenRagIndex(),
        rerankThreshold: 0.5,
      })
      expect({ total, passed, skipped }).toEqual({ total, passed: total - failed - skipped, skipped })
      if (failures.length > 0) {
        const detail = failures.map((f) => `${f.id}: ${f.reasons.join('; ')}`).join('\n')
        expect(detail).toBe('')
      }
    })
  }

  it('ragIndex is required for compliance cases (skips cleanly without it)', async () => {
    const cases = goldenCasesForCategory('compliance')
    const { skipped, failed } = await runGoldenSuite(cases, {})
    expect(skipped).toBe(cases.length)
    expect(failed).toBe(0)
  })
})

describe('KPI3 brick calculator — spot checks', () => {
  it('handles the canonical boundary example', () => {
    const parsed = parseBrickPrompt('Calculate bricks for 10m boundary wall 230mm thick 2.4m high SAZ 7MPa common')
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      const result = calculateBricks(parsed.params)
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.quantity).toBe(293)
        expect(result.brickSizeLabel).toBe('400x200x200mm')
        expect(result.citation).toContain('SAZ 7MPa')
        expect(result.calculation.join(' ')).toContain('per ZIQS SMM')
        expect(result.calculation.join(' ')).toContain('400x200x200mm')
      }
    }
  })

  it('uses the default brick size from the registry', () => {
    expect(DEFAULT_BRICK_SIZE).toEqual({ lengthMm: 400, heightMm: 200, widthMm: 200 })
  })

  it('tool-correctness: rejects string-typed length', () => {
    const parsed = parseBrickPrompt('Calculate bricks for a "ten" metre boundary wall 230mm thick 2.4m high')
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.reasons.length).toBeGreaterThan(0)
  })

  it('safety: refuses a 125mm boundary wall', () => {
    const outcome = evaluateExpectations(calculateBricks({ lengthM: 10, heightM: 2.4, wallThicknessMm: 125, purpose: 'boundary' }), {
      nonCompliantRefused: true,
    })
    expect(outcome.pass).toBe(true)
  })
})
