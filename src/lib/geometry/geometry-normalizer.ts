import type { RoomRect } from '../../domain/plan'

const SNAP_GRID = 0.05
const OVERLAP_EPS = 0.01

export function snap(v: number, grid: number = SNAP_GRID): number {
  return Math.round(v / grid) * grid
}

export interface NormalizedRoom extends RoomRect {
  snappedX: number
  snappedY: number
  snappedW: number
  snappedH: number
}

export function normalizeRooms(rooms: RoomRect[], _width: number, _height: number): NormalizedRoom[] {
  return rooms.map(r => {
    const snappedX = snap(r.x)
    const snappedY = snap(r.y)
    const snappedW = snap(r.width)
    const snappedH = snap(r.height)
    return {
      ...r,
      snappedX,
      snappedY,
      snappedW,
      snappedH,
    }
  })
}

export function snapCollection(
  rooms: NormalizedRoom[],
  width: number,
  height: number,
): { rooms: NormalizedRoom[]; width: number; height: number } {
  const allX = new Set<number>([0, snap(width)])
  const allY = new Set<number>([0, snap(height)])
  for (const r of rooms) {
    allX.add(r.snappedX)
    allX.add(snap(r.snappedX + r.snappedW))
    allY.add(r.snappedY)
    allY.add(snap(r.snappedY + r.snappedH))
  }

  const sortedX = [...allX].sort((a, b) => a - b)
  const sortedY = [...allY].sort((a, b) => a - b)

  const canonicalX = new Map<number, number>()
  const canonicalY = new Map<number, number>()
  for (const v of sortedX) canonicalX.set(v, v)
  for (const v of sortedY) canonicalY.set(v, v)

  for (const r of rooms) {
    r.snappedX = canonicalX.get(r.snappedX) ?? snap(r.x)
    r.snappedY = canonicalY.get(r.snappedY) ?? snap(r.y)
    r.snappedW = Math.max(0.5, (canonicalX.get(snap(r.snappedX + r.snappedW)) ?? snap(r.x + r.width)) - r.snappedX)
    r.snappedH = Math.max(0.5, (canonicalY.get(snap(r.snappedY + r.snappedH)) ?? snap(r.y + r.height)) - r.snappedY)
  }

  return {
    rooms,
    width: snap(width),
    height: snap(height),
  }
}

export function detectOverlaps(rooms: NormalizedRoom[]): { roomA: string; roomB: string }[] {
  const overlaps: { roomA: string; roomB: string }[] = []
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i]
      const b = rooms[j]
      if (
        a.snappedX + a.snappedW > b.snappedX + OVERLAP_EPS &&
        b.snappedX + b.snappedW > a.snappedX + OVERLAP_EPS &&
        a.snappedY + a.snappedH > b.snappedY + OVERLAP_EPS &&
        b.snappedY + b.snappedH > a.snappedY + OVERLAP_EPS
      ) {
        overlaps.push({ roomA: a.id, roomB: b.id })
      }
    }
  }
  return overlaps
}

export function resolveOverlaps(
  rooms: NormalizedRoom[],
): { rooms: NormalizedRoom[]; resolved: number; warnings: string[] } {
  const warnings: string[] = []
  let resolved = 0
  const result = rooms.map(r => ({ ...r }))

  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const a = result[i]
      const b = result[j]
      if (
        a.snappedX + a.snappedW > b.snappedX + OVERLAP_EPS &&
        b.snappedX + b.snappedW > a.snappedX + OVERLAP_EPS &&
        a.snappedY + a.snappedH > b.snappedY + OVERLAP_EPS &&
        b.snappedY + b.snappedH > a.snappedY + OVERLAP_EPS
      ) {
        const overlapX = Math.min(a.snappedX + a.snappedW, b.snappedX + b.snappedW) - Math.max(a.snappedX, b.snappedX)
        const overlapY = Math.min(a.snappedY + a.snappedH, b.snappedY + b.snappedH) - Math.max(a.snappedY, b.snappedY)
        if (overlapX < 0.2 && overlapY < 0.2) {
          if (overlapX < overlapY) {
            result[j].snappedX = a.snappedX + a.snappedW
          } else {
            result[j].snappedY = a.snappedY + a.snappedH
          }
          resolved++
          warnings.push(`Resolved minor overlap between "${a.name}" and "${b.name}"`)
        } else {
          warnings.push(`Cannot resolve overlap between "${a.name}" and "${b.name}" — rejecting layout`)
        }
      }
    }
  }

  return { rooms: result, resolved, warnings }
}
