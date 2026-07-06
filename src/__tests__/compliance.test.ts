import { describe, it, expect } from 'vitest'
import { runCompliance, emptyCompliance, summarizeCompliance } from '@/engine/compliance'
import { assembleAnalysis, emptyAnalysis } from '@/engine/calculators/analysisAssembly'
import { createSampleDesignOption, createSamplePlanModel } from './fixtures/cadFixtures'
import type { PlanModel } from '@/domain/plan'

function makeSmallRoomPlan(): PlanModel {
  return {
    id: 'small-plan',
    designOptionId: 'small-design',
    width: 4,
    height: 3,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Bedroom 1', x: 0, y: 0, width: 1.5, height: 1.5 },
      { id: 'r2', name: 'Living Room', x: 0, y: 1.5, width: 4, height: 1.5 },
    ],
    walls: [],
    openings: [],
    scaleLabel: '1:50',
  }
}

function makeLargePlan(): PlanModel {
  return {
    id: 'large-plan',
    designOptionId: 'large-design',
    width: 15,
    height: 12,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Bedroom 1', x: 0, y: 0, width: 4, height: 4 },
      { id: 'r2', name: 'Bedroom 2', x: 4, y: 0, width: 4, height: 4 },
      { id: 'r3', name: 'Living Room', x: 8, y: 0, width: 7, height: 6 },
      { id: 'r4', name: 'Kitchen', x: 8, y: 6, width: 7, height: 3 },
      { id: 'r5', name: 'Dining Room', x: 0, y: 4, width: 8, height: 3 },
    ],
    walls: [],
    openings: [],
    scaleLabel: '1:100',
  }
}

