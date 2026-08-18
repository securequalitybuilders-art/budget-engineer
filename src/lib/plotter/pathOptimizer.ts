// ── Path Optimizer (TSP 2-opt) ────────────────────────────────
// Minimizes pen-up travel between segments and merges collinear segments.
// Uses 2-opt local search heuristic for the TSP component.

import type {
  PlotterPoint,
  PlotterSegment,
  PlotterPath,
  TspOptions,
  OptimizedPenGroup,
} from './types'

// ── Geometry helpers ──────────────────────────────────────────

function dist(a: PlotterPoint, b: PlotterPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function segmentLength(pts: PlotterPoint[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    len += dist(pts[i - 1], pts[i])
  }
  return len
}

// ── Collinear segment merging ─────────────────────────────────

const MERGE_TOLERANCE = 0.01

/** Check if three points are approximately collinear. */
function areCollinear(a: PlotterPoint, b: PlotterPoint, c: PlotterPoint): boolean {
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  return Math.abs(cross) < MERGE_TOLERANCE
}

/** Check if two consecutive segments can be merged (collinear + same layer + gap < 0.5px). */
function canMerge(a: PlotterSegment, b: PlotterSegment): boolean {
  if (a.layer !== b.layer) return false
  if (a.points.length < 2 || b.points.length < 2) return false

  const aEnd = a.points[a.points.length - 1]
  const bStart = b.points[0]

  // Gap must be tiny
  if (dist(aEnd, bStart) > 0.5) return false

  const aPrev = a.points[a.points.length - 2]
  const bNext = b.points[1]

  // When aEnd ≈ bStart the cross-product degenerates to 0 regardless of direction,
  // so check the overall direction directly: aPrev→aEnd must be same direction as bStart→bNext.
  if (dist(aEnd, bStart) < MERGE_TOLERANCE) {
    const dx1 = aEnd.x - aPrev.x
    const dy1 = aEnd.y - aPrev.y
    const dx2 = bNext.x - bStart.x
    const dy2 = bNext.y - bStart.y
    return Math.abs(dx1 * dy2 - dy1 * dx2) < MERGE_TOLERANCE
  }

  if (!areCollinear(aPrev, aEnd, bStart)) return false
  if (!areCollinear(aEnd, bStart, bNext)) return false

  return true
}

/** Merge two collinear segments into one. */
function mergeSegments(a: PlotterSegment, b: PlotterSegment): PlotterSegment {
  // Remove the duplicate point at the join (aEnd = bStart)
  return {
    points: [...a.points, ...b.points.slice(1)],
    layer: a.layer,
    stroke: a.stroke,
    strokeWidth: a.strokeWidth,
  }
}

/** Merge collinear adjacent segments. Returns [merged, mergeCount]. */
export function mergeCollinear(segments: PlotterSegment[]): [PlotterSegment[], number] {
  if (segments.length <= 1) return [segments, 0]

  const merged = [segments[0]]
  let mergeCount = 0

  for (let i = 1; i < segments.length; i++) {
    const last = merged[merged.length - 1]
    if (canMerge(last, segments[i])) {
      merged[merged.length - 1] = mergeSegments(last, segments[i])
      mergeCount++
    } else {
      merged.push(segments[i])
    }
  }

  return [merged, mergeCount]
}

// ── Segment-to-segment distance (pen-up travel) ──────────────

/** Minimum distance from end of segment A to start of segment B. */
function penUpCost(a: PlotterSegment, b: PlotterSegment): number {
  const aEnd = a.points[a.points.length - 1]
  const bStart = b.points[0]
  return dist(aEnd, bStart)
}

/** Reverse a segment's point order. */
function reverseSegment(seg: PlotterSegment): PlotterSegment {
  return {
    points: [...seg.points].reverse(),
    layer: seg.layer,
    stroke: seg.stroke,
    strokeWidth: seg.strokeWidth,
  }
}

// ── 2-opt TSP solver ─────────────────────────────────────────

/** Compute total tour cost (sum of pen-up distances between consecutive segments). */
function tourCost(segments: PlotterSegment[]): number {
  let cost = 0
  for (let i = 1; i < segments.length; i++) {
    cost += penUpCost(segments[i - 1], segments[i])
  }
  return cost
}

/**
 * Solve the TSP ordering for pen segments using 2-opt local search.
 * For each segment, we can also reverse it (reducing pen-up distance),
 * so the search space includes orientation decisions.
 *
 * The objective: minimize total pen-up travel distance between segments.
 */
export function solveTsp2Opt(
  segments: PlotterSegment[],
  opts: TspOptions = {},
): PlotterSegment[] {
  if (segments.length <= 2) return [...segments]

  const maxIter = opts.maxIterations ?? 10000
  const threshold = opts.improvementThreshold ?? 0.001

  // Start with a nearest-neighbor greedy tour
  let order = nearestNeighborOrder(segments)
  let bestCost = tourCost(order)

  let improved = true
  let iter = 0

  while (improved && iter < maxIter) {
    improved = false
    iter++

    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 2; j < order.length; j++) {
        // Try 2-opt swap: reverse the segment between i+1 and j
        const candidate = [...order]
        const slice = candidate.slice(i + 1, j + 1).reverse()
        candidate.splice(i + 1, j - i, ...slice)

        const newCost = tourCost(candidate)
        const improvement = bestCost - newCost

        if (improvement > bestCost * threshold || improvement > 0.01) {
          order = candidate
          bestCost = newCost
          improved = true
        }
      }
    }
  }

  // Post-optimize: try reversing individual segments for better pen-up
  for (let i = 0; i < order.length; i++) {
    const reversed = reverseSegment(order[i])
    const costBefore = i > 0 ? penUpCost(order[i - 1], order[i]) : 0
    const costAfter = i > 0 ? penUpCost(order[i - 1], reversed) : 0
    const costBeforeNext = i < order.length - 1 ? penUpCost(order[i], order[i + 1]) : 0
    const costAfterNext = i < order.length - 1 ? penUpCost(reversed, order[i + 1]) : 0

    if (costAfter + costAfterNext < costBefore + costBeforeNext) {
      order[i] = reversed
    }
  }

  return order
}

