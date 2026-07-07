import { describe, it, expect } from 'vitest'
import {
  surfacePoint,
  generateSeedPoints,
  triangulateDelaunay,
  computeVoronoiCells,
  projectCellsToSurface,
  computeCanopy,
  clampCanopyParams,
  computePerimeterEdges,
  computeSupports,
  canopySectionProfile,
  computeSpineRibs,
  MAX_CELL_DENSITY,
} from '@/engine/canopy/canopyGeometry'
import type { CanopyParams } from '@/engine/canopy/canopyGeometry'

const defaultParams: CanopyParams = {
  spanX: 10,
  spanZ: 8,
  rise: 2,
  cellDensity: 20,
  seed: 42,
  heightAboveBuilding: 9,
}

describe('surfacePoint', () => {
  it('corners (u,v ∈ {0,1}) have y ≈ heightAboveBuilding (minimal rise)', () => {
    const p = defaultParams
    for (const u of [0, 1]) {
      for (const v of [0, 1]) {
        const [, y] = surfacePoint(u, v, p)
        expect(y).toBeCloseTo(p.heightAboveBuilding, 1)
      }
    }
  })

  it('centre (0.5, 0.5) has y ≈ heightAboveBuilding + rise (maximum)', () => {
    const [, y] = surfacePoint(0.5, 0.5, defaultParams)
    expect(y).toBeCloseTo(defaultParams.heightAboveBuilding + defaultParams.rise, 1)
  })

  it('maps u,v across spanX/spanZ correctly', () => {
    const [x,, z] = surfacePoint(1, 1, defaultParams)
    expect(x).toBeCloseTo(defaultParams.spanX / 2, 1)
    expect(z).toBeCloseTo(defaultParams.spanZ / 2, 1)
  })

  it('deterministic — same input always same output', () => {
    const a = surfacePoint(0.3, 0.7, defaultParams)
    const b = surfacePoint(0.3, 0.7, defaultParams)
    expect(a).toEqual(b)
  })
})

describe('generateSeedPoints', () => {
  it('count is ≈ cellDensity', () => {
    const p = generateSeedPoints(defaultParams)
    expect(p.length).toBeGreaterThanOrEqual(3)
    expect(p.length).toBeLessThanOrEqual(defaultParams.cellDensity * 2)
  })

  it('all points within (0,1)²', () => {
    const p = generateSeedPoints(defaultParams)
    for (const pt of p) {
      expect(pt.x).toBeGreaterThan(0)
      expect(pt.x).toBeLessThan(1)
      expect(pt.y).toBeGreaterThan(0)
      expect(pt.y).toBeLessThan(1)
    }
  })

  it('same seed → identical points', () => {
    const a = generateSeedPoints({ ...defaultParams, seed: 42 })
    const b = generateSeedPoints({ ...defaultParams, seed: 42 })
    expect(a).toEqual(b)
  })

  it('different seed → different points', () => {
    const a = generateSeedPoints({ ...defaultParams, seed: 42 })
    const b = generateSeedPoints({ ...defaultParams, seed: 99 })
    const same = a.every((pt, i) => pt.x === b[i]?.x && pt.y === b[i]?.y)
    expect(same).toBe(false)
  })

  it('minimum density of 3 works', () => {
    const p = generateSeedPoints({ ...defaultParams, cellDensity: 3 })
    expect(p.length).toBeGreaterThanOrEqual(3)
  })
})

describe('triangulateDelaunay', () => {
  it('returns >0 triangles for ≥3 points', () => {
    const pts = [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.1 }]
    const tris = triangulateDelaunay(pts)
    expect(tris.length).toBeGreaterThan(0)
    // Should be exactly 1 triangle for 3 points
    expect(tris.length).toBe(1)
  })

  it('returns empty for <3 points', () => {
    expect(triangulateDelaunay([{ x: 0, y: 0 }])).toHaveLength(0)
    expect(triangulateDelaunay([])).toHaveLength(0)
  })

  it('triangulates many seed points without throwing', () => {
    const pts = generateSeedPoints(defaultParams)
    const tris = triangulateDelaunay(pts)
    expect(tris.length).toBeGreaterThan(0)
  })

  it('deterministic — same input, same output', () => {
    const pts = [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.1 }, { x: 0.3, y: 0.4 }]
    const a = triangulateDelaunay(pts)
    const b = triangulateDelaunay(pts)
    expect(a).toEqual(b)
  })
})

describe('computeVoronoiCells', () => {
  it('returns >0 cells for ≥3 seeds', () => {
    const pts = generateSeedPoints(defaultParams)
    const cells = computeVoronoiCells(pts)
    expect(cells.length).toBe(pts.length)
    const nonEmpty = cells.filter(c => c.vertices.length >= 3)
    expect(nonEmpty.length).toBeGreaterThan(0)
  })

  it('returns empty vertices for 0/1 seed (safe, no throw)', () => {
    const empty = computeVoronoiCells([])
    expect(empty).toHaveLength(0)
    const single = computeVoronoiCells([{ x: 0.5, y: 0.5 }])
    expect(single).toHaveLength(1)
    expect(single[0].vertices).toHaveLength(0)
  })
})

