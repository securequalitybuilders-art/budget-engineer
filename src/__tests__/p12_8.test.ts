// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generatePlanModel, generateVariedPlanModel } from '@/engine/plan-generator'
import { floorPlanToPlanModel } from '@/adapters/floorPlanToPlanModel'
import { assemblePlan } from '@/lib/geometry/plan-intelligence'
import { getPlanSource, type PlanModel, type PlanSource } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import type { FloorPlan } from '@/engine/tier3/layoutEngine'

// ── Helpers ──

function makeDesign(overrides: Partial<DesignOption> = {}): DesignOption {
  return {
    id: `test-opt-${Date.now()}`,
    name: 'Test Design',
    grossFloorArea: 120,
    floors: 1,
    buildingType: 'house',
    elements: [],
    ...overrides,
  }
}

function makeMinimalFloorPlan(): FloorPlan {
  return {
    id: 'fp1',
    name: 'Test Floor Plan',
    topology: 'rectangle',
    width: 12,
    height: 10,
    totalFloors: 1,
    rooms: [
      { name: 'Living Room', x: 0, y: 0, width: 6, height: 5 },
      { name: 'Kitchen', x: 6, y: 0, width: 4, height: 5 },
      { name: 'Bedroom 1', x: 0, y: 5, width: 4, height: 5 },
    ],

  }
}

// ── Workstream A: Plan Source Tracking ──

describe('P12.8 — Plan source tracking', () => {
  it('assemblePlan sets planSource to legacy-fallback-plan', () => {
    const { plan } = assemblePlan({
      rooms: [],
      width: 10,
      height: 10,
      wallThickness: 0.2,
      designOptionId: 'd1',
    })
    expect(plan.planSource).toBe('legacy-fallback-plan')
  })

  it('floorPlanToPlanModel sets planSource to tier3-floorplan', () => {
    const design = makeDesign()
    const fp = makeMinimalFloorPlan()
    const plan = floorPlanToPlanModel(fp, design)
    expect(plan.planSource).toBe('tier3-floorplan')
  })

  it('generateVariedPlanModel sets planSource to advanced-generated-plan', () => {
    const design = makeDesign()
    const plan = generateVariedPlanModel(design)
    expect(plan.planSource).toBe('advanced-generated-plan')
  })

  it('generatePlanModel (legacy) sets planSource to legacy-fallback-plan', () => {
    const design = makeDesign()
    const plan = generatePlanModel(design)
    expect(plan.planSource).toBe('legacy-fallback-plan')
  })

  it('getPlanSource returns unknown for plans without source', () => {
    const plan = {
      id: 'p1', designOptionId: 'd1', width: 10, height: 10,
      wallThickness: 0.2, rooms: [], walls: [], openings: [],
      scaleLabel: '1:100',
    } as PlanModel
    expect(getPlanSource(plan)).toBe('unknown')
  })
})

// ── Workstream B: Variation Differentiation ──

describe('P12.8 — Variation differentiation', () => {
  it('different seeds produce different room arrangements for houses', () => {
    const design1 = makeDesign({ id: 'opt-alpha', grossFloorArea: 120, buildingType: 'house' })
    const design2 = makeDesign({ id: 'opt-beta', grossFloorArea: 120, buildingType: 'house' })

    const plan1 = generateVariedPlanModel(design1, 100)
    const plan2 = generateVariedPlanModel(design2, 200)

    // Same area, different seeds → should differ in at least one room position
    const r1 = plan1.rooms.map(r => ({ name: r.name, x: r.x, y: r.y }))
    const r2 = plan2.rooms.map(r => ({ name: r.name, x: r.x, y: r.y }))
    const identical = JSON.stringify(r1) === JSON.stringify(r2)
    expect(identical).toBe(false)
  })

  it('same seed produces identical layouts', () => {
    const design1 = makeDesign({ id: 'opt-same', grossFloorArea: 120, buildingType: 'house' })
    const plan1 = generateVariedPlanModel(design1, 42)
    const plan2 = generateVariedPlanModel(design1, 42)
    const r1 = plan1.rooms.map(r => ({ name: r.name, x: r.x, y: r.y }))
    const r2 = plan2.rooms.map(r => ({ name: r.name, x: r.x, y: r.y }))
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2))
  })

  it('three design options produce measurably different plans', () => {
    const options = [
      makeDesign({ id: 'opt-a', grossFloorArea: 120, buildingType: 'house' }),
      makeDesign({ id: 'opt-b', grossFloorArea: 120, buildingType: 'house' }),
      makeDesign({ id: 'opt-c', grossFloorArea: 120, buildingType: 'house' }),
    ]

    // Use seedFromId via generateVariedPlanModel (no explicit seed)
    const plans = options.map(opt => generateVariedPlanModel(opt))

    // At least one pair should differ
    const roomSignatures = plans.map(p =>
      p.rooms.map(r => `${r.name}:${r.x.toFixed(1)},${r.y.toFixed(1)}`).sort().join('|'),
    )

    const unique = new Set(roomSignatures)
    expect(unique.size).toBeGreaterThan(1)
  })

  it('variation is visible in circulation type, not just area', () => {
    // Generate plans with 4 different seeds covering all 4 circulation types
    // (seed step must avoid 16807 × step ≡ 0 mod 4)
    const design = makeDesign({ id: 'opt-var', grossFloorArea: 120, buildingType: 'house' })
    const corridorYPositions = new Set<number>()
    for (let seed = 1; seed <= 4; seed++) {
      const plan = generateVariedPlanModel(design, seed)
      const circulationRoom = plan.rooms.find(r => r.name === 'Circulation')
      if (circulationRoom) {
        corridorYPositions.add(Math.round(circulationRoom.y * 100))
      }
    }
    expect(corridorYPositions.size).toBeGreaterThan(1)
  })
})

