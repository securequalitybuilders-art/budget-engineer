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

const FLOOR_HEIGHT = 3
const WALL_THICKNESS = 0.23

function safeSqrt(n: number): number {
  return n > 0 ? Math.sqrt(n) : 0
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
  if (name.includes('office') || name.includes('commercial') || name.includes('retail')) return 'commercial'
  if (cats.has('clinic') || cats.has('pharmacy') || cats.has('consultation')) return 'clinic'
  if (cats.has('office') || cats.has('commercial')) return 'commercial'
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

interface RoomTemplate {
  name: string
  type: string
  xFrac: number
  yFrac: number
  wFrac: number
  dFrac: number
}

function getRoomTemplates(buildingType: string, bedrooms: number, bathrooms: number): RoomTemplate[] {
  if (buildingType === 'clinic') {
    return [
      { name: 'Reception', type: 'reception', xFrac: 0, yFrac: 0, wFrac: 0.50, dFrac: 0.25 },
      { name: 'Waiting Area', type: 'waiting', xFrac: 0.50, yFrac: 0, wFrac: 0.50, dFrac: 0.25 },
      { name: 'Consultation 1', type: 'consultation', xFrac: 0, yFrac: 0.25, wFrac: 0.50, dFrac: 0.20 },
      { name: 'Consultation 2', type: 'consultation', xFrac: 0.50, yFrac: 0.25, wFrac: 0.50, dFrac: 0.20 },
      { name: 'Consultation 3', type: 'consultation', xFrac: 0, yFrac: 0.45, wFrac: 0.50, dFrac: 0.20 },
      { name: 'Consultation 4', type: 'consultation', xFrac: 0.50, yFrac: 0.45, wFrac: 0.50, dFrac: 0.20 },
      { name: 'Pharmacy', type: 'pharmacy', xFrac: 0, yFrac: 0.65, wFrac: 0.35, dFrac: 0.20 },
      { name: 'Toilets', type: 'toilets', xFrac: 0.35, yFrac: 0.65, wFrac: 0.30, dFrac: 0.20 },
      { name: 'Storage', type: 'storage', xFrac: 0.65, yFrac: 0.65, wFrac: 0.35, dFrac: 0.35 },
    ]
  }
  if (buildingType === 'commercial') {
    return [
      { name: 'Reception', type: 'reception', xFrac: 0, yFrac: 0, wFrac: 0.35, dFrac: 0.30 },
      { name: 'Open Office', type: 'office', xFrac: 0.35, yFrac: 0, wFrac: 0.65, dFrac: 0.55 },
      { name: 'Meeting Room', type: 'office', xFrac: 0, yFrac: 0.30, wFrac: 0.35, dFrac: 0.25 },
      { name: 'Kitchenette', type: 'utility', xFrac: 0, yFrac: 0.55, wFrac: 0.25, dFrac: 0.20 },
      { name: 'Storage', type: 'storage', xFrac: 0.25, yFrac: 0.55, wFrac: 0.25, dFrac: 0.20 },
      { name: 'Office 2', type: 'office', xFrac: 0.50, yFrac: 0.55, wFrac: 0.25, dFrac: 0.45 },
      { name: 'Office 3', type: 'office', xFrac: 0.75, yFrac: 0.55, wFrac: 0.25, dFrac: 0.45 },
    ]
  }
  const templates: RoomTemplate[] = [
    { name: 'Lounge', type: 'lounge', xFrac: 0, yFrac: 0, wFrac: 1.0, dFrac: 0.35 },
    { name: 'Passage', type: 'passage', xFrac: 0, yFrac: 0.35, wFrac: 0.20, dFrac: 0.20 },
  ]
  const colWidth = (1 - 0.20) / Math.max(1, bedrooms - 1)
  for (let i = 1; i < bedrooms; i++) {
    templates.push({
      name: `Bedroom ${i}`,
      type: 'bedroom',
      xFrac: 0.20 + (i - 1) * colWidth,
      yFrac: 0.35,
      wFrac: colWidth - 0.02,
      dFrac: 0.20,
    })
  }
  const bathColW = (1 - 0.20) / Math.max(1, bathrooms)
  for (let i = 0; i < bathrooms; i++) {
    templates.push({
      name: `Bathroom ${i + 1}`,
      type: 'bathroom',
      xFrac: 0.20 + i * bathColW,
      yFrac: 0.55,
      wFrac: Math.max(bathColW - 0.02, 0.10),
      dFrac: 0.15,
    })
  }
  templates.push(
    { name: 'Kitchen', type: 'kitchen', xFrac: 0, yFrac: 0.70, wFrac: 0.50, dFrac: 0.30 },
    { name: 'Dining', type: 'utility', xFrac: 0.50, yFrac: 0.70, wFrac: 0.50, dFrac: 0.30 },
  )
  return templates
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

function generateOpeningsForFloor(
  rooms: GeneratedRoom[],
  walls: GeneratedWall[],
  wallMap: Map<string, string>,
  bldWidth: number,
  floorIndex: number,
): GeneratedOpening[] {
  const openings: GeneratedOpening[] = []
  const doorWidth = 0.90
  const doorHeight = 2.1
  const winWidth = 1.2
  const winHeight = 1.5
  const winSill = 0.9

  const hasDoorOnWall = new Set<string>()

  function addDoor(wall: GeneratedWall, offset: number, roomId?: string) {
    const clamped = Math.max(0.3, Math.min(offset, wallLen(wall) - doorWidth - 0.3))
    if (clamped < 0.3) return
    const doorId = `door-${floorIndex}-${openings.length + 1}`
    openings.push({
      id: doorId,
      floorIndex,
      wallId: wall.id,
      type: 'door',
      width: doorWidth,
      height: doorHeight,
      offset: clamped,
      roomId,
    })
    hasDoorOnWall.add(wall.id)
  }

  function addWindow(wall: GeneratedWall, offset: number, roomId?: string) {
    const clamped = Math.max(0.3, Math.min(offset, wallLen(wall) - winWidth - 0.3))
    if (clamped < 0.3) return
    openings.push({
      id: `win-${floorIndex}-${openings.length + 1}`,
      floorIndex,
      wallId: wall.id,
      type: 'window',
      width: winWidth,
      height: winHeight,
      sillHeight: winSill,
      offset: clamped,
      roomId,
    })
  }

  function wallLen(w: GeneratedWall): number {
    return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) || 1
  }

  const frontWall = walls.find(
    (w) => approxEq(w.start.y, 0) && approxEq(w.end.y, 0) && w.kind === 'external',
  )
  if (frontWall) {
    addDoor(frontWall, bldWidth * 0.45)
  }

  for (const room of rooms) {
    const roomEdges: [number, number, number, number][] = [
      [room.x, room.y, room.x + room.width, room.y],
      [room.x + room.width, room.y, room.x + room.width, room.y + room.depth],
      [room.x + room.width, room.y + room.depth, room.x, room.y + room.depth],
      [room.x, room.y + room.depth, room.x, room.y],
    ]
    const isBedroom = room.type === 'bedroom'
    const isLounge = room.type === 'lounge'
    const isConsultation = room.type === 'consultation'
    const isWaiting = room.type === 'waiting'
    const isReception = room.type === 'reception'
    const isKitchen = room.type === 'kitchen'

    for (const [x1, y1, x2, y2] of roomEdges) {
      const ek = edgeKey(x1, y1, x2, y2)
      const wallId = wallMap.get(ek)
      if (!wallId) continue
      const wall = walls.find((w) => w.id === wallId)
      if (!wall) continue

      const isExternal = wall.kind === 'external'

      if (isExternal) {
        if (isBedroom || isLounge || isConsultation || isWaiting || isReception) {
          const mid = wallLen(wall) / 2 - winWidth / 2
          if (mid > 0.3) addWindow(wall, mid, room.id)
        }
      } else {
        if (!hasDoorOnWall.has(wall.id)) {
          const mid = wallLen(wall) / 2 - doorWidth / 2
          if (mid > 0.3) addDoor(wall, mid > 0 ? mid : 0.3, room.id)
        }
      }
    }

    if (!isBedroom && !isLounge && !isConsultation && !isWaiting && !isReception) {
      if (!isKitchen && !isReception) continue
      if (isKitchen) {
        const backEdge = edgeKey(room.x, room.y + room.depth, room.x + room.width, room.y + room.depth)
        const backWallId = wallMap.get(backEdge)
        if (backWallId) {
          const bw = walls.find((w) => w.id === backWallId)
          if (bw && bw.kind === 'external' && !hasDoorOnWall.has(bw.id)) {
            addWindow(bw, wallLen(bw) / 2 - winWidth / 2, room.id)
          }
        }
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

  const templates = getRoomTemplates(buildingType, bedrooms, bathrooms)

  for (let fi = 0; fi < design.floors; fi++) {
    const floorRooms: GeneratedRoom[] = []

    for (let ti = 0; ti < templates.length; ti++) {
      const t = templates[ti]
      const rx = t.xFrac * width
      const ry = fi > 0 && t.type === 'lounge'
        ? t.yFrac * depth * 0.6
        : t.yFrac * depth
      const rw = t.wFrac * width
      const rd = t.dFrac * depth
      const room: GeneratedRoom = {
        id: `room-${fi + 1}-${ti + 1}`,
        name: fi > 0 && t.name === 'Lounge' ? 'Living Area' : t.name,
        type: t.type,
        floorIndex: fi,
        x: rx,
        y: ry,
        width: Math.max(rw, 1.5),
        depth: Math.max(rd, 1.2),
        area: rw * rd,
      }
      floorRooms.push(room)
    }

    if (fi > 0) {
      floorRooms.push({
        id: `room-${fi + 1}-stairs`,
        name: 'Staircase',
        type: 'utility',
        floorIndex: fi,
        x: width - 2.5,
        y: 0,
        width: 2.5,
        depth: 2.5,
        area: 6.25,
      })
    }

    const { walls, wallMap } = generateWallsForFloor(floorRooms, width, depth, fi)
    const openings = generateOpeningsForFloor(floorRooms, walls, wallMap, width, fi)

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