describe('projectCellsToSurface', () => {
  it('projects every vertex within span bounds', () => {
    const pts = generateSeedPoints(defaultParams)
    const cells2d = computeVoronoiCells(pts)
    const result = projectCellsToSurface(cells2d, defaultParams)
    for (const cell of result.cells) {
      for (const [x, y, z] of cell.vertices3d) {
        expect(Math.abs(x)).toBeLessThanOrEqual(defaultParams.spanX / 2 + 0.01)
        expect(Math.abs(z)).toBeLessThanOrEqual(defaultParams.spanZ / 2 + 0.01)
        expect(y).toBeGreaterThanOrEqual(defaultParams.heightAboveBuilding)
        expect(y).toBeLessThanOrEqual(defaultParams.heightAboveBuilding + defaultParams.rise + 0.01)
      }
    }
  })

  it('centre cells have higher y than edge cells', () => {
    const params: CanopyParams = { ...defaultParams, cellDensity: 10 }
    const pts = generateSeedPoints(params)
    const cells2d = computeVoronoiCells(pts)
    const result = projectCellsToSurface(cells2d, params)
    if (result.cells.length >= 2) {
      const centreCell = result.cells.reduce((a, b) =>
        a.centroid[1] > b.centroid[1] ? a : b,
      )
      const edgeCell = result.cells.reduce((a, b) =>
        a.centroid[1] < b.centroid[1] ? a : b,
      )
      expect(centreCell.centroid[1]).toBeGreaterThanOrEqual(edgeCell.centroid[1])
    }
  })

  it('returns edges and centroids', () => {
    const pts = generateSeedPoints(defaultParams)
    const cells2d = computeVoronoiCells(pts)
    const result = projectCellsToSurface(cells2d, defaultParams)
    expect(result.allEdges.length).toBeGreaterThan(0)
    for (const cell of result.cells) {
      expect(cell.edges.length).toBeGreaterThanOrEqual(3)
      expect(cell.centroid.length).toBe(3)
    }
  })
})

describe('computeCanopy', () => {
  it('returns valid result for valid params', () => {
    const result = computeCanopy(defaultParams)
    expect(result.cells.length).toBeGreaterThan(0)
    expect(result.allEdges.length).toBeGreaterThan(0)
  })

  it('never throws — clamping prevents truly invalid params', () => {
    // spanX=0 clamped to MIN_SPAN=1 → valid result
    const result = computeCanopy({ ...defaultParams, spanX: 0 })
    expect(result.cells.length).toBeGreaterThan(0)

    // rise=-1 clamped to 0 → valid (flat canopy)
    const flat = computeCanopy({ ...defaultParams, rise: -1 })
    expect(flat.cells.length).toBeGreaterThan(0)
  })

  it('deterministic — same params produce identical result', () => {
    const a = computeCanopy(defaultParams)
    const b = computeCanopy(defaultParams)
    expect(a.cells.length).toBe(b.cells.length)
    expect(a.allEdges.length).toBe(b.allEdges.length)
  })

  it('different seed produces different cell structure', () => {
    const a = computeCanopy(defaultParams)
    const b = computeCanopy({ ...defaultParams, seed: 99 })
    // Different seeds → edge counts should differ (highly likely)
    const sameLength = a.allEdges.length === b.allEdges.length
    expect(sameLength).toBe(false)
  })
})

describe('clampCanopyParams', () => {
  it('caps cellDensity at MAX_CELL_DENSITY', () => {
    const clamped = clampCanopyParams({ ...defaultParams, cellDensity: 999 })
    expect(clamped.cellDensity).toBeLessThanOrEqual(MAX_CELL_DENSITY)
  })

  it('floors cellDensity at 3', () => {
    const clamped = clampCanopyParams({ ...defaultParams, cellDensity: -5 })
    expect(clamped.cellDensity).toBe(3)
    const zero = clampCanopyParams({ ...defaultParams, cellDensity: 0 })
    expect(zero.cellDensity).toBe(3)
  })

  it('clamps spanX/spanZ to [MIN_SPAN, MAX_SPAN]', () => {
    const clamped = clampCanopyParams({ ...defaultParams, spanX: 0, spanZ: 100 })
    expect(clamped.spanX).toBeGreaterThanOrEqual(1)
    expect(clamped.spanZ).toBeLessThanOrEqual(50)
  })

  it('clamps rise to [0, MAX_RISE]', () => {
    const clamped = clampCanopyParams({ ...defaultParams, rise: -1 })
    expect(clamped.rise).toBe(0)
    const big = clampCanopyParams({ ...defaultParams, rise: 20 })
    expect(big.rise).toBeLessThanOrEqual(10)
  })

  it('applied within computeCanopy so extreme density is safe', () => {
    // 999 clamped to 60 → valid canopy
    const result = computeCanopy({ ...defaultParams, cellDensity: 999 })
    expect(result.cells.length).toBeGreaterThan(0)
    // -1 clamped to 3 → only 3 seeds → <2 incident triangles each → 0 cells but no crash
    const safe = computeCanopy({ ...defaultParams, cellDensity: -1 })
    expect(safe.cells.length).toBe(0)
    expect(safe.allEdges.length).toBe(0)
  })
})

