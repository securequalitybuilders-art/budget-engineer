import { useEffect, useMemo, useRef, useState } from 'react'
import type { Opening, PlanModel, RoomRect } from '../domain/plan'
import { moveRoom, resizeRoom } from '../lib/geometry/plan-transforms'
import { rebuildWallsFromRooms } from '../lib/geometry/plan-topology'
import { constrainRoom, hasCollision } from '../lib/geometry/plan-constraints'
import { snapToGrid } from '../lib/geometry/snap'
import { usePlanHistory } from './usePlanHistory'

export type EditMode = 'idle' | 'move' | 'resize' | 'opening-move'

interface PointerSession {
  targetId: string
  startX: number
  startY: number
  originPlan: PlanModel
  mode: EditMode
  wallLength?: number
}

const DEFAULT_ROOM_SIZE = 3.0

function pickNonCollidingPosition(plan: PlanModel): { x: number; y: number } {
  const cx = (plan.width - DEFAULT_ROOM_SIZE) / 2
  const cy = (plan.height - DEFAULT_ROOM_SIZE) / 2
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
    const candidate: RoomRect = { id: '', name: '', x: pos.x, y: pos.y, width: DEFAULT_ROOM_SIZE, height: DEFAULT_ROOM_SIZE }
    const constrained = constrainRoom(candidate, plan)
    if (!hasCollision(constrained, plan.rooms)) {
      return { x: constrained.x, y: constrained.y }
    }
  }
  return { x: cx, y: cy }
}

function wallLength(wall: { start: { x: number; y: number }; end: { x: number; y: number } }): number {
  return Math.sqrt((wall.end.x - wall.start.x) ** 2 + (wall.end.y - wall.start.y) ** 2)
}

