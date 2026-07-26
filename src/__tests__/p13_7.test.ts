import { describe, test, expect } from 'vitest';
import { buildElevationSvg } from '../lib/drawings/elevation-svg';
import { buildSectionSvg } from '../lib/drawings/section-svg';
import { buildFloorPlanSvg } from '../lib/drawings/disciplines/floor-plan-svg';
import { buildSitePlanSvg } from '../lib/drawings/disciplines/site-plan-svg';
import { buildFoundationPlanSvg } from '../lib/drawings/disciplines/foundation-plan-svg';
import { buildRoofPlanSvg } from '../lib/drawings/disciplines/roof-plan-svg';
import { buildPresentationSvg } from '../lib/drawings/disciplines/presentation-svg';
import { buildElectricalPlanSvg } from '../lib/drawings/disciplines/electrical-plan-svg';
import { buildPlumbingPlanSvg } from '../lib/drawings/disciplines/plumbing-plan-svg';
import { buildHvacPlanSvg } from '../lib/drawings/disciplines/hvac-plan-svg';
import { buildScheduleSvg } from '../lib/drawings/disciplines/schedule-svg';
import type { CadDocument, SectionConfig } from '../domain/ws6-types';
import type { TitleBlockMeta } from '../lib/drawings/title-block';
import { computeFaçadeComposition, mapRoomsToFrontage, getEntranceOpening } from '../lib/drawings/frontage-mapper';
import { buildOpeningProfiles } from '../lib/drawings/opening-elevation-profile';
import { resolveSectionCutPlane, getFloorBuildUp } from '../lib/drawings/section-cut-engine';
import { getTypologyRules } from '../lib/drawings/facade-composer';
import { renderLevelDatum, renderDatumColumn, renderOverallHeightNote, renderScaleNote } from '../lib/drawings/elevation-datums';

const FIXTURE_META: TitleBlockMeta = {
  project: 'P13.7 Fixture',
  drawing: 'Fixture Drawing',
  sheet: 'FIX-001',
  scale: '1:100',
  date: '2026-01-15',
  revision: 'A',
  drawnBy: 'Fixture Engine',
};

function makeFixtureCad(): CadDocument {
  return {
    id: 'p13-7-cad',
    projectId: 'p13-7-proj',
    name: 'P13.7 Test',
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
      { id: 'o2', wallId: 'w1', floorId: 'f1', kind: 'window', offset: 5, width: 1.5, height: 1.2, sillHeight: 0.9, headHeight: 2.1, name: 'Living Window', metadata: { ifcClass: 'IfcWindow', category: 'window', properties: {}, typeName: 'Sliding' } },
      { id: 'o3', wallId: 'w5', floorId: 'f1', kind: 'door', offset: 3, width: 0.8, height: 2.1, sillHeight: 0, headHeight: 2.1, name: 'Int Door', metadata: { ifcClass: 'IfcDoor', category: 'door', material: 'timber', properties: {}, fireRating: 'FD30' } },
      { id: 'o4', wallId: 'w3', floorId: 'f1', kind: 'window', offset: 4, width: 1.2, height: 1.2, sillHeight: 0.9, headHeight: 2.1, name: 'Rear Window', metadata: { ifcClass: 'IfcWindow', category: 'window', properties: {} } },
    ],
    blocks: [
      { id: 'b1', floorId: 'f1', kind: 'stair', position: { x: 9, y: 3 }, width: 1.2, depth: 3, rotation: 0, name: 'Stair-1', end: { x: 9, y: 6 }, metadata: { ifcClass: 'IfcStair', category: 'circulation', properties: {} } },
      { id: 'b2', floorId: 'f1', kind: 'column', position: { x: 3, y: 3 }, width: 0.3, depth: 0.3, rotation: 0, name: 'Col-1', metadata: { ifcClass: 'IfcColumn', category: 'structure', material: 'concrete', properties: {} } },
    ],
    boundaries: [
      { id: 'bnd1', points: [{ x: -3, y: -3 }, { x: 15, y: -3 }, { x: 15, y: 13 }, { x: -3, y: 13 }], layerId: 'boundaries', boundaryMode: 'verified' },
    ],
    roomProgramme: {
      'room-1': 'Living Room',
      'room-2': 'Kitchen',
      'room-3': 'Bedroom 1',
      'room-4': 'Corridor',
    },
  };
}

const cad = makeFixtureCad();
const sectionConfig: SectionConfig = { axis: 'AA', position: 5 };
const emptyCad: CadDocument = {
  id: 'empty', projectId: 'ep', name: 'Empty', materialSystem: 'concrete',
  floors: [{ id: 'f1', name: 'Ground Floor', elevation: 0, height: 3 }],
  walls: [], openings: [], blocks: [],
};

