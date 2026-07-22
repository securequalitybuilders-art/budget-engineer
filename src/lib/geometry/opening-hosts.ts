import type { WallSegment, Opening } from '../../domain/plan'
import type { RoomPolygon } from './room-polygons'
import type { NormalizedBoundary } from './shared-boundaries'
import { classifyRoom, findCirculationSpine } from './plan-intelligence'
import type { RoomRect } from '../../domain/plan'
import { findExternalWallsTouchingRoom } from './canonical-wall-graph'

const uid = () => Math.random().toString(36).slice(2, 10)

function addWindow(openings: Opening[], wall: WallSegment, offset: number, width: number) {
  openings.push({
    id: uid(), wallId: wall.id, kind: 'window',
    offset: Number(Math.min(0.85, Math.max(0.15, offset)).toFixed(3)),
    width: Number(Math.max(0.4, Math.min(width, Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) * 0.55)).toFixed(2)),
  })
}

function isFrontWall(w: WallSegment, eps = 0.01): boolean {
  return Math.abs(w.start.y) < eps && Math.abs(w.end.y) < eps
}
function isRearWall(w: WallSegment, eps = 0.01): boolean {
  return Math.abs(w.start.y - w.end.y) < eps && w.start.y > eps && w.end.y > eps
}
function wallLen(w: WallSegment): number {
  return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y)
}
function isPublicRoom(name: string): boolean {
  const pub = ['Lounge / Dining', 'Living / Kitchen / Dining', 'Living Room', 'Lounge', 'Dining Room', 'Reception', 'Family Room']
  return pub.some(p => name.startsWith(p) || name === p)
}
function isWetRoom(name: string): boolean {
  const wet = ['Bathroom', 'Bathroom 1', 'Bathroom 2', 'Laundry', 'Guest WC', 'W/C', 'Ensuite']
  return wet.some(w => name.startsWith(w) || name === w)
}

