import type { DesignOption } from '@/domain/boq'

export interface GeoPoint {
  x: number
  y: number
}

export interface GeneratedRoom {
  id: string
  name: string
  type: string
  floorIndex: number
  x: number
  y: number
  width: number
  depth: number
  area: number
}

export interface GeneratedWall {
  id: string
  floorIndex: number
  start: GeoPoint
  end: GeoPoint
  kind: 'external' | 'internal'
  thickness: number
  height: number
}

export interface GeneratedOpening {
  id: string
  floorIndex: number
  wallId: string
  type: 'door' | 'window'
  width: number
  height: number
  sillHeight?: number
  offset: number
  roomId?: string
}

export interface GeneratedZone {
  id: string
  name: string
  type: string
  floorIndex: number
  area: number
  roomIds: string[]
}

export interface BuildGeometryResult {
  width: number
  depth: number
  floors: number
  rooms: GeneratedRoom[]
  walls: GeneratedWall[]
  openings: GeneratedOpening[]
  zones: GeneratedZone[]
  warnings: string[]
}

interface RoomRect {
  name: string
  type: string
  x: number
  y: number
  width: number
  depth: number
}

const FLOOR_HEIGHT = 3
const WALL_THICKNESS = 0.23
const DOOR_WIDTH = 0.90
const DOOR_HEIGHT = 2.1
const WIN_WIDTH = 1.2
const WIN_HEIGHT = 1.5
const WIN_SILL = 0.9
const MIN_ROOM_DIM = 1.5
const MIN_BATH_DIM = 1.2

function safeSqrt(n: number): number {
  return n > 0 ? Math.sqrt(n) : 0
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function approxEq(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) < eps
}

function edgeKey(x1: number, y1: number, x2: number, y2: number): string {
  const ax = Math.round(x1 * 100), ay = Math.round(y1 * 100)
  const bx = Math.round(x2 * 100), by = Math.round(y2 * 100)
  const [cx, cy, dx, dy] = ax < bx || (approxEq(ax, bx) && ay < by)
    ? [ax, ay, bx, by] : [bx, by, ax, ay]
  return `${cx},${cy}-${dx},${dy}`
}

function detectBuildingType(design: DesignOption): 'residential' | 'clinic' | 'commercial' | 'generic' {
  const name = design.name.toLowerCase()
  const cats = new Set(design.elements.map((e) => e.category?.toLowerCase() ?? ''))
  if (name.includes('clinic') || name.includes('surgery') || name.includes('medical') || name.includes('health')) return 'clinic'
  if (name.includes('office') || name.includes('commercial') || name.includes('retail') || name.includes('shop')) return 'commercial'
  if (cats.has('clinic') || cats.has('pharmacy') || cats.has('consultation')) return 'clinic'
  if (cats.has('office') || cats.has('commercial') || cats.has('retail')) return 'commercial'
  return 'residential'
}

function inferBedrooms(design: DesignOption): number {
  const name = design.name.toLowerCase()
  const m = name.match(/(\d+)\s*bed/i)
  if (m) return Math.max(1, Math.min(6, parseInt(m[1])))
  const area = design.grossFloorArea
  if (area < 60) return 1
  if (area < 100) return 2
  if (area < 200) return 3
  if (area < 300) return 4
  return 5
}

function inferBathrooms(bedrooms: number, area: number): number {
  if (area < 60) return 1
  if (bedrooms <= 2) return 1
  if (bedrooms <= 3) return 2
  return Math.min(bedrooms - 1, 4)
}

/* ── Layout strategies ─────────────────────────────────────────── */

function roomRect(
  name: string, type: string,
  xFrac: number, yFrac: number, wFrac: number, dFrac: number,
  W: number, D: number,
): RoomRect {
  return {
    name, type,
    x: xFrac * W,
    y: yFrac * D,
    width: Math.max(wFrac * W, MIN_ROOM_DIM),
    depth: Math.max(dFrac * D, type === 'bathroom' || type === 'toilets' ? MIN_BATH_DIM : MIN_ROOM_DIM),
  }
}

