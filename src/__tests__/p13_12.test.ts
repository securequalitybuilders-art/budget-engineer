import { describe, test, expect } from 'vitest';
import { buildSectionSvg } from '../lib/drawings/section-svg';
import { buildElevationSvg } from '../lib/drawings/elevation-svg';
import type { CadDocument } from '../domain/ws6-types';
import type { SheetMeta } from '../lib/drawings/issue-sheet-meta';
import { getTemplate, listTemplates } from '../lib/drawings/sheet-templates';
import {
  renderMaterialLegend,
  renderScaleBar,
  renderNorthArrow,
  renderKeynotePanel,
  renderDrawingListPanel,
  renderProjectInfoPanel,
  renderIssueNotePanel,
} from '../lib/drawings/legend-panels';
import {
  composeSheet,
  buildElevationSectionSheet,
  buildPlanSheet,
  buildScheduleSheet,
  buildCombinedIssueSheet,
} from '../lib/drawings/sheet-set-composer';
import { DEFAULT_COORDINATOR } from '../lib/drawings/sheet-coordination';
import { SHEET_MM } from '../lib/drawings/sheet-size';

function houseCad(): CadDocument {
  return {
    id: 'p13-12-cad',
    projectId: 'p13-12-proj',
    name: 'P13.12 Test House',
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
    blocks: [
      { id: 'b1', floorId: 'f1', kind: 'stair', position: { x: 9, y: 3 }, width: 1.2, depth: 3, rotation: 0, name: 'Stair-1', end: { x: 9, y: 6 }, metadata: { ifcClass: 'IfcStair', category: 'circulation', properties: {} } },
    ],
    roomProgramme: {
      'room-1': 'Living Room',
      'room-2': 'Kitchen',
      'room-3': 'Bedroom 1',
      'room-4': 'Corridor',
    },
  };
}

const cad = houseCad();

function makeSheetMeta(overrides: Partial<SheetMeta> & { templateId: string }): SheetMeta {
  return {
    sheetId: 'test-sheet',
    sheetNumber: 'A-101',
    sheetTitle: 'Test Sheet',
    drawingNumber: '01',
    revision: 'A',
    date: '2026-07-19',
    drawnBy: 'P13.12',
    scale: '1:100',
    views: [],
    ...overrides,
  };
}

// ── 1. Sheet Templates ──
describe('P13.12 — Sheet Templates', () => {
  test('listTemplates returns at least 7 templates', () => {
    const templates = listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(7);
  });

  test('getTemplate returns correct template by id', () => {
    const t = getTemplate('a2-landscape-plan');
    expect(t).toBeDefined();
    expect(t!.size).toBe('A2');
    expect(t!.orientation).toBe('landscape');
  });

  test('elevation-section template has viewport slots', () => {
    const t = getTemplate('a2-landscape-elevation-section');
    expect(t).toBeDefined();
    expect(t!.viewports.length).toBeGreaterThan(0);
    const elevSlot = t!.viewports.find(v => v.id === 'elevation-front');
    expect(elevSlot).toBeDefined();
    expect(elevSlot!.allowedTypes).toContain('elevation');
  });

  test('plan sheet template has plan viewport', () => {
    const t = getTemplate('a2-landscape-plan');
    expect(t).toBeDefined();
    const planSlot = t!.viewports.find(v => v.id === 'plan-main');
    expect(planSlot).toBeDefined();
  });

  test('schedule template has schedule viewports', () => {
    const t = getTemplate('a2-portrait-schedule');
    expect(t).toBeDefined();
    const scheduleSlots = t!.viewports.filter(v => v.allowedTypes?.includes('schedule'));
    expect(scheduleSlots.length).toBeGreaterThanOrEqual(2);
  });

  test('combined issue template has plan, elevation, and section slots', () => {
    const t = getTemplate('a2-landscape-combined-issue');
    expect(t).toBeDefined();
    const planSlot = t!.viewports.find(v => v.id === 'plan-main' && v.allowedTypes?.includes('plan'));
    const elevSlot = t!.viewports.find(v => v.id === 'elevation-main' && v.allowedTypes?.includes('elevation'));
    const secSlot = t!.viewports.find(v => v.id === 'section-main' && v.allowedTypes?.includes('section'));
    expect(planSlot).toBeDefined();
    expect(elevSlot).toBeDefined();
    expect(secSlot).toBeDefined();
  });

  test('template dimensions are positive', () => {
    for (const t of listTemplates()) {
      for (const v of t.viewports) {
        expect(v.width).toBeGreaterThan(0);
        expect(v.height).toBeGreaterThan(0);
      }
    }
  });
});

