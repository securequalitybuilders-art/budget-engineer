import type { Opening, PlanModel, RoomRect, WallSegment } from '../../domain/plan'

const uid = () => Math.random().toString(36).slice(2, 10)

function same(a: number, b: number, tolerance = 0.02) {
  return Math.abs(a - b) <= tolerance
}

function overlap1D(a1: number, a2: number, b1: number, b2: number) {
  const start = Math.max(Math.min(a1, a2), Math.min(b1, b2))
  const end = Math.min(Math.max(a1, a2), Math.max(b1, b2))
  return end > start ? { start, end } : null
}

export function rebuildWallsFromRooms(plan: PlanModel): PlanModel {
  const walls: WallSegment[] = []
  const openings: Opening[] = []
  const width = plan.width
  const height = plan.height

  walls.push(
    { id: uid(), start: { x: 0, y: 0 }, end: { x: width, y: 0 }, thickness: 0.2, type: 'external' },
    { id: uid(), start: { x: width, y: 0 }, end: { x: width, y: height }, thickness: 0.2, type: 'external' },
    { id: uid(), start: { x: width, y: height }, end: { x: 0, y: height }, thickness: 0.2, type: 'external' },
    { id: uid(), start: { x: 0, y: height }, end: { x: 0, y: 0 }, thickness: 0.2, type: 'external' },
  )

  for (let i = 0; i < plan.rooms.length; i++) {
    for (let j = i + 1; j < plan.rooms.length; j++) {
      const a = plan.rooms[i]
      const b = plan.rooms[j]

      if (same(a.x + a.width, b.x) || same(b.x + b.width, a.x)) {
        const x = same(a.x + a.width, b.x) ? a.x + a.width : b.x + b.width
        const overlap = overlap1D(a.y, a.y + a.height, b.y, b.y + b.height)
        if (overlap) {
          const wall = { id: uid(), start: { x, y: overlap.start }, end: { x, y: overlap.end }, thickness: 0.12, type: 'internal' as const }
          walls.push(wall)
          openings.push({ id: uid(), wallId: wall.id, kind: 'door', offset: 0.5, width: 0.9 })
        }
      }

      if (same(a.y + a.height, b.y) || same(b.y + b.height, a.y)) {
        const y = same(a.y + a.height, b.y) ? a.y + a.height : b.y + b.height
        const overlap = overlap1D(a.x, a.x + a.width, b.x, b.x + b.width)
        if (overlap) {
          const wall = { id: uid(), start: { x: overlap.start, y }, end: { x: overlap.end, y }, thickness: 0.12, type: 'internal' as const }
          walls.push(wall)
          openings.push({ id: uid(), wallId: wall.id, kind: 'door', offset: 0.5, width: 0.9 })
        }
      }
    }
  }

  const externalWalls = walls.filter((wall) => wall.type === 'external')
  externalWalls.forEach((wall, index) => {
    openings.push({ id: uid(), wallId: wall.id, kind: index === 2 ? 'door' : 'window', offset: 0.35 + (index % 2) * 0.15, width: index === 2 ? 1.2 : 1.5 })
  })

  return {
    ...plan,
    walls,
    openings,
  }
}

export function sortRoomsForDisplay(rooms: RoomRect[]): RoomRect[] {
  return [...rooms].sort((a, b) => a.y - b.y || a.x - b.x)
}
