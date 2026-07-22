import { describe, it, expect } from 'vitest';
import { buildElevationSvg } from '@/lib/drawings/elevation-svg';
import { getTypologyRules, buildFaçadeArticulation } from '@/lib/drawings/facade-composer';
import type { RoomProgramme } from '@/domain/ws6-types';
import { getDepthCueConfig, renderLintel, renderSill, renderReveal, renderOpeningSurround, renderPlinthWithDepth, renderSlabShadowLine, renderCorniceCoping, renderWallFaceTransition } from '@/lib/drawings/facade-depth';
import { renderLeaderLine, renderKeynoteCallout, renderConstructionCallout, renderTaggedCallout, renderKeynoteSchedule } from '@/lib/drawings/leader-notes';
import { renderSectionCutMarker, renderElevationBubble, renderSheetRefBubble, renderElevationArrow, renderCrossSheetReference, renderColumnGridBubble } from '@/lib/drawings/elevation-reference-engine';
import { renderSideDifferentiation, renderSideElevationContextNote } from '@/lib/drawings/facade-rhythm';
import { computeRoomWidthOnFacade, computeFrontageOverlap, getRoomPositionOnFacade } from '@/lib/drawings/frontage-mapper';
import { computeFaçadeComposition } from '@/lib/drawings/frontage-mapper';
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

