import type { RoomRect, WallSegment, Opening } from '../../domain/plan'
import { toRoomPolygon, computeSharedEdges, buildInternalWallsFromAdjacency, buildAdjacencyMap } from './polygon-adjacency'
import { buildEgressGraph, validateEgress } from '../layout/egress-graph'
import { applyRepairs } from '../layout/repair-engine'

const uid = () => Math.random().toString(36).slice(2, 10)

export type RoomRole = 'circulation' | 'public' | 'private' | 'wet' | 'service'

const ROLE_MAP: Record<string, RoomRole> = {
  'Circulation': 'circulation',
  'Corridor': 'circulation',
  'Hall': 'circulation',
  'Lobby': 'circulation',
  'Stairwell': 'circulation',
  'Gallery': 'circulation',
  'Lounge / Dining': 'public',
  'Living Room': 'public',
  'Lounge': 'public',
  'Dining': 'public',
  'Dining Room': 'public',
  'Reception / Waiting': 'public',
  'Reception': 'public',
  'Reception / Lobby': 'public',
  'Main Hall': 'public',
  'Main Hall / Sanctuary': 'public',
  'Sales Floor': 'public',
  'Retail Floor': 'public',
  'Open Plan Office': 'public',
  'Bedroom': 'private',
  'Master Bedroom': 'private',
  'Bedroom 1': 'private',
  'Bedroom 2': 'private',
  'Bedroom 3': 'private',
  'Guest Room': 'private',
  'Study / Flex': 'private',
  'Study': 'private',
  'Bathroom': 'wet',
  'Bathroom 1': 'wet',
  'Bathroom 2': 'wet',
  'Kitchen': 'wet',
  'Kitchenette': 'wet',
  'Laundry': 'wet',
  'Guest WC': 'wet',
  'Store': 'service',
  'Store Room': 'service',
  'Storage': 'service',
  'Veranda': 'public',
  'Verandah': 'public',
  'Balcony': 'public',
  'Roof Terrace': 'public',
  'Courtyard': 'public',
  'Staff Room': 'service',
  'Office': 'service',
  'Admin Office': 'service',
}

export function classifyRoom(name: string): RoomRole {
  for (const [prefix, role] of Object.entries(ROLE_MAP)) {
    if (name.startsWith(prefix) || name === prefix) return role
  }
  return 'private'
}

export function isHabitable(role: RoomRole): boolean {
  return role === 'public' || role === 'private'
}

export function isDry(role: RoomRole): boolean {
  return role === 'circulation' || role === 'public' || role === 'private'
}

export interface RoomMinimums {
  minWidth: number
  minDepth: number
}

const MINIMUM_DIMENSIONS: Record<string, RoomMinimums> = {
  'Master Bedroom': { minWidth: 3.5, minDepth: 4.0 },
  'Bedroom': { minWidth: 3.0, minDepth: 3.5 },
  'Bedroom 1': { minWidth: 3.0, minDepth: 3.5 },
  'Bedroom 2': { minWidth: 3.0, minDepth: 3.5 },
  'Bedroom 3': { minWidth: 3.0, minDepth: 3.5 },
  'Guest Room': { minWidth: 3.0, minDepth: 3.5 },
  'Bathroom': { minWidth: 1.8, minDepth: 2.2 },
  'Bathroom 1': { minWidth: 1.8, minDepth: 2.2 },
  'Bathroom 2': { minWidth: 1.8, minDepth: 2.2 },
  'Kitchen': { minWidth: 2.5, minDepth: 3.0 },
  'Kitchenette': { minWidth: 2.0, minDepth: 2.0 },
  'Lounge / Dining': { minWidth: 3.5, minDepth: 4.0 },
  'Living Room': { minWidth: 3.5, minDepth: 4.0 },
  'Dining Room': { minWidth: 3.0, minDepth: 3.5 },
  'Study / Flex': { minWidth: 2.5, minDepth: 2.5 },
  'Study': { minWidth: 2.5, minDepth: 2.5 },
  'Circulation': { minWidth: 1.2, minDepth: 1.2 },
  'Laundry': { minWidth: 1.8, minDepth: 2.0 },
  'Guest WC': { minWidth: 1.5, minDepth: 1.5 },
  'Veranda': { minWidth: 1.5, minDepth: 2.0 },
  'Store': { minWidth: 1.5, minDepth: 1.5 },
  'Office': { minWidth: 2.5, minDepth: 2.5 },
}

