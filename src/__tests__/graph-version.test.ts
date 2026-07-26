import { describe, it, expect } from 'vitest'
import { createInitialVersion, createVersionFrom, createVersionHistoryManager } from '../lib/versioning/graph-version'
import { type BuildingGraph } from '../domain/building'

function makeGraph(projectId = 'proj-1'): BuildingGraph {
  return {
    meta: { id: projectId, projectId, name: 'Test', category: 'residential' as const, description: '', createdAt: '', updatedAt: '' },
    site: null,
    levels: [{ id: 'l1', name: 'Ground', number: 0, elevation: 0, floorHeight: 3 }],
    spaces: [{ id: 'sp1', name: 'Living Room', programme: 'living' as const, levelId: 'l1', areaM2: 30, bbox: { minX: 0, minY: 0, maxX: 6, maxY: 5 }, boundary: { vertices: [] }, finishSpec: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: '', floorFinish: '', ceilingFinish: '' }, fixtures: [], notes: '' }],
    walls: [{ id: 'w1', levelId: 'l1', role: 'external' as const, start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, thickness: 0.2, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} }],
    slabs: [{ id: 's1', levelId: 'l1', boundary: { vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }, { x: 0, y: 8 }] }, thickness: 0.15, material: 'concrete', ifcClass: 'IfcSlab', properties: {} }],
    openings: [{ id: 'o1', levelId: 'l1', wallId: 'w1', kind: 'window' as const, offsetRatio: 0.5, width: 1.2, height: 1.5, sillHeight: 0.9, material: 'aluminium', ifcClass: 'IfcWindow', properties: {} }],
    columns: [], beams: [], stairs: [], roof: null,
    structural: null,
    serviceZones: [],
  }
}

describe('graph-version', () => {
  describe('createInitialVersion', () => {
    it('creates v1.0 with initial graph', () => {
      const g = makeGraph()
      const v = createInitialVersion(g, 'Initial', 'my first design', ['draft'])
      expect(v.label).toEqual({ major: 1, minor: 0 })
      expect(v.projectId).toBe('proj-1')
      expect(v.name).toBe('Initial')
      expect(v.tags).toEqual(['draft'])
      expect(v.parentVersionId).toBeNull()
      expect(v.diff).toBeNull()
      expect(v.id).toBeTruthy()
    })
  })

  describe('createVersionFrom', () => {
    it('bumps minor version by default', () => {
      const g = makeGraph()
      const v1 = createInitialVersion(g)
      const g2 = JSON.parse(JSON.stringify(g)) as BuildingGraph
      g2.spaces[0].areaM2 = 35
      const v2 = createVersionFrom(v1, g2, 'Revised')
      expect(v2.label).toEqual({ major: 1, minor: 1 })
      expect(v2.parentVersionId).toBe(v1.id)
      expect(v2.name).toBe('Revised')
      expect(v2.diff).not.toBeNull()
      expect(v2.diff!.gfaDelta).toBe(5)
    })

    it('bumps major version when specified', () => {
      const g = makeGraph()
      const v1 = createInitialVersion(g)
      const v2 = createVersionFrom(v1, g, 'Breaking change', undefined, 'major')
      expect(v2.label).toEqual({ major: 2, minor: 0 })
    })

    it('copies graph as deep copy', () => {
      const g = makeGraph()
      const v1 = createInitialVersion(g)
      const g2 = JSON.parse(JSON.stringify(g)) as BuildingGraph
      g2.walls[0].thickness = 0.3
      const v2 = createVersionFrom(v1, g2)
      expect(v1.graph.walls[0].thickness).toBe(0.2)
      expect(v2.graph.walls[0].thickness).toBe(0.3)
    })
  })

  describe('VersionHistoryManager', () => {
    it('returns current version', () => {
      const g = makeGraph()
      const v1 = createInitialVersion(g)
      const mgr = createVersionHistoryManager('proj-1', [v1])
      expect(mgr.getCurrentVersion()?.id).toBe(v1.id)
    })

    it('adds versions and updates current', () => {
      const g = makeGraph()
      const v1 = createInitialVersion(g)
      const mgr = createVersionHistoryManager('proj-1', [v1])
      const v2 = createVersionFrom(v1, g)
      mgr.addVersion(v2)
      expect(mgr.getCurrentVersion()?.id).toBe(v2.id)
      expect(mgr.history.versions).toHaveLength(2)
    })

    it('retrieves version by id', () => {
      const g = makeGraph()
      const v1 = createInitialVersion(g)
      const mgr = createVersionHistoryManager('proj-1', [v1])
      expect(mgr.getVersion(v1.id)).toBe(v1)
      expect(mgr.getVersion('nonexistent')).toBeUndefined()
    })

    it('setCurrentVersion changes current version id', () => {
      const g = makeGraph()
      const v1 = createInitialVersion(g)
      const v2 = createVersionFrom(v1, g)
      const mgr = createVersionHistoryManager('proj-1', [v1, v2])
      mgr.setCurrentVersion(v1.id)
      expect(mgr.getCurrentVersion()?.id).toBe(v1.id)
      mgr.setCurrentVersion('bad-id')
      expect(mgr.getCurrentVersion()?.id).toBe(v1.id)
    })

    it('filters versions by tag', () => {
      const g = makeGraph()
      const v1 = createInitialVersion(g, 'v1', '', ['draft'])
      const v2 = createVersionFrom(v1, g, 'v2', '', 'minor', ['approved'])
      const mgr = createVersionHistoryManager('proj-1', [v1, v2])
      expect(mgr.getVersionsByTag('approved')).toHaveLength(1)
      expect(mgr.getVersionsByTag('draft')).toHaveLength(1)
      expect(mgr.getVersionsByTag('none')).toHaveLength(0)
    })

    it('getVersionChain returns versions sorted by label', () => {
      const g = makeGraph()
      const v1 = createInitialVersion(g)
      const v2 = createVersionFrom(v1, g, 'v2')
      const g3 = JSON.parse(JSON.stringify(g)) as BuildingGraph
      g3.spaces[0].areaM2 = 40
      const v3 = createVersionFrom(v2, g3, 'v3', '', 'major')
      const mgr = createVersionHistoryManager('proj-1', [v3, v1, v2])
      const chain = mgr.getVersionChain()
      expect(chain[0].label).toEqual({ major: 1, minor: 0 })
      expect(chain[1].label).toEqual({ major: 1, minor: 1 })
      expect(chain[2].label).toEqual({ major: 2, minor: 0 })
    })

    it('getVersionSummary returns formatted string', () => {
      const g = makeGraph()
      const v1 = createInitialVersion(g, 'First cut')
      const mgr = createVersionHistoryManager('proj-1', [v1])
      const summary = mgr.getVersionSummary(v1.id)
      expect(summary).toContain('v1.0')
      expect(summary).toContain('First cut')
    })

    it('getVersionSummary returns not found for bad id', () => {
      const mgr = createVersionHistoryManager('proj-1')
      expect(mgr.getVersionSummary('bad')).toBe('Version not found')
    })
  })
})
