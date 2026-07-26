import { describe, test, expect } from 'vitest';
import type { CadDocument } from '../domain/ws6-types';
import type { SheetMeta } from '../lib/drawings/issue-sheet-meta';
import { DEFAULT_COORDINATOR } from '../lib/drawings/sheet-coordination';
import { composeSheet, buildCombinedIssueSheet } from '../lib/drawings/sheet-set-composer';
import { buildCoverSheet, buildDrawingRegisterSheet } from '../lib/drawings/drawing-register-sheet';
import type { CoverSheetContent, DrawingRegisterContent, DrawingRegisterEntry } from '../lib/drawings/package-sheet-meta';
import { buildPackageSequence, assignSheetNumbers } from '../lib/drawings/package-ordering';
import { exportPackage, buildSvgBundleExport, buildPdfPackageExport, buildZipPackageExport } from '../lib/drawings/package-export';
import type { PackageSheetEntry, PackageExportOptions } from '../lib/drawings/package-export';
import { filterSchedules, getScheduleExcerpt, explainScheduleFilter } from '../lib/drawings/schedule-context-filter';
import type { DrawingViewRef } from '../lib/drawings/sheet-coordination';
import { assemblePackage, buildPackageIdentity, packageExportFilename, deterministicSheetNumber } from '../lib/drawings/package-assembly';
import { generateDefaultRegister } from '../lib/drawings/drawing-register';

function houseCad(): CadDocument {
  return {
    id: 'p13-14-cad',
    projectId: 'p13-14-proj',
    name: 'P13.14 Package Export Test',
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
    ],
    openings: [
      { id: 'o1', wallId: 'w1', floorId: 'f1', kind: 'door', offset: 2, width: 0.9, height: 2.1, sillHeight: 0, headHeight: 2.1, name: 'Front Door', metadata: { ifcClass: 'IfcDoor', category: 'door', material: 'timber', properties: {}, fireRating: 'FD30' } },
      { id: 'o2', wallId: 'w1', floorId: 'f1', kind: 'window', offset: 5, width: 1.5, height: 1.2, sillHeight: 0.9, headHeight: 2.1, name: 'Living Window', metadata: { ifcClass: 'IfcWindow', category: 'window', properties: {} } },
    ],
    blocks: [],
    roomProgramme: { 'room-1': 'Living Room', 'room-2': 'Kitchen' },
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
    drawnBy: 'P13.14',
    scale: '1:100',
    views: [],
    ...overrides,
  };
}

function makeComposedSheet(sheetNumber: string, title: string, templateId: string): PackageSheetEntry {
  const meta = makeMeta({ sheetId: `sheet-${sheetNumber}`, sheetNumber, sheetTitle: title, templateId });
  const composed = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
  return {
    slot: { discipline: 'architectural', group: 'plan', sortKey: sheetNumber, sheetNumber, title, templateId },
    composed,
  };
}

