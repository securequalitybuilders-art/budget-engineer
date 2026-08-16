import { placeAdjacencyLayout, GRID, snap, hasOverlaps, type AdjacencyProgramRoom } from '../../../engine/spatial/graph-placer'
import { HOTEL_ADJACENCY_RULES, roomGroupForHotel, computeAdjacencyScore, rectsTouch, type HotelRoomGroup, type AdjacencyRoom } from '../../../engine/spatial/adjacency-graph'
import { coreMinDimsFor } from '../../../engine/spatial/core-planning'
import { getTypology } from '../../../engine/typology-kb'
import { templateForTypology } from '../layout-templates'
import { packTemplate } from '../grid-packer'
import type { FloorContext, FloorLayoutResult } from '../typology-types'
import type { AdjacencyRule, CoreType, StructuralGrid } from '../../../engine/tier1-types'

const DEFAULT_GRID: StructuralGrid = { spanX: 7.2, spanY: 7.2 }
const DEFAULT_CORE: CoreType = 'central'
const DEFAULT_EFFICIENCY = 0.72

/**
 * Per-role minimum depths for hotel rooms on the shared adjacency path. Keys are
 * the placement roles the placer stacks by (see hotelRoleFor), not raw names.
 */
export const HOTEL_MIN_DEPTH: Record<string, number> = {
  reception: 3.0,
  meeting: 3.5,
  kitchenette: 2.0,
  'private-office': 3.5,
  wc: 2.0,
}

/**
 * Map a hotel room name to a placement role for the shared adjacency placer.
 *
 * Lobby becomes the reception front band; restaurant/conference the meeting
 * band; kitchen/back-of-house the kitchenette band; guest rooms and admin are
 * private offices down the spine. Groups without a mapping pass through
 * (wc/stair/lift/corridor), unclassified rooms pass null.
 */
const ROLE_MAP: Record<HotelRoomGroup, string> = {
  guest: 'private-office',
  lobby: 'reception',
  restaurant: 'meeting',
  kitchen: 'kitchenette',
  conference: 'meeting',
  'back-of-house': 'kitchenette',
  admin: 'private-office',
  wc: 'wc',
  stair: 'stair',
  lift: 'lift',
  corridor: 'corridor',
}

export function hotelRoleFor(name: string): string | null {
  const group = roomGroupForHotel(name)
  if (!group) return null
  return ROLE_MAP[group]
}

/**
 * Double-loaded corridor guest floor.
 *
 * Geometry:
 *   [core column]  |  top guest band  |  corridor 1.8  |  bottom guest band  |  front public band
 *
 * The core column (stairs/lifts/WCs) sits on the left, the horizontal corridor
 * runs between two guest bands, and remaining public rooms (restaurant,
 * conference, lobby) form a full-width front band. Every cell is snapped to the
 * placement grid. Returns null when the program cannot fit (row overflow past
 * the 1.5 m minimum cell width) so the caller can fall back.
 */