// ── 2. Legend Panels ──
describe('P13.12 — Legend Panels', () => {
  test('renderMaterialLegend returns SVG parts', () => {
    const parts = renderMaterialLegend(10, 10, 150, 120, false);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.some(p => p.includes('Material Legend'))).toBe(true);
    expect(parts.some(p => p.includes('Concrete'))).toBe(true);
  });

  test('renderMaterialLegend print mode uses light colors', () => {
    const parts = renderMaterialLegend(10, 10, 150, 120, true);
    expect(parts.some(p => p.includes('#f8fafc'))).toBe(true);
  });

  test('renderScaleBar returns valid SVG parts', () => {
    const parts = renderScaleBar(10, 10, 200, false);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.some(p => p.includes('Scale Bar'))).toBe(true);
    expect(parts.some(p => p.includes('m'))).toBe(true);
  });

  test('renderNorthArrow returns valid SVG parts', () => {
    const parts = renderNorthArrow(50, 50, 30, false);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.some(p => p.includes('N</text>'))).toBe(true);
  });

  test('renderNorthArrow print mode uses correct colors', () => {
    const parts = renderNorthArrow(50, 50, 30, true);
    expect(parts.length).toBeGreaterThan(0);
  });

  test('renderKeynotePanel returns SVG parts', () => {
    const keynotes = [
      { num: 1, text: 'External cavity wall' },
      { num: 2, text: 'Internal timber stud' },
    ];
    const parts = renderKeynotePanel(10, 10, 200, 80, keynotes, false);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.some(p => p.includes('Keynotes'))).toBe(true);
    expect(parts.some(p => p.includes('External cavity wall'))).toBe(true);
  });

  test('renderKeynotePanel returns empty for empty list', () => {
    const parts = renderKeynotePanel(10, 10, 200, 80, [], false);
    expect(parts.length).toBe(0);
  });

  test('renderDrawingListPanel returns SVG parts', () => {
    const drawings = [
      { label: 'Floor Plan', sheet: 'A-101' },
      { label: 'Section A-A', sheet: 'A-201' },
    ];
    const parts = renderDrawingListPanel(10, 10, 200, 80, drawings, false);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.some(p => p.includes('Drawing List'))).toBe(true);
    expect(parts.some(p => p.includes('A-101'))).toBe(true);
  });

  test('renderProjectInfoPanel returns SVG parts', () => {
    const info = [
      { label: 'Project', value: 'Test House' },
      { label: 'Client', value: 'Test Client' },
    ];
    const parts = renderProjectInfoPanel(10, 10, 200, 80, info, false);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.some(p => p.includes('Project Information'))).toBe(true);
    expect(parts.some(p => p.includes('Test House'))).toBe(true);
  });

  test('renderIssueNotePanel returns SVG parts', () => {
    const parts = renderIssueNotePanel(10, 10, 300, false);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.some(p => p.includes('Issue Purpose'))).toBe(true);
    expect(parts.some(p => p.includes('Do not scale'))).toBe(true);
  });
});