/*
 * Residential single-storey layout.
 *
 *  Left zone (public):    Lounge → Dining → Kitchen → Pantry/Store
 *  Centre zone (passage): Full-depth corridor connecting all rooms
 *  Right zone (private):  Bedrooms interleaved with bathrooms
 *
 *  Front wall (y=0) has main entrance into Lounge.
 *  Kitchen and Dining share a wet-core edge.
 *  Bathrooms grouped as wet core near Bedrooms.
 */
function residentialSingleStoreyRooms(W: number, D: number, bedrooms: number, bathrooms: number): RoomRect[] {
  const rooms: RoomRect[] = []
  const passageW = 0.10
  const leftW = 0.42
  const rightW = 1 - passageW - leftW

  /* Corridor (passage) — runs full depth */
  rooms.push(roomRect('Passage', 'passage', leftW, 0, passageW, 1, W, D))

  /* Left-left zone: public rooms from front to back */
  // Lounge: front
  rooms.push(roomRect('Lounge', 'lounge', 0, 0, leftW, 0.38, W, D))
  // Dining: behind lounge
  rooms.push(roomRect('Dining', 'utility', 0, 0.38, leftW, 0.24, W, D))
  // Kitchen: behind dining (wet core adj dining)
  rooms.push(roomRect('Kitchen', 'kitchen', 0, 0.62, leftW, 0.23, W, D))
  // Pantry/Store at back
  rooms.push(roomRect('Store', 'storage', 0, 0.85, leftW, 0.15, W, D))

  /* Right zone: bedrooms + bathrooms from front to back */
  const rightX = (leftW + passageW)
  const totalRightSlots = bedrooms + bathrooms
  const slotH = totalRightSlots > 0 ? 0.90 / totalRightSlots : 0.90

  let slotIdx = 0
  // First slot: master bedroom (larger, front-right)
  const masterH = Math.max(slotH * 1.3, 0.28)
  rooms.push(roomRect('Bedroom 1', 'bedroom', rightX, 0, rightW, masterH, W, D))
  slotIdx++

  // Remaining bedrooms and bathrooms, one bathroom per 2 bedrooms
  let bathCount = 0
  for (let i = 1; i < bedrooms; i++) {
    const needBath = bathCount < bathrooms && (i % 2 === 1 || bathrooms - bathCount >= bedrooms - i)
    if (needBath) {
      const bathH = Math.max(slotH * 0.8, 0.10)
      rooms.push(roomRect(`Bathroom ${bathCount + 1}`, 'bathroom', rightX, slotIdx * slotH * D, rightW, bathH, W, D))
      slotIdx += 0.8
      bathCount++
    }
    const bedH = Math.max(slotH, 0.18)
    rooms.push(roomRect(`Bedroom ${i + 1}`, 'bedroom', rightX, slotIdx * D, rightW, bedH, W, D))
    slotIdx += 1
  }
  // If bathrooms still remaining, place them
  while (bathCount < bathrooms) {
    const bathH = Math.max(slotH * 0.8, 0.10)
    rooms.push(roomRect(`Bathroom ${bathCount + 1}`, 'bathroom', rightX, slotIdx * D, rightW, bathH, W, D))
    slotIdx += 0.8
    bathCount++
  }

  return rooms
}

/*
 * Two-storey residential:
 *  - Ground floor: Lounge, Kitchen, Dining, Guest WC, optional study/bedroom, Staircase
 *  - Upper floor: Bedrooms, Bathrooms, Passage, Staircase
 */
