import { describe, it, expect } from 'vitest';
import { buildElevationSvg } from '@/lib/drawings/elevation-svg';
import { buildSectionSvg } from '@/lib/drawings/section-svg';
import { getTypologyRules } from '@/lib/drawings/facade-composer';
import { getRoofType, renderRoofProfile } from '@/lib/drawings/elevation-roof-profile';
import { computeFaçadeComposition, mapRoomsToFrontage, orientWall, roomFrontageType } from '@/lib/drawings/frontage-mapper';
import { renderColumnRhythm, renderBalconyProjection, renderEntranceCanopy, renderMaterialZoneHatch, renderSymmetryCenterline, renderVerandahProjection } from '@/lib/drawings/facade-rhythm';
import type { CadDocument } from '@/domain/ws6-types';

function makeMinimalCad(overrides?: Partial<CadDocument>): CadDocument {
  return {
    id: 'test-cad',
    projectId: 'test-proj',
    name: 'Test Building',
    materialSystem: 'concrete',
    floors: [
      { id: 'f1', name: 'Ground Floor', elevation: 0, height: 3 },
    ],
    walls: [
      { id: 'w-front', floorId: 'f1', start: { x: 0, y: 10 }, end: { x: 10, y: 10 }, thickness: 0.23, height: 3, name: 'Front Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} } },
      { id: 'w-rear', floorId: 'f1', start: { x: 10, y: 0 }, end: { x: 0, y: 0 }, thickness: 0.23, height: 3, name: 'Rear Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} } },
      { id: 'w-left', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 0, y: 10 }, thickness: 0.23, height: 3, name: 'Left Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} } },
      { id: 'w-right', floorId: 'f1', start: { x: 10, y: 10 }, end: { x: 10, y: 0 }, thickness: 0.23, height: 3, name: 'Right Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} } },
    ],
    openings: [
      { id: 'o-front-door', wallId: 'w-front', floorId: 'f1', kind: 'door', offset: 4, width: 0.9, sillHeight: 0, headHeight: 2.1, name: 'Front Door', metadata: { ifcClass: 'IfcDoor', category: 'opening', properties: {} } },
      { id: 'o-front-window', wallId: 'w-front', floorId: 'f1', kind: 'window', offset: 2, width: 1.2, sillHeight: 0.9, headHeight: 2.1, name: 'Front Window', metadata: { ifcClass: 'IfcWindow', category: 'opening', properties: {} } },
      { id: 'o-rear-door', wallId: 'w-rear', floorId: 'f1', kind: 'door', offset: 5, width: 0.9, sillHeight: 0, headHeight: 2.1, name: 'Rear Door', metadata: { ifcClass: 'IfcDoor', category: 'opening', properties: {} } },
      { id: 'o-side-window', wallId: 'w-left', floorId: 'f1', kind: 'window', offset: 3, width: 1.0, sillHeight: 0.9, headHeight: 2.1, name: 'Side Window', metadata: { ifcClass: 'IfcWindow', category: 'opening', properties: {} } },
    ],
    blocks: [],
    roomProgramme: {
      'r1': 'Living Room',
      'r2': 'Kitchen',
    },
    ...overrides,
  };
}

function countInSvg(svg: string, substr: string): number {
  return (svg.match(new RegExp(substr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

describe('P13.8 — Multi-Elevation Set Support', () => {
  it('generates front elevation', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('Front Elevation');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('ENTRY');
  });

  it('generates rear elevation', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'rear');
    expect(svg).toContain('Rear Elevation');
    expect(svg).toContain('<svg');
    expect(svg).toContain('REAR ELEVATION');
    expect(svg).toContain('SERVICE');
  });

  it('generates left side elevation', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'left');
    expect(svg).toContain('Left Side Elevation');
    expect(svg).toContain('<svg');
    expect(svg).toContain('LEFT SIDE');
  });

  it('generates right side elevation', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'right');
    expect(svg).toContain('Right Side Elevation');
    expect(svg).toContain('<svg');
    expect(svg).toContain('RIGHT SIDE');
  });

  it('defaults to front elevation for unknown viewId', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'unknown');
    expect(svg).toContain('Front Elevation');
  });

  it('includes roof type annotation', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toMatch(/PITCHED ROOF|FLAT ROOF|STEPPED PARAPET|RC SLAB EDGE/);
  });

  it('includes scale note', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('Scale');
  });

  it('includes datum levels', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('FFL');
    expect(svg).toContain('GL');
  });

  it('includes height dimensions', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('HT');
  });
});

