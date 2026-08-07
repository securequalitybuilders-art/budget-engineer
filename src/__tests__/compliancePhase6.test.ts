import { describe, it, expect } from 'vitest'
import { runCompliance } from '@/engine/compliance'
import { assembleAnalysis } from '@/engine/calculators/analysisAssembly'
import { createSampleDesignOption, createSamplePlanModel } from './fixtures/cadFixtures'
import { FIXTURE_UNIT_TABLE, countFixtureUnits, suggestDrainSize, evaluateDrainageRules } from '@/engine/compliance/drainage'
import { evaluateSans10400Rules } from '@/engine/compliance/sans10400'
import { evaluateAccessibilityRules } from '@/engine/compliance/accessibility'
import type { PlanModel } from '@/domain/plan'
import type { ComplianceInput } from '@/engine/compliance/types'

function makeFixturePlan(): PlanModel {
  return {
    id: 'fixture-plan',
    designOptionId: 'fixture-design',
    width: 10,
    height: 8,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Bathroom', x: 0, y: 0, width: 2, height: 2.5 },
      { id: 'r2', name: 'Ensuite', x: 2, y: 0, width: 2, height: 2.5 },
      { id: 'r3', name: 'Kitchen', x: 4, y: 0, width: 3, height: 2.5 },
      { id: 'r4', name: 'Laundry', x: 0, y: 3, width: 2, height: 2 },
    ],
    walls: [],
    openings: [],
    scaleLabel: '1:50',
  }
}

function makeTightPlan(): PlanModel {
  return {
    id: 'tight-plan',
    designOptionId: 'tight-design',
    width: 4,
    height: 3,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Bedroom 1', x: 0, y: 0, width: 1.2, height: 1.2 },
      { id: 'r2', name: 'Living Room', x: 0, y: 1.5, width: 4, height: 1.4 },
    ],
    walls: [],
    openings: [],
    scaleLabel: '1:50',
  }
}

function makeSpaciousPlan(): PlanModel {
  return {
    id: 'spacious-plan',
    designOptionId: 'spacious-design',
    width: 12,
    height: 10,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 7, height: 6 },
      { id: 'r2', name: 'Bedroom', x: 7, y: 0, width: 5, height: 4 },
    ],
    walls: [],
    openings: [],
    scaleLabel: '1:100',
  }
}

function runFor(plan: PlanModel, buildingType: string, jurisdiction: 'zimbabwe' | 'south-africa' = 'south-africa', gfa = 150) {
  const design = createSampleDesignOption({ grossFloorArea: gfa, buildingType })
  const analysis = assembleAnalysis({ plan, design, boq: null, buildingType })
  return runCompliance(jurisdiction, { plan, design, analysis, buildingType })
}

