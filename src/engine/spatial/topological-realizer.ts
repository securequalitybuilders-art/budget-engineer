/**
 * Bubble-diagram realizer — turns a BubbleDiagram back into a FloorLayoutResult.
 *
 * Primary path: the graph adjacency placer (placeAdjacencyLayout) consumes the
 * diagram's collapsed group rules when the diagram's groups are placer-compatible
 * (core / open-plan / private-office / corridor / reception / meeting bands).
 * Any diagram whose rooms fall outside those groups degrades honestly to a
 * deterministic full-width band stack that places every node without overlaps.
 *
 * This module is the engine-side half of the topology pipeline; the wiring in
 * the typology strategies emits `bubbleDiagram` metadata, and this realizer
 * makes a diagram runnable on its own (brief/LLM → layout).
 */

import { edgesToRules, genericGroupFor, diagramAdjacencyScore, type BubbleDiagram } from './topological-graph'
import { hasOverlaps, placeAdjacencyLayout, snap, GRID, type AdjacencyProgramRoom } from './graph-placer'
import type { AdjacencyRoom } from './adjacency-graph'
import type {
  AdjacencyGraphModel,
  AdjacencyRule,
  CoreLayout,
  CoreType,
  FloorPlateMetrics,
  StructuralGrid,
} from '../tier1-types'
import type { FloorLayoutResult } from '../../lib/layout/typology-types'

export interface RealizeOptions {
  width: number
  height: number
  corridorWidth?: number
  coreType?: CoreType
  grid?: StructuralGrid
}

export interface RealizedBubbleLayout {
  rooms: AdjacencyRoom[]
  coreLayout: CoreLayout
  floorPlateMetrics: FloorPlateMetrics
  adjacencyGraph: AdjacencyGraphModel
  score: number
  valid: boolean
  warnings: string[]
  method: 'adjacency' | 'stack'
}

const DEFAULT_GRID: StructuralGrid = { spanX: 7.2, spanY: 7.2 }

/** Map BubbleDiagram nodes onto placer program rooms. */
export function diagramToRooms(diagram: BubbleDiagram): AdjacencyProgramRoom[] {
  return diagram.nodes.map(node => ({ id: node.id, name: node.name, areaM2: node.areaM2 }))
}

/** Collapse the diagram's node-pair edges into group-level adjacency rules. */
export function diagramToRules(diagram: BubbleDiagram): AdjacencyRule[] {
  return edgesToRules(diagram.edges, diagram.nodes)
}

function metricsFor(
  width: number,
  height: number,
  rooms: AdjacencyRoom[],
  grid: StructuralGrid,
): FloorPlateMetrics {
  const totalAreaM2 = width * height
  const programAreaM2 = rooms.reduce((sum, room) => sum + room.width * room.height, 0)
  const efficiency = totalAreaM2 > 0 ? programAreaM2 / totalAreaM2 : 0
  return {
    totalAreaM2,
    programAreaM2,
    circulationAreaM2: 0,
    coreAreaM2: 0,
    efficiency,
    grid,
    columns: Math.max(1, Math.round(width / grid.spanX)),
    rows: Math.max(1, Math.round(height / grid.spanY)),
  }
}

const EMPTY_CORE: CoreLayout = { coreType: 'central', blocks: [], x: 0, y: 0 }

/**
 * Deterministic full-width band stack: every node gets a full-width row whose
 * height follows its area, so nothing overlaps and all rooms stay in-plate
 * whenever the total fitted height allows it. Used as the honest fallback when
 * the adjacency placer cannot place a diagram's groups.
 */