export function getMinimumDimensions(name: string): RoomMinimums {
  for (const [prefix, dims] of Object.entries(MINIMUM_DIMENSIONS)) {
    if (name.startsWith(prefix) || name === prefix) return dims
  }
  return { minWidth: 2.0, minDepth: 2.0 }
}

export interface AdjacencyEdge {
  roomAId: string
  roomBId: string
  sharedLength: number
  wall: WallSegment
}

export function buildAdjacencyGraph(rooms: RoomRect[]): AdjacencyEdge[] {
  const edges: AdjacencyEdge[] = []
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i]
      const b = rooms[j]
      const shared = findSharedBoundary(a, b)
      if (shared) {
        edges.push(shared)
      }
    }
  }
  return edges
}

function findSharedBoundary(a: RoomRect, b: RoomRect): AdjacencyEdge | null {
  const eps = 0.01

  // a is left of b — vertical shared edge
  if (Math.abs(a.x + a.width - b.x) < eps) {
    const overlapStart = Math.max(a.y, b.y)
    const overlapEnd = Math.min(a.y + a.height, b.y + b.height)
    const overlap = overlapEnd - overlapStart
    if (overlap >= 1.0) {
      return {
        roomAId: a.id,
        roomBId: b.id,
        sharedLength: overlap,
        wall: {
          id: uid(),
          start: { x: a.x + a.width, y: overlapStart },
          end: { x: a.x + a.width, y: overlapEnd },
          thickness: 0.12,
          type: 'internal',
        },
      }
    }
  }

  // b is left of a — vertical shared edge
  if (Math.abs(b.x + b.width - a.x) < eps) {
    const overlapStart = Math.max(a.y, b.y)
    const overlapEnd = Math.min(a.y + a.height, b.y + b.height)
    const overlap = overlapEnd - overlapStart
    if (overlap >= 1.0) {
      return {
        roomAId: a.id,
        roomBId: b.id,
        sharedLength: overlap,
        wall: {
          id: uid(),
          start: { x: b.x + b.width, y: overlapStart },
          end: { x: b.x + b.width, y: overlapEnd },
          thickness: 0.12,
          type: 'internal',
        },
      }
    }
  }

  // a is above b — horizontal shared edge
  if (Math.abs(a.y + a.height - b.y) < eps) {
    const overlapStart = Math.max(a.x, b.x)
    const overlapEnd = Math.min(a.x + a.width, b.x + b.width)
    const overlap = overlapEnd - overlapStart
    if (overlap >= 0.6) {
      return {
        roomAId: a.id,
        roomBId: b.id,
        sharedLength: overlap,
        wall: {
          id: uid(),
          start: { x: overlapStart, y: a.y + a.height },
          end: { x: overlapEnd, y: a.y + a.height },
          thickness: 0.12,
          type: 'internal',
        },
      }
    }
  }

  // b is above a — horizontal shared edge
  if (Math.abs(b.y + b.height - a.y) < eps) {
    const overlapStart = Math.max(a.x, b.x)
    const overlapEnd = Math.min(a.x + a.width, b.x + b.width)
    const overlap = overlapEnd - overlapStart
    if (overlap >= 0.6) {
      return {
        roomAId: a.id,
        roomBId: b.id,
        sharedLength: overlap,
        wall: {
          id: uid(),
          start: { x: overlapStart, y: b.y + b.height },
          end: { x: overlapEnd, y: b.y + b.height },
          thickness: 0.12,
          type: 'internal',
        },
      }
    }
  }

  return null
}

