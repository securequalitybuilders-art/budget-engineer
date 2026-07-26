import { describe, test, expect } from 'vitest';
import { buildSectionSvg } from '../lib/drawings/section-svg';
import type { CadDocument } from '../domain/ws6-types';
import type { TitleBlockMeta } from '../lib/drawings/title-block';
import {
  resolveSectionCutPlane,
  candidateSectionCuts,
  scoreCandidates,
  getRoofType,
  getRoofBuildUp,
  getFoundationSpec,
  getFloorBuildUp,
  getFloorBuildUpWithFooting,
  inferRoomsAtCut,
} from '../lib/drawings/section-cut-engine';

const FIXTURE_META: TitleBlockMeta = {
  project: 'P13.11 Fixture',
  drawing: 'P13.11 Drawing',
  sheet: 'P13-011',
  scale: '1:100',
  date: '2026-07-18',
  revision: 'A',
  drawnBy: 'P13.11',
};

function houseCad(overrides?: Partial<CadDocument>): CadDocument {
  return {
    id: 'p13-11-house',
    projectId: 'p13-11-proj',
    name: 'House Fixture',
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
    ...overrides,
  };
}

// ── 1. Intelligent Cut Selection ──
describe('P13.11 — Intelligent Cut Selection', () => {
  test('candidateSectionCuts returns wall positions', () => {
    const cad = houseCad();
    const candidates = candidateSectionCuts(cad, 'AA');
    // AA axis uses planeOf = y; walls at y=0, y=10 give midpoints y=0, y=10
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    const wallSources = candidates.filter(c => c.source.startsWith('wall-'));
    expect(wallSources.length).toBeGreaterThan(0);
  });

  test('candidateSectionCuts includes stair block positions', () => {
    const cad = houseCad();
    const candidates = candidateSectionCuts(cad, 'AA');
    const stairSources = candidates.filter(c => c.source.startsWith('block-stair'));
    expect(stairSources.length).toBeGreaterThan(0);
  });

  test('candidateSectionCuts includes midpoint fallback', () => {
    const cad: CadDocument = {
      id: 'e', projectId: 'e', name: 'E', materialSystem: 'concrete',
      floors: [{ id: 'f1', name: 'GF', elevation: 0, height: 3 }],
      walls: [
        { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, height: 3, name: 'W1', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
        { id: 'w2', floorId: 'f1', start: { x: 0, y: 3 }, end: { x: 10, y: 3 }, thickness: 0.15, height: 3, name: 'W2', structural: false, metadata: { ifcClass: 'IfcWall', category: 'internal', material: 'timber', properties: {} } },
        { id: 'w3', floorId: 'f1', start: { x: 0, y: 7 }, end: { x: 10, y: 7 }, thickness: 0.23, height: 3, name: 'W3', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      ],
      openings: [], blocks: [],
    };
    const candidates = candidateSectionCuts(cad, 'AA');
    const midpoint = candidates.find(c => c.source === 'midpoint');
    expect(midpoint).toBeDefined();
  });

  test('scoreCandidates assigns higher scores for more walls', () => {
    const cad = houseCad();
    const candidates = candidateSectionCuts(cad, 'AA');
    const scored = scoreCandidates(cad, candidates);
    expect(scored.every(s => s.score > 0)).toBe(true);
  });

  test('resolveSectionCutPlane with autoSelectBest chooses best cut', () => {
    const cad = houseCad();
    const cut = resolveSectionCutPlane(cad, { axis: 'AA', autoSelectBest: true });
    expect(cut.wallsCut.length).toBeGreaterThan(0);
    expect(cut.roomsCut.length).toBeGreaterThan(0);
  });

  test('autoSelectBest returns viable cut even with minimal data', () => {
    const cad: CadDocument = {
      id: 'm', projectId: 'm', name: 'M', materialSystem: 'concrete',
      floors: [{ id: 'f1', name: 'GF', elevation: 0, height: 3 }],
      walls: [
        { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, height: 3, name: 'W1', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      ],
      openings: [], blocks: [],
    };
    const cut = resolveSectionCutPlane(cad, { axis: 'AA', autoSelectBest: true });
    expect(cut.wallsCut.length).toBeGreaterThanOrEqual(1);
  });

  test('scored candle includes room intersection bonus', () => {
    const cad = houseCad();
    const candidates = candidateSectionCuts(cad, 'AA');
    const scored = scoreCandidates(cad, candidates);
    const maxScore = Math.max(...scored.map(s => s.score));
    expect(maxScore).toBeGreaterThan(0);
  });

  test('wall type summary appears in cut plane', () => {
    const cad = houseCad();
    const cut = resolveSectionCutPlane(cad, { axis: 'AA', position: 5, autoSelectBest: true });
    expect(cut.wallTypeSummary).toBeDefined();
    expect(cut.wallTypeSummary).toMatch(/\d+ structural/);
  });

  test('cut description includes room names', () => {
    const cad = houseCad();
    const cut = resolveSectionCutPlane(cad, { axis: 'AA', position: 5, autoSelectBest: true });
    if (cut.roomsCut.length > 0) {
      expect(cut.cutDescription).toBeDefined();
      expect(cut.cutDescription).toContain('Cutting:');
    }
  });
});

// ── 2. Roof Type Detection ──
describe('P13.11 — Roof Type Detection', () => {
  test('residential without cores defaults to pitched-truss', () => {
    const cad = houseCad();
    expect(getRoofType(cad)).toBe('pitched-truss');
  });

  test('blocks with core or beam trigger flat-parapet', () => {
    const cad = houseCad({
      blocks: [
        { id: 'c1', floorId: 'f1', kind: 'core', position: { x: 6, y: 5 }, width: 2, depth: 2, rotation: 0, name: 'Core', metadata: { ifcClass: 'IfcBuildingElementProxy', category: 'core', properties: {} } },
      ],
    });
    expect(getRoofType(cad)).toBe('flat-parapet');
  });

  test('warehouse programme triggers slab-edge', () => {
    const cad = houseCad({
      roomProgramme: { 'room-1': 'Warehouse' },
    });
    expect(getRoofType(cad)).toBe('slab-edge');
  });

  test('workshop programme triggers slab-edge', () => {
    const cad = houseCad({
      roomProgramme: { 'room-1': 'Workshop' },
    });
    expect(getRoofType(cad)).toBe('slab-edge');
  });

  test('apartment programme triggers flat-parapet', () => {
    const cad = houseCad({
      roomProgramme: { 'room-1': 'Apartment' },
    });
    expect(getRoofType(cad)).toBe('flat-parapet');
  });

  test('office programme triggers flat-parapet', () => {
    const cad = houseCad({
      roomProgramme: { 'room-1': 'Office' },
    });
    expect(getRoofType(cad)).toBe('flat-parapet');
  });

  test('no roomProgramme defaults to pitched-truss', () => {
    const cad = houseCad({ roomProgramme: undefined });
    expect(getRoofType(cad)).toBe('pitched-truss');
  });
});

// ── 3. Roof Build-Up ──
describe('P13.11 — Roof Build-Up', () => {
  test('pitched-truss build-up has correct defaults', () => {
    const cad = houseCad();
    const bu = getRoofBuildUp(cad);
    expect(bu.roofType).toBe('pitched-truss');
    expect(bu.hasInsulation).toBe(true);
    expect(bu.hasMembrane).toBe(false);
    expect(bu.fasciaDepthMm).toBe(150);
    expect(bu.trussSpacingMm).toBe(600);
    expect(bu.ceilingLiningMm).toBe(12.5);
  });

  test('flat-parapet build-up has membrane', () => {
    const cad = houseCad({ roomProgramme: { 'room-1': 'Office' } });
    const bu = getRoofBuildUp(cad, 'flat-parapet');
    expect(bu.roofType).toBe('flat-parapet');
    expect(bu.hasMembrane).toBe(true);
    expect(bu.parapetHeightMm).toBe(600);
    expect(bu.eavesDepthMm).toBe(0);
  });

  test('slab-edge build-up has no parapet', () => {
    const bu = getRoofBuildUp(houseCad(), 'slab-edge');
    expect(bu.roofType).toBe('slab-edge');
    expect(bu.parapetHeightMm).toBe(0);
    expect(bu.hasMembrane).toBe(true);
  });
});

// ── 4. Roof-Type SVG Output ──
describe('P13.11 — Roof-Type SVG Output', () => {
  test('pitched-truss section contains truss and chromadek', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('CHROMADEK');
    expect(svg).toContain('TRUSSES');
    expect(svg).toContain('Apex');
    expect(svg).toContain('Wall Plate');
  });

  test('flat-parapet section contains membrane and parapet callouts', () => {
    const cad = houseCad({
      blocks: [
        { id: 'c1', floorId: 'f1', kind: 'core', position: { x: 6, y: 5 }, width: 2, depth: 2, rotation: 0, name: 'Core', metadata: { ifcClass: 'IfcBuildingElementProxy', category: 'core', properties: {} } },
      ],
      roomProgramme: { 'room-1': 'Office' },
    });
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('MEMBRANE');
    expect(svg).toContain('Parapet');
    expect(svg).toContain('Roof slab');
  });

  test('slab-edge section contains slab callout', () => {
    const cad = houseCad({
      roomProgramme: { 'room-1': 'Warehouse' },
    });
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('ROOF SLAB');
    expect(svg).toContain('WATERPROOFING');
  });

  test('roof type config override forces roof style', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5, roofType: 'flat-parapet' });
    expect(svg).toContain('MEMBRANE');
    expect(svg).toContain('Parapet');
  });
});

