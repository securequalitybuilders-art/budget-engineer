import type { PlanModel } from '../../domain/plan'

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number) {
  return Number(value.toFixed(2))
}
