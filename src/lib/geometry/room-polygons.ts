import type { Point } from '../../domain/plan'
import type { NormalizedRoom } from './geometry-normalizer'

export const enum EdgeSide { Left = 'left', Right = 'right', Top = 'top', Bottom = 'bottom' }

export interface EdgeSegment {
  side: EdgeSide
  start: Point
  end: Point
  length: number
}

export interface RoomPolygon {
  roomId: string
  roomName: string
  x: number
  y: number
  width: number
  height: number
  segments: EdgeSegment[]
}

function buildSegments(x: number, y: number, w: number, h: number): EdgeSegment[] {
  return [
    { side: EdgeSide.Top, start: { x, y }, end: { x: x + w, y }, length: w },
    { side: EdgeSide.Right, start: { x: x + w, y }, end: { x: x + w, y: y + h }, length: h },
    { side: EdgeSide.Bottom, start: { x: x + w, y: y + h }, end: { x, y: y + h }, length: w },
    { side: EdgeSide.Left, start: { x, y: y + h }, end: { x, y }, length: h },
  ]
}

export function roomToPolygon(room: NormalizedRoom): RoomPolygon {
  return {
    roomId: room.id,
    roomName: room.name,
    x: room.snappedX,
    y: room.snappedY,
    width: room.snappedW,
    height: room.snappedH,
    segments: buildSegments(room.snappedX, room.snappedY, room.snappedW, room.snappedH),
  }
}

export function buildPolygons(rooms: NormalizedRoom[]): RoomPolygon[] {
  return rooms.map(roomToPolygon)
}

const SNAP = 0.05

function minMax(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a]
}

export function sharedSegment(a: RoomPolygon, b: RoomPolygon): EdgeSegment | null {
  for (const sa of a.segments) {
    for (const sb of b.segments) {
      if (sa.side === sb.side) continue
      const isVertical = Math.abs(sa.start.x - sa.end.x) < SNAP
      if (isVertical) {
        if (Math.abs(sa.start.x - sb.start.x) >= SNAP) continue
        const [aMin, aMax] = minMax(sa.start.y, sa.end.y)
        const [bMin, bMax] = minMax(sb.start.y, sb.end.y)
        const overlapStart = Math.max(aMin, bMin)
        const overlapEnd = Math.min(aMax, bMax)
        const overlap = overlapEnd - overlapStart
        if (overlap >= 0.6) {
          return {
            side: sa.side,
            start: { x: sa.start.x, y: overlapStart },
            end: { x: sa.start.x, y: overlapEnd },
            length: overlap,
          }
        }
      } else {
        if (Math.abs(sa.start.y - sb.start.y) >= SNAP) continue
        const [aMin, aMax] = minMax(sa.start.x, sa.end.x)
        const [bMin, bMax] = minMax(sb.start.x, sb.end.x)
        const overlapStart = Math.max(aMin, bMin)
        const overlapEnd = Math.min(aMax, bMax)
        const overlap = overlapEnd - overlapStart
        if (overlap >= 0.6) {
          return {
            side: sa.side,
            start: { x: overlapStart, y: sa.start.y },
            end: { x: overlapEnd, y: sa.start.y },
            length: overlap,
          }
        }
      }
    }
  }
  return null
}