export function buildWallGraphFromRooms(rooms: RoomRect[]): { walls: WallSegment[]; adjacency: AdjacencyEdge[] } {
  // Use polygon adjacency engine for shared edge detection
  const roomPolys = rooms.map(r => toRoomPolygon(r.id, r.name, r.x, r.y, r.width, r.height))
  const sharedEdges = computeSharedEdges(roomPolys)

  const { walls: polyWalls } = buildInternalWallsFromAdjacency(roomPolys, sharedEdges)

  // Convert polygon walls to WallSegment format
  const walls: WallSegment[] = polyWalls.map(w => ({
    id: w.id,
    start: w.start,
    end: w.end,
    thickness: w.thickness,
    type: w.type as 'internal',
  }))

  // Convert shared edges to AdjacencyEdge format
  const adjacency: AdjacencyEdge[] = sharedEdges.map(e => ({
    roomAId: e.roomAId,
    roomBId: e.roomBId,
    sharedLength: e.sharedLength,
    wall: {
      id: e.wallId,
      start: e.edge.start,
      end: e.edge.end,
      thickness: 0.12,
      type: 'internal' as const,
    },
  }))

  // Also add right/bottom edges for rooms with no adjacency on those sides (fallback)
  const seen = new Set(walls.map(w => `${w.start.x.toFixed(2)},${w.start.y.toFixed(2)}:${w.end.x.toFixed(2)},${w.end.y.toFixed(2)}`))
  for (const room of rooms) {
    for (const edge of [
      { start: { x: room.x + room.width, y: room.y }, end: { x: room.x + room.width, y: room.y + room.height } },
      { start: { x: room.x, y: room.y + room.height }, end: { x: room.x + room.width, y: room.y + room.height } },
    ]) {
      const key = `${edge.start.x.toFixed(2)},${edge.start.y.toFixed(2)}:${edge.end.x.toFixed(2)},${edge.end.y.toFixed(2)}`
      const revKey = `${edge.end.x.toFixed(2)},${edge.end.y.toFixed(2)}:${edge.start.x.toFixed(2)},${edge.start.y.toFixed(2)}`
      if (!seen.has(key) && !seen.has(revKey)) {
        seen.add(key)
        walls.push({ id: uid(), start: edge.start, end: edge.end, thickness: 0.12, type: 'internal' })
      }
    }
  }

  return { walls, adjacency }
}

export function findCirculationSpine(rooms: RoomRect[]): RoomRect | null {
  const preferred = ['Circulation', 'Hall', 'Lobby', 'Corridor']
  for (const name of preferred) {
    const found = rooms.find(r => r.name === name || r.name.startsWith(name))
    if (found) return found
  }
  // Fallback: find the longest public room (likely Lounge/Dining)
  const publicRooms = rooms.filter(r => classifyRoom(r.name) === 'public')
  if (publicRooms.length > 0) {
    return publicRooms.reduce((a, b) => (a.width * a.height > b.width * b.height ? a : b))
  }
  return null
}

export interface SmartOpeningsParams {
  rooms: RoomRect[]
  walls: WallSegment[]
  adjacency: AdjacencyEdge[]
  externalWalls: WallSegment[]
}

