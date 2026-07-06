import { useEffect, useMemo, useRef, useState } from 'react'
import type { PlanModel } from '../domain/plan'
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

  return {
    model: history.present,
    selectedRoomId,
    setSelectedRoomId,
    beginMove,
    beginResize,
    updatePointer,
    endPointer,
    activeMode,
    timeline: { past: history.past, future: history.future },
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  }
}