export function useEditablePlan(baseModel: PlanModel | null, persistedModel: PlanModel | null, onCommit?: (model: PlanModel) => void) {
  const initialModel = useMemo(() => persistedModel ?? baseModel, [persistedModel, baseModel])
  const history = usePlanHistory(initialModel)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null)
  const sessionRef = useRef<PointerSession | null>(null)
  const [activeMode, setActiveMode] = useState<EditMode>('idle')
  const pointerAccum = useRef({ dx: 0, dy: 0 })
  const [snapStep, setSnapStep] = useState(0.1)

  useEffect(() => {
    history.resetTo(initialModel)
  }, [initialModel])

  const clearSelection = () => {
    setSelectedRoomId(null)
    setSelectedOpeningId(null)
  }

  const beginMove = (roomId: string, x: number, y: number) => {
    if (!history.present) return
    setSelectedRoomId(roomId)
    setSelectedOpeningId(null)
    pointerAccum.current = { dx: 0, dy: 0 }
    sessionRef.current = { targetId: roomId, startX: x, startY: y, originPlan: history.present, mode: 'move' }
    setActiveMode('move')
  }

  const beginResize = (roomId: string, x: number, y: number) => {
    if (!history.present) return
    setSelectedRoomId(roomId)
    setSelectedOpeningId(null)
    pointerAccum.current = { dx: 0, dy: 0 }
    sessionRef.current = { targetId: roomId, startX: x, startY: y, originPlan: history.present, mode: 'resize' }
    setActiveMode('resize')
  }

  const updatePointer = (worldDx: number, worldDy: number) => {
    const s = sessionRef.current
    if (!s) return
    pointerAccum.current.dx += worldDx
    pointerAccum.current.dy += worldDy

    if (s.mode === 'opening-move') {
      const opening = s.originPlan.openings.find((o) => o.id === s.targetId)
      const wall = s.originPlan.walls.find((w) => w.id === opening?.wallId)
      if (!opening || !wall || !s.wallLength) return
      const horizontal = wall.start.y === wall.end.y
      const deltaOffset = horizontal ? pointerAccum.current.dx / s.wallLength : pointerAccum.current.dy / s.wallLength
      const halfWidthRatio = opening.width / (2 * s.wallLength)
      const rawOffset = Math.max(halfWidthRatio, Math.min(1 - halfWidthRatio, opening.offset + deltaOffset))
      const offsetStep = s.wallLength > 0.01 ? snapStep / s.wallLength : 0.01
      const newOffset = snapToGrid(rawOffset, Math.max(offsetStep, 0.001))
      const nextOpenings = s.originPlan.openings.map((o) => o.id === s.targetId ? { ...o, offset: Number(newOffset.toFixed(4)) } : o)
      history.set({ ...s.originPlan, openings: nextOpenings })
      return
    }

    const { dx, dy } = pointerAccum.current
    const drafted = s.mode === 'move'
      ? moveRoom(s.originPlan, s.targetId, dx, dy)
      : resizeRoom(s.originPlan, s.targetId, dx, dy)

    const nextRooms = drafted.rooms.map((room) => {
      if (room.id !== s.targetId) return room
      let c = constrainRoom(room, drafted)
      if (s.mode === 'move') {
        c = { ...c, x: snapToGrid(c.x, snapStep), y: snapToGrid(c.y, snapStep) }
      } else {
        c = { ...c, width: snapToGrid(c.width, snapStep), height: snapToGrid(c.height, snapStep) }
      }
      return c
    })
    const activeRoom = nextRooms.find((room) => room.id === s.targetId)
    if (!activeRoom) return
    if (hasCollision(activeRoom, nextRooms)) return

    history.set(rebuildWallsFromRooms({ ...drafted, rooms: nextRooms }))
  }

  const endPointer = () => {
    const s = sessionRef.current
    if (history.present && s && onCommit) onCommit(history.present)
    sessionRef.current = null
    setActiveMode('idle')
  }

  const addRoom = (name?: string) => {
    try {
      const plan = history.present
      if (!plan) return
      const id = crypto.randomUUID()
      const roomName = name ?? `Room ${plan.rooms.length + 1}`
      const pos = pickNonCollidingPosition(plan)
      const newRoom = constrainRoom({ id, name: roomName, x: pos.x, y: pos.y, width: DEFAULT_ROOM_SIZE, height: DEFAULT_ROOM_SIZE }, plan)
      const nextPlan: PlanModel = { ...plan, rooms: [...plan.rooms, newRoom] }
      const rebuilt = rebuildWallsFromRooms(nextPlan)
      history.set(rebuilt)
      clearSelection()
      setSelectedRoomId(id)
      if (onCommit) onCommit(rebuilt)
    } catch (e) {
      console.error('addRoom failed:', e)
    }
  }

  const deleteRoom = (roomId: string) => {
    try {
      const plan = history.present
      if (!plan) return
      if (plan.rooms.length <= 1) return
      const nextPlan: PlanModel = { ...plan, rooms: plan.rooms.filter((r) => r.id !== roomId) }
      const rebuilt = rebuildWallsFromRooms(nextPlan)
      history.set(rebuilt)
      clearSelection()
      if (onCommit) onCommit(rebuilt)
    } catch (e) {
      console.error('deleteRoom failed:', e)
    }
  }

  function findDefaultWall(plan: PlanModel, roomId?: string | null): { wallId: string } | null {
    if (plan.walls.length === 0) return null
    if (roomId) {
      const room = plan.rooms.find((r) => r.id === roomId)
      if (room) {
        const ext = plan.walls.filter((w) => w.type === 'external')
        for (const w of ext) {
          const len = wallLength(w)
          if (len < 0.01) continue
          if (sameLine(w, room, len)) return { wallId: w.id }
        }
      }
    }
    return { wallId: plan.walls.find((w) => w.type === 'external')?.id ?? plan.walls[0].id }
  }

  const addOpening = (kind: 'door' | 'window', wallId?: string) => {
    try {
      const plan = history.present
      if (!plan) return
      const defaultWall = findDefaultWall(plan, selectedRoomId)
      const targetWallId = wallId ?? defaultWall?.wallId
      if (!targetWallId) return
      const wall = plan.walls.find((w) => w.id === targetWallId)
      if (!wall) return
      const id = crypto.randomUUID()
      const width = kind === 'door' ? 0.9 : 1.2
      const wallLen = wallLength(wall)
      if (wallLen < 0.01) return
      const halfWidthRatio = width / (2 * wallLen)
      const offset = halfWidthRatio < 0.5 ? 0.5 : halfWidthRatio
      const opening: Opening = { id, wallId: targetWallId, kind, offset, width }
      const nextPlan: PlanModel = { ...plan, openings: [...plan.openings, opening] }
      history.set(nextPlan)
      clearSelection()
      setSelectedOpeningId(id)
      if (onCommit) onCommit(nextPlan)
    } catch (e) {
      console.error('addOpening failed:', e)
    }
  }

  const beginMoveOpening = (openingId: string) => {
    if (!history.present) return
    const opening = history.present.openings.find((o) => o.id === openingId)
    const wall = history.present.walls.find((w) => w.id === opening?.wallId)
    if (!opening || !wall) return
    setSelectedOpeningId(openingId)
    setSelectedRoomId(null)
    pointerAccum.current = { dx: 0, dy: 0 }
    sessionRef.current = { targetId: openingId, startX: 0, startY: 0, originPlan: history.present, mode: 'opening-move', wallLength: wallLength(wall) }
    setActiveMode('opening-move')
  }

  const deleteOpening = (openingId: string) => {
    try {
      const plan = history.present
      if (!plan) return
      const nextPlan: PlanModel = { ...plan, openings: plan.openings.filter((o) => o.id !== openingId) }
      history.set(nextPlan)
      if (selectedOpeningId === openingId) setSelectedOpeningId(null)
      if (onCommit) onCommit(nextPlan)
    } catch (e) {
      console.error('deleteOpening failed:', e)
    }
  }

  const nudgeRoom = (roomId: string, dx: number, dy: number) => {
    const plan = history.present
    if (!plan) return
    const drafted = moveRoom(plan, roomId, dx, dy)
    const nextRooms = drafted.rooms.map((r) => r.id === roomId ? constrainRoom(r, drafted) : r)
    const activeRoom = nextRooms.find((r) => r.id === roomId)
    if (!activeRoom) return
    if (hasCollision(activeRoom, nextRooms)) return
    const rebuilt = rebuildWallsFromRooms({ ...drafted, rooms: nextRooms })
    history.set(rebuilt)
    if (onCommit) onCommit(rebuilt)
  }

  const nudgeOpening = (openingId: string, deltaOffset: number) => {
    const plan = history.present
    if (!plan) return
    const nextOpenings = plan.openings.map((o) => {
      if (o.id !== openingId) return o
      const wall = plan.walls.find((w) => w.id === o.wallId)
      if (!wall) return o
      const wallLen = wallLength(wall)
      if (wallLen < 0.01) return o
      const halfWidthRatio = o.width / (2 * wallLen)
      const newOffset = Math.max(halfWidthRatio, Math.min(1 - halfWidthRatio, o.offset + deltaOffset))
      return { ...o, offset: Number(newOffset.toFixed(4)) }
    })
    const nextPlan = { ...plan, openings: nextOpenings }
    history.set(nextPlan)
    if (onCommit) onCommit(nextPlan)
  }

  return {
    model: history.present,
    selectedRoomId,
    selectedOpeningId,
    setSelectedRoomId,
    setSelectedOpeningId,
    clearSelection,
    beginMove,
    beginResize,
    updatePointer,
    endPointer,
    addRoom,
    deleteRoom,
    addOpening,
    beginMoveOpening,
    deleteOpening,
    nudgeRoom,
    nudgeOpening,
    snapStep,
    setSnapStep,
    activeMode,
    timeline: { past: history.past, future: history.future },
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  }
}

function sameLine(wall: { start: { x: number; y: number }; end: { x: number; y: number } }, room: RoomRect, _len: number): boolean {
  const eps = 0.05
  if (wall.start.y === wall.end.y) {
    const wy = wall.start.y
    const wx1 = Math.min(wall.start.x, wall.end.x)
    const wx2 = Math.max(wall.start.x, wall.end.x)
    return Math.abs(wy - room.y) < eps || Math.abs(wy - (room.y + room.height)) < eps
      ? wx1 < room.x + room.width + eps && wx2 > room.x - eps
      : false
  }
  if (wall.start.x === wall.end.x) {
    const wx = wall.start.x
    const wy1 = Math.min(wall.start.y, wall.end.y)
    const wy2 = Math.max(wall.start.y, wall.end.y)
    return Math.abs(wx - room.x) < eps || Math.abs(wx - (room.x + room.width)) < eps
      ? wy1 < room.y + room.height + eps && wy2 > room.y - eps
      : false
  }
  return false
}