// ── 1. Façade Composition ──
describe('P13.7 — Façade Composition', () => {
  test('computeFaçadeComposition identifies front orientation', () => {
    const comp = computeFaçadeComposition(cad, 'front');
    expect(comp.width).toBeGreaterThan(0);
    expect(comp.segments.length).toBeGreaterThan(0);
    expect(comp.orientation).toBe('front');
  });

  test('computeFaçadeComposition identifies right orientation', () => {
    const comp = computeFaçadeComposition(cad, 'right');
    expect(comp.width).toBeGreaterThan(0);
    expect(comp.segments.length).toBeGreaterThan(0);
    expect(comp.orientation).toBe('right');
  });

  test('front elevation width differs from side elevation width', () => {
    const front = computeFaçadeComposition(cad, 'front');
    const right = computeFaçadeComposition(cad, 'right');
    expect(front.width).not.toBe(right.width);
  });

  test('entrance opening is detected on front elevation', () => {
    const entrance = getEntranceOpening(cad);
    expect(entrance).not.toBeNull();
    expect(entrance!.openingId).toBe('o1');
  });

  test('mapRoomsToFrontage returns room-to-façade mappings', () => {
    const mappings = mapRoomsToFrontage(cad);
    expect(mappings.length).toBeGreaterThan(0);
    expect(mappings.some(m => m.façadeOrientation === 'front')).toBe(true);
  });
});

// ── 2. Elevation Semantics ──
describe('P13.7 — Elevation Semantics', () => {
  test('front elevation SVG is valid', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Front Elevation');
  });

  test('right elevation SVG is valid', () => {
    const svg = buildElevationSvg(cad, 'right', FIXTURE_META);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Right Side Elevation');
  });

  test('rear elevation SVG is valid', () => {
    const svg = buildElevationSvg(cad, 'rear', FIXTURE_META);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Rear Elevation');
  });

  test('left elevation SVG is valid', () => {
    const svg = buildElevationSvg(cad, 'left', FIXTURE_META);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Left Side Elevation');
  });

  test('front and right elevations differ meaningfully', () => {
    const front = buildElevationSvg(cad, 'front', FIXTURE_META);
    const right = buildElevationSvg(cad, 'right', FIXTURE_META);
    const frontPoints = (front.match(/<rect/g) || []).length;
    const rightPoints = (right.match(/<rect/g) || []).length;
    expect(Math.abs(frontPoints - rightPoints)).toBeGreaterThan(0);
  });

  test('front elevation contains entry marker', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    expect(svg).toContain('ENTRY');
  });

  test('front elevation contains ground line datum', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    expect(svg).toContain('GL');
  });

  test('front elevation contains FFL labels per floor', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    const match = svg.match(/FFL \+/g);
    expect(match).not.toBeNull();
    expect(match!.length).toBe(cad.floors.length);
  });

  test('front elevation contains room-to-façade labels', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    expect(svg).toContain('Rooms:');
  });

  test('elevation contains opening annotations (SILL, HD)', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    expect(svg).toContain('SILL');
    expect(svg).toContain('HD');
  });

  test('elevation contains plinth line when applicable', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    expect(svg).toContain('PLINTH');
  });

  test('elevation print mode uses light background', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META, true);
    expect(svg).toContain('#ffffff');
  });

  test('elevation scale note is present', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    expect(svg).toContain('Scale 1:100');
  });

  test('building typology is inferred and reflected', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    expect(svg).not.toContain('undefined');
  });
});

// ── 3. Opening Expression ──
describe('P13.7 — Opening Expression', () => {
  test('buildOpeningProfiles returns profiles for all openings', () => {
    const profiles = buildOpeningProfiles(cad, 'front');
    expect(profiles.length).toBe(cad.openings.length);
  });

  test('entrance opening has isEntrance flag', () => {
    const profiles = buildOpeningProfiles(cad, 'front');
    const entrance = profiles.find(p => p.isEntrance);
    expect(entrance).toBeDefined();
    expect(entrance!.openingId).toBe('o1');
  });

  test('sliding window has mullion when wide enough', () => {
    const profiles = buildOpeningProfiles(cad, 'front');
    const window = profiles.find(p => p.kind === 'window');
    expect(window).toBeDefined();
    if (window!.width > 2.4) {
      expect(window!.hasMullion).toBe(true);
    }
  });

  test('door subtypes are inferred from metadata', () => {
    const profiles = buildOpeningProfiles(cad, 'front');
    const door = profiles.find(p => p.kind === 'door');
    expect(door).toBeDefined();
    expect(door!.doorSubtype).toBeDefined();
  });

  test('profiles include room behind information', () => {
    const profiles = buildOpeningProfiles(cad, 'front');
    // At least some openings should have a room mapped
    expect(profiles.some(p => p.roomBehind !== null)).toBe(true);
  });
});

