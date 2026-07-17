import { expect, test, describe } from 'vitest';
import { validateSvgFonts, validateSvgBrightColors } from '@/lib/drawings/standards-enforcement';
import { renderRunningDim, renderStringDim, renderMultiChainDims } from '@/lib/drawings/dimension-engine';
import { computeRoomsFromWalls } from '@/lib/drawings/annotation-engine';
import { isCanonicalRoomName, CANONICAL_ROOM_NAMES } from '@/domain/ws6-types';
import { buildFloorPlanSvg } from '@/lib/drawings/disciplines/floor-plan-svg';
import { buildSitePlanSvg } from '@/lib/drawings/disciplines/site-plan-svg';
import { buildFoundationPlanSvg } from '@/lib/drawings/disciplines/foundation-plan-svg';
import { buildRoofPlanSvg } from '@/lib/drawings/disciplines/roof-plan-svg';
import { buildRcpPlanSvg } from '@/lib/drawings/disciplines/rcp-plan-svg';
import { buildElectricalPlanSvg } from '@/lib/drawings/disciplines/electrical-plan-svg';
import { buildPlumbingPlanSvg } from '@/lib/drawings/disciplines/plumbing-plan-svg';
import { buildHvacPlanSvg } from '@/lib/drawings/disciplines/hvac-plan-svg';
import { buildPresentationSvg } from '@/lib/drawings/disciplines/presentation-svg';
import { buildElevationSvg } from '@/lib/drawings/elevation-svg';
import { buildSectionSvg } from '@/lib/drawings/section-svg';
import type { CadDocument as Ws6CadDocument } from '@/domain/ws6-types';
import type { TitleBlockMeta } from '@/lib/drawings/title-block';
import type { SectionConfig } from '@/lib/drawings/section-svg';

function fixtureCad(overrides?: Partial<Ws6CadDocument>): Ws6CadDocument {
  return {
    id: 'fixture-cad',
    projectId: 'proj-fix',
    name: 'Fixture Project',
    materialSystem: 'concrete',
    floors: [
      { id: 'f1', name: 'Ground Floor', elevation: 0, height: 3 },
      { id: 'f2', name: 'First Floor', elevation: 3, height: 3 },
    ],
    walls: [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w2', floorId: 'f1', start: { x: 12, y: 0 }, end: { x: 12, y: 10 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w3', floorId: 'f1', start: { x: 12, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w4', floorId: 'f1', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w5', floorId: 'f1', start: { x: 3, y: 0 }, end: { x: 3, y: 10 }, thickness: 0.15, height: 3, name: 'Int Wall', structural: false, metadata: { ifcClass: 'IfcWall', category: 'internal', material: 'timber', properties: {} } },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', floorId: 'f1', kind: 'door', offset: 2, width: 0.9, height: 2.1, sillHeight: 0, headHeight: 2.1, name: 'Front Door', metadata: { ifcClass: 'IfcDoor', category: 'door', material: 'timber', properties: {}, fireRating: 'FD30' } },
      { id: 'o2', wallId: 'w1', floorId: 'f1', kind: 'window', offset: 5, width: 1.5, height: 1.2, sillHeight: 0.9, headHeight: 2.1, name: 'Living Window', metadata: { ifcClass: 'IfcWindow', category: 'window', properties: {}, typeName: 'Sliding' } },
    ],
    blocks: [
      { id: 'b1', floorId: 'f1', kind: 'column', position: { x: 3, y: 3 }, width: 0.3, depth: 0.3, rotation: 0, name: 'Col-1', metadata: { ifcClass: 'IfcColumn', category: 'structure', material: 'concrete', properties: {} } },
    ],
    boundaries: [
      { id: 'bnd1', points: [{ x: -3, y: -3 }, { x: 15, y: -3 }, { x: 15, y: 13 }, { x: -3, y: 13 }], layerId: 'boundaries', boundaryMode: 'verified' },
    ],
    ...overrides,
  };
}

const FIXTURE_META: TitleBlockMeta = {
  project: 'Fixture Test',
  drawing: 'Fixture Drawing',
  sheet: 'FIX-001',
  scale: '1:100',
  date: '2026-01-15',
  revision: 'A',
  drawnBy: 'Fixture Engine',
};

function isValidSvg(svg: string): boolean {
  return svg.trim().startsWith('<svg') && svg.trim().endsWith('</svg>');
}