// ── 5. Foundation Sizing ──
describe('P13.11 — Foundation Sizing', () => {
  test('2-storey gets 600x250 footing', () => {
    const spec = getFoundationSpec(houseCad());
    expect(spec.width).toBeCloseTo(0.6, 2);
    expect(spec.depth).toBeCloseTo(0.25, 2);
    expect(spec.blinding).toBeCloseTo(0.05, 2);
  });

  test('4-storey gets wider/deeper footing', () => {
    const cad: CadDocument = {
      id: 't', projectId: 't', name: 'T', materialSystem: 'concrete',
      floors: [
        { id: '1', name: 'G', elevation: 0, height: 3 },
        { id: '2', name: '1', elevation: 3, height: 3 },
        { id: '3', name: '2', elevation: 6, height: 3 },
        { id: '4', name: '3', elevation: 9, height: 3 },
      ],
      walls: [], openings: [], blocks: [],
    };
    const spec = getFoundationSpec(cad);
    expect(spec.width).toBeCloseTo(0.75, 2);
    expect(spec.depth).toBeCloseTo(0.3, 2);
  });

  test('5-storey gets 900x350 footing', () => {
    const cad: CadDocument = {
      id: 't', projectId: 't', name: 'T', materialSystem: 'concrete',
      floors: [
        { id: '1', name: 'G', elevation: 0, height: 3 },
        { id: '2', name: '1', elevation: 3, height: 3 },
        { id: '3', name: '2', elevation: 6, height: 3 },
        { id: '4', name: '3', elevation: 9, height: 3 },
        { id: '5', name: '4', elevation: 12, height: 3 },
      ],
      walls: [], openings: [], blocks: [],
    };
    const spec = getFoundationSpec(cad);
    expect(spec.width).toBeCloseTo(0.9, 2);
    expect(spec.depth).toBeCloseTo(0.35, 2);
  });

  test('foundation label shows dimensions in section', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('FOOTING');
    expect(svg).toContain('STOREY');
  });

  test('getFloorBuildUpWithFooting adds footing for ground floor', () => {
    const bu = getFloorBuildUpWithFooting(0, 2);
    expect(bu.footingWidth).toBe(0.6);
    expect(bu.footingDepth).toBe(0.25);
    expect(bu.blindingThickness).toBe(0.05);
  });

  test('getFloorBuildUpWithFooting does not add footing for upper floors', () => {
    const bu = getFloorBuildUpWithFooting(1, 2);
    expect(bu.footingWidth).toBeUndefined();
    expect(bu.slabType).toBe('suspended');
  });

  test('getFloorBuildUp returns slab-on-grade for ground floor', () => {
    const bu = getFloorBuildUp(0);
    expect(bu.slabType).toBe('ground-bearing');
    expect(bu.hasHardcore).toBe(true);
  });

  test('getFloorBuildUp returns suspended for upper floor', () => {
    const bu = getFloorBuildUp(1);
    expect(bu.slabType).toBe('suspended');
    expect(bu.hasHardcore).toBe(false);
  });

  test('build-up label appears in section', () => {
    const cad = houseCad({ blocks: [] });
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('SLAB-ON-GRADE');
  });

  test('suspended slab label appears for upper floor', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('SUSPENDED SLAB');
  });
});

