import {
  computeAdjacencyScore,
  OFFICE_ADJACENCY_RULES,
  roomGroupFor,
  type AdjacencyRoom,
} from './adjacency-graph'
import { coreMinDimsFor, selectCoreType } from './core-planning'
import type {
  AdjacencyGraphModel,
  AdjacencyRule,
  CoreLayout,
  CoreType,
  FloorPlateMetrics,
  StructuralGrid,
} from '../tier1-types'

export const GRID = 0.05

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID
}

export interface AdjacencyProgramRoom {
  id: string
  name: string
  areaM2: number
}

export interface AdjacencyLayoutOptions {
  /** Corridor width in metres. Default 1.8. */
  corridorWidth?: number
  /** Preferred core type. Default: computed from plate proportions. */
  coreType?: CoreType
  /** Structural grid. Default 7.2 x 7.2. */
  grid?: StructuralGrid
  /** Adjacency rules scored against the placed layout. Default OFFICE_ADJACENCY_RULES. */
  adjacencyRules?: AdjacencyRule[]
  /** Maps a room name to a placement role. Default roomGroupFor. */
  roleFor?: (name: string) => string | null
  /** Maps a room name to an adjacency group. Default roomGroupFor. */
  groupFor?: (name: string) => string | null
  /** Groups that form the core block. Default stair/lift/wc/server. */
  coreGroups?: string[]
  /** Per-group minimum depth overrides. Default MIN_DEPTH. */
  minDepths?: Record<string, number>
  /** Groups laid out as a full-width front band (e.g. reception). Default ['reception']. */
  frontGroups?: string[]
  /** Groups laid out as half-width band cells above the open plan. Default ['meeting','kitchenette']. */
  bandGroups?: string[]
}

export interface AdjacencyLayoutResult {
  rooms: AdjacencyRoom[]
  corridor: AdjacencyRoom | null
  coreLayout: CoreLayout
  floorPlate: FloorPlateMetrics
  adjacency: AdjacencyGraphModel
  score: number
  valid: boolean
}

const DEFAULT_CORE_GROUPS = new Set(['stair', 'lift', 'wc', 'server'])

const MIN_DEPTH: Record<string, number> = {
  'open-plan': 5.0,
  meeting: 3.5,
  kitchenette: 2.0,
  reception: 3.0,
  'private-office': 3.5,
}

function minDepthFor(name: string, group: string | null, minDepths: Record<string, number> = MIN_DEPTH): number {
  if (group && minDepths[group] != null) return minDepths[group]
  return coreMinDimsFor(name).minDepth
}

function totalArea(rooms: AdjacencyProgramRoom[]): number {
  return rooms.reduce((sum, r) => sum + r.areaM2, 0)
}

function stackColumn(
  rooms: AdjacencyProgramRoom[],
  x: number,
  width: number,
  startY: number,
  maxHeight: number,
  roleOf: (name: string) => string | null = roomGroupFor,
  minDepths: Record<string, number> = MIN_DEPTH,
): { placed: AdjacencyRoom[]; usedHeight: number } {
  const placed: AdjacencyRoom[] = []
  let y = startY
  for (const room of rooms) {
    const group = roleOf(room.name)
    const depth = Math.min(Math.max(minDepthFor(room.name, group, minDepths), totalArea([room]) / width), maxHeight - (y - startY))
    if (depth <= GRID) break
    placed.push({ id: room.id, name: room.name, x, y, width, height: snap(depth) })
    y += depth
  }
  return { placed, usedHeight: y - startY }
}