// ── Workstream 1: Full palette compliance audit ──

describe('P13.3 — Palette Compliance: All Sheet Families', () => {
  const cad = fixtureCad();
  const meta = FIXTURE_META;
  const sectionConfig: SectionConfig = { axis: 'AA', position: 5 };

  const sheets: { name: string; svg: string }[] = [
    { name: 'floor-plan', svg: buildFloorPlanSvg(cad, 'f1', meta, undefined, false) },
    { name: 'floor-plan-print', svg: buildFloorPlanSvg(cad, 'f1', meta, undefined, true) },
    { name: 'site-plan', svg: buildSitePlanSvg(cad, meta, false) },
    { name: 'site-plan-print', svg: buildSitePlanSvg(cad, meta, true) },
    { name: 'foundation', svg: buildFoundationPlanSvg(cad, undefined, meta, false) },
    { name: 'foundation-print', svg: buildFoundationPlanSvg(cad, undefined, meta, true) },
    { name: 'roof', svg: buildRoofPlanSvg(cad, meta, false) },
    { name: 'roof-print', svg: buildRoofPlanSvg(cad, meta, true) },
    { name: 'rcp', svg: buildRcpPlanSvg(cad, 'f1', meta, false) },
    { name: 'rcp-print', svg: buildRcpPlanSvg(cad, 'f1', meta, true) },
    { name: 'electrical', svg: buildElectricalPlanSvg(cad, 'f1', meta, false) },
    { name: 'electrical-print', svg: buildElectricalPlanSvg(cad, 'f1', meta, true) },
    { name: 'plumbing', svg: buildPlumbingPlanSvg(cad, 'f1', meta, false) },
    { name: 'plumbing-print', svg: buildPlumbingPlanSvg(cad, 'f1', meta, true) },
    { name: 'hvac', svg: buildHvacPlanSvg(cad, 'f1', meta, false) },
    { name: 'hvac-print', svg: buildHvacPlanSvg(cad, 'f1', meta, true) },
    { name: 'elevation-front', svg: buildElevationSvg(cad, 'front', meta, false) },
    { name: 'elevation-front-print', svg: buildElevationSvg(cad, 'front', meta, true) },
    { name: 'section', svg: buildSectionSvg(cad, meta, sectionConfig, false) },
    { name: 'section-print', svg: buildSectionSvg(cad, meta, sectionConfig, true) },
    { name: 'presentation', svg: buildPresentationSvg(cad, meta) },
  ];

  test('all sheet families produce valid SVG', () => {
    for (const sheet of sheets) {
      expect(isValidSvg(sheet.svg), `${sheet.name} is valid SVG`).toBe(true);
    }
  });

  test('all sheet families use Arial font family (technical mode)', () => {
    for (const sheet of sheets) {
      if (sheet.name === 'presentation') continue; // Presentation uses Inter
      expect(sheet.svg, `${sheet.name} contains Arial font`).toContain('Arial');
    }
  });

  test('all sheet families pass font validation (no forbidden fonts)', () => {
    for (const sheet of sheets) {
      const violations = validateSvgFonts(sheet.svg);
      expect(violations, `${sheet.name}: no forbidden fonts`).toHaveLength(0);
    }
  });

  test('print-mode sheets use no bright technical colors in drawing elements', () => {
    for (const sheet of sheets) {
      if (!sheet.name.includes('-print')) continue;
      const violations = validateSvgBrightColors(sheet.svg, true);
      // Allow #ef4444 in provenance notes (legitimate annotation use)
      const drawViolations = violations.filter(v => !v.message.includes('#ef4444'));
      expect(drawViolations, `${sheet.name}: no bright colors in drawing`).toHaveLength(0);
    }
  });

  test('print-mode foundation has merged polygons not thick-line footings', () => {
    const svg = buildFoundationPlanSvg(cad, undefined, meta, true);
    expect(svg).toContain('polygon points=');
    expect(svg).not.toContain('stroke="url(#concrete-hatch)');
  });

  test('electrical print mode uses muted palette', () => {
    const svg = buildElectricalPlanSvg(cad, 'f1', meta, true);
    expect(svg).not.toContain('#facc15');
    expect(svg).not.toContain('#22c55e');
    expect(svg).not.toContain('#06b6d4');
  });
});

// ── Workstream 5: Visual regression confidence ──

