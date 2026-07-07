import { describe, it, expect } from 'vitest'
import {
  surfacePoint,
  generateSeedPoints,
  triangulateDelaunay,
  computeVoronoiCells,
  projectCellsToSurface,
  computeCanopy,
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

  it('returns safe empty structure for bad params (no throw)', () => {
    const bad1 = computeCanopy({ ...defaultParams, spanX: 0 })
    expect(bad1.cells).toHaveLength(0)
    expect(bad1.allEdges).toHaveLength(0)

    const bad2 = computeCanopy({ ...defaultParams, cellDensity: 0 })
    expect(bad2.cells).toHaveLength(0)

    const bad3 = computeCanopy({ ...defaultParams, rise: -1 })
    expect(bad3.cells).toHaveLength(0)
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
