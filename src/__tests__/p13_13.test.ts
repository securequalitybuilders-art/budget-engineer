import { describe, test, expect } from 'vitest';
import type { CadDocument } from '../domain/ws6-types';
import type { SheetMeta } from '../lib/drawings/issue-sheet-meta';
import { getTemplate, listTemplates } from '../lib/drawings/sheet-templates';
import { DEFAULT_COORDINATOR } from '../lib/drawings/sheet-coordination';
import { composeSheet, buildPlanSheet, buildElevationSectionSheet, buildScheduleSheet, buildCombinedIssueSheet } from '../lib/drawings/sheet-set-composer';
import { buildCoverSheet, buildDrawingRegisterSheet } from '../lib/drawings/drawing-register-sheet';
import type { CoverSheetContent, DrawingRegisterContent, DrawingRegisterEntry } from '../lib/drawings/package-sheet-meta';
import { buildPackageSequence, assignSheetNumbers } from '../lib/drawings/package-ordering';
import { defaultElevationDatums, defaultSectionDatums, computeDatumTranslation, alignElevationDatums } from '../lib/drawings/shared-datums';

function houseCad(): CadDocument {
  return {
    id: 'p13-13-cad',
    projectId: 'p13-13-proj',
    name: 'P13.13 Test Building',
    materialSystem: 'concrete',
    floors: [
      { id: 'f1', name: 'Ground Floor', elevation: 0, height: 3 },
      { id: 'f2', name: 'First Floor', elevation: 3, height: 3 },
    ],
    walls: [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, height: 3, name: 'Front Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w2', floorId: 'f1', start: { x: 12, y: 0 }, end: { x: 12, y: 10 }, thickness: 0.23, height: 3, name: 'Right Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w3', floorId: 'f1', start: { x: 12, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.23, height: 3, name: 'Rear Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w4', floorId: 'f1', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, thickness: 0.23, height: 3, name: 'Left Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w5', floorId: 'f1', start: { x: 3, y: 0 }, end: { x: 3, y: 10 }, thickness: 0.15, height: 3, name: 'Partition', structural: false, metadata: { ifcClass: 'IfcWall', category: 'internal', material: 'timber', properties: {} } },
      { id: 'w6', floorId: 'f2', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, height: 3, name: 'Front Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w7', floorId: 'f2', start: { x: 12, y: 0 }, end: { x: 12, y: 10 }, thickness: 0.23, height: 3, name: 'Right Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w8', floorId: 'f2', start: { x: 12, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.23, height: 3, name: 'Rear Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w9', floorId: 'f2', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, thickness: 0.23, height: 3, name: 'Left Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', floorId: 'f1', kind: 'door', offset: 2, width: 0.9, height: 2.1, sillHeight: 0, headHeight: 2.1, name: 'Front Door', metadata: { ifcClass: 'IfcDoor', category: 'door', material: 'timber', properties: {}, fireRating: 'FD30' } },
      { id: 'o2', wallId: 'w1', floorId: 'f1', kind: 'window', offset: 5, width: 1.5, height: 1.2, sillHeight: 0.9, headHeight: 2.1, name: 'Living Window', metadata: { ifcClass: 'IfcWindow', category: 'window', properties: {} } },
    ],
    blocks: [],
    roomProgramme: {
      'room-1': 'Living Room',
      'room-2': 'Kitchen',
    },
  };
}

const cad = houseCad();

function makeMeta(overrides: Partial<SheetMeta> & { templateId: string }): SheetMeta {
  return {
    sheetId: 'test-sheet',
    sheetNumber: 'A-101',
    sheetTitle: 'Test Sheet',
    drawingNumber: '01',
    revision: 'A',
    date: '2026-07-19',
    drawnBy: 'P13.13',
    scale: '1:100',
    views: [],
    ...overrides,
  };
}

// ── 1. Shared Datum Alignment ──
describe('P13.13 — Shared Datum Alignment', () => {
  test('defaultElevationDatums returns ground and FFL datums', () => {
    const datums = defaultElevationDatums(0);
    expect(datums.length).toBe(2);
    expect(datums[0].type).toBe('ground');
    expect(datums[0].label).toBe('±0.000');
    expect(datums[1].type).toBe('ffl');
  });

  test('defaultSectionDatums includes ground and per-floor FFL', () => {
    const datums = defaultSectionDatums(0, [3, 3]);
    expect(datums.length).toBe(3);
    expect(datums[0].type).toBe('ground');
    expect(datums[1].type).toBe('ffl');
    expect(datums[1].label).toContain('+3.000');
    expect(datums[2].label).toContain('+6.000');
  });

  test('computeDatumTranslation returns pixel offset', () => {
    const px = computeDatumTranslation(0, 0);
    expect(px).toBe(0);
    const px2 = computeDatumTranslation(0.5, 0);
    expect(px2).toBe(5);
  });

  test('alignElevationDatums returns layout for all slots', () => {
    const datums = defaultElevationDatums(0);
    const slots = [
      { id: 'elevation-front', x: 0, y: 0, width: 100, height: 200, allowedTypes: ['elevation'] },
      { id: 'elevation-rear', x: 100, y: 0, width: 100, height: 200, allowedTypes: ['elevation'] },
    ];
    const aligned = alignElevationDatums(datums, slots);
    expect(aligned.length).toBe(2);
    expect(aligned[0].datumRef).toBe('±0.000');
    expect(aligned[1].datumRef).toBe('±0.000');
  });

  test('elevation sheet supports datum groups in viewport layout', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Datums Test',
      views: [
        { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
        { slotId: 'elevation-rear', viewId: 'rear', label: 'Rear Elevation' },
      ],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toContain('<svg');
    // Multiple elevations aligned via datum group
    expect(result.placedViews.length).toBeGreaterThanOrEqual(2);
  });
});

// ── 2. Issue Package Hierarchy — Cover Sheet ──
describe('P13.13 — Cover Sheet', () => {
  test('buildCoverSheet returns valid SVG', () => {
    const content: CoverSheetContent = {
      projectName: 'Test Building',
      projectNumber: 'P13.13',
      client: 'Test Client',
      architect: 'Budget Engineer Studio',
      issueDate: '2026-07-19',
      issueStage: 'Design Development',
      issueNumber: '01',
      packageTitle: 'Architectural Package',
      packageDescription: 'Full architectural drawing set',
      sheetList: [
        { sheetNumber: 'A-000', title: 'Cover Sheet' },
        { sheetNumber: 'A-101', title: 'Floor Plan' },
        { sheetNumber: 'A-301', title: 'Elevations' },
      ],
      generalNotes: [
        'This package is procedurally generated.',
        'Verify all dimensions on site.',
      ],
      revisionHistory: [
        { revision: 'A', purpose: 'Initial Issue', date: '2026-07-19', description: 'First issue', author: 'Studio' },
      ],
    };
    const svg = buildCoverSheet(content, 'technical');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Test Building');
    expect(svg).toContain('COVER');
    expect(svg).toContain('Architectural Package');
    expect(svg).toContain('Revision History');
    expect(svg).toContain('Floor Plan');
  });

  test('cover sheet includes sheet list', () => {
    const content: CoverSheetContent = {
      projectName: 'Test',
      projectNumber: 'P01',
      issueDate: '2026-07-19',
      issueStage: 'Design',
      issueNumber: '01',
      packageTitle: 'Test Pkg',
      sheetList: [
        { sheetNumber: 'A-101', title: 'Plan' },
        { sheetNumber: 'A-301', title: 'Elevations' },
      ],
      generalNotes: [],
      revisionHistory: [],
    };
    const svg = buildCoverSheet(content, 'technical');
    expect(svg).toContain('A-101');
    expect(svg).toContain('A-301');
  });

  test('cover sheet with package dispatch', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-cover',
      sheetTitle: 'Architectural Package',
      sheetNumber: 'A-000',
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toContain('<svg');
    expect(result.sheetSvg).toContain('P13.13 Test Building');
    expect(result.sheetSvg).toContain('Architectural Package');
  });
});