export function resolveOpeningHosts(
  rooms: RoomRect[],
  polygons: RoomPolygon[],
  boundaries: NormalizedBoundary[],
  walls: WallSegment[],
  externalWalls: WallSegment[],
): { openings: Opening[]; warnings: string[] } {
  const openings: Opening[] = []
  const wallSet = new Set(walls.map(w => w.id))
  const warnings: string[] = []
  const roleMap = new Map<string, string>()
  for (const r of rooms) roleMap.set(r.id, classifyRoom(r.name))

  const spine = findCirculationSpine(rooms)
  const spineId = spine?.id

  const adjMap = new Map<string, NormalizedBoundary[]>()
  for (const b of boundaries) {
    if (!adjMap.has(b.roomAId)) adjMap.set(b.roomAId, [])
    if (!adjMap.has(b.roomBId)) adjMap.set(b.roomBId, [])
    adjMap.get(b.roomAId)!.push(b)
    adjMap.get(b.roomBId)!.push(b)
  }

  const placedOnWall = new Set<string>()

  function addDoor(wall: WallSegment) {
    if (!wallSet.has(wall.id)) return
    const wKey = wall.id
    if (placedOnWall.has(wKey)) return
    placedOnWall.add(wKey)

    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 0.8) return

    const doorWidth = Math.min(0.9, len * 0.6)
    const offset = (len - doorWidth) / 2 / Math.max(len, 0.01)
    openings.push({
      id: uid(),
      wallId: wall.id,
      kind: 'door',
      offset: Math.min(0.85, Math.max(0.15, offset)),
      width: doorWidth,
    })
  }

  // 1. Connect private/wet rooms to circulation or public rooms
  for (const room of rooms) {
    const role = roleMap.get(room.id)
    if (role !== 'private' && role !== 'wet') continue

    const roomBounds = adjMap.get(room.id) || []
    let connected = false

    for (const b of roomBounds) {
      const otherId = b.roomAId === room.id ? b.roomBId : b.roomAId
      if (otherId === spineId && wallSet.has(b.wall.id)) {
        addDoor(b.wall)
        connected = true
        break
      }
    }

    if (!connected) {
      for (const b of roomBounds) {
        const otherId = b.roomAId === room.id ? b.roomBId : b.roomAId
        const nRole = roleMap.get(otherId)
        if ((nRole === 'public' || nRole === 'circulation') && wallSet.has(b.wall.id)) {
          addDoor(b.wall)
          connected = true
          break
        }
      }
    }

    if (!connected && role === 'wet') {
      for (const b of roomBounds) {
        const otherId = b.roomAId === room.id ? b.roomBId : b.roomAId
        const nRole = roleMap.get(otherId)
        if (nRole === 'private' && wallSet.has(b.wall.id)) {
          addDoor(b.wall)
          connected = true
          break
        }
      }
    }

    if (!connected) {
      warnings.push(`No door host wall found for room "${room.name}"`)
    }
  }

  // 2. Entrance door — center on the public room's front wall
  const publicRooms = rooms.filter(r => isPublicRoom(r.name))
  const frontWallByPublicRoom = (poly: RoomPolygon): WallSegment | null => {
    const touching = findExternalWallsTouchingRoom(poly, externalWalls)
    return touching.find(w => isFrontWall(w)) ?? (touching.length > 0 ? touching[0] : null)
  }

  let entrancePlaced = false
  for (const pub of publicRooms) {
    const pubPoly = polygons.find(p => p.roomId === pub.id)
    if (!pubPoly) continue
    const target = frontWallByPublicRoom(pubPoly)
    if (target && wallSet.has(target.id)) {
      const len = wallLen(target)
      const pubMidOnWall = isFrontWall(target)
        ? (pubPoly.x + pubPoly.width / 2)
        : (pubPoly.y + pubPoly.height / 2)
      const wallStart = isFrontWall(target) ? target.start.x : target.start.y
      let doorOffset = (pubMidOnWall - wallStart) / Math.max(len, 0.01)
      doorOffset = Math.min(0.75, Math.max(0.25, doorOffset))
      openings.push({ id: uid(), wallId: target.id, kind: 'door', offset: doorOffset, width: 1.2 })
      entrancePlaced = true
      break
    }
  }

  if (!entrancePlaced && spine) {
    const spinePoly = polygons.find(p => p.roomId === spine.id)
    if (spinePoly) {
      const touching = findExternalWallsTouchingRoom(spinePoly, externalWalls)
      const frontWall = touching.find(w => isFrontWall(w))
      const target = frontWall ?? (touching.length > 0 ? touching[0] : null)
      if (target && wallSet.has(target.id)) {
        openings.push({ id: uid(), wallId: target.id, kind: 'door', offset: 0.42, width: 1.2 })
        entrancePlaced = true
      }
    }
  }

  if (!entrancePlaced && externalWalls.length >= 1) {
    const fallback = externalWalls[0]
    if (wallSet.has(fallback.id)) {
      openings.push({ id: uid(), wallId: fallback.id, kind: 'door', offset: 0.42, width: 1.2 })
    }
  }

  // 3. Windows — room-type-aware, multi-window for large front rooms
  const roomsWithWindows = new Set<string>()

  function roomWindowWidth(role: string, roomName: string, onFront: boolean, wallLen: number): number {
    if (onFront) {
      if (isPublicRoom(roomName)) return Math.min(2.0, wallLen * 0.45)
      if (isWetRoom(roomName)) return Math.min(1.2, wallLen * 0.35)
      return Math.min(1.5, wallLen * 0.4)
    }
    if (isWetRoom(roomName)) return Math.min(1.0, wallLen * 0.3)
    return Math.min(1.3, wallLen * 0.35)
  }

  function placeWindowsForRoom(room: RoomRect, role: string, ext: WallSegment, onFront: boolean) {
    const len = wallLen(ext)
    if (len < 0.6) return false

    const baseW = roomWindowWidth(role, room.name, onFront, len)
    const isVertical = Math.abs(ext.end.x - ext.start.x) < 0.05
    const roomSize = isVertical ? room.height : room.width
    const wallStart = isVertical ? ext.start.y : ext.start.x
    const wallEnd = isVertical ? ext.end.y : ext.end.x
    const wallOrientLen = Math.abs(wallEnd - wallStart)

    if (onFront && isPublicRoom(room.name) && roomSize >= 4.0) {
      const w1 = baseW
      const gap = Math.min(0.6, (wallOrientLen - 2 * w1) * 0.15)
      const totalW = 2 * w1 + gap
      const startOffset = Math.max(0.1, (wallOrientLen - totalW) / 2 / Math.max(wallOrientLen, 0.01))
      addWindow(openings, ext, startOffset, w1)
      addWindow(openings, ext, startOffset + (w1 + gap) / Math.max(wallOrientLen, 0.01), w1)
      return true
    }

    const rawOffset = (isVertical
      ? (room.y + room.height / 2)
      : (room.x + room.width / 2) - wallStart) / Math.max(wallOrientLen, 0.01)
    const offset = Math.min(0.85, Math.max(0.15, rawOffset))
    addWindow(openings, ext, offset, baseW)
    return true
  }

  for (const room of rooms) {
    const role = roleMap.get(room.id)
    if (role !== 'private' && role !== 'public') continue

    const poly = polygons.find(p => p.roomId === room.id)
    if (!poly) continue

    const touching = findExternalWallsTouchingRoom(poly, externalWalls)
    for (const ext of touching) {
      if (!wallSet.has(ext.id)) continue
      if (wallLen(ext) < 0.6) continue

      const onFront = isFrontWall(ext)

      if (onFront && role === 'public') {
        if (placeWindowsForRoom(room, role, ext, true)) {
          roomsWithWindows.add(room.id)
          break
        }
      }

      if (onFront || touching.length === 1) {
        if (placeWindowsForRoom(room, role, ext, onFront)) {
          roomsWithWindows.add(room.id)
          break
        }
      }
    }
  }

  // 4. Remaining habitable rooms without windows — place on nearest external wall
  for (const room of rooms) {
    if (roomsWithWindows.has(room.id)) continue
    const role = roleMap.get(room.id)
    if (role !== 'private' && role !== 'public') continue

    const poly = polygons.find(p => p.roomId === room.id)
    if (!poly) continue

    const touching = findExternalWallsTouchingRoom(poly, externalWalls)
    for (const ext of touching) {
      if (!wallSet.has(ext.id)) continue
      const len = wallLen(ext)
      if (len < 0.6) continue
      const onFront = isFrontWall(ext)
      const baseW = roomWindowWidth(role, room.name, onFront, len)
      const isVertical = Math.abs(ext.end.x - ext.start.x) < 0.05
      const wallStart = isVertical ? ext.start.y : ext.start.x
      const rawOffset = (isVertical
        ? (poly.y + poly.height / 2)
        : (poly.x + poly.width / 2) - wallStart) / Math.max(len, 0.01)
      addWindow(openings, ext, rawOffset, baseW)
      roomsWithWindows.add(room.id)
      break
    }
  }

  const orphanCount = openings.filter(o => !wallSet.has(o.wallId)).length
  if (orphanCount > 0) {
    warnings.push(`${orphanCount} orphan opening(s) could not be resolved to a valid host wall`)
  }

  return {
    openings,
    warnings,
  }
}
