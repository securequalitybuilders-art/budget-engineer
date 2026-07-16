import type { CalibrationScorecard, ValidationReport } from './validationEngine';
import { calibrateAgainst, generateValidationReport, getKnownWeaknesses } from './validationEngine';

import { computeFullSiteAnalysis, createDefaultSiteContext } from '@/engine/analysis/siteAnalysisEngine';
import type { SiteContext } from '@/domain/site';

import { generateFinishSchedule, finishScheduleToCsv, generateFinishScheduleHtml } from '@/lib/interior/finishScheduleGenerator';
import { generateFFESchedule, ffeScheduleToCsv, generateFFEScheduleHtml } from '@/lib/interior/ffeScheduleGenerator';
import { generateWetAreaElevation, generateKitchenElevation, generateWardrobeElevation } from '@/lib/interior/elevationGenerator';
import type { InteriorProject, InteriorRoom, FixtureInstance, JoineryInstance } from '@/domain/interior';
import { generateDefaultJoineryDefs } from '@/lib/interior/joineryGenerator';

import { computeStructuralPreDesign } from '@/engine/structural/structuralPreDesignEngine';
import type { BuildingGraph } from '@/domain/building';

import { computeMepPreDesign } from '@/engine/mep/mepPreDesignEngine';

import { runExpandedCodeRules, createReviewReport } from '@/engine/review/reviewEngine';
import type { ComplianceInput } from '@/engine/compliance/types';
import type { PlanModel } from '@/domain/plan';
import type { AnalysisResult } from '@/engine/calculators/analysisAssembly';

import { createSheet, reviseSheet, signSheet, createPackage, addToPackage, createDeliveryProject, generateDrawingRegister } from '@/engine/delivery/deliveryWorkflowEngine';

function makeSite(): SiteContext {
  return createDefaultSiteContext('bm-site-1');
}

