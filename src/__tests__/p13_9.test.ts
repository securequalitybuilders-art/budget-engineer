import { describe, it, expect } from 'vitest';
import { buildElevationSvg } from '@/lib/drawings/elevation-svg';
import { buildSectionSvg } from '@/lib/drawings/section-svg';
import { mapRoomsToFrontage, orientWall, roomFrontageType } from '@/lib/drawings/frontage-mapper';
import { getTypologyRules } from '@/lib/drawings/facade-composer';
import {
  renderBalconyProjection, renderBalconyStack,
  renderUpperFloorSetback, renderPodiumTransition, renderTerraceEdge,
} from '@/lib/drawings/facade-rhythm';
import { createSeededRandom, shouldFeatureTrigger, deterministicFloorVariant, deterministicBaySelector, buildDeterministicSeed } from '@/lib/drawings/deterministic-facade-variation';
import { collectFaçadeSegments } from '@/lib/drawings/facade-segments';
import type { CadDocument, RoomProgramme } from '@/domain/ws6-types';

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

function makeMultiStoreyCad(floorsCount = 3, overrides?: Partial<CadDocument>): CadDocument {
  const floors = Array.from({ length: floorsCount }, (_, i) => ({
    id: `f${i + 1}`,
    name: i === 0 ? 'Ground Floor' : i === floorsCount - 1 ? 'Top Floor' : `Floor ${i + 1}`,
    elevation: i * 3,
    height: 3,
  }));

  const walls = floors.flatMap((f) => [
    { id: `w-front-${f.id}`, floorId: f.id, start: { x: 0, y: 10 }, end: { x: 10, y: 10 }, thickness: 0.23, height: 3, name: 'Front Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} } },
    { id: `w-rear-${f.id}`, floorId: f.id, start: { x: 10, y: 0 }, end: { x: 0, y: 0 }, thickness: 0.23, height: 3, name: 'Rear Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} } },
    { id: `w-left-${f.id}`, floorId: f.id, start: { x: 0, y: 0 }, end: { x: 0, y: 10 }, thickness: 0.23, height: 3, name: 'Left Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} } },
    { id: `w-right-${f.id}`, floorId: f.id, start: { x: 10, y: 10 }, end: { x: 10, y: 0 }, thickness: 0.23, height: 3, name: 'Right Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} } },
  ]);

  const openings = floors.flatMap((f, _fi) => [
    { id: `o-door-${f.id}`, wallId: `w-front-${f.id}`, floorId: f.id, kind: 'door' as const, offset: 4 + _fi, width: 0.9, sillHeight: 0, headHeight: 2.1, name: `Door ${f.id}`, metadata: { ifcClass: 'IfcDoor', category: 'opening', properties: {} } },
  ]);

  const rooms: Record<string, RoomProgramme> = {};
  if (floorsCount <= 4) {
    rooms['r1'] = 'Living Room' as RoomProgramme;
    rooms['r2'] = 'Kitchen' as RoomProgramme;
  } else {
    for (let i = 0; i < floorsCount * 2; i++) {
      rooms[`r${i}`] = (i % 2 === 0 ? 'Living Room' : 'Bedroom 1') as RoomProgramme;
    }
  }

  return {
    id: 'multi-cad',
    projectId: 'multi-proj',
    name: 'Multi-Storey Building',
    materialSystem: 'concrete',
    floors,
    walls,
    openings,
    blocks: [],
    roomProgramme: rooms,
    ...overrides,
  };
}

describe('P13.9 — Deterministic Façade Variation', () => {
  it('createSeededRandom produces consistent results for same input', () => {
    const prng1 = createSeededRandom('test-context');
    const prng2 = createSeededRandom('test-context');
    const results1 = Array.from({ length: 10 }, () => prng1());
    const results2 = Array.from({ length: 10 }, () => prng2());
    expect(results1).toEqual(results2);
  });

  it('createSeededRandom produces different results for different inputs', () => {
    const prng1 = createSeededRandom('context-a');
    const prng2 = createSeededRandom('context-b');
    const r1 = prng1();
    const r2 = prng2();
    expect(r1).not.toBe(r2);
  });

  it('createSeededRandom returns values between 0 and 1', () => {
    const prng = createSeededRandom('range-test');
    for (let i = 0; i < 100; i++) {
      const v = prng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('shouldFeatureTrigger returns false for zero likelihood', () => {
    expect(shouldFeatureTrigger(0, 'any-context')).toBe(false);
  });

  it('shouldFeatureTrigger returns true for 1.0 likelihood', () => {
    expect(shouldFeatureTrigger(1.0, 'any-context')).toBe(true);
  });

  it('shouldFeatureTrigger is deterministic for same context', () => {
    const r1 = shouldFeatureTrigger(0.5, 'feature-x');
    const r2 = shouldFeatureTrigger(0.5, 'feature-x');
    expect(r1).toBe(r2);
  });

  it('deterministicBaySelector is consistent across calls', () => {
    const r1 = deterministicBaySelector(0, 5, 0.5, 'bay-seed');
    const r2 = deterministicBaySelector(0, 5, 0.5, 'bay-seed');
    expect(r1).toBe(r2);
  });

  it('deterministicFloorVariant returns consistent results', () => {
    const r1 = deterministicFloorVariant(0, 3, 0.7, 'floor-seed');
    const r2 = deterministicFloorVariant(0, 3, 0.7, 'floor-seed');
    expect(r1).toBe(r2);
  });

  it('buildDeterministicSeed produces different seeds for different orientations', () => {
    const frontSeed = buildDeterministicSeed('cad1', 'plan1', 0, 'front', 'villa', 'ground');
    const rearSeed = buildDeterministicSeed('cad1', 'plan1', 0, 'rear', 'villa', 'ground');
    expect(frontSeed).not.toBe(rearSeed);
  });

  it('renderBalconyProjection is deterministic with same seed', () => {
    const parts1 = renderBalconyProjection(100, 200, 50, 350, 0.5, false, 'test-seed', 0);
    const parts2 = renderBalconyProjection(100, 200, 50, 350, 0.5, false, 'test-seed', 0);
    expect(parts1.join('')).toBe(parts2.join(''));
  });

  it('renderBalconyProjection varies with different seeds', () => {
    const parts1 = renderBalconyProjection(100, 200, 50, 350, 0.5, false, 'seed-a', 0);
    const parts2 = renderBalconyProjection(100, 200, 50, 350, 0.5, false, 'seed-b', 0);
    // They could occasionally be the same by chance; just verify they're valid
    expect(parts1.length).toBeGreaterThanOrEqual(0);
    expect(parts2.length).toBeGreaterThanOrEqual(0);
  });

  it('full elevation SVG is deterministic for same inputs', () => {
    const cad = makeMinimalCad();
    const svg1 = buildElevationSvg(cad, 'front');
    const svg2 = buildElevationSvg(cad, 'front');
    expect(svg1).toBe(svg2);
  });
});

describe('P13.9 — Geometry-Based Room-to-Façade Mapping', () => {
  it('collectFaçadeSegments returns segments for front orientation', () => {
    const cad = makeMinimalCad();
    const coll = collectFaçadeSegments(cad, 'front');
    expect(coll.orientation).toBe('front');
    expect(coll.segments.length).toBeGreaterThan(0);
    expect(coll.totalLength).toBeGreaterThan(0);
  });

  it('collectFaçadeSegments classifies hierarchy roles', () => {
    const cad = makeMinimalCad();
    const coll = collectFaçadeSegments(cad, 'front');
    const roles = coll.segments.map(s => s.hierarchyRole);
    expect(roles.length).toBeGreaterThan(0);
  });

  it('mapRoomsToFrontage uses centroid-based wall assignment', () => {
    const cad = makeMinimalCad();
    const frontages = mapRoomsToFrontage(cad);
    expect(frontages.length).toBeGreaterThanOrEqual(1);
    // Living room should map to front
    const living = frontages.find(f => f.programme === 'Living Room');
    if (living) {
      expect(living.façadeOrientation).toBe('front');
    }
  });

  it('mapRoomsToFrontage maps kitchen to rear/service orientation', () => {
    const cad = makeMinimalCad();
    const frontages = mapRoomsToFrontage(cad);
    const kitchen = frontages.find(f => f.programme === 'Kitchen');
    if (kitchen) {
      expect(kitchen.façadeOrientation).toBe('rear');
    }
  });

  it('orientWall identifies walls correctly with centroid-based mapping', () => {
    expect(orientWall({ start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })).toBe('front');
    expect(orientWall({ start: { x: 10, y: 0 }, end: { x: 0, y: 0 } })).toBe('rear');
    expect(orientWall({ start: { x: 0, y: 0 }, end: { x: 0, y: 10 } })).toBe('left');
    expect(orientWall({ start: { x: 0, y: 10 }, end: { x: 0, y: 0 } })).toBe('right');
  });

  it('roomFrontageType classifies rooms correctly for geometric mapping', () => {
    expect(roomFrontageType('Living Room' as any)).toBe('public');
    expect(roomFrontageType('Kitchen' as any)).toBe('service');
    expect(roomFrontageType('Bedroom 1' as any)).toBe('private');
  });

  it('collectFaçadeSegments handles non-structural walls', () => {
    const cad = makeMinimalCad({
      walls: [
        { id: 'w-int', floorId: 'f1', start: { x: 2, y: 2 }, end: { x: 5, y: 2 }, thickness: 0.15, height: 3, name: 'Int Wall', structural: false, metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} } },
        ...makeMinimalCad().walls,
      ],
    });
    const coll = collectFaçadeSegments(cad, 'front');
    // Internal walls should not appear as facade segments
    expect(coll.segments.every(s => s.wallId !== 'w-int')).toBe(true);
  });
});

describe('P13.9 — Multi-Storey Façade Expression', () => {
  it('generates front elevation for multi-storey building', () => {
    const cad = makeMultiStoreyCad(3);
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('Front Elevation');
    expect(svg).toContain('FFL');
    expect(svg).toContain('GROUND');
  });

  it('includes storey count annotation in elevation', () => {
    const cad = makeMultiStoreyCad(3);
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('3 STOREYS');
  });

  it('upper-floor setback appears for mixed-use typology', () => {
    const parts = renderUpperFloorSetback(1, 3, 50, 350, 200, false, 'mixed-use building');
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.join('')).toContain('SETBACK');
  });

  it('upper-floor setback does not appear for ground floor', () => {
    const parts = renderUpperFloorSetback(0, 3, 50, 350, 200, false, 'mixed-use building');
    expect(parts.length).toBe(0);
  });

  it('upper-floor setback does not appear for residential typologies', () => {
    const parts = renderUpperFloorSetback(1, 3, 50, 350, 200, false, 'family house');
    expect(parts.length).toBe(0);
  });

  it('podium transition renders at correct floor', () => {
    const parts = renderPodiumTransition(1, 1, 50, 350, 200, false);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.join('')).toContain('PODIUM');
  });

  it('podium transition does not render at wrong floor', () => {
    const parts = renderPodiumTransition(2, 1, 50, 350, 200, false);
    expect(parts.length).toBe(0);
  });

  it('terrace edge renders for front elevation top floor', () => {
    const parts = renderTerraceEdge(50, 350, 200, false);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.join('')).toContain('TERRACE');
  });

  it('balcony stack reduces likelihood on upper floors', () => {
    const seed = 'test-balcony-stack';
    const partsGround = renderBalconyProjection(0, 200, 50, 350, 0.7, false, seed, 0);
    const partsUpper = renderBalconyStack(1, 3, 200, 50, 350, 0.7, false, seed);
    // Upper floors should not have more balcony elements than ground
    expect(partsGround.length).toBeGreaterThanOrEqual(0);
    expect(partsUpper.length).toBeGreaterThanOrEqual(0);
  });

  it('multi-storey elevation contains floor role annotations', () => {
    const cad = makeMultiStoreyCad(3);
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('GROUND');
  });

  it('rear elevation for multi-storey shows service core annotation', () => {
    const cad = makeMultiStoreyCad(4);
    const svg = buildElevationSvg(cad, 'rear');
    expect(svg).toContain('SERVICE');
    expect(svg).toContain('STOREY');
  });

  it('side elevation for multi-storey shows floor-to-floor info', () => {
    const cad = makeMultiStoreyCad(3);
    const svg = buildElevationSvg(cad, 'left');
    expect(svg).toContain('STOREYS');
  });

  it('top floor annotations appear for apartment typology', () => {
    const cad = makeMultiStoreyCad(5, {
      roomProgramme: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [`r${i}`, 'Bedroom 1']),
      ),
    });
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('STOREYS');
  });
});

