import type { PlanModel } from '@/domain/plan'

// ── Constants ──
// Storey height reused from designGeometryAdapter.ts (FLOOR_HEIGHT = 3)
export const DEFAULT_STOREY_HEIGHT = 3

// Wall thickness uses PlanModel.wallThickness; this fallback matches
// designGeometryAdapter.ts WALL_THICKNESS = 0.23
export const FALLBACK_WALL_THICKNESS = 0.23

// Slab thickness constant
export const SLAB_THICKNESS = 0.15

// ── Output types (pure data, no three.js) ──

export interface WallSolid {
  wallId: string
  storeyIndex: number
  /** 2D start point x (PlanModel x → 3D x) */
  startX: number
  /** 2D start point y (PlanModel y → 3D z) */
  startZ: number
  /** 2D end point x */
  endX: number
  /** 2D end point y */
  endZ: number
  thickness: number
  height: number
  type: 'external' | 'internal'
}

export interface FloorSlab {
  storeyIndex: number
  centerX: number
  centerZ: number
  width: number
  depth: number
  thickness: number
  yOffset: number
}

export interface PlanTo3dResult {
  walls: WallSolid[]
  slabs: FloorSlab[]
  bounds: {
    width: number
    depth: number
    totalHeight: number
  }
}

/**
 * Convert a PlanModel (+ storey settings) into pure 3D geometry data.
 *
 * The 2D y-axis in PlanModel maps to the 3D z-axis (depth).
 * Wall segments produce solid extrusions per storey.
 * Each storey gets a floor slab matching the building footprint.
 */
export function planTo3d(
  plan: PlanModel | null | undefined,
  numberOfStoreys: number,
  storeyHeight: number = DEFAULT_STOREY_HEIGHT,
): PlanTo3dResult {
  if (!plan || plan.walls.length === 0 || numberOfStoreys < 1) {
    return { walls: [], slabs: [], bounds: { width: 0, depth: 0, totalHeight: 0 } }
  }

  const walls: WallSolid[] = []
  const slabs: FloorSlab[] = []

  for (let si = 0; si < numberOfStoreys; si++) {
    const yOffset = si * storeyHeight

    // Floor slab for this storey
    slabs.push({
      storeyIndex: si,
      centerX: plan.width / 2,
      centerZ: plan.height / 2,
      width: plan.width,
      depth: plan.height,
      thickness: SLAB_THICKNESS,
      yOffset,
    })

    // Walls for this storey
    for (const w of plan.walls) {
      walls.push({
        wallId: w.id,
        storeyIndex: si,
        startX: w.start.x,
        startZ: w.start.y,
        endX: w.end.x,
        endZ: w.end.y,
        thickness: w.thickness || plan.wallThickness || FALLBACK_WALL_THICKNESS,
        height: storeyHeight,
        type: w.type,
      })
    }
  }

  return {
    walls,
    slabs,
    bounds: {
      width: plan.width,
      depth: plan.height,
      totalHeight: numberOfStoreys * storeyHeight,
    },
  }
}
