import type { CadDocument, CadPoint, CadWall } from '../../domain/cad'
import type { RoomRect } from '../../domain/plan'

const uid = () => Math.random().toString(36).slice(2, 10)
const near = (a: number, b: number, tol = 0.12) => Math.abs(a - b) <= tol

export function splitWallAtMidpoint(doc: CadDocument, wallId: string): CadDocument {
  const wall = doc.walls.find((item) => item.id === wallId)
  if (!wall) return doc

  const mid = {
    x: Number(((wall.start.x + wall.end.x) / 2).toFixed(2)),
    y: Number(((wall.start.y + wall.end.y) / 2).toFixed(2)),
  }

  const a: CadWall = { ...wall, id: uid(), end: mid }
  const b: CadWall = { ...wall, id: uid(), start: mid }

  return {
    ...doc,
    walls: [...doc.walls.filter((item) => item.id !== wallId), a, b],
    openings: doc.openings.filter((opening) => opening.wallId !== wallId),
  }
}

export function joinWalls(doc: CadDocument, firstWallId: string, secondWallId: string): CadDocument {
  const a = doc.walls.find((item) => item.id === firstWallId)
  const b = doc.walls.find((item) => item.id === secondWallId)
  if (!a || !b) return doc

  const horizontal = near(a.start.y, a.end.y) && near(b.start.y, b.end.y) && near(a.start.y, b.start.y)
  const vertical = near(a.start.x, a.end.x) && near(b.start.x, b.end.x) && near(a.start.x, b.start.x)
  if (!horizontal && !vertical) return doc

  const points = [a.start, a.end, b.start, b.end]
  const start = horizontal
    ? points.reduce((min, p) => (p.x < min.x ? p : min), points[0])
    : points.reduce((min, p) => (p.y < min.y ? p : min), points[0])
  const end = horizontal
    ? points.reduce((max, p) => (p.x > max.x ? p : max), points[0])
    : points.reduce((max, p) => (p.y > max.y ? p : max), points[0])

  const merged: CadWall = {
    ...a,
    id: uid(),
    start: { ...start },
    end: { ...end },
    thickness: Math.max(a.thickness, b.thickness),
    structuralRole: a.structuralRole === 'external' || b.structuralRole === 'external' ? 'external' : 'internal',
  }

  return {
    ...doc,
    walls: [...doc.walls.filter((item) => item.id !== firstWallId && item.id !== secondWallId), merged],
    openings: doc.openings.filter((opening) => opening.wallId !== firstWallId && opening.wallId !== secondWallId),
  }
}

export function reconstructRoomsFromWalls(doc: CadDocument): RoomRect[] {
  const walls = doc.walls.filter((wall) => wall.floorId === doc.activeFloorId)
  const horizontals = walls.filter((wall) => near(wall.start.y, wall.end.y))
  const verticals = walls.filter((wall) => near(wall.start.x, wall.end.x))
  const rooms: RoomRect[] = []

  for (let i = 0; i < horizontals.length; i++) {
    for (let j = i + 1; j < horizontals.length; j++) {
      const top = horizontals[i]
      const bottom = horizontals[j]
      const y1 = Math.min(top.start.y, bottom.start.y)
      const y2 = Math.max(top.start.y, bottom.start.y)
      const leftX = Math.max(Math.min(top.start.x, top.end.x), Math.min(bottom.start.x, bottom.end.x))
      const rightX = Math.min(Math.max(top.start.x, top.end.x), Math.max(bottom.start.x, bottom.end.x))
      if (rightX - leftX < 1.5 || y2 - y1 < 1.5) continue

      const hasLeft = verticals.some((wall) => near(wall.start.x, leftX) && segmentCovers(wall.start.y, wall.end.y, y1, y2))
      const hasRight = verticals.some((wall) => near(wall.start.x, rightX) && segmentCovers(wall.start.y, wall.end.y, y1, y2))
      if (!hasLeft || !hasRight) continue

      const candidate: RoomRect = {
        id: uid(),
        name: `Room ${rooms.length + 1}`,
        x: Number(leftX.toFixed(2)),
        y: Number(y1.toFixed(2)),
        width: Number((rightX - leftX).toFixed(2)),
        height: Number((y2 - y1).toFixed(2)),
        color: '#6366f1',
      }

      if (!rooms.some((room) => near(room.x, candidate.x) && near(room.y, candidate.y) && near(room.width, candidate.width) && near(room.height, candidate.height))) {
        rooms.push(candidate)
      }
    }
  }

  return rooms
}

function segmentCovers(a: number, b: number, start: number, end: number) {
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  return min <= start + 0.05 && max >= end - 0.05
}

export function wallMidpoint(wall: CadWall): CadPoint {
  return {
    x: Number(((wall.start.x + wall.end.x) / 2).toFixed(2)),
    y: Number(((wall.start.y + wall.end.y) / 2).toFixed(2)),
  }
}
