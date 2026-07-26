import type { RoomRect, WallSegment, Opening } from '../../domain/plan'
import { getMinimumDimensions, classifyRoom, isHabitable } from '../geometry/plan-intelligence'

export interface RepairResult {
  rooms: RoomRect[]
  walls: WallSegment[]
  openings: Opening[]
  repairsApplied: string[]
  needsRevalidation: boolean
}

export function repairRoomMinimums(rooms: RoomRect[]): { rooms: RoomRect[]; repairs: string[] } {
  const repairs: string[] = []

  for (const room of rooms) {
    const dims = getMinimumDimensions(room.name)
    let changed = false

    if (room.width < dims.minWidth - 0.01) {
      room.width = dims.minWidth
      changed = true
    }
    if (room.height < dims.minDepth - 0.01) {
      room.height = dims.minDepth
      changed = true
    }

    if (changed) {
      repairs.push(`Repaired "${room.name}": expanded to minimum ${dims.minWidth}x${dims.minDepth}m`)
    }
  }

  return { rooms, repairs }
}

export function repairCorridorWidth(rooms: RoomRect[], minCorridorWidth = 1.2): { rooms: RoomRect[]; repairs: string[] } {
  const repairs: string[] = []

  for (const room of rooms) {
    const role = classifyRoom(room.name)
    if (role !== 'circulation') continue

    if (room.width < minCorridorWidth && room.width < room.height) {
      room.width = minCorridorWidth
      repairs.push(`Repaired "${room.name}": width expanded to ${minCorridorWidth}m`)
    } else if (room.height < minCorridorWidth && room.height < room.width) {
      room.height = minCorridorWidth
      repairs.push(`Repaired "${room.name}": depth expanded to ${minCorridorWidth}m`)
    }
  }

  return { rooms, repairs }
}

export function repairMissingDoors(
  rooms: RoomRect[],
  openings: Opening[],
  walls: WallSegment[],
): { openings: Opening[]; repairs: string[] } {
  const repairs: string[] = []
  const doorWallIds = new Set(openings.filter(o => o.kind === 'door').map(o => o.wallId))

  const uid = () => Math.random().toString(36).slice(2, 10)

  for (const room of rooms) {
    const role = classifyRoom(room.name)
    if (role === 'circulation' || role === 'service') continue

    // Check if this room has any wall with a door
    const hasDoorOnWall = walls.some(w => {
      if (w.type !== 'internal') return false
      if (!doorWallIds.has(w.id)) return false
      const eps = 0.05
      return (
        (Math.abs(w.start.x - room.x) < eps || Math.abs(w.start.x - (room.x + room.width)) < eps) ||
        (Math.abs(w.start.y - room.y) < eps || Math.abs(w.start.y - (room.y + room.height)) < eps)
      )
    })

    if (hasDoorOnWall) continue

    // Find an internal wall that bounds this room
    const candidateWalls = walls.filter(w => {
      if (w.type !== 'internal') return false
      if (doorWallIds.has(w.id)) return false
      const eps = 0.05
      return (
        (Math.abs(w.start.x - room.x) < eps && w.start.y >= room.y - eps && w.start.y <= room.y + room.height + eps) ||
        (Math.abs(w.start.x - (room.x + room.width)) < eps && w.start.y >= room.y - eps && w.start.y <= room.y + room.height + eps) ||
        (Math.abs(w.start.y - room.y) < eps && w.start.x >= room.x - eps && w.start.x <= room.x + room.width + eps) ||
        (Math.abs(w.start.y - (room.y + room.height)) < eps && w.start.x >= room.x - eps && w.start.x <= room.x + room.width + eps)
      )
    })

    if (candidateWalls.length > 0) {
      const targetWall = candidateWalls[0]
      const dx = targetWall.end.x - targetWall.start.x
      const dy = targetWall.end.y - targetWall.start.y
      const len = Math.sqrt(dx * dx + dy * dy)
      const doorWidth = Math.min(0.9, len * 0.5)
      const offset = (len - doorWidth) / 2 / Math.max(len, 0.01)

      openings.push({
        id: uid(),
        wallId: targetWall.id,
        kind: 'door',
        offset: Math.max(0.15, Math.min(0.85, offset)),
        width: doorWidth,
      })
      doorWallIds.add(targetWall.id)
      repairs.push(`Repaired: added door to "${room.name}"`)
    } else {
      repairs.push(`Warning: cannot add door to "${room.name}" — no available internal wall`)
    }
  }

  return { openings, repairs }
}