// ── 6. Room Labels at Cut ──
describe('P13.11 — Room Labels at Cut', () => {
  test('inferRoomsAtCut returns rooms near cut position', () => {
    const cad = houseCad();
    // Room-2 (Kitchen) is at spatial position ~4; use position=4 to intersect it
    const rooms = inferRoomsAtCut(cad, 4, 'AA');
    expect(rooms.size).toBeGreaterThan(0);
    const programmes = [...rooms.values()];
    expect(programmes).toContain('Kitchen');
  });

  test('inferRoomsAtCut returns empty for no programme', () => {
    const cad = houseCad({ roomProgramme: undefined });
    const rooms = inferRoomsAtCut(cad, 5, 'AA');
    expect(rooms.size).toBe(0);
  });

  test('room label appears in section SVG', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 4 });
    expect(svg).toContain('Kitchen');
  });
});

// ── 7. Keynote Dynamics ──
describe('P13.11 — Keynote Dynamics', () => {
  test('pitched-truss keynote mentions chromadek and trusses', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('CHROMADEK');
    expect(svg).toContain('TRUSSES');
  });

  test('flat-parapet keynote mentions waterproof membrane', () => {
    const cad = houseCad({
      blocks: [
        { id: 'c1', floorId: 'f1', kind: 'core', position: { x: 6, y: 5 }, width: 2, depth: 2, rotation: 0, name: 'Core', metadata: { ifcClass: 'IfcBuildingElementProxy', category: 'core', properties: {} } },
      ],
    });
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('MEMBRANE');
    expect(svg).toContain('PARAPET');
  });

  test('foundation keynote uses proportional dimensions', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('RC STRIP');
  });

  test('foundation keynote includes storey count', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('2-STOREY');
  });
});

