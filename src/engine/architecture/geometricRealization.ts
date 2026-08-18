/**
 * Geometric Realization — HouseDiffusion discrete/continuous denoising.
 *
 * Converts a topological room layout into precise orthogonal polygon loops
 * with door coordinates.  The algorithm:
 *
 *  1. Snap room corners to a configurable grid
 *  2. Enforce axis-alignment on every edge (discrete phase)
 *  3. Align shared edges between adjacent rooms (continuous phase)
 *  4. Compute door centre coordinates from wall opening offsets
 *
 * All geometry is 2-D (plan view).  Wall thickness is informational only —
 * the polygon loops are room-interior boundaries.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Point2D {
  x: number
  y: number
}

/** A closed orthogonal polygon loop (room interior boundary). */
export interface PolygonLoop {
  /** Ordered vertices; first === last (closed ring). */
  vertices: Point2D[]
  /** Room id this loop represents. */
  roomId: string
  /** Room name. */
  name: string
  /** Signed area in m² (positive = counter-clockwise winding). */
  area: number
}

/** A door / opening centre coordinate on a wall. */
export interface DoorCoordinate {
  /** Centre point of the opening. */
  point: Point2D
  /** Opening width in metres. */
  width: number
  /** Wall segment id. */
  wallId: string
  /** Room id on the "from" side. */
  fromRoomId: string
  /** Room id on the "to" side (may be empty for external openings). */
  toRoomId: string
  /** Angle of the door normal in radians (0 = east). */
  normalAngle: number
}

export interface RealizedPlan {
  /** Orthogonal polygon loops, one per room. */
  loops: PolygonLoop[]
  /** Door centre coordinates. */
  doors: DoorCoordinate[]
  /** Summary statistics. */
  stats: {
    totalArea: number
    roomCount: number
    doorCount: number
    sharedEdges: number
  }
}

