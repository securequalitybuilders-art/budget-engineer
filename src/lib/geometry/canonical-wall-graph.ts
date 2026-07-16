import type { WallSegment } from '../../domain/plan'
import type { RoomPolygon } from './room-polygons'
import type { NormalizedBoundary } from './shared-boundaries'

const uid = () => Math.random().toString(36).slice(2, 10)

export interface CanonicalWallGraph {
  walls: WallSegment[]
  adjacency: NormalizedBoundary[]
  externalWalls: WallSegment[]
}

export function buildCanonicalWallGraph(
  _polygons: RoomPolygon[],
  boundaries: NormalizedBoundary[],
  buildingWidth: number,
  buildingHeight: number,
  wallThickness: number,
): CanonicalWallGraph {
  const extWalls = outerWalls(buildingWidth, buildingHeight, wallThickness)
  const intWalls = deduplicateWalls(boundaries.map(b => b.wall), boundaries)
  return {
    walls: [...extWalls, ...intWalls],
    adjacency: boundaries,
    externalWalls: extWalls,
  }
}

function outerWalls(width: number, height: number, thickness: number): WallSegment[] {
  return [
    { id: uid(), start: { x: 0, y: 0 }, end: { x: width, y: 0 }, thickness, type: 'external' },
    { id: uid(), start: { x: width, y: 0 }, end: { x: width, y: height }, thickness, type: 'external' },
    { id: uid(), start: { x: width, y: height }, end: { x: 0, y: height }, thickness, type: 'external' },
    { id: uid(), start: { x: 0, y: height }, end: { x: 0, y: 0 }, thickness, type: 'external' },
  ]
}

function wallKey(w: WallSegment): string {
  return `${w.start.x.toFixed(2)},${w.start.y.toFixed(2)}:${w.end.x.toFixed(2)},${w.end.y.toFixed(2)}`
}

function deduplicateWalls(walls: WallSegment[], boundaries: NormalizedBoundary[]): WallSegment[] {
  const seen = new Set<string>()
  const result: WallSegment[] = []
  for (const w of walls) {
    const key = wallKey(w)
    const revKey = `${w.end.x.toFixed(2)},${w.end.y.toFixed(2)}:${w.start.x.toFixed(2)},${w.start.y.toFixed(2)}`
    if (!seen.has(key) && !seen.has(revKey)) {
      seen.add(key)
      result.push(w)
    }
  }

  for (const poly of collectRoomPolygons(boundaries)) {
    for (const edge of [poly.rightEdge, poly.bottomEdge]) {
      const key = wallKey(edge)
      const revKey = `${edge.end.x.toFixed(2)},${edge.end.y.toFixed(2)}:${edge.start.x.toFixed(2)},${edge.start.y.toFixed(2)}`
      if (!seen.has(key) && !seen.has(revKey)) {
        seen.add(key)
        result.push({ id: uid(), start: edge.start, end: edge.end, thickness: 0.12, type: 'internal' })
      }
    }
  }

  return result
}

function collectRoomPolygons(
  boundaries: NormalizedBoundary[],
): { rightEdge: WallSegment; bottomEdge: WallSegment }[] {
  const roomIds = new Set<string>()
  for (const b of boundaries) {
    roomIds.add(b.roomAId)
    roomIds.add(b.roomBId)
  }
  return []
}

export function findExternalWallsTouchingRoom(
  room: RoomPolygon,
  externalWalls: WallSegment[],
  eps = 0.05,
): WallSegment[] {
  const touching: WallSegment[] = []
  for (const ext of externalWalls) {
    const isVertical = Math.abs(ext.start.x - ext.end.x) < eps
    if (isVertical) {
      if (Math.abs(ext.start.x - room.x) < eps || Math.abs(ext.start.x - (room.x + room.width)) < eps) {
        const wallMinY = Math.min(ext.start.y, ext.end.y)
        const wallMaxY = Math.max(ext.start.y, ext.end.y)
        const overlap = Math.min(wallMaxY, room.y + room.height) - Math.max(wallMinY, room.y)
        if (overlap >= 0.6) touching.push(ext)
      }
    } else {
      if (Math.abs(ext.start.y - room.y) < eps || Math.abs(ext.start.y - (room.y + room.height)) < eps) {
        const wallMinX = Math.min(ext.start.x, ext.end.x)
        const wallMaxX = Math.max(ext.start.x, ext.end.x)
        const overlap = Math.min(wallMaxX, room.x + room.width) - Math.max(wallMinX, room.x)
        if (overlap >= 0.6) touching.push(ext)
      }
    }
  }
  return touching
}