export function stackBubbleLayout(
  diagram: BubbleDiagram,
  width: number,
  height: number,
  grid: StructuralGrid = DEFAULT_GRID,
): RealizedBubbleLayout {
  const rooms = diagramToRooms(diagram).slice().sort((a, b) => b.areaM2 - a.areaM2)
  const placed: AdjacencyRoom[] = []
  const warnings: string[] = []
  let y = 0
  for (const room of rooms) {
    const h = Math.min(Math.max(room.areaM2 / width, 1.0), height)
    if (y + h > height + GRID) {
      warnings.push(`Room not placed: ${room.name}`)
      continue
    }
    placed.push({ id: room.id, name: room.name, x: 0, y: snap(y), width, height: snap(h) })
    y += snap(h)
  }
  const overlap = hasOverlaps(placed)
  if (overlap) warnings.push('Stack fallback produced overlapping rooms')
  return {
    rooms: placed,
    coreLayout: EMPTY_CORE,
    floorPlateMetrics: metricsFor(width, height, placed, grid),
    adjacencyGraph: diagramAdjacencyScore(diagram, placed),
    score: diagramAdjacencyScore(diagram, placed).score,
    valid: placed.length === rooms.length && !overlap,
    warnings,
    method: 'stack',
  }
}

/**
 * Run the graph adjacency placer over the diagram. Valid only when the placer
 * reports an in-plate, overlap-free result AND every diagram node was placed —
 * rooms whose groups the placer does not handle are reported as warnings.
 */
export function placeBubbleDiagram(
  diagram: BubbleDiagram,
  width: number,
  height: number,
  opts: Omit<RealizeOptions, 'width' | 'height'> = {},
): RealizedBubbleLayout {
  const rooms = diagramToRooms(diagram)
  const rules = diagramToRules(diagram)
  const groupBy = new Map<string, string>()
  for (const node of diagram.nodes) {
    const resolved = node.group ?? genericGroupFor(node.name)
    if (resolved && !groupBy.has(node.name)) groupBy.set(node.name, resolved)
  }
  const groupFor = (name: string): string | null => groupBy.get(name) ?? genericGroupFor(name)

  const result = placeAdjacencyLayout(rooms, width, height, {
    corridorWidth: opts.corridorWidth,
    coreType: opts.coreType,
    grid: opts.grid,
    adjacencyRules: rules,
    roleFor: groupFor,
    groupFor,
  })

  const placedIds = new Set(result.rooms.map(room => room.id))
  const dropped = diagram.nodes.filter(node => !placedIds.has(node.id))
  const warnings: string[] = []
  if (!result.valid) warnings.push('Adjacency placement is invalid (overlap or out-of-plate)')
  for (const node of dropped) warnings.push(`Room not placed: ${node.name}`)
  const valid = result.valid && dropped.length === 0
  return {
    rooms: result.rooms,
    coreLayout: result.coreLayout,
    floorPlateMetrics: result.floorPlate,
    adjacencyGraph: result.adjacency,
    score: result.score,
    valid,
    warnings,
    method: 'adjacency',
  }
}

/**
 * Realize a bubble diagram into placed rooms: prefer the adjacency path, fall
 * back to the band stack when any node would be dropped (carrying over the
 * primary path's warnings so the caller can see why).
 */
export function realizeBubbleDiagram(diagram: BubbleDiagram, opts: RealizeOptions): RealizedBubbleLayout {
  const primary = placeBubbleDiagram(diagram, opts.width, opts.height, opts)
  if (primary.valid) return primary
  const fallback = stackBubbleLayout(diagram, opts.width, opts.height, opts.grid)
  return { ...fallback, warnings: [...fallback.warnings, ...primary.warnings] }
}

/** Realize a bubble diagram into the shared FloorLayoutResult contract. */
export function realizeBubbleDiagramToFloorLayout(
  diagram: BubbleDiagram,
  opts: RealizeOptions,
): FloorLayoutResult {
  const realized = realizeBubbleDiagram(diagram, opts)
  return {
    rooms: realized.rooms.map(room => ({
      id: room.id,
      name: room.name,
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height,
    })),
    warnings: realized.warnings,
    valid: realized.valid,
    structuralGrid: opts.grid,
    coreLayout: realized.coreLayout,
    floorPlateMetrics: realized.floorPlateMetrics,
    adjacencyGraph: realized.adjacencyGraph,
  }
}
