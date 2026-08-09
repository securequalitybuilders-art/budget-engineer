// @vitest-environment node
import { describe, expect, it } from 'vitest'
import goldenBoq from '../../eval/golden-boq.json'

interface GoldenBoqCase {
  id: string
  source: string
  title: string
  measurementRule?: string
  input?: Record<string, unknown>
  expected: Array<{
    category: string
    description: string
    unit: string
    quantity: number
    tolerancePct: number
    formula?: string
  }>
}

const data = goldenBoq as { schemaVersion: number; cases: GoldenBoqCase[] }

describe('KPI3 golden BOQ dataset (eval/golden-boq.json)', () => {
  it('has exactly 20 test cases', () => {
    expect(data.schemaVersion).toBe(1)
    expect(data.cases.length).toBe(20)
  })

  it('has unique case ids', () => {
    const ids = data.cases.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every case is sourced from ZIQS SMM and/or SAZ', () => {
    for (const c of data.cases) {
      expect(c.source).toMatch(/ZIQS SMM|SAZ/)
      expect(c.source).toBeTruthy()
    }
  })

  it('every case has at least one expected line with a positive quantity and a tolerance', () => {
    for (const c of data.cases) {
      expect(c.expected.length).toBeGreaterThan(0)
      for (const line of c.expected) {
        expect(line.quantity).toBeGreaterThan(0)
        expect(line.tolerancePct).toBeGreaterThanOrEqual(0)
        expect(line.unit).toBeTruthy()
        expect(line.category).toBeTruthy()
        expect(line.description).toBeTruthy()
      }
    }
  })

  it('all expected lines carry a take-off formula', () => {
    for (const c of data.cases) {
      for (const line of c.expected) {
        expect(line.formula, `${c.id}/${line.description} missing formula`).toBeTruthy()
      }
    }
  })

  it('covers the core ZIQS SMM work sections', () => {
    const sections = new Set(data.cases.flatMap((c) => c.expected.map((l) => l.category)))
    for (const section of ['Substructure', 'Superstructure', 'Masonry', 'Windows / Doors', 'Finishes', 'Roofing', 'Plumbing']) {
      expect(sections.has(section), `${section} not covered`).toBe(true)
    }
  })

  it('includes the canonical ZIQS/SAZ bricks take-off (293 per 10 m boundary)', () => {
    const bricks = data.cases.find((c) => c.id === 'boq-bricks-400x200x200')
    expect(bricks).toBeDefined()
    const line = bricks!.expected.find((l) => l.unit === 'thousand')!
    expect(line.quantity).toBeCloseTo(0.293, 3)
    expect(line.description).toContain('SAZ 7 MPa')
  })

  it('spot-checks the footing excavation take-off (10 x 0.6 x 0.6 = 3.6 m3)', () => {
    const footing = data.cases.find((c) => c.id === 'boq-strip-footing-excavation')!
    expect(footing.expected[0].quantity).toBeCloseTo(3.6, 6)
    expect(footing.expected[0].unit).toBe('m3')
  })

  it('deducts openings larger than 1 m2 from masonry (10 x 2.4 - 1.8 = 22.2 m2)', () => {
    const wall = data.cases.find((c) => c.id === 'boq-external-wall-230')!
    expect(wall.expected[0].quantity).toBeCloseTo(22.2, 6)
    expect(wall.measurementRule).toContain('1.0 m2')
  })

  it('applies the 5% tiling waste uplift (24 x 1.05 = 25.2 m2)', () => {
    const tiles = data.cases.find((c) => c.id === 'boq-floor-tiles-400')!
    expect(tiles.expected[0].quantity).toBeCloseTo(25.2, 6)
  })
})
