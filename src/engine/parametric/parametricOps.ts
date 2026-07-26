import type { PlanModel } from '@/domain/plan'
import { type WallGraph, buildWallGraph, getRoomEdges, type GraphEdge } from '@/engine/parametric/wallGraph'

export interface ValidationResult {
  valid: boolean
  message?: string
}

export type PlanModelChange = 'wall-moved' | 'room-resized' | 'vertex-moved'

export interface ParametricChange {
  type: PlanModelChange
  description: string
  plan: PlanModel
}

function minRoomDimension(m: number = 1.5): number {
  return m
}

function minWallLength(m: number = 0.3): number {
  return m
}

function getWallOrientation(v1: { x: number; y: number }, v2: { x: number; y: number }): 'h' | 'v' {
  const dx = Math.abs(v2.x - v1.x)
  const dy = Math.abs(v2.y - v1.y)
  if (dy < dx * 0.01) return 'h'
  return 'v'
}

function computeProjectedDim(
  wallV1: { x: number; y: number },
  wallV2: { x: number; y: number },
  plan: PlanModel,
  edge: GraphEdge,
  dx: number,
  dy: number,
): number {
  const orient = Math.abs(wallV2.x - wallV1.x) < Math.abs(wallV2.y - wallV1.y) ? 'v' : 'h'
  for (const roomId of edge.roomIds) {
    const room = plan.rooms.find(r => r.id === roomId)
    if (!room) continue
    if (orient === 'h') {
      const isBelow = Math.abs(room.y + room.height - wallV1.y) < 0.01
      const newDim = isBelow ? room.height + dy : room.height
      if (newDim < minRoomDimension()) return newDim
    } else {
      const isLeft = Math.abs(room.x + room.width - wallV1.x) < 0.01
      const newDim = isLeft ? room.width + dx : room.width
      if (newDim < minRoomDimension()) return newDim
    }
  }
  return minRoomDimension()
}

export function validateEdgeMove(
  graph: WallGraph,
  edgeId: string,
  dx: number,
  dy: number,
  plan?: PlanModel,
): ValidationResult {
  const edge = graph.edges.get(edgeId)
  if (!edge) return { valid: false, message: `Edge ${edgeId} not found` }

  const v1 = graph.vertices.get(edge.vertexIds[0])
  const v2 = graph.vertices.get(edge.vertexIds[1])
  if (!v1 || !v2) return { valid: false, message: 'Edge vertices not found' }

  const newLen = Math.hypot((v2.x + dx) - (v1.x + dx), (v2.y + dy) - (v1.y + dy))
  if (newLen < minWallLength()) {
    return { valid: false, message: `New wall length ${newLen.toFixed(2)}m below minimum ${minWallLength()}m` }
  }

  for (const roomId of edge.roomIds) {
    const roomEdges = getRoomEdges(graph, roomId)
    const minDim = computeMinRoomDimension(roomEdges, edgeId, dx, dy)
    if (minDim < minRoomDimension()) {
      return { valid: false, message: `Room ${roomId} dimension would be ${minDim.toFixed(2)}m, below minimum ${minRoomDimension()}m` }
    }
  }

  if (plan) {
    const projDim = computeProjectedDim(v1, v2, plan, edge, dx, dy)
    if (projDim < minRoomDimension()) {
      return { valid: false, message: `Room would be ${projDim.toFixed(2)}m, below minimum ${minRoomDimension()}m` }
    }
  }

  return { valid: true }
}

function computeMinRoomDimension(
  roomEdges: GraphEdge[],
  movedEdgeId: string,
  dx: number,
  dy: number,
): number {
  let minDim = Infinity
  for (const re of roomEdges) {
    if (re.id === movedEdgeId) continue
    const adjDx = re.wallId === movedEdgeId ? Math.abs(dx) : 0
    const adjDy = re.wallId === movedEdgeId ? Math.abs(dy) : 0
    const effLen = re.length - (adjDx + adjDy)
    if (effLen < minDim) minDim = effLen
  }
  return minDim === Infinity ? 10 : minDim
}

