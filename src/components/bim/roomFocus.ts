import type { PlanModel } from '@/domain/plan'
import { DEFAULT_STOREY_HEIGHT } from '@/adapters/planTo3d'

export interface RoomFocus {
  target: [number, number, number]
  cameraPos: [number, number, number]
}

export function computeRoomFocus(
  plan: PlanModel | null | undefined,
  roomId: string | null | undefined,
  storeyIndex?: number,
): RoomFocus | null {
  if (!plan || !roomId) return null
  const room = plan.rooms.find(r => r.id === roomId)
  if (!room) return null

  const si = storeyIndex ?? 0
  const cx = room.x + room.width / 2
  const cz = room.y + room.height / 2
  const eyeY = si * DEFAULT_STOREY_HEIGHT + 1.5

  const target: [number, number, number] = [cx, eyeY, cz]

  const roomSize = Math.max(room.width, room.height, 2)
  const dist = roomSize * 1.5

  const camPos: [number, number, number] = [
    cx + dist * 0.6,
    eyeY + dist * 0.3,
    cz + dist * 0.6,
  ]

  return { target, cameraPos: camPos }
}