function placeDoubleLoadedGuestFloor(
  rooms: AdjacencyProgramRoom[],
  width: number,
  height: number,
  grid: StructuralGrid,
  coreType: CoreType,
  adjacencyRules: AdjacencyRule[],
): FloorLayoutResult | null {
  const guestRooms = rooms.filter(r => roomGroupForHotel(r.name) === 'guest')
  const coreRooms = rooms.filter(r => {
    const g = roomGroupForHotel(r.name)
    return g === 'stair' || g === 'lift' || g === 'wc'
  })
  const corridorRooms = rooms.filter(r => roomGroupForHotel(r.name) === 'corridor')
  const publicRooms = rooms.filter(r => {
    const g = roomGroupForHotel(r.name)
    return g != null && g !== 'guest' && g !== 'corridor' && g !== 'stair' && g !== 'lift' && g !== 'wc'
  })

  const colW = coreRooms.length > 0 ? snap(Math.max(...coreRooms.map(r => coreMinDimsFor(r.name).minWidth))) : 0
  const availW = width - colW
  if (availW < 4) return null

  const maxGuestArea = Math.max(0, ...guestRooms.map(r => r.areaM2))
  const bandDepth = snap(Math.min(height * 0.3, maxGuestArea > 0 ? maxGuestArea / 3.5 : height * 0.3))
  if (bandDepth < 1.5) return null
  const corrY = bandDepth
  const midY = corrY + 1.8
  const frontY = midY + bandDepth
  const frontDepth = height - frontY
  if (frontY > height) return null

  const placed: AdjacencyRoom[] = []
  const coreIds: string[] = []

  // Core column on the left, stacked top-down.
  let coreCursor = 0
  for (const room of coreRooms) {
    const { minDepth } = coreMinDimsFor(room.name)
    const ideal = room.areaM2 > 0 ? room.areaM2 / colW : minDepth
    const h = Math.max(minDepth, Math.min(ideal, height - coreCursor))
    if (h <= 0) break
    placed.push({ id: room.id, name: room.name, x: 0, y: snap(coreCursor), width: colW, height: snap(h) })
    coreIds.push(room.id)
    coreCursor += h
  }
  const coreBlock = coreIds.length > 0
    ? { roomIds: coreIds, x: 0, y: 0, width: colW, height: snap(coreCursor) }
    : null

  // Place a row of cells (guest band or front band) inside an available width.
  // Each cell is at least minW wide; mild overflow shrinks proportionally and
  // the last cell stretches to the remainder. Overflow past the 1.5 m floor
  // returns null so the caller can fall back to a different strategy.
  const placeRow = (
    rowRooms: AdjacencyProgramRoom[],
    y: number,
    depth: number,
    minW: number,
  ): AdjacencyRoom[] | null => {
    if (depth < 1.5) return null
    const cells = rowRooms.map(r => ({ room: r, w: Math.max(minW, snap(r.areaM2 / depth)) }))
    const totalW = cells.reduce((sum, c) => sum + c.w, 0)
    const scale = totalW > availW ? availW / totalW : 1
    const out: AdjacencyRoom[] = []
    let cursor = colW
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      const w = i === cells.length - 1 ? availW - (cursor - colW) : snap(c.w * scale)
      if (w < 1.5) return null
      out.push({ id: c.room.id, name: c.room.name, x: snap(cursor), y: snap(y), width: snap(w), height: depth })
      cursor += w
    }
    return out
  }

  // Split guest rooms top/bottom; the rest form the public front band.
  const topCount = Math.ceil(guestRooms.length / 2)
  const topRow = placeRow(guestRooms.slice(0, topCount), 0, bandDepth, 3.5)
  if (!topRow) return null
  const bottomRow = placeRow(guestRooms.slice(topCount), midY, bandDepth, 3.5)
  if (!bottomRow) return null

  const frontYFinal = frontY
  const frontRow = publicRooms.length > 0
    ? placeRow(publicRooms, frontYFinal, frontDepth, 3.5)
    : []
  if (!frontRow) return null

  const corridorRoom = corridorRooms[0]
  const corridor: AdjacencyRoom = {
    id: corridorRoom?.id ?? '__corridor__',
    name: corridorRoom?.name ?? 'Circulation',
    x: colW,
    y: corrY,
    width: availW,
    height: 1.8,
  }

  placed.push(...topRow, ...bottomRow, ...frontRow, corridor)

  const totalAreaM2 = width * height
  const coreAreaM2 = coreBlock ? coreBlock.width * coreBlock.height : 0
  const circulationAreaM2 = corridor.width * corridor.height
  const programAreaM2 = placed.reduce((sum, r) => sum + r.width * r.height, 0) - coreAreaM2 - circulationAreaM2
  const efficiency = totalAreaM2 > 0 ? (totalAreaM2 - coreAreaM2 - circulationAreaM2) / totalAreaM2 : 0

  const valid =
    placed.every(r =>
      r.x >= -GRID && r.y >= -GRID && r.x + r.width <= width + GRID && r.y + r.height <= height + GRID &&
      r.width > 0 && r.height > 0,
    ) && !hasOverlaps(placed)

  const coreLayout = coreBlock
    ? { coreType, blocks: [coreBlock], x: coreBlock.x, y: coreBlock.y }
    : { coreType, blocks: [], x: 0, y: 0 }

  return {
    rooms: placed.map(r => ({ id: r.id, name: r.name, x: r.x, y: r.y, width: r.width, height: r.height })),
    structuralGrid: grid,
    coreLayout,
    floorPlateMetrics: {
      totalAreaM2,
      programAreaM2,
      circulationAreaM2,
      coreAreaM2,
      efficiency,
      grid,
      columns: Math.max(1, Math.round(width / grid.spanX)),
      rows: Math.max(1, Math.round(height / grid.spanY)),
    },
    adjacencyGraph: computeAdjacencyScore(adjacencyRules, placed, rectsTouch, roomGroupForHotel),
    valid,
  }
}