function makeInteriorProject(): InteriorProject {
  const rooms: InteriorRoom[] = [
    { roomId: 'r1', roomType: 'bathroom', name: 'Master Bath', position: { x: 0, y: 0 }, dimensions: { width: 3, height: 2.5 }, rotation: 0, finishSpec: { wallMaterialId: 'tile-w', floorMaterialId: 'tile-f', ceilingMaterialId: 'paint-c', wallFinish: 'Ceramic Tile', floorFinish: 'Porcelain Tile', ceilingFinish: 'Paint' }, notes: '' },
    { roomId: 'r2', roomType: 'kitchen', name: 'Kitchen', position: { x: 3, y: 0 }, dimensions: { width: 4, height: 3 }, rotation: 0, finishSpec: { wallMaterialId: 'paint-w', floorMaterialId: 'vinyl-f', ceilingMaterialId: 'paint-c', wallFinish: 'Paint', floorFinish: 'Vinyl', ceilingFinish: 'Paint' }, notes: '' },
    { roomId: 'r3', roomType: 'bedroom', name: 'Main Bedroom', position: { x: 0, y: 3 }, dimensions: { width: 4, height: 4 }, rotation: 0, finishSpec: { wallMaterialId: 'paint-w', floorMaterialId: 'carpet-f', ceilingMaterialId: 'paint-c', wallFinish: 'Paint', floorFinish: 'Carpet', ceilingFinish: 'Paint' }, notes: '' },
  ];
  const fixtures: FixtureInstance[] = [
    { instanceId: 'f1', fixtureTypeId: 'wc', position: { x: 0.5, y: 1 }, rotation: 0, roomId: 'r1', flipped: false },
    { instanceId: 'f2', fixtureTypeId: 'basin', position: { x: 2, y: 1.5 }, rotation: 0, roomId: 'r1', flipped: false },
    { instanceId: 'f3', fixtureTypeId: 'shower', position: { x: 0.5, y: 0.5 }, rotation: 0, roomId: 'r1', flipped: false },
  ];
  return {
    id: 'int-proj-bm', projectId: 'bm-interior-1', rooms, fixtures,
    materialAssignments: [], joinery: [], joineryDefs: [], ffeEntries: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

function makeBuildingGraph(): BuildingGraph {
  return {
    meta: { id: 'bg-bm', projectId: 'bm-structural-1', name: 'Benchmark House', category: 'residential', description: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
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
    plan: { id: 'plan-bm', width: 20, height: 15, wallThickness: 0.23, rooms: [], walls: [], openings: [], scaleLabel: '1:100' } as unknown as PlanModel,
    design: { id: 'd1', name: 'Test', grossFloorArea: 150, floors: 2, buildingType: 'house', elements: [] },
    analysis: { egressStatus: 'pass', fireRatingStatus: 'pass' } as unknown as AnalysisResult,
    buildingType: 'residential',
  };
}

export async function runSiteBenchmark(): Promise<CalibrationScorecard> {
  const site = makeSite();
  const output = computeFullSiteAnalysis(site);
  return calibrateAgainst('bm-site-1',
    {
      orientationScore: output.summary.orientationScore,
      diagramCount: output.diagrams.length,
      recommendations: output.summary.recommendations.length,
    },
    { orientationScore: 50, diagramCount: 6, recommendations: 3 },
    { orientationScore: 40, diagramCount: 0, recommendations: 30 },
    'P14 Site Analysis: generates 6 diagrams, orientation score, and recommendations',
  );
}

export async function runInteriorBenchmark(): Promise<CalibrationScorecard> {
  const project = makeInteriorProject();
  const finishSchedule = generateFinishSchedule(project);
  const ffeSchedule = generateFFESchedule(project);
  const wetArea = generateWetAreaElevation(project, 'r1');
  const kitchen = generateKitchenElevation(project, 'r2');
  const defs = generateDefaultJoineryDefs();
  const wardrobeProj = { ...project, joinery: [{ instanceId: 'ji1', joineryDefId: 'wardrobe-2dr', roomId: 'r3', wallIndex: 0, position: { x: 0, y: 0 }, width: 1800, height: 2400, notes: '' }] as JoineryInstance[], joineryDefs: [defs[0]] };
  const wardrobe = generateWardrobeElevation(wardrobeProj, 'r3');
  return calibrateAgainst('bm-interior-1',
    {
      finishScheduleEntries: finishSchedule.length,
      ffeEntries: ffeSchedule.length,
      wetAreaElevation: wetArea !== null ? 1 : 0,
      kitchenElevation: kitchen !== null ? 1 : 0,
      wardrobeElevation: wardrobe !== null ? 1 : 0,
    },
    { finishScheduleEntries: 3, ffeEntries: 3, wetAreaElevation: 1, kitchenElevation: 1, wardrobeElevation: 1 },
    { finishScheduleEntries: 0, ffeEntries: 20, wetAreaElevation: 0, kitchenElevation: 0, wardrobeElevation: 0 },
    'P15 Interior: generates schedules, elevations for wet rooms, kitchens, and wardrobes',
  );
}

export async function runStructuralBenchmark(): Promise<CalibrationScorecard> {
  const graph = makeBuildingGraph();
  const output = computeStructuralPreDesign(graph);
  return calibrateAgainst('bm-structural-1',
    {
      slabThicknessMm: output.slabSystem.thicknessMm,
      beamCount: output.beams.length,
      columnCount: output.columns.length,
      footingCount: output.footings.length,
      concreteM3: output.boq.concreteM3,
    },
    { slabThicknessMm: 180, beamCount: 4, columnCount: 4, footingCount: 4, concreteM3: 5 },
    { slabThicknessMm: 20, beamCount: 50, columnCount: 50, footingCount: 50, concreteM3: 50 },
    'P16 Structural: sizes slab, beams, columns, footings and computes BOQ quantities',
  );
}

export async function runMepBenchmark(): Promise<CalibrationScorecard> {
  const graph = makeBuildingGraph();
  const output = computeMepPreDesign(graph);
  return calibrateAgainst('bm-mep-1',
    {
      plumbingFixtures: output.plumbing.fixtures.length,
      plumbingStacks: output.plumbing.stacks.length,
      electricalPoints: output.electrical.points.length,
      hvacUnits: output.hvac.units.length,
      fixtureTypes: Object.keys(output.boq.fixtureCounts).length,
    },
    { plumbingFixtures: 5, plumbingStacks: 1, electricalPoints: 15, hvacUnits: 3, fixtureTypes: 3 },
    { plumbingFixtures: 30, plumbingStacks: 80, electricalPoints: 30, hvacUnits: 50, fixtureTypes: 30 },
    'P17 MEP: distributes plumbing fixtures, electrical points, and HVAC across rooms',
  );
}

export async function runReviewBenchmark(): Promise<CalibrationScorecard> {
  const input = makeComplianceInput();
  const issues = runExpandedCodeRules(input, 'test');
  const report = createReviewReport('bm-review-1', 'test', issues, 'benchmark-runner', 'Benchmark run');
  return calibrateAgainst('bm-review-1',
    {
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      majorIssues: issues.filter(i => i.severity === 'major').length,
      score: report.summary.score,
    },
    { totalIssues: 5, criticalIssues: 1, majorIssues: 2, score: 70 },
    { totalIssues: 40, criticalIssues: 50, majorIssues: 50, score: 20 },
    'P18 Review: detects code issues across 10 rule packs and produces a scored report',
  );
}

export async function runDeliveryBenchmark(): Promise<CalibrationScorecard> {
  const sheets = [
    createSheet('A-01', 'Ground Floor Plan', 'Architecture', 'benchmark'),
    createSheet('A-02', 'First Floor Plan', 'Architecture', 'benchmark'),
  ];
  const revised = reviseSheet(sheets[0], 'Revised dimensions', 'benchmark');
  createDeliveryProject('bm-delivery-1', 'BM-001', 'Benchmark Client', '123 Test Street');
  const pkg = createPackage('bm-delivery-1', 'Tender Package', 'tender', 'benchmark');
  const pkgWithContent = addToPackage(pkg, { type: 'sheet', id: 'A-01', name: 'Ground Floor Plan', ref: revised.currentRevision });
  return calibrateAgainst('bm-delivery-1',
    {
      sheetCount: sheets.length,
      revisionCount: revised.revisions.length - 1,
      packageContentCount: pkgWithContent.contents.length,
    },
    { sheetCount: 2, revisionCount: 1, packageContentCount: 1 },
    { sheetCount: 0, revisionCount: 0, packageContentCount: 0 },
    'P20 Delivery: creates sheets, tracks revisions, manages package workflow',
  );
}

export async function runSiteTerrainBenchmark(): Promise<CalibrationScorecard> {
  const site = createDefaultSiteContext('bm-site-terrain');
  const steepSite = { ...site, terrain: 'steep' as const };
  const output = computeFullSiteAnalysis(steepSite);
  return calibrateAgainst('bm-site-terrain',
    { terrainChallenge: output.summary.terrainChallenge === 'significant' ? 1 : 0 },
    { terrainChallenge: 1 },
    { terrainChallenge: 0 },
    'P14 Site: steep terrain correctly identified as significant challenge',
  );
}

export async function runSiteAdjacentBenchmark(): Promise<CalibrationScorecard> {
  const site = createDefaultSiteContext('bm-site-adjacent');
  const siteWithBldgs = {
    ...site,
    adjacentBuildings: [{ id: 'b1', vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }, { x: 0, y: 8 }], height: 6, name: 'Block A' }],
  };
  const output = computeFullSiteAnalysis(siteWithBldgs);
  return calibrateAgainst('bm-site-adjacent',
    { adjacentImpact: output.summary.adjacentBuildingImpact, diagramCount: output.diagrams.length },
    { adjacentImpact: 1, diagramCount: 6 },
    { adjacentImpact: 0, diagramCount: 0 },
    'P14 Site: adjacent buildings impact computed, all 6 diagrams generated',
  );
}

export async function runInteriorWardrobeBenchmark(): Promise<CalibrationScorecard> {
  const project = makeInteriorProject();
  const defs = generateDefaultJoineryDefs();
  const proj = {
    ...project,
    joinery: [{ instanceId: 'ji1', joineryDefId: 'wardrobe-2dr', roomId: 'r3', wallIndex: 0, position: { x: 0, y: 0 }, width: 1800, height: 2400, notes: '' }] as JoineryInstance[],
    joineryDefs: [defs[0]],
  };
  const elevation = generateWardrobeElevation(proj, 'r3');
  return calibrateAgainst('bm-interior-wardrobe',
    { wardrobeElevation: elevation !== null ? 1 : 0, wardrobeCount: elevation?.wardrobes.length ?? 0, hasDoorStyle: elevation && elevation.wardrobes[0]?.doorStyle ? 1 : 0 },
    { wardrobeElevation: 1, wardrobeCount: 1, hasDoorStyle: 1 },
    { wardrobeElevation: 0, wardrobeCount: 0, hasDoorStyle: 0 },
    'P15 Interior: wardrobe elevation generated with door style and dimensions',
  );
}

export async function runInteriorExportBenchmark(): Promise<CalibrationScorecard> {
  const project = makeInteriorProject();
  const schedule = generateFinishSchedule(project);
  const ffe = generateFFESchedule(project);
  const csv = finishScheduleToCsv(schedule);
  const ffeCsv = ffeScheduleToCsv(ffe);
  const html = generateFinishScheduleHtml(schedule);
  const ffeHtml = generateFFEScheduleHtml(ffe);
  return calibrateAgainst('bm-interior-export',
    {
      csvContainsHeader: csv.includes('Room') ? 1 : 0,
      csvContainsRoom: csv.includes('Master Bath') ? 1 : 0,
      ffeCsvContainsHeader: ffeCsv.includes('Item') ? 1 : 0,
      htmlContainsTable: html.includes('<table') ? 1 : 0,
      ffeHtmlContainsTable: ffeHtml.includes('<table') ? 1 : 0,
    },
    { csvContainsHeader: 1, csvContainsRoom: 1, ffeCsvContainsHeader: 1, htmlContainsTable: 1, ffeHtmlContainsTable: 1 },
    { csvContainsHeader: 0, csvContainsRoom: 0, ffeCsvContainsHeader: 0, htmlContainsTable: 0, ffeHtmlContainsTable: 0 },
    'P15 Interior: CSV and HTML export formats are well-formed',
  );
}

export async function runStructuralSlabBenchmark(): Promise<CalibrationScorecard> {
  const graph = makeBuildingGraph();
  const output = computeStructuralPreDesign(graph);
  return calibrateAgainst('bm-structural-slab',
    { thicknessMm: output.slabSystem.thicknessMm, weightKpa: output.slabSystem.weightKpa, spanM: output.slabSystem.spanM },
    { thicknessMm: 180, weightKpa: 4.8, spanM: 5 },
    { thicknessMm: 25, weightKpa: 20, spanM: 30 },
    'P16 Structural: slab thickness, span, and weight within residential range',
  );
}

export async function runStructuralLoadingBenchmark(): Promise<CalibrationScorecard> {
  const graph = makeBuildingGraph();
  const output = computeStructuralPreDesign(graph);
  const allPositive = output.columns.every(c => c.loadEstimateKn > 0) ? 1 : 0;
  const allSized = output.columns.every(c => c.widthMm >= 200 && c.depthMm >= 200) ? 1 : 0;
  return calibrateAgainst('bm-structural-loading',
    { columnsCount: output.columns.length, allLoadsPositive: allPositive, allColumnsSized: allSized },
    { columnsCount: 4, allLoadsPositive: 1, allColumnsSized: 1 },
    { columnsCount: 30, allLoadsPositive: 0, allColumnsSized: 0 },
    'P16 Structural: column loads estimated and sizes are reasonable',
  );
}

export async function runMepDemandBenchmark(): Promise<CalibrationScorecard> {
  const graph = makeBuildingGraph();
  const output = computeMepPreDesign(graph);
  const totalDemand = output.plumbing.zones.reduce((s, z) => s + z.waterDemandLmin, 0);
  return calibrateAgainst('bm-mep-demand',
    { plumbingZones: output.plumbing.zones.length, totalWaterDemandLmin: totalDemand, hasWetCore: output.plumbing.zones.some(z => z.isWetCore) ? 1 : 0 },
    { plumbingZones: 2, totalWaterDemandLmin: 20, hasWetCore: 1 },
    { plumbingZones: 40, totalWaterDemandLmin: 50, hasWetCore: 0 },
    'P17 MEP: water demand computed from fixture types across wet zones',
  );
}

export async function runMepCircuitBenchmark(): Promise<CalibrationScorecard> {
  const graph = makeBuildingGraph();
  const output = computeMepPreDesign(graph);
  const circuitsOk = output.electrical.circuits.every(c => c.estimatedLoadA <= c.breakerA) ? 1 : 0;
  return calibrateAgainst('bm-mep-circuit',
    { circuitCount: output.electrical.circuits.length, allCircuitsSafe: circuitsOk, dbLoadKva: output.electrical.db.totalLoadKva },
    { circuitCount: 4, allCircuitsSafe: 1, dbLoadKva: 1 },
    { circuitCount: 40, allCircuitsSafe: 0, dbLoadKva: 50 },
    'P17 MEP: circuit loads do not exceed breaker ratings, DB sized correctly',
  );
}

export async function runReviewBadBenchmark(): Promise<CalibrationScorecard> {
  const tinyRoom: Record<string, unknown> = { id: 'r-bad', name: 'Tiny Bedroom', x: 0, y: 0, width: 1.5, height: 2 };
  const narrowCorridor: Record<string, unknown> = { id: 'c-bad', name: 'Hallway', x: 0, y: 0, width: 0.5, height: 4 };
  const badStairs: Record<string, unknown> = { id: 'st-bad', rise: 0.25, going: 0.15, width: 0.7 };
  const input = makeComplianceInput();
  input.plan = { id: 'plan-bad', width: 20, height: 15, wallThickness: 0.23, rooms: [tinyRoom, narrowCorridor] as Record<string, unknown>[], walls: [], openings: [], stairs: [badStairs] as Record<string, unknown>[], scaleLabel: '1:100' } as unknown as PlanModel;
  const issues = runExpandedCodeRules(input, 'test');
  const report = createReviewReport('bm-review-bad', 'test', issues, 'benchmark-runner', 'Bad design');
  return calibrateAgainst('bm-review-bad',
    { totalIssues: issues.length, hasCritical: issues.filter(i => i.severity === 'critical').length > 0 ? 1 : 0, decisionIsFail: report.decision === 'fail' || report.decision === 'revise' ? 1 : 0 },
    { totalIssues: 5, hasCritical: 1, decisionIsFail: 1 },
    { totalIssues: 40, hasCritical: 0, decisionIsFail: 0 },
    'P18 Review: undersized rooms, corridors, and stairs trigger critical failures',
  );
}

export async function runReviewGoodBenchmark(): Promise<CalibrationScorecard> {
  const goodRoom: Record<string, unknown> = { id: 'r-good', name: 'Living Room', x: 0, y: 0, width: 5, height: 4 };
  const input = makeComplianceInput();
  input.plan = { id: 'plan-good', width: 20, height: 15, wallThickness: 0.23, rooms: [goodRoom] as Record<string, unknown>[], walls: [], openings: [], scaleLabel: '1:100' } as unknown as PlanModel;
  const issues = runExpandedCodeRules(input, 'test');
  const report = createReviewReport('bm-review-good', 'test', issues, 'benchmark-runner', 'Good design');
  return calibrateAgainst('bm-review-good',
    { totalIssues: issues.length, hasCritical: issues.filter(i => i.severity === 'critical').length > 0 ? 0 : 1, decisionIsPass: report.decision === 'pass' || report.decision === 'conditional-pass' ? 1 : 0 },
    { totalIssues: 0, hasCritical: 1, decisionIsPass: 1 },
    { totalIssues: 30, hasCritical: 0, decisionIsPass: 0 },
    'P18 Review: compliant design passes with no critical issues',
  );
}

export async function runDeliverySignoffBenchmark(): Promise<CalibrationScorecard> {
  let sheet = createSheet('S-01', 'Structural Layout', 'Structural', 'benchmark');
  sheet = reviseSheet(sheet, 'Revised beams', 'benchmark');
  sheet = signSheet(sheet, 'checker', 'Checker A');
  sheet = signSheet(sheet, 'approver', 'Approver B');
  return calibrateAgainst('bm-delivery-signoff',
    { revisionCount: sheet.revisions.length - 1, isChecked: sheet.checkedBy.length > 0 ? 1 : 0, isApproved: sheet.approvedBy.length > 0 ? 1 : 0, currentRevNum: parseInt(sheet.currentRevision.replace('P', ''), 10) || 0 },
    { revisionCount: 1, isChecked: 1, isApproved: 1, currentRevNum: 1 },
    { revisionCount: 0, isChecked: 0, isApproved: 0, currentRevNum: 0 },
    'P20 Delivery: sheet signed by checker and approver with revision tracking',
  );
}

export async function runDeliveryRegisterBenchmark(): Promise<CalibrationScorecard> {
  const sheets = [
    createSheet('A-01', 'Ground Floor', 'Architecture', 'benchmark'),
    createSheet('A-02', 'First Floor', 'Architecture', 'benchmark'),
    createSheet('S-01', 'Structural Layout', 'Structural', 'benchmark'),
  ];
  const register = generateDrawingRegister(sheets);
  return calibrateAgainst('bm-delivery-register',
    { registerCount: register.length, hasSheetNo: register.every(r => r.sheetNumber.length > 0) ? 1 : 0, hasRevision: register.every(r => r.revision.length > 0) ? 1 : 0 },
    { registerCount: 3, hasSheetNo: 1, hasRevision: 1 },
    { registerCount: 0, hasSheetNo: 0, hasRevision: 0 },
    'P20 Delivery: drawing register generated for all sheets with revision tracking',
  );
}

export async function runAllBenchmarks(): Promise<CalibrationScorecard[]> {
  const results = await Promise.all([
    runSiteBenchmark(),
    runSiteTerrainBenchmark(),
    runSiteAdjacentBenchmark(),
    runInteriorBenchmark(),
    runInteriorWardrobeBenchmark(),
    runInteriorExportBenchmark(),
    runStructuralBenchmark(),
    runStructuralSlabBenchmark(),
    runStructuralLoadingBenchmark(),
    runMepBenchmark(),
    runMepDemandBenchmark(),
    runMepCircuitBenchmark(),
    runReviewBenchmark(),
    runReviewBadBenchmark(),
    runReviewGoodBenchmark(),
    runDeliveryBenchmark(),
    runDeliverySignoffBenchmark(),
    runDeliveryRegisterBenchmark(),
  ]);
  return results;
}

export async function runFullValidation(previousScorecards?: CalibrationScorecard[]): Promise<ValidationReport> {
  const scorecards = await runAllBenchmarks();
  const previous = previousScorecards ?? [];
  return generateValidationReport(scorecards, previous, getKnownWeaknesses());
}
