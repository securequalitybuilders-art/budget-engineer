// ── PlanModel → PlotterPath[] ────────────────────────────────
// Extracts geometry from a PlanModel into PlotterPath segments
// that can feed into both the HPGL pipeline and DXF export.

import type { PlanModel, WallSegment, RoomRect, Opening } from '@/domain/plan'
import type { PlotterPath, PlotterSegment } from './types'

const SCALE = 1000 // metres → millimetres

// ── Wall conversion ───────────────────────────────────────────

function wallToSegment(wall: WallSegment): PlotterSegment {
  const layer = wall.type === 'external' ? 'A-WALL-FULL' : 'A-WALL-PART'
  return {
    points: [
      { x: wall.start.x * SCALE, y: wall.start.y * SCALE },
      { x: wall.end.x * SCALE, y: wall.end.y * SCALE },
    ],
    layer,
  }
}

// ── Room rectangle → closed polyline ─────────────────────────

function roomToSegment(room: RoomRect): PlotterSegment {
  const x = room.x * SCALE
  const y = room.y * SCALE
  const w = room.width * SCALE
  const h = room.height * SCALE
  return {
    points: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
      { x, y },
    ],
    layer: 'A-ANNO-TEXT',
  }
}

// ── Opening → short segment across wall thickness ─────────────

function openingToSegment(
  opening: Opening,
  walls: WallSegment[],
): PlotterSegment | null {
  const width = opening.width ?? 0.9
  if (width <= 0) return null
  const wall = walls.find((w) => w.id === opening.wallId)
  if (!wall) return null

  // Resolve center position by interpolating along the wall
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const cx = (wall.start.x + dx * opening.offset) * SCALE
  const cy = (wall.start.y + dy * opening.offset) * SCALE

  // Width (opening span along wall), drawn perpendicular to wall direction
  const halfW = (width * SCALE) / 2
  const halfH = 100 // half-thickness for the rectangle (fixed 200mm)

  const horizontal = Math.abs(dx) >= Math.abs(dy)

  const layer = opening.kind === 'door' ? 'A-DOOR' : 'A-GLAZ'

  // Rectangle centered on the opening position
  const points = horizontal
    ? [
        { x: cx - halfW, y: cy - halfH },
        { x: cx + halfW, y: cy - halfH },
        { x: cx + halfW, y: cy + halfH },
        { x: cx - halfW, y: cy + halfH },
        { x: cx - halfW, y: cy - halfH },
      ]
    : [
        { x: cx - halfH, y: cy - halfW },
        { x: cx + halfH, y: cy - halfW },
        { x: cx + halfH, y: cy + halfW },
        { x: cx - halfH, y: cy + halfW },
        { x: cx - halfH, y: cy - halfW },
      ]

  return { points, layer }
}

// ── Main conversion ───────────────────────────────────────────

export interface PlanToPathsOptions {
  /** Include room boundary polylines. Default: true. */
  includeRooms?: boolean
  /** Include opening rectangles. Default: true. */
  includeOpenings?: boolean
  /** Include dimension annotation points. Default: false. */
  includeDimensions?: boolean
}

/**
 * Convert a PlanModel to PlotterPath[] without going through SVG.
 *
 * This is the canonical PlanModel → plotter-geometry conversion,
 * used by both the HPGL pipeline and the DXF export.
 */
export function planToPlotterPaths(
  plan: PlanModel,
  opts: PlanToPathsOptions = {},
): PlotterPath[] {
  const { includeRooms = true, includeOpenings = true } = opts
  const paths: PlotterPath[] = []
  let idx = 0

  // Walls
  for (const wall of plan.walls) {
    const seg = wallToSegment(wall)
    const layer = seg.layer
    paths.push({
      index: idx++,
      layer,
      segments: [seg],
      length: segLength(seg),
    })
  }

  // Room rectangles
  if (includeRooms) {
    for (const room of plan.rooms) {
      const seg = roomToSegment(room)
      paths.push({
        index: idx++,
        layer: seg.layer,
        segments: [seg],
        length: segLength(seg),
      })
    }
  }

  // Openings (doors + windows)
  if (includeOpenings && plan.openings) {
    for (const opening of plan.openings) {
      const seg = openingToSegment(opening, plan.walls)
      if (seg) {
        paths.push({
          index: idx++,
          layer: seg.layer,
          segments: [seg],
          length: segLength(seg),
        })
      }
    }
  }

  return paths
}

// ── Helpers ───────────────────────────────────────────────────

function segLength(seg: PlotterSegment): number {
  let total = 0
  for (let i = 1; i < seg.points.length; i++) {
    total += Math.hypot(
      seg.points[i].x - seg.points[i - 1].x,
      seg.points[i].y - seg.points[i - 1].y,
    )
  }
  return total
}

/** Sum the total polyline length across all paths (mm). */
export function totalPathLength(paths: PlotterPath[]): number {
  return paths.reduce((sum, p) => sum + p.length, 0)
}

/** Get a summary of path counts by layer. */
export function pathLayerSummary(paths: PlotterPath[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of paths) {
    counts[p.layer] = (counts[p.layer] ?? 0) + 1
  }
  return counts
}

/** Get the bounding box of all paths (mm). */
export function pathsBoundingBox(paths: PlotterPath[]): {
  minX: number; minY: number; maxX: number; maxY: number; width: number; height: number
} {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of paths) {
    for (const seg of p.segments) {
      for (const pt of seg.points) {
        if (pt.x < minX) minX = pt.x
        if (pt.y < minY) minY = pt.y
        if (pt.x > maxX) maxX = pt.x
        if (pt.y > maxY) maxY = pt.y
      }
    }
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0 }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}