/** Nearest-neighbor heuristic: start at (0,0), pick closest unvisited segment. */
function nearestNeighborOrder(segments: PlotterSegment[]): PlotterSegment[] {
  const remaining = new Set(segments.map((_, i) => i))
  const order: PlotterSegment[] = []
  let current: PlotterPoint = { x: 0, y: 0 }

  while (remaining.size > 0) {
    let bestIdx = -1
    let bestDist = Infinity
    let bestReverse = false

    for (const idx of remaining) {
      const seg = segments[idx]
      const dStart = dist(current, seg.points[0])
      const dEnd = dist(current, seg.points[seg.points.length - 1])

      if (dStart < bestDist) {
        bestDist = dStart
        bestIdx = idx
        bestReverse = false
      }
      if (dEnd < bestDist) {
        bestDist = dEnd
        bestIdx = idx
        bestReverse = true
      }
    }

    const seg = segments[bestIdx]
    order.push(bestReverse ? reverseSegment(seg) : seg)
    current = seg.points[seg.points.length - 1]
    remaining.delete(bestIdx)
  }

  return order
}

// ── Full optimization for a pen group ─────────────────────────

/** Optimize a group of segments: merge collinear, then solve TSP. */
export function optimizePenGroup(
  pen: number,
  paths: PlotterPath[],
  opts: TspOptions = {},
): OptimizedPenGroup {
  // Collect all segments from all paths in this pen group
  const segments: PlotterSegment[] = []
  for (const p of paths) {
    for (const seg of p.segments) {
      if (seg.points.length >= 2) segments.push(seg)
    }
  }

  // Step 1: Sort by layer proximity (pre-sort for better TSP starting point)
  segments.sort((a, b) => {
    const aEnd = a.points[a.points.length - 1]
    const bStart = b.points[0]
    return dist({ x: 0, y: 0 }, aEnd) - dist({ x: 0, y: 0 }, bStart)
  })

  // Step 2: Merge collinear segments
  const [merged, mergesApplied] = mergeCollinear(segments)

  // Step 3: Solve TSP for optimal pen-up ordering
  const ordered = solveTsp2Opt(merged, opts)

  // Step 4: Compute stats
  let penUpTravel = 0
  let penDownDistance = 0
  for (const seg of ordered) {
    penDownDistance += segmentLength(seg.points)
  }
  for (let i = 1; i < ordered.length; i++) {
    penUpTravel += penUpCost(ordered[i - 1], ordered[i])
  }

  return {
    pen,
    segments: ordered,
    penUpTravel,
    penDownDistance,
    penLifts: ordered.length,
    mergesApplied,
  }
}

// ── Pen type classification (architectural standard) ───────────

export type PenType = 'structural' | 'walls' | 'dimensions' | 'grid'

export interface PenTypeSpec {
  type: PenType
  weight: string
  width: number
  layers: string[]
}

