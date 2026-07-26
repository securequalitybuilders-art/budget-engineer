import { describe, it, expect } from 'vitest'
import { buildingToStructuralInput, generateStructuralElements, buildingToStructuralGeneration } from '../adapters/canonical/building-to-structural'
import type { BuildingGraph } from '../domain/building'

function sampleGraph(): BuildingGraph {
  return {
    meta: { id: 'p1', projectId: 'p1', name: 'Test', category: 'residential' as const, description: '', createdAt: '', updatedAt: '' },
    site: null,
    levels: [{ id: 'l1', name: 'Ground', number: 0, elevation: 0, floorHeight: 3 }],
    spaces: [{ id: 'sp1', name: 'Area', programme: 'living' as const, levelId: 'l1', areaM2: 80, bbox: { minX: 0, minY: 0, maxX: 10, maxY: 8 }, boundary: { vertices: [] }, finishSpec: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: '', floorFinish: '', ceilingFinish: '' }, fixtures: [], notes: '' }],
    walls: [
      { id: 'w1', levelId: 'l1', role: 'external' as const, start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, thickness: 0.2, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w2', levelId: 'l1', role: 'external' as const, start: { x: 10, y: 0, z: 0 }, end: { x: 10, y: 8, z: 0 }, thickness: 0.2, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w3', levelId: 'l1', role: 'external' as const, start: { x: 10, y: 8, z: 0 }, end: { x: 0, y: 8, z: 0 }, thickness: 0.2, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w4', levelId: 'l1', role: 'external' as const, start: { x: 0, y: 8, z: 0 }, end: { x: 0, y: 0, z: 0 }, thickness: 0.2, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w5', levelId: 'l1', role: 'internal' as const, start: { x: 0, y: 4, z: 0 }, end: { x: 10, y: 4, z: 0 }, thickness: 0.15, height: 3, material: 'gypsum', ifcClass: 'IfcWall', properties: {} },
    ],
    slabs: [],
    openings: [],
    columns: [],
    beams: [],
    stairs: [],
    roof: null,
    structural: null,
    serviceZones: [],
  }
}

describe('building-to-structural', () => {
  describe('buildingToStructuralInput', () => {
    it('converts BuildingGraph walls to SimpleWalls with structural flag', () => {
      const g = sampleGraph()
      const input = buildingToStructuralInput(g)
      expect(input.walls).toHaveLength(5)
      const exteriors = input.walls.filter((w) => w.structural)
      expect(exteriors).toHaveLength(4)
      const interior = input.walls.find((w) => !w.structural)
      expect(interior?.id).toBe('w5')
    })

    it('computes slab area from spaces', () => {
      const g = sampleGraph()
      const input = buildingToStructuralInput(g)
      expect(input.slabAreaM2).toBe(80)
    })

    it('counts floors from levels', () => {
      const g = sampleGraph()
      const input = buildingToStructuralInput(g)
      expect(input.floorCount).toBe(1)
    })

    it('defaults material to concrete', () => {
      const g = sampleGraph()
      const input = buildingToStructuralInput(g)
      expect(input.material).toBe('concrete')
    })

    it('handles graph with no walls', () => {
      const g = sampleGraph()
      g.walls = []
      const input = buildingToStructuralInput(g)
      expect(input.walls).toHaveLength(0)
      expect(input.slabAreaM2).toBe(80)
    })
  })

  describe('generateStructuralElements', () => {
    it('generates columns at structural wall endpoints', () => {
      const g = sampleGraph()
      const input = buildingToStructuralInput(g)
      const result = generateStructuralElements(input)
      expect(result.columns.length).toBeGreaterThanOrEqual(4)
      expect(result.footings.length).toBe(result.columns.length)
    })

    it('generates beam connections between columns', () => {
      const g = sampleGraph()
      const input = buildingToStructuralInput(g)
      const result = generateStructuralElements(input)
      expect(result.beams.length).toBeGreaterThanOrEqual(0)
    })

    it('returns empty arrays when there are no structural walls', () => {
      const g = sampleGraph()
      g.walls = []
      const input = buildingToStructuralInput(g)
      const result = generateStructuralElements(input)
      expect(result.columns).toHaveLength(0)
      expect(result.beams).toHaveLength(0)
      expect(result.footings).toHaveLength(0)
    })
  })

  describe('buildingToStructuralGeneration', () => {
    it('end-to-end: graph to structural result', () => {
      const g = sampleGraph()
      const result = buildingToStructuralGeneration(g)
      expect(result.columns.length).toBeGreaterThanOrEqual(4)
      expect(result.footings.length).toBe(result.columns.length)
      result.columns.forEach((c) => {
        expect(c.material).toBe('concrete')
        expect(typeof c.position.x).toBe('number')
        expect(typeof c.position.y).toBe('number')
      })
    })
  })
})
