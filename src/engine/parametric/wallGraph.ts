import type { PlanModel, RoomRect } from '@/domain/plan'

export interface GraphVertex {
  id: string
  x: number
  y: number
}

export interface GraphEdge {
  id: string
  vertexIds: [string, string]
  roomIds: string[]
  thickness: number
  type: 'external' | 'internal'
  wallId: string
  length: number
}

export interface GraphFace {
  id: string
  roomId: string
  edgeIds: string[]
  vertexIds: string[]
}

export interface WallGraph {
  vertices: Map<string, GraphVertex>
  edges: Map<string, GraphEdge>
  faces: Map<string, GraphFace>
  adjacency: Map<string, string[]>
}

const VERTEX_SNAP = 0.05

function snapCoord(v: number): number {
  return Math.round(v / VERTEX_SNAP) * VERTEX_SNAP
}

function vertexKey(x: number, y: number): string {
  return `${snapCoord(x)},${snapCoord(y)}`
}

function dist(a: GraphVertex, b: GraphVertex): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function findOrCreateVertex(
  x: number,
  y: number,
  vertices: Map<string, GraphVertex>,
): GraphVertex {
  const key = vertexKey(x, y)
  const existing = vertices.get(key)
  if (existing) return existing

  const v: GraphVertex = { id: `v${key}`, x: snapCoord(x), y: snapCoord(y) }
  vertices.set(key, v)
  vertices.set(v.id, v)
  return v
}

function findAdjacentRooms(roomMap: Map<string, { x: number; y: number; w: number; h: number }>, wall: { start: { x: number; y: number }; end: { x: number; y: number }; type: 'external' | 'internal' }): { leftRooms: string[]; rightRooms: string[] } {
  const leftRooms: string[] = []
  const rightRooms: string[] = []
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y

  if (Math.abs(dy) < 0.01) {
    const x1 = Math.min(wall.start.x, wall.end.x)
    const x2 = Math.max(wall.start.x, wall.end.x)
    const wallY = wall.start.y
    for (const [rid, rr] of roomMap) {
      const rBottom = rr.y + rr.h
      const rTop = rr.y
      if (Math.abs(rBottom - wallY) < 0.01 && overlap1D(x1, x2, rr.x, rr.x + rr.w) > 0.01) {
        leftRooms.push(rid)
      }
      if (Math.abs(rTop - wallY) < 0.01 && overlap1D(x1, x2, rr.x, rr.x + rr.w) > 0.01) {
        rightRooms.push(rid)
      }
    }
  } else if (Math.abs(dx) < 0.01) {
    const y1 = Math.min(wall.start.y, wall.end.y)
    const y2 = Math.max(wall.start.y, wall.end.y)
    const wallX = wall.start.x
    for (const [rid, rr] of roomMap) {
      const rLeft = rr.x
      const rRight = rr.x + rr.w
      if (Math.abs(rLeft - wallX) < 0.01 && overlap1D(y1, y2, rr.y, rr.y + rr.h) > 0.01) {
        leftRooms.push(rid)
      }
      if (Math.abs(rRight - wallX) < 0.01 && overlap1D(y1, y2, rr.y, rr.y + rr.h) > 0.01) {
        rightRooms.push(rid)
      }
    }
  }

  return { leftRooms, rightRooms }
}

function overlap1D(a1: number, a2: number, b1: number, b2: number): number {
  return Math.min(a2, b2) - Math.max(a1, b1)
}

function buildRoomEdgeMap(rooms: RoomRect[]): Map<string, { x: number; y: number; w: number; h: number }> {
  const map = new Map()
  for (const r of rooms) {
    map.set(r.id, { x: r.x, y: r.y, w: r.width, h: r.height })
  }
  return map
}

export function buildWallGraph(plan: PlanModel): WallGraph {
  const vertices = new Map<string, GraphVertex>()
  const edges = new Map<string, GraphEdge>()
  const faces = new Map<string, GraphFace>()
  const adjacency = new Map<string, string[]>()
  const roomMap = buildRoomEdgeMap(plan.rooms)

  for (const wall of plan.walls) {
    const v1 = findOrCreateVertex(wall.start.x, wall.start.y, vertices)
    const v2 = findOrCreateVertex(wall.end.x, wall.end.y, vertices)
    const len = dist(v1, v2)
    if (len < 0.01) continue

    const edgeId = `e-${wall.id}`

    const { leftRooms, rightRooms } = findAdjacentRooms(roomMap, wall)

    const roomIds = [...new Set([...leftRooms, ...rightRooms])]

    const edge: GraphEdge = {
      id: edgeId,
      vertexIds: [v1.id, v2.id],
      roomIds,
      thickness: wall.thickness,
      type: wall.type,
      wallId: wall.id,
      length: len,
    }
    edges.set(edgeId, edge)

    adjacency.set(v1.id, [...(adjacency.get(v1.id) ?? []), edgeId])
    adjacency.set(v2.id, [...(adjacency.get(v2.id) ?? []), edgeId])
  }

  // Build faces from room rectangles
  for (const room of plan.rooms) {
    const faceEdgeIds: string[] = []
    const faceVertexIds: string[] = []

    const roomVertKeys: string[] = [
      vertexKey(room.x, room.y),
      vertexKey(room.x + room.width, room.y),
      vertexKey(room.x + room.width, room.y + room.height),
      vertexKey(room.x, room.y + room.height),
    ]

    for (const vk of roomVertKeys) {
      const v = vertices.get(vk)
      if (v && !faceVertexIds.includes(v.id)) faceVertexIds.push(v.id)
    }

    for (const [edgeId, edge] of edges) {
      if (edge.roomIds.includes(room.id)) {
        if (!faceEdgeIds.includes(edgeId)) faceEdgeIds.push(edgeId)
      }
    }

    if (faceEdgeIds.length > 0) {
      faces.set(room.id, {
        id: `f-${room.id}`,
        roomId: room.id,
        edgeIds: faceEdgeIds,
        vertexIds: faceVertexIds,
      })
    }
  }

  return { vertices, edges, faces, adjacency }
}

export function getSharedWalls(graph: WallGraph, roomIdA: string, roomIdB: string): GraphEdge[] {
  const shared: GraphEdge[] = []
  for (const edge of graph.edges.values()) {
    if (edge.roomIds.includes(roomIdA) && edge.roomIds.includes(roomIdB)) {
      shared.push(edge)
    }
  }
  return shared
}

export function getExternalWalls(graph: WallGraph): GraphEdge[] {
  const ext: GraphEdge[] = []
  for (const edge of graph.edges.values()) {
    if (edge.type === 'external') ext.push(edge)
  }
  return ext
}

export function getRoomEdges(graph: WallGraph, roomId: string): GraphEdge[] {
  const room: GraphEdge[] = []
  for (const edge of graph.edges.values()) {
    if (edge.roomIds.includes(roomId)) {
      room.push(edge)
    }
  }
  return room
}