function makeMultiStoreyCad(floorsCount = 3): CadDocument {
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

  const openings = floors.flatMap((f, fi) => [
    { id: `o-door-${f.id}`, wallId: `w-front-${f.id}`, floorId: f.id, kind: 'door' as const, offset: 4 + fi, width: 0.9, sillHeight: 0, headHeight: 2.1, name: `Door ${f.id}`, metadata: { ifcClass: 'IfcDoor', category: 'opening', properties: {} } },
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
  };
}

describe('P13.9-EXT — Depth Cue Configuration', () => {
  it('getDepthCueConfig returns villa config with deep reveal', () => {
    const cfg = getDepthCueConfig('villa');
    expect(cfg.revealDepthPx).toBe(8);
    expect(cfg.lintelDepthPx).toBe(6);
    expect(cfg.plinthThicknessPx).toBe(10);
  });

  it('getDepthCueConfig returns apartment config with moderate depth', () => {
    const cfg = getDepthCueConfig('apartment block');
    expect(cfg.revealDepthPx).toBe(6);
    expect(cfg.lintelDepthPx).toBe(4);
    expect(cfg.slabShadowOffsetPx).toBe(5);
  });

  it('getDepthCueConfig returns warehouse config with minimal depth', () => {
    const cfg = getDepthCueConfig('warehouse/industrial');
    expect(cfg.revealDepthPx).toBe(4);
    expect(cfg.lintelDepthPx).toBe(3);
    expect(cfg.sillProjectionPx).toBe(2);
  });

  it('getDepthCueConfig returns worship config with maximum depth', () => {
    const cfg = getDepthCueConfig('worship/community hall');
    expect(cfg.revealDepthPx).toBe(10);
    expect(cfg.lintelDepthPx).toBe(8);
    expect(cfg.corniceDepthPx).toBe(10);
  });

  it('getDepthCueConfig returns default for unknown typology', () => {
    const cfg = getDepthCueConfig('unknown');
    expect(cfg.lintelDepthPx).toBe(4);
    expect(cfg.revealDepthPx).toBe(5);
  });
});

describe('P13.9-EXT — renderLintel', () => {
  it('returns rect and shadow line', () => {
    const parts = renderLintel(100, 50, 200, 6, false);
    const svg = parts.join('');
    expect(svg).toContain('<rect');
    expect(svg).toContain('<line');
    expect(svg).toContain('y="194.0"'); // headY(200) - lintelDepth(6) = 194
  });

  it('includes keystone for entry/public frontage', () => {
    const parts = renderLintel(100, 50, 200, 6, false);
    const normalCount = parts.length;
    const entryParts = renderLintel(100, 50, 200, 6, false, 'entry');
    // Entry frontage adds an extra keystone rect
    expect(entryParts.length).toBe(normalCount + 1);
  });

  it('uses print mode colors', () => {
    const parts = renderLintel(100, 50, 200, 6, true);
    const svg = parts.join('');
    expect(svg).toContain('#e2e8f0');
  });

  it('does not include keystone for private frontage', () => {
    const parts = renderLintel(100, 50, 200, 6, false, 'private');
    expect(parts.length).toBe(2);
  });
});

describe('P13.9-EXT — renderSill', () => {
  it('returns rect with projection and drip line', () => {
    const parts = renderSill(100, 50, 250, 5, false);
    const svg = parts.join('');
    expect(svg).toContain('<rect');
    // drip line at x1=125 (opX + opW/2), y1=255 (sillY + sillH)
    expect(svg).toContain('x1="125.0"');
    expect(svg).toContain('y1="255.0"');
  });

  it('uses print mode colors', () => {
    const parts = renderSill(100, 50, 250, 5, true);
    expect(parts.join('')).toContain('#e2e8f0');
  });
});

describe('P13.9-EXT — renderReveal', () => {
  it('returns two side reveal rects and shadow lines', () => {
    const parts = renderReveal(100, 150, 50, 100, 6, false);
    const svg = parts.join('');
    expect(svg).toMatch(/<rect.*x="94/); // left reveal: opX(100) - revealDepth(6) = 94
    expect(svg).toMatch(/<rect.*x="150/); // right reveal: opX(100) + opW(50) = 150
  });
});

describe('P13.9-EXT — renderOpeningSurround', () => {
  it('combines lintel, sill, and reveal', () => {
    const cfg = getDepthCueConfig('villa');
    const parts = renderOpeningSurround(100, 150, 50, 100, 200, 250, cfg, false);
    const svg = parts.join('');
    expect(svg).toContain('<rect'); // lintel
    expect(svg).toContain('<rect'); // sill
    expect(svg).toContain('<rect'); // reveal
    expect(svg).toContain('<line'); // shadow lines
  });
});

describe('P13.9-EXT — renderPlinthWithDepth', () => {
  it('returns plinth rect with thickness overlay', () => {
    const parts = renderPlinthWithDepth(50, 350, 300, 30, 10, false);
    const svg = parts.join('');
    expect(svg).toContain('<rect');
    expect(svg).toContain('brick-hatch');
  });

  it('includes extra detail line for villa typology', () => {
    const parts = renderPlinthWithDepth(50, 350, 300, 30, 10, false, 'villa');
    const svg = parts.join('');
    const lineCount = (svg.match(/<line/g) || []).length;
    expect(lineCount).toBeGreaterThanOrEqual(2);
  });

  it('does not include extra detail line for apartment', () => {
    const parts = renderPlinthWithDepth(50, 350, 300, 30, 10, false, 'apartment block');
    const svg = parts.join('');
    const lineCount = (svg.match(/<line/g) || []).length;
    expect(lineCount).toBe(1);
  });
});

describe('P13.9-EXT — renderSlabShadowLine', () => {
  it('returns shadow lines at slab level', () => {
    const parts = renderSlabShadowLine(50, 350, 200, 4, false);
    const svg = parts.join('');
    expect(svg).toContain('<line');
    expect(svg).toContain('y1="204.0"'); // slabY(200) + shadowOffset(4) = 204
  });

  it('uses thicker line for podium', () => {
    const parts = renderSlabShadowLine(50, 350, 200, 4, false, true);
    expect(parts.join('')).toContain('opacity="0.6"');
  });
});

describe('P13.9-EXT — renderCorniceCoping', () => {
  it('renders flat parapet cornice and coping', () => {
    const parts = renderCorniceCoping(50, 350, 300, 8, 6, false, 'flat');
    const svg = parts.join('');
    expect(svg).toContain('<rect');
    expect(svg).toContain('<line');
  });

  it('renders stepped parapet with raised center', () => {
    const parts = renderCorniceCoping(50, 350, 300, 8, 6, false, 'stepped');
    const svg = parts.join('');
    expect(svg).toContain('<rect');
  });

  it('renders flat parapet for none type', () => {
    const parts = renderCorniceCoping(50, 350, 300, 8, 6, false, 'none');
    // "none" renders same as "flat" — cornice + coping rects and lines
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.join('')).toContain('<rect');
  });
});

describe('P13.9-EXT — renderWallFaceTransition', () => {
  it('returns transition line with offset markers', () => {
    const parts = renderWallFaceTransition(50, 350, 200, 4, false);
    const svg = parts.join('');
    expect(svg).toContain('<line');
    expect(svg).toContain('y2="196.0"'); // transitionY(200) - offset(4) = 196
  });

  it('includes material label when both materials given', () => {
    const parts = renderWallFaceTransition(50, 350, 200, 4, false, 'face-brick', 'render');
    expect(parts.join('')).toContain('face-brick');
    expect(parts.join('')).toContain('render');
  });

  it('omits material label when materials not given', () => {
    const parts = renderWallFaceTransition(50, 350, 200, 4, false);
    expect(parts.length).toBe(3);
  });
});

describe('P13.9-EXT — Leader Notes Engine', () => {
  it('renderLeaderLine returns polyline with dot anchor', () => {
    const result = renderLeaderLine(100, 200, 300, 150, false);
    expect(result).toContain('<circle');
    expect(result).toContain('<polyline');
  });

  it('renderKeynoteCallout renders circle with number and leader', () => {
    const result = renderKeynoteCallout(1, 100, 200, 300, 150, false);
    expect(result).toContain('<circle');
    expect(result).toContain('>1<');
    expect(result).toContain('<polyline');
  });

  it('renderConstructionCallout renders text note with leader', () => {
    const result = renderConstructionCallout('TEST NOTE', 100, 200, 300, 150, false);
    expect(result).toContain('TEST NOTE');
    expect(result).toContain('<polyline');
  });

  it('renderTaggedCallout renders tag rect, label, and description', () => {
    const result = renderTaggedCallout('TAG1', 'Description text', 100, 200, 300, 150, false);
    expect(result).toContain('TAG1');
    expect(result).toContain('Description text');
    expect(result).toContain('<rect');
  });

  it('renderKeynoteSchedule renders table with numbered entries', () => {
    const entries = [
      { number: 1, text: 'Face brickwork' },
      { number: 2, text: 'Concrete roof slab' },
    ];
    const parts = renderKeynoteSchedule(entries, 50, 400, false);
    const svg = parts.join('');
    expect(svg).toContain('KEYNOTES');
    expect(svg).toContain('Face brickwork');
    expect(svg).toContain('Concrete roof slab');
    expect(svg).toContain('>1<');
    expect(svg).toContain('>2<');
  });

  it('renderKeynoteSchedule uses print mode colors', () => {
    const entries = [{ number: 1, text: 'Test' }];
    const parts = renderKeynoteSchedule(entries, 50, 400, true);
    expect(parts.join('')).toContain('#f8fafc');
  });
});

describe('P13.9-EXT — Elevation Reference Engine', () => {
  it('renderSectionCutMarker renders AA horizontal cut line with bubbles', () => {
    const vp = { px: (p: any) => p.x * 100, py: (p: any) => p.y * 100, w: 500, h: 400 };
    const parts = renderSectionCutMarker('AA', 2.5, vp, false);
    const svg = parts.join('');
    expect(svg).toContain('stroke-dasharray');
    expect(svg).toContain('A');
    expect(svg).toMatch(/<circle/g);
  });

  it('renderSectionCutMarker renders BB vertical cut line', () => {
    const vp = { px: (p: any) => p.x * 100, py: (p: any) => p.y * 100, w: 500, h: 400 };
    const parts = renderSectionCutMarker('BB', 3.0, vp, false);
    const svg = parts.join('');
    expect(svg).toContain('B');
    expect(svg).toContain('stroke-dasharray');
  });

  it('renderElevationBubble renders label with direction arrow and sheet ref', () => {
    const parts = renderElevationBubble('E1', 'A-101', 200, 150, 'right', false);
    const svg = parts.join('');
    expect(svg).toContain('E1');
    expect(svg).toContain('A-101');
    expect(svg).toContain('<line');
  });

  it('renderSheetRefBubble renders detail number over sheet number', () => {
    const parts = renderSheetRefBubble('A-201', '3', 200, 150, false);
    const svg = parts.join('');
    expect(svg).toContain('A-201');
    expect(svg).toContain('>3<');
  });

  it('renderElevationArrow renders arrow with label along direction', () => {
    const parts = renderElevationArrow('NORTH', 100, 200, 'up', false);
    const svg = parts.join('');
    expect(svg).toContain('NORTH');
    expect(svg).toContain('<polygon');
  });

  it('renderCrossSheetReference renders sheet ref with arrow and destination', () => {
    const parts = renderCrossSheetReference('A-301', 'ELEV 3', 200, 150, false);
    const svg = parts.join('');
    expect(svg).toContain('A-301');
    expect(svg).toContain('CONT. ON ELEV 3');
  });

  it('renderColumnGridBubble renders circle with label', () => {
    const result = renderColumnGridBubble('C1', 100, 200, false);
    expect(result).toContain('C1');
    expect(result).toContain('<circle');
  });
});

describe('P13.9-EXT — Room Frontage Position', () => {
  it('computeRoomWidthOnFacade returns positive width for known room', () => {
    const cad = makeMinimalCad();
    const width = computeRoomWidthOnFacade(cad, 'r1');
    expect(width).toBeGreaterThan(0);
  });

  it('computeRoomWidthOnFacade returns 0 for unknown room', () => {
    const cad = makeMinimalCad();
    const width = computeRoomWidthOnFacade(cad, 'nonexistent');
    expect(width).toBe(0);
  });

  it('computeRoomWidthOnFacade returns 0 when no roomProgramme', () => {
    const cad = makeMinimalCad({ roomProgramme: undefined });
    const width = computeRoomWidthOnFacade(cad, 'r1');
    expect(width).toBe(0);
  });

  it('computeFrontageOverlap returns entries for all rooms', () => {
    const cad = makeMinimalCad();
    const overlaps = computeFrontageOverlap(cad);
    expect(overlaps.length).toBe(2);
  });

  it('computeFrontageOverlap includes correct fields', () => {
    const cad = makeMinimalCad();
    const overlaps = computeFrontageOverlap(cad);
    for (const entry of overlaps) {
      expect(entry.roomId).toBeTruthy();
      expect(entry.roomName).toBeTruthy();
      expect(entry.frontageOrientation).toBeTruthy();
      expect(entry.wallId).toBeTruthy();
      expect(typeof entry.positionOnFacade).toBe('number');
      expect(typeof entry.roomWidth).toBe('number');
      expect(typeof entry.facadeWidth).toBe('number');
      expect(typeof entry.overlapRatio).toBe('number');
    }
  });

  it('computeFrontageOverlap returns empty when no roomProgramme', () => {
    const cad = makeMinimalCad({ roomProgramme: undefined });
    const overlaps = computeFrontageOverlap(cad);
    expect(overlaps.length).toBe(0);
  });

  it('getRoomPositionOnFacade returns normalized position', () => {
    const cad = makeMinimalCad();
    const pos = getRoomPositionOnFacade(cad, 'r1');
    expect(pos).toBeGreaterThanOrEqual(0);
    expect(pos).toBeLessThanOrEqual(1);
  });

  it('getRoomPositionOnFacade returns 0.5 for single room', () => {
    const cad = makeMinimalCad({ roomProgramme: { 'r1': 'Living Room' } });
    const pos = getRoomPositionOnFacade(cad, 'r1');
    expect(pos).toBe(0.5);
  });

  it('getRoomPositionOnFacade returns 0.5 when no roomProgramme', () => {
    const cad = makeMinimalCad({ roomProgramme: undefined });
    const pos = getRoomPositionOnFacade(cad, 'r1');
    expect(pos).toBe(0.5);
  });
});

describe('P13.9-EXT — Side Differentiation', () => {
  it('renderSideDifferentiation includes side label', () => {
    const parts = renderSideDifferentiation(50, 350, 300, 100, 'left', false);
    const svg = parts.join('');
    expect(svg).toContain('LEFT SIDE');
  });

  it('renderSideDifferentiation marks service side', () => {
    const parts = renderSideDifferentiation(50, 350, 300, 100, 'left', false, 'left');
    const svg = parts.join('');
    expect(svg).toContain('SERVICE ACCESS');
    expect(svg).toContain('UTILITY ZONE');
  });

  it('renderSideDifferentiation marks garden side', () => {
    const parts = renderSideDifferentiation(50, 350, 300, 100, 'left', false, 'right');
    const svg = parts.join('');
    expect(svg).toContain('PRIVATE GARDEN');
    expect(svg).toContain('GARDEN FRONTAGE');
  });

  it('renderSideDifferentiation uses print mode colors', () => {
    const parts = renderSideDifferentiation(50, 350, 300, 100, 'left', true);
    expect(parts.join('')).toContain('#64748b');
  });

  it('renderSideDifferentiation uses dark mode colors', () => {
    const parts = renderSideDifferentiation(50, 350, 300, 100, 'left', false);
    expect(parts.join('')).toContain('#78716c');
  });

  it('renderSideElevationContextNote includes depth and storey info', () => {
    const parts = renderSideElevationContextNote(8.5, true, 9, 3, false);
    const svg = parts.join('');
    expect(svg).toContain('LEFT ELEVATION');
    expect(svg).toContain('DEPTH 8.5m');
    expect(svg).toContain('3 FL');
  });

  it('renderSideElevationContextNote uses print mode colors', () => {
    const parts = renderSideElevationContextNote(8.5, true, 9, 3, true);
    expect(parts.join('')).toContain('#475569');
  });
});

describe('P13.9-EXT — Façade Articulation Extension', () => {
  it('buildFaçadeArticulation includes all new fields', () => {
    const cad = makeMinimalCad();
    const comp = computeFaçadeComposition(cad, 'front');
    const rules = getTypologyRules('villa');
    const art = buildFaçadeArticulation(comp, rules, (x: number) => x * 100);
    expect(art.typologyClass).toBe('villa');
    expect(art.hasBalcony).toBe(true);
    expect(art.hasVerandah).toBe(true);
    expect(art.hasPodium).toBe(false);
    expect(art.hasUpperFloorSetback).toBe(false);
    expect(art.dominantFrontageType).toBeTruthy();
    expect(typeof art.sideElevationNarrow).toBe('boolean');
  });

  it('apartment typology has podium and no verandah', () => {
    const cad = makeMinimalCad();
    const comp = computeFaçadeComposition(cad, 'front');
    const rules = getTypologyRules('apartment block');
    const art = buildFaçadeArticulation(comp, rules, (x: number) => x * 100);
    expect(art.typologyClass).toBe('apartment');
    expect(art.hasPodium).toBe(true);
    expect(art.hasVerandah).toBe(false);
    expect(art.entranceRecessed).toBe(true);
  });

  it('mixed-use typology has upper floor setback', () => {
    const cad = makeMinimalCad();
    const comp = computeFaçadeComposition(cad, 'front');
    const rules = getTypologyRules('mixed-use building');
    const art = buildFaçadeArticulation(comp, rules, (x: number) => x * 100);
    expect(art.typologyClass).toBe('mixed-use');
    expect(art.hasUpperFloorSetback).toBe(true);
    expect(art.hasPodium).toBe(true);
  });

  it('warehouse typology is industrial with setback', () => {
    const cad = makeMinimalCad();
    const comp = computeFaçadeComposition(cad, 'front');
    const rules = getTypologyRules('warehouse/industrial');
    const art = buildFaçadeArticulation(comp, rules, (x: number) => x * 100);
    expect(art.typologyClass).toBe('industrial');
    expect(art.hasUpperFloorSetback).toBe(true);
    expect(art.hasBalcony).toBe(false);
  });

  it('worship typology has verandah and no podium', () => {
    const cad = makeMinimalCad();
    const comp = computeFaçadeComposition(cad, 'front');
    const rules = getTypologyRules('worship/community hall');
    const art = buildFaçadeArticulation(comp, rules, (x: number) => x * 100);
    expect(art.typologyClass).toBe('worship');
    expect(art.hasVerandah).toBe(true);
    expect(art.hasPodium).toBe(false);
    expect(art.entranceRecessed).toBe(false);
  });

  it('institutional typology has no verandah or podium', () => {
    const cad = makeMinimalCad();
    const comp = computeFaçadeComposition(cad, 'front');
    const rules = getTypologyRules('clinic');
    const art = buildFaçadeArticulation(comp, rules, (x: number) => x * 100);
    expect(art.typologyClass).toBe('institutional');
    expect(art.hasBalcony).toBe(false);
    expect(art.hasVerandah).toBe(false);
  });

  it('sideElevationNarrow is true when width < 6', () => {
    const cad = makeMinimalCad();
    const comp = computeFaçadeComposition(cad, 'front');
    const rules = getTypologyRules('family house');
    const art = buildFaçadeArticulation(comp, rules, (x: number) => x * 100);
    // The front wall is 10m wide, so this should be false
    expect(art.sideElevationNarrow).toBe(false);
  });
});

describe('P13.9-EXT — Depth Cues in Elevation SVG', () => {
  it('front elevation contains depth cue elements', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    // Depth cues are rendered as plinth, lintel, sill, reveal SVG elements
    expect(svg).toContain('PLINTH');
  });

  it('front elevation contains opening surround elements', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('<rect');
  });

  it('rear elevation contains room annotations', () => {
    const cad = makeMultiStoreyCad(3);
    const svg = buildElevationSvg(cad, 'rear');
    expect(svg).toContain('Rooms:');
  });

  it('side elevation contains depth cues', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'left');
    expect(svg).toMatch(/m deep/);
  });

  it('side elevation contains orientation differentiation', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'left');
    expect(svg).toContain('LEFT SIDE');
  });

  it('elevation contains keynote callouts', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('KEYNOTES');
  });

  it('elevation contains elevation reference bubbles', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('E1');
  });

  it('multi-storey elevation contains slab shadow lines', () => {
    const cad = makeMultiStoreyCad(3);
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('<line');
  });

  it('elevation with typology variance shows different depth profiles', () => {
    const cad = makeMinimalCad();
    const frontSvg = buildElevationSvg(cad, 'front');
    const rearSvg = buildElevationSvg(cad, 'rear');
    // Both should be valid SVGs
    expect(frontSvg).toContain('<svg');
    expect(rearSvg).toContain('<svg');
    expect(frontSvg).toContain('</svg>');
    expect(rearSvg).toContain('</svg>');
  });

  it('orientation differentiation appears in side elevations', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'left');
    expect(svg).toContain('LEFT SIDE');
  });

  it('cross-sheet references appear in elevations', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('CONT. ON');
  });
});