// ── 4. Section Semantics ──
describe('P13.7 — Section Semantics', () => {
  test('section SVG is valid', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('A\u2013A');
  });

  test('section contains cut reference line info', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('cut @');
  });

  test('section contains keynote schedule', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('KEYNOTES');
  });

  test('section contains floor slab build-up', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('concrete-hatch');
  });

  test('section contains foundation footings', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('FOOTING');
  });

  test('section contains internal partition walls', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('timber-hatch');
  });

  test('section contains roof build-up details', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('CHROMADEK');
    expect(svg).toContain('TRUSSES');
  });

  test('section contains NGL ground line datum', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('NGL');
  });

  test('section contains level labels per floor', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    for (const floor of cad.floors) {
      expect(svg).toContain(floor.name);
    }
  });

  test('section contains height dimension annotations', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('Wall Plate');
    expect(svg).toContain('Apex');
  });

  test('section contains overall height note', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('storey');
  });

  test('section contains stair annotation', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('STAIR');
  });

  test('section print mode uses light background', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig, true);
    expect(svg).toContain('#ffffff');
  });

  test('resolveSectionCutPlane returns rooms intersected', () => {
    const cut = resolveSectionCutPlane(cad, { axis: 'AA', position: 4 });
    expect(cut.roomsCut.length).toBeGreaterThan(0);
  });

  test('resolveSectionCutPlane identifies walls at cut', () => {
    const cut = resolveSectionCutPlane(cad, sectionConfig);
    expect(cut.wallsCut.length).toBeGreaterThan(0);
  });

  test('resolveSectionCutPlane identifies stairs intersected', () => {
    const cut = resolveSectionCutPlane(cad, sectionConfig);
    // Stair at y=3 with depth 3 spans y=3..6; cut at y=5 intersects it
    expect(cut.stairsCut.length).toBeGreaterThan(0);
  });

  test('getFloorBuildUp returns hardcore for ground floor', () => {
    const ground = getFloorBuildUp(0);
    expect(ground.hasHardcore).toBe(true);
    expect(ground.hasInsulation).toBe(true);
    expect(ground.hasDpm).toBe(true);
  });

  test('getFloorBuildUp returns no hardcore for upper floors', () => {
    const upper = getFloorBuildUp(1);
    expect(upper.hasHardcore).toBe(false);
  });

  test('section with BB axis works', () => {
    const bbConfig: SectionConfig = { axis: 'BB', position: 5 };
    const svg = buildSectionSvg(cad, FIXTURE_META, bbConfig);
    expect(svg).toContain('B\u2013B');
  });
});

// ── 5. Datum & Label Formatting ──
describe('P13.7 — Datum & Label Formatting', () => {
  test('renderLevelDatum produces correct ground datum', () => {
    const result = renderLevelDatum(0, 'GL', 100, 200, true, false);
    const text = result.join('');
    expect(text).toContain('±0.000');
    expect(text).toContain('GL');
  });

  test('renderLevelDatum produces positive elevation', () => {
    const result = renderLevelDatum(3, 'FFL', 100, 200, false, false);
    const text = result.join('');
    expect(text).toContain('+3.000');
    expect(text).toContain('FFL');
  });

  test('renderDatumColumn returns datum lines', () => {
    const levels = [
      { elevation: 0, label: 'GL', isGround: true },
      { elevation: 3, label: 'FFL' },
    ];
    const result = renderDatumColumn(levels, 300, (z) => 500 - z * 28, false);
    expect(result.length).toBeGreaterThan(0);
  });

  test('renderOverallHeightNote formats correctly', () => {
    const note = renderOverallHeightNote(6, 2, 100, 200, false);
    expect(note).toContain('6.00m');
    expect(note).toContain('2 storey');
  });

  test('renderScaleNote outputs scale text', () => {
    const note = renderScaleNote('1:100', 100, 200, false);
    expect(note).toContain('1:100');
  });
});

// ── 6. Typology Rules ──
describe('P13.7 — Typology Rules', () => {
  test('getTypologyRules returns defaults for unknown typology', () => {
    const rules = getTypologyRules('unknown-type');
    expect(rules).toBeDefined();
    expect(rules.typology).toBe('family house');
  });

  test('villa typology has strong entrance emphasis', () => {
    const rules = getTypologyRules('villa');
    expect(rules.entranceEmphasis).toBe('strong');
    expect(rules.hasPlinth).toBe(true);
    expect(rules.balconyLikelihood).toBeGreaterThan(0.5);
  });

  test('warehouse typology has no plinth', () => {
    const rules = getTypologyRules('warehouse/industrial');
    expect(rules.hasPlinth).toBe(false);
    expect(rules.parapetType).toBe('flat');
  });

  test('worship typology has high symmetry', () => {
    const rules = getTypologyRules('worship/community hall');
    expect(rules.symmetryWeight).toBe(1.0);
    expect(rules.parapetType).toBe('stepped');
  });

  test('apartment block has flat parapet', () => {
    const rules = getTypologyRules('apartment block');
    expect(rules.parapetType).toBe('flat');
    expect(rules.entranceEmphasis).toBe('strong');
  });

  test('mixed-use has commercial glazing zone', () => {
    const rules = getTypologyRules('mixed-use building');
    expect(rules.materialZones.length).toBeGreaterThan(0);
    expect(rules.materialZones[0].material).toContain('commercial');
  });
});