export const PEN_TYPES: PenTypeSpec[] = [
  { type: 'structural', weight: '0.18mm', width: 1, layers: ['A-WALL-FULL', 'S-COLS', 'A-SECT'] },
  { type: 'walls',      weight: '0.25mm', width: 2, layers: ['A-WALL-PART', 'A-DOOR', 'A-GLAZ', 'A-ELEV', 'E-POWR', 'P-PIPE', 'P-FIXT', 'M-HVAC', 'I-CLNG'] },
  { type: 'dimensions', weight: '0.35mm', width: 3, layers: ['A-ANNO-DIMS', 'A-ANNO', 'A-ANNO-LEAD', 'A-ANNO-TEXT', 'A-ROOF', 'A-FLOR', 'S-BEAM', 'S-FOOT', 'M-HVAC-DUCT'] },
  { type: 'grid',       weight: '0.50mm', width: 4, layers: ['A-GRID'] },
]

export function classifyPenType(layer: string): PenType {
  for (const spec of PEN_TYPES) {
    if (spec.layers.includes(layer)) return spec.type
  }
  return 'dimensions'
}

// ── Door-gap detection ─────────────────────────────────────────

/**
 * Detect pen-lift insertion points at door openings.
 * When a segment crosses a door opening, it should be split
 * so the pen lifts over the gap (door swing arc = no line).
 */
export function detectDoorGaps(
  segments: PlotterSegment[],
  doorPositions: PlotterPoint[],
  gapMm: number = 900,
): PlotterSegment[] {
  if (doorPositions.length === 0 || segments.length === 0) return segments

  const result: PlotterSegment[] = []
  const gapRadius = gapMm / 2

  for (const seg of segments) {
    if (seg.points.length < 2) {
      result.push(seg)
      continue
    }

    let currentPoints = [...seg.points]
    let hasGap = false

    for (const door of doorPositions) {
      for (let i = 0; i < currentPoints.length - 1; i++) {
        const a = currentPoints[i]
        const b = currentPoints[i + 1]

        const dx = b.x - a.x
        const dy = b.y - a.y
        const lenSq = dx * dx + dy * dy
        const t = lenSq > 0
          ? Math.max(0, Math.min(1, ((door.x - a.x) * dx + (door.y - a.y) * dy) / lenSq))
          : 0
        const closestX = a.x + t * dx
        const closestY = a.y + t * dy
        const d = Math.hypot(door.x - closestX, door.y - closestY)

        if (d < gapRadius && t > 0.01 && t < 0.99) {
          const beforeEnd = { x: a.x + (t - 0.01) * dx, y: a.y + (t - 0.01) * dy }
          const afterStart = { x: a.x + (t + 0.01) * dx, y: a.y + (t + 0.01) * dy }
          const before = [...currentPoints.slice(0, i + 1), beforeEnd]
          const after = [afterStart, ...currentPoints.slice(i + 1)]
          if (before.length >= 2) result.push({ ...seg, points: before })
          if (after.length >= 2) result.push({ ...seg, points: after })
          currentPoints = []
          hasGap = true
          break
        }
      }
      if (hasGap) break
    }

    if (!hasGap && currentPoints.length >= 2) {
      result.push({ ...seg, points: currentPoints })
    }
  }

  return result
}

// ── Segment reversal optimization ──────────────────────────────

/**
 * Try reversing individual segments to reduce pen-up travel
 * between consecutive segments.
 */
export function reverseForMinTravel(segments: PlotterSegment[]): PlotterSegment[] {
  if (segments.length <= 1) return [...segments]

  const result = [...segments]

  for (let i = 0; i < result.length; i++) {
    const reversed: PlotterSegment = {
      ...result[i],
      points: [...result[i].points].reverse(),
    }

    const costBefore = i > 0 ? penUpCost(result[i - 1], result[i]) : 0
    const costAfter = i > 0 ? penUpCost(result[i - 1], reversed) : 0
    const costBeforeNext = i < result.length - 1 ? penUpCost(result[i], result[i + 1]) : 0
    const costAfterNext = i < result.length - 1 ? penUpCost(reversed, result[i + 1]) : 0

    if (costAfter + costAfterNext < costBefore + costBeforeNext) {
      result[i] = reversed
    }
  }

  return result
}

// ── Grouping by pen type ───────────────────────────────────────

/** Group segments by pen type, returning one group per type. */
export function groupByPenType(segments: PlotterSegment[]): Map<PenType, PlotterSegment[]> {
  const groups = new Map<PenType, PlotterSegment[]>()
  for (const seg of segments) {
    const penType = classifyPenType(seg.layer)
    const arr = groups.get(penType) ?? []
    arr.push(seg)
    groups.set(penType, arr)
  }
  return groups
}

