import { describe, it, expect } from 'vitest';
import type { BuildingGraph } from '@/domain/building';
import type { InteriorProject } from '@/domain/interior';

import { computeStructuralPreDesign } from '@/engine/structural/structuralPreDesignEngine';
import { computeMepPreDesign } from '@/engine/mep/mepPreDesignEngine';
import { buildStructuralMepBoq } from '@/adapters/integration/structuralMepToBoq';
import { runExpandedCodeRules, createReviewReport } from '@/engine/review/reviewEngine';
import type { ComplianceInput } from '@/engine/compliance/types';
import type { PlanModel } from '@/domain/plan';
import type { AnalysisResult } from '@/engine/calculators/analysisAssembly';
import { applyReviewToDelivery, suggestPackageTypeForReview } from '@/engine/integration/reviewDeliveryIntegration';
import { createSheet, createPackage, createDeliveryProject, addToPackage, generateDrawingRegister } from '@/engine/delivery/deliveryWorkflowEngine';

function makeTestGraph(): BuildingGraph {
  return {
    meta: { id: 'e2e-bg', projectId: 'e2e-proj', name: 'E2E Test House', category: 'residential', description: 'Full pipeline smoke test', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    levels: [
      { id: 'l1', name: 'Ground', number: 1, elevation: 0, floorHeight: 3 },
      { id: 'l2', name: 'First', number: 2, elevation: 3, floorHeight: 3 },
    ],
    spaces: [
      { id: 's1', levelId: 'l1', name: 'Living', programme: 'living', boundary: { vertices: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 5 }, { x: 0, y: 5 }] }, bbox: { minX: 0, minY: 0, maxX: 6, maxY: 5 }, areaM2: 30, finishSpec: null as unknown as InteriorProject['rooms'][0]['finishSpec'], fixtures: [], notes: '' },
      { id: 's2', levelId: 'l1', name: 'Kitchen', programme: 'kitchen', boundary: { vertices: [{ x: 6, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 6, y: 5 }] }, bbox: { minX: 6, minY: 0, maxX: 10, maxY: 5 }, areaM2: 20, finishSpec: null as unknown as InteriorProject['rooms'][0]['finishSpec'], fixtures: [], notes: '' },
      { id: 's3', levelId: 'l1', name: 'Bathroom', programme: 'bathroom', boundary: { vertices: [{ x: 0, y: 5 }, { x: 3, y: 5 }, { x: 3, y: 8 }, { x: 0, y: 8 }] }, bbox: { minX: 0, minY: 5, maxX: 3, maxY: 8 }, areaM2: 9, finishSpec: null as unknown as InteriorProject['rooms'][0]['finishSpec'], fixtures: [], notes: '' },
      { id: 's4', levelId: 'l2', name: 'Bedroom', programme: 'bedroom', boundary: { vertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 4 }, { x: 0, y: 4 }] }, bbox: { minX: 0, minY: 0, maxX: 5, maxY: 4 }, areaM2: 20, finishSpec: null as unknown as InteriorProject['rooms'][0]['finishSpec'], fixtures: [], notes: '' },
      { id: 's5', levelId: 'l2', name: 'Bathroom', programme: 'bathroom', boundary: { vertices: [{ x: 5, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 3 }, { x: 5, y: 3 }] }, bbox: { minX: 5, minY: 0, maxX: 8, maxY: 3 }, areaM2: 9, finishSpec: null as unknown as InteriorProject['rooms'][0]['finishSpec'], fixtures: [], notes: '' },
    ],
    walls: [
      { id: 'w1', levelId: 'l1', role: 'external', start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w2', levelId: 'l1', role: 'external', start: { x: 10, y: 0, z: 0 }, end: { x: 10, y: 8, z: 0 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w3', levelId: 'l1', role: 'external', start: { x: 10, y: 8, z: 0 }, end: { x: 0, y: 8, z: 0 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w4', levelId: 'l1', role: 'external', start: { x: 0, y: 8, z: 0 }, end: { x: 0, y: 0, z: 0 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
    ],
    openings: [], slabs: [], columns: [], beams: [], stairs: [],
    roof: null, structural: null, serviceZones: [], site: null,
  };
}