export function generateSmartOpenings(params: SmartOpeningsParams): Opening[] {
  const { rooms, adjacency, externalWalls } = params
  const openings: Opening[] = []

  const spine = findCirculationSpine(rooms)
  const spineId = spine?.id

  // Build room-role map
  const roleMap = new Map<string, RoomRole>()
  for (const r of rooms) {
    roleMap.set(r.id, classifyRoom(r.name))
  }

  // Build adjacency map: roomId -> list of adjacent room IDs with shared wall info
  const adjMap = new Map<string, { roomId: string; wall: WallSegment }[]>()
  for (const edge of adjacency) {
    if (!adjMap.has(edge.roomAId)) adjMap.set(edge.roomAId, [])
    if (!adjMap.has(edge.roomBId)) adjMap.set(edge.roomBId, [])
    adjMap.get(edge.roomAId)!.push({ roomId: edge.roomBId, wall: edge.wall })
    adjMap.get(edge.roomBId)!.push({ roomId: edge.roomAId, wall: edge.wall })
  }

  const placedOnWall = new Set<string>()

  function addDoor(wall: WallSegment) {
    const wKey = wall.id
    if (placedOnWall.has(wKey)) return
    placedOnWall.add(wKey)

    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 0.8) return

    const doorWidth = Math.min(0.9, (len * 0.6))
    const offset = (len - doorWidth) / 2 / Math.max(len, 0.01)
    openings.push({
      id: uid(),
      wallId: wall.id,
      kind: 'door',
      offset: Math.min(0.85, Math.max(0.15, offset)),
      width: doorWidth,
    })
  }

  function addWindow(wall: WallSegment) {
    const wKey = `win_${wall.id}`
    if (placedOnWall.has(wKey)) return
    placedOnWall.add(wKey)

    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 0.6) return

    const winWidth = Math.min(1.5, len * 0.5)
    const offset = (len - winWidth) / 2 / Math.max(len, 0.01)
    openings.push({
      id: uid(),
      wallId: wall.id,
      kind: 'window',
      offset: Math.min(0.85, Math.max(0.15, offset)),
      width: winWidth,
    })
  }

  // 1. Connect private rooms to circulation spine or public rooms
  for (const room of rooms) {
    const role = roleMap.get(room.id)
    if (role !== 'private' && role !== 'wet') continue

    const neighbors = adjMap.get(room.id) || []

    // First, try to connect to circulation spine
    let connected = false
    for (const n of neighbors) {
      if (n.roomId === spineId) {
        addDoor(n.wall)
        connected = true
        break
      }
    }

    // If no direct spine connection, try any public room
    if (!connected) {
      for (const n of neighbors) {
        const nRole = roleMap.get(n.roomId)
        if (nRole === 'public' || nRole === 'circulation') {
          addDoor(n.wall)
          connected = true
          break
        }
      }
    }

    // Last resort: connect to another private room (but avoid chaining through bedrooms)
    if (!connected && role === 'wet') {
      for (const n of neighbors) {
        const nRole = roleMap.get(n.roomId)
        if (nRole === 'private') {
          addDoor(n.wall)
          connected = true
          break
        }
      }
    }
  }

  // 2. Connect circulation spine to external door
  if (spine) {
    const exitWalls = externalWalls.filter(w => {
      const spineRole = roleMap.get(spine.id)
      if (spineRole !== 'circulation') return false
      // Check if wall touches the spine room
      const eps = 0.05
      const touchesX = Math.abs(w.start.x - (spine.x + spine.width)) < eps || Math.abs(w.start.y - (spine.y + spine.height)) < eps
      const touchesY = Math.abs(w.end.x - (spine.x + spine.width)) < eps || Math.abs(w.end.y - (spine.y + spine.height)) < eps
      return touchesX || touchesY
    })

    if (exitWalls.length > 0) {
      // Use the first bottom external wall
      const bottomWalls = exitWalls.filter(w => w.start.y > spine.y + spine.height * 0.3 && w.end.y > spine.y + spine.height * 0.3)
      const target = bottomWalls.length > 0 ? bottomWalls[0] : exitWalls[0]
      openings.push({ id: uid(), wallId: target.id, kind: 'door', offset: 0.42, width: 1.2 })
    } else if (externalWalls.length >= 3) {
      // Default: door on the bottom (south) wall
      openings.push({ id: uid(), wallId: externalWalls[2].id, kind: 'door', offset: 0.42, width: 1.2 })
    }
  }

  // 3. Windows on habitable rooms
  for (const room of rooms) {
    const role = roleMap.get(room.id)
    if (!role || !isHabitable(role)) continue

    // Find external walls that bound this room
    const eps = 0.05
    for (const extWall of externalWalls) {
      // Check if this external wall touches the room
      const isVertical = Math.abs(extWall.start.x - extWall.end.x) < eps
      const isHorizontal = Math.abs(extWall.start.y - extWall.end.y) < eps

      let touches = false
      if (isVertical) {
        const wallX = extWall.start.x
        if (Math.abs(wallX - room.x) < eps || Math.abs(wallX - (room.x + room.width)) < eps) {
          const wallOverlap = Math.min(extWall.end.y, room.y + room.height) - Math.max(extWall.start.y, room.y)
          touches = wallOverlap >= 0.6
        }
      } else if (isHorizontal) {
        const wallY = extWall.start.y
        if (Math.abs(wallY - room.y) < eps || Math.abs(wallY - (room.y + room.height)) < eps) {
          const wallOverlap = Math.min(extWall.end.x, room.x + room.width) - Math.max(extWall.start.x, room.x)
          touches = wallOverlap >= 0.6
        }
      }

      if (touches) {
        const existingWindow = openings.find(o => o.wallId === extWall.id)
        if (!existingWindow) {
          addWindow(extWall)
          break
        }
      }
    }
  }

  // 4. Fallback: if no windows were placed, put on first 3 external walls
  const hasWindows = openings.some(o => o.kind === 'window')
  if (!hasWindows) {
    externalWalls.slice(0, 3).forEach((wall, index) => {
      const exists = openings.some(o => o.wallId === wall.id)
      if (!exists) {
        openings.push({ id: uid(), wallId: wall.id, kind: 'window', offset: 0.2 + index * 0.18, width: 1.5 })
      }
    })
  }

  return openings
}