function residentialTwoStoreyGround(W: number, D: number): RoomRect[] {
  const rooms: RoomRect[] = []
  const passageW = 0.10
  const leftW = 0.42
  const rightW = 1 - passageW - leftW

  /* Passage */
  rooms.push(roomRect('Passage', 'passage', leftW, 0, passageW, 1, W, D))

  /* Left side: public rooms */
  rooms.push(roomRect('Lounge', 'lounge', 0, 0, leftW, 0.40, W, D))
  rooms.push(roomRect('Dining', 'utility', 0, 0.40, leftW, 0.22, W, D))
  rooms.push(roomRect('Kitchen', 'kitchen', 0, 0.62, leftW, 0.23, W, D))
  rooms.push(roomRect('Store', 'storage', 0, 0.85, leftW, 0.15, W, D))

  /* Right side */
  const rightX = leftW + passageW
  rooms.push(roomRect('Guest WC', 'bathroom', rightX, 0, rightW, 0.15, W, D))
  rooms.push(roomRect('Study', 'office', rightX, 0.15, rightW, 0.25, W, D))
  rooms.push(roomRect('Bedroom 1', 'bedroom', rightX, 0.40, rightW, 0.30, W, D))
  // Staircase at back-right
  rooms.push(roomRect('Staircase', 'utility', rightX, 0.70, rightW, 0.15, W, D))
  rooms.push(roomRect('Utility', 'utility', rightX, 0.85, rightW, 0.15, W, D))

  return rooms
}

function residentialTwoStoreyUpper(W: number, D: number, bedrooms: number, bathrooms: number): RoomRect[] {
  const rooms: RoomRect[] = []
  const passageW = 0.10
  const leftW = 0.42
  const rightW = 1 - passageW - leftW

  /* Passage (same position as ground floor) */
  rooms.push(roomRect('Passage', 'passage', leftW, 0, passageW, 1, W, D))

  /* Left side: more bedrooms or study/retreat */
  rooms.push(roomRect('Retreat', 'lounge', 0, 0, leftW, 0.20, W, D)) // upper landing/family area

  // Bedrooms on the left side
  const leftBedrooms = Math.max(0, bedrooms - 3)
  const leftSlotH = leftBedrooms > 0 ? 0.70 / leftBedrooms : 0
  for (let i = 0; i < leftBedrooms; i++) {
    rooms.push(roomRect(`Bedroom ${i + 3}`, 'bedroom', 0, 0.20 + i * leftSlotH, leftW, leftSlotH, W, D))
  }
  // Bathroom on left
  rooms.push(roomRect('Bathroom 3', 'bathroom', 0, 0.90, leftW, 0.10, W, D))

  /* Right side: bedrooms + bathrooms */
  const rightX = leftW + passageW
  const upBedrooms = Math.min(bedrooms, 3)
  const upBathrooms = Math.max(1, bathrooms - 1)
  const totalRightSlots = upBedrooms + upBathrooms
  const slotH = totalRightSlots > 0 ? 0.90 / totalRightSlots : 0.90

  let slotIdx = 0
  let bIdx = 0
  let bathIdx = 0
  for (let i = 0; i < totalRightSlots; i++) {
    if (bathIdx < upBathrooms && (bIdx === 0 || bathIdx * 2 <= bIdx)) {
      const bathH = Math.max(slotH * 0.8, 0.10)
      rooms.push(roomRect(`Bathroom ${bathIdx + 1}`, 'bathroom', rightX, slotIdx * D, rightW, bathH, W, D))
      slotIdx += 0.8
      bathIdx++
    } else if (bIdx < upBedrooms) {
      const bedH = Math.max(slotH, 0.18)
      rooms.push(roomRect(`Bedroom ${bIdx + 1}`, 'bedroom', rightX, slotIdx * D, rightW, bedH, W, D))
      slotIdx += 1
      bIdx++
    }
    if (bIdx >= upBedrooms && bathIdx < upBathrooms) {
      const bathH = Math.max(slotH * 0.8, 0.10)
      rooms.push(roomRect(`Bathroom ${bathIdx + 1}`, 'bathroom', rightX, slotIdx * D, rightW, bathH, W, D))
      slotIdx += 0.8
      bathIdx++
    }
  }

  // Staircase at same position as ground floor
  rooms.push(roomRect('Staircase', 'utility', rightX, 0.70, rightW, 0.15, W, D))

  return rooms
}

