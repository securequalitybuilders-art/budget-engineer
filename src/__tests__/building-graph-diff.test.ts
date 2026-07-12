import { describe, it, expect } from 'vitest'
import { diffBuildingGraphs, formatGraphDiff } from '../lib/versioning/building-graph-diff'
import { type BuildingGraph } from '../domain/building'

function baseGraph(): BuildingGraph {
  return {
    meta: { projectId: 'proj-1', projectName: 'Test', projectType: 'residential', clientName: '', createdAt: '', updatedAt: '', version: '1.0', units: 'metric', coordinates: { lat: 0, lng: 0 }, description: '' },
    dimensions: { length: 10, width: 8, height: 6, area: 80, levels: 1, maxHeight: 6 },
    walls: [{ id: 'w1', start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, length: 10, thickness: 0.2, height: 3, role: 'exterior', material: 'brick', type: 'wall', levelId: 'l1' }],
    slabs: [{ id: 's1', vertices: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 8, z: 0 }, { x: 0, y: 8, z: 0 }], thickness: 0.15, levelId: 'l1', type: 'ground', material: 'concrete' }],
    openings: [{ id: 'o1', wallId: 'w1', kind: 'window', width: 1.2, height: 1.5, sillHeight: 0.9, xPosition: 2 }],
    spaces: [{ id: 'sp1', name: 'Living Room', programme: 'living', levelId: 'l1', areaM2: 30, bbox: { minX: 0, minY: 0, maxX: 6, maxY: 5 } }],
    levels: [{ id: 'l1', name: 'Ground', elevation: 0, height: 3, order: 0 }],
    columns: [],
    beams: [],
    stairs: [],
    roof: null,
    materials: [],
    structural: { foundation: 'strip', framing: 'timber', roofType: 'pitched' },
    mechanical: { coolingLoad: 10, heatingLoad: 12, ventilationRate: 1.5 },
  }
}

function modifiedGraph(orig: BuildingGraph): BuildingGraph {
  const g = JSON.parse(JSON.stringify(orig)) as BuildingGraph
  g.walls[0].thickness = 0.25
  g.walls[0].material = 'block'
  g.spaces[0].programme = 'kitchen'
  g.spaces[0].areaM2 = 28
  g.openings.push({ id: 'o2', wallId: 'w1', kind: 'door', width: 0.9, height: 2.1, sillHeight: 0, xPosition: 5 })
  g.columns = [{ id: 'c1', x: 3, y: 3, width: 0.3, depth: 0.3, height: 3, levelId: 'l1', material: 'concrete', label: 'C1' }]
  g.roof = { type: 'pitched', pitch: 30, material: 'tile', overhang: 0.3 }
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
    b.walls.push({ id: 'w2', start: { x: 0, y: 4, z: 0 }, end: { x: 10, y: 4, z: 0 }, length: 10, thickness: 0.15, height: 3, role: 'interior', material: 'gypsum', type: 'wall', levelId: 'l1' })
    b.spaces.push({ id: 'sp2', name: 'Bedroom', programme: 'bedroom', levelId: 'l1', areaM2: 20, bbox: { minX: 0, minY: 5, maxX: 6, maxY: 8 } })
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
    b.levels.push({ id: 'l2', name: 'First', elevation: 3, height: 3, order: 1 })
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