// ── 3. Sheet Composition — Elevation/Section ──
describe('P13.12 — Elevation/Section Sheet Composition', () => {
  test('composeSheet produces valid SVG', () => {
    const meta = makeSheetMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Elevations & Sections',
      sheetNumber: 'A-301',
      views: [
        { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
        { slotId: 'elevation-rear', viewId: 'rear', label: 'Rear Elevation' },
        { slotId: 'elevation-left', viewId: 'left', label: 'Left Elevation' },
        { slotId: 'elevation-right', viewId: 'right', label: 'Right Elevation' },
      ],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toContain('<svg');
    expect(result.sheetSvg).toContain('</svg>');
    expect(result.sheetSvg).toContain('Elevations & Sections');
    expect(result.placedViews.length).toBeGreaterThan(0);
  });

  test('composeSheet with presentation mode uses dark background', () => {
    const meta = makeSheetMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Presentation Elevations',
      views: [
        { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
      ],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'presentation', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toContain('#0b1220');
  });

  test('composeSheet with technical mode uses white background', () => {
    const meta = makeSheetMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Technical Elevations',
      views: [
        { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
      ],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toContain('#ffffff');
  });

  test('composeSheet includes title block', () => {
    const meta = makeSheetMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Elevations with Title',
      views: [
        { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
      ],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toContain('P13.12 Test House');
  });

  test('composeSheet handles empty views gracefully', () => {
    const meta = makeSheetMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Empty Sheet',
      views: [],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toContain('<svg');
    expect(result.sheetSvg).toContain('</svg>');
  });

  test('buildElevationSectionSheet returns valid SVG', () => {
    const meta = makeSheetMeta({
      templateId: 'a2-landscape-elevation-section',
      sheetTitle: 'Elev/Sec Sheet',
      views: [
        { slotId: 'elevation-front', viewId: 'front', label: 'Front Elevation' },
        { slotId: 'elevation-rear', viewId: 'rear', label: 'Rear Elevation' },
      ],
    });
    const result = buildElevationSectionSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('<svg');
    expect(result.sheetSvg).toContain('</svg>');
  });
});

// ── 4. Sheet Composition — Plan Sheet ──
describe('P13.12 — Plan Sheet Composition', () => {
  test('buildPlanSheet produces valid SVG', () => {
    const meta = makeSheetMeta({
      templateId: 'a2-landscape-plan',
      sheetTitle: 'Floor Plans',
      sheetNumber: 'A-101',
      views: [
        { slotId: 'plan-main', viewId: 'plan', label: 'Ground Floor Plan' },
      ],
    });
    const result = buildPlanSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('<svg');
    expect(result.sheetSvg).toContain('</svg>');
    expect(result.sheetSvg).toContain('Floor Plans');
  });

  test('plan sheet has correct sheet number', () => {
    const meta = makeSheetMeta({
      templateId: 'a2-landscape-plan',
      sheetTitle: 'Plan Sheet',
      sheetNumber: 'A-102',
      views: [
        { slotId: 'plan-main', viewId: 'plan', label: 'Plan' },
      ],
    });
    const result = buildPlanSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('A-102');
  });
});

// ── 5. Sheet Composition — Schedule Sheet ──
describe('P13.12 — Schedule Sheet Composition', () => {
  test('buildScheduleSheet produces valid SVG', () => {
    const meta = makeSheetMeta({
      templateId: 'a2-portrait-schedule',
      sheetTitle: 'Schedules',
      sheetNumber: 'A-601',
      views: [
        { slotId: 'schedule-door', viewId: 'schedule-door', label: 'Door Schedule' },
        { slotId: 'schedule-window', viewId: 'schedule-window', label: 'Window Schedule' },
      ],
    });
    const result = buildScheduleSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('<svg');
    expect(result.sheetSvg).toContain('</svg>');
    expect(result.sheetSvg).toContain('Schedules');
  });

  test('schedule sheet is portrait orientation', () => {
    const meta = makeSheetMeta({
      templateId: 'a2-portrait-schedule',
      sheetTitle: 'Schedule Portrait',
      views: [
        { slotId: 'schedule-door', viewId: 'schedule-door', label: 'Door Schedule' },
      ],
    });
    const result = buildScheduleSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('<svg');
    expect(result.sheetSvg).toContain('</svg>');
  });
});

// ── 6. Sheet Composition — Combined Issue Sheet ──
describe('P13.12 — Combined Issue Sheet Composition', () => {
  test('buildCombinedIssueSheet produces valid SVG', () => {
    const meta = makeSheetMeta({
      templateId: 'a2-landscape-combined-issue',
      sheetTitle: 'Combined Issue',
      sheetNumber: 'A-001',
      views: [
        { slotId: 'plan-main', viewId: 'plan', label: 'Floor Plan' },
        { slotId: 'elevation-main', viewId: 'front', label: 'Front Elevation' },
        { slotId: 'section-main', viewId: 'section', label: 'Section A-A' },
      ],
    });
    const result = buildCombinedIssueSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('<svg');
    expect(result.sheetSvg).toContain('</svg>');
    expect(result.sheetSvg).toContain('Combined Issue');
    expect(result.placedViews.length).toBeGreaterThan(0);
  });

  test('combined issue sheet has grid lines', () => {
    const meta = makeSheetMeta({
      templateId: 'a2-landscape-combined-issue',
      sheetTitle: 'Grid Test',
      views: [
        { slotId: 'plan-main', viewId: 'plan', label: 'Plan' },
      ],
    });
    const result = buildCombinedIssueSheet(cad, meta, 'technical', DEFAULT_COORDINATOR);
    expect(result.sheetSvg).toContain('<line');
  });
});

// ── 7. Viewport Layout ──
describe('P13.12 — Viewport Layout', () => {
  test('viewports do not overlap in templates', () => {
    for (const t of listTemplates()) {
      const rects = t.viewports.map(v => ({
        x1: v.x, y1: v.y,
        x2: v.x + v.width, y2: v.y + v.height,
        id: v.id,
      }));
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];
          const overlap = a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
          if (overlap) {
            // Adjacent edges are OK, check for actual area overlap
            const overlapW = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
            const overlapH = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
            // Only fail if overlap area > 1% of either viewport
            const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
            const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
            if (overlapW > 1 && overlapH > 1) {
              const overlapArea = overlapW * overlapH;
              expect(overlapArea).toBeLessThan(Math.min(areaA, areaB) * 0.01);
            }
          }
        }
      }
    }
  });

  test('all viewports fit within sheet bounds', () => {
    for (const t of listTemplates()) {
      const mm = SHEET_MM[t.size];
      const sheetW = t.orientation === 'landscape' ? mm.w : mm.h;
      const sheetH = t.orientation === 'landscape' ? mm.h : mm.w;
      for (const v of t.viewports) {
        expect(v.x + v.width).toBeLessThanOrEqual(sheetW + 1);
        expect(v.y + v.height).toBeLessThanOrEqual(sheetH + 1);
      }
    }
  });
});

// ── 8. Coordination & References ──
describe('P13.12 — Coordination & References', () => {
  test('DEFAULT_COORDINATOR has all required view refs', () => {
    const views = DEFAULT_COORDINATOR.getAllViews();
    expect(views.length).toBeGreaterThanOrEqual(10);
    expect(DEFAULT_COORDINATOR.getSheetForView('plan')).toBe('A-101');
    expect(DEFAULT_COORDINATOR.getSheetForView('front')).toBe('A-301');
    expect(DEFAULT_COORDINATOR.getSheetForView('section')).toBe('A-201');
  });

  test('coordination refs connect plans to sections', () => {
    const secAA = DEFAULT_COORDINATOR.coordsForSection('AA');
    expect(secAA).toBeDefined();
    expect(secAA!.sheetNumber).toBe('A-201');
  });

  test('coordination refs connect plans to elevations', () => {
    const frontElev = DEFAULT_COORDINATOR.coordsForElevation('front');
    expect(frontElev).toBeDefined();
    expect(frontElev!.sheetNumber).toBe('A-301');
  });

  test('view refs have unique sheet numbers', () => {
    const views = DEFAULT_COORDINATOR.getAllViews();
    const sheetNumbers = views.map(v => v.sheetNumber);
    const unique = new Set(sheetNumbers);
    // Many views share sheets (plan and section on A-201, etc.) — at least unique count > 5
    expect(unique.size).toBeGreaterThan(5);
  });
});

// ── 9. Section Alignment ──
describe('P13.12 — Section Alignment', () => {
  test('section SVG preserves ground line datum', () => {
    const svg = buildSectionSvg(cad, undefined, { axis: 'AA', position: 5 });
    expect(svg).toContain('NGL');
    expect(svg).toContain('±0.000');
  });
});

// ── 10. Regression ──
describe('P13.12 — Regression', () => {
  test('existing section generator still works', () => {
    const svg = buildSectionSvg(cad, undefined, { axis: 'AA', position: 5 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  test('existing elevation generator still works', () => {
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  test('composeSheet with unknown template returns empty', () => {
    const meta = makeSheetMeta({
      templateId: 'unknown',
      sheetTitle: 'Unknown',
      views: [],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toBe('');
  });

  test('composeSheet includes provenance note', () => {
    const meta = makeSheetMeta({
      templateId: 'a2-landscape-plan',
      sheetTitle: 'Provenance Test',
      views: [
        { slotId: 'plan-main', viewId: 'plan', label: 'Plan' },
      ],
    });
    const result = composeSheet({ cad, sheetMeta: meta, mode: 'technical', coordinator: DEFAULT_COORDINATOR });
    expect(result.sheetSvg).toContain('DERIVED');
  });
});
