import { describe, it, expect } from 'vitest'
import { planTo3d, DEFAULT_STOREY_HEIGHT, FALLBACK_WALL_THICKNESS, SLAB_THICKNESS, DOOR_DEFAULT_HEIGHT, DOOR_DEFAULT_SILL, WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_SILL, ROOF_PITCH_HEIGHT, ROOF_OVERHANG, resolveOpeningPosition } from '@/adapters/planTo3d'
import { generatePlanModel } from '@/engine/plan-generator'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'

function makeDesign(overrides: Partial<DesignOption> = {}): DesignOption {
  return {
    id: 'test-des-1',
    name: 'Test House',
    grossFloorArea: 120,
    floors: 1,
    elements: [],
    ...overrides,
  }
}

/**
 * Pure selector matching the activePlan logic in Dashboard.tsx:
 * prefer persistedPlan, else generate from design.
 */
function pickActivePlan(
  persistedPlan: PlanModel | null,
  design: DesignOption | null,
): PlanModel | null {
  return persistedPlan ?? (design ? generatePlanModel(design) : null)
}

function makePlan(overrides: Partial<PlanModel> = {}): PlanModel {
  return {
    id: 'test-plan-1',
    designOptionId: 'test-des-1',
    width: 12,
    height: 8,
    wallThickness: 0.25,
    rooms: [
      { id: 'r1', name: 'Lounge', x: 0, y: 0, width: 6, height: 8 },
      { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 6, height: 8 },
    ],
    walls: [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.25, type: 'external' },
      { id: 'w2', start: { x: 12, y: 0 }, end: { x: 12, y: 8 }, thickness: 0.25, type: 'external' },
      { id: 'w3', start: { x: 12, y: 8 }, end: { x: 0, y: 8 }, thickness: 0.25, type: 'external' },
      { id: 'w4', start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, thickness: 0.25, type: 'external' },
      { id: 'w5', start: { x: 6, y: 0 }, end: { x: 6, y: 8 }, thickness: 0.2, type: 'internal' },
    ],
    openings: [],
    scaleLabel: '1:100',
    ...overrides,
  }
}

