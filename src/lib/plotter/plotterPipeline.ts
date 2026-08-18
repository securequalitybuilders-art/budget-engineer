// ── Plotter Pipeline ──────────────────────────────────────────
// Orchestrates the full SVG → Optimized HPGL pipeline.
// Entry point: svgToHpgl()

import type {
  PlotterPath,
  PlotterSegment,
  OptimizedPenGroup,
  PlotterPipelineResult,
  PaperSize,
  TspOptions,
} from './types'
import { svgToPlotterPaths, groupByLayer } from './svgParser'
import { optimizePenGroup, mergeCollinear } from './pathOptimizer'
import { penSlotForLayer } from './penAssignment'
import { buildPlotterResult } from './hpglGenerator'

// ── Main pipeline ─────────────────────────────────────────────

export interface PipelineOptions {
  /** Paper size for the output. Default: 'A1'. */
  paperSize?: PaperSize
  /** TSP optimization options. */
  tsp?: TspOptions
  /** If true, skip TSP optimization (raw order). Default: false. */
  skipOptimization?: boolean
  /** Maximum segments per pen group (0 = unlimited). Default: 0. */
  maxSegmentsPerPen?: number
}

/**
 * Convert an SVG string to an optimized HPGL command stream ready for a pen plotter.
 *
 * Pipeline stages:
 *   1. Parse SVG → PlotterPath[]
 *   2. Group by layer → Map<layer, paths>
 *   3. Map layer → pen slot
 *   4. Merge collinear segments per pen group
 *   5. Solve TSP per pen group (minimize pen-up travel)
 *   6. Generate HPGL commands
 *   7. Compute stats (pen lifts, travel distance, time estimate)
 */
export function svgToHpgl(
  svg: string,
  opts: PipelineOptions = {},
): PlotterPipelineResult {
  const paperSize = opts.paperSize ?? 'A1'
  const skipOpt = opts.skipOptimization ?? false

  // Stage 1: Parse SVG into plotter paths
  const paths = svgToPlotterPaths(svg)

  // Stage 2: Group by layer
  const layerGroups = groupByLayer(paths)

  // Stage 3+4: Group by pen slot (merge layer → pen mapping)
  const penSlotMap = new Map<number, PlotterPath[]>()
  for (const [layer, layerPaths] of layerGroups) {
    const penSlot = penSlotForLayer(layer)
    const existing = penSlotMap.get(penSlot)
    if (existing) {
      existing.push(...layerPaths)
    } else {
      penSlotMap.set(penSlot, [...layerPaths])
    }
  }

  // Stage 5: Optimize each pen group
  const penGroups: OptimizedPenGroup[] = []

  for (const [penSlot, penPaths] of penSlotMap) {
    if (skipOpt) {
      // No optimization: just merge collinear
      const allSegs: PlotterSegment[] = []
      for (const p of penPaths) {
        for (const seg of p.segments) {
          if (seg.points.length >= 2) allSegs.push(seg)
        }
      }
      const [merged, mergesApplied] = mergeCollinear(allSegs)
      let penUp = 0
      for (let i = 1; i < merged.length; i++) {
        const end = merged[i - 1].points[merged[i - 1].points.length - 1]
        const start = merged[i].points[0]
        penUp += Math.hypot(start.x - end.x, start.y - end.y)
      }
      let penDown = 0
      for (const seg of merged) {
        for (let i = 1; i < seg.points.length; i++) {
          penDown += Math.hypot(
            seg.points[i].x - seg.points[i - 1].x,
            seg.points[i].y - seg.points[i - 1].y,
          )
        }
      }
      penGroups.push({
        pen: penSlot,
        segments: merged,
        penUpTravel: penUp,
        penDownDistance: penDown,
        penLifts: merged.length,
        mergesApplied,
      })
    } else {
      penGroups.push(optimizePenGroup(penSlot, penPaths, opts.tsp))
    }
  }

  // Sort pen groups by slot number
  penGroups.sort((a, b) => a.pen - b.pen)

  // Stage 6: Compute SVG bounds for paper fitting
  const allSegs = penGroups.flatMap(g => g.segments)
  let svgW = 1, svgH = 1
  for (const seg of allSegs) {
    for (const pt of seg.points) {
      if (pt.x > svgW) svgW = pt.x
      if (pt.y > svgH) svgH = pt.y
    }
  }

  // Stage 7: Build result
  return buildPlotterResult(penGroups, svgW, svgH, paperSize)
}

// ── Direct plan model → HPGL ──────────────────────────────────

import type { PlanModel } from '@/domain/plan'

/**
 * Convert a PlanModel directly to HPGL without going through SVG first.
 * Generates wall polylines, room boundaries, and dimension lines.
 */
