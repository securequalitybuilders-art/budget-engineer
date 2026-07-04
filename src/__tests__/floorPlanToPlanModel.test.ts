import { describe, it, expect } from 'vitest'
import { generateLayoutParameters, generateFloorPlans } from '@/engine/tier3/layoutEngine'
import { floorPlanToPlanModel } from '@/adapters/floorPlanToPlanModel'
import { parseBrief } from '@/engine/parseBrief'
import { generateDesignConcept } from '@/engine/tier2/conceptEngine'
import type { DesignOption } from '@/domain/boq'

function makeDesignOption(name: string): DesignOption {
  return { id: 'test-do-1', name, grossFloorArea: 120, floors: 1, buildingType: 'house', elements: [] }
}

function getPlans() {
  const brief = parseBrief('Build a 3-bedroom house in Harare on a 20x25 site', { buildingType: 'house' })
  const concept = generateDesignConcept(brief)
  const params = generateLayoutParameters(concept, brief)
  return generateFloorPlans(params, brief)
}

describe('floorPlanToPlanModel', () => {
  const designOption = makeDesignOption('Test House')

  it('converts a FloorPlan to a valid PlanModel', () => {
    const plans = getPlans()
    const plan = floorPlanToPlanModel(plans[0], designOption)
    expect(plan).toBeDefined()
    expect(plan.id).toBeTruthy()
    expect(plan.designOptionId).toBe('test-do-1')
    expect(plan.width).toBeGreaterThan(0)
    expect(plan.height).toBeGreaterThan(0)
    expect(plan.wallThickness).toBe(0.2)
    expect(plan.scaleLabel).toBe('1:100 @ A3')
  })

  it('produces rooms with correct structure', () => {
    const plans = getPlans()
    const plan = floorPlanToPlanModel(plans[0], designOption)
    for (const room of plan.rooms) {
      expect(room.id).toBeTruthy()
      expect(room.name).toBeTruthy()
      expect(typeof room.x).toBe('number')
      expect(typeof room.y).toBe('number')
      expect(room.width).toBeGreaterThan(0)
      expect(room.height).toBeGreaterThan(0)
      expect(room.color).toBeTruthy()
    }
  })

  it('produces walls (4 external + internal)', () => {
    const plans = getPlans()
    const plan = floorPlanToPlanModel(plans[0], designOption)
    const extWalls = plan.walls.filter(w => w.type === 'external')
    expect(extWalls.length).toBe(4)
    expect(plan.walls.length).toBeGreaterThan(4)
  })

  it('produces openings (doors and windows)', () => {
    const plans = getPlans()
    const plan = floorPlanToPlanModel(plans[0], designOption)
    expect(plan.openings.length).toBeGreaterThan(0)
    const doors = plan.openings.filter(o => o.kind === 'door')
    const windows = plan.openings.filter(o => o.kind === 'window')
    expect(doors.length).toBeGreaterThan(0)
    expect(windows.length).toBeGreaterThan(0)
  })

  it('all room coordinates are numbers with sane values', () => {
    const plans = getPlans()
    const plan = floorPlanToPlanModel(plans[0], designOption)
    for (const room of plan.rooms) {
      expect(room.x).toBeGreaterThanOrEqual(0)
      expect(room.y).toBeGreaterThanOrEqual(0)
      expect(room.x + room.width).toBeLessThanOrEqual(plan.width + 0.1)
      expect(room.y + room.height).toBeLessThanOrEqual(plan.height + 0.1)
    }
  })

  it('PlanModel rooms match FloorPlan rooms count', () => {
    const plans = getPlans()
    for (const fp of plans) {
      const plan = floorPlanToPlanModel(fp, designOption)
      expect(plan.rooms.length).toBe(fp.rooms.length)
    }
  })

  it('area helpers would not throw', () => {
    const plans = getPlans()
    const plan = floorPlanToPlanModel(plans[0], designOption)
    const totalArea = plan.rooms.reduce((s, r) => s + r.width * r.height, 0)
    expect(totalArea).toBeGreaterThan(0)
  })

  it('throws on NaN-width room', () => {
    const plans = getPlans()
    const badPlan = { ...plans[0], rooms: [{ name: 'Bad Room', x: 0, y: 0, width: NaN, height: 3 }] }
    expect(() => floorPlanToPlanModel(badPlan, designOption)).toThrow(/non-finite width/)
  })

  it('throws on NaN-height room', () => {
    const plans = getPlans()
    const badPlan = { ...plans[0], rooms: [{ name: 'Bad Room', x: 0, y: 0, width: 3, height: NaN }] }
    expect(() => floorPlanToPlanModel(badPlan, designOption)).toThrow(/non-finite height/)
  })

  it('throws on zero-width room', () => {
    const plans = getPlans()
    const badPlan = { ...plans[0], rooms: [{ name: 'Bad Room', x: 0, y: 0, width: 0, height: 3 }] }
    expect(() => floorPlanToPlanModel(badPlan, designOption)).toThrow(/non-finite width/)
  })
})
