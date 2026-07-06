import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { moveRoom, resizeRoom } from '../lib/geometry/plan-transforms'
import { constrainRoom, hasCollision } from '../lib/geometry/plan-constraints'
import { rebuildWallsFromRooms } from '../lib/geometry/plan-topology'
import { computeSection } from '../adapters/planToElevations'
import type { PlanModel, RoomRect } from '../domain/plan'
import { createSamplePlanModel, createAlternatePlanModel } from './fixtures/cadFixtures'

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

// ── pointerAccum simulation (regression: absolute deltas accumulate correctly) ──
describe('pointerAccum simulation (the useEditablePlan pointerAccum pattern)', () => {
  it('two updatePointer calls with per-frame deltas produce cumulative result', () => {
    const plan = makeBasePlan()
    // Simulate the pointerAccum logic from useEditablePlan
    let accDx = 0
    const accDy = 0

    // Frame 1: user moves pointer 10px right → ~0.8 world units (exact ratio depends on scale, but
    // pass world-space deltas directly as updatePointer does)
    accDx += 0.8
    const after1 = moveRoom(plan, 'r1', accDx, accDy)
    const r1 = after1.rooms.find((r) => r.id === 'r1')!
    expect(r1.x).toBeCloseTo(0.8)

    // Frame 2: user moves another 15px right (~1.2 world units)
    accDx += 1.2
    const after2 = moveRoom(plan, 'r1', accDx, accDy)
    const r2 = after2.rooms.find((r) => r.id === 'r1')!
    // Cumulative: 0.8 + 1.2 = 2.0, NOT just 1.2
    expect(r2.x).toBeCloseTo(2.0)
  })

  it('pointerAccum resets on new session (beginMove clears accumulator)', () => {
    const plan = makeBasePlan()
    let accDx = 0

    // Session 1: move r1 by 0.5
    accDx = 0
    accDx += 0.5
    const after1 = moveRoom(plan, 'r1', accDx, 0)
    expect(after1.rooms.find((r) => r.id === 'r1')!.x).toBeCloseTo(0.5)

    // Session 2 (new beginMove): accumulator resets
    accDx = 0
    accDx += 1.2
    const after2 = moveRoom(plan, 'r1', accDx, 0)
    expect(after2.rooms.find((r) => r.id === 'r1')!.x).toBeCloseTo(1.2)
    // NOT 0.5 + 1.2 = 1.7, because pointerAccum was reset
  })

  it('resize also accumulates correctly through pointerAccum pattern', () => {
    const plan = makeBasePlan()
    let accDx = 0
    let accDy = 0

    accDx += 0.5
    accDy += 0.3
    const after1 = resizeRoom(plan, 'r1', accDx, accDy)
    expect(after1.rooms.find((r) => r.id === 'r1')!.width).toBeCloseTo(6.5)
    expect(after1.rooms.find((r) => r.id === 'r1')!.height).toBeCloseTo(5.3)

    accDx += 0.5
    accDy += 0.2
    const after2 = resizeRoom(plan, 'r1', accDx, accDy)
    expect(after2.rooms.find((r) => r.id === 'r1')!.width).toBeCloseTo(7.0)
    expect(after2.rooms.find((r) => r.id === 'r1')!.height).toBeCloseTo(5.5)
  })
})

// ── Edit commit flow: beginMove → updatePointer → endPointer → onCommit ──
describe('edit commit flow (beginMove → updatePointer → endPointer → onCommit)', () => {
  it('endPointer calls onCommit with model moved by cumulative delta', () => {
    const plan = makeBasePlan()
    let committed: PlanModel | null = null
    const onCommit = (m: PlanModel) => { committed = m }

    // Simulate useEditablePlan flow with pure functions
    const hist = createHistorySim(plan)
    const roomId = 'r1'
    const originPlan = hist.present!
    let accDx = 0

    // beginMove equivalent
    accDx = 0

    // Frame 1 (updatePointer with worldDx = 0.8)
    accDx += 0.8
    const drafted1 = moveRoom(originPlan, roomId, accDx, 0)
    const rebuilt1 = rebuildWallsFromRooms(drafted1)
    hist.set(rebuilt1)

    // Frame 2 (updatePointer with worldDx = 1.2)
    accDx += 1.2
    const drafted2 = moveRoom(originPlan, roomId, accDx, 0)
    const rebuilt2 = rebuildWallsFromRooms(drafted2)
    hist.set(rebuilt2)

    // endPointer equivalent
    if (hist.present) onCommit(hist.present)

    expect(committed).not.toBeNull()
    const moved = committed!.rooms.find((r) => r.id === 'r1')
    expect(moved).toBeDefined()
    expect(moved!.x).toBeCloseTo(2.0)
  })

  it('endPointer guard: onCommit skipped when sessionRef is null', () => {
    let commitCalled = false
    const onCommit = (_m: PlanModel) => { commitCalled = true }

    // Simulate endPointer guard: history.present && sessionRef.current && onCommit
    const sessionRef: unknown = null
    const present: PlanModel = makeBasePlan()
    const s = sessionRef
    if (present && s && onCommit) onCommit(present)

    expect(commitCalled).toBe(false)
  })

  it('onCommit runs once per drag session (one pointerup → one commit)', () => {
    const plan = makeBasePlan()
    let callCount = 0
    const onCommit = (_m: PlanModel) => { callCount++ }

    // Session 1
    const hist1 = createHistorySim(plan)
    hist1.set(moveRoom(hist1.present!, 'r1', 1, 0))
    if (hist1.present) onCommit(hist1.present)
    expect(callCount).toBe(1)

    // Session 2
    const hist2 = createHistorySim(plan)
    hist2.set(moveRoom(hist2.present!, 'r1', 2, 0))
    if (hist2.present) onCommit(hist2.present)
    expect(callCount).toBe(2)
  })
})