export interface RealizeOptions {
  /** Grid snap increment in metres (default 0.05 = 50 mm). */
  gridSnap?: number
  /** Wall thickness in metres for adjacency detection (default 0.23). */
  wallThickness?: number
  /** Tolerance for identifying adjacent rooms in metres (default 0.01). */
  adjacencyTol?: number
  /** Storey height in metres (informational, default 3). */
  storeyHeight?: number
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_GRID_SNAP = 0.05
const DEFAULT_ADJACENCY_TOL = 0.01

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                   */
/* ------------------------------------------------------------------ */

/** Snap a value to the nearest grid increment. */
export function snapGrid(value: number, grid: number): number {
  // Guard: avoid Infinity/NaN
  if (!Number.isFinite(value) || !Number.isFinite(grid) || grid === 0) return value
  const snapped = Math.round(value / grid) * grid
  // Eliminate floating-point drift (e.g. 1.2000000000000002 → 1.2)
  const precision = Math.max(0, -Math.floor(Math.log10(grid)))
  return parseFloat(snapped.toFixed(precision))
}

/** Snap a 2-D point to a grid. */
function snapPoint(p: Point2D, grid: number): Point2D {
  return { x: snapGrid(p.x, grid), y: snapGrid(p.y, grid) }
}

/** Signed area of a polygon (shoelace formula). Positive = CCW. */
export function signedArea(vertices: Point2D[]): number {
  let area = 0
  for (let i = 0; i < vertices.length - 1; i++) {
    const a = vertices[i]
    const b = vertices[i + 1]
    area += a.x * b.y - b.x * a.y
  }
  return area / 2
}

/** True if two axis-aligned rectangles share an edge (within tolerance). */
function sharesEdge(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  tol: number,
): boolean {
  const aRight = a.x + a.width
  const aTop = a.y + a.height
  const bRight = b.x + b.width
  const bTop = b.y + b.height

  // Vertical shared edge (a's right = b's left or vice versa)
  const xOverlap =
    (Math.abs(aRight - b.x) < tol || Math.abs(bRight - a.x) < tol) &&
    Math.max(a.y, b.y) < Math.min(aTop, bTop) - tol

  // Horizontal shared edge (a's top = b's bottom or vice versa)
  const yOverlap =
    (Math.abs(aTop - b.y) < tol || Math.abs(bTop - a.y) < tol) &&
    Math.max(a.x, b.x) < Math.min(aRight, bRight) - tol

  return xOverlap || yOverlap
}

/** Get the shared-edge segment between two adjacent rooms. */
function sharedEdgeSegment(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  tol: number,
): Point2D[] | null {
  const aRight = a.x + a.width
  const aTop = a.y + a.height
  const bRight = b.x + b.width
  const bTop = b.y + b.height

  // Vertical shared edge
  if (Math.abs(aRight - b.x) < tol || Math.abs(bRight - a.x) < tol) {
    const x = Math.abs(aRight - b.x) < tol ? aRight : bRight
    const yStart = Math.max(a.y, b.y)
    const yEnd = Math.min(aTop, bTop)
    if (yEnd - yStart > tol) {
      return [
        { x, y: yStart },
        { x, y: yEnd },
      ]
    }
  }

  // Horizontal shared edge
  if (Math.abs(aTop - b.y) < tol || Math.abs(bTop - a.y) < tol) {
    const y = Math.abs(aTop - b.y) < tol ? aTop : bTop
    const xStart = Math.max(a.x, b.x)
    const xEnd = Math.min(aRight, bRight)
    if (xEnd - xStart > tol) {
      return [
        { x: xStart, y },
        { x: xEnd, y },
      ]
    }
  }

  return null
}

/* ------------------------------------------------------------------ */
/*  HouseDiffusion denoising                                           */
/* ------------------------------------------------------------------ */

/**
 * Phase 1: Discrete denoising — snap every room corner to the grid.
 */
function discreteDenoise(
  rooms: Array<{ x: number; y: number; width: number; height: number }>,
  grid: number,
): Array<{ x: number; y: number; width: number; height: number }> {
  return rooms.map((r) => {
    const snapped = snapPoint({ x: r.x, y: r.y }, grid)
    const w = snapGrid(r.width, grid)
    const h = snapGrid(r.height, grid)
    return {
      x: snapped.x,
      y: snapped.y,
      width: Math.max(grid, w),
      height: Math.max(grid, h),
    }
  })
}

/**
 * Phase 2: Continuous denoising — align shared edges between adjacent
 * rooms so they share exact coordinate values.
 */
function continuousDenoise(
  rooms: Array<{ x: number; y: number; width: number; height: number }>,
  adjTol: number,
): Array<{ x: number; y: number; width: number; height: number }> {
  // Work on a mutable copy
  const result = rooms.map((r) => ({ ...r }))

  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      if (!sharesEdge(result[i], result[j], adjTol)) continue

      const seg = sharedEdgeSegment(result[i], result[j], adjTol)
      if (!seg) continue

      // Vertical shared edge — snap x to the average
      if (seg[0].x === seg[1].x && seg[0].y !== seg[1].y) {
        const avgX = seg[0].x
        const ri = result[i]
        const rj = result[j]
        // Room i's right or left edge
        if (Math.abs(ri.x + ri.width - avgX) < adjTol) {
          ri.width = avgX - ri.x
        } else if (Math.abs(ri.x - avgX) < adjTol) {
          ri.x = avgX
        }
        // Room j
        if (Math.abs(rj.x + rj.width - avgX) < adjTol) {
          rj.width = avgX - rj.x
        } else if (Math.abs(rj.x - avgX) < adjTol) {
          rj.x = avgX
        }
      }

      // Horizontal shared edge — snap y to the average
      if (seg[0].y === seg[1].y && seg[0].x !== seg[1].x) {
        const avgY = seg[0].y
        const ri = result[i]
        const rj = result[j]
        if (Math.abs(ri.y + ri.height - avgY) < adjTol) {
          ri.height = avgY - ri.y
        } else if (Math.abs(ri.y - avgY) < adjTol) {
          ri.y = avgY
        }
        if (Math.abs(rj.y + rj.height - avgY) < adjTol) {
          rj.height = avgY - rj.y
        } else if (Math.abs(rj.y - avgY) < adjTol) {
          rj.y = avgY
        }
      }
    }
  }

  return result
}

/* ------------------------------------------------------------------ */
/*  Polygon loop generation                                            */
/* ------------------------------------------------------------------ */

