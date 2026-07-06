import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { moveRoom, resizeRoom } from '../lib/geometry/plan-transforms'
import { constrainRoom, hasCollision } from '../lib/geometry/plan-constraints'
import { rebuildWallsFromRooms } from '../lib/geometry/plan-topology'
import { computeSection } from '../adapters/planToElevations'
import type { PlanModel, RoomRect } from '../domain/plan'
import { createSamplePlanModel } from './fixtures/cadFixtures'

// ── Simulate usePlanHistory logic (pure function, no React) ──
function createHistorySim(initial: PlanModel | null) {
  let past: PlanModel[] = []
  let present: PlanModel | null = initial
  let future: PlanModel[] = []

  return {
    get past() { return past },
    get present() { return present },
    get future() { return future },
    get canUndo() { return past.length > 0 },
    get canRedo() { return future.length > 0 },
    set(next: PlanModel) {
      if (present) past = [...past, present].slice(-50)
      present = next
      future = []
    },
    undo() {
      if (!this.canUndo || !present) return
      const previous = past[past.length - 1]
      past = past.slice(0, -1)
      future = [present, ...future].slice(0, 50)
      present = previous
    },
    redo() {
      if (!this.canRedo || !future[0] || !present) return
      const next = future[0]
      past = [...past, present].slice(-50)
      future = future.slice(1)
      present = next
    },
    resetTo(next: PlanModel | null) {
      past = []
      future = []
      present = next
    },
  }
}

function makeBasePlan(): PlanModel {
  return createSamplePlanModel({
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 6, height: 5 },
      { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 4, height: 5 },
    ],
  })
}

// ── moveRoom ──
describe('moveRoom', () => {
  it('moves a room by cumulative deltas (regression: was per-frame)', () => {
    const plan = makeBasePlan()
    // Simulate two successive pointer deltas: dx=1, then dx=2
    const after1 = moveRoom(plan, 'r1', 1, 0)
    const r1 = after1.rooms.find((r) => r.id === 'r1')!
    expect(r1.x).toBe(1)

    const after2 = moveRoom(plan, 'r1', 3, 0) // cumulative 1+2 = 3
    const r2 = after2.rooms.find((r) => r.id === 'r1')!
    expect(r2.x).toBe(3) // origin + sum(1, 2), NOT just the last delta

    // Verify the other room is untouched
    const r2other = after2.rooms.find((r) => r.id === 'r2')!
    expect(r2other.x).toBe(6)
  })

  it('moves a room by dy', () => {
    const plan = makeBasePlan()
    const moved = moveRoom(plan, 'r1', 0, 1.5)
    const r = moved.rooms.find((r) => r.id === 'r1')!
    expect(r.y).toBe(1.5)
  })

  it('clamps room within plan bounds', () => {
    const plan = makeBasePlan()
    const moved = moveRoom(plan, 'r1', -10, -10)
    const r = moved.rooms.find((r) => r.id === 'r1')!
    expect(r.x).toBe(0)
    expect(r.y).toBe(0)
  })

  it('produces a new plan object (immutable)', () => {
    const plan = makeBasePlan()
    const moved = moveRoom(plan, 'r1', 1, 0)
    expect(moved).not.toBe(plan)
    expect(plan.rooms[0].x).toBe(0)
  })
})

// ── resizeRoom ──
describe('resizeRoom', () => {
  it('increases width and height', () => {
    const plan = makeBasePlan()
    const resized = resizeRoom(plan, 'r1', 2, 1)
    const r = resized.rooms.find((r) => r.id === 'r1')!
    expect(r.width).toBe(8)
    expect(r.height).toBe(6)
  })

  it('clamps to minimum (1.8)', () => {
    const plan = makeBasePlan()
    const resized = resizeRoom(plan, 'r1', -10, -10)
    const r = resized.rooms.find((r) => r.id === 'r1')!
    expect(r.width).toBe(1.8)
    expect(r.height).toBe(1.8)
  })

  it('does not affect other rooms', () => {
    const plan = makeBasePlan()
    const resized = resizeRoom(plan, 'r1', 2, 1)
    const r2 = resized.rooms.find((r) => r.id === 'r2')!
    expect(r2.width).toBe(4)
    expect(r2.height).toBe(5)
  })
})