// ── 3. Drawing Register ──
describe('P13.13 — Drawing Register', () => {
  test('buildDrawingRegisterSheet returns valid SVG', () => {
    const entries: DrawingRegisterEntry[] = [
      { drawingNumber: '00', title: 'Cover Sheet', revision: 'A', scale: 'NTS', status: 'IFR', discipline: 'ARCH', sheetNumber: 'A-000' },
      { drawingNumber: '01', title: 'Floor Plan', revision: 'A', scale: '1:100', status: 'IFR', discipline: 'ARCH', sheetNumber: 'A-101' },
      { drawingNumber: 'E1', title: 'Front Elevation', revision: 'A', scale: '1:100', status: 'IFR', discipline: 'ARCH', sheetNumber: 'A-301' },
    ];
    const content: DrawingRegisterContent = {
      projectName: 'Test Building',
      projectNumber: 'P13.13',
      entries,
      revisionHistory: [],
    };
    const svg = buildDrawingRegisterSheet(content, 'technical');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Drawing Register');
    expect(svg).toContain('Test Building');
    expect(svg).toContain('A-101');
    expect(svg).toContain('Floor Plan');
    expect(svg).toContain('DWG');
  });

  test('drawing register dispatch via composer', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-register',
      sheetTitle: 'Drawing Register',
      sheetNumber: 'REG',
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toContain('<svg');
    expect(result.sheetSvg).toContain('Drawing Register');
    expect(result.sheetSvg).toContain('P13.13 Test Building');
  });
});