describe('SANS 10400-P fixture units (gemini.md §4.2 Part P)', () => {
  it('encodes the fixture-unit table per fixture type', () => {
    const wc = FIXTURE_UNIT_TABLE.find((f) => f.fixture === 'WC')
    expect(wc?.units).toBe(4)
    const basin = FIXTURE_UNIT_TABLE.find((f) => f.fixture === 'Wash basin')
    expect(basin?.units).toBe(1)
    const bath = FIXTURE_UNIT_TABLE.find((f) => f.fixture === 'Bath')
    expect(bath?.units).toBe(2)
    const shower = FIXTURE_UNIT_TABLE.find((f) => f.fixture === 'Shower')
    expect(shower?.units).toBe(2)
    const sink = FIXTURE_UNIT_TABLE.find((f) => f.fixture === 'Kitchen sink')
    expect(sink?.units).toBe(2)
  })

  it('counts fixture units from plan rooms', () => {
    const plan = makeFixturePlan()
    const design = createSampleDesignOption({ grossFloorArea: 150, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const input: ComplianceInput = { plan, design, analysis, buildingType: 'house' }
    const fu = countFixtureUnits(input)
    // Bathroom + Ensuite (2× WC + 2× basin + 2× bath + 2× shower) + Kitchen sink + Laundry tub
    expect(fu.rooms).toBe(4)
    expect(fu.total).toBe(2 * 4 + 2 * 1 + 2 * 2 + 2 * 2 + 2 + 3)
  })

  it('suggestDrainSize maps FU to pipe size', () => {
    expect(suggestDrainSize(0)).toBe('n/a')
    expect(suggestDrainSize(20)).toBe('75 mm')
    expect(suggestDrainSize(60)).toBe('100 mm')
    expect(suggestDrainSize(120)).toBe('150 mm')
    expect(suggestDrainSize(250)).toBe('≥ 150 mm (check stack sizing)')
  })

  it('drn-08 rule appears in the report with the fixture-unit loading', () => {
    const report = runFor(makeFixturePlan(), 'house')
    const rule = report.results.find((r) => r.ruleId === 'sans-drn-08')
    expect(rule).toBeDefined()
    expect(rule!.actual).toContain('FU')
    expect(rule!.required).toContain('75mm')
  })

  it('drn-08 rule is null-safe without plan rooms', () => {
    const input: ComplianceInput = { plan: null, design: null, analysis: null, buildingType: 'house' }
    const results = evaluateDrainageRules(input, 'zbc', 'SANS 10400-P')
    const rule = results.find((r) => r.ruleId === 'zbc-drn-08')
    expect(rule).toBeDefined()
    expect(rule!.status).toBe('warn')
  })

  it('drn-08 is added to both jurisdictions', () => {
    const plan = makeFixturePlan()
    const zbc = runFor(plan, 'house', 'zimbabwe')
    const sans = runFor(plan, 'house', 'south-africa')
    expect(zbc.results.map((r) => r.ruleId)).toContain('zbc-drn-08')
    expect(sans.results.map((r) => r.ruleId)).toContain('sans-drn-08')
  })
})

describe('SANS 10400-S accessibility (gemini.md §4.2 Part S)', () => {
  it('access-14 passes when a space provides a 1.5m turning circle', () => {
    const report = runFor(makeSpaciousPlan(), 'house')
    const rule = report.results.find((r) => r.ruleId === 'sans-access-14')
    expect(rule).toBeDefined()
    expect(rule!.status).toBe('pass')
    expect(rule!.required).toContain('1500 mm')
  })

  it('access-14 fails when no space provides a 1.5m turning circle', () => {
    const report = runFor(makeTightPlan(), 'house')
    const rule = report.results.find((r) => r.ruleId === 'sans-access-14')
    expect(rule).toBeDefined()
    expect(rule!.status).toBe('fail')
  })

  it('access-15 encodes the 1.8m x 1.8m WC cubicle (non-residential)', () => {
    const report = runFor(makeSpaciousPlan(), 'office')
    const rule = report.results.find((r) => r.ruleId === 'sans-access-15')
    expect(rule).toBeDefined()
    expect(rule!.required).toContain('1800 mm')
  })

  it('access-15 is skipped for residential dwellings', () => {
    const report = runFor(makeSpaciousPlan(), 'house')
    expect(report.results.map((r) => r.ruleId)).not.toContain('sans-access-15')
  })

  it('accessibility evaluator is safe on null input', () => {
    const input: ComplianceInput = { plan: null, design: null, analysis: null, buildingType: 'house' }
    const results = evaluateAccessibilityRules(input, 'sans', 'SANS 10400-S')
    const turning = results.find((r) => r.ruleId === 'sans-access-14')
    expect(turning).toBeDefined()
    expect(turning!.status).toBe('warn')
  })
})

describe('SANS 10400-O ventilation rate (gemini.md §4.2 Part O)', () => {
  it('encodes the 5 L/s per person rate using occupant load', () => {
    const plan = createSamplePlanModel()
    const design = createSampleDesignOption({ grossFloorArea: 150, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('south-africa', { plan, design, analysis, buildingType: 'house' })
    const rule = report.results.find((r) => r.ruleId === 'sans-s10400-o-vent-rate')
    expect(rule).toBeDefined()
    expect(rule!.required).toContain('5 L/s')
    const occLoad = analysis?.egress?.occupantLoad ?? 0
    expect(occLoad).toBeGreaterThan(0)
    expect(rule!.actual).toContain(`${occLoad * 5} L/s`)
  })

  it('ventilation rule is added to both jurisdictions', () => {
    const plan = createSamplePlanModel()
    const zbc = runFor(plan, 'house', 'zimbabwe')
    const sans = runFor(plan, 'house', 'south-africa')
    expect(zbc.results.map((r) => r.ruleId)).toContain('zbc-s10400-o-vent-rate')
    expect(sans.results.map((r) => r.ruleId)).toContain('sans-s10400-o-vent-rate')
  })

  it('ventilation rule is null-safe without occupant data', () => {
    const input: ComplianceInput = { plan: null, design: null, analysis: null, buildingType: 'house' }
    const results = evaluateSans10400Rules(input, 'sans', 'SANS 10400')
    const rule = results.find((r) => r.ruleId === 'sans-s10400-o-vent-rate')
    expect(rule).toBeDefined()
    expect(rule!.status).toBe('warn')
  })
})