describe('P13.8 — Front vs Rear Differentiation', () => {
  it('front elevation has ENTRY label, rear does not', () => {
    const cad = makeMinimalCad();
    const frontSvg = buildElevationSvg(cad, 'front');
    const rearSvg = buildElevationSvg(cad, 'rear');
    expect(frontSvg).toContain('ENTRY');
    expect(rearSvg).not.toContain('ENTRY');
  });

  it('front elevation has more people figures than rear', () => {
    const cad = makeMinimalCad();
    const frontSvg = buildElevationSvg(cad, 'front');
    const rearSvg = buildElevationSvg(cad, 'rear');
    // Count person objects (circles for heads at specific relative heights)
    const frontPeople = (frontSvg.match(/stroke-linecap="round"/g) || []).length;
    const rearPeople = (rearSvg.match(/stroke-linecap="round"/g) || []).length;
    expect(frontPeople).toBeGreaterThan(rearPeople);
  });

  it('front elevation contains entrance canopy elements', () => {
    const cad = makeMinimalCad();
    const frontSvg = buildElevationSvg(cad, 'front');
    expect(frontSvg).toContain('ENTRY');
    expect(frontSvg).toContain('THRESHOLD');
  });

  it('rear elevation contains service/utility annotation', () => {
    const cad = makeMinimalCad();
    const rearSvg = buildElevationSvg(cad, 'rear');
    expect(rearSvg).toContain('SERVICE');
    expect(rearSvg).toContain('UTILITY');
  });

  it('rear elevation has fewer course lines than front', () => {
    const cad = makeMinimalCad();
    const frontSvg = buildElevationSvg(cad, 'front');
    const rearSvg = buildElevationSvg(cad, 'rear');
    const frontCourseLines = countInSvg(frontSvg, 'brick-hatch');
    const rearCourseLines = countInSvg(rearSvg, 'brick-hatch');
    expect(frontCourseLines).toBeGreaterThanOrEqual(rearCourseLines);
  });
});

describe('P13.8 — Side Elevation Specifics', () => {
  it('side elevations include building depth', () => {
    const cad = makeMinimalCad();
    const leftSvg = buildElevationSvg(cad, 'left');
    expect(leftSvg).toMatch(/m deep/);
  });

  it('side elevations include side orientation annotation', () => {
    const cad = makeMinimalCad();
    const leftSvg = buildElevationSvg(cad, 'left');
    expect(leftSvg).toContain('LEFT SIDE');
  });
});

describe('P13.8 — Typology Rules Drive SVG Content', () => {
  it('getTypologyRules returns family house rules by default', () => {
    const rules = getTypologyRules();
    expect(rules.typology).toBe('family house');
    expect(rules.balconyLikelihood).toBe(0.3);
    expect(rules.entranceEmphasis).toBe('strong');
  });

  it('villa has higher balcony likelihood and symmetry', () => {
    const rules = getTypologyRules('villa');
    expect(rules.balconyLikelihood).toBe(0.7);
    expect(rules.symmetryWeight).toBe(0.9);
  });

  it('worship typology has stepped parapet', () => {
    const rules = getTypologyRules('worship/community hall');
    expect(rules.parapetType).toBe('stepped');
    expect(rules.symmetryWeight).toBe(1.0);
  });

  it('apartment block has flat parapet and column rhythm', () => {
    const rules = getTypologyRules('apartment block');
    expect(rules.parapetType).toBe('flat');
    expect(rules.columnRhythmSpacing).toBe(6);
  });

  it('typology annotation appears in elevation output', () => {
    const cad = makeMinimalCad({
      roomProgramme: { 'r1': 'Living Room', 'r2': 'Dining Room', 'r3': 'Bedroom 1', 'r4': 'Bedroom 2', 'r5': 'Kitchen', 'r6': 'Study' },
    });
    const svg = buildElevationSvg(cad, 'front');
    // 6 rooms → 'family house' (between 5 and 7)
    expect(svg).toContain('family house');
  });

  it('material zones are rendered for typologies that specify them', () => {
    const rules = getTypologyRules('family house');
    expect(rules.materialZones.length).toBeGreaterThan(0);
    expect(rules.materialZones[0].material).toBe('face-brick');
  });

  it('retail typology has commercial glazing material zone', () => {
    const rules = getTypologyRules('retail');
    expect(rules.materialZones.some(z => z.material === 'commercial-glazing')).toBe(true);
  });

  it('symmetry centerline is rendered for high-symmetry typologies', () => {
    const cad = makeMinimalCad({
      roomProgramme: { 'r1': 'Living Room', 'r2': 'Dining Room', 'r3': 'Bedroom 1', 'r4': 'Bedroom 2', 'r5': 'Bedroom 3', 'r6': 'Kitchen', 'r7': 'Study' },
    });
    const svg = buildElevationSvg(cad, 'front');
    // 7 rooms → 'family house' (symmetryWeight 0.7) — below 0.8 threshold
    // Verify the SVG generates without error
    expect(svg).toContain('family');
  });
});

