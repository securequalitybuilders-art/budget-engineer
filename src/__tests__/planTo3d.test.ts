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
    buildingType: 'house',
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
    // Wall direction angle: horizontal wall (dx=10, dz=0) => atan2(0,10) = 0
    expect(op.wallAngle).toBeCloseTo(0)
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

  // ── Geometric coherency tests ──

  it('adjacent perimeter walls share endpoints (corners connect)', () => {
    const plan = makePlan()
    const result = planTo3d(plan, 1)
    // w1: (0,0)->(12,0), w2: (12,0)->(12,8), w3: (12,8)->(0,8), w4: (0,8)->(0,0)
    const w1 = result.walls.find((w) => w.wallId === 'w1')!
    const w2 = result.walls.find((w) => w.wallId === 'w2')!
    const w3 = result.walls.find((w) => w.wallId === 'w3')!
    const w4 = result.walls.find((w) => w.wallId === 'w4')!
    expect(w1.endX).toBe(w2.startX)
    expect(w1.endZ).toBe(w2.startZ)
    expect(w2.endX).toBe(w3.startX)
    expect(w2.endZ).toBe(w3.startZ)
    expect(w3.endX).toBe(w4.startX)
    expect(w3.endZ).toBe(w4.startZ)
    expect(w4.endX).toBe(w1.startX)
    expect(w4.endZ).toBe(w1.startZ)
  })

  it('wall box position and rotation match segment midpoint and direction', () => {
    const plan = makePlan()
    const result = planTo3d(plan, 1)
    const w1 = result.walls.find((w) => w.wallId === 'w1')!
    // Segment (0,0)->(12,0): midpoint=(6,0), dx=12, dz=0 => angle=atan2(0,12)=0
    expect(w1.startX).toBe(0)
    expect(w1.startZ).toBe(0)
    expect(w1.endX).toBe(12)
    expect(w1.endZ).toBe(0)
    // BimModel3D computes: midX=(0+12)/2=6, midZ=0, angle=atan2(0,12)=0
    // Box: length=12, height=3, thickness=0.25, rotation around Y=0 => aligns with +X
    // WallPierMesh position: [6, 1.5, 0] rotation [0, 0, 0]
    const midX = (w1.startX + w1.endX) / 2
    const midZ = (w1.startZ + w1.endZ) / 2
    expect(midX).toBe(6)
    expect(midZ).toBe(0)
    const dx = w1.endX - w1.startX
    const dz = w1.endZ - w1.startZ
    const angle = Math.atan2(dz, dx)
    expect(angle).toBe(0)
  })

  it('roof eave height exactly equals top of top-storey walls (no gap)', () => {
    const plan = makePlan()
    const result = planTo3d(plan, 2)
    expect(result.roof).not.toBeNull()
    const roof = result.roof!
    const wallTopY = 2 * DEFAULT_STOREY_HEIGHT
    expect(roof.eaveY).toBe(wallTopY)
    expect(roof.eaveY).toBe(result.bounds.totalHeight)
    expect(roof.pitchHeight).toBe(ROOF_PITCH_HEIGHT)
    expect(roof.eaveY + roof.pitchHeight).toBe(wallTopY + roof.pitchHeight)
  })

  it('roof footprint covers building bounds with overhang', () => {
    const plan = makePlan({ width: 10, height: 6 })
    const result = planTo3d(plan, 1)
    const roof = result.roof!
    // Roof spans -overhang to width+overhang along ridge axis
    expect(roof.ridgeAxis).toBe('x')
    expect(roof.ridgeLength).toBe(10 + ROOF_OVERHANG * 2)
    expect(roof.buildingWidth).toBe(10)
    expect(roof.buildingDepth).toBe(6)
    // Eave vertices: from -oh to bw+oh and -oh to bd+oh
    // Walls are at z=0..6, roof eaves at z=-0.3..6.3 => covers
    expect(roof.overhang).toBe(ROOF_OVERHANG)
  })

  it('opening 3D center lies on its wall segment at the offset ratio and correct height', () => {
    const plan = makePlan({
      openings: [
        { id: 'o1', wallId: 'w1', kind: 'door', offset: 0.5, width: 1.0 },
        { id: 'o2', wallId: 'w4', kind: 'window', offset: 0.3, width: 1.5 },
      ],
    })
    const result = planTo3d(plan, 1)
    const door = result.openings.find((o) => o.openingId === 'o1')!
    const win = result.openings.find((o) => o.openingId === 'o2')!
    // w1: (0,0)->(12,0), offset=0.5 => centre at x=6, z=0
    expect(door.centerX).toBe(6)
    expect(door.centerZ).toBe(0)
    expect(door.centerY).toBe(0)
    expect(door.kind).toBe('door')
    expect(door.height).toBe(DOOR_DEFAULT_HEIGHT)
    expect(door.sillHeight).toBe(DOOR_DEFAULT_SILL)
    // w4: (0,8)->(0,0), offset=0.3 => along segment from start (0,8) toward end (0,0)
    // 0.3 from start => z = 8 + (0-8)*0.3 = 8 - 2.4 = 5.6
    expect(win.centerX).toBe(0)
    expect(win.centerZ).toBeCloseTo(5.6)
    expect(win.centerY).toBe(0)
  })

  it('opening wallAngle matches its wall direction', () => {
    const plan = makePlan({
      openings: [
        { id: 'o1', wallId: 'w1', kind: 'door', offset: 0.5, width: 1.0 },
        { id: 'o2', wallId: 'w2', kind: 'window', offset: 0.5, width: 1.2 },
      ],
    })
    const result = planTo3d(plan, 1)
    const door = result.openings.find((o) => o.openingId === 'o1')!
    const win = result.openings.find((o) => o.openingId === 'o2')!
    // w1: horizontal (dx=12, dz=0) => angle=0
    expect(door.wallAngle).toBe(0)
    // w2: vertical (dx=0, dz=8) => angle=atan2(8,0)=PI/2
    expect(win.wallAngle).toBeCloseTo(Math.PI / 2)
    // wall thickness preserved
    expect(door.wallThickness).toBe(0.25)
    expect(win.wallThickness).toBe(0.25)
  })

  it('multi-storey still stacks correctly — walls at each storey', () => {
    const plan = makePlan()
    const result = planTo3d(plan, 3)
    expect(result.slabs.length).toBe(3)
    // 5 walls * 3 storeys = 15 wall entries
    expect(result.walls.length).toBe(15)
    // Slab y-offsets stacked
    expect(result.slabs[0].yOffset).toBe(0)
    expect(result.slabs[1].yOffset).toBe(DEFAULT_STOREY_HEIGHT)
    expect(result.slabs[2].yOffset).toBe(2 * DEFAULT_STOREY_HEIGHT)
    // Roof eave at top
    expect(result.roof!.eaveY).toBe(3 * DEFAULT_STOREY_HEIGHT)
    expect(result.roof!.eaveY + result.roof!.pitchHeight)
      .toBe(3 * DEFAULT_STOREY_HEIGHT + ROOF_PITCH_HEIGHT)
  })

  it('empty plan -> nothing, no throw', () => {
    const result = planTo3d(null, 1)
    expect(result.walls).toEqual([])
    expect(result.slabs).toEqual([])
    expect(result.openings).toEqual([])
    expect(result.ceilings).toEqual([])
    expect(result.roof).toBeNull()
    expect(result.bounds.width).toBe(0)
    expect(result.bounds.depth).toBe(0)
  })

  // ── Sprint 41: Roof coherency, opening count parity, ceilings ──

  it('roof eave corners span full building bounds with overhang (not collapsed to corner)', () => {
    const plan = makePlan({ width: 12, height: 8 })
    const result = planTo3d(plan, 1)
    const roof = result.roof!
    // ridgeAxis should be 'x' since width >= height
    expect(roof.ridgeAxis).toBe('x')
    // Ridge length includes overhang
    expect(roof.ridgeLength).toBeCloseTo(12 + ROOF_OVERHANG * 2)
    // Eave sits on top of walls
    expect(roof.eaveY).toBe(DEFAULT_STOREY_HEIGHT)
    // Apex above eave
    expect(roof.pitchHeight).toBe(ROOF_PITCH_HEIGHT)
    // The roof covers the building: ridge centre is at building centre
    expect(roof.ridgeCentreX).toBe(6)
    expect(roof.ridgeCentreZ).toBe(4)
    // Building bounds are preserved
    expect(roof.buildingWidth).toBe(12)
    expect(roof.buildingDepth).toBe(8)
    // Roof area > 0 (catches zero-area collapsed roof)
    const roofArea = roof.ridgeLength * (roof.buildingDepth + ROOF_OVERHANG * 2)
    expect(roofArea).toBeGreaterThan(0)
  })

  it('roof with ridgeAxis=z spans full bounds', () => {
    const plan = makePlan({ width: 8, height: 12 })
    const result = planTo3d(plan, 1)
    const roof = result.roof!
    expect(roof.ridgeAxis).toBe('z')
    expect(roof.ridgeLength).toBeCloseTo(12 + ROOF_OVERHANG * 2)
    expect(roof.ridgeCentreX).toBe(4)
    expect(roof.ridgeCentreZ).toBe(6)
    expect(roof.eaveY).toBe(DEFAULT_STOREY_HEIGHT)
    expect(roof.eaveY + roof.pitchHeight).toBe(DEFAULT_STOREY_HEIGHT + ROOF_PITCH_HEIGHT)
  })

  it('number of opening placements equals number of plan openings per storey', () => {
    const plan = makePlan({
      openings: [
        { id: 'o1', wallId: 'w1', kind: 'door', offset: 0.3, width: 1.0 },
        { id: 'o2', wallId: 'w2', kind: 'window', offset: 0.5, width: 1.2 },
        { id: 'o3', wallId: 'w3', kind: 'window', offset: 0.7, width: 1.5 },
        { id: 'o4', wallId: 'w4', kind: 'door', offset: 0.2, width: 0.9 },
        { id: 'o5', wallId: 'w5', kind: 'door', offset: 0.5, width: 0.9 },
      ],
    })
    const result = planTo3d(plan, 1)
    // All 5 openings resolved (on 4 external + 1 internal walls)
    expect(result.openings.length).toBe(5)
    // Count by kind
    const doors = result.openings.filter((o) => o.kind === 'door')
    const windows = result.openings.filter((o) => o.kind === 'window')
    expect(doors.length).toBe(3)
    expect(windows.length).toBe(2)
    // Multi-storey: 2 storeys -> 10 openings
    const result2 = planTo3d(plan, 2)
    expect(result2.openings.length).toBe(10)
    // Each storey has identical openings
    const storey0 = result2.openings.filter((o) => o.storeyIndex === 0)
    const storey1 = result2.openings.filter((o) => o.storeyIndex === 1)
    expect(storey0.length).toBe(5)
    expect(storey1.length).toBe(5)
  })

  it('generated PlanModel opening count parity (all openings become 3D placements)', () => {
    const design = makeDesign()
    const plan = generatePlanModel(design)
    const floors = design.floors || 1
    const result = planTo3d(plan, floors)
    // Every plan opening appears on every storey
    expect(result.openings.length).toBe(plan.openings.length * floors)
    // All have valid dimensions
    for (const op of result.openings) {
      expect(op.width).toBeGreaterThan(0)
      expect(op.height).toBeGreaterThan(0)
      expect(op.wallThickness).toBeGreaterThan(0)
    }
  })

  it('each opening placement lies on its wall segment at correct sill and height', () => {
    const plan = makePlan({
      openings: [
        { id: 'o1', wallId: 'w1', kind: 'door', offset: 0.5, width: 1.0 },
      ],
    })
    const result = planTo3d(plan, 1)
    const op = result.openings[0]
    // w1: (0,0)->(12,0), offset=0.5 => centre x=6, z=0
    expect(op.centerX).toBe(6)
    expect(op.centerZ).toBe(0)
    expect(op.centerY).toBe(0)
    // Door sits on wall with sill at floor level
    expect(op.sillHeight).toBe(DOOR_DEFAULT_SILL)
    expect(op.height).toBe(DOOR_DEFAULT_HEIGHT)
    expect(op.wallThickness).toBe(0.25)
    // Wall angle for horizontal wall is 0
    expect(op.wallAngle).toBe(0)
  })

  it('ceilings: one per room per storey at correct height covering room footprint', () => {
    const plan = makePlan()
    // 2 rooms, 1 storey -> 2 ceilings
    const result = planTo3d(plan, 1)
    expect(result.ceilings.length).toBe(2)
    // r1: x=0,y=0, w=6,h=8 => center (3,4)
    const ceilR1 = result.ceilings.find((c) => c.roomId === 'r1')!
    expect(ceilR1.centerX).toBe(3)
    expect(ceilR1.centerZ).toBe(4)
    expect(ceilR1.width).toBeCloseTo(6 - 0.1)
    expect(ceilR1.depth).toBeCloseTo(8 - 0.1)
    // r2: x=6,y=0, w=6,h=8 => center (9,4)
    const ceilR2 = result.ceilings.find((c) => c.roomId === 'r2')!
    expect(ceilR2.centerX).toBe(9)
    expect(ceilR2.centerZ).toBe(4)
    expect(ceilR2.width).toBeCloseTo(6 - 0.1)
    expect(ceilR2.depth).toBeCloseTo(8 - 0.1)
    // Ceilings at top of storey: yOffset = storeyHeight - thickness
    expect(ceilR1.yOffset).toBeCloseTo(DEFAULT_STOREY_HEIGHT - 0.05)
    expect(ceilR2.yOffset).toBeCloseTo(DEFAULT_STOREY_HEIGHT - 0.05)
    expect(ceilR1.thickness).toBe(0.05)
    expect(ceilR2.thickness).toBe(0.05)
  })

  it('ceilings: multi-storey produces ceilings per storey', () => {
    const plan = makePlan()
    const result = planTo3d(plan, 2)
    // 2 rooms * 2 storeys = 4 ceilings
    expect(result.ceilings.length).toBe(4)
    // Storey 0 ceilings at yOffset = storeyHeight - thickness
    const s0Ceils = result.ceilings.filter((c) => c.storeyIndex === 0)
    expect(s0Ceils.length).toBe(2)
    for (const c of s0Ceils) {
      expect(c.yOffset).toBeCloseTo(DEFAULT_STOREY_HEIGHT - 0.05)
    }
    // Storey 1 ceilings at yOffset = 2*storeyHeight - thickness
    const s1Ceils = result.ceilings.filter((c) => c.storeyIndex === 1)
    expect(s1Ceils.length).toBe(2)
    for (const c of s1Ceils) {
      expect(c.yOffset).toBeCloseTo(2 * DEFAULT_STOREY_HEIGHT - 0.05)
    }
  })

  it('empty plan -> no ceilings', () => {
    const result = planTo3d(null, 1)
    expect(result.ceilings).toEqual([])
  })

  it('plan with no rooms -> no ceilings', () => {
    const plan = makePlan({ rooms: [] })
    const result = planTo3d(plan, 1)
    expect(result.ceilings).toEqual([])
  })

  // ── Sprint 42: Window-specific tests ──

  it('splitWall produces a pier gap for a WINDOW opening equal to the window width', () => {
    const plan = makePlan({
      openings: [
        { id: 'w1', wallId: 'w1', kind: 'window', offset: 0.4, width: 1.8 },
      ],
    })
    const result = planTo3d(plan, 1)
    // w1 is the bottom horizontal wall (0,0)-(12,0)
    const w1Piers = result.walls.filter((w) => w.wallId === 'w1')
    // One opening splits into 2 piers
    expect(w1Piers.length).toBe(2)
    // Centre at offset 0.4 => centre x = 4.8, halfW = 0.9
    // lo = 0.4 - 0.9/12 = 0.325, hi = 0.4 + 0.9/12 = 0.475
    // Gap from x = 0.325*12 = 3.9 to x = 0.475*12 = 5.7 => width 1.8
    const gapWidth = w1Piers[1].startX - w1Piers[0].endX
    expect(gapWidth).toBeCloseTo(1.8, 1)
    // Opening placement exists with correct kind
    const windowOp = result.openings.find((o) => o.openingId === 'w1')!
    expect(windowOp.kind).toBe('window')
    expect(windowOp.width).toBe(1.8)
    expect(windowOp.centerX).toBeCloseTo(4.8)
  })

  it('window placement has sillHeight > 0 and height > 0 and lies on its wall segment', () => {
    const plan = makePlan({
      openings: [
        { id: 'ow1', wallId: 'w1', kind: 'window', offset: 0.3, width: 1.5 },
        { id: 'ow2', wallId: 'w2', kind: 'window', offset: 0.5, width: 1.2 },
      ],
    })
    const result = planTo3d(plan, 1)
    const win1 = result.openings.find((o) => o.openingId === 'ow1')!
    const win2 = result.openings.find((o) => o.openingId === 'ow2')!
    // Both are windows with sill > 0
    expect(win1.kind).toBe('window')
    expect(win1.sillHeight).toBeGreaterThan(0)
    expect(win1.height).toBeGreaterThan(0)
    expect(win2.kind).toBe('window')
    expect(win2.sillHeight).toBeGreaterThan(0)
    expect(win2.height).toBeGreaterThan(0)
    // Sill defaults to WINDOW_DEFAULT_SILL (0.9)
    expect(win1.sillHeight).toBe(WINDOW_DEFAULT_SILL)
    expect(win2.sillHeight).toBe(WINDOW_DEFAULT_SILL)
    // Height defaults to WINDOW_DEFAULT_HEIGHT (1.5)
    expect(win1.height).toBe(WINDOW_DEFAULT_HEIGHT)
    expect(win2.height).toBe(WINDOW_DEFAULT_HEIGHT)
    // Positions on their wall segments
    // win1: w1 (0,0)->(12,0), offset=0.3 => x=3.6, z=0
    expect(win1.centerX).toBeCloseTo(3.6)
    expect(win1.centerZ).toBe(0)
    // win2: w2 (12,0)->(12,8), offset=0.5 => x=12, z=4
    expect(win2.centerX).toBe(12)
    expect(win2.centerZ).toBe(4)
    // Both at storey floor
    expect(win1.centerY).toBe(0)
    expect(win2.centerY).toBe(0)
  })

  it('window count matches window openings in the plan', () => {
    const plan = makePlan({
      openings: [
        { id: 'ow1', wallId: 'w1', kind: 'window', offset: 0.3, width: 1.5 },
        { id: 'ow2', wallId: 'w2', kind: 'window', offset: 0.6, width: 1.2 },
        { id: 'od1', wallId: 'w3', kind: 'door', offset: 0.5, width: 1.0 },
      ],
    })
    const result = planTo3d(plan, 1)
    const windows = result.openings.filter((o) => o.kind === 'window')
    const doors = result.openings.filter((o) => o.kind === 'door')
    expect(windows.length).toBe(2)
    expect(doors.length).toBe(1)
    // Multi-storey: 2 storeys
    const result2 = planTo3d(plan, 2)
    expect(result2.openings.filter((o) => o.kind === 'window').length).toBe(4)
    expect(result2.openings.filter((o) => o.kind === 'door').length).toBe(2)
  })
})
