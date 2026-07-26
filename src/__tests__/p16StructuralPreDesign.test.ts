import { describe, it, expect } from 'vitest';
import { computeStructuralPreDesign } from '@/engine/structural/structuralPreDesignEngine';
import type { BuildingGraph } from '@/domain/building';

function makeResidentialGraph(): BuildingGraph {
  return {
    meta: {
      id: 'bg-1', projectId: 'p1', name: 'Test House', category: 'residential', description: '',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    levels: [
      { id: 'l1', name: 'Ground', number: 1, elevation: 0, floorHeight: 3 },
      { id: 'l2', name: 'First', number: 2, elevation: 3, floorHeight: 3 },
    ],
    spaces: [
      { id: 's1', levelId: 'l1', name: 'Living', programme: 'living', boundary: { vertices: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 5 }, { x: 0, y: 5 }] }, bbox: { minX: 0, minY: 0, maxX: 6, maxY: 5 }, areaM2: 30, finishSpec: null as unknown as import('@/domain/interior').FinishSpec, fixtures: [], notes: '' },
      { id: 's2', levelId: 'l1', name: 'Kitchen', programme: 'kitchen', boundary: { vertices: [{ x: 6, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 6, y: 5 }] }, bbox: { minX: 6, minY: 0, maxX: 10, maxY: 5 }, areaM2: 20, finishSpec: null as unknown as import('@/domain/interior').FinishSpec, fixtures: [], notes: '' },
    ],
    walls: [
      { id: 'w1', levelId: 'l1', role: 'external', start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w2', levelId: 'l1', role: 'external', start: { x: 10, y: 0, z: 0 }, end: { x: 10, y: 5, z: 0 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w3', levelId: 'l1', role: 'external', start: { x: 10, y: 5, z: 0 }, end: { x: 0, y: 5, z: 0 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w4', levelId: 'l1', role: 'external', start: { x: 0, y: 5, z: 0 }, end: { x: 0, y: 0, z: 0 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
    ],
    openings: [],
    slabs: [],
    columns: [], beams: [], stairs: [],
    roof: null,
    structural: null,
    serviceZones: [],
    site: null,
  };
}

describe('P16 — Structural Pre-Design System', () => {
  describe('computeStructuralPreDesign', () => {
    it('returns a complete structural pre-design output', () => {
      const graph = makeResidentialGraph();
      const result = computeStructuralPreDesign(graph);
      expect(result.slabSystem).toBeDefined();
      expect(result.beams).toBeDefined();
      expect(result.columns).toBeDefined();
      expect(result.footings).toBeDefined();
      expect(result.schedules).toBeDefined();
      expect(result.drawings).toBeDefined();
      expect(result.boq).toBeDefined();
    });

    it('infers slab system for residential type', () => {
      const graph = makeResidentialGraph();
      const result = computeStructuralPreDesign(graph);
      expect(result.slabSystem.system).toBe('flat-plate');
      expect(result.slabSystem.thicknessMm).toBeGreaterThanOrEqual(150);
      expect(result.slabSystem.assumptionTag).toContain('Pre-design');
    });

    it('generates beam candidates with sizing', () => {
      const graph = makeResidentialGraph();
      const result = computeStructuralPreDesign(graph);
      for (const beam of result.beams) {
        expect(beam.widthMm).toBeGreaterThan(0);
        expect(beam.depthMm).toBeGreaterThan(0);
        expect(beam.spanM).toBeGreaterThan(0);
        expect(beam.assumptionTag).toContain('Pre-design');
      }
    });

    it('generates column candidates with load estimates', () => {
      const graph = makeResidentialGraph();
      const result = computeStructuralPreDesign(graph);
      for (const col of result.columns) {
        expect(col.widthMm).toBeGreaterThan(0);
        expect(col.loadEstimateKn).toBeGreaterThan(0);
        expect(col.assumptionTag).toContain('Pre-design');
      }
    });

    it('generates footing candidates with sizing', () => {
      const graph = makeResidentialGraph();
      const result = computeStructuralPreDesign(graph);
      for (const ftg of result.footings) {
        expect(ftg.widthM).toBeGreaterThan(0);
        expect(ftg.thicknessMm).toBeGreaterThan(0);
        expect(ftg.assumptionTag).toContain('Pre-design');
      }
    });

    it('generates schedule HTML', () => {
      const graph = makeResidentialGraph();
      const result = computeStructuralPreDesign(graph);
      expect(result.schedules.slabSchedule).toContain('<table');
      expect(result.schedules.beamSchedule).toContain('<table');
      expect(result.schedules.columnSchedule).toContain('<table');
      expect(result.schedules.footingSchedule).toContain('<table');
    });

    it('generates drawing SVG', () => {
      const graph = makeResidentialGraph();
      const result = computeStructuralPreDesign(graph);
      expect(result.drawings.foundationSvg).toContain('<svg');
      expect(result.drawings.columnLayoutSvg).toContain('<svg');
      expect(result.drawings.loadPathSvg).toContain('<svg');
    });

    it('computes BOQ quantities', () => {
      const graph = makeResidentialGraph();
      const result = computeStructuralPreDesign(graph);
      expect(result.boq.concreteM3).toBeGreaterThan(0);
      expect(result.boq.reinforcementKg).toBeGreaterThan(0);
      expect(result.boq.formworkM2).toBeGreaterThan(0);
      expect(result.boq.notes.length).toBeGreaterThanOrEqual(2);
    });

    it('includes review-required label', () => {
      const graph = makeResidentialGraph();
      const result = computeStructuralPreDesign(graph);
      expect(result.reviewRequiredLabel).toContain('PRE-DESIGN ONLY');
      expect(result.reviewRequiredLabel).toContain('Review');
    });
  });
});