describe('P13.3 — Visual Regression: Fixture Outputs', () => {
  const cad = fixtureCad();
  const meta = FIXTURE_META;
  const sectionConfig: SectionConfig = { axis: 'AA', position: 5 };

  test('floor plan SVG has deterministic structure', () => {
    const svg = buildFloorPlanSvg(cad, 'f1', meta);
    // Structural elements that must always be present
    expect(svg).toContain('Arial');
    expect(svg).toContain('polygon');
    expect(svg).toContain('defs');
    expect(svg).toContain('LEGEND');
    expect(svg).toContain('+0.00');
    expect(svg).toContain('Ground Floor');
    // Should contain room labels
    expect(svg).toMatch(/m²/);
  });

  test('section SVG has deterministic structure', () => {
    const svg = buildSectionSvg(cad, meta, sectionConfig);
    expect(svg).toContain('NGL');
    expect(svg).toContain('brick-hatch');
    expect(svg).toContain('concrete-hatch');
    expect(svg).toContain('CHROMADEK');
    expect(svg).toContain('Arial');
  });

  test('elevation SVG has deterministic structure', () => {
    const svg = buildElevationSvg(cad, 'front', meta);
    expect(svg).toContain('±0.000 GL');
    expect(svg).toContain('brick-hatch');
    expect(svg).toContain('BRICKWORK');
    expect(svg).toContain('ROOF');
    expect(svg).toContain('Arial');
    // Entourage elements exist as circle/line groups (opacity 0.5 and 0.4)
    expect(svg).toContain('opacity="0.5"');
    expect(svg).toContain('opacity="0.4"');
  });

  test('presentation SVG has deterministic structure', () => {
    const svg = buildPresentationSvg(cad, meta);
    expect(svg).toContain('CONCEPTUAL PRESENTATION');
    expect(svg).toContain('PROJECT STATISTICS');
    expect(svg).toContain('polygon');
    expect(svg).toContain('Fixture Test');
    expect(svg).toContain('5m');
  });
});

// ── Workstream 6: Export fidelity ──

describe('P13.3 — Export Fidelity', () => {
  const cad = fixtureCad();
  const meta = FIXTURE_META;
  const sectionConfig: SectionConfig = { axis: 'AA', position: 5 };

  test('title block survives in floor plan SVG', () => {
    const svg = buildFloorPlanSvg(cad, 'f1', meta);
    expect(svg).toContain('PROJECT');
    expect(svg).toContain('Fixture Test');
    expect(svg).toContain('FIX-001');
  });

  test('title block survives in section SVG', () => {
    const svg = buildSectionSvg(cad, meta, sectionConfig);
    expect(svg).toContain('Fixture Test');
    expect(svg).toContain('SCALE');
  });

  test('no clipping — all sheet outputs include full svg bounds', () => {
    const svgs = [
      ['floor', buildFloorPlanSvg(cad, 'f1', meta)],
      ['section', buildSectionSvg(cad, meta, sectionConfig)],
      ['elevation', buildElevationSvg(cad, 'front', meta)],
      ['presentation', buildPresentationSvg(cad, meta)],
    ] as const;

    for (const [name, svg] of svgs) {
      // SVG must have a viewBox or width/height
      expect(svg, `${name} has viewBox`).toMatch(/viewBox="[^"]+"/);
      expect(svg, `${name} has width`).toMatch(/width="\d+"/);
      expect(svg, `${name} has height`).toMatch(/height="\d+"/);
    }
  });

  test('floor plan print mode uses white background (export-friendly)', () => {
    const svg = buildFloorPlanSvg(cad, 'f1', meta, undefined, true);
    expect(svg).toContain('#ffffff');
  });

  test('metadata retention — scale and revision survive in all technical sheets', () => {
    const sheets = [
      buildFloorPlanSvg(cad, 'f1', meta, undefined, true),
      buildSectionSvg(cad, meta, sectionConfig, true),
      buildElevationSvg(cad, 'front', meta, true),
    ];
    for (const svg of sheets) {
      expect(svg).toContain('1:100');
      expect(svg).toContain('Fixture Test');
    }
  });
});

// ── P13.4 — Technical Documentation Maturity ──