export function repairMissingWindows(
  rooms: RoomRect[],
  openings: Opening[],
  walls: WallSegment[],
): { openings: Opening[]; repairs: string[] } {
  const repairs: string[] = []
  const uid = () => Math.random().toString(36).slice(2, 10)

  const extWalls = walls.filter(w => w.type === 'external')

  for (const room of rooms) {
    const role = classifyRoom(room.name)
    if (!isHabitable(role)) continue
    if (room.name === 'Veranda' || room.name === 'Verandah' || room.name === 'Courtyard' || room.name === 'Roof Terrace' || room.name === 'Balcony') continue

    const hasWindow = openings.some(o => {
      if (o.kind !== 'window') return false
      const wall = walls.find(w => w.id === o.wallId)
      if (!wall || wall.type !== 'external') return false
      const eps = 0.05
      return (
        (Math.abs(wall.start.x - room.x) < eps || Math.abs(wall.start.x - (room.x + room.width)) < eps) ||
        (Math.abs(wall.start.y - room.y) < eps || Math.abs(wall.start.y - (room.y + room.height)) < eps)
      )
    })

    if (hasWindow) continue

    // Find external wall touching this room
    const eps = 0.05
    for (const extWall of extWalls) {
      const touches = (
        (Math.abs(extWall.start.x - room.x) < eps || Math.abs(extWall.start.x - (room.x + room.width)) < eps) ||
        (Math.abs(extWall.start.y - room.y) < eps || Math.abs(extWall.start.y - (room.y + room.height)) < eps)
      )
      if (!touches) continue

      const existing = openings.find(o => o.wallId === extWall.id)
      if (existing) continue

      const dx = extWall.end.x - extWall.start.x
      const dy = extWall.end.y - extWall.start.y
      const len = Math.sqrt(dx * dx + dy * dy)
      const winWidth = Math.min(1.5, len * 0.5)
      const offset = (len - winWidth) / 2 / Math.max(len, 0.01)

      openings.push({
        id: uid(),
        wallId: extWall.id,
        kind: 'window',
        offset: Math.max(0.15, Math.min(0.85, offset)),
        width: winWidth,
      })
      repairs.push(`Repaired: added window to "${room.name}"`)
      break
    }
  }

  return { openings, repairs }
}

export function applyRepairs(
  rooms: RoomRect[],
  walls: WallSegment[],
  openings: Opening[],
): RepairResult {
  const allRepairs: string[] = []
  let needsRevalidation = false

  const r1 = repairRoomMinimums(rooms)
  allRepairs.push(...r1.repairs)
  if (r1.repairs.length > 0) needsRevalidation = true

  const r2 = repairCorridorWidth(rooms)
  allRepairs.push(...r2.repairs)
  if (r2.repairs.length > 0) needsRevalidation = true

  const r3 = repairMissingDoors(rooms, openings, walls)
  allRepairs.push(...r3.repairs)
  if (r3.repairs.length > 0) needsRevalidation = true

  const r4 = repairMissingWindows(rooms, openings, walls)
  allRepairs.push(...r4.repairs)
  if (r4.repairs.length > 0) needsRevalidation = true

  return {
    rooms,
    walls,
    openings,
    repairsApplied: allRepairs,
    needsRevalidation,
  }
}