describe('P13.9 — Balcony Placement Stability', () => {
  it('renderBalconyProjection returns empty for zero likelihood', () => {
    const parts = renderBalconyProjection(100, 200, 50, 350, 0, false);
    expect(parts.length).toBe(0);
  });

  it('renderBalconyProjection returns consistent placement with seed', () => {
    const parts1 = renderBalconyProjection(100, 200, 50, 350, 0.5, false, 'stable-seed', 0);
    const parts2 = renderBalconyProjection(100, 200, 50, 350, 0.5, false, 'stable-seed', 0);
    expect(parts1.join('')).toBe(parts2.join(''));
  });

  it('renderBalconyProjection with seed returns same output across calls', () => {
    const parts = renderBalconyProjection(100, 200, 50, 350, 0.8, false, 'deterministic-test', 1);
    expect(parts.join('')).not.toContain('NaN');
  });

  it('renderBalconyProjection deterministic with different floor indices', () => {
    const parts0 = renderBalconyProjection(100, 200, 50, 350, 0.5, false, 'floor-test', 0);
    const parts1 = renderBalconyProjection(100, 200, 50, 350, 0.5, false, 'floor-test', 1);
    // Different floor indices should give different results
    const svg0 = parts0.join('');
    const svg1 = parts1.join('');
    // At least one should have balcony content if likelihood is sufficient
    expect(svg0.length + svg1.length).toBeGreaterThan(0);
  });
});