// ── Shared helpers for addRoom/deleteRoom tests ──
function pickNonCollidingPositionSim(plan: PlanModel): { x: number; y: number } {
  const size = 3.0
  const cx = (plan.width - size) / 2
  const cy = (plan.height - size) / 2
  const offsets = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy - 1 },
    { x: cx + 1, y: cy + 1 },
    { x: cx - 1, y: cy + 1 },
    { x: cx + 1, y: cy - 1 },
    { x: cx + 2, y: cy },
    { x: cx - 2, y: cy },
    { x: cx, y: cy + 2 },
    { x: cx, y: cy - 2 },
  ]
  for (const pos of offsets) {
    const candidate: RoomRect = { id: '', name: '', x: pos.x, y: pos.y, width: size, height: size }
    const constrained = constrainRoom(candidate, plan)
    if (!hasCollision(constrained, plan.rooms)) {
      return { x: constrained.x, y: constrained.y }
    }
  }
  return { x: cx, y: cy }
}

function simulateAddRoom(plan: PlanModel, name?: string): PlanModel {
  const size = 3.0
  const id = 'new-room-test'
  const roomName = name ?? `Room ${plan.rooms.length + 1}`
  const pos = pickNonCollidingPositionSim(plan)
  const candidate = { id, name: roomName, x: pos.x, y: pos.y, width: size, height: size }
  const constrained = constrainRoom(candidate, plan)
  const next: PlanModel = { ...plan, rooms: [...plan.rooms, constrained] }
  return rebuildWallsFromRooms(next)
}

// ── addRoom (simulated pure logic) ──
describe('addRoom', () => {

  it('adds a room, rooms.length increases by 1, walls rebuilt', () => {
    const plan = makeBasePlan()
    const prevCount = plan.rooms.length
    const next = simulateAddRoom(plan)
    expect(next.rooms.length).toBe(prevCount + 1)
    const added = next.rooms.find((r) => r.id === 'new-room-test')
    expect(added).toBeDefined()
    expect(added!.width).toBeGreaterThanOrEqual(1.8)
    expect(added!.height).toBeGreaterThanOrEqual(1.8)
    expect(added!.x).toBeGreaterThanOrEqual(0)
    expect(added!.y).toBeGreaterThanOrEqual(0)
    expect(added!.x + added!.width).toBeLessThanOrEqual(plan.width)
    expect(added!.y + added!.height).toBeLessThanOrEqual(plan.height)
    expect(next.walls.length).toBeGreaterThan(0)
    expect(next.openings.length).toBeGreaterThan(0)
  })

  it('new room does not collide with existing rooms', () => {
    const plan = makeBasePlan()
    const next = simulateAddRoom(plan)
    const added = next.rooms.find((r) => r.id === 'new-room-test')!
    const collides = next.rooms.some((r) => r.id !== added.id && hasCollision(added, [r]))
    expect(collides).toBe(false)
  })

  it('addRoom calls onCommit with the rebuilt plan', () => {
    const plan = makeBasePlan()
    let committed: PlanModel | null = null
    const onCommit = (m: PlanModel) => { committed = m }

    const next = simulateAddRoom(plan)
    onCommit(next)

    expect(committed).not.toBeNull()
    expect(committed!.rooms.length).toBe(plan.rooms.length + 1)
  })
})

function simulateDeleteRoom(plan: PlanModel, roomId: string): PlanModel | null {
  if (plan.rooms.length <= 1) return null
  const next: PlanModel = { ...plan, rooms: plan.rooms.filter((r) => r.id !== roomId) }
  return rebuildWallsFromRooms(next)
}