export function moveWall(
  plan: PlanModel,
  edgeId: string,
  dx: number,
  dy: number,
): ParametricChange | null {
  const graph = buildWallGraph(plan)
  const edge = graph.edges.get(edgeId)
  if (!edge) return null

  const validation = validateEdgeMove(graph, edgeId, dx, dy, plan)
  if (!validation.valid) return null

  const updatedWalls = plan.walls.map(w => {
    if (w.id === edge.wallId) {
      return {
        ...w,
        start: { x: w.start.x + dx, y: w.start.y + dy },
        end: { x: w.end.x + dx, y: w.end.y + dy },
      }
    }
    return w
  })

  const wallV1 = graph.vertices.get(edge.vertexIds[0])
  const wallV2 = graph.vertices.get(edge.vertexIds[1])
  const wallOrient = (wallV1 && wallV2) ? getWallOrientation(wallV1, wallV2) : 'h'

  const updatedRooms = plan.rooms.map(r => {
    let rx = r.x
    let ry = r.y
    let rw = r.width
    let rh = r.height

    if (edge.roomIds.includes(r.id)) {
      if (wallOrient === 'h') {
        const isBelow = Math.abs(r.y + r.height - wallV1!.y) < 0.01
        if (isBelow) {
          rh += dy
        } else {
          ry += dy
        }
      } else {
        const isLeft = Math.abs(r.x + r.width - wallV1!.x) < 0.01
        if (isLeft) {
          rw += dx
        } else {
          rx += dx
        }
      }
    }

    return { ...r, x: snap05(rx), y: snap05(ry), width: snap05(Math.max(rw, 0.5)), height: snap05(Math.max(rh, 0.5)) }
  })

  return {
    type: 'wall-moved',
    description: `Wall ${edge.wallId} moved by (${dx.toFixed(2)}, ${dy.toFixed(2)})`,
    plan: { ...plan, walls: updatedWalls, rooms: updatedRooms },
  }
}

export function resizeRoom(
  plan: PlanModel,
  roomId: string,
  newWidth: number,
  newHeight: number,
): ParametricChange | null {
  const room = plan.rooms.find(r => r.id === roomId)
  if (!room) return null

  if (newWidth < 0.5 || newHeight < 0.5) return null

  const dw = newWidth - room.width
  const dh = newHeight - room.height

  const updatedRooms = plan.rooms.map(r => {
    if (r.id === roomId) {
      return { ...r, width: snap05(newWidth), height: snap05(newHeight) }
    }
    let nx = r.x
    let ny = r.y
    let nw = r.width
    let nh = r.height
    if (r.x >= room.x + room.width) nx += dw
    if (r.y >= room.y + room.height) ny += dh
    if (r.x + r.width <= room.x && dw > 0) nx -= dw
    if (r.y + r.height <= room.y && dh > 0) ny -= dh
    if (r.x > room.x && r.x < room.x + room.width) nw += dw
    if (r.y > room.y && r.y < room.y + room.height) nh += dh
    return { ...r, x: snap05(nx), y: snap05(ny), width: snap05(Math.max(nw, 0.5)), height: snap05(Math.max(nh, 0.5)) }
  })

  const newPlan: PlanModel = {
    ...plan,
    rooms: updatedRooms,
  }

  return {
    type: 'room-resized',
    description: `Room ${roomId} resized to ${newWidth.toFixed(2)}\u00d7${newHeight.toFixed(2)}`,
    plan: newPlan,
  }
}

export function moveVertex(
  plan: PlanModel,
  vx: number,
  vy: number,
  dx: number,
  dy: number,
): ParametricChange | null {
  const graph = buildWallGraph(plan)

  const targetVertices: string[] = []
  for (const v of graph.vertices.values()) {
    if (Math.abs(v.x - vx) < 0.01 && Math.abs(v.y - vy) < 0.01) {
      targetVertices.push(v.id)
    }
  }

  if (targetVertices.length === 0) return null

  const vertexSet = new Set(targetVertices)
  const affectedEdgeIds = new Set<string>()
  const affectedRoomIds = new Set<string>()

  for (const [edgeId, edge] of graph.edges) {
    if (edge.vertexIds.some(vid => vertexSet.has(vid))) {
      affectedEdgeIds.add(edgeId)
      for (const rid of edge.roomIds) affectedRoomIds.add(rid)
    }
  }

  const updatedWalls = plan.walls.map(w => {
    if (!affectedEdgeIds.has(`e-${w.id}`)) return w
    let ns = { ...w.start }
    let ne = { ...w.end }

    for (const vid of targetVertices) {
      const origV = graph.vertices.get(vid)
      if (!origV) continue

      if (Math.abs(w.start.x - origV.x) < 0.01 && Math.abs(w.start.y - origV.y) < 0.01) {
        ns = { x: ns.x + dx, y: ns.y + dy }
      }
      if (Math.abs(w.end.x - origV.x) < 0.01 && Math.abs(w.end.y - origV.y) < 0.01) {
        ne = { x: ne.x + dx, y: ne.y + dy }
      }
    }

    return { ...w, start: ns, end: ne }
  })

  return {
    type: 'vertex-moved',
    description: `Vertex at (${vx.toFixed(2)}, ${vy.toFixed(2)}) moved by (${dx.toFixed(2)}, ${dy.toFixed(2)})`,
    plan: { ...plan, walls: updatedWalls },
  }
}

export function moveWallInPlan(
  plan: PlanModel,
  wallId: string,
  dx: number,
  dy: number,
): PlanModel | null {
  const edgeId = `e-${wallId}`
  const result = moveWall(plan, edgeId, dx, dy)
  return result?.plan ?? null
}

const GRID = 0.05

export function snap05(v: number): number {
  return Math.round(v / GRID) * GRID
}
