import { describe, it, expect } from 'vitest'
import { runCompliance } from '@/engine/compliance'
import { assembleAnalysis } from '@/engine/calculators/analysisAssembly'
import { createSampleDesignOption, createSamplePlanModel } from './fixtures/cadFixtures'
import { evaluateLegislationRules } from '@/engine/compliance/legislation'
import { classifyOccupancy } from '@/engine/compliance/sans10400'
import { imposedLoadKpa, zimbabweBasicWindSpeed } from '@/engine/compliance/sans10160'
import type { PlanModel } from '@/domain/plan'
import type { ComplianceInput } from '@/engine/compliance/types'

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
    walls: [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 15, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w2', start: { x: 8, y: 0 }, end: { x: 8, y: 12 }, thickness: 0.15, type: 'internal' },
    ],
    openings: [],
    scaleLabel: '1:100',
  }
}

describe('Zimbabwean legislation (gemini.md §4.1)', () => {
  it('adds legislation rules to the zimbabwe report', () => {
    const plan = createSamplePlanModel()
    const design = createSampleDesignOption({ grossFloorArea: 150, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'house' })

    const ids = report.results.map((r) => r.ruleId)
    expect(ids).toContain('zbc-leg-mbb-masonry')
    expect(ids).toContain('zbc-leg-rtcp-setbacks')
    expect(ids).toContain('zbc-leg-rtcp-far')
    expect(ids).toContain('zbc-leg-housing-room-min')
    expect(ids).toContain('zbc-leg-housing-ceiling')
    expect(ids).toContain('zbc-leg-urban-storeys')
    expect(ids).toContain('zbc-leg-ema-wetlands')
  })

  it('housing room-min rule fails for an undersized room', () => {
    const plan = makeSmallRoomPlan()
    const design = createSampleDesignOption({ grossFloorArea: 6, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'house' })

    const rule = report.results.find((r) => r.ruleId === 'zbc-leg-housing-room-min')
    expect(rule).toBeDefined()
    expect(rule!.status).toBe('fail')
    expect(rule!.actual).toContain('undersized')
  })

  it('housing room-min rule passes for a compliant large plan', () => {
    const plan = makeLargePlan()
    const design = createSampleDesignOption({ grossFloorArea: 150, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'house' })

    const rule = report.results.find((r) => r.ruleId === 'zbc-leg-housing-room-min')
    expect(rule).toBeDefined()
    expect(rule!.status).toBe('pass')
  })

  it('factories & works rule only fires for non-residential', () => {
    const plan = createSamplePlanModel()
    const design = createSampleDesignOption({ grossFloorArea: 200, buildingType: 'office' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'office' })
    const report = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'office' })

    const rule = report.results.find((r) => r.ruleId === 'zbc-leg-factories-safety')
    expect(rule).toBeDefined()
    expect(rule!.status).toBe('warn')
  })

  it('legislation evaluator is safe on null input', () => {
    const input: ComplianceInput = { plan: null, design: null, analysis: null, buildingType: 'house' }
    const results = evaluateLegislationRules(input, 'zbc', 'Zimbabwe statutes')
    expect(results.length).toBeGreaterThan(0)
    for (const rule of results) {
      expect(rule.status).toMatch(/pass|warn|fail/)
      expect(rule.note.toLowerCase()).toContain('approximate')
    }
  })

  it('zimbabwe report still satisfies the exact rule ID contract', () => {
    const plan = makeLargePlan()
    const design = createSampleDesignOption({ grossFloorArea: 150, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'house' })

    expect(report.totalRules).toBe(report.results.length)
    for (const id of ['zbc-min-room-area', 'zbc-min-room-width', 'zbc-ceiling-height', 'zbc-means-of-escape', 'zbc-sanitary-provision']) {
      expect(report.results.map((r) => r.ruleId)).toContain(id)
    }
  })
})