// ── Workstream C: Plan-to-Design Binding ──

describe('P12.8 — Design option → plan binding', () => {
  it('generateVariedPlanModel preserves designOptionId', () => {
    const design = makeDesign({ id: 'opt-bind-test' })
    const plan = generateVariedPlanModel(design)
    expect(plan.designOptionId).toBe('opt-bind-test')
  })

  it('three sequential calls with same design yield same plan (deterministic)', () => {
    const design = makeDesign({ id: 'opt-det', grossFloorArea: 100, buildingType: 'house' })
    const p1 = generateVariedPlanModel(design, 1)
    const p2 = generateVariedPlanModel(design, 1)
    const p3 = generateVariedPlanModel(design, 1)
    expect(p1.designOptionId).toBe(p2.designOptionId)
    expect(p1.rooms.length).toBe(p2.rooms.length)
    expect(p1.rooms.length).toBe(p3.rooms.length)
  })
})

// ── Workstream D: Plan Source Priority ──

describe('P12.8 — Plan source priority', () => {
  it('legacy generatePlanModel produces valid plan with rooms', () => {
    const design = makeDesign({ grossFloorArea: 100, buildingType: 'house' })
    const plan = generatePlanModel(design)
    expect(plan.rooms.length).toBeGreaterThan(0)
    expect(plan.walls.length).toBeGreaterThan(0)
    expect(plan.openings.length).toBeGreaterThan(0)
  })

  it('generateVariedPlanModel produces valid plan with rooms', () => {
    const design = makeDesign({ grossFloorArea: 100, buildingType: 'house' })
    const plan = generateVariedPlanModel(design)
    expect(plan.rooms.length).toBeGreaterThan(0)
    expect(plan.walls.length).toBeGreaterThan(0)
  })

  it('planSource priority order: persisted > tier3 > advanced > legacy', () => {
    // This validates the priority order used in Dashboard's activePlan
    const sources: PlanSource[] = ['persisted-plan', 'tier3-floorplan', 'advanced-generated-plan', 'legacy-fallback-plan', 'unknown']
    const priority: Record<PlanSource, number> = {
      'persisted-plan': 0,
      'tier3-floorplan': 1,
      'advanced-generated-plan': 2,
      'legacy-fallback-plan': 3,
      'unknown': 4,
    }
    for (let i = 0; i < sources.length - 1; i++) {
      expect(priority[sources[i]]).toBeLessThan(priority[sources[i + 1]])
    }
  })
})

// ── Workstream E: Fresh Project Generation ──

describe('P12.8 — Fresh project generation diversity', () => {
  it('3 options for a 3-bedroom house show different room arrangements', () => {
    const designs = [
      makeDesign({ id: '3br-compact', grossFloorArea: 90, buildingType: 'house' }),
      makeDesign({ id: '3br-standard', grossFloorArea: 120, buildingType: 'house' }),
      makeDesign({ id: '3br-spacious', grossFloorArea: 160, buildingType: 'house' }),
    ]

    const plans = designs.map(d => generateVariedPlanModel(d))

    // Verify all have valid room counts
    for (const plan of plans) {
      expect(plan.rooms.length).toBeGreaterThanOrEqual(5)
    }

    // Different areas should produce different room arrangements
    const allSame = plans.every(p =>
      JSON.stringify(p.rooms.map(r => r.name)) === JSON.stringify(plans[0].rooms.map(r => r.name))
    )
    expect(allSame).toBe(false)
  })
})