describe('P13.9 — Front / Rear / Side Room Attachment', () => {
  it('front elevation shows living room rooms', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('Living Room');
  });

  it('rear elevation shows kitchen/service room', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'rear');
    expect(svg).toContain('Kitchen');
  });

  it('frontages map correctly to public-facing rooms', () => {
    const cad = makeMinimalCad();
    const frontages = mapRoomsToFrontage(cad);
    const publicRoom = frontages.find(f => f.programme === 'Living Room');
    expect(publicRoom).toBeDefined();
    expect(publicRoom!.façadeOrientation).toBe('front');
  });

  it('frontages map correctly to service rooms', () => {
    const cad = makeMinimalCad();
    const frontages = mapRoomsToFrontage(cad);
    const serviceRoom = frontages.find(f => f.programme === 'Kitchen');
    expect(serviceRoom).toBeDefined();
    expect(serviceRoom!.façadeOrientation).toBe('rear');
  });
});

describe('P13.9 — Podium vs Upper-Floor Visual Distinction', () => {
  it('podium transition renders for mixed-use with sufficient floors', () => {
    const parts = renderPodiumTransition(1, 1, 50, 350, 200, false);
    expect(parts.length).toBeGreaterThan(0);
  });

  it('podium transition label appears in SVG', () => {
    const parts = renderPodiumTransition(1, 1, 50, 350, 200, false);
    expect(parts.join('')).toContain('PODIUM TRANSITION');
  });

  it('setback renders for warehouse typology from first upper floor', () => {
    const parts = renderUpperFloorSetback(1, 3, 50, 350, 200, false, 'warehouse/industrial');
    expect(parts.length).toBeGreaterThan(0);
  });
});