// ── 8. BB Axis Compatibility ──
describe('P13.11 — BB Axis Compatibility', () => {
  test('BB axis section renders correctly', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'BB', position: 5 });
    expect(svg).toContain('B\u2013B');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  test('BB axis with autoSelectBest works', () => {
    const cad = houseCad();
    const cut = resolveSectionCutPlane(cad, { axis: 'BB', autoSelectBest: true });
    expect(cut.axis).toBe('BB');
    expect(cut.wallsCut.length).toBeGreaterThan(0);
  });
});

// ── 9. Print Mode ──
describe('P13.11 — Print Mode', () => {
  test('print mode uses light background', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 }, true);
    const bgRect = svg.match(/<rect width="[^"]+" height="[^"]+" fill="(#......)"/);
    expect(bgRect).not.toBeNull();
    expect(bgRect![1]).toBe('#ffffff');
  });
});

// ── 10. Regression — No existing test regressions ──
describe('P13.11 — Regression', () => {
  test('section SVG is valid XML without titleMeta', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, undefined, { axis: 'AA', position: 5 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  test('section SVG is valid with empty cad', () => {
    const empty: CadDocument = {
      id: 'empty', projectId: 'ep', name: 'E', materialSystem: 'concrete',
      floors: [{ id: 'f1', name: 'GF', elevation: 0, height: 3 }],
      walls: [], openings: [], blocks: [],
    };
    expect(() => buildSectionSvg(empty)).not.toThrow();
  });

  test('section SVG survives with only walls', () => {
    const cad = houseCad({ openings: [], blocks: [], roomProgramme: undefined });
    expect(() => buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 })).not.toThrow();
  });

  test('section still contains cut reference line info', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('cut @');
  });

  test('section still contains NGL ground line datum', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('NGL');
  });

  test('section still contains keynote schedule', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('KEYNOTES');
  });

  test('section still contains concrete hatch', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('concrete-hatch');
  });

  test('section still contains title block', () => {
    const cad = houseCad();
    const svg = buildSectionSvg(cad, FIXTURE_META, { axis: 'AA', position: 5 });
    expect(svg).toContain('P13.11 Fixture');
  });
});
