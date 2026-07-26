import { describe, it, expect } from 'vitest'
import { buildingGraphToSiteAnalysis, orientationScore } from '@/adapters/canonical/building-to-site-analysis'
import { buildingGraphToSolarAnalysis } from '@/adapters/canonical/building-to-solar-analysis'
import { buildingGraphShadowStudy, buildingGraphNoonShadow, buildingGraphSunPositions, buildingGraphOptimalOrientation } from '@/adapters/canonical/building-to-shadows'
import type { BuildingGraph } from '@/domain/building'
import type { SiteContext } from '@/domain/site'

function makeSiteGraph(overrides?: Partial<SiteContext>): BuildingGraph {
  const site: SiteContext = {
    projectId: 'p1',
    lat: -17.8,
    lng: 31.0,
    orientation: 0,
    terrain: 'flat',
    adjacentBuildings: [],
    windRose: {
      sectors: [
        { direction: 0, speed: 3, frequency: 0.15 },
        { direction: 45, speed: 2.5, frequency: 0.1 },
        { direction: 90, speed: 4, frequency: 0.2 },
        { direction: 135, speed: 3.5, frequency: 0.12 },
        { direction: 180, speed: 5, frequency: 0.18 },
        { direction: 225, speed: 4.5, frequency: 0.1 },
        { direction: 270, speed: 3, frequency: 0.08 },
        { direction: 315, speed: 2, frequency: 0.07 },
      ],
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }

  return {
    meta: { id: 'g1', projectId: 'p1', name: 'Test', category: 'residential', description: '', createdAt: '', updatedAt: '' },
    site,
    levels: [{ id: 'l1', name: 'Ground', number: 0, elevation: 0, floorHeight: 3 }],
    spaces: [],
    walls: [
      { id: 'w1', levelId: 'l1', role: 'external', start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: { role: 'external' } },
      { id: 'w2', levelId: 'l1', role: 'external', start: { x: 10, y: 0, z: 0 }, end: { x: 10, y: 0, z: 8 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: { role: 'external' } },
      { id: 'w3', levelId: 'l1', role: 'external', start: { x: 10, y: 0, z: 8 }, end: { x: 0, y: 0, z: 8 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: { role: 'external' } },
      { id: 'w4', levelId: 'l1', role: 'external', start: { x: 0, y: 0, z: 8 }, end: { x: 0, y: 0, z: 0 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: { role: 'external' } },
      { id: 'w5', levelId: 'l1', role: 'internal', start: { x: 0, y: 0, z: 4 }, end: { x: 10, y: 0, z: 4 }, thickness: 0.1, height: 3, material: 'plasterboard', ifcClass: 'IfcWall', properties: { role: 'internal' } },
    ],
    slabs: [],
    openings: [
      { id: 'o1', levelId: 'l1', wallId: 'w1', kind: 'window', offsetRatio: 0.3, width: 1.5, height: 1.2, sillHeight: 0.9, material: 'glass', ifcClass: 'IfcWindow', properties: {} },
      { id: 'o2', levelId: 'l1', wallId: 'w2', kind: 'window', offsetRatio: 0.5, width: 1.2, height: 1.2, sillHeight: 0.9, material: 'glass', ifcClass: 'IfcWindow', properties: {} },
      { id: 'o3', levelId: 'l1', wallId: 'w3', kind: 'door', offsetRatio: 0.5, width: 0.9, height: 2.1, sillHeight: 0, material: 'timber', ifcClass: 'IfcDoor', properties: {} },
    ],
    columns: [], beams: [], stairs: [], roof: null,
    structural: null, serviceZones: [],
  } as unknown as BuildingGraph
}

describe('buildingGraphToSiteAnalysis', () => {
  it('returns null when no site context', () => {
    const graph = { ...makeSiteGraph(), site: null } as unknown as BuildingGraph
    expect(buildingGraphToSiteAnalysis(graph)).toBeNull()
  })

  it('returns facade exposures for 8 cardinal directions', () => {
    const result = buildingGraphToSiteAnalysis(makeSiteGraph())!
    expect(result.solarExposure).toHaveLength(8)
    expect(result.solarExposure[0].label).toBe('N')
    expect(result.solarExposure[4].label).toBe('S')
  })

  it('computes total annual kWh', () => {
    const result = buildingGraphToSiteAnalysis(makeSiteGraph())!
    expect(result.totalAnnualKwh).toBeGreaterThan(0)
    expect(result.totalPeakSunHours).toBeGreaterThan(0)
  })

  it('determines optimal orientation', () => {
    const result = buildingGraphToSiteAnalysis(makeSiteGraph())!
    expect(result.optimalOrientation).toBeGreaterThanOrEqual(0)
    expect(result.optimalOrientation).toBeLessThanOrEqual(360)
  })

  it('includes wind exposure data', () => {
    const result = buildingGraphToSiteAnalysis(makeSiteGraph())!
    expect(result.windExposure.length).toBeGreaterThan(0)
  })
})

describe('orientationScore', () => {
  it('returns 100 when orientation matches', () => {
    expect(orientationScore(45, 45)).toBe(100)
  })

  it('returns 0 when 180 degrees off', () => {
    expect(orientationScore(0, 180)).toBe(0)
  })

  it('returns 50 when 90 degrees off', () => {
    expect(orientationScore(0, 90)).toBe(50)
  })
})

describe('buildingGraphToSolarAnalysis', () => {
  it('returns metrics for all 4 cardinal orientations', () => {
    const result = buildingGraphToSolarAnalysis(makeSiteGraph())
    expect(result.cardinalMetrics).toHaveLength(4)
    const labels = result.cardinalMetrics.map((m) => m.orientation)
    expect(labels).toContain('North')
    expect(labels).toContain('South')
    expect(labels).toContain('East')
    expect(labels).toContain('West')
  })

  it('includes wall and window area for orientations with walls', () => {
    const result = buildingGraphToSolarAnalysis(makeSiteGraph())
    const east = result.cardinalMetrics.find((m) => m.orientation === 'East')!
    expect(east.wallArea).toBeGreaterThan(0)
  })

  it('computes window-to-wall ratio', () => {
    const result = buildingGraphToSolarAnalysis(makeSiteGraph())
    const north = result.cardinalMetrics.find((m) => m.orientation === 'North')!
    expect(north.wwrPct).toBeGreaterThan(0)
    expect(north.wwrPct).toBeLessThan(100)
  })

  it('assigns efficiency rating', () => {
    const result = buildingGraphToSolarAnalysis(makeSiteGraph())
    expect(['Optimized', 'Standard', 'High Exposure Warning']).toContain(result.efficiencyRating)
  })

  it('includes recommendations', () => {
    const result = buildingGraphToSolarAnalysis(makeSiteGraph())
    expect(result.recommendations.length).toBeGreaterThan(0)
  })
})

describe('buildingGraphShadowStudy', () => {
  it('returns empty array when no site', () => {
    const graph = { ...makeSiteGraph(), site: null } as unknown as BuildingGraph
    expect(buildingGraphShadowStudy(graph, { date: new Date('2026-06-21'), hourly: true, daily: false })).toHaveLength(0)
  })

  it('returns hourly shadow positions', () => {
    const graph = makeSiteGraph()
    const shadows = buildingGraphShadowStudy(graph, { date: new Date('2026-06-21'), hourly: true, daily: false })
    expect(shadows.length).toBeGreaterThan(0)
    expect(shadows[0].vertices.length).toBeGreaterThanOrEqual(3)
  })

  it('returns single shadow for daily study', () => {
    const graph = makeSiteGraph()
    const shadows = buildingGraphShadowStudy(graph, { date: new Date('2026-06-21'), hourly: false, daily: true })
    expect(shadows).toHaveLength(1)
  })
})

describe('buildingGraphNoonShadow', () => {
  it('returns null when no site', () => {
    const graph = { ...makeSiteGraph(), site: null } as unknown as BuildingGraph
    expect(buildingGraphNoonShadow(graph)).toBeNull()
  })

  it('returns shadow polygon at noon', () => {
    const graph = makeSiteGraph()
    const shadow = buildingGraphNoonShadow(graph, new Date('2026-12-21'))
    expect(shadow).not.toBeNull()
    expect(shadow!.vertices.length).toBeGreaterThanOrEqual(3)
    expect(shadow!.opacity).toBeGreaterThanOrEqual(0)
  })
})

describe('buildingGraphSunPositions', () => {
  it('returns empty when no site', () => {
    const graph = { ...makeSiteGraph(), site: null } as unknown as BuildingGraph
    expect(buildingGraphSunPositions(graph)).toHaveLength(0)
  })

  it('returns sun positions with azimuth and elevation', () => {
    const graph = makeSiteGraph()
    const positions = buildingGraphSunPositions(graph, new Date('2026-06-21'))
    expect(positions.length).toBeGreaterThan(0)
    expect(positions[0].azimuth).toBeGreaterThanOrEqual(0)
    expect(positions[0].elevation).toBeGreaterThanOrEqual(0)
  })
})

describe('buildingGraphOptimalOrientation', () => {
  it('returns null when no site', () => {
    const graph = { ...makeSiteGraph(), site: null } as unknown as BuildingGraph
    expect(buildingGraphOptimalOrientation(graph)).toBeNull()
  })

  it('returns optimal facade angle', () => {
    const graph = makeSiteGraph()
    const angle = buildingGraphOptimalOrientation(graph)
    expect(angle).not.toBeNull()
    expect([0, 45, 90, 135, 180, 225, 270, 315]).toContain(angle)
  })
})