/*
 * Clinic single-storey layout.
 *
 *  Front: Reception + Waiting Area (both near entrance)
 *  Centre: Consultation rooms along corridor
 *  Back: Pharmacy, Toilets, Storage
 */
function clinicRooms(W: number, D: number): RoomRect[] {
  const rooms: RoomRect[] = []
  const passageW = 0.08
  const leftW = 0.46
  const rightW = 1 - passageW - leftW

  /* Front zone */
  rooms.push(roomRect('Reception', 'reception', 0, 0, leftW, 0.22, W, D))
  rooms.push(roomRect('Waiting Area', 'waiting', leftW + passageW, 0, rightW, 0.22, W, D))

  /* Corridor */
  rooms.push(roomRect('Corridor', 'passage', leftW, 0.22, passageW, 0.48, W, D))

  /* Centre: consultation rooms */
  const consW = leftW
  const consH = 0.18
  for (let i = 0; i < 4; i++) {
    const col = i % 2
    const row = Math.floor(i / 2)
    rooms.push(roomRect(
      `Consultation ${i + 1}`, 'consultation',
      col === 0 ? 0 : 0, // left side only (2 per row stacked)
      0.22 + row * consH,
      consW, consH,
      W, D,
    ))
  }

  /* Back zone */
  rooms.push(roomRect('Pharmacy', 'pharmacy', 0, 0.70, leftW * 0.5, 0.15, W, D))
  rooms.push(roomRect('Toilets', 'toilets', leftW * 0.5, 0.70, leftW * 0.5, 0.15, W, D))
  rooms.push(roomRect('Storage', 'storage', leftW + passageW, 0.70, rightW, 0.30, W, D))

  return rooms
}

/*
 * Shop / commercial single-storey layout.
 *
 *  Front: Sales area (shopfront)
 *  Middle: Checkout area, then storage
 *  Back: Office, Staff WC
 */
function commercialRooms(W: number, D: number): RoomRect[] {
  const rooms: RoomRect[] = []

  /* Front: open sales area (shop front) — takes full width */
  rooms.push(roomRect('Sales Area', 'commercial', 0, 0, 1, 0.45, W, D))

  /* Back: divided into storage, office, WC */
  const backY = 0.45
  const backH = 0.55
  rooms.push(roomRect('Storage', 'storage', 0, backY, 0.50, backH * 0.65, W, D))
  rooms.push(roomRect('Office', 'office', 0, backY + backH * 0.65, 0.50, backH * 0.35, W, D))
  rooms.push(roomRect('Staff WC', 'bathroom', 0.50, backY, 0.50, backH, W, D))

  return rooms
}

/* Pick the right strategy per building type and floor */
function strategyRooms(
  buildingType: string, W: number, D: number,
  bedrooms: number, bathrooms: number, floorIndex: number, totalFloors: number,
): RoomRect[] {
  if (buildingType === 'clinic') return clinicRooms(W, D)
  if (buildingType === 'commercial') return commercialRooms(W, D)

  /* residential */
  if (totalFloors >= 2 && floorIndex === 0) return residentialTwoStoreyGround(W, D)
  if (totalFloors >= 2 && floorIndex >= 1) return residentialTwoStoreyUpper(W, D, bedrooms, bathrooms)
  return residentialSingleStoreyRooms(W, D, bedrooms, bathrooms)
}

function wallLen(w: GeneratedWall): number {
  return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) || 1
}

