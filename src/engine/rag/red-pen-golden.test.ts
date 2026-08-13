// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { GOLDEN_CASES } from '../../../eval/golden-dataset'
import { runGoldenCase } from '../../../eval/run-golden'
import { RED_PEN_CANONICAL_ID, redPenTakeOff } from '../../../eval/red-pen'
import promptfooConfig from '../../../eval/promptfooconfig'

const canonical = GOLDEN_CASES.find((c) => c.id === RED_PEN_CANONICAL_ID)

describe('KPI3 golden dataset — canonical Red Pen case (Ghost Materials)', () => {
  it('the canonical Red Pen case id is present in the golden dataset', () => {
    expect(canonical).toBeDefined()
    expect(GOLDEN_CASES.some((c) => c.id === RED_PEN_CANONICAL_ID)).toBe(true)
  })

  it('the case locks the variance math and the Red Pen llm-rubric surface', () => {
    expect(canonical).toBeDefined()
    const contains = canonical!.expect.contains ?? []
    expect(contains).toEqual(expect.arrayContaining(['180', 'variance', 'leakage', '1800', 'Ghost Materials', 'trench', 'forensic']))
    const cites = canonical!.expect.cites ?? []
    expect(cites).toEqual(expect.arrayContaining(['Red Pen Engine', 'ZIQS SMM', 'SAZ']))
    expect(canonical!.expect.notContains).toContain('no variance')
    expect(canonical!.description).toMatch(/12 m3|420|600|180|1,?800/i)
  })

  it('the local Red Pen take-off reproduces variance 180 (±0) and leakage $1,800 (±200)', () => {
    const result = redPenTakeOff({ item: 'Cement (bags) - trench concrete 12 m3', trenchM3: 12, required: 420, quoted: 600, unitCost: 10 })
    expect(result.valid).toBe(true)
    expect(result.variance).toBe(180)
    expect(result.required).toBe(420)
    expect(result.quoted).toBe(600)
    expect(result.leakage).toBeGreaterThanOrEqual(1600)
    expect(result.leakage).toBeLessThanOrEqual(2000)
    expect(result.leakage).toBe(1800)
    expect(result.leakageLabel).toBe('$1,800.00')
  })

  it('the canonical case passes the deterministic golden gate', async () => {
    const outcome = await runGoldenCase(canonical!, {})
    expect(outcome.pass).toBe(true)
    if (!outcome.pass) expect(outcome.reasons).toEqual([])
    const output = outcome.output as { variance?: number; leakage?: number }
    expect(output.variance).toBe(180)
    expect(output.leakage).toBe(1800)
  })

  it('promptfoo config imports the canonical Red Pen case into the eval gate', () => {
    const vars = promptfooConfig.tests.map((t) => t.vars?.caseId)
    expect(vars).toContain(RED_PEN_CANONICAL_ID)
  })
})
