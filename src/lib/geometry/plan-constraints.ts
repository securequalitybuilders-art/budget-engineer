import type { PlanModel, RoomRect } from '../../domain/plan'

const GRID = 0.2

export function snap(value: number, step = GRID): number {
  return Number((Math.round(value / step) * step).toFixed(2))
}

export function roomsOverlap(a: RoomRect, b: RoomRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

export function withinBounds(room: RoomRect, plan: PlanModel): boolean {
  return room.x >= 0 && room.y >= 0 && room.x + room.width <= plan.width && room.y + room.height <= plan.height
}

export function constrainRoom(room: RoomRect, plan: PlanModel): RoomRect {
  const x = Math.max(0, Math.min(plan.width - room.width, snap(room.x)))
  const y = Math.max(0, Math.min(plan.height - room.height, snap(room.y)))
  const width = Math.max(1.8, Math.min(plan.width - x, snap(room.width)))
  const height = Math.max(1.8, Math.min(plan.height - y, snap(room.height)))
  return { ...room, x, y, width, height }
}

export function hasCollision(candidate: RoomRect, rooms: RoomRect[]): boolean {
  return rooms.some((room) => room.id !== candidate.id && roomsOverlap(candidate, room))
}