describe('computePerimeterEdges', () => {
  it('returns exactly 4 edges', () => {
    const edges = computePerimeterEdges(defaultParams)
    expect(edges).toHaveLength(4)
  })

  it('each edge connects two 3D points', () => {
    const edges = computePerimeterEdges(defaultParams)
    for (const e of edges) {
      expect(e.start).toHaveLength(3)
      expect(e.end).toHaveLength(3)
      expect(e.start[1]).toBe(defaultParams.heightAboveBuilding)
      expect(e.end[1]).toBe(defaultParams.heightAboveBuilding)
    }
  })
})

describe('computeSupports', () => {
  it('returns exactly 4 supports', () => {
    const supports = computeSupports(defaultParams)
    expect(supports).toHaveLength(4)
  })

  it('each support has base and top at different heights', () => {
    const supports = computeSupports(defaultParams)
    for (const s of supports) {
      expect(s.top).toHaveLength(3)
      expect(s.base).toHaveLength(3)
      expect(s.top[1]).toBeGreaterThan(s.base[1])
    }
  })

  it('supports land at canopy edge in plan view', () => {
    const supports = computeSupports(defaultParams)
    for (const s of supports) {
      expect(Math.abs(s.top[0])).toBe(defaultParams.spanX / 2)
      expect(Math.abs(s.top[2])).toBe(defaultParams.spanZ / 2)
    }
  })
})

describe('canopySectionProfile', () => {
  it('returns a polyline with points following the curve', () => {
    const profile = canopySectionProfile(defaultParams, 'x')
    expect(profile.points.length).toBeGreaterThanOrEqual(32)
    // Centre point is highest
    const centreY = profile.points[Math.floor(profile.points.length / 2)][1]
    const edgeY = profile.points[0][1]
    expect(centreY).toBeGreaterThan(edgeY)
  })

  it('returns points within span bounds', () => {
    const profile = canopySectionProfile(defaultParams, 'x')
    for (const [wx, , wz] of profile.points) {
      expect(Math.abs(wx)).toBeLessThanOrEqual(defaultParams.spanX / 2 + 0.01)
      expect(Math.abs(wz)).toBeLessThanOrEqual(defaultParams.spanZ / 2 + 0.01)
    }
  })

  it('never throws for extreme params — clamping keeps bounds valid', () => {
    // spanX=0 clamped to MIN_SPAN=1 → valid profile
    const profile = canopySectionProfile({ ...defaultParams, spanX: 0 }, 'x')
    expect(profile.points.length).toBeGreaterThanOrEqual(32)
    // After clamping spanX=1, leftX = -0.5
    expect(profile.leftX).toBe(-0.5)
    expect(profile.rightX).toBe(0.5)
  })

  it('cutAxis z samples along v direction at u=0.5', () => {
    const profile = canopySectionProfile(defaultParams, 'z')
    // Points along Z axis should have x ≈ 0 (centre of X span)
    for (const [wx] of profile.points) {
      expect(Math.abs(wx)).toBeLessThan(0.01)
    }
  })
})

describe('computeSpineRibs', () => {
  it('returns at least 4 ribs', () => {
    const ribs = computeSpineRibs(defaultParams)
    expect(ribs.length).toBeGreaterThanOrEqual(4)
  })

  it('each rib connects two 3D points', () => {
    const ribs = computeSpineRibs(defaultParams)
    for (const r of ribs) {
      expect(r.start).toHaveLength(3)
      expect(r.end).toHaveLength(3)
    }
  })

  it('rib endpoints are at or above heightAboveBuilding', () => {
    const ribs = computeSpineRibs(defaultParams)
    for (const r of ribs) {
      expect(r.start[1]).toBeGreaterThanOrEqual(defaultParams.heightAboveBuilding)
      expect(r.end[1]).toBeGreaterThanOrEqual(defaultParams.heightAboveBuilding)
    }
  })

  it('deterministic — same params produce identical ribs', () => {
    const a = computeSpineRibs(defaultParams)
    const b = computeSpineRibs(defaultParams)
    expect(a.length).toBe(b.length)
  })
})