// ── Enhanced optimization stats ────────────────────────────────

export interface OptimizationStats {
  inputSegments: number
  outputSegments: number
  collinearMerges: number
  inputPenUpTravel: number
  outputPenUpTravel: number
  penUpReductionPct: number
  inputPenLifts: number
  outputPenLifts: number
  doorGapsDetected: number
  reversalsApplied: number
  byType: Record<PenType, { input: number; output: number; liftsBefore: number; liftsAfter: number }>
}

function totalPenUpTravel(segs: PlotterSegment[]): number {
  let travel = 0
  for (let i = 1; i < segs.length; i++) {
    travel += penUpCost(segs[i - 1], segs[i])
  }
  return travel
}

// ── Main optimization pipeline ─────────────────────────────────

export interface OptimizeOptions {
  doorPositions?: PlotterPoint[]
  gapWidth?: number
  maxTspIterations?: number
}

/**
 * Full pen-plotter optimization pipeline:
 * 1. Classify segments by pen type
 * 2. Detect door gaps → split segments
 * 3. Merge collinear segments
 * 4. Reverse segments for minimal pen-up travel
 * 5. Solve TSP 2-opt ordering per pen group
 * 6. Report before/after stats
 */
export function optimizePlotterPaths(
  segments: PlotterSegment[],
  opts: OptimizeOptions = {},
): { groups: OptimizedPenGroup[]; stats: OptimizationStats } {
  const inputSegments = segments.length
  const inputPenUp = totalPenUpTravel(segments)
  const inputLifts = segments.length

  const grouped = groupByPenType(segments)

  const groups: OptimizedPenGroup[] = []
  let totalMerges = 0
  let totalReversals = 0
  let totalDoorGaps = 0
  const byType: OptimizationStats['byType'] = {
    structural: { input: 0, output: 0, liftsBefore: 0, liftsAfter: 0 },
    walls:      { input: 0, output: 0, liftsBefore: 0, liftsAfter: 0 },
    dimensions: { input: 0, output: 0, liftsBefore: 0, liftsAfter: 0 },
    grid:       { input: 0, output: 0, liftsBefore: 0, liftsAfter: 0 },
  }

  let penNumber = 1
  for (const [penType, typeSegments] of grouped) {
    byType[penType].input = typeSegments.length
    byType[penType].liftsBefore = typeSegments.length

    let processed = typeSegments
    if (opts.doorPositions && opts.doorPositions.length > 0) {
      const before = processed.length
      processed = detectDoorGaps(processed, opts.doorPositions, opts.gapWidth ?? 900)
      totalDoorGaps += processed.length - before
    }

    const [merged, mergesApplied] = mergeCollinear(processed)
    totalMerges += mergesApplied

    const reversed = reverseForMinTravel(merged)
    for (let i = 0; i < merged.length; i++) {
      const a = merged[i].points[0]
      const b = reversed[i].points[0]
      if (a.x !== b.x || a.y !== b.y) totalReversals++
    }

    const ordered = solveTsp2Opt(reversed, {
      maxIterations: opts.maxTspIterations ?? 10000,
    })

    let penUpTravel = 0
    let penDownDistance = 0
    for (const seg of ordered) {
      penDownDistance += segmentLength(seg.points)
    }
    for (let i = 1; i < ordered.length; i++) {
      penUpTravel += penUpCost(ordered[i - 1], ordered[i])
    }

    byType[penType].output = ordered.length
    byType[penType].liftsAfter = ordered.length

    groups.push({
      pen: penNumber++,
      segments: ordered,
      penUpTravel,
      penDownDistance,
      penLifts: ordered.length,
      mergesApplied,
    })
  }

  let outputSegments = 0
  let outputPenUp = 0
  let outputLifts = 0
  for (const g of groups) {
    outputSegments += g.segments.length
    outputPenUp += g.penUpTravel
    outputLifts += g.penLifts
  }

  return {
    groups,
    stats: {
      inputSegments,
      outputSegments,
      collinearMerges: totalMerges,
      inputPenUpTravel: inputPenUp,
      outputPenUpTravel: outputPenUp,
      penUpReductionPct: inputPenUp > 0 ? ((inputPenUp - outputPenUp) / inputPenUp) * 100 : 0,
      inputPenLifts: inputLifts,
      outputPenLifts: outputLifts,
      doorGapsDetected: totalDoorGaps,
      reversalsApplied: totalReversals,
      byType,
    },
  }
}