function coreBlockFor(rooms: AdjacencyRoom[]): CoreLayout['blocks'][number] | null {
  if (rooms.length === 0) return null
  const minX = Math.min(...rooms.map(r => r.x))
  const minY = Math.min(...rooms.map(r => r.y))
  const maxX = Math.max(...rooms.map(r => r.x + r.width))
  const maxY = Math.max(...rooms.map(r => r.y + r.height))
  return { roomIds: rooms.map(r => r.id), x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Place an office floor using the graph-based adjacency model.
 *
 * Geometry (single corridor spine):
 *   [left column: core + offices] | corridor 1.8 | [right zone: core + band + open plan]
 *   reception spans the full plate width at the bottom.
 *
 * Every applicable OFFICE_ADJACENCY_RULES entry resolves to a shared boundary
 * for all three core types, so the canonical office program scores 1.0.
 */
export function placeAdjacencyLayout(
  program: AdjacencyProgramRoom[],
  width: number,
  height: number,
  opts: AdjacencyLayoutOptions = {},
): AdjacencyLayoutResult {
  const corridorWidth = opts.corridorWidth ?? 1.8
  const grid: StructuralGrid = opts.grid ?? { spanX: 7.2, spanY: 7.2 }
  const coreType: CoreType = selectCoreType(width, height, opts.coreType)

  const roleOf = opts.roleFor ?? roomGroupFor
  const groupOf = opts.groupFor ?? roomGroupFor
  const coreGroups = new Set(opts.coreGroups ?? [...DEFAULT_CORE_GROUPS])
  const minDepths = opts.minDepths ?? MIN_DEPTH
  const frontGroups = opts.frontGroups ?? ['reception']
  const bandGroups = opts.bandGroups ?? ['meeting', 'kitchenette']

  const byGroup = new Map<string, AdjacencyProgramRoom[]>()
  for (const room of program) {
    const g = roleOf(room.name)
    if (!g) continue
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(room)
  }

  const core = program.filter(r => coreGroups.has(roleOf(r.name) ?? ''))
  const offices = byGroup.get('private-office') ?? []
  const openPlan = byGroup.get('open-plan') ?? []
  const corridorRooms = byGroup.get('corridor') ?? []

  const corridorName = corridorRooms[0]?.name ?? 'Circulation'

  // Split the core between the left column and the right zone per core type.
  const stairLift = core.filter(r => {
    const g = roleOf(r.name)
    return g === 'stair' || g === 'lift'
  })
  const wcServer = core.filter(r => !stairLift.includes(r))
  let coreL: AdjacencyProgramRoom[]
  let coreR: AdjacencyProgramRoom[]
  if (coreType === 'side') {
    coreL = core
    coreR = []
  } else if (coreType === 'dual') {
    coreL = stairLift
    coreR = wcServer
  } else {
    coreL = wcServer
    coreR = stairLift
  }

  const colW = snap(Math.max(3.5, ...coreL.map(r => coreMinDimsFor(r.name).minWidth)))
  const corrX = colW
  const corrRight = colW + corridorWidth
  const Rz = width - colW - corridorWidth

  // Front band (reception by default) spans the full plate width at the bottom.
  const frontCells = frontGroups.map(g => byGroup.get(g) ?? []).filter(rooms => rooms.length > 0)
  const frontH =
    frontCells.length > 0
      ? snap(
          Math.min(
            Math.max(
              frontCells.reduce((sum, rooms) => sum + totalArea(rooms), 0) / width,
              Math.max(...frontCells.map(rooms => minDepthFor(rooms[0].name, roleOf(rooms[0].name), minDepths))),
            ),
            5.0,
          ),
        )
      : 0
  const corridorH = height - frontH

  const placed: AdjacencyRoom[] = []

  // Left column: coreL on top, offices below.
  const leftStack = stackColumn([...coreL, ...offices], 0, colW, 0, corridorH, roleOf, minDepths)
  placed.push(...leftStack.placed)

  // Right zone: coreR on top, band (meeting + kitchenette by default) below, open plan at the bottom.
  const rightTop = stackColumn(coreR, corrRight, Rz, 0, corridorH, roleOf, minDepths)
  placed.push(...rightTop.placed)
  const bandY = rightTop.usedHeight

  const presentBand = bandGroups.map(g => byGroup.get(g) ?? []).filter(rooms => rooms.length > 0)
  const bandW = snap(Rz / Math.max(1, presentBand.length))
  const bandDepth = Math.max(0, ...presentBand.map(rooms => minDepthFor(rooms[0].name, roleOf(rooms[0].name), minDepths)))
  const bandHeight = snap(bandDepth)

  // One band cell per group; rooms within a cell stack vertically, and the last stretches to the band depth.
  presentBand.forEach((rooms, i) => {
    const cellX = corrRight + i * bandW
    const cellStack = stackColumn(rooms, cellX, bandW, bandY, bandHeight, roleOf, minDepths)
    if (cellStack.placed.length === 0) return
    placed.push(...cellStack.placed)
    const last = cellStack.placed[cellStack.placed.length - 1]
    last.height = snap(bandHeight - (last.y - bandY))
  })

  const openY = bandY + bandHeight
  if (openPlan.length > 0) {
    const openArea = totalArea(openPlan)
    const openDepth = Math.min(
      Math.max(openArea / Rz, minDepthFor(openPlan[0].name, 'open-plan', minDepths)),
      Math.max(0, corridorH - openY),
    )
    if (openDepth > GRID) {
      placed.push({
        id: openPlan[0].id,
        name: openPlan[0].name,
        x: corrRight,
        y: snap(openY),
        width: Rz,
        height: snap(openDepth),
      })
    }
  }

  // Corridor rect.
  const corridor: AdjacencyRoom = {
    id: corridorRooms[0]?.id ?? '__corridor__',
    name: corridorName,
    x: corrX,
    y: 0,
    width: corridorWidth,
    height: snap(corridorH),
  }
  placed.push(corridor)

  // Front band cells below the corridor.
  if (frontH > 0) {
    const cellW = snap(width / frontCells.length)
    frontCells.forEach((rooms, i) => {
      placed.push({
        id: rooms[0].id,
        name: rooms[0].name,
        x: snap(i * cellW),
        y: snap(height - frontH),
        width: cellW,
        height: frontH,
      })
    })
  }

  const coreRoomsPlaced = placed.filter(r => coreGroups.has(roleOf(r.name) ?? ''))
  const coreBlock = coreBlockFor(coreRoomsPlaced)
  const coreLayout: CoreLayout = coreBlock
    ? { coreType, blocks: [coreBlock], x: coreBlock.x, y: coreBlock.y }
    : { coreType, blocks: [], x: 0, y: 0 }

  const floorPlate = computeFloorPlate2(width, height, placed, corridor, coreLayout.blocks, grid)
  const rules = opts.adjacencyRules ?? OFFICE_ADJACENCY_RULES
  const adjacency = computeAdjacencyScore(rules, placed, undefined, groupOf)

  const valid =
    placed.every(r => r.x >= -GRID && r.y >= -GRID && r.x + r.width <= width + GRID && r.y + r.height <= height + GRID && r.width > 0 && r.height > 0) &&
    !hasOverlaps(placed)

  return {
    rooms: placed,
    corridor,
    coreLayout,
    floorPlate,
    adjacency,
    score: adjacency.score,
    valid,
  }
}

function computeFloorPlate2(
  width: number,
  height: number,
  rooms: AdjacencyRoom[],
  corridor: AdjacencyRoom | null,
  coreBlocks: CoreLayout['blocks'],
  grid: StructuralGrid,
): FloorPlateMetrics {
  const totalAreaM2 = width * height
  const coreAreaM2 = coreBlocks.reduce((s, b) => s + b.width * b.height, 0)
  const circulationAreaM2 = corridor ? corridor.width * corridor.height : 0
  const programAreaM2 = rooms.reduce((s, r) => s + r.width * r.height, 0) - coreAreaM2 - circulationAreaM2
  const efficiency = totalAreaM2 > 0 ? (totalAreaM2 - coreAreaM2 - circulationAreaM2) / totalAreaM2 : 0
  const columns = Math.max(1, Math.round(width / grid.spanX))
  const rows = Math.max(1, Math.round(height / grid.spanY))
  return { totalAreaM2, programAreaM2, circulationAreaM2, coreAreaM2, efficiency, grid, columns, rows }
}

export function hasOverlaps(rooms: AdjacencyRoom[]): boolean {
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i]
      const b = rooms[j]
      const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
      const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
      if (xOverlap > GRID && yOverlap > GRID) return true
    }
  }
  return false
}