function generateWallsForFloor(
  rooms: GeneratedRoom[],
  bldWidth: number,
  depth: number,
  floorIndex: number,
): { walls: GeneratedWall[]; wallMap: Map<string, string> } {
  const walls: GeneratedWall[] = []
  const wallMap = new Map<string, string>()
  const edges: { key: string; x1: number; y1: number; x2: number; y2: number; roomIds: string[] }[] = []

  for (const room of rooms) {
    const rects = [
      [room.x, room.y, room.x + room.width, room.y] as const,
      [room.x + room.width, room.y, room.x + room.width, room.y + room.depth] as const,
      [room.x + room.width, room.y + room.depth, room.x, room.y + room.depth] as const,
      [room.x, room.y + room.depth, room.x, room.y] as const,
    ]
    for (const r of rects) {
      const [x1, y1, x2, y2] = r
      const ek = edgeKey(x1, y1, x2, y2)
      const existing = edges.find((e) => e.key === ek)
      if (existing) {
        existing.roomIds.push(room.id)
      } else {
        edges.push({ key: ek, x1, y1, x2, y2, roomIds: [room.id] })
      }
    }
  }

  for (const edge of edges) {
    const isPerimeter =
      (approxEq(edge.y1, 0) && approxEq(edge.y2, 0)) ||
      (approxEq(edge.y1, depth) && approxEq(edge.y2, depth)) ||
      (approxEq(edge.x1, 0) && approxEq(edge.x2, 0)) ||
      (approxEq(edge.x1, bldWidth) && approxEq(edge.x2, bldWidth))
    const isShared = edge.roomIds.length > 1
    if (!isPerimeter && !isShared) continue
    const kind: 'external' | 'internal' = isPerimeter ? 'external' : 'internal'
    const wallId = `wall-${floorIndex}-${walls.length + 1}`
    walls.push({
      id: wallId,
      floorIndex,
      start: { x: edge.x1, y: edge.y1 },
      end: { x: edge.x2, y: edge.y2 },
      kind,
      thickness: WALL_THICKNESS,
      height: FLOOR_HEIGHT,
    })
    wallMap.set(edge.key, wallId)
  }

  return { walls, wallMap }
}

/*
 * Improved opening placement:
 *  - Main entrance on front wall (opens into Lounge/Reception/Sales)
 *  - Internal doors on passage/corridor walls connecting rooms
 *  - Windows on external walls of bedrooms, lounge, consultation rooms, shopfront
 *  - Kitchen gets a back window
 *  - No openings on shared walls that overlap
 */
