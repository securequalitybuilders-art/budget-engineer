import type { PlanModel, RoomRect } from '../../domain/plan'

export function moveRoom(plan: PlanModel, roomId: string, dx: number, dy: number): PlanModel {
  return {
    ...plan,
    rooms: plan.rooms.map((room) =>
      room.id === roomId
        ? {
            ...room,
            x: round(clamp(room.x + dx, 0, Math.max(0, plan.width - room.width))),
            y: round(clamp(room.y + dy, 0, Math.max(0, plan.height - room.height))),
          }
        : room,
    ),
  }
}

export function resizeRoom(plan: PlanModel, roomId: string, dx: number, dy: number): PlanModel {
  return {
    ...plan,
    rooms: plan.rooms.map((room) => {
      if (room.id !== roomId) return room
      const nextWidth = clamp(room.width + dx, 1.8, plan.width - room.x)
      const nextHeight = clamp(room.height + dy, 1.8, plan.height - room.y)
      return {
        ...room,
        width: round(nextWidth),
        height: round(nextHeight),
      }
    }),
  }
}

export interface AdjacentRoom {
  room: RoomRect
  side: 'left' | 'right' | 'top' | 'bottom'
}

const ADJ_TOLERANCE = 0.15

function roomsHorizontalOverlap(a: RoomRect, b: RoomRect): boolean {
  return b.y + b.height > a.y + ADJ_TOLERANCE && b.y < a.y + a.height - ADJ_TOLERANCE
}

function roomsVerticalOverlap(a: RoomRect, b: RoomRect): boolean {
  return b.x + b.width > a.x + ADJ_TOLERANCE && b.x < a.x + a.width - ADJ_TOLERANCE
}

export function findAdjacentOnRight(rooms: RoomRect[], room: RoomRect): AdjacentRoom | null {
  for (const other of rooms) {
    if (other.id === room.id) continue
    if (Math.abs(other.x - (room.x + room.width)) > ADJ_TOLERANCE) continue
    if (!roomsHorizontalOverlap(room, other)) continue
    return { room: other, side: 'right' }
  }
  return null
}

export function findAdjacentOnLeft(rooms: RoomRect[], room: RoomRect): AdjacentRoom | null {
  for (const other of rooms) {
    if (other.id === room.id) continue
    if (Math.abs(room.x - (other.x + other.width)) > ADJ_TOLERANCE) continue
    if (!roomsHorizontalOverlap(room, other)) continue
    return { room: other, side: 'left' }
  }
  return null
}

export function findAdjacentOnBottom(rooms: RoomRect[], room: RoomRect): AdjacentRoom | null {
  for (const other of rooms) {
    if (other.id === room.id) continue
    if (Math.abs(other.y - (room.y + room.height)) > ADJ_TOLERANCE) continue
    if (!roomsVerticalOverlap(room, other)) continue
    return { room: other, side: 'bottom' }
  }
  return null
}

export function findAdjacentOnTop(rooms: RoomRect[], room: RoomRect): AdjacentRoom | null {
  for (const other of rooms) {
    if (other.id === room.id) continue
    if (Math.abs(room.y - (other.y + other.height)) > ADJ_TOLERANCE) continue
    if (!roomsVerticalOverlap(room, other)) continue
    return { room: other, side: 'top' }
  }
  return null
}

export function parametricResize(plan: PlanModel, roomId: string, dx: number, dy: number): PlanModel {
  const target = plan.rooms.find(r => r.id === roomId)
  if (!target) return plan

  const minDim = 1.8
  let actualDx = dx
  let actualDy = dy

  const adjRight = findAdjacentOnRight(plan.rooms, target)
  const adjBottom = findAdjacentOnBottom(plan.rooms, target)

  if (adjRight && actualDx > 0) {
    actualDx = Math.min(actualDx, adjRight.room.width - minDim)
  }
  if (adjBottom && actualDy > 0) {
    actualDy = Math.min(actualDy, adjBottom.room.height - minDim)
  }

  const newWidth = clamp(target.width + actualDx, minDim, plan.width - target.x)
  const newHeight = clamp(target.height + actualDy, minDim, plan.height - target.y)
  const effectiveDx = newWidth - target.width
  const effectiveDy = newHeight - target.height

  return {
    ...plan,
    rooms: plan.rooms.map((room) => {
      if (room.id === roomId) {
        return { ...room, width: round(newWidth), height: round(newHeight) }
      }
      if (adjRight && room.id === adjRight.room.id) {
        return {
          ...room,
          x: round(room.x + effectiveDx),
          width: round(room.width - effectiveDx),
        }
      }
      if (adjBottom && room.id === adjBottom.room.id) {
        return {
          ...room,
          y: round(room.y + effectiveDy),
          height: round(room.height - effectiveDy),
        }
      }
      return room
    }),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number) {
  return Number(value.toFixed(2))
}
