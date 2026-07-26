import type { Point } from '../../domain/plan'

export interface Polygon2D {
  vertices: Point[]
}

export interface RoomPolygon {
  roomId: string
  roomName: string
  polygon: Polygon2D
}

export interface SharedEdge {
  roomAId: string
  roomBId: string
  edge: { start: Point; end: Point }
  sharedLength: number
  wallId: string
}

const uid = () => Math.random().toString(36).slice(2, 10)

function rectToPolygon(x: number, y: number, w: number, h: number): Polygon2D {
  return {
    vertices: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
  }
}

export function toRoomPolygon(roomId: string, roomName: string, x: number, y: number, w: number, h: number): RoomPolygon {
  return { roomId, roomName, polygon: rectToPolygon(x, y, w, h) }
}

function segmentOverlap(a1: Point, a2: Point, b1: Point, b2: Point, eps = 0.01): { overlap: number; start: Point; end: Point } | null {
  const aHoriz = Math.abs(a1.y - a2.y) < eps
  const bHoriz = Math.abs(b1.y - b2.y) < eps

  if (aHoriz && bHoriz && Math.abs(a1.y - b1.y) < eps) {
    const lo = Math.max(Math.min(a1.x, a2.x), Math.min(b1.x, b2.x))
    const hi = Math.min(Math.max(a1.x, a2.x), Math.max(b1.x, b2.x))
    if (hi - lo >= eps) {
      return { overlap: hi - lo, start: { x: lo, y: a1.y }, end: { x: hi, y: a1.y } }
    }
    return null
  }

  if (!aHoriz && !bHoriz && Math.abs(a1.x - b1.x) < eps) {
    const lo = Math.max(Math.min(a1.y, a2.y), Math.min(b1.y, b2.y))
    const hi = Math.min(Math.max(a1.y, a2.y), Math.max(b1.y, b2.y))
    if (hi - lo >= eps) {
      return { overlap: hi - lo, start: { x: a1.x, y: lo }, end: { x: a1.x, y: hi } }
    }
    return null
  }

  return null
}

export function computeSharedEdges(rooms: RoomPolygon[]): SharedEdge[] {
  const edges: SharedEdge[] = []
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const shared = findSharedEdge(rooms[i], rooms[j])
      if (shared) edges.push(shared)
    }
  }
  return edges
}

function findSharedEdge(a: RoomPolygon, b: RoomPolygon): SharedEdge | null {
  const vertsA = a.polygon.vertices
  const vertsB = b.polygon.vertices
  const eps = 0.01

  for (let ai = 0; ai < vertsA.length; ai++) {
    const aj = (ai + 1) % vertsA.length
    const a1 = vertsA[ai]
    const a2 = vertsA[aj]

    for (let bi = 0; bi < vertsB.length; bi++) {
      const bj = (bi + 1) % vertsB.length
      const b1 = vertsB[bi]
      const b2 = vertsB[bj]

      const result = segmentOverlap(a1, a2, b1, b2, eps)
      if (result && result.overlap >= 0.3) {
        return {
          roomAId: a.roomId,
          roomBId: b.roomId,
          edge: { start: result.start, end: result.end },
          sharedLength: result.overlap,
          wallId: uid(),
        }
      }
    }
  }

  return null
}

export function buildInternalWallsFromAdjacency(rooms: RoomPolygon[], existingEdges: SharedEdge[]): {
  walls: { id: string; start: Point; end: Point; thickness: number; type: 'internal' }[]
  adjacency: SharedEdge[]
} {
  const walls: { id: string; start: Point; end: Point; thickness: number; type: 'internal' }[] = []
  const seen = new Set<string>()

  for (const edge of existingEdges) {
    const key = `${edge.edge.start.x.toFixed(2)},${edge.edge.start.y.toFixed(2)}:${edge.edge.end.x.toFixed(2)},${edge.edge.end.y.toFixed(2)}`
    const revKey = `${edge.edge.end.x.toFixed(2)},${edge.edge.end.y.toFixed(2)}:${edge.edge.start.x.toFixed(2)},${edge.edge.start.y.toFixed(2)}`
    if (!seen.has(key) && !seen.has(revKey)) {
      seen.add(key)
      walls.push({
        id: edge.wallId,
        start: edge.edge.start,
        end: edge.edge.end,
        thickness: 0.12,
        type: 'internal',
      })
    }
  }

  // Add right/bottom edges for rooms with no adjacency on those sides
  for (const room of rooms) {
    const verts = room.polygon.vertices
    for (let i = 0; i < verts.length; i++) {
      const j = (i + 1) % verts.length
      const edgeStart = verts[i]
      const edgeEnd = verts[j]
      const isRightOrBottom = (Math.abs(edgeStart.x - edgeEnd.x) < 0.01 && Math.abs(edgeStart.y - edgeEnd.y) > 0.3) ||
        (Math.abs(edgeStart.y - edgeEnd.y) < 0.01 && Math.abs(edgeStart.x - edgeEnd.x) > 0.3)

      if (!isRightOrBottom) continue

      const key = `${edgeStart.x.toFixed(2)},${edgeStart.y.toFixed(2)}:${edgeEnd.x.toFixed(2)},${edgeEnd.y.toFixed(2)}`
      const revKey = `${edgeEnd.x.toFixed(2)},${edgeEnd.y.toFixed(2)}:${edgeStart.x.toFixed(2)},${edgeStart.y.toFixed(2)}`
      if (!seen.has(key) && !seen.has(revKey)) {
        seen.add(key)
        walls.push({
          id: uid(),
          start: edgeStart,
          end: edgeEnd,
          thickness: 0.12,
          type: 'internal',
        })
      }
    }
  }

  return { walls, adjacency: existingEdges }
}

export function findRoomAtPoint(rooms: RoomPolygon[], x: number, y: number): RoomPolygon | null {
  for (const room of rooms) {
    const verts = room.polygon.vertices
    let inside = false
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i].x, yi = verts[i].y
      const xj = verts[j].x, yj = verts[j].y
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      if (intersect) inside = !inside
    }
    if (inside) return room
  }
  return null
}

export interface AdjacencyMap {
  [roomId: string]: { roomId: string; wallId: string; sharedLength: number }[]
}

export function buildAdjacencyMap(edges: SharedEdge[]): AdjacencyMap {
  const map: AdjacencyMap = {}
  for (const e of edges) {
    if (!map[e.roomAId]) map[e.roomAId] = []
    if (!map[e.roomBId]) map[e.roomBId] = []
    map[e.roomAId].push({ roomId: e.roomBId, wallId: e.wallId, sharedLength: e.sharedLength })
    map[e.roomBId].push({ roomId: e.roomAId, wallId: e.wallId, sharedLength: e.sharedLength })
  }
  return map
}