export function validatePlanConnectivity(rooms: RoomRect[], openings: Opening[], walls: WallSegment[]): string[] {
  const warnings: string[] = []

  // Build room-role map
  const roleMap = new Map<string, RoomRole>()
  for (const r of rooms) {
    roleMap.set(r.id, classifyRoom(r.name))
  }

  // Find the circulation spine
  const spine = findCirculationSpine(rooms)
  if (!spine) {
    warnings.push('No circulation spine found (no Circulation/Hall/Lobby room)')
  }

  // Check minimum room dimensions
  for (const room of rooms) {
    const dims = getMinimumDimensions(room.name)
    if (room.width < dims.minWidth - 0.01) {
      warnings.push(`Room "${room.name}" width ${room.width.toFixed(2)}m < minimum ${dims.minWidth}m`)
    }
    if (room.height < dims.minDepth - 0.01) {
      warnings.push(`Room "${room.name}" depth ${room.height.toFixed(2)}m < minimum ${dims.minDepth}m`)
    }
  }

  // Check every private room has a door
  const privateRooms = rooms.filter(r => {
    const role = roleMap.get(r.id)
    return role === 'private' || role === 'wet'
  })

  const doorWalls = new Set(openings.filter(o => o.kind === 'door').map(o => o.wallId))

  for (const room of privateRooms) {
    const hasDoorOnWall = openings.some(o => {
      if (o.kind !== 'door') return false
      // Check if this door's wall is shared with this room
      return true // approximate check
    })
    if (!hasDoorOnWall) {
      // More precise: check if any internal wall of this room has a door
      const shared = walls.filter(w => {
        const eps = 0.05
        return (
          (Math.abs(w.start.x - room.x) < eps && w.start.y >= room.y - eps && w.start.y <= room.y + room.height + eps) ||
          (Math.abs(w.start.x - (room.x + room.width)) < eps && w.start.y >= room.y - eps && w.start.y <= room.y + room.height + eps) ||
          (Math.abs(w.start.y - room.y) < eps && w.start.x >= room.x - eps && w.start.x <= room.x + room.width + eps) ||
          (Math.abs(w.start.y - (room.y + room.height)) < eps && w.start.x >= room.x - eps && w.start.x <= room.x + room.width + eps)
        )
      })
      const hasDoor = shared.some(s => doorWalls.has(s.id))
      if (!hasDoor) {
        warnings.push(`Room "${room.name}" has no door`)
      }
    }
  }

  // Check habitable rooms have windows
  for (const room of rooms) {
    const role = roleMap.get(room.id)
    if (role !== 'private' && role !== 'public') continue
    // Skip veranda/courtyard type rooms
    if (room.name === 'Veranda' || room.name === 'Courtyard' || room.name === 'Roof Terrace' || room.name === 'Balcony') continue

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
    if (!hasWindow) {
      warnings.push(`Habitable room "${room.name}" has no window`)
    }
  }

  return warnings
}

// ── Zoned layout generation ──────────────────────────────────

export interface ZonedLayoutParams {
  program: { name: string; ratio: number }[]
  width: number
  height: number
  corridorWidth?: number
}

