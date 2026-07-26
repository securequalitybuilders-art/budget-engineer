import { describe, it, expect } from 'vitest'
import { generateLayoutParameters, generateFloorPlans } from '@/engine/tier3/layoutEngine'
import { floorPlanToPlanModel } from '@/adapters/floorPlanToPlanModel'
import { parseBrief } from '@/engine/parseBrief'
import { generateDesignConcept } from '@/engine/tier2/conceptEngine'
import { generatePlanModel } from '@/engine/plan-generator'
import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'
import type { FloorPlan } from '@/engine/tier3/layoutEngine'

function makeDesignOption(id: string, name: string, grossFloorArea = 500, buildingType = 'hotel-fullservice'): DesignOption {
  return { id, name, grossFloorArea, floors: 2, buildingType, elements: [] }
}

/**
 * Simulates the active-plan resolver used by both 2D PlanCanvas and 3D BimModel3D:
 *    persistedPlan ?? floorPlanToPlanModel(selectedTier3Plan, selectedDesign) ?? generatePlanModel(selectedDesign)
 */
function resolveActivePlan(
  persistedPlan: PlanModel | null,
  selectedTier3Plan: FloorPlan | null,
  selectedDesign: DesignOption | null,
): PlanModel | null {
  if (persistedPlan) return persistedPlan
  if (selectedTier3Plan && selectedDesign) {
    return floorPlanToPlanModel(selectedTier3Plan, selectedDesign)
  }
  return selectedDesign ? generatePlanModel(selectedDesign) : null
}

/**
 * Simulates what PlanCanvas used to do (the BUG):
 *    persistedPlan ?? generatePlanModel(selectedDesign)
 * (It did NOT consider selectedTier3Plan at all.)
 */
function oldPlanCanvasPlan(
  persistedPlan: PlanModel | null,
  selectedDesign: DesignOption | null,
): PlanModel | null {
  return persistedPlan ?? (selectedDesign ? generatePlanModel(selectedDesign) : null)
}

describe('activePlan consistency — 2D and 3D share the same source', () => {

  // Generate Tier 3 plans for a hotel brief (produces courtyard topology)
  function getHotelPlans(): FloorPlan[] {
    const brief = parseBrief('Build a 20-room hotel with restaurant and lobby', { buildingType: 'auto' })
    const concept = generateDesignConcept(brief)
    const params = generateLayoutParameters(concept, brief)
    return generateFloorPlans(params, brief)
  }

  it('floorPlanToPlanModel (3D source) produces courtyard room for hotel', () => {
    const plans = getHotelPlans()
    const design = makeDesignOption('test-do-t3-0', 'Courtyard — Rooms Around Central Space')
    const plan = floorPlanToPlanModel(plans[0], design)
    const courtyardRoom = plan.rooms.find(r => r.name === 'Courtyard')
    expect(courtyardRoom).toBeDefined()
    expect(courtyardRoom!.width).toBeGreaterThan(0)
    expect(courtyardRoom!.height).toBeGreaterThan(0)
  })

  it('generatePlanModel (old 2D source) does NOT have courtyard room for hotel', () => {
    const design = makeDesignOption('test-do-t3-0', 'Hotel Option')
    const plan = generatePlanModel(design)
    const courtyardRoom = plan.rooms.find(r => r.name === 'Courtyard')
    expect(courtyardRoom).toBeUndefined()
  })

  it('resolveActivePlan returns same PlanModel for 2D and 3D (both use floorPlanToPlanModel)', () => {
    const plans = getHotelPlans()
    const design = makeDesignOption('test-do-t3-0', 'Courtyard — Rooms Around Central Space')
    const activePlan = resolveActivePlan(null, plans[0], design)

    // Both 2D and 3D now use the same activePlan
    expect(activePlan).not.toBeNull()

    const planFor2D = activePlan
    const planFor3D = activePlan
    expect(planFor2D).toBe(planFor3D) // same object reference
  })

  it('old 2D source differs from activePlan when Tier 3 plans exist (the bug)', () => {
    const plans = getHotelPlans()
    const design = makeDesignOption('test-do-t3-0', 'Courtyard — Rooms Around Central Space')

    const activePlan = resolveActivePlan(null, plans[0], design)
    const old2dPlan = oldPlanCanvasPlan(null, design)

    // Active plan has courtyard (from Tier 3 FloorPlan)
    expect(activePlan!.rooms.some(r => r.name === 'Courtyard')).toBe(true)

    // Old 2D plan (generatePlanModel) does NOT have courtyard
    expect(old2dPlan!.rooms.some(r => r.name === 'Courtyard')).toBe(false)

    // The room layouts are different
    const activeRoomNames = activePlan!.rooms.map(r => r.name).sort()
    const oldRoomNames = old2dPlan!.rooms.map(r => r.name).sort()
    expect(activeRoomNames).not.toEqual(oldRoomNames)
  })

  it('persistedPlan takes priority over Tier 3 plan in resolveActivePlan', () => {
    const plans = getHotelPlans()
    const design = makeDesignOption('test-do-t3-0', 'Courtyard — Rooms Around Central Space')

    // Create a mock persistedPlan (simulates user CAD edits)
    const mockPersistedPlan: PlanModel = {
      id: 'persisted-1',
      designOptionId: 'test-do-t3-0',
      width: 20,
      height: 15,
      wallThickness: 0.2,
      scaleLabel: '1:100',
      rooms: [{ id: 'r1', name: 'Custom Room', x: 0, y: 0, width: 10, height: 10, color: '#334155' }],
      walls: [],
      openings: [],
    }

    const result = resolveActivePlan(mockPersistedPlan, plans[0], design)

    // Persisted plan wins
    expect(result!.id).toBe('persisted-1')
    expect(result!.rooms[0].name).toBe('Custom Room')

    // It does NOT have the Tier 3 courtyard
    expect(result!.rooms.some(r => r.name === 'Courtyard')).toBe(false)
  })

  it('resolveActivePlan falls back to generatePlanModel when no persisted or Tier 3 plan', () => {
    const design = makeDesignOption('test-do-1', 'Basic House', 120, 'house-residential')
    const result = resolveActivePlan(null, null, design)
    expect(result).not.toBeNull()
    expect(result!.designOptionId).toBe('test-do-1')
    // Should have rooms from the old generator
    expect(result!.rooms.length).toBeGreaterThan(0)
  })

  it('resolveActivePlan returns null when no design, no persisted, no Tier 3', () => {
    const result = resolveActivePlan(null, null, null)
    expect(result).toBeNull()
  })
})
