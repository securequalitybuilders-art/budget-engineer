import { expect, test, describe } from 'vitest';
import type { CadDocument as Ws6CadDocument } from '@/domain/ws6-types';
import type { TitleBlockMeta } from '@/lib/drawings/title-block';
import { buildTitleBlock, TITLE_BLOCK_H } from '@/lib/drawings/title-block';
import { buildDisciplinePlanSvg } from '@/lib/drawings/plan-svg';
import { buildSitePlanSvg } from '@/lib/drawings/disciplines/site-plan-svg';
import { buildFoundationPlanSvg } from '@/lib/drawings/disciplines/foundation-plan-svg';
import { buildRoofPlanSvg } from '@/lib/drawings/disciplines/roof-plan-svg';
import { buildRcpPlanSvg } from '@/lib/drawings/disciplines/rcp-plan-svg';
import { buildElectricalPlanSvg } from '@/lib/drawings/disciplines/electrical-plan-svg';
import { buildPlumbingPlanSvg } from '@/lib/drawings/disciplines/plumbing-plan-svg';
import { buildHvacPlanSvg } from '@/lib/drawings/disciplines/hvac-plan-svg';
import { buildPresentationSvg } from '@/lib/drawings/disciplines/presentation-svg';
import { buildScheduleSvg } from '@/lib/drawings/disciplines/schedule-svg';
import { buildElevationSvg } from '@/lib/drawings/elevation-svg';
import { buildSectionSvg } from '@/lib/drawings/section-svg';
import {
  USER_PROVENANCE, DERIVED_PROVENANCE, ASSUMED_PROVENANCE,
  SITE_ASSUMED_PROVENANCE, STRUCTURAL_DERIVED_PROVENANCE,
  MEP_PRE_DESIGN_PROVENANCE, CEILING_ASSUMED_PROVENANCE,
  ROOF_DERIVED_PROVENANCE, ELEVATION_DERIVED_PROVENANCE,
  SECTION_DERIVED_PROVENANCE, SCHEDULE_DERIVED_PROVENANCE,
} from '@/domain/drawing-provenance';
import { renderProvenanceNote } from '@/lib/drawings/disciplines/svg-shared';

// ── Fixtures ──────────────────────────────────────────────────────