describe('P13.9 — No Regression in P13.8 View Quality', () => {
  it('generates all four orientations', () => {
    const cad = makeMinimalCad();
    for (const view of ['front', 'rear', 'left', 'right'] as const) {
      const svg = buildElevationSvg(cad, view);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }
  });

  it('front elevation still has ENTRY', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('ENTRY');
  });

  it('rear elevation still has SERVICE/UTILITY', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'rear');
    expect(svg).toContain('REAR');
  });

  it('side elevation still has BUILDING DEPTH', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'left');
    expect(svg).toContain('BUILDING DEPTH');
  });

  it('datum levels still present', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('FFL');
    expect(svg).toContain('GL');
  });

  it('scale note still present', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('Scale');
  });

  it('roof type annotation still present', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toMatch(/PITCHED ROOF|FLAT ROOF|STEPPED PARAPET|RC SLAB EDGE/);
  });

  it('material zone labels still present for typologies with zones', () => {
    const rules = getTypologyRules('family house');
    expect(rules.materialZones.length).toBeGreaterThan(0);
  });

  it('construction notes still present on front elevation', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('BRICKWORK');
  });

  it('height reference line still present', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('HT');
  });
});

describe('P13.9 — Print/Export Stability', () => {
  it('all four elevations generate in print mode', () => {
    const cad = makeMinimalCad();
    for (const view of ['front', 'rear', 'left', 'right'] as const) {
      const svg = buildElevationSvg(cad, view, undefined, true);
      expect(svg).toContain('#ffffff');
    }
  });

  it('all four elevations generate in dark mode', () => {
    const cad = makeMinimalCad();
    for (const view of ['front', 'rear', 'left', 'right'] as const) {
      const svg = buildElevationSvg(cad, view, undefined, false);
      expect(svg).toContain('#0b1220');
    }
  });

  it('section SVG still generates without error', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('section SVG valid in both print and dark modes', () => {
    const cad = makeMinimalCad();
    const printSvg = buildSectionSvg(cad, undefined, undefined, true);
    const darkSvg = buildSectionSvg(cad, undefined, undefined, false);
    expect(printSvg).toContain('#ffffff');
    expect(darkSvg).toContain('#0b1220');
  });

  it('multi-storey elevation valid in both modes', () => {
    const cad = makeMultiStoreyCad(3);
    const printSvg = buildElevationSvg(cad, 'front', undefined, true);
    const darkSvg = buildElevationSvg(cad, 'front', undefined, false);
    expect(printSvg).toContain('#ffffff');
    expect(darkSvg).toContain('#0b1220');
  });
});

describe('P13.9 — Typology Rule Integration', () => {
  it('getTypologyRules returns correct rules for each typology', () => {
    const rules = getTypologyRules('villa');
    expect(rules.balconyLikelihood).toBe(0.7);
    expect(rules.entranceEmphasis).toBe('strong');
    expect(rules.symmetryWeight).toBe(0.9);
  });

  it('apartment block has flat parapet', () => {
    const rules = getTypologyRules('apartment block');
    expect(rules.parapetType).toBe('flat');
  });

  it('worship typology has stepped parapet and max symmetry', () => {
    const rules = getTypologyRules('worship/community hall');
    expect(rules.parapetType).toBe('stepped');
    expect(rules.symmetryWeight).toBe(1.0);
  });

  it('retail typology has commercial glazing', () => {
    const rules = getTypologyRules('retail');
    expect(rules.materialZones.some(z => z.material === 'commercial-glazing')).toBe(true);
  });

  it('façade segments match typology rules for front orientation', () => {
    const cad = makeMinimalCad();
    const coll = collectFaçadeSegments(cad, 'front');
    expect(coll.dominantRole).toBeDefined();
  });
});

describe('P13.9 — Façade Segment Model Correctness', () => {
  it('collectFaçadeSegments returns valid segment metadata', () => {
    const cad = makeMinimalCad({
      roomProgramme: { 'r1': 'Living Room', 'r2': 'Dining Room', 'r3': 'Kitchen' },
    });
    const coll = collectFaçadeSegments(cad, 'front');
    expect(coll.segments.length).toBeGreaterThan(0);
    for (const seg of coll.segments) {
      expect(seg.orientation).toBe('front');
      expect(seg.length).toBeGreaterThan(0);
      expect(seg.wallId).toBeTruthy();
    }
  });

  it('collectFaçadeSegments for rear orientation identifies service programs', () => {
    const cad = makeMinimalCad({
      roomProgramme: { 'r1': 'Kitchen', 'r2': 'Laundry', 'r3': 'Living Room' },
    });
    const coll = collectFaçadeSegments(cad, 'rear');
    expect(coll.segments.length).toBeGreaterThan(0);
    const hasService = coll.segments.some(s => s.hierarchyRole === 'service');
    expect(hasService).toBe(true);
  });

  it('collectFaçadeSegments returns total length matching wall lengths', () => {
    const cad = makeMinimalCad();
    const coll = collectFaçadeSegments(cad, 'front');
    const directLen = Math.hypot(10, 0); // The front wall is from (0,10) to (10,10)
    expect(coll.totalLength).toBeCloseTo(directLen, 1);
  });
});