function makeComplianceInput(): ComplianceInput {
  return {
    plan: { id: 'e2e-plan', width: 20, height: 15, wallThickness: 0.23, rooms: [], walls: [], openings: [], scaleLabel: '1:100' } as unknown as PlanModel,
    design: { id: 'e2e-design', name: 'E2E House', grossFloorArea: 150, floors: 2, buildingType: 'house', elements: [] },
    analysis: { egressStatus: 'pass', fireRatingStatus: 'pass' } as unknown as AnalysisResult,
    buildingType: 'residential',
  };
}

describe('P21 — End-to-End Pipeline Smoke Test', () => {
  it('1. BuildingGraph → Structural + MEP engines produce valid outputs', () => {
    const graph = makeTestGraph();
    const structural = computeStructuralPreDesign(graph);
    const mep = computeMepPreDesign(graph);

    expect(structural.slabSystem.thicknessMm).toBeGreaterThan(100);
    expect(structural.beams.length).toBeGreaterThanOrEqual(0);
    expect(structural.columns.length).toBeGreaterThan(0);
    expect(structural.footings.length).toBeGreaterThan(0);
    expect(structural.boq.concreteM3).toBeGreaterThan(0);

    expect(mep.plumbing.fixtures.length).toBeGreaterThanOrEqual(4);
    expect(mep.electrical.points.length).toBeGreaterThan(10);
    expect(mep.hvac.units.length).toBeGreaterThanOrEqual(1);
    expect(mep.boq.fixtureCounts).not.toBeNull();
  });

  it('2. Structural + MEP outputs → BOQ adapter produces priced BOQ', () => {
    const graph = makeTestGraph();
    const structural = computeStructuralPreDesign(graph);
    const mep = computeMepPreDesign(graph);

    const boq = buildStructuralMepBoq(structural, mep, 'zimbabwe', 'e2e-proj');
    expect(boq.projectId).toBe('e2e-proj');
    expect(boq.currency).toBe('USD');
    expect(boq.items.length).toBeGreaterThan(10);
    expect(boq.summary.subtotal).toBeGreaterThan(0);
    expect(boq.summary.grandTotal).toBeGreaterThan(boq.summary.subtotal);
    expect(boq.estimateDepth).toBe('detailed');

    const structItems = boq.items.filter(i => i.quantityRef.startsWith('structural-'));
    expect(structItems.length).toBeGreaterThan(0);
    const mepItems = boq.items.filter(i => i.quantityRef.startsWith('mep-'));
    expect(mepItems.length).toBeGreaterThan(0);
  });

  it('3. Review engine detects issues and produces scored report', () => {
    const input = makeComplianceInput();
    const issues = runExpandedCodeRules(input, 'test');
    const report = createReviewReport('e2e-review', 'test', issues, 'E2E Runner', 'Pipeline smoke test');

    expect(issues.length).toBeGreaterThanOrEqual(3);
    expect(report.summary.totalIssues).toBe(issues.length);
    expect(report.summary.score).toBeGreaterThanOrEqual(0);
    expect(report.summary.score).toBeLessThanOrEqual(100);
    expect(['pass', 'conditional-pass', 'revise', 'fail']).toContain(report.decision);
  });

  it('4. Review decision → Delivery integration maps state correctly', () => {
    const input = makeComplianceInput();
    const issues = runExpandedCodeRules(input, 'test');
    const report = createReviewReport('e2e-review-2', 'test', issues, 'E2E Runner', 'Pipeline smoke test');

    const delivery = createDeliveryProject('e2e-proj', 'E2E-001', 'Test Client', '123 Test St');
    const sheets = [
      createSheet('A-01', 'Ground Floor', 'Architecture', 'E2E'),
      createSheet('A-02', 'First Floor', 'Architecture', 'E2E'),
    ];
    delivery.sheets = sheets;
    const pkg = createPackage('e2e-proj', 'Tender Package', 'tender', 'E2E');
    const pkgWithContent = addToPackage(pkg, { type: 'sheet', id: 'A-01', name: 'Ground Floor', ref: 'P01' });
    delivery.packages = [pkgWithContent];

    const result = applyReviewToDelivery(report, delivery);
    expect(result.packageNotes.length).toBeGreaterThan(0);
    expect(result.delivery.currentIssueState).toBeDefined();

    const suggested = suggestPackageTypeForReview(report);
    expect(['issue-for-review', 'issue-for-construction']).toContain(suggested);
  });

  it('5. Full pipeline: Graph → Structural/MEP → BOQ → Review → Delivery', () => {
    const graph = makeTestGraph();

    const structural = computeStructuralPreDesign(graph);
    const mep = computeMepPreDesign(graph);
    const boq = buildStructuralMepBoq(structural, mep, 'zimbabwe', 'e2e-proj');

    const input = makeComplianceInput();
    const issues = runExpandedCodeRules(input, 'test');
    const report = createReviewReport('e2e-review-3', 'test', issues, 'E2E Runner', 'Full pipeline');

    const delivery = createDeliveryProject('e2e-proj', 'E2E-001', 'Test Client', '123 Test St');
    delivery.sheets = [
      createSheet('A-01', 'Ground Floor', 'Architecture', 'E2E'),
      createSheet('A-02', 'First Floor', 'Architecture', 'E2E'),
    ];
    const pkg = createPackage('e2e-proj', 'Main Package', 'tender', 'E2E');
    delivery.packages = [addToPackage(pkg, { type: 'sheet', id: 'A-01', name: 'Ground Floor', ref: 'P01' })];

    const result = applyReviewToDelivery(report, delivery);

    expect(boq.items.length).toBeGreaterThan(10);
    expect(boq.summary.grandTotal).toBeGreaterThan(0);

    expect(issues.length).toBeGreaterThanOrEqual(3);
    expect(report.summary.score).toBeGreaterThan(0);

    expect(result.packageNotes.length).toBeGreaterThan(0);
    expect(result.delivery.sheets.length).toBe(2);
    expect(result.delivery.packages.length).toBe(1);

    const register = generateDrawingRegister(result.delivery.sheets);
    expect(register.length).toBe(2);
    expect(register[0].sheetNumber).toBe('A-01');
    expect(register[0].revision).toBeDefined();
  });

  it('6. Pipeline produces deterministic outputs across repeated runs', () => {
    const graph = makeTestGraph();
    runAllRuns(graph);
    const results = Array.from({ length: 3 }, () => runAllRuns(graph));
    for (const r of results) {
      expect(r.structuralBeams).toBe(results[0].structuralBeams);
      expect(r.mepFixtures).toBe(results[0].mepFixtures);
      expect(r.boqItems).toBe(results[0].boqItems);
    }

    function runAllRuns(g: BuildingGraph) {
      const s = computeStructuralPreDesign(g);
      const m = computeMepPreDesign(g);
      const b = buildStructuralMepBoq(s, m, 'zimbabwe', 'e2e-proj');
      return {
        structuralBeams: s.beams.length,
        structuralColumns: s.columns.length,
        mepFixtures: m.plumbing.fixtures.length,
        mepPoints: m.electrical.points.length,
        boqItems: b.items.length,
      };
    }
  });

  it('7. BOQ line items have valid unit, rate, and total', () => {
    const graph = makeTestGraph();
    const structural = computeStructuralPreDesign(graph);
    const mep = computeMepPreDesign(graph);
    const boq = buildStructuralMepBoq(structural, mep, 'kenya', 'e2e-proj');

    expect(boq.currency).toBe('KES');
    for (const item of boq.items) {
      expect(item.unit.length).toBeGreaterThan(0);
      expect(item.rate).toBeGreaterThan(0);
      const expected = item.quantity * item.rate;
      const diffPct = expected > 0 ? Math.abs(item.total - expected) / expected * 100 : 0;
      expect(diffPct).toBeLessThanOrEqual(2);
      expect(item.category).toBeDefined();
    }
  });

  it('8. Review + Delivery produces valid transmittal summary', () => {
    const input = makeComplianceInput();
    const issues = runExpandedCodeRules(input, 'test');
    const report = createReviewReport('e2e-review-4', 'test', issues, 'E2E Runner', 'Transmittal test');

    const delivery = createDeliveryProject('e2e-proj', 'E2E-001', 'Test Client', '123 Test St');
    const pkg = createPackage('e2e-proj', 'Review Package', 'tender', 'E2E');
    delivery.packages = [pkg];

    const result = applyReviewToDelivery(report, delivery);
    expect(result.delivery.packages.length).toBe(1);

    if (result.updatedPackage) {
      expect(result.updatedPackage.id).toBeDefined();
    }
  });
});