describe('planTo3d — pure adapter', () => {
  it('perimeter walls generated for a simple rectangular plan', () => {
    const plan = makePlan()
    const result = planTo3d(plan, 1)

    // 4 external + 1 internal = 5 walls
    expect(result.walls.length).toBe(5)

    // Wall height == storey height constant
    for (const w of result.walls) {
      expect(w.height).toBe(DEFAULT_STOREY_HEIGHT)
    }

    // Wall thickness preserved from plan
    const externalWalls = result.walls.filter((w) => w.type === 'external')
    for (const w of externalWalls) {
      expect(w.thickness).toBe(0.25)
    }
    const internalWall = result.walls.find((w) => w.type === 'internal')
    expect(internalWall?.thickness).toBe(0.2)
  })

  it('internal partition wall generated between two adjacent rooms', () => {
    const plan = makePlan()
    const result = planTo3d(plan, 1)

    const internalWalls = result.walls.filter((w) => w.type === 'internal')
    expect(internalWalls.length).toBe(1)
    expect(internalWalls[0].wallId).toBe('w5')
    expect(internalWalls[0].startX).toBe(6)
    expect(internalWalls[0].startZ).toBe(0)
    expect(internalWalls[0].endX).toBe(6)
    expect(internalWalls[0].endZ).toBe(8)
  })

  it('multi-storey: numberOfStoreys=2 produces 2 slabs and walls at 2 stacked heights', () => {
    const plan = makePlan()
    const result = planTo3d(plan, 2)

    // 5 walls * 2 floors = 10 walls
    expect(result.walls.length).toBe(10)
    // 2 slabs
    expect(result.slabs.length).toBe(2)

    // Slabs at different y offsets
    expect(result.slabs[0].yOffset).toBe(0)
    expect(result.slabs[1].yOffset).toBe(DEFAULT_STOREY_HEIGHT)

    // Walls at different storey indices
    const storey0Walls = result.walls.filter((w) => w.storeyIndex === 0)
    const storey1Walls = result.walls.filter((w) => w.storeyIndex === 1)
    expect(storey0Walls.length).toBe(5)
    expect(storey1Walls.length).toBe(5)
  })

  it('overall bounds match PlanModel width/height', () => {
    const plan = makePlan({ width: 15, height: 10 })
    const result = planTo3d(plan, 1)

    expect(result.bounds.width).toBe(15)
    expect(result.bounds.depth).toBe(10)
    expect(result.bounds.totalHeight).toBe(DEFAULT_STOREY_HEIGHT)
  })

  it('multi-storey totalHeight = storeys * storeyHeight', () => {
    const plan = makePlan()
    const result = planTo3d(plan, 3)

    expect(result.bounds.totalHeight).toBe(3 * DEFAULT_STOREY_HEIGHT)
  })

  it('empty/undefined PlanModel returns empty scene (no throw)', () => {
    const result1 = planTo3d(null, 1)
    expect(result1.walls).toEqual([])
    expect(result1.slabs).toEqual([])

    const result2 = planTo3d(undefined, 1)
    expect(result2.walls).toEqual([])
    expect(result2.slabs).toEqual([])
  })

  it('PlanModel with no walls returns empty scene', () => {
    const plan = makePlan({ walls: [] })
    const result = planTo3d(plan, 1)
    expect(result.walls).toEqual([])
    expect(result.slabs).toEqual([])
  })

  it('zero storeys returns empty scene', () => {
    const plan = makePlan()
    const result = planTo3d(plan, 0)
    expect(result.walls).toEqual([])
    expect(result.slabs).toEqual([])
  })

  it('falls back to FALLBACK_WALL_THICKNESS when wall has 0 thickness', () => {
    const plan = makePlan({
      wallThickness: 0,
      walls: [
        { id: 'w1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0, type: 'external' },
      ],
    })
    const result = planTo3d(plan, 1)
    expect(result.walls[0].thickness).toBe(FALLBACK_WALL_THICKNESS)
  })

  it('slab thickness matches SLAB_THICKNESS constant', () => {
    const plan = makePlan()
    const result = planTo3d(plan, 1)
    expect(result.slabs[0].thickness).toBe(SLAB_THICKNESS)
  })

  it('slab center matches building center', () => {
    const plan = makePlan({ width: 20, height: 10 })
    const result = planTo3d(plan, 1)
    expect(result.slabs[0].centerX).toBe(10)
    expect(result.slabs[0].centerZ).toBe(5)
  })

  it('pickActivePlan returns persistedPlan when present', () => {
    const persisted = makePlan({ id: 'persisted-1', width: 15 })
    const design = makeDesign()
    const result = pickActivePlan(persisted, design)
    expect(result?.id).toBe('persisted-1')
    expect(result?.width).toBe(15)
  })

  it('pickActivePlan generates from design when no persistedPlan', () => {
    const design = makeDesign({ grossFloorArea: 80 })
    const result = pickActivePlan(null, design)
    expect(result).not.toBeNull()
    expect(result!.walls.length).toBeGreaterThan(0)
    expect(result!.rooms.length).toBeGreaterThan(0)
  })

  it('pickActivePlan returns null when no persistedPlan and no design', () => {
    const result = pickActivePlan(null, null)
    expect(result).toBeNull()
  })

  it('planTo3d produces non-empty scene from generated PlanModel', () => {
    const design = makeDesign()
    const plan = generatePlanModel(design)
    const floors = design.floors || 1
    const result = planTo3d(plan, floors)
    expect(result.walls.length).toBeGreaterThan(0)
    expect(result.slabs.length).toBe(floors)
    expect(result.bounds.width).toBe(plan.width)
    expect(result.bounds.depth).toBe(plan.height)
  })

  it('planTo3d empty when pickActivePlan returns null (no crash)', () => {
    const plan = pickActivePlan(null, null)
    const result = planTo3d(plan, 1)
    expect(result.walls).toEqual([])
    expect(result.slabs).toEqual([])
  })

  // ── Opening tests ──

  it('resolveOpeningPosition places a door at correct centre on horizontal wall', () => {
    const wall = { startX: 0, startZ: 0, endX: 10, endZ: 0, thickness: 0.25 }
    const op = resolveOpeningPosition(wall, { kind: 'door', offset: 0.5, width: 0.9 }, 0, 3)
    // Centre at x=5, z=0
    expect(op.centerX).toBe(5)
    expect(op.centerZ).toBe(0)
    // Door defaults
    expect(op.height).toBe(DOOR_DEFAULT_HEIGHT)
    expect(op.sillHeight).toBe(DOOR_DEFAULT_SILL)
    // Wall direction angle: horizontal wall (dx=10, dz=0) => atan2(10,0) = PI/2, negated
    expect(op.wallAngle).toBeCloseTo(-Math.PI / 2)
    expect(op.wallThickness).toBe(0.25)
  })

  it('resolveOpeningPosition places a window on vertical wall', () => {
    const wall = { startX: 5, startZ: 0, endX: 5, endZ: 8, thickness: 0.25 }
    const op = resolveOpeningPosition(wall, { kind: 'window', offset: 0.3, width: 1.2 }, 0, 3)
    // Centre at x=5, z=0.3*8=2.4
    expect(op.centerX).toBe(5)
    expect(op.centerZ).toBeCloseTo(2.4)
    // Window defaults
    expect(op.height).toBe(WINDOW_DEFAULT_HEIGHT)
    expect(op.sillHeight).toBe(WINDOW_DEFAULT_SILL)
  })

  it('opening with explicit height/sillHeight overrides defaults', () => {
    const wall = { startX: 0, startZ: 0, endX: 6, endZ: 0, thickness: 0.2 }
    const op = resolveOpeningPosition(wall, { kind: 'door', offset: 0.5, width: 1, height: 2.0, sillHeight: 0.1 }, 0, 3)
    expect(op.height).toBe(2.0)
    expect(op.sillHeight).toBe(0.1)
  })

  it('wall with one opening splits into 2 piers with a gap the width of the opening', () => {
    const plan = makePlan({
      openings: [
        { id: 'o1', wallId: 'w1', kind: 'door' as const, offset: 0.5, width: 1.0 },
      ],
    })
    const result = planTo3d(plan, 1)
    // w1 is the bottom horizontal wall (0,0)-(12,0). Opening at centre 0.5, width 1.0
    // Should produce 2 piers (left and right of opening)
    const w1Piers = result.walls.filter((w) => w.wallId === 'w1')
    expect(w1Piers.length).toBe(2)
    // The gap between the piers should approximately equal the opening width
    // Left pier ends at approx 5.5 (6 - 0.5), right pier starts at approx 6.5 (6 + 0.5)
    // Actually: centre=0.5 means centre x=6. halfW=0.5, so gap from 5.5 to 6.5
    expect(w1Piers[0].endX).toBeCloseTo(5.5, 1)
    expect(w1Piers[1].startX).toBeCloseTo(6.5, 1)
  })

  it('wall without openings stays as single solid pier', () => {
    const plan = makePlan({ openings: [] })
    const result = planTo3d(plan, 1)
    // w1 should be a single pier
    const w1Piers = result.walls.filter((w) => w.wallId === 'w1')
    expect(w1Piers.length).toBe(1)
    expect(w1Piers[0].startX).toBe(0)
    expect(w1Piers[0].endX).toBe(12)
  })

  it('empty/undefined openings -> walls render solid, no throw', () => {
    const plan = makePlan({ openings: undefined })
    const result = planTo3d(plan, 1)
    expect(result.walls.length).toBe(5)
    expect(result.openings.length).toBe(0)
  })

  it('opening resolves to correct storey y offset with multi-storey', () => {
    const plan = makePlan({
      openings: [
        { id: 'o1', wallId: 'w1', kind: 'door' as const, offset: 0.5, width: 0.9 },
      ],
    })
    const result = planTo3d(plan, 2)
    // Storey 0: y=0; Storey 1: y=3
    const storey0Openings = result.openings.filter((o) => o.storeyIndex === 0)
    const storey1Openings = result.openings.filter((o) => o.storeyIndex === 1)
    expect(storey0Openings.length).toBe(1)
    expect(storey1Openings.length).toBe(1)
    expect(storey0Openings[0].centerY).toBe(0)
    expect(storey1Openings[0].centerY).toBe(DEFAULT_STOREY_HEIGHT)
    // Opening present on each storey at correct offset
    expect(storey0Openings[0].centerX).toBe(6)
    expect(storey1Openings[0].centerX).toBe(6)
  })

  it('generated PlanModel produces openings in 3D output', () => {
    const design = makeDesign()
    const plan = generatePlanModel(design)
    const floors = design.floors || 1
    const result = planTo3d(plan, floors)
    // Generated plan has openings from defaultOpenings
    expect(plan.openings.length).toBeGreaterThan(0)
    expect(result.openings.length).toBeGreaterThan(0)
    expect(result.openings.length).toBe(plan.openings.length * floors)
    // All openings resolved
    for (const op of result.openings) {
      expect(op.width).toBeGreaterThan(0)
      expect(op.height).toBeGreaterThan(0)
    }
  })

  // ── Roof tests ──

  it('roof params computed: apex > eave and ridge above total building height', () => {
    const plan = makePlan({ width: 12, height: 8 })
    const result = planTo3d(plan, 1)
    expect(result.roof).not.toBeNull()
    const roof = result.roof!
    // Eaves at top of top storey (storeyHeight for single storey)
    expect(roof.eaveY).toBe(DEFAULT_STOREY_HEIGHT)
    expect(roof.pitchHeight).toBe(ROOF_PITCH_HEIGHT)
    // Ridge centre at building centre
    expect(roof.ridgeCentreX).toBe(6)
    expect(roof.ridgeCentreZ).toBe(4)
    // Ridge along longer axis (width=12 > depth=8, so X axis)
    expect(roof.ridgeAxis).toBe('x')
  })

  it('flat plan -> pitched roof defaults to X axis when width >= height', () => {
    const plan = makePlan({ width: 15, height: 10 })
    const result = planTo3d(plan, 1)
    expect(result.roof?.ridgeAxis).toBe('x')
  })

  it('taller plan -> pitched roof defaults to Z axis when height > width', () => {
    const plan = makePlan({ width: 8, height: 12 })
    const result = planTo3d(plan, 1)
    expect(result.roof?.ridgeAxis).toBe('z')
  })

  it('roof overhang extends past building bounds', () => {
    const plan = makePlan({ width: 10, height: 6 })
    const result = planTo3d(plan, 1)
    const roof = result.roof!
    // Ridge length includes overhang on both sides
    const expectedRidgeLen = 10 + ROOF_OVERHANG * 2
    expect(roof.ridgeLength).toBeCloseTo(expectedRidgeLen)
    expect(roof.overhang).toBe(ROOF_OVERHANG)
  })

  it('multi-storey: 2 storeys produce exactly one roof on top at correct height', () => {
    const plan = makePlan({ width: 12, height: 8 })
    const result = planTo3d(plan, 2)
    // 2 slabs + 2 storeys of walls + exactly ONE roof
    expect(result.slabs.length).toBe(2)
    expect(result.roof).not.toBeNull()
    // Eaves at top of top storey = 2 * storeyHeight
    expect(result.roof!.eaveY).toBe(2 * DEFAULT_STOREY_HEIGHT)
    // ridgeCentreZ unchanged from single storey
    expect(result.roof!.ridgeCentreX).toBe(6)
    expect(result.roof!.ridgeCentreZ).toBe(4)
  })

  it('single storey roof sits at storeyHeight', () => {
    const plan = makePlan()
    const result = planTo3d(plan, 1)
    expect(result.roof).not.toBeNull()
    expect(result.roof!.eaveY).toBe(DEFAULT_STOREY_HEIGHT)
  })

  it('empty plan -> no roof, no throw', () => {
    const result1 = planTo3d(null, 1)
    expect(result1.roof).toBeNull()
    const result2 = planTo3d(undefined, 1)
    expect(result2.roof).toBeNull()
  })

  it('plan with no walls -> no roof, no throw', () => {
    const plan = makePlan({ walls: [] })
    const result = planTo3d(plan, 1)
    expect(result.roof).toBeNull()
  })

  it('zero storeys -> no roof, no throw', () => {
    const plan = makePlan()
    const result = planTo3d(plan, 0)
    expect(result.roof).toBeNull()
  })
})