describe('runCompliance', () => {
  it('returns rules with correct pass/warn/fail for a sample design', () => {
    const design = createSampleDesignOption({ grossFloorArea: 200, floors: 2, buildingType: 'office' })
    const plan = createSamplePlanModel()
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'office' })
    const report = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'office' })

    expect(report.jurisdiction).toBe('zimbabwe')
    expect(report.results.length).toBeGreaterThan(0)
    expect(report.totalRules).toBe(report.results.length)
    expect(report.score).toBeGreaterThanOrEqual(0)
    expect(report.score).toBeLessThanOrEqual(100)

    for (const rule of report.results) {
      expect(rule.ruleId).toBeTruthy()
      expect(['pass', 'warn', 'fail']).toContain(rule.status)
      expect(rule.actual).toBeTruthy()
      expect(rule.required).toBeTruthy()
      expect(rule.note).toBeTruthy()
    }
  })

  it('evaluates a too-small room as fail for min-room-area', () => {
    const plan = makeSmallRoomPlan()
    const design = createSampleDesignOption({ grossFloorArea: 6, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'house' })

    const minAreaRule = report.results.find((r) => r.ruleId === 'zbc-min-room-area')
    expect(minAreaRule).toBeDefined()
    expect(minAreaRule!.status).toBe('fail')
    expect(minAreaRule!.actual).toContain('2.3')
    expect(minAreaRule!.required).toContain('6.0')
  })

  it('min-room-width fails for a room with dimension below 2.0m', () => {
    const plan = makeSmallRoomPlan()
    const design = createSampleDesignOption({ buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'house' })

    const widthRule = report.results.find((r) => r.ruleId === 'zbc-min-room-width')
    expect(widthRule).toBeDefined()
    expect(widthRule!.status).toBe('fail')
    expect(widthRule!.actual).toContain('1.50')
  })

  it('min-ceiling-height passes for 3.0m storey height', () => {
    const plan = createSamplePlanModel()
    const design = createSampleDesignOption({ buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'house' })

    const ceilingRule = report.results.find((r) => r.ruleId === 'zbc-ceiling-height')
    expect(ceilingRule).toBeDefined()
    expect(ceilingRule!.status).toBe('pass')
  })

  it('large plan passes min-room-area and min-room-width', () => {
    const plan = makeLargePlan()
    const design = createSampleDesignOption({ grossFloorArea: 150, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'house' })

    const areaRule = report.results.find((r) => r.ruleId === 'zbc-min-room-area')
    const widthRule = report.results.find((r) => r.ruleId === 'zbc-min-room-width')
    expect(areaRule!.status).toBe('pass')
    expect(widthRule!.status).toBe('pass')
  })

  it('egress rule reuses the egress calculator output', () => {
    const plan = createSamplePlanModel()
    const design = createSampleDesignOption({ grossFloorArea: 500, floors: 2, buildingType: 'office' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'office' })
    const report = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'office' })

    const egressRule = report.results.find((r) => r.ruleId === 'zbc-means-of-escape')
    expect(egressRule).toBeDefined()
    expect(egressRule!.status).toBe('pass')
    expect(egressRule!.actual).toContain('exit')
    expect(egressRule!.note).toContain('Approximate')
  })

  it('non-residential building triggers sanitary provision rule', () => {
    const plan = makeLargePlan()
    const design = createSampleDesignOption({ grossFloorArea: 300, buildingType: 'office' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'office' })
    const report = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'office' })

    const sanitaryRule = report.results.find((r) => r.ruleId === 'zbc-sanitary-provision')
    expect(sanitaryRule).toBeDefined()
    expect(sanitaryRule!.status).toBe('warn')
    expect(sanitaryRule!.actual).toContain('WC')
  })

  it('residential building marks sanitary-provision as N/A', () => {
    const plan = makeLargePlan()
    const design = createSampleDesignOption({ grossFloorArea: 150, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'house' })

    const sanitaryRule = report.results.find((r) => r.ruleId === 'zbc-sanitary-provision')
    expect(sanitaryRule).toBeDefined()
    expect(sanitaryRule!.status).toBe('pass')
    expect(sanitaryRule!.actual).toContain('residential')
  })

  it('returns safe empty result for null design/plan', () => {
    const report = runCompliance('zimbabwe', { plan: null, design: null, analysis: null, buildingType: 'house' })

    expect(report.jurisdiction).toBe('zimbabwe')
    expect(report.results.length).toBeGreaterThanOrEqual(0)
    expect(report.score).toBeGreaterThanOrEqual(0)
    expect(report.warnings.length).toBeGreaterThanOrEqual(0)
  })

  it('unknown jurisdiction returns empty result without throwing', () => {
    const plan = createSamplePlanModel()
    const design = createSampleDesignOption()
    const result = emptyAnalysis()
    const report = runCompliance('south-africa', { plan, design, analysis: result, buildingType: 'house' })

    expect(report.results.length).toBe(0)
    expect(report.score).toBe(0)
    expect(report.warnings.length).toBeGreaterThan(0)
  })

  it('emptyCompliance returns safe zero state', () => {
    const report = emptyCompliance('zimbabwe')
    expect(report.jurisdiction).toBe('zimbabwe')
    expect(report.results.length).toBe(0)
    expect(report.score).toBe(0)
    expect(report.totalRules).toBe(0)
    expect(report.passedRules).toBe(0)
    expect(report.warnings).toContain('No design data')
  })

  it('summarizeCompliance counts correctly', () => {
    const report = runCompliance('zimbabwe', { plan: null, design: null, analysis: null, buildingType: 'house' })
    const summary = summarizeCompliance(report)
    expect(typeof summary.passCount).toBe('number')
    expect(typeof summary.warnCount).toBe('number')
    expect(typeof summary.failCount).toBe('number')
    expect(summary.hasCompliance).toBe(report.results.length > 0)
  })

  it('does not throw on any input', () => {
    expect(() => runCompliance('zimbabwe', { plan: null, design: null, analysis: null, buildingType: '' })).not.toThrow()
    expect(() => runCompliance('', { plan: null, design: null, analysis: null, buildingType: '' })).not.toThrow()
    expect(() => runCompliance('zimbabwe', { plan: null, design: null, analysis: null, buildingType: 'clinic' })).not.toThrow()
  })
})