// ── 4. Revision / Issue History ──
describe('P13.13 — Revision / Issue History', () => {
  test('cover sheet includes revision history block', () => {
    const content: CoverSheetContent = {
      projectName: 'Test',
      projectNumber: 'P01',
      issueDate: '2026-07-19',
      issueStage: 'Design',
      issueNumber: '01',
      packageTitle: 'Test',
      sheetList: [],
      generalNotes: [],
      revisionHistory: [
        { revision: 'A', purpose: 'Initial Issue', date: '2026-07-19', description: 'First issue', author: 'Studio' },
        { revision: 'B', purpose: 'Revised', date: '2026-08-01', description: 'Updated plans', author: 'Studio' },
      ],
    };
    const svg = buildCoverSheet(content, 'technical');
    expect(svg).toContain('Revision History');
    expect(svg).toContain('REV');
    expect(svg).toContain('PURPOSE');
    expect(svg).toContain('DATE');
    expect(svg).toContain('Initial Issue');
    expect(svg).toContain('Updated plans');
  });
});

// ── 5. Sheet Sequencing & Numbering ──
describe('P13.13 — Sheet Sequencing & Numbering', () => {
  test('assignSheetNumbers produces ordered sheet numbers', () => {
    const sheets = [
      { group: 'cover', title: 'Cover Sheet' },
      { group: 'register', title: 'Drawing Register' },
      { group: 'plan', title: 'Floor Plan' },
      { group: 'elevation-section', title: 'Elevations' },
      { group: 'schedule', title: 'Schedules' },
    ];
    const result = assignSheetNumbers(sheets, 'architectural');
    expect(result.length).toBe(5);
    expect(result[0].sheetNumber).toContain('A-');
    // Check ordering
    expect(result[0].group).toBe('cover');
    expect(result[1].group).toBe('register');
    expect(result[2].group).toBe('plan');
  });

  test('buildPackageSequence respects group order', () => {
    const seq = buildPackageSequence('architectural', [
      { group: 'plan', title: 'Floor Plan' },
      { group: 'cover', title: 'Cover' },
      { group: 'schedule', title: 'Schedules' },
      { group: 'elevation-section', title: 'Elevations' },
    ]);
    expect(seq.sheets.length).toBe(4);
    expect(seq.sheets[0].group).toBe('cover');
    expect(seq.sheets[1].group).toBe('plan');
    expect(seq.sheets[2].group).toBe('elevation-section');
    expect(seq.sheets[3].group).toBe('schedule');
  });

  test('assignSheetNumbers handles structural prefix', () => {
    const sheets = [
      { group: 'plan', title: 'Structural Plan' },
    ];
    const result = assignSheetNumbers(sheets, 'structural');
    expect(result[0].sheetNumber).toMatch(/^S-/);
  });
});