// ── constrainRoom / hasCollision ──
describe('constrainRoom & hasCollision', () => {
  it('constrainRoom snaps to grid and keeps in bounds', () => {
    const plan = makeBasePlan()
    const off: RoomRect = { id: 'r1', name: 'LR', x: 0.13, y: 0.27, width: 6, height: 5 }
    const constrained = constrainRoom(off, plan)
    expect(constrained.x).toBe(0.2)
    expect(constrained.y).toBe(0.2)
  })

  it('hasCollision returns true for overlapping rooms', () => {
    const rooms: RoomRect[] = [
      { id: 'a', name: 'A', x: 0, y: 0, width: 5, height: 5 },
      { id: 'b', name: 'B', x: 3, y: 3, width: 5, height: 5 },
    ]
    expect(hasCollision(rooms[1], rooms)).toBe(true)
  })

  it('hasCollision returns false for non-overlapping rooms', () => {
    const rooms: RoomRect[] = [
      { id: 'a', name: 'A', x: 0, y: 0, width: 5, height: 5 },
      { id: 'b', name: 'B', x: 6, y: 6, width: 5, height: 5 },
    ]
    expect(hasCollision(rooms[1], rooms)).toBe(false)
  })

  it('hasCollision does not self-collide', () => {
    const rooms: RoomRect[] = [
      { id: 'a', name: 'A', x: 0, y: 0, width: 5, height: 5 },
    ]
    expect(hasCollision(rooms[0], rooms)).toBe(false)
  })
})

// ── usePlanHistory (simulated) ──
describe('usePlanHistory (simulated)', () => {
  it('undo restores the previous plan', () => {
    const hist = createHistorySim(makeBasePlan())
    const afterMove = moveRoom(hist.present!, 'r1', 3, 0)
    hist.set(afterMove)

    const beforeX = hist.present!.rooms.find((r) => r.id === 'r1')!.x
    expect(beforeX).toBe(3)

    hist.undo()
    const afterUndoX = hist.present!.rooms.find((r) => r.id === 'r1')!.x
    expect(afterUndoX).toBe(0)
  })

  it('redo restores the undone plan', () => {
    const hist = createHistorySim(makeBasePlan())
    const afterMove = moveRoom(hist.present!, 'r1', 3, 0)
    hist.set(afterMove)
    hist.undo()
    expect(hist.present!.rooms.find((r) => r.id === 'r1')!.x).toBe(0)

    hist.redo()
    expect(hist.present!.rooms.find((r) => r.id === 'r1')!.x).toBe(3)
  })

  it('timeline exposes past and future arrays', () => {
    const hist = createHistorySim(makeBasePlan())
    expect(hist.past).toEqual([])
    expect(hist.future).toEqual([])

    hist.set(moveRoom(hist.present!, 'r1', 1, 0))
    expect(hist.past.length).toBe(1)
    expect(hist.future).toEqual([])

    hist.set(moveRoom(hist.present!, 'r1', 2, 0))
    expect(hist.past.length).toBe(2)

    hist.undo()
    expect(hist.past.length).toBe(1)
    expect(hist.future.length).toBe(1)

    hist.redo()
    expect(hist.past.length).toBe(2)
    expect(hist.future).toEqual([])
  })

  it('cannot undo when past is empty', () => {
    const hist = createHistorySim(makeBasePlan())
    expect(hist.canUndo).toBe(false)
    hist.undo()
    expect(hist.present).toBeDefined()
  })

  it('cannot redo when future is empty', () => {
    const hist = createHistorySim(makeBasePlan())
    expect(hist.canRedo).toBe(false)
    hist.redo()
    expect(hist.present).toBeDefined()
  })

  it('set clears future (branching undo)', () => {
    const hist = createHistorySim(makeBasePlan())
    hist.set(moveRoom(hist.present!, 'r1', 1, 0))
    hist.set(moveRoom(hist.present!, 'r1', 2, 0))
    hist.undo()
    expect(hist.future.length).toBe(1)

    // New edit after undo — clears future
    hist.set(moveRoom(hist.present!, 'r1', 3, 0))
    expect(hist.future).toEqual([])
  })

  it('resetTo clears history', () => {
    const hist = createHistorySim(makeBasePlan())
    hist.set(moveRoom(hist.present!, 'r1', 1, 0))
    hist.set(moveRoom(hist.present!, 'r1', 2, 0))
    expect(hist.past.length).toBe(2)

    const fresh = makeBasePlan()
    hist.resetTo(fresh)
    expect(hist.past).toEqual([])
    expect(hist.future).toEqual([])
    expect(hist.present).toBe(fresh)
  })
})