/**
 * Hotel floor strategy.
 *
 * Guest floors (2+ guest rooms) use a deterministic double-loaded corridor
 * layout via placeDoubleLoadedGuestFloor. Public floors and any layout the
 * double-loaded pass cannot fit fall back to the shared adjacency placer
 * (single corridor spine) with hotel roles; if that also cannot place every
 * program room, the layout degrades to grid-template packing so no program room
 * silently disappears. The KB entry (getTypology('hotel-fullservice')) is the
 * single authority for structural grid / core type / adjacency rules / nominal
 * efficiency; hardcoded constants fall back when the entry lacks them.
 */
export function generateHotelLayout(
  program: { name: string; ratio?: number; areaM2?: number }[],
  width: number,
  height: number,
  seed = 0,
  _floorContext?: FloorContext,
): FloorLayoutResult {
  const kb = getTypology('hotel-fullservice')
  const grid: StructuralGrid = kb?.structuralGrid ?? DEFAULT_GRID
  const coreType: CoreType = kb?.coreType ?? DEFAULT_CORE
  const adjacencyRules: AdjacencyRule[] =
    kb?.adjacencyRules && kb.adjacencyRules.length > 0 ? kb.adjacencyRules : HOTEL_ADJACENCY_RULES
  const floorPlateEfficiency = kb?.floorPlateEfficiency ?? DEFAULT_EFFICIENCY

  const totalAreaM2 = width * height
  const rooms: AdjacencyProgramRoom[] = program
    .map((p, i) => ({
      id: `hotel-${i}`,
      name: p.name,
      areaM2: p.ratio != null ? p.ratio * totalAreaM2 : (p.areaM2 ?? 0),
    }))
    .filter(r => r.areaM2 > 0)

  const guestCount = rooms.filter(r => roomGroupForHotel(r.name) === 'guest').length

  // Primary: double-loaded corridor for guest floors.
  if (guestCount >= 2) {
    const doubleLoaded = placeDoubleLoadedGuestFloor(rooms, width, height, grid, coreType, adjacencyRules)
    if (doubleLoaded) {
      return {
        ...doubleLoaded,
        adjacencyGraph: doubleLoaded.adjacencyGraph,
        structuralGrid: grid,
      }
    }
  }

  // Secondary: shared adjacency placer (single corridor spine).
  const result = placeAdjacencyLayout(rooms, width, height, {
    corridorWidth: 1.8,
    coreType,
    grid,
    adjacencyRules,
    roleFor: hotelRoleFor,
    groupFor: roomGroupForHotel,
    coreGroups: ['stair', 'lift', 'wc'],
    minDepths: HOTEL_MIN_DEPTH,
    frontGroups: ['reception'],
    bandGroups: ['meeting', 'kitchenette'],
  })

  if (result.valid && result.rooms.length === rooms.length) {
    return {
      rooms: result.rooms.map(r => ({ id: r.id, name: r.name, x: r.x, y: r.y, width: r.width, height: r.height })),
      structuralGrid: grid,
      coreLayout: result.coreLayout,
      floorPlateMetrics: {
        ...result.floorPlate,
        efficiency: result.floorPlate.efficiency > 0 ? result.floorPlate.efficiency : floorPlateEfficiency,
      },
      adjacencyGraph: result.adjacency,
      valid: true,
    }
  }

  // Fallback: grid-template packing.
  const t = templateForTypology('apartment', totalAreaM2, seed)
  const packed = packTemplate(
    t,
    program.map(p => ({ name: p.name, ratio: p.ratio ?? 0 })),
    width,
    height,
    seed,
  )
  const valid = packed.valid && packed.warnings.filter(w => w.roomName && w.message.includes('invalid')).length === 0
  return {
    rooms: packed.rooms,
    warnings: packed.warnings.map(w => w.message),
    valid,
    structuralGrid: grid,
  }
}