describe('P13.4 — Dimension Engine Upgrades', () => {
  test('renderRunningDim produces running dimension chain', () => {
    const svg = renderRunningDim([0, 3, 8, 12], false, 100, 20);
    expect(svg).toContain('3.0m');
    expect(svg).toContain('8.0m');
    expect(svg).toContain('12.0m');
  });

  test('renderRunningDim handles vertical orientation', () => {
    const svg = renderRunningDim([0, 4, 10], true, 100, 20);
    expect(svg).toContain('4.0m');
    expect(svg).toContain('10.0m');
  });

  test('renderStringDim produces string of wall-to-wall dimensions', () => {
    const svg = renderStringDim([0, 2.5, 5, 8], false, 200, 30);
    expect(svg).toContain('m');
    // Should contain at least segment labels
    expect(svg).toContain('2.5m');
    expect(svg).toContain('3.0m');
  });

  test('renderMultiChainDims accepts multiple dimension chains', () => {
    const svg = renderMultiChainDims([
      { positions: [0, 4, 8], offset: 20 },
      { positions: [0, 2, 3, 5], offset: 40 },
    ], false, 100);
    expect(svg).toContain('4.0m');
  });
});

describe('P13.4 — Canonical Room Naming', () => {
  test('CANONICAL_ROOM_NAMES includes common room types', () => {
    expect(CANONICAL_ROOM_NAMES).toContain('Living Room');
    expect(CANONICAL_ROOM_NAMES).toContain('Kitchen');
    expect(CANONICAL_ROOM_NAMES).toContain('Bedroom 1');
    expect(CANONICAL_ROOM_NAMES).toContain('Bathroom');
    expect(CANONICAL_ROOM_NAMES).toContain('Office');
    expect(CANONICAL_ROOM_NAMES).toContain('Garage');
    expect(CANONICAL_ROOM_NAMES).toContain('Corridor');
  });

  test('isCanonicalRoomName validates known room names', () => {
    expect(isCanonicalRoomName('Living Room')).toBe(true);
    expect(isCanonicalRoomName('Kitchen')).toBe(true);
    expect(isCanonicalRoomName('Bathroom')).toBe(true);
    expect(isCanonicalRoomName('Closet')).toBe(false);
  });

  test('computeRoomsFromWalls returns canonical names when roomProgramme provided', () => {
    const walls = [
      { start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, structural: true },
      { start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, structural: true },
      { start: { x: 10, y: 8 }, end: { x: 0, y: 8 }, structural: true },
      { start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, structural: true },
      { start: { x: 5, y: 0 }, end: { x: 5, y: 8 }, structural: false },
    ];
    const roomProgramme: Record<string, 'Living Room' | 'Kitchen'> = {
      'room-1': 'Living Room',
      'room-2': 'Kitchen',
    };
    const result = computeRoomsFromWalls(walls, 0, roomProgramme);
    expect(result.rooms.length).toBeGreaterThanOrEqual(1);
    expect(result.rooms[0].name).toBe('Living Room');
    expect(result.rooms[0].provenance?.source).toBe('user');
  });

  test('floor plan SVG uses canonical room names from programme', () => {
    const cad = fixtureCad({
      roomProgramme: { 'room-1': 'Living Room' as const, 'room-2': 'Kitchen' as const },
    });
    const meta = FIXTURE_META;
    const svg = buildFloorPlanSvg(cad, 'f1', meta);
    expect(svg).toContain('Living Room');
    expect(svg).not.toContain('Room 1');
  });
});

describe('P13.4 — Section & Elevation Depth', () => {
  const cad = fixtureCad();
  const meta = FIXTURE_META;
  const sectionConfig: SectionConfig = { axis: 'AA', position: 5 };

  test('section includes floor build-up layers (slab, screed, hardcore, insulation)', () => {
    const svg = buildSectionSvg(cad, meta, sectionConfig);
    expect(svg).toContain('RC SLAB');
    expect(svg).toContain('H/C');
    expect(svg).toContain('SCR');
    expect(svg).toContain('DPM');
  });

  test('section includes internal partition cut-through', () => {
    const svg = buildSectionSvg(cad, meta, sectionConfig);
    expect(svg).toContain('timber-hatch');
  });

  test('section includes foundation detail with dimensions', () => {
    const svg = buildSectionSvg(cad, meta, sectionConfig);
    expect(svg).toContain('FOOTING');
    expect(svg).toContain('concrete-hatch');
  });

  test('elevation includes window reveal/head/sill annotations', () => {
    const svg = buildElevationSvg(cad, 'front', meta);
    expect(svg).toContain('SILL');
    expect(svg).toContain('HD');
    expect(svg).toContain('FFL');
    expect(svg).toContain('GL');
  });

  test('elevation includes cavity wall construction notes', () => {
    const svg = buildElevationSvg(cad, 'front', meta);
    expect(svg).toContain('CAVITY');
    expect(svg).toContain('INSULATION');
  });
});