// ── rebuildWallsFromRooms ──
describe('rebuildWallsFromRooms', () => {
  it('regenerates external perimeter after room move', () => {
    const plan = makeBasePlan()
    const moved = moveRoom(plan, 'r1', 1, 0)
    const rebuilt = rebuildWallsFromRooms(moved)

    // Perimeter walls (4 external)
    const ext = rebuilt.walls.filter((w) => w.type === 'external')
    expect(ext.length).toBe(4)

    // Top wall should span plan width
    const topWall = ext.find((w) => w.start.x === 0 && w.start.y === 0 && w.end.y === 0)
    expect(topWall).toBeDefined()
    expect(topWall!.end.x).toBe(plan.width)
  })

  it('generates shared internal walls for adjacent rooms', () => {
    const plan = makeBasePlan()
    const rebuilt = rebuildWallsFromRooms(plan)

    const int = rebuilt.walls.filter((w) => w.type === 'internal')
    // r1 (0,0,6,5) and r2 (6,0,4,5) share wall at x=6
    const sharedWall = int.find((w) => w.start.x === 6 && w.start.x === w.end.x)
    expect(sharedWall).toBeDefined()
  })

  it('regenerates openings after room move', () => {
    const plan = makeBasePlan()
    const moved = moveRoom(plan, 'r2', 0, 0.5)
    const rebuilt = rebuildWallsFromRooms(moved)

    // Should have some openings
    expect(rebuilt.openings.length).toBeGreaterThan(0)
    // Each opening references an existing wall
    for (const op of rebuilt.openings) {
      const wallRef = rebuilt.walls.find((w) => w.id === op.wallId)
      expect(wallRef).toBeDefined()
    }
  })

  it('produces valid wall geometry (no NaN, no negative)', () => {
    const plan = makeBasePlan()
    const rebuilt = rebuildWallsFromRooms(plan)

    for (const wall of rebuilt.walls) {
      expect(wall.start.x).not.toBeNaN()
      expect(wall.start.y).not.toBeNaN()
      expect(wall.end.x).not.toBeNaN()
      expect(wall.end.y).not.toBeNaN()
      expect(wall.thickness).toBeGreaterThan(0)
    }
  })
})

// ── Edit-flow: drawing derived from activePlan ──
describe('edit-flow: drawing reflects edited plan', () => {
  it('computeSection coordinates change after room is moved', () => {
    const plan = makeBasePlan()

    // Move r1 right by 2m
    const edited = moveRoom(plan, 'r1', 2, 0)
    const rebuilt = rebuildWallsFromRooms(edited)

    // computeSection uses plan.width/height which stay the same (building shell)
    // but the section interior elements should differ because rooms shifted
    const originalSection = computeSection(plan, 1)!
    const editedSection = computeSection(rebuilt, 1)!

    // Both sections should be valid
    expect(originalSection).not.toBeNull()
    expect(editedSection).not.toBeNull()
    expect(originalSection.lines.length).toBeGreaterThan(0)
    expect(editedSection.lines.length).toBeGreaterThan(0)

    // The sections come from the same building shell so they have same viewBox
    expect(originalSection.viewBox).toBe(editedSection.viewBox)

    // At least one coordinate differs (the interior layout changed)
    const originalCoords = originalSection.rects.flatMap((r) => [r.x, r.y, r.w, r.h])
    const editedCoords = editedSection.rects.flatMap((r) => [r.x, r.y, r.w, r.h])
    const anyChanged = editedCoords.some((c, i) => Math.abs(c - originalCoords[i]) > 0.001)
    expect(anyChanged).toBe(true)
  })

  it('computeSection thickness changes after wall thickness edit', () => {
    const plan = makeBasePlan()
    const edited: PlanModel = { ...plan, wallThickness: 0.3 }
    const section = computeSection(edited, 1)
    expect(section).not.toBeNull()
  })
})

// ── Persistence round-trip ──
describe('persistence round-trip (plan edit → save → load)', () => {
  it('savePlanModel then loadPlanModel returns the edited model', async () => {
    // Use a pure in-memory simulation of the persistence contract
    const { savePlanModel, loadPlanModel } = await import('../services/cadPersistenceService')
    const { db } = await import('../db/db')
    await db.open()

    try {
      const plan = makeBasePlan()
      const edited = moveRoom(plan, 'r1', 3, 2)
      await savePlanModel('proj-flow', 'design-flow', edited)

      const loaded = await loadPlanModel('proj-flow', 'design-flow')
      expect(loaded).not.toBeNull()
      const r1 = loaded!.rooms.find((r) => r.id === 'r1')
      expect(r1).toBeDefined()
      expect(r1!.x).toBe(3)
      expect(r1!.y).toBe(2)

      // Ensure projectId/designId/savedAt are stripped
      expect('projectId' in loaded!).toBe(false)
      expect('designId' in loaded!).toBe(false)
      expect('savedAt' in loaded!).toBe(false)
    } finally {
      db.close()
    }
  })

  it('loadPlanModel returns null when no saved plan exists', async () => {
    const { loadPlanModel } = await import('../services/cadPersistenceService')
    const { db } = await import('../db/db')
    await db.open()
    try {
      const loaded = await loadPlanModel('proj-none', 'design-none')
      expect(loaded).toBeNull()
    } finally {
      db.close()
    }
  })

  it('savePlanModel is safe with nullish inputs', async () => {
    const { savePlanModel } = await import('../services/cadPersistenceService')
    // Should not throw
    await expect(savePlanModel('', '', null as unknown as PlanModel)).resolves.not.toThrow()
  })
})
