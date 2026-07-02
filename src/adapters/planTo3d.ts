import type { PlanModel, WallSegment } from '@/domain/plan'

// ── Constants ──
export const DEFAULT_STOREY_HEIGHT = 3
export const FALLBACK_WALL_THICKNESS = 0.23
export const SLAB_THICKNESS = 0.15

// Opening default constants (reusing values from designGeometryAdapter.ts)
export const DOOR_DEFAULT_HEIGHT = 2.1
export const DOOR_DEFAULT_SILL = 0
export const WINDOW_DEFAULT_HEIGHT = 1.5
export const WINDOW_DEFAULT_SILL = 0.9

// Roof constants (default pitched/gable — no roof-type field on DesignOption)
export const ROOF_PITCH_HEIGHT = 1.5
export const ROOF_OVERHANG = 0.3

// — Output types (pure data, no three.js) —

/** A continuous wall segment (pier) — may be part of a wall that was split for openings */
export interface WallPier {
  pierId: string
  wallId: string
  storeyIndex: number
  startX: number
  startZ: number
  endX: number
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

export interface Opening3d {
  openingId: string
  wallId: string
  kind: 'door' | 'window'
  storeyIndex: number
  /** 3D centre position */
  centerX: number
  centerY: number
  centerZ: number
  width: number
  height: number
  sillHeight: number
  /** Direction the wall faces (rotation angle around Y) */
  wallAngle: number
  /** Wall thickness at this opening */
  wallThickness: number
}

export interface RoofParams {
  /** Axis the ridge runs along */
  ridgeAxis: 'x' | 'z'
  /** Ridge centre X */
  ridgeCentreX: number
  /** Ridge centre Z */
  ridgeCentreZ: number
  /** Ridge length (including overhang) */
  ridgeLength: number
  /** Overhang past walls */
  overhang: number
  /** Y level of eaves (top of top storey) */
  eaveY: number
  /** Height of ridge above eaves */
  pitchHeight: number
  /** Building footprint width */
  buildingWidth: number
  /** Building footprint depth */
  buildingDepth: number
}

export interface PlanTo3dResult {
  walls: WallPier[]
  slabs: FloorSlab[]
  openings: Opening3d[]
  roof: RoofParams | null
  bounds: {
    width: number
    depth: number
    totalHeight: number
  }
}

// — Helpers —

function wallLength2D(w: WallSegment): number {
  return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y)
}

function wallLength3D(sx: number, sz: number, ex: number, ez: number): number {
  return Math.hypot(ex - sx, ez - sz) || 0.001
}

/**
 * Resolve openings on a single wall and produce pier segments + opening placements.
 *
 * offset is a ratio (0–1) from wall start to the opening centre.
 * Returns the wall split into piers and the resolved opening data.
 */
function splitWall(
  wall: WallSegment,
  plan: PlanModel,
  storeyIndex: number,
  storeyHeight: number,
): { piers: WallPier[]; openings: Opening3d[] } {
  const wallId = wall.id
  const wl = wallLength2D(wall)
  const thickness = wall.thickness || plan.wallThickness || FALLBACK_WALL_THICKNESS

  // Map PlanModel (x,y) → 3D (x,z)
  const sx = wall.start.x
  const sz = wall.start.y
  const ex = wall.end.x
  const ez = wall.end.y

  const dx = ex - sx
  const dz = ez - sz
  const angle = -Math.atan2(dx, dz)

  // All openings on this wall, sorted by offset (centre ratio)
  const wallOpenings = (plan.openings ?? []).filter((o) => o.wallId === wallId)
  if (wallOpenings.length === 0) {
    return {
      piers: [{
        pierId: `${wallId}-full`,
        wallId,
        storeyIndex,
        startX: sx, startZ: sz,
        endX: ex, endZ: ez,
        thickness,
        height: storeyHeight,
        type: wall.type,
      }],
      openings: [],
    }
  }

  const resolved: Opening3d[] = []
  const cutRanges: { lo: number; hi: number }[] = []

  for (const op of wallOpenings) {
    // Centre position along the wall as a ratio 0–1
    const centreRatio = Math.max(0, Math.min(1, op.offset))
    // Opening half-width along the wall direction
    const halfW = (op.width || 0.9) / 2
    // Left/right edges as ratios along the wall
    const loRatio = Math.max(0, centreRatio - halfW / wl)
    const hiRatio = Math.min(1, centreRatio + halfW / wl)

    // Skip if opening is off the wall or zero-width
    if (hiRatio <= loRatio) continue

    cutRanges.push({ lo: loRatio, hi: hiRatio })

    // Centre position in 3D
    const cx = sx + dx * centreRatio
    const cz = sz + dz * centreRatio
    const cy = storeyIndex * storeyHeight

    const opHeight = op.height ?? (op.kind === 'door' ? DOOR_DEFAULT_HEIGHT : WINDOW_DEFAULT_HEIGHT)
    const opSill = op.sillHeight ?? (op.kind === 'door' ? DOOR_DEFAULT_SILL : WINDOW_DEFAULT_SILL)

    resolved.push({
      openingId: op.id,
      wallId,
      kind: op.kind,
      storeyIndex,
      centerX: cx,
      centerY: cy,
      centerZ: cz,
      width: op.width,
      height: opHeight,
      sillHeight: opSill,
      wallAngle: angle,
      wallThickness: thickness,
    })
  }

  // Build pier segments between cuts
  const piers: WallPier[] = []
  let prevHi = 0
  for (const cut of cutRanges) {
    // Pier before the cut
    if (cut.lo > prevHi) {
      const pSx = sx + dx * prevHi
      const pSz = sz + dz * prevHi
      const pEx = sx + dx * cut.lo
      const pEz = sz + dz * cut.lo
      if (wallLength3D(pSx, pSz, pEx, pEz) > 0.01) {
        piers.push({
          pierId: `${wallId}-pier-${prevHi.toFixed(3)}`,
          wallId,
          storeyIndex,
          startX: pSx, startZ: pSz,
          endX: pEx, endZ: pEz,
          thickness,
          height: storeyHeight,
          type: wall.type,
        })
      }
    }
    prevHi = cut.hi
  }
  // Pier after the last cut
  if (prevHi < 1) {
    const pSx = sx + dx * prevHi
    const pSz = sz + dz * prevHi
    const pEx = ex
    const pEz = ez
    if (wallLength3D(pSx, pSz, pEx, pEz) > 0.01) {
      piers.push({
        pierId: `${wallId}-pier-${prevHi.toFixed(3)}-end`,
        wallId,
        storeyIndex,
        startX: pSx, startZ: pSz,
        endX: pEx, endZ: pEz,
        thickness,
        height: storeyHeight,
        type: wall.type,
      })
    }
  }

  return { piers, openings: resolved }
}