// ── 7. Regression — No P13.1–P13.6 regressions ──
describe('P13.7 — Regression', () => {
  test('floor plan renders valid SVG with minimal data', () => {
    const svg = buildFloorPlanSvg(emptyCad, 'f1', FIXTURE_META, undefined, false);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  test('floor plan with full cad renders without crash', () => {
    const svg = buildFloorPlanSvg(cad, 'f1', FIXTURE_META, sectionConfig, false);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  test('site plan renders valid SVG', () => {
    const svg = buildSitePlanSvg(cad, FIXTURE_META, false);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Arial');
  });

  test('foundation plan renders valid SVG', () => {
    const svg = buildFoundationPlanSvg(cad, undefined, FIXTURE_META, false);
    expect(svg).toContain('<svg');
    expect(svg).toContain('concrete-hatch');
  });

  test('roof plan renders valid SVG', () => {
    const svg = buildRoofPlanSvg(cad, FIXTURE_META, false);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  test('electrical plan renders valid SVG', () => {
    const svg = buildElectricalPlanSvg(cad, 'f1', FIXTURE_META, false);
    expect(svg).toContain('<svg');
  });

  test('plumbing plan renders valid SVG', () => {
    const svg = buildPlumbingPlanSvg(cad, 'f1', FIXTURE_META, false);
    expect(svg).toContain('<svg');
  });

  test('hvac plan renders valid SVG', () => {
    const svg = buildHvacPlanSvg(cad, 'f1', FIXTURE_META, false);
    expect(svg).toContain('<svg');
  });

  test('presentation renders valid SVG', () => {
    const svg = buildPresentationSvg(cad, FIXTURE_META);
    expect(svg).toContain('<svg');
  });

  test('schedule renders valid SVG', () => {
    const svg = buildScheduleSvg(cad, 'door', FIXTURE_META);
    expect(svg).toContain('<svg');
  });

  test('all discipline generators return valid SVG without title meta', () => {
    const gens = [
      () => buildFloorPlanSvg(cad, 'f1', undefined, undefined, false),
      () => buildSitePlanSvg(cad, undefined, false),
      () => buildFoundationPlanSvg(cad, undefined, undefined, false),
      () => buildRoofPlanSvg(cad, undefined, false),
      () => buildElectricalPlanSvg(cad, 'f1', undefined, false),
      () => buildPlumbingPlanSvg(cad, 'f1', undefined, false),
      () => buildHvacPlanSvg(cad, 'f1', undefined, false),
      () => buildElevationSvg(cad, 'front', undefined, false),
      () => buildElevationSvg(cad, 'right', undefined, false),
      () => buildElevationSvg(cad, 'rear', undefined, false),
      () => buildSectionSvg(cad, undefined, sectionConfig, false),
    ];
    for (const gen of gens) {
      const svg = gen();
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }
  });

  test('no generator crashes with empty cad', () => {
    const gens = [
      () => buildFloorPlanSvg(emptyCad, 'f1', undefined, undefined, false),
      () => buildElevationSvg(emptyCad, 'front', undefined, false),
      () => buildElevationSvg(emptyCad, 'right', undefined, false),
      () => buildSectionSvg(emptyCad, undefined, undefined, false),
    ];
    for (const gen of gens) {
      expect(() => gen()).not.toThrow();
    }
  });

  test('elevation print mode uses correct colors', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META, true);
    const bgRect = svg.match(/<rect width="[^"]+" height="[^"]+" fill="(#......)"/);
    expect(bgRect).not.toBeNull();
    expect(bgRect![1]).toBe('#ffffff');
  });

  test('section print mode uses correct colors', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig, true);
    const bgRect = svg.match(/<rect width="[^"]+" height="[^"]+" fill="(#......)"/);
    expect(bgRect).not.toBeNull();
    expect(bgRect![1]).toBe('#ffffff');
  });

  test('title block survives in elevation', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    expect(svg).toContain('P13.7 Fixture');
    expect(svg).toContain('FIX-001');
  });

  test('title block survives in section', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('P13.7 Fixture');
    expect(svg).toContain('FIX-001');
  });
});