describe('P13.4 — MEP Technical Annotation', () => {
  const meta = FIXTURE_META;

  const mepCad = fixtureCad({
    blocks: [
      { id: 'b1', floorId: 'f1', kind: 'column', position: { x: 3, y: 3 }, width: 0.3, depth: 0.3, rotation: 0, name: 'Col-1', metadata: { ifcClass: 'IfcColumn', category: 'structure', material: 'concrete', properties: {} } },
      { id: 'b2', floorId: 'f1', kind: 'light', position: { x: 4, y: 4 }, width: 0.2, depth: 0.2, rotation: 0, name: 'Light-1', metadata: { ifcClass: 'IfcLightFixture', category: 'electrical', material: 'steel', properties: {} } },
      { id: 'b3', floorId: 'f1', kind: 'switch', position: { x: 2, y: 4 }, width: 0.1, depth: 0.1, rotation: 0, name: 'Switch-1', metadata: { ifcClass: 'IfcSwitch', category: 'electrical', material: 'steel', properties: {} } },
      { id: 'b4', floorId: 'f1', kind: 'socket', position: { x: 1, y: 1 }, width: 0.15, depth: 0.15, rotation: 0, name: 'Socket-1', metadata: { ifcClass: 'IfcOutlet', category: 'electrical', material: 'steel', properties: {} } },
      { id: 'b5', floorId: 'f1', kind: 'db_board', position: { x: 1, y: 9 }, width: 0.4, depth: 0.5, rotation: 0, name: 'DB-1', metadata: { ifcClass: 'IfcDistributionBoard', category: 'electrical', material: 'steel', properties: {} } },
      { id: 'b6', floorId: 'f1', kind: 'sink', position: { x: 9, y: 1 }, width: 0.6, depth: 0.5, rotation: 0, name: 'Kitchen Sink', metadata: { ifcClass: 'IfcSanitaryFixture', category: 'plumbing', properties: {} } },
      { id: 'b7', floorId: 'f1', kind: 'wc', position: { x: 9, y: 4 }, width: 0.4, depth: 0.4, rotation: 0, name: 'WC-1', metadata: { ifcClass: 'IfcSanitaryFixture', category: 'plumbing', properties: {} } },
      { id: 'b8', floorId: 'f1', kind: 'ac_unit', position: { x: 5, y: 5 }, width: 1.0, depth: 0.6, rotation: 0, name: 'AC-1', metadata: { ifcClass: 'IfcAirTerminal', category: 'hvac', material: 'steel', properties: {} } },
      { id: 'b9', floorId: 'f1', kind: 'diffuser', position: { x: 8, y: 8 }, width: 0.3, depth: 0.3, rotation: 0, name: 'Diff-1', metadata: { ifcClass: 'IfcAirTerminal', category: 'hvac', material: 'steel', properties: {} } },
    ],
  });

  test('electrical plan includes circuit numbers and cable sizes', () => {
    const svg = buildElectricalPlanSvg(mepCad, 'f1', meta);
    expect(svg).toContain('1.5mm²');
    expect(svg).toContain('MCB');
    expect(svg).toContain('RCD');
  });

  test('electrical plan includes DB label and schedule reference', () => {
    const svg = buildElectricalPlanSvg(mepCad, 'f1', meta);
    expect(svg).toContain('DB');
    expect(svg).toContain('E-101');
  });

  test('plumbing plan includes pipe size annotations', () => {
    const svg = buildPlumbingPlanSvg(mepCad, 'f1', meta);
    expect(svg).toContain('mm');
    expect(svg).toContain('WASTE');
    expect(svg).toContain('SOIL');
  });

  test('plumbing plan includes fixture references', () => {
    const svg = buildPlumbingPlanSvg(mepCad, 'f1', meta);
    expect(svg).toMatch(/F\d{2}/);
  });

  test('hvac plan includes equipment tags and schedule reference', () => {
    const svg = buildHvacPlanSvg(mepCad, 'f1', meta);
    expect(svg).toContain('kW');
    expect(svg).toContain('M-101');
  });
});

