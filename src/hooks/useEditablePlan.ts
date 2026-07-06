import { useEffect, useMemo, useRef, useState } from 'react'
import type { PlanModel, RoomRect } from '../domain/plan'
import { moveRoom, resizeRoom } from '../lib/geometry/plan-transforms'
import { rebuildWallsFromRooms } from '../lib/geometry/plan-topology'
import { constrainRoom, hasCollision } from '../lib/geometry/plan-constraints'
import { usePlanHistory } from './usePlanHistory'

export type EditMode = 'idle' | 'move' | 'resize'

interface PointerSession {
  roomId: string
  startX: number
  startY: number
  originPlan: PlanModel
  mode: EditMode
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

export function useEditablePlan(baseModel: PlanModel | null, persistedModel: PlanModel | null, onCommit?: (model: PlanModel) => void) {
  const initialModel = useMemo(() => persistedModel ?? baseModel, [persistedModel, baseModel])
  const history = usePlanHistory(initialModel)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const sessionRef = useRef<PointerSession | null>(null)
  const [activeMode, setActiveMode] = useState<EditMode>('idle')
  const pointerAccum = useRef({ dx: 0, dy: 0 })

  useEffect(() => {
    history.resetTo(initialModel)
  }, [initialModel])

  const beginMove = (roomId: string, x: number, y: number) => {
    if (!history.present) return
    setSelectedRoomId(roomId)
    pointerAccum.current = { dx: 0, dy: 0 }
    sessionRef.current = { roomId, startX: x, startY: y, originPlan: history.present, mode: 'move' }
    setActiveMode('move')
  }

  const beginResize = (roomId: string, x: number, y: number) => {
    if (!history.present) return
    setSelectedRoomId(roomId)
    pointerAccum.current = { dx: 0, dy: 0 }
    sessionRef.current = { roomId, startX: x, startY: y, originPlan: history.present, mode: 'resize' }
    setActiveMode('resize')
  }

  const updatePointer = (worldDx: number, worldDy: number) => {
    const s = sessionRef.current
    if (!s) return
    pointerAccum.current.dx += worldDx
    pointerAccum.current.dy += worldDy
    const { dx, dy } = pointerAccum.current
    const drafted = s.mode === 'move'
      ? moveRoom(s.originPlan, s.roomId, dx, dy)
      : resizeRoom(s.originPlan, s.roomId, dx, dy)

    const nextRooms = drafted.rooms.map((room) => room.id === s.roomId ? constrainRoom(room, drafted) : room)
    const activeRoom = nextRooms.find((room) => room.id === s.roomId)
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
      if (selectedRoomId === roomId) setSelectedRoomId(null)
      if (onCommit) onCommit(rebuilt)
    } catch (e) {
      console.error('deleteRoom failed:', e)
    }
  }

  return {
    model: history.present,
    selectedRoomId,
    setSelectedRoomId,
    beginMove,
    beginResize,
    updatePointer,
    endPointer,
    addRoom,
    deleteRoom,
    activeMode,
    timeline: { past: history.past, future: history.future },
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  }
}
