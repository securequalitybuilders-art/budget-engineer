import type { CadDocument, CadPoint, CadWall } from '../../domain/cad'

function isVertical(wall: CadWall) {
  return Math.abs(wall.start.x - wall.end.x) < 0.01
}

function isHorizontal(wall: CadWall) {
  return Math.abs(wall.start.y - wall.end.y) < 0.01
}

export function trimWallsAtIntersection(doc: CadDocument, firstWallId: string, secondWallId: string): CadDocument {
  const a = doc.walls.find((item) => item.id === firstWallId)
  const b = doc.walls.find((item) => item.id === secondWallId)
  if (!a || !b) return doc

  const point = orthogonalIntersection(a, b)
  if (!point) return doc

  return {
    ...doc,
    walls: doc.walls.map((wall) => {
      if (wall.id === a.id) return trimWallToPoint(wall, point)
      if (wall.id === b.id) return trimWallToPoint(wall, point)
      return wall
    }),
  }
}

export function offsetWallChain(doc: CadDocument, wallId: string, distance = 0.2): CadDocument {
  const seed = doc.walls.find((item) => item.id === wallId)
  if (!seed) return doc
  const chain = doc.walls.filter((wall) => isCollinearConnected(seed, wall))

  return {
    ...doc,
    walls: doc.walls.map((wall) => {
      if (!chain.some((item) => item.id === wall.id)) return wall
      return offsetSingle(wall, distance)
    }),
  }
}

function orthogonalIntersection(a: CadWall, b: CadWall): CadPoint | null {
  if (isHorizontal(a) && isVertical(b)) {
    return { x: b.start.x, y: a.start.y }
  }
  if (isVertical(a) && isHorizontal(b)) {
    return { x: a.start.x, y: b.start.y }
  }
  return null
}

function trimWallToPoint(wall: CadWall, point: CadPoint): CadWall {
  if (isHorizontal(wall)) {
    const left = Math.min(wall.start.x, wall.end.x)
    const right = Math.max(wall.start.x, wall.end.x)
    if (point.x <= (left + right) / 2) return { ...wall, start: { x: point.x, y: wall.start.y } }
    return { ...wall, end: { x: point.x, y: wall.end.y } }
  }
  if (isVertical(wall)) {
    const low = Math.min(wall.start.y, wall.end.y)
    const high = Math.max(wall.start.y, wall.end.y)
    if (point.y <= (low + high) / 2) return { ...wall, start: { x: wall.start.x, y: point.y } }
    return { ...wall, end: { x: wall.end.x, y: point.y } }
  }
  return wall
}

function isCollinearConnected(seed: CadWall, wall: CadWall) {
  if (seed.id === wall.id) return true
  const sameHorizontal = isHorizontal(seed) && isHorizontal(wall) && Math.abs(seed.start.y - wall.start.y) < 0.01
  const sameVertical = isVertical(seed) && isVertical(wall) && Math.abs(seed.start.x - wall.start.x) < 0.01
  if (!sameHorizontal && !sameVertical) return false
  const pts = [seed.start, seed.end]
  return pts.some((p) => (Math.abs(p.x - wall.start.x) < 0.01 && Math.abs(p.y - wall.start.y) < 0.01) || (Math.abs(p.x - wall.end.x) < 0.01 && Math.abs(p.y - wall.end.y) < 0.01))
}

function offsetSingle(wall: CadWall, distance: number): CadWall {
  if (isHorizontal(wall)) return { ...wall, start: { ...wall.start, y: wall.start.y + distance }, end: { ...wall.end, y: wall.end.y + distance } }
  if (isVertical(wall)) return { ...wall, start: { ...wall.start, x: wall.start.x + distance }, end: { ...wall.end, x: wall.end.x + distance } }
  return wall
}
