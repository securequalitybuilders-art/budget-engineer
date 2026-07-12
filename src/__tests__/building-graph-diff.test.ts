import { describe, it, expect } from 'vitest'
import { diffBuildingGraphs, formatGraphDiff } from '../lib/versioning/building-graph-diff'
import { type BuildingGraph } from '../domain/building'

function baseGraph(): BuildingGraph {
  return {
    meta: { id: 'proj-1', projectId: 'proj-1', name: 'Test', category: 'residential' as const, description: '', createdAt: '', updatedAt: '' },
    site: null,
    levels: [{ id: 'l1', name: 'Ground', number: 0, elevation: 0, floorHeight: 3 }],
    spaces: [{ id: 'sp1', name: 'Living Room', programme: 'living' as const, levelId: 'l1', areaM2: 30, bbox: { minX: 0, minY: 0, maxX: 6, maxY: 5 }, boundary: { vertices: [] }, finishSpec: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: '', floorFinish: '', ceilingFinish: '' }, fixtures: [], notes: '' }],
    walls: [{ id: 'w1', levelId: 'l1', role: 'external' as const, start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, thickness: 0.2, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} }],
    slabs: [{ id: 's1', levelId: 'l1', boundary: { vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }, { x: 0, y: 8 }] }, thickness: 0.15, material: 'concrete', ifcClass: 'IfcSlab', properties: {} }],
    openings: [{ id: 'o1', levelId: 'l1', wallId: 'w1', kind: 'window' as const, offsetRatio: 0.5, width: 1.2, height: 1.5, sillHeight: 0.9, material: 'aluminium', ifcClass: 'IfcWindow', properties: {} }],
    columns: [],
    beams: [],
    stairs: [],
    roof: null,
    structural: null,
    serviceZones: [],
  }
}

function modifiedGraph(orig: BuildingGraph): BuildingGraph {
  const g = JSON.parse(JSON.stringify(orig)) as BuildingGraph
  g.walls[0].thickness = 0.25
  g.walls[0].material = 'block'
  g.spaces[0].programme = 'kitchen'
  g.spaces[0].areaM2 = 28
  g.openings.push({ id: 'o2', levelId: 'l1', wallId: 'w1', kind: 'door' as const, offsetRatio: 0.5, width: 0.9, height: 2.1, sillHeight: 0, material: 'timber', ifcClass: 'IfcDoor', properties: {} })
  g.columns = [{ id: 'c1', levelId: 'l1', position: { x: 3, y: 3 }, width: 0.3, depth: 0.3, height: 3, material: 'concrete', ifcClass: 'IfcColumn', properties: {} }]
  g.roof = { id: 'r1', levelId: 'l1', roofType: 'pitched' as const, boundary: { vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }, { x: 0, y: 8 }] }, thickness: 0.12, pitch: 30, material: 'tile', properties: {} }
  return g
}

describe('building-graph-diff', () => {
  it('returns empty diff for identical graphs', () => {
    const g = baseGraph()
    const diff = diffBuildingGraphs(g, g)
    expect(diff.changes).toHaveLength(0)
    expect(diff.wallCountDelta).toBe(0)
    expect(diff.spaceCountDelta).toBe(0)
    expect(diff.gfaDelta).toBe(0)
  })

  it('detects added walls and spaces', () => {
    const a = baseGraph()
    const b = JSON.parse(JSON.stringify(a)) as BuildingGraph
    b.walls.push({ id: 'w2', levelId: 'l1', role: 'internal' as const, start: { x: 0, y: 4, z: 0 }, end: { x: 10, y: 4, z: 0 }, thickness: 0.15, height: 3, material: 'gypsum', ifcClass: 'IfcWall', properties: {} })
    b.spaces.push({ id: 'sp2', name: 'Bedroom', programme: 'bedroom' as const, levelId: 'l1', areaM2: 20, bbox: { minX: 0, minY: 5, maxX: 6, maxY: 8 }, boundary: { vertices: [] }, finishSpec: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: '', floorFinish: '', ceilingFinish: '' }, fixtures: [], notes: '' })
    const diff = diffBuildingGraphs(a, b)
    expect(diff.wallCountDelta).toBe(1)
    expect(diff.spaceCountDelta).toBe(1)
    expect(diff.changes.some((c) => c.type === 'added' && c.entityType === 'wall')).toBe(true)
    expect(diff.changes.some((c) => c.type === 'added' && c.entityType === 'space')).toBe(true)
  })

  it('detects removed walls', () => {
    const a = baseGraph()
    const b = JSON.parse(JSON.stringify(a)) as BuildingGraph
    b.walls = []
    const diff = diffBuildingGraphs(a, b)
    expect(diff.wallCountDelta).toBe(-1)
    expect(diff.changes.some((c) => c.type === 'removed' && c.entityType === 'wall')).toBe(true)
  })

  it('detects modified spaces (programme/area change)', () => {
    const a = baseGraph()
    const b = modifiedGraph(a)
    const diff = diffBuildingGraphs(a, b)
    const mod = diff.changes.find((c) => c.entityType === 'space')
    expect(mod?.type).toBe('modified')
    expect(mod?.details).toContain('Living Room')
  })

  it('detects added openings', () => {
    const a = baseGraph()
    const b = modifiedGraph(a)
    const diff = diffBuildingGraphs(a, b)
    expect(diff.openingCountDelta).toBe(1)
    expect(diff.changes.some((c) => c.type === 'added' && c.entityType === 'opening')).toBe(true)
  })

  it('detects level count changes', () => {
    const a = baseGraph()
    const b = JSON.parse(JSON.stringify(a)) as BuildingGraph
    b.levels.push({ id: 'l2', name: 'First', number: 1, elevation: 3, floorHeight: 3 })
    const diff = diffBuildingGraphs(a, b)
    const lvl = diff.changes.find((c) => c.entityType === 'level')
    expect(lvl?.type).toBe('modified')
    expect(lvl?.details).toContain('1 → 2')
  })

  it('detects column/beam/stair/roof changes', () => {
    const a = baseGraph()
    const b = modifiedGraph(a)
    const diff = diffBuildingGraphs(a, b)
    expect(diff.changes.some((c) => c.entityType === 'column')).toBe(true)
    expect(diff.changes.some((c) => c.entityType === 'roof')).toBe(true)
  })

  it('computes GFA delta', () => {
    const a = baseGraph()
    const b = JSON.parse(JSON.stringify(a)) as BuildingGraph
    b.spaces[0].areaM2 = 35
    const diff = diffBuildingGraphs(a, b)
    expect(diff.gfaDelta).toBe(5)
  })

  it('formatGraphDiff produces non-empty string', () => {
    const a = baseGraph()
    const b = modifiedGraph(a)
    const diff = diffBuildingGraphs(a, b)
    const str = formatGraphDiff(diff)
    expect(str.length).toBeGreaterThan(0)
    expect(str).toContain('Changes:')
    expect(str).toContain('[+]')
    expect(str).toContain('[~]')
  })
})
