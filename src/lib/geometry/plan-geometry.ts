import type { PlanModel, RoomRect, WallSegment } from '../../domain/plan'

export function roomArea(room: RoomRect): number {
  return Number((room.width * room.height).toFixed(2))
}

export function wallLength(wall: WallSegment): number {
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  return Number(Math.sqrt(dx * dx + dy * dy).toFixed(2))
}

export function planPerimeter(plan: PlanModel): number {
  const external = plan.walls.filter((wall) => wall.type === 'external')
  return Number(external.reduce((sum, wall) => sum + wallLength(wall), 0).toFixed(2))
}

export function footprintArea(plan: PlanModel): number {
  return Number((plan.width * plan.height).toFixed(2))
}

export function grossInternalArea(plan: PlanModel): number {
  return Number(plan.rooms.reduce((sum, room) => sum + roomArea(room), 0).toFixed(2))
}

export function wallMetrics(plan: PlanModel) {
  const externalWalls = plan.walls.filter((wall) => wall.type === 'external')
  const internalWalls = plan.walls.filter((wall) => wall.type === 'internal')

  return {
    externalLength: Number(externalWalls.reduce((sum, wall) => sum + wallLength(wall), 0).toFixed(2)),
    internalLength: Number(internalWalls.reduce((sum, wall) => sum + wallLength(wall), 0).toFixed(2)),
    wallCount: plan.walls.length,
  }
}
