import { describe, it, expect } from 'vitest';
import { computeMepPreDesign } from '@/engine/mep/mepPreDesignEngine';
import type { BuildingGraph } from '@/domain/building';

function makeTestGraph(): BuildingGraph {
  return {
    meta: {
      id: 'bg-mep', projectId: 'p1', name: 'MEP Test', category: 'residential', description: '',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    levels: [
      { id: 'l1', name: 'Ground', number: 1, elevation: 0, floorHeight: 3 },
      { id: 'l2', name: 'First', number: 2, elevation: 3, floorHeight: 3 },
    ],
    spaces: [
      { id: 's1', levelId: 'l1', name: 'Living', programme: 'living', boundary: { vertices: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 5 }, { x: 0, y: 5 }] }, bbox: { minX: 0, minY: 0, maxX: 6, maxY: 5 }, areaM2: 30, finishSpec: null as unknown as import('@/domain/interior').FinishSpec, fixtures: [], notes: '' },
      { id: 's2', levelId: 'l1', name: 'Kitchen', programme: 'kitchen', boundary: { vertices: [{ x: 6, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 6, y: 5 }] }, bbox: { minX: 6, minY: 0, maxX: 10, maxY: 5 }, areaM2: 20, finishSpec: null as unknown as import('@/domain/interior').FinishSpec, fixtures: [], notes: '' },
      { id: 's3', levelId: 'l1', name: 'Bathroom', programme: 'bathroom', boundary: { vertices: [{ x: 0, y: 5 }, { x: 3, y: 5 }, { x: 3, y: 8 }, { x: 0, y: 8 }] }, bbox: { minX: 0, minY: 5, maxX: 3, maxY: 8 }, areaM2: 9, finishSpec: null as unknown as import('@/domain/interior').FinishSpec, fixtures: [], notes: '' },
      { id: 's4', levelId: 'l2', name: 'Bedroom', programme: 'bedroom', boundary: { vertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 4 }, { x: 0, y: 4 }] }, bbox: { minX: 0, minY: 0, maxX: 5, maxY: 4 }, areaM2: 20, finishSpec: null as unknown as import('@/domain/interior').FinishSpec, fixtures: [], notes: '' },
      { id: 's5', levelId: 'l2', name: 'Bathroom', programme: 'bathroom', boundary: { vertices: [{ x: 5, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 3 }, { x: 5, y: 3 }] }, bbox: { minX: 5, minY: 0, maxX: 8, maxY: 3 }, areaM2: 9, finishSpec: null as unknown as import('@/domain/interior').FinishSpec, fixtures: [], notes: '' },
    ],
    walls: [],
    openings: [],
    slabs: [],
    columns: [], beams: [], stairs: [],
    roof: null,
    structural: null,
    serviceZones: [],
    site: null,
  };
}

describe('P17 — MEP Pre-Design System', () => {
  describe('computeMepPreDesign', () => {
    it('returns complete MEP pre-design output', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      expect(result.plumbing).toBeDefined();
      expect(result.electrical).toBeDefined();
      expect(result.hvac).toBeDefined();
      expect(result.drawings).toBeDefined();
      expect(result.boq).toBeDefined();
      expect(result.reviewLabel).toContain('PRE-DESIGN ONLY');
    });

    it('generates plumbing fixtures from wet rooms', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      expect(result.plumbing.fixtures.length).toBeGreaterThanOrEqual(4);
      const types = result.plumbing.fixtures.map(f => f.type);
      expect(types).toContain('wc');
      expect(types).toContain('basin');
      expect(types).toContain('sink');
    });

    it('identifies stacked plumbing fixtures', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      const stacked = result.plumbing.fixtures.filter(f => f.stacked);
      expect(stacked.length).toBeGreaterThan(0);
    });

    it('generates plumbing stacks for multi-storey', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      expect(result.plumbing.stacks.length).toBeGreaterThanOrEqual(1);
    });

    it('generates plumbing schedule HTML', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      expect(result.plumbing.scheduleHtml).toContain('<table');
      expect(result.plumbing.scheduleHtml).toContain('wc');
    });

    it('generates electrical points for all rooms', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      expect(result.electrical.points.length).toBeGreaterThanOrEqual(10);
      const types = new Set(result.electrical.points.map(p => p.type));
      expect(types.has('light')).toBe(true);
      expect(types.has('socket')).toBe(true);
      expect(types.has('switch')).toBe(true);
    });

    it('organizes electrical points into circuits', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      expect(result.electrical.circuits.length).toBeGreaterThanOrEqual(3);
      const lighting = result.electrical.circuits.find(c => c.name === 'Lighting');
      expect(lighting).toBeDefined();
      expect(lighting!.breakerA).toBeGreaterThanOrEqual(6);
    });

    it('creates DB starter with load estimate', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      expect(result.electrical.db.totalLoadKva).toBeGreaterThan(0);
      expect(result.electrical.db.mainBreakerA).toBeGreaterThan(0);
      expect(result.electrical.db.spareWays).toBeGreaterThanOrEqual(2);
    });

    it('generates electrical schedule HTML', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      expect(result.electrical.scheduleHtml).toContain('<table');
      expect(result.electrical.scheduleHtml).toContain('Lighting');
    });

    it('generates HVAC units for habitable rooms', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      expect(result.hvac.units.length).toBeGreaterThanOrEqual(3);
      const splitters = result.hvac.units.filter(u => u.type === 'split-unit');
      const extractors = result.hvac.units.filter(u => u.type === 'extract-fan');
      expect(splitters.length).toBeGreaterThanOrEqual(1);
      expect(extractors.length).toBeGreaterThanOrEqual(2);
    });

    it('creates service shafts for multi-storey', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      expect(result.hvac.shafts.length).toBeGreaterThanOrEqual(1);
      expect(result.hvac.shafts[0].services).toContain('plumbing');
      expect(result.hvac.shafts[0].services).toContain('electrical');
    });

    it('generates HVAC schedule HTML', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      expect(result.hvac.scheduleHtml).toContain('<table');
      expect(result.hvac.scheduleHtml).toContain('split-unit');
    });

    it('generates drawing SVGs', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      expect(result.drawings.plumbingSvg).toContain('<svg');
      expect(result.drawings.electricalSvg).toContain('<svg');
      expect(result.drawings.hvacSvg).toContain('<svg');
      expect(result.drawings.shaftCoordinationSvg).toContain('<svg');
    });

    it('computes BOQ quantities', () => {
      const graph = makeTestGraph();
      const result = computeMepPreDesign(graph);
      expect(Object.keys(result.boq.fixtureCounts).length).toBeGreaterThanOrEqual(3);
      expect(Object.keys(result.boq.pointCounts).length).toBeGreaterThanOrEqual(3);
      expect(result.boq.hvacUnits).toBeGreaterThan(0);
      expect(result.boq.estimatedCostCents).toBeGreaterThan(0);
      expect(result.boq.notes.length).toBeGreaterThanOrEqual(3);
    });
  });
});