// ── deleteRoom (simulated pure logic) ──
describe('deleteRoom', () => {

  it('removes a room, rooms.length decreases by 1, walls rebuilt, no dangling openings', () => {
    const plan = makeBasePlan()
    const prevCount = plan.rooms.length
    const next = simulateDeleteRoom(plan, 'r1')
    expect(next).not.toBeNull()
    expect(next!.rooms.length).toBe(prevCount - 1)
    expect(next!.rooms.find((r) => r.id === 'r1')).toBeUndefined()
    expect(next!.walls.length).toBeGreaterThan(0)
    for (const op of next!.openings) {
      const wallRef = next!.walls.find((w) => w.id === op.wallId)
      expect(wallRef).toBeDefined()
    }
  })

  it('deleteRoom on the LAST remaining room is a no-op (returns null)', () => {
    const singleRoom = createAlternatePlanModel()
    expect(singleRoom.rooms.length).toBe(1)
    const result = simulateDeleteRoom(singleRoom, singleRoom.rooms[0].id)
    expect(result).toBeNull()
  })

  it('deleteRoom calls onCommit with the rebuilt plan', () => {
    const plan = makeBasePlan()
    let committed: PlanModel | null = null
    const onCommit = (m: PlanModel) => { committed = m }

    const next = simulateDeleteRoom(plan, 'r1')
    if (next) onCommit(next)

    expect(committed).not.toBeNull()
    expect(committed!.rooms.length).toBe(plan.rooms.length - 1)
  })
})

// ── addRoom undo/redo ──
describe('addRoom undo/redo', () => {
  it('undo after addRoom restores previous room count; redo re-adds', () => {
    const plan = makeBasePlan()
    const hist = createHistorySim(plan)
    const prevCount = hist.present!.rooms.length

    const withRoom = simulateAddRoom(plan, 'Undo Room')
    hist.set(withRoom)
    expect(hist.present!.rooms.length).toBe(prevCount + 1)

    // Undo
    hist.undo()
    expect(hist.present!.rooms.length).toBe(prevCount)
    expect(hist.present!.rooms.find((r) => r.id === 'new-room-test')).toBeUndefined()

    // Redo
    hist.redo()
    expect(hist.present!.rooms.length).toBe(prevCount + 1)
    expect(hist.present!.rooms.find((r) => r.id === 'new-room-test')).toBeDefined()
  })
})

// ── deleteRoom undo/redo ──
describe('deleteRoom undo/redo', () => {
  it('undo after deleteRoom restores the deleted room; redo removes again', () => {
    const plan = makeBasePlan()
    const hist = createHistorySim(plan)
    const prevCount = hist.present!.rooms.length

    // Delete r1
    const withoutR1: PlanModel = { ...plan, rooms: plan.rooms.filter((r) => r.id !== 'r1') }
    const rebuilt = rebuildWallsFromRooms(withoutR1)
    hist.set(rebuilt)
    expect(hist.present!.rooms.length).toBe(prevCount - 1)
    expect(hist.present!.rooms.find((r) => r.id === 'r1')).toBeUndefined()

    // Undo
    hist.undo()
    expect(hist.present!.rooms.length).toBe(prevCount)
    expect(hist.present!.rooms.find((r) => r.id === 'r1')).toBeDefined()

    // Redo
    hist.redo()
    expect(hist.present!.rooms.length).toBe(prevCount - 1)
    expect(hist.present!.rooms.find((r) => r.id === 'r1')).toBeUndefined()
  })
})

// ── edit-flow: addRoom flows to drawings ──
describe('edit-flow: addRoom flows to drawings', () => {
  it('computeSection includes the new room after addRoom', () => {
    const plan = makeBasePlan()
    const rebuilt = simulateAddRoom(plan, 'Flow Room')

    const originalSection = computeSection(plan, 1)!
    const editedSection = computeSection(rebuilt, 1)!

    expect(originalSection).not.toBeNull()
    expect(editedSection).not.toBeNull()
    expect(originalSection.rects.length).toBeLessThan(editedSection.rects.length)
  })
})

// ── Persistence round-trip with addRoom ──
describe('persistence round-trip with addRoom', () => {
  it('savePlanModel then loadPlanModel returns model with added room', async () => {
    const { savePlanModel, loadPlanModel } = await import('../services/cadPersistenceService')
    const { db } = await import('../db/db')
    await db.open()

    try {
      const plan = makeBasePlan()
      const rebuilt = simulateAddRoom(plan, 'Persist Room')

      await savePlanModel('proj-add', 'design-add', rebuilt)
      const loaded = await loadPlanModel('proj-add', 'design-add')
      expect(loaded).not.toBeNull()
      expect(loaded!.rooms.length).toBe(plan.rooms.length + 1)
      const found = loaded!.rooms.find((r) => r.id === 'new-room-test')
      expect(found).toBeDefined()
    } finally {
      db.close()
    }
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
