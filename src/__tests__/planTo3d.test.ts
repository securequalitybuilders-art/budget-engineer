import { describe, it, expect } from 'vitest'
import { planTo3d, DEFAULT_STOREY_HEIGHT, FALLBACK_WALL_THICKNESS, SLAB_THICKNESS } from '@/adapters/planTo3d'
import type { PlanModel } from '@/domain/plan'

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
})