// ── 6. Schedule Integration ──
describe('P13.13 — Schedule Integration', () => {
  test('schedule sheet renders valid SVG', () => {
    const meta = makeMeta({
      templateId: 'a2-portrait-schedule',
      sheetTitle: 'Door & Window Schedules',
      views: [
        { slotId: 'schedule-door', viewId: 'schedule-door', label: 'Door Schedule' },
        { slotId: 'schedule-window', viewId: 'schedule-window', label: 'Window Schedule' },
      ],
    });
    const result = buildScheduleSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('<svg');
    expect(result.sheetSvg).toContain('Door & Window Schedules');
  });

  test('combined issue sheet includes schedule slot', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-combined-issue',
      sheetTitle: 'Combined Issue',
      views: [
        { slotId: 'plan-main', viewId: 'plan', label: 'Plan' },
        { slotId: 'schedule-excerpt', viewId: 'schedule-door', label: 'Door Schedule' },
      ],
    });
    const result = buildCombinedIssueSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('<svg');
    expect(result.placedViews.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 7. Cross-View References ──
describe('P13.13 — Cross-View References', () => {
  test('composed sheet includes cross-view references block', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Elevations with References',
      views: [
        { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
        { slotId: 'elevation-rear', viewId: 'rear', label: 'Rear Elevation' },
      ],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toContain('Sheet References');
    expect(result.sheetSvg).toContain('A-301');
  });

  test('coordinator returns schedule context by package', () => {
    const archSchedules = DEFAULT_COORDINATOR.getScheduleContext('architectural');
    expect(archSchedules.length).toBeGreaterThanOrEqual(2);
    const structSchedules = DEFAULT_COORDINATOR.getScheduleContext('structural');
    expect(structSchedules.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 8. Package-Level Export Coherence ──
describe('P13.13 — Package Export Coherence', () => {
  test('no clipping in composed elevation sheet', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Elevations',
      views: [
        { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
        { slotId: 'elevation-rear', viewId: 'rear', label: 'Rear Elevation' },
      ],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    for (const pv of result.placedViews) {
      expect(pv.ox).toBeGreaterThanOrEqual(0);
      expect(pv.oy).toBeGreaterThanOrEqual(0);
      expect(pv.scale).toBeGreaterThan(0);
    }
  });

  test('title block metadata consistent across package', () => {
    const metaPlan = makeMeta({
      templateId: 'a2-landscape-plan',
      sheetTitle: 'Floor Plan',
      sheetNumber: 'A-101',
      revision: 'A',
      date: '2026-07-19',
      views: [{ slotId: 'plan-main', viewId: 'plan', label: 'Plan' }],
    });
    const metaElev = makeMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Elevations',
      sheetNumber: 'A-301',
      revision: 'A',
      date: '2026-07-19',
      views: [{ slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' }],
    });
    const r1 = composeSheet({ cad, sheetMeta: metaPlan, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    const r2 = composeSheet({ cad, sheetMeta: metaElev, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    // Both share same project name and revision
    expect(r1.sheetSvg).toContain('P13.13 Test Building');
    expect(r2.sheetSvg).toContain('P13.13 Test Building');
    expect(r1.sheetSvg).toContain('Rev A');
    expect(r2.sheetSvg).toContain('Rev A');
  });
});

// ── 9. Coordination ──
describe('P13.13 — Coordination', () => {
  test('coordinator provides schedule refs', () => {
    const refs = DEFAULT_COORDINATOR.getScheduleRefs();
    expect(refs.length).toBeGreaterThanOrEqual(3);
    expect(refs.some(r => r.viewType === 'schedule')).toBe(true);
  });

  test('coordinator provides package refs', () => {
    const refs = DEFAULT_COORDINATOR.getPackageRefs('architectural');
    expect(refs.length).toBeGreaterThanOrEqual(10);
  });
});

// ── 10. Regression ──
describe('P13.13 — Regression', () => {
  test('listTemplates includes cover and register templates', () => {
    const templates = listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(9);
    expect(getTemplate('a2-landscape-cover')).toBeDefined();
    expect(getTemplate('a2-landscape-register')).toBeDefined();
  });

  test('existing plan sheet still works', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-plan',
      sheetTitle: 'Regression Plan',
      views: [{ slotId: 'plan-main', viewId: 'plan', label: 'Plan' }],
    });
    const result = buildPlanSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('<svg');
    expect(result.sheetSvg).toContain('Regression Plan');
  });

  test('existing elevation section sheet still works', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Regression Elev/Sec',
      views: [
        { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
        { slotId: 'elevation-rear', viewId: 'rear', label: 'Rear Elevation' },
      ],
    });
    const result = buildElevationSectionSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('<svg');
  });

  test('existing combined issue sheet still works', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-combined-issue',
      sheetTitle: 'Regression Combined',
      views: [
        { slotId: 'plan-main', viewId: 'plan', label: 'Plan' },
        { slotId: 'elevation-main', viewId: 'front', label: 'Front Elevation' },
        { slotId: 'section-main', viewId: 'section', label: 'Section' },
      ],
    });
    const result = buildCombinedIssueSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('<svg');
    expect(result.placedViews.length).toBeGreaterThanOrEqual(2);
  });

  test('existing schedule sheet still works', () => {
    const meta = makeMeta({
      templateId: 'a2-portrait-schedule',
      sheetTitle: 'Regression Schedule',
      views: [
        { slotId: 'schedule-door', viewId: 'schedule-door', label: 'Door Schedule' },
      ],
    });
    const result = buildScheduleSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('<svg');
  });
});