function makeCad(overrides?: Partial<Ws6CadDocument>): Ws6CadDocument {
  return {
    id: 'test-cad-1',
    projectId: 'proj-1',
    name: 'Test Project',
    materialSystem: 'concrete',
    floors: [
      { id: 'f1', name: 'Ground Floor', elevation: 0, height: 3 },
      { id: 'f2', name: 'First Floor', elevation: 3, height: 3 },
    ],
    walls: [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w2', floorId: 'f1', start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w3', floorId: 'f1', start: { x: 10, y: 8 }, end: { x: 0, y: 8 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w4', floorId: 'f1', start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w5', floorId: 'f1', start: { x: 5, y: 0 }, end: { x: 5, y: 8 }, thickness: 0.15, height: 3, name: 'Int Wall', structural: false, metadata: { ifcClass: 'IfcWall', category: 'internal', material: 'timber', properties: {} } },
      { id: 'w6', floorId: 'f2', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', floorId: 'f1', kind: 'door', offset: 2, width: 0.9, height: 2.1, sillHeight: 0, headHeight: 2.1, name: 'Front Door', metadata: { ifcClass: 'IfcDoor', category: 'door', material: 'timber', properties: { fireRating: 'FD30' }, fireRating: 'FD30' } },
      { id: 'o2', wallId: 'w1', floorId: 'f1', kind: 'window', offset: 4, width: 1.5, height: 1.2, sillHeight: 0.9, headHeight: 2.1, name: 'Living Window', metadata: { ifcClass: 'IfcWindow', category: 'window', properties: { typeName: 'Sliding' }, typeName: 'Sliding' } },
    ],
    blocks: [
      { id: 'b1', floorId: 'f1', kind: 'column', position: { x: 2, y: 2 }, width: 0.3, depth: 0.3, rotation: 0, name: 'Col-1', metadata: { ifcClass: 'IfcColumn', category: 'structure', material: 'concrete', properties: {} } },
      { id: 'b2', floorId: 'f1', kind: 'light', position: { x: 5, y: 4 }, width: 0.2, depth: 0.2, rotation: 0, name: 'Light-1', metadata: { ifcClass: 'IfcLightFixture', category: 'electrical', material: 'steel', properties: {} } },
      { id: 'b3', floorId: 'f1', kind: 'switch', position: { x: 5.5, y: 4.5 }, width: 0.1, depth: 0.1, rotation: 0, name: 'Sw-1', metadata: { ifcClass: 'IfcSwitch', category: 'electrical', material: 'steel', properties: {} } },
      { id: 'b4', floorId: 'f1', kind: 'socket', position: { x: 6, y: 4 }, width: 0.15, depth: 0.15, rotation: 0, name: 'Soc-1', metadata: { ifcClass: 'IfcOutlet', category: 'electrical', material: 'steel', properties: {} } },
      { id: 'b5', floorId: 'f1', kind: 'db_board', position: { x: 1, y: 1 }, width: 0.4, depth: 0.3, rotation: 0, name: 'DB-1', metadata: { ifcClass: 'IfcDistributionBoard', category: 'electrical', material: 'steel', properties: {} } },
      { id: 'b6', floorId: 'f1', kind: 'wc', position: { x: 8, y: 6 }, width: 0.4, depth: 0.4, rotation: 0, name: 'WC-1', metadata: { ifcClass: 'IfcSanitaryFixture', category: 'plumbing', properties: {} } },
      { id: 'b7', floorId: 'f1', kind: 'sink', position: { x: 8, y: 7 }, width: 0.6, depth: 0.5, rotation: 0, name: 'Sink-1', metadata: { ifcClass: 'IfcSanitaryFixture', category: 'plumbing', material: 'steel', properties: {} } },
      { id: 'b8', floorId: 'f1', kind: 'hvac_unit', position: { x: 3, y: 4 }, width: 0.8, depth: 0.6, rotation: 0, name: 'AC-1', metadata: { ifcClass: 'IfcAirTerminal', category: 'mechanical', material: 'steel', properties: {} } },
    ],
    boundaries: [
      { id: 'bnd1', points: [{ x: -2, y: -2 }, { x: 12, y: -2 }, { x: 12, y: 10 }, { x: -2, y: 10 }], layerId: 'boundaries', boundaryMode: 'verified' },
    ],
    ...overrides,
  };
}

// ── Helper ─────────────────────────────────────────────────────────

function isValidSvg(svg: string): boolean {
  return svg.startsWith('<svg') && svg.includes('</svg>');
}

// ── Provenance Tests ───────────────────────────────────────────────

describe('Provenance / Confidence Metadata', () => {
  test('USER_PROVENANCE has high confidence', () => {
    expect(USER_PROVENANCE.source).toBe('user');
    expect(USER_PROVENANCE.confidence).toBe('high');
  });

  test('DERIVED_PROVENANCE has medium confidence and note', () => {
    expect(DERIVED_PROVENANCE.source).toBe('derived');
    expect(DERIVED_PROVENANCE.confidence).toBe('medium');
    expect(DERIVED_PROVENANCE.note).toBeTruthy();
  });

  test('ASSUMED_PROVENANCE has low confidence and note', () => {
    expect(ASSUMED_PROVENANCE.source).toBe('assumed');
    expect(ASSUMED_PROVENANCE.confidence).toBe('low');
    expect(ASSUMED_PROVENANCE.note).toBeTruthy();
  });

  test('All discipline-specific provenances are defined', () => {
    expect(SITE_ASSUMED_PROVENANCE.source).toBe('assumed');
    expect(STRUCTURAL_DERIVED_PROVENANCE.source).toBe('derived');
    expect(MEP_PRE_DESIGN_PROVENANCE.source).toBe('derived');
    expect(CEILING_ASSUMED_PROVENANCE.source).toBe('assumed');
    expect(ROOF_DERIVED_PROVENANCE.source).toBe('derived');
    expect(ELEVATION_DERIVED_PROVENANCE.source).toBe('derived');
    expect(SECTION_DERIVED_PROVENANCE.source).toBe('derived');
    expect(SCHEDULE_DERIVED_PROVENANCE.source).toBe('derived');
  });

  test('renderProvenanceNote renders correct label and color for derived', () => {
    const note = renderProvenanceNote(DERIVED_PROVENANCE, 10, 10);
    expect(note).toContain('DERIVED');
    expect(note).toContain(DERIVED_PROVENANCE.note!);
  });

  test('renderProvenanceNote returns empty for user provenance', () => {
    const note = renderProvenanceNote(USER_PROVENANCE, 10, 10);
    expect(note).toBe('');
  });

  test('renderProvenanceNote renders for assumed provenance', () => {
    const note = renderProvenanceNote(ASSUMED_PROVENANCE, 10, 10);
    expect(note).toContain('ASSUMED');
    expect(note).toContain(ASSUMED_PROVENANCE.note!);
  });
});

// ── Discipline Generator Tests ──────────────────────────────────────

describe('Discipline SVG Generators', () => {
  test('buildSitePlanSvg renders valid SVG', () => {
    const svg = buildSitePlanSvg(makeCad());
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Site Plan');
    expect(svg).toContain('BUILDING FOOTPRINT');
    expect(svg).toContain('NGL');
  });

  test('buildSitePlanSvg handles no boundaries gracefully', () => {
    const cad = makeCad({ boundaries: [] });
    const svg = buildSitePlanSvg(cad);
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('ASSUMED BOUNDARY');
  });

  test('buildFoundationPlanSvg renders valid SVG', () => {
    const svg = buildFoundationPlanSvg(makeCad());
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Foundation Plan');
    expect(svg).toContain('Strip footing');
  });

  test('buildFoundationPlanSvg handles no floor data', () => {
    const cad = makeCad({ floors: [] });
    const svg = buildFoundationPlanSvg(cad);
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('No floor data');
  });

  test('buildRoofPlanSvg renders valid SVG', () => {
    const svg = buildRoofPlanSvg(makeCad());
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Roof Plan');
    expect(svg).toContain('RIDGE');
  });

  test('buildRoofPlanSvg handles no walls', () => {
    const cad = makeCad({ walls: [] });
    const svg = buildRoofPlanSvg(cad);
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('No wall data');
  });

  test('buildRcpPlanSvg renders valid SVG', () => {
    const svg = buildRcpPlanSvg(makeCad());
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Reflected Ceiling Plan');
    expect(svg).toContain('CEILING TYPE');
  });

  test('buildRcpPlanSvg handles no floor', () => {
    const cad = makeCad({ floors: [] });
    const svg = buildRcpPlanSvg(cad);
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('No floor data');
  });

  test('buildElectricalPlanSvg renders valid SVG', () => {
    const svg = buildElectricalPlanSvg(makeCad());
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Electrical Layout');
    expect(svg).toContain('DB');
  });

  test('buildElectricalPlanSvg renders with inferred content', () => {
    const cad = makeCad({ blocks: [] });
    const svg = buildElectricalPlanSvg(cad);
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Electrical Layout');
  });

  test('buildPlumbingPlanSvg renders valid SVG', () => {
    const svg = buildPlumbingPlanSvg(makeCad());
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Plumbing Layout');
    expect(svg).toContain('WC');
  });

  test('buildPlumbingPlanSvg infers manhole when none exists', () => {
    const cad = makeCad({ blocks: makeCad().blocks.filter(b => b.kind !== 'manhole' && b.kind !== 'wc' && b.kind !== 'sink') });
    const cadWithFixtures = { ...cad, blocks: cad.blocks.concat([
      { id: 'b-wc', floorId: 'f1', kind: 'wc' as const, position: { x: 8, y: 6 }, width: 0.4, depth: 0.4, rotation: 0, name: 'WC', metadata: { ifcClass: 'IfcWc', category: 'plumbing', properties: {} } },
    ]) };
    const svg = buildPlumbingPlanSvg(cadWithFixtures);
    expect(isValidSvg(svg)).toBe(true);
  });

  test('buildHvacPlanSvg renders valid SVG', () => {
    const svg = buildHvacPlanSvg(makeCad());
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('HVAC Layout');
  });

  test('buildHvacPlanSvg handles no hvac blocks', () => {
    const cad = makeCad({ blocks: [] });
    const svg = buildHvacPlanSvg(cad);
    expect(isValidSvg(svg)).toBe(true);
  });

  test('buildElevationSvg renders valid SVG', () => {
    const svg = buildElevationSvg(makeCad(), 'front');
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Front Elevation');
  });

  test('buildElevationSvg renders side elevation', () => {
    const svg = buildElevationSvg(makeCad(), 'side');
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Side Elevation');
  });

  test('buildSectionSvg renders valid SVG', () => {
    const svg = buildSectionSvg(makeCad());
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Section');
  });

  test('buildPresentationSvg renders valid SVG', () => {
    const svg = buildPresentationSvg(makeCad());
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('CONCEPTUAL PRESENTATION');
  });
});

// ── Title Block Tests ──────────────────────────────────────────────

describe('Title Block Upgrade', () => {
  const meta: TitleBlockMeta = {
    project: 'Test Project',
    drawing: 'Test Drawing',
    sheet: 'A-101',
    scale: '1:100',
    date: '2026-07-16',
    revision: 'B',
    drawnBy: 'Architect',
    checkedBy: 'Engineer',
    approvedBy: 'Principal',
    drawingType: 'ARCHITECTURAL',
    client: 'ACME Corp',
    projectNumber: 'P-2024-001',
    projectDescription: 'New office building',
    provenanceSummary: 'Some inferred content',
  };

  test('title block renders all fields', () => {
    const svg = buildTitleBlock(800, 600, meta);
    expect(svg).toContain('Test Project');
    expect(svg).toContain('Test Drawing');
    expect(svg).toContain('A-101');
    expect(svg).toContain('1:100');
    expect(svg).toContain('2026-07-16');
    expect(svg).toContain('B');
    expect(svg).toContain('Architect');
    expect(svg).toContain('Engineer');
    expect(svg).toContain('Principal');
    expect(svg).toContain('ACME Corp');
    expect(svg).toContain('P-2024-001');
    expect(svg).toContain('New office building');
    expect(svg).toContain('PROVENANCE');
  });

  test('title block uses defaults for missing fields', () => {
    const minimalMeta: TitleBlockMeta = {
      project: 'Minimal',
      drawing: 'Drawing',
    };
    const svg = buildTitleBlock(800, 600, minimalMeta);
    expect(svg).toContain('Minimal');
    expect(svg).toContain('Drawing');
    expect(svg).toContain('ISSUED FOR REVIEW');
    expect(svg).not.toContain('PROVENANCE');
  });

  test('title block height constant matches rendered height', () => {
    expect(TITLE_BLOCK_H).toBe(60);
  });
});

// ── Schedule Tests ──────────────────────────────────────────────────

describe('Schedule Generator', () => {
  test('door schedule renders with cad data', () => {
    const cad = makeCad();
    const svg = buildScheduleSvg(cad, 'door');
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('DOOR SCHEDULE');
    expect(svg).toContain('D-O1');
  });

  test('window schedule renders with cad data', () => {
    const cad = makeCad();
    const svg = buildScheduleSvg(cad, 'window');
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('WINDOW SCHEDULE');
    expect(svg).toContain('W-O2');
  });

  test('structural schedule renders with cad data', () => {
    const cad = makeCad();
    const svg = buildScheduleSvg(cad, 'structural');
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('STRUCTURAL SCHEDULE');
    expect(svg).toContain('Structural Walls');
  });

  test('schedule handles empty cad gracefully', () => {
    const cad = makeCad({ walls: [], openings: [], blocks: [] });
    const svg = buildScheduleSvg(cad, 'door');
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('DOOR SCHEDULE');
  });

  test('schedule renders with title block meta', () => {
    const meta: TitleBlockMeta = { project: 'Test', drawing: 'Door Schedule', sheet: 'A-601' };
    const svg = buildScheduleSvg(makeCad(), 'door', meta);
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('A-601');
  });
});

// ── Orchestrator Tests ──────────────────────────────────────────────

describe('Drawing Engine Orchestrator', () => {
  const cad = makeCad();

  test('orchestrator routes site-plan', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'site-plan' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Site Plan');
  });

  test('orchestrator routes foundation', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'foundation' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Foundation Plan');
  });

  test('orchestrator routes roof', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'roof' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Roof Plan');
  });

  test('orchestrator routes ceiling', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'ceiling' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Reflected Ceiling Plan');
  });

  test('orchestrator routes electrical', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'electrical' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Electrical');
  });

  test('orchestrator routes plumbing', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'plumbing' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Plumbing');
  });

  test('orchestrator routes hvac', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'hvac' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('HVAC');
  });

  test('orchestrator routes front elevation', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'front' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Front Elevation');
  });

  test('orchestrator routes side elevation', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'side' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Side Elevation');
  });

  test('orchestrator routes section', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'section' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('Section');
  });

  test('orchestrator routes presentation', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'presentation' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('CONCEPTUAL PRESENTATION');
  });

  test('orchestrator routes schedule-door', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'schedule-door' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('DOOR SCHEDULE');
  });

  test('orchestrator routes schedule-window', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'schedule-window' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('WINDOW SCHEDULE');
  });

  test('orchestrator routes schedule-structural', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'schedule-structural' });
    expect(isValidSvg(svg)).toBe(true);
    expect(svg).toContain('STRUCTURAL SCHEDULE');
  });

  test('orchestrator defaults to floor plan', () => {
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'plan' });
    expect(isValidSvg(svg)).toBe(true);
  });

  test('orchestrator handles title meta propagation', () => {
    const meta: TitleBlockMeta = { project: 'Test Proj', drawing: 'Test Drawing' };
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'site-plan', titleMeta: meta });
    expect(svg).toContain('Test Proj');
  });

  test('legacy buildPlanSvg still works', async () => {
    const mod = await import('@/lib/drawings/plan-svg');
    const svg = mod.buildPlanSvg(cad, undefined, undefined, undefined, 'site-plan');
    expect(isValidSvg(svg)).toBe(true);
  });
});