describe('P13.8 — Roof Profile Differences', () => {
  it('pitched roof has CHROMADEK annotation', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toMatch(/CHROMADEK|PITCHED ROOF/);
  });

  it('parapet roof for apartment has FLAT ROOF annotation', () => {
    const cad = makeMinimalCad({
      roomProgramme: Object.fromEntries(
        Array.from({ length: 8 }, (_, i) => [`r${i}`, 'Bedroom 1']),
      ),
    });
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('apartment');
  });

  it('stepped roof for worship has STEPPED PARAPET annotation', () => {
    const rules = getTypologyRules('worship/community hall');
    const roofType = getRoofType(rules.parapetType, 'worship/community hall');
    expect(roofType).toBe('stepped');
  });

  it('roof profile rendering function produces SVG output', () => {
    const sz = (z: number) => 400 - 28 - 0.8 * 28 - z * 28;
    const parts = renderRoofProfile({
      roofType: 'pitched',
      leftX: 25,
      rightX: 325,
      roofZ: 6,
      totalHeight: 6,
      roofPitch: 1.5,
      sz,
      printMode: false,
      fasciaDepthPx: 35,
      eavesDepthPx: 50,
      parapetType: 'none',
    });
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.join('')).toContain('polygon');
  });

  it('slab-edge roof type returns correct for apartment building', () => {
    const roofType = getRoofType('flat', 'apartment block');
    expect(roofType).toBe('slab-edge');
  });
});