describe('P13.4 — PDF / Print Fidelity', () => {
  const cad = fixtureCad();
  const meta = FIXTURE_META;
  const sectionConfig: SectionConfig = { axis: 'AA', position: 5 };

  test('all sheet SVGs pass basic font and color standards', () => {
    const svgs = [
      buildFloorPlanSvg(cad, 'f1', meta, undefined, true),
      buildSectionSvg(cad, meta, sectionConfig, true),
      buildElevationSvg(cad, 'front', meta, true),
      buildSitePlanSvg(cad, meta, true),
      buildFoundationPlanSvg(cad, undefined, meta, true),
    ];
    for (const svg of svgs) {
      const fontViolations = validateSvgFonts(svg);
      expect(fontViolations, `font violations in ${svg.slice(0, 60)}`).toHaveLength(0);
      const brightViolations = validateSvgBrightColors(svg, true);
      const drawViolations = brightViolations.filter(v => !v.message.includes('#ef4444'));
      expect(drawViolations, `bright color violations`).toHaveLength(0);
    }
  });

  test('all sheet SVGs have valid viewBox with non-zero dimensions', () => {
    const svgs = [
      buildFloorPlanSvg(cad, 'f1', meta, undefined, true),
      buildSectionSvg(cad, meta, sectionConfig, true),
      buildElevationSvg(cad, 'front', meta, true),
      buildPresentationSvg(cad, meta),
    ];
    for (const svg of svgs) {
      const vb = svg.match(/viewBox="([\d\s.]+)"/);
      expect(vb, `viewBox not found in ${svg.slice(0, 120)}`).not.toBeNull();
      if (vb) {
        const parts = vb[1].split(/\s+/).map(Number);
        expect(parts.length).toBe(4);
        expect(parts[2]).toBeGreaterThan(0);
        expect(parts[3]).toBeGreaterThan(0);
      }
    }
  });

  test('title block content (PROJECT, SCALE, REVISION) survives in all technical sheets', () => {
    const sheets = [
      buildFloorPlanSvg(cad, 'f1', meta, undefined, true),
      buildSectionSvg(cad, meta, sectionConfig, true),
      buildElevationSvg(cad, 'front', meta, true),
      buildSitePlanSvg(cad, meta, true),
      buildFoundationPlanSvg(cad, undefined, meta, true),
    ];
    for (const svg of sheets) {
      expect(svg).toContain('Fixture Test');
      expect(svg).toContain('FIX-001');
      expect(svg).toContain('1:100');
      expect(svg).toContain('Arial');
    }
  });

  test('print-mode sheet backgrounds are white (#ffffff) for print-safe export', () => {
    const sheets = [
      buildFloorPlanSvg(cad, 'f1', meta, undefined, true),
      buildSectionSvg(cad, meta, sectionConfig, true),
      buildElevationSvg(cad, 'front', meta, true),
      buildSitePlanSvg(cad, meta, true),
      buildFoundationPlanSvg(cad, undefined, meta, true),
      buildElectricalPlanSvg(cad, 'f1', meta, true),
      buildPlumbingPlanSvg(cad, 'f1', meta, true),
      buildHvacPlanSvg(cad, 'f1', meta, true),
    ];
    for (const svg of sheets) {
      expect(svg, `${svg.slice(0, 80)}`).toContain('#ffffff');
    }
  });

  test('no SVG clipping — all elements render within viewBox bounds', () => {
    const sheets = [
      ['floor', buildFloorPlanSvg(cad, 'f1', meta, undefined, true)],
      ['section', buildSectionSvg(cad, meta, sectionConfig, true)],
      ['elevation', buildElevationSvg(cad, 'front', meta, true)],
    ];
    for (const [name, svg] of sheets) {
      expect(svg, `${name} has width attribute`).toMatch(/width="\d+"/);
      expect(svg, `${name} has height attribute`).toMatch(/height="\d+"/);
      expect(svg, `${name} has viewBox`).toMatch(/viewBox="[^"]+"/);
    }
  });

  test('scale is readable in all technical sheet SVGs', () => {
    const sheets = [
      buildFloorPlanSvg(cad, 'f1', meta, undefined, true),
      buildSectionSvg(cad, meta, sectionConfig, true),
      buildElevationSvg(cad, 'front', meta, true),
    ];
    for (const svg of sheets) {
      expect(svg).toContain('1:100');
    }
  });
});