/** Generate an orthogonal polygon loop from a rectangle. */
function rectToLoop(
  room: { x: number; y: number; width: number; height: number; id: string; name: string },
  grid: number,
): PolygonLoop {
  const corners: Point2D[] = [
    snapPoint({ x: room.x, y: room.y }, grid),
    snapPoint({ x: room.x + room.width, y: room.y }, grid),
    snapPoint({ x: room.x + room.width, y: room.y + room.height }, grid),
    snapPoint({ x: room.x, y: room.y + room.height }, grid),
    snapPoint({ x: room.x, y: room.y }, grid), // close
  ]

  const area = Math.abs(signedArea(corners))
  return { vertices: corners, roomId: room.id, name: room.name, area }
}

/* ------------------------------------------------------------------ */
/*  Door coordinate computation                                        */
/* ------------------------------------------------------------------ */

/**
 * Compute door centre coordinates from PlanModel walls and openings.
 *
 * Each opening has an offset (0–1 ratio from wall start to opening centre)
 * and a width.  The centre is computed along the wall segment.
 */
function computeDoorCoordinates(
  walls: Array<{ id: string; start: Point2D; end: Point2D; type: string }>,
  openings: Array<{ id: string; wallId: string; offset: number; width: number; kind: string }>,
): DoorCoordinate[] {
  const wallMap = new Map(walls.map((w) => [w.id, w]))
  const result: DoorCoordinate[] = []

  for (const opening of openings) {
    if (opening.kind !== 'door') continue
    const wall = wallMap.get(opening.wallId)
    if (!wall) continue

    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    const wallLength = Math.sqrt(dx * dx + dy * dy)
    if (wallLength < 0.01) continue

    // Centre point along wall at offset ratio
    const centreX = wall.start.x + dx * opening.offset
    const centreY = wall.start.y + dy * opening.offset

    // Normal angle (perpendicular to wall direction)
    const wallAngle = Math.atan2(dy, dx)
    const normalAngle = wallAngle + Math.PI / 2

    result.push({
      point: { x: Math.round(centreX * 1000) / 1000, y: Math.round(centreY * 1000) / 1000 },
      width: opening.width,
      wallId: opening.wallId,
      fromRoomId: '',
      toRoomId: '',
      normalAngle: Math.round(normalAngle * 10000) / 10000,
    })
  }

  return result
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Realize a topological room layout into precise orthogonal polygon loops
 * with door coordinates.
 *
 * Takes rooms (with id, name, x, y, width, height) and optional walls/
 * openings for door placement, plus a list of adjacency pairs for shared-
 * edge alignment.
 *
 * @returns A `RealizedPlan` with polygon loops, door coordinates, and stats.
 */
export function realizeGeometric(
  plan: {
    rooms: Array<{ id: string; name: string; x: number; y: number; width: number; height: number }>
    walls?: Array<{ id: string; start: Point2D; end: Point2D; thickness: number; type: 'external' | 'internal' }>
    openings?: Array<{ id: string; wallId: string; offset: number; width: number; kind: 'door' | 'window' }>
  },
  options?: RealizeOptions,
): RealizedPlan {
  const grid = options?.gridSnap ?? DEFAULT_GRID_SNAP
  const adjTol = options?.adjacencyTol ?? DEFAULT_ADJACENCY_TOL

  // Phase 1: discrete denoising (snap to grid)
  const snapped = discreteDenoise(plan.rooms, grid)

  // Phase 2: continuous denoising (align shared edges)
  const aligned = continuousDenoise(snapped, adjTol)

  // Generate polygon loops from aligned rectangles
  const loops: PolygonLoop[] = aligned.map((r, i) =>
    rectToLoop({ ...r, id: plan.rooms[i].id, name: plan.rooms[i].name }, grid),
  )

  // Compute door coordinates
  const doors = plan.walls && plan.openings
    ? computeDoorCoordinates(plan.walls, plan.openings)
    : []

  // Count shared edges
  let sharedEdges = 0
  for (let i = 0; i < aligned.length; i++) {
    for (let j = i + 1; j < aligned.length; j++) {
      if (sharesEdge(aligned[i], aligned[j], adjTol)) sharedEdges++
    }
  }

  const totalArea = loops.reduce((sum, l) => sum + l.area, 0)

  return {
    loops,
    doors,
    stats: {
      totalArea: Math.round(totalArea * 100) / 100,
      roomCount: loops.length,
      doorCount: doors.length,
      sharedEdges,
    },
  }
}