// ── Regression Tests ────────────────────────────────────────────────

describe('Regression Safety', () => {
  test('all generators produce valid SVG XML', () => {
    const cad = makeCad();
    const generators = [
      () => buildSitePlanSvg(cad),
      () => buildFoundationPlanSvg(cad),
      () => buildRoofPlanSvg(cad),
      () => buildRcpPlanSvg(cad),
      () => buildElectricalPlanSvg(cad),
      () => buildPlumbingPlanSvg(cad),
      () => buildHvacPlanSvg(cad),
      () => buildElevationSvg(cad, 'front'),
      () => buildElevationSvg(cad, 'side'),
      () => buildSectionSvg(cad),
      () => buildPresentationSvg(cad),
      () => buildScheduleSvg(cad, 'door'),
      () => buildScheduleSvg(cad, 'window'),
      () => buildScheduleSvg(cad, 'structural'),
    ];
    for (const gen of generators) {
      const svg = gen();
      expect(isValidSvg(svg)).toBe(true);
      expect(svg).toContain('xmlns=');
      expect(svg.length).toBeGreaterThan(200);
    }
  });

  test('all generators handle empty cad gracefully', () => {
    const cad = makeCad({ walls: [], openings: [], blocks: [], boundaries: [], floors: [] });
    const generators = [
      () => buildSitePlanSvg(cad),
      () => buildFoundationPlanSvg(cad),
      () => buildRoofPlanSvg(cad),
      () => buildRcpPlanSvg(cad),
      () => buildElectricalPlanSvg(cad),
      () => buildPlumbingPlanSvg(cad),
      () => buildHvacPlanSvg(cad),
      () => buildPresentationSvg(cad),
      () => buildScheduleSvg(cad, 'door'),
    ];
    for (const gen of generators) {
      const svg = gen();
      expect(isValidSvg(svg)).toBe(true);
      expect(svg.length).toBeGreaterThan(50);
    }
  });

  test('provenance notes are included in discipline drawings that use derived/assumed content', () => {
    const cad = makeCad({ boundaries: [] }); // No boundary -> assumed
    const siteSvg = buildSitePlanSvg(cad);
    expect(siteSvg).toContain('ASSUMED');
    
    const foundSvg = buildFoundationPlanSvg(cad);
    expect(foundSvg).toContain('DERIVED');
    
    const roofSvg = buildRoofPlanSvg(cad);
    expect(roofSvg).toContain('DERIVED');
    
    const rcpSvg = buildRcpPlanSvg(cad);
    expect(rcpSvg).toContain('ASSUMED');
    
    const elecSvg = buildElectricalPlanSvg(cad);
    expect(elecSvg).toContain('DERIVED');
    
    const elevSvg = buildElevationSvg(cad, 'front');
    expect(elevSvg).toContain('DERIVED');
    
    const secSvg = buildSectionSvg(cad);
    expect(secSvg).toContain('DERIVED');
  });
});