function generateOpeningsForFloor(
  rooms: GeneratedRoom[],
  walls: GeneratedWall[],
  wallMap: Map<string, string>,
  _buildingType: string,
  bldWidth: number,
  _depth: number,
  floorIndex: number,
): GeneratedOpening[] {
  const openings: GeneratedOpening[] = []
  const hasDoorOnWall = new Set<string>()
  const hasWindowOnWall = new Set<string>()

  function addDoor(wall: GeneratedWall, offset: number, roomId?: string) {
    const wl = wallLen(wall)
    const clamped = clamp(offset, 0.3, wl - DOOR_WIDTH - 0.3)
    if (clamped < 0.3 || wl < DOOR_WIDTH + 0.6) return
    const doorId = `door-${floorIndex}-${openings.length + 1}`
    openings.push({
      id: doorId, floorIndex, wallId: wall.id,
      type: 'door', width: DOOR_WIDTH, height: DOOR_HEIGHT,
      offset: clamped, roomId,
    })
    hasDoorOnWall.add(wall.id)
  }

  function addWindow(wall: GeneratedWall, offset: number, roomId?: string) {
    const wl = wallLen(wall)
    const clamped = clamp(offset, 0.3, wl - WIN_WIDTH - 0.3)
    if (clamped < 0.3 || wl < WIN_WIDTH + 0.6) return
    if (hasWindowOnWall.has(wall.id)) return
    openings.push({
      id: `win-${floorIndex}-${openings.length + 1}`,
      floorIndex, wallId: wall.id,
      type: 'window', width: WIN_WIDTH, height: WIN_HEIGHT,
      sillHeight: WIN_SILL, offset: clamped, roomId,
    })
    hasWindowOnWall.add(wall.id)
  }

  /* 1. Main entrance door on front wall (y=0) */
  const frontWall = walls.find(
    (w) => approxEq(w.start.y, 0) && approxEq(w.end.y, 0) && w.kind === 'external',
  )
  if (frontWall) {
    addDoor(frontWall, bldWidth * 0.45)
  }

  /* 2. Windows on external walls of key room types, plus passage/pantry windows */
  const windowTypes = new Set(['bedroom', 'lounge', 'consultation', 'waiting', 'reception', 'commercial', 'office', 'kitchen', 'pharmacy'])

  for (const room of rooms) {
    const roomEdges: [number, number, number, number][] = [
      [room.x, room.y, room.x + room.width, room.y],
      [room.x + room.width, room.y, room.x + room.width, room.y + room.depth],
      [room.x + room.width, room.y + room.depth, room.x, room.y + room.depth],
      [room.x, room.y + room.depth, room.x, room.y],
    ]

    for (const [x1, y1, x2, y2] of roomEdges) {
      const ek = edgeKey(x1, y1, x2, y2)
      const wallId = wallMap.get(ek)
      if (!wallId) continue
      const wall = walls.find((w) => w.id === wallId)
      if (!wall) continue

      const wl = wallLen(wall)
      const isExternal = wall.kind === 'external'

      /* Windows on external walls for bedrooms, lounge, consultation, commercial, etc. */
      if (isExternal && windowTypes.has(room.type)) {
        const mid = (wl - WIN_WIDTH) / 2
        addWindow(wall, mid, room.id)
      }

      /* Doors on internal walls — connect rooms to passage/corridor */
      if (!isExternal && !hasDoorOnWall.has(wall.id) && !hasWindowOnWall.has(wall.id)) {
        const isCirculation = room.type === 'passage' || room.type === 'corridor'
        /* Rooms that adjoin passage/corridor get a door from the passage */
        const roomNeedsDoor = room.type !== 'passage' && room.type !== 'corridor' && room.type !== 'staircase'
        for (const otherRoom of rooms) {
          if (otherRoom.id === room.id) continue
          const otherEdges: [number, number, number, number][] = [
            [otherRoom.x, otherRoom.y, otherRoom.x + otherRoom.width, otherRoom.y],
            [otherRoom.x + otherRoom.width, otherRoom.y, otherRoom.x + otherRoom.width, otherRoom.y + otherRoom.depth],
            [otherRoom.x + otherRoom.width, otherRoom.y + otherRoom.depth, otherRoom.x, otherRoom.y + otherRoom.depth],
            [otherRoom.x, otherRoom.y + otherRoom.depth, otherRoom.x, otherRoom.y],
          ]
          const sharesEdge = otherEdges.some((oe) => edgeKey(...oe) === ek)
          if (sharesEdge) {
            /* If one room is passage/corridor and the other needs a door, add door */
            if ((isCirculation || otherRoom.type === 'passage' || otherRoom.type === 'corridor') && roomNeedsDoor) {
              const mid = (wl - DOOR_WIDTH) / 2
              addDoor(wall, mid > 0 ? mid : 0.3, room.id)
            } else if (isCirculation && otherRoom.type !== 'passage' && otherRoom.type !== 'corridor') {
              const mid = (wl - DOOR_WIDTH) / 2
              addDoor(wall, mid > 0 ? mid : 0.3, otherRoom.id)
            }
            break
          }
        }
      }
    }
  }

  /* 3. Kitchen back wall window */
  for (const room of rooms) {
    if (room.type !== 'kitchen') continue
    const backEdge = edgeKey(room.x, room.y + room.depth, room.x + room.width, room.y + room.depth)
    const backWallId = wallMap.get(backEdge)
    if (backWallId) {
      const bw = walls.find((w) => w.id === backWallId)
      if (bw && bw.kind === 'external' && !hasDoorOnWall.has(bw.id) && !hasWindowOnWall.has(bw.id)) {
        addWindow(bw, (wallLen(bw) - WIN_WIDTH) / 2, room.id)
      }
    }
  }

  /* 4. Shopfront windows for commercial */
  for (const room of rooms) {
    if (room.type !== 'commercial') continue
    const frontEdge = edgeKey(room.x, room.y, room.x + room.width, room.y)
    const frontWallId = wallMap.get(frontEdge)
    if (frontWallId) {
      const fw = walls.find((w) => w.id === frontWallId)
      if (fw && fw.kind === 'external' && !hasDoorOnWall.has(fw.id)) {
        // Add shopfront window adjacent to the entrance
        const leftWin = (bldWidth * 0.15 - WIN_WIDTH) / 2
        if (leftWin > 0.3) addWindow(fw, leftWin, room.id)
        const rightWin = bldWidth * 0.70
        if (rightWin + WIN_WIDTH < bldWidth - 0.3) addWindow(fw, rightWin, room.id)
      }
    }
  }

  return openings
}

