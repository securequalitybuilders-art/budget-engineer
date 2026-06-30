import { useEffect, useMemo, useState } from 'react'
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
  const [session, setSession] = useState<PointerSession | null>(null)

  useEffect(() => {
    history.resetTo(initialModel)
  }, [initialModel])

  const beginMove = (roomId: string, x: number, y: number) => {
    if (!history.present) return
    setSelectedRoomId(roomId)
    setSession({ roomId, startX: x, startY: y, originPlan: history.present, mode: 'move' })
  }

  const beginResize = (roomId: string, x: number, y: number) => {
    if (!history.present) return
    setSelectedRoomId(roomId)
    setSession({ roomId, startX: x, startY: y, originPlan: history.present, mode: 'resize' })
  }

  const updatePointer = (worldDx: number, worldDy: number) => {
    if (!session) return
    const drafted = session.mode === 'move'
      ? moveRoom(session.originPlan, session.roomId, worldDx, worldDy)
      : resizeRoom(session.originPlan, session.roomId, worldDx, worldDy)

    const nextRooms = drafted.rooms.map((room) => room.id === session.roomId ? constrainRoom(room, drafted) : room)
    const activeRoom = nextRooms.find((room) => room.id === session.roomId)
    if (!activeRoom) return
    if (hasCollision(activeRoom, nextRooms)) return

    history.set(rebuildWallsFromRooms({ ...drafted, rooms: nextRooms }))
  }

  const endPointer = () => {
    if (history.present && session && onCommit) onCommit(history.present)
    setSession(null)
  }

  return {
    model: history.present,
    selectedRoomId,
    setSelectedRoomId,
    beginMove,
    beginResize,
    updatePointer,
    endPointer,
    activeMode: session?.mode ?? 'idle',
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  }
}
