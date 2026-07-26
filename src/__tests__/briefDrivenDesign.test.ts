import { describe, it, expect } from 'vitest'
import { generatePlanModel } from '@/engine/plan-generator'
import { getRoomProgram, ROOM_PROGRAMS } from '@/engine/roomPrograms'
import { BUILDING_TYPES, isResidential } from '@/engine/buildingTypes'
import { generateDesignOptionsFromBriefText } from '@/adapters/aiDesignAdapter'
import { parseWithEngine } from '@/lib/ai/ai-provider'
import type { DesignOption } from '@/domain/boq'

function makeDesign(overrides: Partial<DesignOption> = {}): DesignOption {
  return {
    id: 'test-des-1',
    name: 'Test Design',
    grossFloorArea: 120,
    floors: 1,
    buildingType: 'house',
    elements: [],
    ...overrides,
  }
}

describe('briefDrivenDesign — room programs per building type', () => {
  it('clinic produces DIFFERENT rooms than house', () => {
    const housePlan = generatePlanModel(makeDesign({ buildingType: 'house' }))
    const clinicPlan = generatePlanModel(makeDesign({ buildingType: 'clinic' }))

    const houseNames = housePlan.rooms.map((r) => r.name)
    const clinicNames = clinicPlan.rooms.map((r) => r.name)

    // House has residential rooms
    expect(houseNames.some((n) => n.toLowerCase().includes('bedroom'))).toBe(true)
    expect(houseNames.some((n) => n.toLowerCase().includes('lounge'))).toBe(true)

    // Clinic has clinical rooms, NOT bedrooms
    expect(clinicNames.some((n) => n.toLowerCase().includes('consultation'))).toBe(true)
    expect(clinicNames.some((n) => n.toLowerCase().includes('reception'))).toBe(true)
    expect(clinicNames.some((n) => n.toLowerCase().includes('bedroom'))).toBe(false)
    expect(clinicNames.some((n) => n.toLowerCase().includes('lounge'))).toBe(false)
  })

  it('each supported building type yields expected key rooms from its program', () => {
    const programKeys = Object.keys(ROOM_PROGRAMS) as Array<keyof typeof ROOM_PROGRAMS>
    for (const buildingType of programKeys) {
      const program = ROOM_PROGRAMS[buildingType]
      const plan = generatePlanModel(makeDesign({ buildingType, grossFloorArea: 120 }))
      const planNames = plan.rooms.map((r) => r.name)
      // At least one room from the program should appear in the plan
      // (use substring match because apartment layout prepends "Unit N " to room names)
      const match = program.some((roomDef) => planNames.some(pn => pn.includes(roomDef.name)))
      expect(match, `${buildingType}: none of ${program.map(r => r.name)} found in ${planNames}`).toBe(true)
    }
  })

  it('design options keep the SAME building type but vary rooms measurably', () => {
    const compactPlan = generatePlanModel(makeDesign({ buildingType: 'clinic', grossFloorArea: 80, name: 'Compact Clinic' }))
    const spaciousPlan = generatePlanModel(makeDesign({ buildingType: 'clinic', grossFloorArea: 200, name: 'Spacious Clinic' }))

    // Both are clinic (no bedrooms, has consultation rooms)
    const compactNames = compactPlan.rooms.map((r) => r.name)
    expect(compactNames.some((n) => n.toLowerCase().includes('consultation'))).toBe(true)
    expect(compactNames.some((n) => n.toLowerCase().includes('bedroom'))).toBe(false)

    const spaciousNames = spaciousPlan.rooms.map((r) => r.name)
    expect(spaciousNames.some((n) => n.toLowerCase().includes('consultation'))).toBe(true)
    expect(spaciousNames.some((n) => n.toLowerCase().includes('bedroom'))).toBe(false)

    // Spacious has larger area, so rooms should be proportionally larger
    // (footprint will be bigger, so individual room dimensions differ)
    expect(spaciousPlan.width).toBeGreaterThan(compactPlan.width)
    expect(spaciousPlan.height).toBeGreaterThan(compactPlan.height)
  })

  it('unknown building type falls back to house program', () => {
    const plan = generatePlanModel(makeDesign({ buildingType: 'unknown-type' }))
    const names = plan.rooms.map((r) => r.name)
    // House-like rooms
    expect(names.some((n) => n.toLowerCase().includes('bedroom'))).toBe(true)
    expect(names.some((n) => n.toLowerCase().includes('lounge'))).toBe(true)
  })

  it('empty building type falls back to house program (no crash)', () => {
    const plan = generatePlanModel(makeDesign({ buildingType: '' }))
    expect(plan.rooms.length).toBeGreaterThan(0)
    const names = plan.rooms.map((r) => r.name)
    expect(names.some((n) => n.toLowerCase().includes('bedroom'))).toBe(true)
  })

  it('room names from program appear in generated PlanModel (2D labels/3D use them)', () => {
    const program = getRoomProgram('clinic')
    const plan = generatePlanModel(makeDesign({ buildingType: 'clinic' }))

    // Each room name from the program should appear in the plan
    for (const roomDef of program) {
      const found = plan.rooms.some((r) => r.name === roomDef.name)
      expect(found).toBe(true)
    }
  })

  it('getRoomProgram returns house program for null/undefined', () => {
    const program1 = getRoomProgram(null)
    const program2 = getRoomProgram(undefined)
    expect(program1).toBe(ROOM_PROGRAMS.house)
    expect(program2).toBe(ROOM_PROGRAMS.house)
  })

  it('all room program ratio sums are near 1.0', () => {
    for (const [, program] of Object.entries(ROOM_PROGRAMS)) {
      const totalRatio = program.reduce((sum, r) => sum + r.ratio, 0)
      expect(totalRatio).toBeCloseTo(1.0, 1)
    }
  })

  it('every BUILDING_TYPE has an entry in ROOM_PROGRAMS', () => {
    for (const t of BUILDING_TYPES) {
      expect(ROOM_PROGRAMS[t], `ROOM_PROGRAMS missing key '${t}'`).toBeDefined()
    }
  })

  it('residential types are correctly identified by isResidential', () => {
    expect(isResidential('house')).toBe(true)
    expect(isResidential('apartment')).toBe(true)
    expect(isResidential('townhouse')).toBe(true)
    expect(isResidential('clinic')).toBe(false)
    expect(isResidential('school')).toBe(false)
    expect(isResidential('commercial')).toBe(false)
    expect(isResidential('office')).toBe(false)
    expect(isResidential('other')).toBe(false)
    expect(isResidential('')).toBe(false)
    expect(isResidential('residential')).toBe(false)
  })

  it('programFromArea routes non-residential types to roomPrograms (not fallback)', () => {
    const clinicPlan = generatePlanModel(makeDesign({ buildingType: 'clinic', grossFloorArea: 150 }))
    const clinicNames = clinicPlan.rooms.map((r) => r.name)
    // Has consultation rooms (clinic program), not bedrooms (would be house fallback)
    expect(clinicNames.some((n) => n.includes('Consultation'))).toBe(true)
    expect(clinicNames.some((n) => n.toLowerCase().includes('bedroom'))).toBe(false)
  })

  // SPRINT 39C FIX — validates that buildingType from the dropdown reaches generatePlanModel.
  // The fix uses useRef in AiBriefPanel to avoid stale closures in async handleGenerate.
  // This test validates the pure-function chain: the ref holds 'clinic',
  // generateDesignOptionsFromBriefText receives 'clinic', and generatePlanModel
  // produces clinic rooms. The test fails if buildingType is lost between stages.
  it('SPRINT 39C: clinic buildingType flows from generateDesignOptions → DesignOption.buildingType → generatePlanModel → clinic rooms', () => {
    const optionsResult = generateDesignOptionsFromBriefText('clinic 200 m2', 'zimbabwe', 'clinic')
    expect(optionsResult.designOptions.length).toBeGreaterThan(0)
    for (const opt of optionsResult.designOptions) {
      expect(opt.buildingType).toBe('clinic')
    }
    const option = optionsResult.designOptions[0]
    const plan = generatePlanModel(option)
    const planNames = plan.rooms.map((r) => r.name)
    expect(planNames.some((n) => n.includes('Consultation'))).toBe(true)
    expect(planNames.some((n) => n.toLowerCase().includes('bedroom'))).toBe(false)
  })

  // INTEGRATION TEST — mimics the real AiBriefPanel generate flow:
  // parseWithEngine → generateDesignOptionsFromBriefText(buildingTypeOverride='clinic')
  // → generatePlanModel → check rooms
  it('REAL FLOW: generateDesignOptionsFromBriefText with clinic override + generatePlanModel yields clinic rooms', async () => {
    const briefText = 'clinic 200 m2'
    await parseWithEngine(briefText, 'local-rules')
    const optionsResult = generateDesignOptionsFromBriefText(briefText, 'zimbabwe', 'clinic')
    expect(optionsResult.designOptions.length).toBeGreaterThan(0)
    for (const opt of optionsResult.designOptions) {
      expect(opt.buildingType).toBe('clinic')
    }
    const firstOption = optionsResult.designOptions[0]
    const plan = generatePlanModel(firstOption)
    const planNames = plan.rooms.map((r) => r.name)
    expect(planNames.some((n) => n.includes('Consultation'))).toBe(true)
    expect(planNames.some((n) => n.toLowerCase().includes('bedroom'))).toBe(false)
  })
})