export function buildDesignGeometry(design: DesignOption | null): BuildGeometryResult {
  if (!design || design.grossFloorArea <= 0 || design.floors <= 0) {
    return { width: 0, depth: 0, floors: 0, rooms: [], walls: [], openings: [], zones: [], warnings: ['No design provided'] }
  }

  const warnings: string[] = []
  const buildingType = detectBuildingType(design)
  const bedrooms = inferBedrooms(design)
  const bathrooms = inferBathrooms(bedrooms, design.grossFloorArea)
  const perFloorArea = design.grossFloorArea / design.floors
  const dim = Math.max(safeSqrt(perFloorArea), 5)
  const width = dim * 2
  const depth = dim

  warnings.push(`Building type: ${buildingType}, ${bedrooms} bed, ${bathrooms} bath, ${design.floors} floor(s)`)

  const allRooms: GeneratedRoom[] = []
  const allWalls: GeneratedWall[] = []
  const allOpenings: GeneratedOpening[] = []
  const allZones: GeneratedZone[] = []

  for (let fi = 0; fi < design.floors; fi++) {
    const rects = strategyRooms(buildingType, width, depth, bedrooms, bathrooms, fi, design.floors)

    const floorRooms: GeneratedRoom[] = rects.map((r, idx) => {
      const id = `room-${fi + 1}-${idx + 1}`
      return {
        id,
        name: r.name,
        type: r.type,
        floorIndex: fi,
        x: clamp(r.x, 0, width - r.width),
        y: clamp(r.y, 0, depth - r.depth),
        width: clamp(r.width, MIN_ROOM_DIM, width - clamp(r.x, 0, width - r.width)),
        depth: clamp(r.depth, MIN_BATH_DIM, depth - clamp(r.y, 0, depth - r.depth)),
        area: clamp(r.width * r.depth, 0, width * depth),
      }
    })

    const { walls, wallMap } = generateWallsForFloor(floorRooms, width, depth, fi)
    const openings = generateOpeningsForFloor(floorRooms, walls, wallMap, buildingType, width, depth, fi)

    const zone: GeneratedZone = {
      id: `zone-${fi + 1}`,
      name: fi === 0 ? 'Ground Floor' : `Floor ${fi + 1}`,
      type: 'building',
      floorIndex: fi,
      area: width * depth,
      roomIds: floorRooms.map((r) => r.id),
    }

    allRooms.push(...floorRooms)
    allWalls.push(...walls)
    allOpenings.push(...openings)
    allZones.push(zone)
  }

  return {
    width,
    depth,
    floors: design.floors,
    rooms: allRooms,
    walls: allWalls,
    openings: allOpenings,
    zones: allZones,
    warnings,
  }
}