// — Main function —

export function planTo3d(
  plan: PlanModel | null | undefined,
  numberOfStoreys: number,
  storeyHeight: number = DEFAULT_STOREY_HEIGHT,
): PlanTo3dResult {
  if (!plan || plan.walls.length === 0 || numberOfStoreys < 1) {
    return { walls: [], slabs: [], openings: [], roof: null, bounds: { width: 0, depth: 0, totalHeight: 0 } }
  }

  const walls: WallPier[] = []
  const slabs: FloorSlab[] = []
  const openings: Opening3d[] = []

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

    // Walls for this storey — split by openings
    for (const w of plan.walls) {
      const { piers, openings: ops } = splitWall(w, plan, si, storeyHeight)
      walls.push(...piers)
      openings.push(...ops)
    }
  }

  const totalHeight = numberOfStoreys * storeyHeight

  // Roof — pitched gable on top of the topmost storey
  const ridgeAxis = plan.width >= plan.height ? 'x' : 'z'
  const roof: RoofParams = {
    ridgeAxis,
    ridgeCentreX: plan.width / 2,
    ridgeCentreZ: plan.height / 2,
    ridgeLength: (ridgeAxis === 'x' ? plan.width : plan.height) + ROOF_OVERHANG * 2,
    overhang: ROOF_OVERHANG,
    eaveY: totalHeight,
    pitchHeight: ROOF_PITCH_HEIGHT,
    buildingWidth: plan.width,
    buildingDepth: plan.height,
  }

  return {
    walls,
    slabs,
    openings,
    roof,
    bounds: {
      width: plan.width,
      depth: plan.height,
      totalHeight,
    },
  }
}

// — Pure helpers for tests —

export function resolveOpeningPosition(
  wall: { startX: number; startZ: number; endX: number; endZ: number; thickness: number },
  opening: { kind: 'door' | 'window'; offset: number; width: number; height?: number; sillHeight?: number },
  storeyIndex: number,
  storeyHeight: number,
): Opening3d {
  const dx = wall.endX - wall.startX
  const dz = wall.endZ - wall.startZ
  const centreRatio = Math.max(0, Math.min(1, opening.offset))
  const cx = wall.startX + dx * centreRatio
  const cz = wall.startZ + dz * centreRatio
  const cy = storeyIndex * storeyHeight
  const angle = -Math.atan2(dx, dz)
  const opHeight = opening.height ?? (opening.kind === 'door' ? DOOR_DEFAULT_HEIGHT : WINDOW_DEFAULT_HEIGHT)
  const opSill = opening.sillHeight ?? (opening.kind === 'door' ? DOOR_DEFAULT_SILL : WINDOW_DEFAULT_SILL)
  return {
    openingId: 'test',
    wallId: 'test',
    kind: opening.kind,
    storeyIndex,
    centerX: cx,
    centerY: cy,
    centerZ: cz,
    width: opening.width,
    height: opHeight,
    sillHeight: opSill,
    wallAngle: angle,
    wallThickness: wall.thickness,
  }
}
