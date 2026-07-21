import { describe, it, expect } from 'vitest'
import type { PlanModel } from '@/domain/plan'
import { convertPlanModelToWs6Cad } from '@/adapters/planModelToWs6Cad'

function makeSamplePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'test-plan-1',
    designOptionId: 'design-1',
    width: 12,
    height: 8,
    wallThickness: 0.23,
    scaleLabel: '1:100',
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 6, height: 4 },
      { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 4, height: 4 },
      { id: 'r3', name: 'Bedroom 1', x: 0, y: 4, width: 5, height: 4 },
    ],
    walls: [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w2', start: { x: 12, y: 0 }, end: { x: 12, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w3', start: { x: 12, y: 8 }, end: { x: 0, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w4', start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, thickness: 0.23, type: 'external' },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', kind: 'door', offset: 0.3, width: 0.9, height: 2.1, sillHeight: 0 },
      { id: 'o2', wallId: 'w1', kind: 'window', offset: 0.7, width: 1.2, height: 1.2, sillHeight: 0.9 },
    ],
    ...overrides,
  }
}

describe('convertPlanModelToWs6Cad', () => {
  it('returns null for null plan', () => {
    const result = convertPlanModelToWs6Cad(null as unknown as PlanModel, 1, 3)
    expect(result).toBeNull()
  })

  it('returns null for plan with no walls', () => {
    const plan = makeSamplePlan({ walls: [], openings: [] })
    const result = convertPlanModelToWs6Cad(plan, 1, 3)
    expect(result).toBeNull()
  })

  it('returns null for floors < 1', () => {
    const plan = makeSamplePlan()
    const result = convertPlanModelToWs6Cad(plan, 0, 3)
    expect(result).toBeNull()
  })

  it('creates correct number of floors', () => {
    const plan = makeSamplePlan()
    const cad = convertPlanModelToWs6Cad(plan, 3, 3)
    expect(cad).not.toBeNull()
    expect(cad!.floors).toHaveLength(3)
    expect(cad!.floors[0].elevation).toBe(0)
    expect(cad!.floors[1].elevation).toBe(3)
    expect(cad!.floors[2].elevation).toBe(6)
    expect(cad!.floors[0].height).toBe(3)
    expect(cad!.floors[1].height).toBe(3)
  })

  it('assigns structural=true to external walls, false to internal', () => {
    const plan = makeSamplePlan()
    plan.walls.push({
      id: 'w5', start: { x: 4, y: 0 }, end: { x: 4, y: 4 }, thickness: 0.15, type: 'internal',
    })
    const cad = convertPlanModelToWs6Cad(plan, 1, 3)
    const extWalls = cad!.walls.filter(w => w.structural === true)
    const intWalls = cad!.walls.filter(w => w.structural === false)
    // 4 external walls per floor
    expect(extWalls).toHaveLength(4)
    expect(intWalls).toHaveLength(1)
  })

  it('creates walls for each floor', () => {
    const plan = makeSamplePlan()
    const cad = convertPlanModelToWs6Cad(plan, 2, 3)
    // 4 walls × 2 floors
    expect(cad!.walls).toHaveLength(8)
  })

  it('creates openings for each floor with correct offset conversion', () => {
    const plan = makeSamplePlan()
    const cad = convertPlanModelToWs6Cad(plan, 2, 3)
    // 2 openings × 2 floors
    expect(cad!.openings).toHaveLength(4)

    // w1 goes from (0,0) to (12,0) → len = 12
    const firstOpening = cad!.openings[0]
    // offset ratio 0.3 → absolute distance 0.3 * 12 = 3.6
    expect(firstOpening.offset).toBeCloseTo(3.6, 5)
    expect(firstOpening.width).toBe(0.9)
    expect(firstOpening.kind).toBe('door')
    expect(firstOpening.headHeight).toBe(2.1)
    expect(firstOpening.sillHeight).toBe(0)
  })

  it('computes headHeight from sillHeight + height for windows', () => {
    const plan = makeSamplePlan()
    const cad = convertPlanModelToWs6Cad(plan, 1, 3)
    const windowOp = cad!.openings.find(o => o.kind === 'window')
    expect(windowOp).not.toBeUndefined()
    // sill=0.9, height=1.2 → headHeight=2.1
    expect(windowOp!.headHeight).toBeCloseTo(2.1, 5)
    expect(windowOp!.sillHeight).toBeCloseTo(0.9, 5)
  })

  it('populates roomProgramme from PlanModel rooms', () => {
    const plan = makeSamplePlan()
    const cad = convertPlanModelToWs6Cad(plan, 1, 3)
    expect(cad!.roomProgramme).not.toBeUndefined()
    expect(cad!.roomProgramme!.r1).toBe('Living Room')
    expect(cad!.roomProgramme!.r2).toBe('Kitchen')
    expect(cad!.roomProgramme!.r3).toBe('Bedroom 1')
  })

  it('sets roomProgramme to undefined when no rooms exist', () => {
    const plan = makeSamplePlan({ rooms: [] })
    const cad = convertPlanModelToWs6Cad(plan, 1, 3)
    expect(cad!.roomProgramme).toBeUndefined()
  })

  it('uses defaults for missing opening height/sill', () => {
    const plan = makeSamplePlan()
    plan.openings = [
      { id: 'o3', wallId: 'w1', kind: 'door', offset: 0.5, width: 0.9 },
      { id: 'o4', wallId: 'w1', kind: 'window', offset: 0.5, width: 1.2 },
    ]
    const cad = convertPlanModelToWs6Cad(plan, 1, 3)
    const door = cad!.openings.find(o => o.kind === 'door')
    const window = cad!.openings.find(o => o.kind === 'window')
    // Door defaults: height=2.1, sill=0 → head=2.1
    expect(door!.height).toBeCloseTo(2.1, 3)
    expect(door!.sillHeight).toBeCloseTo(0, 3)
    expect(door!.headHeight).toBeCloseTo(2.1, 3)
    // Window defaults: height=1.2, sill=0.9 → head=2.1
    expect(window!.height).toBeCloseTo(1.2, 3)
    expect(window!.sillHeight).toBeCloseTo(0.9, 3)
    expect(window!.headHeight).toBeCloseTo(2.1, 3)
  })
})