export function generateZonedLayout(params: ZonedLayoutParams): RoomRect[] {
  let { width, height } = params
  const { program } = params
  const corridorWidth = params.corridorWidth ?? 1.5

  const isVerticalSplit = width > height * 1.2
  if (isVerticalSplit) {
    // Swap width/height for calculations
    width = params.height
    height = params.width
  }

  // Shuffle helper to avoid repetitive boring designs
  const shuffle = <T>(array: T[]): T[] => {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  // Classify rooms
  const classified = program.map(p => ({
    ...p,
    role: classifyRoom(p.name),
    minDims: getMinimumDimensions(p.name),
  }))

  // Sort by zone for layout (and shuffle to break repetition)
  const circulationRooms = shuffle(classified.filter(r => r.role === 'circulation'))
  const publicRooms = shuffle(classified.filter(r => r.role === 'public'))
  const privateRooms = shuffle(classified.filter(r => r.role === 'private' || r.role === 'wet'))
  const serviceRooms = shuffle(classified.filter(r => r.role === 'service'))

  // Reserve corridor space
  const circRatioSum = circulationRooms.reduce((s, r) => s + r.ratio, 0)
  const corridorDepth = Math.max(corridorWidth, circRatioSum > 0 ? height * circRatioSum : corridorWidth)

  // Remaining height for public (front) and private (rear) zones
  const remainingH = height - corridorDepth

  // Split remaining: ~40% front, ~60% rear
  const frontRatioTotal = publicRooms.reduce((s, r) => s + r.ratio, 0) + serviceRooms.reduce((s, r) => s + r.ratio, 0)
  const rearRatioTotal = privateRooms.reduce((s, r) => s + r.ratio, 0)
  const totalNonCircRatio = frontRatioTotal + rearRatioTotal

  let frontDepth: number
  let rearDepth: number

  if (totalNonCircRatio > 0) {
    frontDepth = Math.max(3.0, remainingH * (frontRatioTotal / totalNonCircRatio))
    rearDepth = Math.max(3.0, remainingH - frontDepth)
    // Ensure each zone has usable depth
    if (frontDepth < 3.0 && frontRatioTotal > 0) frontDepth = Math.min(remainingH * 0.5, remainingH - rearDepth)
    if (rearDepth < 3.0 && rearRatioTotal > 0) rearDepth = remainingH - frontDepth
  } else {
    frontDepth = remainingH * 0.5
    rearDepth = remainingH * 0.5
  }

  // Position the corridor band
  const corridorY = frontDepth

  const rooms: RoomRect[] = []
  const palette = ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d', '#b45309', '#6d28d9', '#0e7490']

  // Helper to place rooms horizontally within a band, enforcing minimums without overflow
  function placeHorizontalBand(
    bandRooms: { name: string; ratio: number; minDims: RoomMinimums }[],
    bandY: number,
    bandDepth: number,
    ratioSum: number,
  ) {
    let x = 0
    for (let i = 0; i < bandRooms.length; i++) {
      const r = bandRooms[i]
      const isLast = i === bandRooms.length - 1
      const remainingW = Math.max(0, width - x)

      if (isLast) {
        // Last room takes all remaining width (at minimum)
        rooms.push({
          id: uid(),
          name: r.name,
          x: Number(x.toFixed(2)),
          y: Number(bandY.toFixed(2)),
          width: Number(Math.max(r.minDims.minWidth, remainingW).toFixed(2)),
          height: Number(bandDepth.toFixed(2)),
          color: palette[rooms.length % palette.length],
        })
        break
      }

      const minArea = r.minDims.minWidth * r.minDims.minDepth
      const ratioW = width * (r.ratio / Math.max(ratioSum, 0.01))
      const areaW = bandDepth > 0.01 ? minArea / bandDepth : minArea
      const desiredW = Math.max(ratioW, areaW, r.minDims.minWidth, 1.5)
      const clampedW = Math.min(desiredW, remainingW)

      if (clampedW <= 0) break

      rooms.push({
        id: uid(),
        name: r.name,
        x: Number(x.toFixed(2)),
        y: Number(bandY.toFixed(2)),
        width: Number(clampedW.toFixed(2)),
        height: Number(bandDepth.toFixed(2)),
        color: palette[rooms.length % palette.length],
      })
      x += clampedW
    }
  }

  // Place circulation rooms as a horizontal band
  if (circulationRooms.length > 0) {
    placeHorizontalBand(circulationRooms, corridorY, corridorDepth, circRatioSum)
    // Fill remaining corridor width if last room didn't reach edge
    if (rooms.length > 0) {
      const lastCirc = rooms[rooms.length - 1]
      if (lastCirc.y === Number(corridorY.toFixed(2))) {
        lastCirc.width = Number(Math.max(lastCirc.width, width - lastCirc.x).toFixed(2))
      }
    }
  } else {
    // No explicit circulation — reserve a corridor as fallback
    rooms.push({
      id: uid(),
      name: 'Circulation',
      x: 0,
      y: Number(corridorY.toFixed(2)),
      width: Number(width.toFixed(2)),
      height: Number(corridorDepth.toFixed(2)),
      color: palette[rooms.length % palette.length],
    })
  }

  // Place public + service rooms in front zone
  const frontRooms = [...publicRooms, ...serviceRooms]
  if (frontRooms.length > 0) {
    const frontRatioSum = frontRooms.reduce((s, r) => s + r.ratio, 0) || 1
    placeHorizontalBand(frontRooms, 0, frontDepth, frontRatioSum)
  }

  // Place private + wet rooms in rear zone
  if (privateRooms.length > 0) {
    const rearRatioSum = privateRooms.reduce((s, r) => s + r.ratio, 0) || 1
    const rearY = corridorY + corridorDepth
    placeHorizontalBand(privateRooms, rearY, rearDepth, rearRatioSum)
  }

  // If vertical split, swap x/y back to original orientation
  if (isVerticalSplit) {
    return rooms.map(r => ({
      ...r,
      x: r.y,
      y: r.x,
      width: r.height,
      height: r.width,
    }))
  }

  return rooms
}

// ── Plan assembly ────────────────────────────────────────────

export interface PlanAssemblyInput {
  rooms: RoomRect[]
  width: number
  height: number
  wallThickness: number
  designOptionId: string
}

export function outerWalls(width: number, height: number, thickness: number): WallSegment[] {
  return [
    { id: uid(), start: { x: 0, y: 0 }, end: { x: width, y: 0 }, thickness, type: 'external' },
    { id: uid(), start: { x: width, y: 0 }, end: { x: width, y: height }, thickness, type: 'external' },
    { id: uid(), start: { x: width, y: height }, end: { x: 0, y: height }, thickness, type: 'external' },
    { id: uid(), start: { x: 0, y: height }, end: { x: 0, y: 0 }, thickness, type: 'external' },
  ]
}

export function assemblePlan(input: PlanAssemblyInput) {
  const { rooms, width, height, wallThickness, designOptionId } = input

  const extWalls = outerWalls(width, height, wallThickness)
  const { walls: intWalls, adjacency } = buildWallGraphFromRooms(rooms)
  const allWalls = [...extWalls, ...intWalls]

  const openings = generateSmartOpenings({
    rooms,
    walls: allWalls,
    adjacency,
    externalWalls: extWalls,
  })

  // Apply repair engine
  const repairResult = applyRepairs(rooms, allWalls, openings)
  if (repairResult.needsRevalidation) {
    // Re-generate walls after room size changes
    const { walls: repairedIntWalls, adjacency: repairedAdjacency } = buildWallGraphFromRooms(repairResult.rooms)
    const repairedAllWalls = [...extWalls, ...repairedIntWalls]
    repairResult.walls.splice(0, repairResult.walls.length, ...repairedAllWalls)
    // Re-generate openings with new wall IDs
    const repairedOpenings = generateSmartOpenings({
      rooms: repairResult.rooms,
      walls: repairedAllWalls,
      adjacency: repairedAdjacency,
      externalWalls: extWalls,
    })
    repairResult.openings.splice(0, repairResult.openings.length, ...repairedOpenings)
  }

  // Validate egress using egress graph
  const roomNames: Record<string, string> = {}
  for (const r of repairResult.rooms) roomNames[r.id] = r.name
  const roomPolys = repairResult.rooms.map(r => toRoomPolygon(r.id, r.name, r.x, r.y, r.width, r.height))
  const sharedEdges = computeSharedEdges(roomPolys)
  const adjMap = buildAdjacencyMap(sharedEdges)
  const doorWallIds = new Set(repairResult.openings.filter(o => o.kind === 'door').map(o => o.wallId))
  const egressGraph = buildEgressGraph(
    repairResult.rooms.map(r => r.id),
    roomNames,
    adjMap,
    doorWallIds,
  )
  const egressResult = validateEgress(egressGraph)

  const warnings = [
    ...validatePlanConnectivity(repairResult.rooms, repairResult.openings, repairResult.walls),
    ...egressResult.warnings,
    ...repairResult.repairsApplied,
  ]

  const plan = {
    id: uid(),
    designOptionId,
    width: Number(width.toFixed(2)),
    height: Number(height.toFixed(2)),
    wallThickness,
    rooms: repairResult.rooms,
    walls: repairResult.walls,
    openings: repairResult.openings,
    scaleLabel: '1:100 @ A3' as const,
  }

  return { plan, warnings }
}