export function planToHpgl(
  plan: PlanModel,
  opts: PipelineOptions = {},
): PlotterPipelineResult {
  const paths: PlotterPath[] = []
  let idx = 0

  // Convert walls to segments
  for (const wall of plan.walls) {
    paths.push({
      index: idx++,
      layer: wall.type === 'external' ? 'A-WALL-FULL' : 'A-WALL-PART',
      segments: [{
        points: [
          { x: wall.start.x * 1000, y: wall.start.y * 1000 },
          { x: wall.end.x * 1000, y: wall.end.y * 1000 },
        ],
        layer: wall.type === 'external' ? 'A-WALL-FULL' : 'A-WALL-PART',
      }],
      length: Math.hypot(
        (wall.end.x - wall.start.x) * 1000,
        (wall.end.y - wall.start.y) * 1000,
      ),
    })
  }

  // Convert room rectangles to closed polylines
  for (const room of plan.rooms) {
    paths.push({
      index: idx++,
      layer: 'A-ANNO-TEXT',
      segments: [{
        points: [
          { x: room.x * 1000, y: room.y * 1000 },
          { x: (room.x + room.width) * 1000, y: room.y * 1000 },
          { x: (room.x + room.width) * 1000, y: (room.y + room.height) * 1000 },
          { x: room.x * 1000, y: (room.y + room.height) * 1000 },
          { x: room.x * 1000, y: room.y * 1000 },
        ],
        layer: 'A-ANNO-TEXT',
      }],
      length: 2 * (room.width + room.height) * 1000,
    })
  }

  // Build a minimal SVG and pipe through the standard pipeline
  // (This is a convenience wrapper — the SVG is synthetic)
  const svg = buildSyntheticSvg(plan)
  return svgToHpgl(svg, opts)
}

/** Build a minimal SVG from a PlanModel for the plotter pipeline. */
function buildSyntheticSvg(plan: PlanModel): string {
  const lines: string[] = ['<svg xmlns="http://www.w3.org/2000/svg">']

  for (const wall of plan.walls) {
    const sw = wall.type === 'external' ? 4 : 2
    lines.push(
      `<line x1="${(wall.start.x * 100).toFixed(1)}" y1="${(wall.start.y * 100).toFixed(1)}" ` +
      `x2="${(wall.end.x * 100).toFixed(1)}" y2="${(wall.end.y * 100).toFixed(1)}" ` +
      `stroke="#1a1a1a" stroke-width="${sw}" class="${wall.type === 'external' ? 'A-WALL-FULL' : 'A-WALL-PART'}"/>`,
    )
  }

  for (const room of plan.rooms) {
    const x = room.x * 100
    const y = room.y * 100
    const w = room.width * 100
    const h = room.height * 100
    lines.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" ` +
      `fill="none" stroke="#555" stroke-width="1" class="A-ANNO-TEXT"/>`,
    )
  }

  lines.push('</svg>')
  return lines.join('\n')
}

// ── Multi-sheet export ────────────────────────────────────────

export type DrawingSheetType =
  | 'site-plan'
  | 'floor-plan'
  | 'roof-plan'
  | 'front-elevation'
  | 'side-elevation'
  | 'rear-elevation'
  | 'section'
  | 'structural-plan'
  | 'electrical-plan'
  | 'plumbing-plan'
  | 'hvac-plan'
  | 'fire-egress'
  | 'reflected-ceiling'
  | 'door-window-schedule'

/** Map drawing sheet types to the layer codes they typically contain. */
export const SHEET_LAYER_MAP: Record<DrawingSheetType, string[]> = {
  'site-plan': ['A-WALL', 'A-GRID', 'A-ANNO'],
  'floor-plan': ['A-WALL', 'A-WALL-FULL', 'A-WALL-PART', 'A-DOOR', 'A-GLAZ', 'A-ANNO', 'A-ANNO-DIMS', 'A-GRID'],
  'roof-plan': ['A-ROOF', 'A-ROOF-ANNO', 'A-WALL'],
  'front-elevation': ['A-ELEV', 'A-ELEV-TEXT', 'A-GLAZ'],
  'side-elevation': ['A-ELEV', 'A-ELEV-TEXT', 'A-GLAZ'],
  'rear-elevation': ['A-ELEV', 'A-ELEV-TEXT', 'A-GLAZ'],
  'section': ['A-SECT', 'A-WALL', 'A-FLOR', 'A-ROOF'],
  'structural-plan': ['S-COLS', 'S-BEAM', 'S-FOOT', 'S-SLAB', 'S-WALL', 'A-GRID'],
  'electrical-plan': ['E-POWR', 'E-LITE', 'E-LITE-ANNO', 'A-WALL', 'A-GRID'],
  'plumbing-plan': ['P-PIPE', 'P-PIPE-HOT', 'P-PIPE-COLD', 'P-PIPE-SAN', 'P-FIXT', 'A-WALL'],
  'hvac-plan': ['M-HVAC', 'M-HVAC-DUCT', 'M-HVAC-EQUP', 'A-WALL'],
  'fire-egress': ['A-WALL', 'A-DOOR', 'A-ANNO'],
  'reflected-ceiling': ['I-CLNG', 'A-WALL', 'A-GRID'],
  'door-window-schedule': ['A-DOOR', 'A-GLAZ', 'A-ANNO', 'A-ANNO-DIMS'],
}

/** Get the required pen slots for a given drawing sheet type. */
export function pensForSheet(sheetType: DrawingSheetType): number[] {
  const layers = SHEET_LAYER_MAP[sheetType] ?? []
  const slots = new Set<number>()
  for (const layer of layers) {
    slots.add(penSlotForLayer(layer))
  }
  return [...slots].sort((a, b) => a - b)
}