describe('SANS 10400 (A / K / W)', () => {
  it('adds SANS 10400 rules to the south-africa report', () => {
    const plan = createSamplePlanModel()
    const design = createSampleDesignOption({ grossFloorArea: 200, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('south-africa', { plan, design, analysis, buildingType: 'house' })

    const ids = report.results.map((r) => r.ruleId)
    expect(ids).toContain('sans-s10400-a-occupancy')
    expect(ids).toContain('sans-s10400-a-sprinkler')
    expect(ids).toContain('sans-s10400-k-walls')
    expect(ids).toContain('sans-s10400-k-dpc')
    expect(ids).toContain('sans-s10400-w-fire-install')
  })

  it('occupancy classification maps building types to SANS 10400-A classes', () => {
    expect(classifyOccupancy('house')).toBe('A1')
    expect(classifyOccupancy('apartment')).toBe('A1')
    expect(classifyOccupancy('school')).toBe('A2')
    expect(classifyOccupancy('hotel')).toBe('A3')
    expect(classifyOccupancy('clinic')).toBe('E1')
    expect(classifyOccupancy('office')).toBe('F1')
    expect(classifyOccupancy('shop')).toBe('F2')
    expect(classifyOccupancy('restaurant')).toBe('F3')
    expect(classifyOccupancy('warehouse')).toBe('G1')
    expect(classifyOccupancy('factory')).toBe('H1')
    expect(classifyOccupancy('church')).toBe('J1')
    expect(classifyOccupancy('unknown-type')).toBe('F1')
  })

  it('dwelling occupancy marks sprinkler trigger as pass (no automatic suppression)', () => {
    const plan = createSamplePlanModel()
    const design = createSampleDesignOption({ grossFloorArea: 200, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('south-africa', { plan, design, analysis, buildingType: 'house' })

    const rule = report.results.find((r) => r.ruleId === 'sans-s10400-a-sprinkler')
    expect(rule).toBeDefined()
    expect(rule!.status).toBe('pass')
  })

  it('large non-residential floor area triggers sprinkler warning', () => {
    const plan = createSamplePlanModel()
    const design = createSampleDesignOption({ grossFloorArea: 1500, buildingType: 'office' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'office' })
    const report = runCompliance('south-africa', { plan, design, analysis, buildingType: 'office' })

    const rule = report.results.find((r) => r.ruleId === 'sans-s10400-a-sprinkler')
    expect(rule).toBeDefined()
    expect(rule!.status).toBe('warn')
  })

  it('south-africa report still satisfies the exact rule ID contract', () => {
    const plan = makeLargePlan()
    const design = createSampleDesignOption({ grossFloorArea: 150, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('south-africa', { plan, design, analysis, buildingType: 'house' })

    expect(report.totalRules).toBe(report.results.length)
    for (const id of ['sans-min-room-area', 'sans-min-room-width']) {
      expect(report.results.map((r) => r.ruleId)).toContain(id)
    }
  })
})

describe('SANS 10160 (parts 2-5)', () => {
  it('adds SANS 10160 rules to both jurisdictions', () => {
    const plan = createSamplePlanModel()
    const design = createSampleDesignOption({ grossFloorArea: 200, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })

    const zbc = runCompliance('zimbabwe', { plan, design, analysis, buildingType: 'house' })
    expect(zbc.results.map((r) => r.ruleId)).toContain('zbc-s10160-2-live')
    expect(zbc.results.map((r) => r.ruleId)).toContain('zbc-s10160-3-wind')
    expect(zbc.results.map((r) => r.ruleId)).toContain('zbc-s10160-4-seismic')

    const sans = runCompliance('south-africa', { plan, design, analysis, buildingType: 'house' })
    expect(sans.results.map((r) => r.ruleId)).toContain('sans-s10160-2-live')
    expect(sans.results.map((r) => r.ruleId)).toContain('sans-s10160-3-wind')
    expect(sans.results.map((r) => r.ruleId)).toContain('sans-s10160-4-seismic')
  })

  it('imposedLoadKpa returns SANS 10160-2 values per occupancy', () => {
    expect(imposedLoadKpa('residential')).toBe(1.5)
    expect(imposedLoadKpa('office')).toBe(2.5)
    expect(imposedLoadKpa('retail')).toBe(4.0)
    expect(imposedLoadKpa('industrial')).toBe(6.0)
    expect(imposedLoadKpa('storage')).toBe(6.0)
    expect(imposedLoadKpa('educational')).toBe(3.0)
  })

  it('zimbabweBasicWindSpeed returns 28 m/s', () => {
    expect(zimbabweBasicWindSpeed('house')).toBe(28)
  })

  it('live load rule passes when the computed live load meets the code minimum', () => {
    const plan = createSamplePlanModel()
    const design = createSampleDesignOption({ grossFloorArea: 150, buildingType: 'house' })
    const analysis = assembleAnalysis({ plan, design, boq: null, buildingType: 'house' })
    const report = runCompliance('south-africa', { plan, design, analysis, buildingType: 'house' })

    const rule = report.results.find((r) => r.ruleId === 'sans-s10160-2-live')
    expect(rule).toBeDefined()
    expect(rule!.status).toMatch(/pass|warn/)
  })
})
