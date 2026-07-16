import type { WallSegment, Opening } from '../../domain/plan'
import type { RoomPolygon } from './room-polygons'
import type { NormalizedBoundary } from './shared-boundaries'
import { classifyRoom, findCirculationSpine } from './plan-intelligence'
import type { RoomRect } from '../../domain/plan'
import { findExternalWallsTouchingRoom } from './canonical-wall-graph'

const uid = () => Math.random().toString(36).slice(2, 10)

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

  // 2. Entrance door from circulation spine
  if (spine) {
    const spinePoly = polygons.find(p => p.roomId === spine.id)
    if (spinePoly) {
      const touching = findExternalWallsTouchingRoom(spinePoly, externalWalls)
      if (touching.length > 0) {
        const bottomWalls = touching.filter(w =>
          w.start.y > spinePoly.y + spinePoly.height * 0.3 &&
          w.end.y > spinePoly.y + spinePoly.height * 0.3,
        )
        const target = bottomWalls.length > 0 ? bottomWalls[0] : touching[0]
        if (wallSet.has(target.id)) {
          openings.push({ id: uid(), wallId: target.id, kind: 'door', offset: 0.42, width: 1.2 })
        }
      } else if (externalWalls.length >= 3) {
        const fallback = externalWalls[2]
        if (wallSet.has(fallback.id)) {
          openings.push({ id: uid(), wallId: fallback.id, kind: 'door', offset: 0.42, width: 1.2 })
        }
      }
    }
  }

  // 3. Windows on habitable rooms — one per room, not one per wall
  const roomsWithWindows = new Set<string>()
  for (const room of rooms) {
    const role = roleMap.get(room.id)
    if (role !== 'private' && role !== 'public') continue

    const poly = polygons.find(p => p.roomId === room.id)
    if (!poly) continue

    const touching = findExternalWallsTouchingRoom(poly, externalWalls)
    for (const ext of touching) {
      if (!wallSet.has(ext.id)) continue
      const dx = ext.end.x - ext.start.x
      const dy = ext.end.y - ext.start.y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len < 0.6) continue
      const isVertical = Math.abs(dx) < 0.05
      const roomMid = isVertical
        ? (poly.y + poly.height / 2)
        : (poly.x + poly.width / 2)
      const wallStart = isVertical ? ext.start.y : ext.start.x
      const wallLen = len
      const rawOffset = (roomMid - wallStart) / wallLen
      const offset = Math.min(0.85, Math.max(0.15, rawOffset))
      const winWidth = Math.min(1.5, len * 0.4)
      openings.push({
        id: uid(),
        wallId: ext.id,
        kind: 'window',
        offset: Number(offset.toFixed(3)),
        width: Number(winWidth.toFixed(2)),
      })
      roomsWithWindows.add(room.id)
      break
    }
  }

  // 4. Fallback windows — only if NO habitable room got a window at all
  const habitableRooms = rooms.filter(r => {
    const role = roleMap.get(r.id)
    return role === 'private' || role === 'public'
  })
  if (roomsWithWindows.size === 0 && habitableRooms.length > 0) {
    for (let i = 0; i < Math.min(3, externalWalls.length); i++) {
      const ext = externalWalls[i]
      if (!wallSet.has(ext.id)) continue
      const exists = openings.some(o => o.wallId === ext.id)
      if (!exists) {
        openings.push({ id: uid(), wallId: ext.id, kind: 'window', offset: 0.2 + i * 0.18, width: 1.5 })
      }
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