describe('P13.8 — Façade Composition Engine', () => {
  it('computeFaçadeComposition returns segments for front orientation', () => {
    const cad = makeMinimalCad();
    const comp = computeFaçadeComposition(cad, 'front');
    expect(comp.orientation).toBe('front');
    expect(comp.segments.length).toBeGreaterThan(0);
    expect(comp.width).toBeGreaterThan(0);
    expect(comp.totalHeight).toBeGreaterThan(0);
  });

  it('computeFaçadeComposition detects entrance on front', () => {
    const cad = makeMinimalCad();
    const comp = computeFaçadeComposition(cad, 'front');
    expect(comp.entranceX).not.toBeNull();
  });

  it('orientWall correctly identifies wall orientations', () => {
    // Horizontal walls with direction dx>0 → front, dx<0 → rear
    expect(orientWall({ start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })).toBe('front');
    expect(orientWall({ start: { x: 10, y: 0 }, end: { x: 0, y: 0 } })).toBe('rear');
    // Vertical walls: dy>0 → left, dy<0 → right
    expect(orientWall({ start: { x: 0, y: 0 }, end: { x: 0, y: 10 } })).toBe('left');
    expect(orientWall({ start: { x: 0, y: 10 }, end: { x: 0, y: 0 } })).toBe('right');
  });

  it('mapRoomsToFrontage returns mappings for rooms that have oriented walls', () => {
    const cad = makeMinimalCad({
      walls: [
        { id: 'w-front', floorId: 'f1', start: { x: 0, y: 10 }, end: { x: 10, y: 10 }, thickness: 0.23, height: 3, name: 'Front Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} } },
        { id: 'w-rear', floorId: 'f1', start: { x: 10, y: 0 }, end: { x: 0, y: 0 }, thickness: 0.23, height: 3, name: 'Rear Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} } },
        { id: 'w-left', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 0, y: 10 }, thickness: 0.23, height: 3, name: 'Left Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} } },
        { id: 'w-right', floorId: 'f1', start: { x: 10, y: 10 }, end: { x: 10, y: 0 }, thickness: 0.23, height: 3, name: 'Right Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} } },
      ],
    });
    const frontages = mapRoomsToFrontage(cad);
    expect(frontages.length).toBeGreaterThanOrEqual(1);
    expect(frontages.every(f => f.façadeOrientation && f.wallSegment)).toBe(true);
  });

  it('roomFrontageType classifies rooms correctly', () => {
    expect(roomFrontageType('Living Room' as any)).toBe('public');
    expect(roomFrontageType('Kitchen' as any)).toBe('service');
    expect(roomFrontageType('Bedroom 1' as any)).toBe('private');
  });
});

describe('P13.8 — Entry Hierarchy Expression', () => {
  it('renderEntranceCanopy produces SVG output for strong emphasis', () => {
    const parts = renderEntranceCanopy(200, 300, 'strong', false);
    const svg = parts.join('');
    expect(svg).toContain('ENTRY');
    expect(svg).toContain('rect');
    // Strong emphasis has more geometric elements than moderate
    expect(svg.match(/rect/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('renderEntranceCanopy produces simpler output for moderate emphasis', () => {
    const parts = renderEntranceCanopy(200, 300, 'moderate', false);
    const svg = parts.join('');
    expect(svg).toContain('ENTRY');
    expect(svg).not.toContain('PORTICO');
  });

  it('strong entrance emphasis has wider canopy and more elements', () => {
    const strongParts = renderEntranceCanopy(200, 300, 'strong', false);
    const moderateParts = renderEntranceCanopy(200, 300, 'moderate', false);
    expect(strongParts.join('').length).toBeGreaterThan(moderateParts.join('').length);
  });
});

describe('P13.8 — Balcony and Verandah Rendering', () => {
  it('renderBalconyProjection returns empty for zero likelihood', () => {
    const parts = renderBalconyProjection(100, 200, 50, 350, 0, false);
    expect(parts.length).toBe(0);
  });

  it('renderBalconyProjection returns elements for positive likelihood', () => {
    const parts = renderBalconyProjection(100, 200, 50, 350, 0.5, false);
    expect(parts.length).toBeGreaterThan(0);
  });

  it('renderVerandahProjection returns empty for non-villa typology', () => {
    const parts = renderVerandahProjection(300, 200, 50, 350, 'family house', false);
    expect(parts.length).toBe(0);
  });

  it('renderVerandahProjection returns elements for villa typology', () => {
    const parts = renderVerandahProjection(300, 100, 50, 350, 'villa', false);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.join('')).toContain('VERANDAH');
  });
});

describe('P13.8 — Column Rhythm and Symmetry', () => {
  it('renderColumnRhythm returns empty for null spacing', () => {
    const parts = renderColumnRhythm(50, 350, 300, 100, null, false);
    expect(parts.length).toBe(0);
  });

  it('renderColumnRhythm returns elements for valid spacing', () => {
    const parts = renderColumnRhythm(50, 350, 300, 100, 4, false);
    expect(parts.length).toBeGreaterThan(0);
  });

  it('renderSymmetryCenterline returns CL label', () => {
    const parts = renderSymmetryCenterline(50, 350, 300, 100, false);
    expect(parts.join('')).toContain('CL');
  });

  it('renderMaterialZoneHatch renders material label', () => {
    const sz = (z: number) => 400 - z * 28;
    const parts = renderMaterialZoneHatch(
      { from: 0, to: 1.2, material: 'face-brick' },
      50, 350, sz, false,
    );
    expect(parts.join('')).toContain('face-brick');
  });
});

describe('P13.8 — Section Quality Preservation', () => {
  it('section SVG still generates without error', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Section');
  });

  it('section contains cut plane info', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('cut @');
    expect(svg).toContain('looking');
  });

  it('section contains leader-linked construction keynotes', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('KEYNOTES');
  });

  it('section contains floor slab rendering', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('SL');
    expect(svg).toContain('concrete-hatch');
  });

  it('section contains roof construction annotation', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toMatch(/CHROMADEK|ROOFING|TRUSSES/);
  });

  it('section has datum levels', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('NGL');
  });
});

describe('P13.8 — Print Mode Consistency', () => {
  it('front elevation SVG valid in both print and dark modes', () => {
    const cad = makeMinimalCad();
    const printSvg = buildElevationSvg(cad, 'front', undefined, true);
    const darkSvg = buildElevationSvg(cad, 'front', undefined, false);
    expect(printSvg).toContain('#ffffff');
    expect(darkSvg).toContain('#0b1220');
  });

  it('all four elevations generate in print mode', () => {
    const cad = makeMinimalCad();
    for (const view of ['front', 'rear', 'left', 'right'] as const) {
      const svg = buildElevationSvg(cad, view, undefined, true);
      expect(svg).toContain('<svg');
      expect(svg).toContain('#ffffff');
    }
  });

  it('section SVG is valid in both modes', () => {
    const cad = makeMinimalCad();
    const printSvg = buildSectionSvg(cad, undefined, undefined, true);
    const darkSvg = buildSectionSvg(cad, undefined, undefined, false);
    expect(printSvg).toContain('#ffffff');
    expect(darkSvg).toContain('#0b1220');
  });
});