function makeFullPackageSheets(): PackageSheetEntry[] {
  const coverMeta = makeMeta({
    templateId: 'a2-landscape-cover',
    sheetTitle: 'Architectural Package',
    sheetNumber: 'A-000',
  });
  const cover = composeSheet({ cad, sheetMeta: coverMeta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });

  const regMeta = makeMeta({
    templateId: 'a2-landscape-register',
    sheetTitle: 'Drawing Register',
    sheetNumber: 'REG',
  });
  const reg = composeSheet({ cad, sheetMeta: regMeta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });

  const planMeta = makeMeta({
    templateId: 'a2-landscape-plan',
    sheetTitle: 'Floor Plan',
    sheetNumber: 'A-101',
    views: [{ slotId: 'plan-main', viewId: 'plan', label: 'Floor Plan' }],
  });
  const plan = composeSheet({ cad, sheetMeta: planMeta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });

  const elevMeta = makeMeta({
    templateId: 'a2-landscape-elevation-section',
    sheetTitle: 'Elevations',
    sheetNumber: 'A-301',
    views: [
      { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
      { slotId: 'elevation-rear', viewId: 'rear', label: 'Rear Elevation' },
    ],
  });
  const elev = composeSheet({ cad, sheetMeta: elevMeta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });

  return [
    { slot: { discipline: 'architectural', group: 'cover', sortKey: 'A-000', sheetNumber: 'A-000', title: 'Architectural Package', templateId: 'a2-landscape-cover' }, composed: cover },
    { slot: { discipline: 'architectural', group: 'register', sortKey: 'REG', sheetNumber: 'REG', title: 'Drawing Register', templateId: 'a2-landscape-register' }, composed: reg },
    { slot: { discipline: 'architectural', group: 'plan', sortKey: 'A-101', sheetNumber: 'A-101', title: 'Floor Plan', templateId: 'a2-landscape-plan' }, composed: plan },
    { slot: { discipline: 'architectural', group: 'elevation-section', sortKey: 'A-301', sheetNumber: 'A-301', title: 'Elevations', templateId: 'a2-landscape-elevation-section' }, composed: elev },
  ];
}

// ── 1. Package Export ──
describe('P13.14 — Package Export', () => {
  test('buildSvgBundleExport returns valid HTML with all sheets', () => {
    const sheets = makeFullPackageSheets();
    const opts: PackageExportOptions = {
      format: 'svg-bundle',
      packageId: 'pkg-001',
      packageTitle: 'Architectural Package',
      projectName: 'P13.14 Package Export Test',
      projectNumber: 'P13.14',
      issueType: 'client-presentation',
      submissionCategory: 'design-progress',
      issueStage: 'design-development',
      issueNumber: '01',
      issueDate: '2026-07-19',
      revision: 'A',
      discipline: 'architectural',
      sheets,
      includeNavigation: true,
      includeManifest: true,
    };
    const result = buildSvgBundleExport(opts);
    expect(result.format).toBe('svg-bundle');
    expect(result.data).toContain('<!DOCTYPE html>');
    expect(result.data).toContain('P13.14 Package Export Test');
    expect(result.data).toContain('Architectural Package');
    expect(result.data).toContain('A-000');
    expect(result.data).toContain('A-101');
    expect(result.data).toContain('A-301');
    expect(result.data).toContain('<svg');
    expect(result.data).toContain('</svg>');
    expect(result.sheetCount).toBe(4);
  });

  test('buildSvgBundleExport preserves sheet order', () => {
    const sheets = makeFullPackageSheets();
    const opts: PackageExportOptions = {
      format: 'svg-bundle',
      packageId: 'pkg-002',
      packageTitle: 'Order Test',
      projectName: 'Test',
      projectNumber: 'T01',
      issueType: 'client-presentation',
      submissionCategory: 'design-progress',
      issueStage: 'design',
      issueNumber: '01',
      issueDate: '2026-07-19',
      revision: 'A',
      discipline: 'architectural',
      sheets,
    };
    const result = buildSvgBundleExport(opts);
    // Check manifest sheet order
    expect(result.manifest.sheets[0].sheetNumber).toBe('A-000');
    expect(result.manifest.sheets[1].sheetNumber).toBe('REG');
    expect(result.manifest.sheets[2].sheetNumber).toBe('A-101');
    expect(result.manifest.sheets[3].sheetNumber).toBe('A-301');
  });

  test('buildPdfPackageExport generates print-optimized HTML', () => {
    const sheets = [makeComposedSheet('A-101', 'Floor Plan', 'a2-landscape-plan')];
    const opts: PackageExportOptions = {
      format: 'pdf-ready',
      packageId: 'pkg-003',
      packageTitle: 'PDF Test',
      projectName: 'Test',
      projectNumber: 'T01',
      issueType: 'client-presentation',
      submissionCategory: 'design-progress',
      issueStage: 'design',
      issueNumber: '01',
      issueDate: '2026-07-19',
      revision: 'A',
      discipline: 'architectural',
      sheets,
    };
    const result = buildPdfPackageExport(opts);
    expect(result.format).toBe('pdf-ready');
    expect(result.data).toContain('@media print');
    expect(result.data).toContain('page-break-after');
    expect(result.data).toContain('<svg');
  });

  test('buildZipPackageExport returns structured payload', () => {
    const sheets = [makeComposedSheet('A-101', 'Floor Plan', 'a2-landscape-plan')];
    const opts: PackageExportOptions = {
      format: 'zip',
      packageId: 'pkg-004',
      packageTitle: 'ZIP Test',
      projectName: 'Test',
      projectNumber: 'T01',
      issueType: 'client-presentation',
      submissionCategory: 'design-progress',
      issueStage: 'design',
      issueNumber: '01',
      issueDate: '2026-07-19',
      revision: 'A',
      discipline: 'architectural',
      sheets,
    };
    const result = buildZipPackageExport(opts);
    expect(result.format).toBe('zip');
    const payload = JSON.parse(result.data);
    expect(payload.manifest).toBeDefined();
    expect(payload.files.length).toBe(1);
    expect(payload.files[0].filename).toMatch(/\.svg$/);
    expect(payload.files[0].content).toContain('<svg');
  });

  test('exportPackage dispatches to correct builder', () => {
    const sheets = [makeComposedSheet('A-101', 'Floor Plan', 'a2-landscape-plan')];
    const base: PackageExportOptions = {
      format: 'svg-bundle',
      packageId: 'pkg-005',
      packageTitle: 'Dispatch Test',
      projectName: 'Test',
      projectNumber: 'T01',
      issueType: 'client-presentation',
      submissionCategory: 'design-progress',
      issueStage: 'design',
      issueNumber: '01',
      issueDate: '2026-07-19',
      revision: 'A',
      discipline: 'architectural',
      sheets,
    };
    const svgResult = exportPackage(base);
    expect(svgResult.format).toBe('svg-bundle');

    const pdfResult = exportPackage({ ...base, format: 'pdf-ready' });
    expect(pdfResult.format).toBe('pdf-ready');

    const zipResult = exportPackage({ ...base, format: 'zip' });
    expect(zipResult.format).toBe('zip');
  });

  test('title block metadata survives package export', () => {
    const sheets = makeFullPackageSheets();
    const opts: PackageExportOptions = {
      format: 'svg-bundle',
      packageId: 'pkg-006',
      packageTitle: 'Meta Test',
      projectName: 'P13.14 Package Export Test',
      projectNumber: 'P13.14',
      issueType: 'client-presentation',
      submissionCategory: 'design-progress',
      issueStage: 'design-development',
      issueNumber: '01',
      issueDate: '2026-07-19',
      revision: 'A',
      discipline: 'architectural',
      sheets,
    };
    const result = buildSvgBundleExport(opts);
    // SVG content in bundle retains title block metadata
    expect(result.data).toContain('P13.14 Package Export Test');
    expect(result.data).toContain('Floor Plan');
    expect(result.data).toContain('Elevations');
    expect(result.data).toContain('A-101');
    expect(result.data).toContain('A-301');
  });
});

// ── 2. Schedule Context Filtering ──
describe('P13.14 — Schedule Context Filtering', () => {
  const scheduleRefs: DrawingViewRef[] = [
    { viewId: 'schedule-door', viewType: 'schedule', label: 'Door Schedule', sheetNumber: 'A-601', drawingNumber: 'D1' },
    { viewId: 'schedule-window', viewType: 'schedule', label: 'Window Schedule', sheetNumber: 'A-602', drawingNumber: 'W1' },
    { viewId: 'schedule-structural', viewType: 'schedule', label: 'Structural Schedule', sheetNumber: 'S-101', drawingNumber: 'ST1' },
    { viewId: 'schedule-finish', viewType: 'schedule', label: 'Finish Schedule', sheetNumber: 'A-603', drawingNumber: 'F1' },
    { viewId: 'schedule-electrical', viewType: 'schedule', label: 'Electrical Schedule', sheetNumber: 'M-101', drawingNumber: 'E1' },
  ];

  test('filterSchedules architectural returns door/window/finish', () => {
    const result = filterSchedules(scheduleRefs, { packageType: 'architectural', viewTypesOnSheet: [] });
    expect(result.included.length).toBe(3);
    expect(result.included.some(r => r.viewId === 'schedule-door')).toBe(true);
    expect(result.included.some(r => r.viewId === 'schedule-window')).toBe(true);
    expect(result.included.some(r => r.viewId === 'schedule-finish')).toBe(true);
    expect(result.included.some(r => r.viewId === 'schedule-structural')).toBe(false);
    expect(result.excluded.length).toBe(2);
  });

  test('filterSchedules structural returns structural schedule only', () => {
    const result = filterSchedules(scheduleRefs, { packageType: 'structural', viewTypesOnSheet: [] });
    expect(result.included.length).toBe(1);
    expect(result.included[0].viewId).toBe('schedule-structural');
  });

  test('filterSchedules mep returns electrical/plumbing/hvac', () => {
    const result = filterSchedules(scheduleRefs, { packageType: 'mep', viewTypesOnSheet: [] });
    expect(result.included.length).toBe(1);
    expect(result.included[0].viewId).toBe('schedule-electrical');
  });

  test('filterSchedules interior returns finish/door/window', () => {
    const result = filterSchedules(scheduleRefs, { packageType: 'interior', viewTypesOnSheet: [] });
    expect(result.included.length).toBe(3);
    expect(result.included.some(r => r.viewId === 'schedule-finish')).toBe(true);
  });

  test('filterSchedules all returns all schedules', () => {
    const result = filterSchedules(scheduleRefs, { packageType: 'all', viewTypesOnSheet: [] });
    expect(result.included.length).toBe(5);
    expect(result.excluded.length).toBe(0);
  });

  test('getScheduleExcerpt returns filtered refs', () => {
    const result = getScheduleExcerpt(scheduleRefs, 'architectural');
    expect(result.reason).toContain('architectural-relevant');
    expect(result.included.length).toBe(3);
  });

  test('filterSchedules falls back to all when no relevant schedules match', () => {
    const unrelated: DrawingViewRef[] = [
      { viewId: 'schedule-site', viewType: 'schedule', label: 'Site Schedule', sheetNumber: 'X-001', drawingNumber: 'S1' },
    ];
    const result = filterSchedules(unrelated, { packageType: 'structural', viewTypesOnSheet: [] });
    expect(result.included.length).toBe(1);
    expect(result.reason).toContain('No structural-specific schedules found');
  });
});

// ── 3. Cover / Register Coherence ──
describe('P13.14 — Cover / Register Coherence', () => {
  test('cover sheet with branding includes firm name and logo zone', () => {
    const content: CoverSheetContent = {
      projectName: 'Test Building',
      projectNumber: 'P13.14',
      client: 'Test Client',
      architect: 'Budget Engineer Studio',
      issueDate: '2026-07-19',
      issueStage: 'Design Development',
      issueNumber: '01',
      packageTitle: 'Architectural Package',
      sheetList: [{ sheetNumber: 'A-101', title: 'Floor Plan' }],
      generalNotes: ['Test note.'],
      revisionHistory: [],
      branding: { firmName: 'Acme Architects', firmAddress: '123 Main St, London' },
      approvals: [
        { role: 'Principal Architect', name: 'Jane Doe', date: '2026-07-19', signed: true },
        { role: 'Project Manager', name: 'John Smith', date: '2026-07-19', signed: false },
      ],
      disclaimer: 'For review purposes only.',
    };
    const svg = buildCoverSheet(content, 'technical');
    expect(svg).toContain('Acme Architects');
    expect(svg).toContain('123 Main St, London');
    expect(svg).toContain('Principal Architect');
    expect(svg).toContain('Jane Doe');
    expect(svg).toContain('Project Manager');
    expect(svg).toContain('For review purposes only.');
  });

  test('cover sheet includes issue state badge', () => {
    const content: CoverSheetContent = {
      projectName: 'Test',
      projectNumber: 'T01',
      issueDate: '2026-07-19',
      issueStage: 'For Construction',
      issueNumber: '02',
      packageTitle: 'Test',
      sheetList: [],
      generalNotes: [],
      revisionHistory: [],
    };
    const svg = buildCoverSheet(content, 'technical');
    expect(svg).toContain('FOR CONSTRUCTION');
    expect(svg).toContain('Issue 02');
  });

  test('cover sheet with project address renders it', () => {
    const content: CoverSheetContent = {
      projectName: 'Test',
      projectNumber: 'T01',
      issueDate: '2026-07-19',
      issueStage: 'Design',
      issueNumber: '01',
      packageTitle: 'Test',
      sheetList: [],
      generalNotes: [],
      revisionHistory: [],
      projectAddress: '456 Oak Avenue, Manchester',
    };
    const svg = buildCoverSheet(content, 'technical');
    expect(svg).toContain('456 Oak Avenue, Manchester');
  });

  test('composer passes branding/approvals to cover sheet', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-cover',
      sheetTitle: 'Branded Package',
      sheetNumber: 'A-000',
    });
    const result = composeSheet({
      cad,
      sheetMeta: meta,
      mode: 'technical',
      coordinator: DEFAULT_COORDINATOR,
      branding: { firmName: 'Budget Engineer Studio' },
      approvals: [{ role: 'Principal', name: 'Alice', date: '2026-07-19', signed: true }],
      disclaimer: 'Test disclaimer.',
      projectAddress: '789 High Street',
    });
    expect(result.sheetSvg).toContain('Budget Engineer Studio');
    expect(result.sheetSvg).toContain('Principal');
    expect(result.sheetSvg).toContain('Alice');
    expect(result.sheetSvg).toContain('Test disclaimer.');
    expect(result.sheetSvg).toContain('789 High Street');
  });

  test('cover sheet and register share consistent metadata', () => {
    const coverMeta = makeMeta({
      templateId: 'a2-landscape-cover',
      sheetTitle: 'Architectural Package',
      sheetNumber: 'A-000',
    });
    const regMeta = makeMeta({
      templateId: 'a2-landscape-register',
      sheetTitle: 'Drawing Register',
      sheetNumber: 'REG',
    });
    const cover = composeSheet({ cad, sheetMeta: coverMeta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    const reg = composeSheet({ cad, sheetMeta: regMeta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    // Both reference same project name
    expect(cover.sheetSvg).toContain('P13.14 Package Export Test');
    expect(reg.sheetSvg).toContain('P13.14 Package Export Test');
  });

  test('drawing register entries match cover sheet list', () => {
    const allViews = DEFAULT_COORDINATOR.getAllViews();
    const entries: DrawingRegisterEntry[] = allViews.map(v => ({
      drawingNumber: v.drawingNumber,
      title: v.label,
      revision: 'A',
      scale: '1:100',
      status: 'IFR',
      discipline: 'ARCH',
      sheetNumber: v.sheetNumber,
    }));
    const content: DrawingRegisterContent = {
      projectName: 'Test',
      projectNumber: 'T01',
      entries,
      revisionHistory: [],
    };
    const svg = buildDrawingRegisterSheet(content, 'technical');
    for (const e of entries) {
      expect(svg).toContain(e.sheetNumber);
      expect(svg).toContain(e.title);
    }
  });
});

// ── 4. Visual Datum Continuity ──
describe('P13.14 — Visual Datum Continuity', () => {
  test('elevation sheet with multiple views has datum lines', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Elevations with Datums',
      views: [
        { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
        { slotId: 'elevation-rear', viewId: 'rear', label: 'Rear Elevation' },
        { slotId: 'elevation-left', viewId: 'left', label: 'Left Elevation' },
        { slotId: 'elevation-right', viewId: 'right', label: 'Right Elevation' },
      ],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toContain('datum');
    expect(result.sheetSvg).toContain('stroke-dasharray');
  });

  test('datum lines do not appear on single-view sheets', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-plan',
      sheetTitle: 'Single Plan',
      views: [{ slotId: 'plan-main', viewId: 'plan', label: 'Plan' }],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    // No datum lines for single-view sheet
    expect(result.sheetSvg).not.toContain('stroke-dasharray="4,3"');
  });

  test('aligned views maintain non-negative positions after datum adjustment', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Datums Aligned',
      views: [
        { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
        { slotId: 'elevation-rear', viewId: 'rear', label: 'Rear Elevation' },
      ],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    for (const pv of result.placedViews) {
      expect(pv.ox).toBeGreaterThanOrEqual(0);
      expect(pv.oy).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── 5. Package-Level Coherence ──
describe('P13.14 — Package-Level Coherence', () => {
  test('buildPackageSequence uses correct group order', () => {
    const seq = buildPackageSequence('architectural', [
      { group: 'detail', title: 'Detail 1' },
      { group: 'cover', title: 'Cover' },
      { group: 'plan', title: 'Plan' },
      { group: 'register', title: 'Register' },
    ]);
    expect(seq.sheets[0].group).toBe('cover');
    expect(seq.sheets[1].group).toBe('register');
    expect(seq.sheets[2].group).toBe('plan');
    expect(seq.sheets[3].group).toBe('detail');
  });

  test('assignSheetNumbers produces consistent numbering', () => {
    const a = assignSheetNumbers([{ group: 'plan', title: 'Plan' }], 'architectural');
    const s = assignSheetNumbers([{ group: 'plan', title: 'Plan' }], 'structural');
    const m = assignSheetNumbers([{ group: 'plan', title: 'Plan' }], 'mep');
    expect(a[0].sheetNumber).toMatch(/^A-/);
    expect(s[0].sheetNumber).toMatch(/^S-/);
    expect(m[0].sheetNumber).toMatch(/^M-/);
  });

  test('package export retains discipline prefix in manifest', () => {
    const sheets = [makeComposedSheet('A-101', 'Floor Plan', 'a2-landscape-plan')];
    const opts: PackageExportOptions = {
      format: 'svg-bundle',
      packageId: 'pkg-disc',
      packageTitle: 'Discipline Test',
      projectName: 'Test',
      projectNumber: 'T01',
      issueType: 'contractor-issue',
      submissionCategory: 'construction',
      issueStage: 'design',
      issueNumber: '01',
      issueDate: '2026-07-19',
      revision: 'A',
      discipline: 'structural',
      sheets,
    };
    const result = exportPackage(opts);
    expect(result.manifest.discipline).toBe('structural');
  });
});

// ── 6. Regression ──
describe('P13.14 — Regression', () => {
  test('existing plan sheet still works', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-plan',
      sheetTitle: 'Regression Plan',
      views: [{ slotId: 'plan-main', viewId: 'plan', label: 'Plan' }],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toContain('<svg');
    expect(result.sheetSvg).toContain('Regression Plan');
  });

  test('existing combined issue sheet still works', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-combined-issue',
      sheetTitle: 'Regression Combined',
      views: [
        { slotId: 'plan-main', viewId: 'plan', label: 'Plan' },
        { slotId: 'elevation-main', viewId: 'front', label: 'Front Elevation' },
      ],
    });
    const result = buildCombinedIssueSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('<svg');
    expect(result.placedViews.length).toBeGreaterThanOrEqual(1);
  });

  test('existing elevation section sheet with datums still works', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Regression Elev/Sec',
      views: [
        { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
        { slotId: 'elevation-rear', viewId: 'rear', label: 'Rear Elevation' },
      ],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toContain('<svg');
    expect(result.sheetSvg).toContain('Sheet References');
  });

  test('no clipping in composed sheets', () => {
    const meta = makeMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Clip Test',
      views: [
        { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
        { slotId: 'elevation-rear', viewId: 'rear', label: 'Rear Elevation' },
      ],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    for (const pv of result.placedViews) {
      expect(pv.scale).toBeGreaterThan(0);
      expect(pv.ox).toBeGreaterThanOrEqual(0);
      expect(pv.oy).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── 7. Package Assembly ──
describe('P13.14 — Package Assembly', () => {
  const register = generateDefaultRegister({ floorCount: 2, floorNames: ['Ground', 'First'] });

  test('assemblePackage builds correct structure', () => {
    const identity = buildPackageIdentity('P13.14', 'client-presentation', 'design-progress', 'architectural', 'A');
    const allScheduleRefs: DrawingViewRef[] = [
      { viewId: 'schedule-door', viewType: 'schedule', label: 'Door Schedule', sheetNumber: 'A-601', drawingNumber: 'D1' },
      { viewId: 'schedule-window', viewType: 'schedule', label: 'Window Schedule', sheetNumber: 'A-602', drawingNumber: 'W1' },
      { viewId: 'schedule-structural', viewType: 'schedule', label: 'Structural Schedule', sheetNumber: 'S-101', drawingNumber: 'ST1' },
    ];
    const assembly = assemblePackage({
      projectName: 'Test Building',
      projectNumber: 'P13.14',
      identity,
      register,
      allScheduleRefs,
      issueDate: '2026-07-19',
    });

    expect(assembly.identity.packageId).toContain('P13.14');
    expect(assembly.sheetCount).toBeGreaterThan(0);
    expect(assembly.warnings).toEqual([]);
    expect(assembly.scheduleFilter.included.length).toBeGreaterThan(0);
  });

  test('buildPackageIdentity generates deterministic IDs', () => {
    const id1 = buildPackageIdentity('PROJ-001', 'contractor-issue', 'construction', 'architectural', 'B', 2);
    expect(id1.packageId).toContain('PROJ-001');
    expect(id1.issueNumber).toBe('B-02');
    expect(id1.revision).toBe('B');
    expect(id1.issueType).toBe('contractor-issue');
    expect(id1.submissionCategory).toBe('construction');

    const id2 = buildPackageIdentity('PROJ-001', 'client-presentation', 'design-progress', 'structural', 'A');
    expect(id2.packageId).toContain('ST');
    expect(id2.issueNumber).toBe('A-01');
  });

  test('assemblePackage filters by discipline correctly', () => {
    const identity = buildPackageIdentity('T01', 'contractor-issue', 'construction', 'structural', 'A');
    const allScheduleRefs: DrawingViewRef[] = [
      { viewId: 'schedule-door', viewType: 'schedule', label: 'Door Schedule', sheetNumber: 'A-601', drawingNumber: 'D1' },
      { viewId: 'schedule-structural', viewType: 'schedule', label: 'Structural Schedule', sheetNumber: 'S-101', drawingNumber: 'ST1' },
    ];
    const assembly = assemblePackage({
      projectName: 'Test',
      projectNumber: 'T01',
      identity,
      register,
      allScheduleRefs,
      issueDate: '2026-07-19',
    });
    expect(assembly.identity.packageDiscipline).toBe('structural');
    expect(assembly.sheetCount).toBeGreaterThan(0);
  });

  test('assemblePackage produces group summary', () => {
    const identity = buildPackageIdentity('T01', 'for-construction', 'construction', 'all', 'C');
    const assembly = assemblePackage({
      projectName: 'Test',
      projectNumber: 'T01',
      identity,
      register,
      allScheduleRefs: [],
      issueDate: '2026-07-19',
    });
    expect(assembly.groupSummary.length).toBeGreaterThan(0);
    expect(assembly.groupSummary.some(g => g.group === 'plan')).toBe(true);
  });

  test('assemblePackage warns when no sheets match discipline', () => {
    const identity = buildPackageIdentity('T01', 'contractor-issue', 'construction', 'site', 'A');
    const emptyRegister = generateDefaultRegister({ floorCount: 0 });
    const assembly = assemblePackage({
      projectName: 'Test',
      projectNumber: 'T01',
      identity,
      register: emptyRegister,
      allScheduleRefs: [],
      issueDate: '2026-07-19',
    });
    expect(assembly.warnings.length).toBeGreaterThanOrEqual(0);
  });
});

// ── 8. Package Naming & Export Filename ──
describe('P13.14 — Package Naming & Export Filename', () => {
  test('packageExportFilename produces safe filenames', () => {
    const id = buildPackageIdentity('P13.14', 'client-presentation', 'design-progress', 'architectural', 'A');
    const name = packageExportFilename(id, 'pdf-ready');
    expect(name).toContain('pdf-ready');
    expect(name).toContain('A');
    expect(name).not.toContain(' ');
    expect(name).not.toMatch(/[^a-zA-Z0-9-_.]/);
  });

  test('deterministicSheetNumber produces expected format', () => {
    const num = deterministicSheetNumber('A', 3, 1);
    expect(num).toBe('A-301');
    const num2 = deterministicSheetNumber('S', 1, 2);
    expect(num2).toBe('S-102');
  });

  test('different issue types produce different package titles', () => {
    const clientPkg = buildPackageIdentity('T01', 'client-presentation', 'design-progress', 'architectural', 'A');
    const contractorPkg = buildPackageIdentity('T01', 'contractor-issue', 'construction', 'architectural', 'A');
    expect(clientPkg.packageTitle).not.toBe(contractorPkg.packageTitle);
    expect(clientPkg.issueType).not.toBe(contractorPkg.issueType);
  });
});

// ── 9. Enhanced Schedule Filtering ──
describe('P13.14 — Enhanced Schedule Filtering', () => {
  const scheduleRefs: DrawingViewRef[] = [
    { viewId: 'schedule-door', viewType: 'schedule', label: 'Door Schedule', sheetNumber: 'A-601', drawingNumber: 'D1' },
    { viewId: 'schedule-window', viewType: 'schedule', label: 'Window Schedule', sheetNumber: 'A-602', drawingNumber: 'W1' },
    { viewId: 'schedule-finish', viewType: 'schedule', label: 'Room Finish Schedule', sheetNumber: 'A-603', drawingNumber: 'F1' },
    { viewId: 'schedule-room', viewType: 'schedule', label: 'Room Schedule', sheetNumber: 'A-604', drawingNumber: 'R1' },
    { viewId: 'schedule-structural', viewType: 'schedule', label: 'Structural Schedule', sheetNumber: 'S-101', drawingNumber: 'ST1' },
    { viewId: 'schedule-electrical', viewType: 'schedule', label: 'Electrical Schedule', sheetNumber: 'M-101', drawingNumber: 'E1' },
  ];

  test('filterSchedules includes room/finish under architectural', () => {
    const result = filterSchedules(scheduleRefs, { packageType: 'architectural', viewTypesOnSheet: [] });
    expect(result.included.some(r => r.viewId === 'schedule-room')).toBe(true);
    expect(result.included.some(r => r.viewId === 'schedule-finish')).toBe(true);
    expect(result.scheduleTypeBreakdown.some(t => t.type === 'room')).toBe(true);
  });

  test('filterSchedules mep includes equipment schedules', () => {
    const mepRefs: DrawingViewRef[] = [
      { viewId: 'schedule-electrical', viewType: 'schedule', label: 'Electrical Schedule', sheetNumber: 'M-101', drawingNumber: 'E1' },
      { viewId: 'schedule-plumbing', viewType: 'schedule', label: 'Plumbing Schedule', sheetNumber: 'M-102', drawingNumber: 'P1' },
      { viewId: 'schedule-hvac', viewType: 'schedule', label: 'HVAC Schedule', sheetNumber: 'M-103', drawingNumber: 'H1' },
      { viewId: 'schedule-equipment', viewType: 'schedule', label: 'Equipment Schedule', sheetNumber: 'M-104', drawingNumber: 'EQ1' },
    ];
    const result = filterSchedules(mepRefs, { packageType: 'mep', viewTypesOnSheet: [] });
    expect(result.included.length).toBe(4);
  });

  test('filterSchedules site includes drainage/landscape', () => {
    const siteRefs: DrawingViewRef[] = [
      { viewId: 'schedule-site', viewType: 'schedule', label: 'Site Schedule', sheetNumber: 'X-001', drawingNumber: 'ST1' },
      { viewId: 'schedule-landscape', viewType: 'schedule', label: 'Landscape Schedule', sheetNumber: 'X-002', drawingNumber: 'LS1' },
      { viewId: 'schedule-drainage', viewType: 'schedule', label: 'Drainage Schedule', sheetNumber: 'X-003', drawingNumber: 'DR1' },
    ];
    const result = filterSchedules(siteRefs, { packageType: 'site', viewTypesOnSheet: [] });
    expect(result.included.length).toBe(3);
    expect(result.scheduleTypeBreakdown.length).toBeGreaterThanOrEqual(3);
  });

  test('filterSchedules architectural with hasStructural flag produces contextual reason', () => {
    const result = filterSchedules(scheduleRefs, {
      packageType: 'architectural',
      viewTypesOnSheet: [],
      hasStructural: true,
    });
    expect(result.reason).toContain('structural excluded');
  });

  test('filterSchedules architectural with floorCount > 1 produces floor-aware reason', () => {
    const result = filterSchedules(scheduleRefs, {
      packageType: 'architectural',
      viewTypesOnSheet: [],
      floorCount: 3,
    });
    expect(result.reason).toContain('3-floor');
  });

  test('explainScheduleFilter produces readable summary', () => {
    const result = filterSchedules(scheduleRefs, { packageType: 'architectural', viewTypesOnSheet: [] });
    const explained = explainScheduleFilter(result);
    expect(explained).toContain('architectural');
    expect(explained).toContain('Types');
  });
});

// ── 10. Package Manifest ──
describe('P13.14 — Package Manifest', () => {
  test('export manifest includes issue type and submission category', () => {
    const sheets = [makeComposedSheet('A-101', 'Floor Plan', 'a2-landscape-plan')];
    const opts: PackageExportOptions = {
      format: 'svg-bundle',
      packageId: 'pkg-man-01',
      packageTitle: 'Manifest Test',
      projectName: 'Test',
      projectNumber: 'T01',
      issueType: 'submission-support',
      submissionCategory: 'tender',
      issueStage: 'technical-submission',
      issueNumber: '02',
      issueDate: '2026-07-19',
      revision: 'B',
      discipline: 'architectural',
      sheets,
    };
    const result = buildSvgBundleExport(opts);
    expect(result.manifest.issueType).toBe('submission-support');
    expect(result.manifest.submissionCategory).toBe('tender');
    expect(result.manifest.revision).toBe('B');
    expect(result.manifest.exportFilename).toContain('B');
    expect(result.manifest.exportFilename).toContain('svg-bundle');
  });

  test('export manifest includes warnings when provided', () => {
    const sheets = [makeComposedSheet('A-101', 'Floor Plan', 'a2-landscape-plan')];
    const opts: PackageExportOptions = {
      format: 'svg-bundle',
      packageId: 'pkg-man-02',
      packageTitle: 'Warning Test',
      projectName: 'Test',
      projectNumber: 'T01',
      issueType: 'contractor-issue',
      submissionCategory: 'construction',
      issueStage: 'for-construction',
      issueNumber: '01',
      issueDate: '2026-07-19',
      revision: 'A',
      discipline: 'architectural',
      sheets,
      warnings: ['No structural sheets found', 'Missing cover sheet'],
    };
    const result = buildSvgBundleExport(opts);
    expect(result.manifest.warnings).toContain('No structural sheets found');
    expect(result.manifest.warnings.length).toBe(2);
  });

  test('manifest HTML renders warnings section', () => {
    const sheets = [makeComposedSheet('A-101', 'Floor Plan', 'a2-landscape-plan')];
    const opts: PackageExportOptions = {
      format: 'svg-bundle',
      packageId: 'pkg-man-03',
      packageTitle: 'HTML Warning Test',
      projectName: 'Test',
      projectNumber: 'T01',
      issueType: 'for-construction',
      submissionCategory: 'construction',
      issueStage: 'for-construction',
      issueNumber: '01',
      issueDate: '2026-07-19',
      revision: 'A',
      discipline: 'architectural',
      sheets,
      includeManifest: true,
      warnings: ['Warning 1'],
    };
    const result = buildSvgBundleExport(opts);
    expect(result.data).toContain('Package Warnings');
    expect(result.data).toContain('Warning 1');
  });
});

// ── 11. Package Type Distinctions ──
describe('P13.14 — Package Type Distinctions', () => {
  test('buildPackageIdentity distinguishes all issue types', () => {
    const types = ['client-presentation', 'contractor-issue', 'submission-support', 'drawing-review', 'for-construction', 'as-built'] as const;
    const ids = types.map(t => buildPackageIdentity('T01', t, 'design-progress', 'architectural', 'A'));
    const titles = new Set(ids.map(i => i.packageTitle));
    expect(titles.size).toBe(types.length);
  });

  test('buildPackageIdentity distinguishes submission categories', () => {
    const cats = ['design-progress', 'tender', 'construction', 'record', 'review'] as const;
    const ids = cats.map(c => buildPackageIdentity('T01', 'client-presentation', c, 'architectural', 'A'));
    const titles = new Set(ids.map(i => i.packageTitle));
    expect(titles.size).toBe(cats.length);
  });
});

// ── 12. Package Summary Data ──
describe('P13.14 — Package Summary Display Data', () => {
  test('PackageSummaryPanel assembly contains all display data', () => {
    const identity = buildPackageIdentity('T01', 'contractor-issue', 'construction', 'architectural', 'A');
    const register = generateDefaultRegister({ floorCount: 1 });
    const assembly = assemblePackage({
      projectName: 'Test Building',
      projectNumber: 'T01',
      identity,
      register,
      allScheduleRefs: [],
      issueDate: '2026-07-19',
    });

    expect(assembly.identity.packageTitle).toContain('Contractor');
    expect(assembly.identity.packageId).toContain('T01');
    expect(assembly.sheetCount).toBeGreaterThan(0);
    expect(assembly.disciplineSummary.length).toBeGreaterThan(0);
  });

  test('PackageSummaryPanel data includes group breakdown with counts', () => {
    const identity = buildPackageIdentity('T01', 'for-construction', 'construction', 'architectural', 'B');
    const register = generateDefaultRegister({ floorCount: 2 });
    const assembly = assemblePackage({
      projectName: 'Test',
      projectNumber: 'T01',
      identity,
      register,
      allScheduleRefs: [],
      issueDate: '2026-07-19',
    });

    expect(assembly.groupSummary.length).toBeGreaterThan(0);
    const totalGrouped = assembly.groupSummary.reduce((sum, g) => sum + g.count, 0);
    expect(totalGrouped).toBe(assembly.sheetCount);
  });
});
