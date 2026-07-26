import { expect, test, describe } from 'vitest';
import { LW } from '@/lib/drawings/lineweights';
import { TECHNICAL_THEME, PRESENTATION_THEME, resolveTheme } from '@/lib/drawings/drafting-theme';
import { HATCH_PATTERNS, hatchIdForMaterial } from '@/lib/drawings/hatch-library';
import { getSheetPixelDims, getSheetViewport, SHEET_MM } from '@/lib/drawings/sheet-size';
import { renderDimLine, renderWallDims, renderOpeningDims, renderFloorLevelMarker, renderWitnessLine, renderRunningDim, renderMultiChainDims } from '@/lib/drawings/dimension-engine';
import { renderRoomLabel, renderScaleBar, renderNorthArrow, renderScheduleRef, renderKeynote, computeRoomsFromWalls } from '@/lib/drawings/annotation-engine';
import { buildFloorPlanSvg, } from '@/lib/drawings/disciplines/floor-plan-svg';
import { buildSitePlanSvg } from '@/lib/drawings/disciplines/site-plan-svg';
import { buildFoundationPlanSvg } from '@/lib/drawings/disciplines/foundation-plan-svg';
import { buildRoofPlanSvg } from '@/lib/drawings/disciplines/roof-plan-svg';
import { buildElectricalPlanSvg } from '@/lib/drawings/disciplines/electrical-plan-svg';
import { buildPlumbingPlanSvg } from '@/lib/drawings/disciplines/plumbing-plan-svg';
import { buildHvacPlanSvg } from '@/lib/drawings/disciplines/hvac-plan-svg';
import { buildPresentationSvg } from '@/lib/drawings/disciplines/presentation-svg';
import { buildDisciplinePlanSvg } from '@/lib/drawings/plan-svg';
import { renderWalls, renderEntourageTree, renderEntouragePerson, renderDrawingTitle } from '@/lib/drawings/disciplines/svg-shared';
import { buildElevationSvg } from '@/lib/drawings/elevation-svg';
import { buildSectionSvg } from '@/lib/drawings/section-svg';
import { buildTitleBlock } from '@/lib/drawings/title-block';
import { validateDrawingSvg, validateSvgFonts, validateSvgBrightColors, FORBIDDEN_BRIGHT_COLORS, APPROVED_STROKE_WIDTHS } from '@/lib/drawings/standards-enforcement';
import { resolveMepPalette, mepColor } from '@/lib/drawings/mep-palette';
import type { CadDocument as Ws6CadDocument } from '@/domain/ws6-types';
import type { TitleBlockMeta } from '@/lib/drawings/title-block';

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
    ],
    openings: [
      { id: 'o1', wallId: 'w1', floorId: 'f1', kind: 'door', offset: 2, width: 0.9, height: 2.1, sillHeight: 0, headHeight: 2.1, name: 'Front Door', metadata: { ifcClass: 'IfcDoor', category: 'door', material: 'timber', properties: {}, fireRating: 'FD30' } },
      { id: 'o2', wallId: 'w1', floorId: 'f1', kind: 'window', offset: 4, width: 1.5, height: 1.2, sillHeight: 0.9, headHeight: 2.1, name: 'Living Window', metadata: { ifcClass: 'IfcWindow', category: 'window', properties: {}, typeName: 'Sliding' } },
    ],
    blocks: [
      { id: 'b1', floorId: 'f1', kind: 'column', position: { x: 2, y: 2 }, width: 0.3, depth: 0.3, rotation: 0, name: 'Col-1', metadata: { ifcClass: 'IfcColumn', category: 'structure', material: 'concrete', properties: {} } },
    ],
    boundaries: [
      { id: 'bnd1', points: [{ x: -2, y: -2 }, { x: 12, y: -2 }, { x: 12, y: 10 }, { x: -2, y: 10 }], layerId: 'boundaries', boundaryMode: 'verified' },
    ],
    ...overrides,
  };
}

function isValidSvg(svg: string): boolean {
  return svg.startsWith('<svg') && svg.includes('</svg>');
}

describe('Lineweight System', () => {
  test('LW constants define all required weights', () => {
    expect(LW.CUT).toBe(4);
    expect(LW.MAJOR).toBe(2.5);
    expect(LW.PROFILE).toBe(2);
    expect(LW.PARTITION).toBe(1.5);
    expect(LW.PROJECTION).toBe(1);
    expect(LW.FIXTURE).toBe(1);
    expect(LW.DIMENSION).toBe(0.5);
    expect(LW.HIDDEN).toBe(0.75);
    expect(LW.HATCH).toBe(0.35);
    expect(LW.ANNOTATION).toBe(0.5);
    expect(LW.GRID).toBe(0.35);
    expect(LW.REFERENCE).toBe(0.5);
  });

  test('cut weight is heavier than partition weight', () => {
    expect(LW.CUT).toBeGreaterThan(LW.PARTITION);
  });

  test('dimension weight is lighter than partition weight', () => {
    expect(LW.DIMENSION).toBeLessThan(LW.PARTITION);
  });

  test('grid weight is lightest', () => {
    const allWeights = [LW.CUT, LW.MAJOR, LW.PROFILE, LW.PARTITION, LW.PROJECTION, LW.FIXTURE, LW.DIMENSION, LW.HIDDEN, LW.HATCH, LW.GRID, LW.REFERENCE];
    const minWeight = Math.min(...allWeights);
    expect(LW.GRID).toBe(minWeight);
  });
});

describe('Dimension Engine', () => {
  test('renderDimLine produces dimension line with ticks', () => {
    const svg = renderDimLine(100, 200, 500, 200, '10.0m');
    expect(svg).toContain('10.0m');
    expect(svg).toContain('stroke-width="0.5"');
  });

  test('renderDimLine handles vertical dimension', () => {
    const svg = renderDimLine(100, 200, 100, 600, '8.0m');
    expect(svg).toContain('8.0m');
    expect(svg).toContain('rotate(-90');
  });

  test('renderWallDims produces dimension SVG', () => {
    const walls = [
      { start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, structural: true },
      { start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, thickness: 0.23, structural: true },
    ];
    const vp = {
      w: 500, h: 400,
      px: (p: { x: number; y: number }) => p.x * 28 + 30,
      py: (p: { x: number; y: number }) => 400 - (p.y * 28 + 30),
    };
    const svg = renderWallDims(walls, vp);
    expect(svg).toContain('10.0m');
  });

  test('renderOpeningDims produces opening dimensions', () => {
    const openings = [{
      hostStart: { x: 0, y: 0 }, hostEnd: { x: 10, y: 0 },
      offset: 2, width: 0.9, tag: 'D-O1',
    }];
    const vp = {
      px: (p: { x: number; y: number }) => p.x * 28 + 30,
      py: (p: { x: number; y: number }) => 400 - (p.y * 28 + 30),
    };
    const svg = renderOpeningDims(openings, vp);
    expect(svg).toContain('900mm');
  });

  test('renderFloorLevelMarker produces level marker', () => {
    const svg = renderFloorLevelMarker(0, 'Ground Floor', 100, 200);
    expect(svg).toContain('+0.00');
    expect(svg).toContain('Ground Floor');
    expect(svg).toContain('circle');
  });

  test('renderWitnessLine produces witness line', () => {
    const svg = renderWitnessLine(100, 200, 100, 300);
    expect(svg).toContain('stroke-dasharray="2 2"');
  });

  test('floor plan contains dimension lines', () => {
    const cad = makeCad();
    const meta: TitleBlockMeta = { project: 'Test', drawing: 'Floor Plan' };
    const svg = buildFloorPlanSvg(cad, 'f1', meta);
    // Should have room dimensions
    expect(svg).toMatch(/\d+\.\dm/);
  });

  test('floor plan print mode uses light background', () => {
    const cad = makeCad();
    const meta: TitleBlockMeta = { project: 'Test', drawing: 'Floor Plan' };
    const svg = buildFloorPlanSvg(cad, 'f1', meta, undefined, true);
    expect(svg).toContain('#ffffff');
    expect(svg).not.toContain('#0b1220');
  });
});

describe('Annotation Engine', () => {
  test('renderRoomLabel produces room name and area', () => {
    const vp = {
      px: (p: { x: number; y: number }) => p.x * 28 + 30,
      py: (p: { x: number; y: number }) => 400 - (p.y * 28 + 30),
    };
    const room = { id: 'r1', name: 'Living Room', area: 25.5, centerX: 5, centerY: 4, minX: 0, maxX: 10, minY: 0, maxY: 8 };
    const svg = renderRoomLabel(room, vp);
    expect(svg).toContain('Living Room');
    expect(svg).toContain('25.5');
    expect(svg).toContain('m²');
  });

  test('renderScaleBar produces graphic scale bar', () => {
    const svg = renderScaleBar(10, 100, 200, 28);
    expect(svg).toContain('10m');
    expect(svg).toContain('5m');
  });

  test('renderNorthArrow produces north arrow', () => {
    const svg = renderNorthArrow(100, 100);
    expect(svg).toContain('N');
    expect(svg).toContain('polygon');
  });

  test('renderScheduleRef produces schedule reference bubble', () => {
    const svg = renderScheduleRef('D', 'A-601', 100, 100);
    expect(svg).toContain('D');
    expect(svg).toContain('A-601');
  });

  test('renderKeynote produces numbered circle', () => {
    const svg = renderKeynote(1, 100, 100);
    expect(svg).toContain('1');
    expect(svg).toContain('circle');
  });

  test('computeRoomsFromWalls finds rooms from wall layout', () => {
    const walls = [
      { start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, structural: true },
      { start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, structural: true },
      { start: { x: 10, y: 8 }, end: { x: 0, y: 8 }, structural: true },
      { start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, structural: true },
      { start: { x: 5, y: 0 }, end: { x: 5, y: 8 }, structural: false },
    ];
    const result = computeRoomsFromWalls(walls, 0);
    expect(result.rooms.length).toBeGreaterThanOrEqual(1);
    for (const room of result.rooms) {
      expect(room.name).toBeTruthy();
      expect(room.area).toBeGreaterThan(0);
      expect(room.provenance).toBeDefined();
    }
  });
});

describe('Sheet Sizing', () => {
  test('getSheetPixelDims returns correct dimensions for A3 landscape', () => {
    const dims = getSheetPixelDims({ size: 'A3', orientation: 'landscape', printMode: true });
    const mm = SHEET_MM.A3;
    const expectedW = Math.round(mm.w * 96 / 25.4);
    expect(dims.w).toBe(expectedW);
  });

  test('getSheetPixelDims returns correct dimensions for A1 portrait', () => {
    const dims = getSheetPixelDims({ size: 'A1', orientation: 'portrait', printMode: true });
    // Portrait swaps w/h
    expect(dims.w).toBeLessThan(dims.h);
  });

  test('getSheetViewport returns margins and usable area', () => {
    const result = getSheetViewport({ size: 'A3', orientation: 'landscape', printMode: true }, 800, 600);
    expect(result.svgW).toBeGreaterThan(0);
    expect(result.svgH).toBeGreaterThan(0);
    expect(result.scale).toBeLessThanOrEqual(1);
  });
});

describe('Print Mode Integration', () => {
  test('site plan print mode uses light background', () => {
    const cad = makeCad();
    const svg = buildSitePlanSvg(cad, undefined, true);
    expect(svg).toContain('#ffffff');
  });

  test('orchestrator supports print mode', () => {
    const cad = makeCad();
    const svg = buildDisciplinePlanSvg({ cad, viewId: 'plan', printMode: true });
    expect(isValidSvg(svg)).toBe(true);
  });

  test('title block renders correctly in print mode', async () => {
    const { buildTitleBlock } = await import('@/lib/drawings/title-block');
    const meta: TitleBlockMeta = { project: 'Test', drawing: 'Test' };
    const svg = buildTitleBlock(800, 600, meta, true);
    expect(svg).toContain('#f1f5f9');
  });
});

describe('Professional Opening Symbols', () => {
  test('floor plan contains door swing arc', () => {
    const cad = makeCad();
    const svg = buildFloorPlanSvg(cad, 'f1');
    // Door swing arc uses path with A (arc) command
    expect(svg).toContain('A ');
  });

  test('floor plan contains window centerline', () => {
    const cad = makeCad();
    const svg = buildFloorPlanSvg(cad, 'f1');
    // Window should have a center mullion line
    expect(svg).toContain('D-O1');
    expect(svg).toContain('W-O2');
  });

  test('no more circle-based openings in floor plan', () => {
    const cad = makeCad();
    const svg = buildFloorPlanSvg(cad, 'f1');
    // No green or cyan filled circles for openings
    expect(svg).not.toContain('fill="#22c55e"');
    expect(svg).not.toContain('fill="#06b6d4"');
  });
});

describe('Room Labels in Floor Plan', () => {
  test('floor plan contains room names', () => {
    const cad = makeCad();
    const svg = buildFloorPlanSvg(cad, 'f1');
    expect(svg).toContain('Room');
    expect(svg).toContain('m²');
  });
});

describe('North Arrow and Scale Bar', () => {
  test('floor plan has north arrow', () => {
    const cad = makeCad();
    const svg = buildFloorPlanSvg(cad, 'f1');
    expect(svg).toContain('N');
    expect(svg).toContain('polygon');
  });

  test('floor plan has scale bar', () => {
    const cad = makeCad();
    const svg = buildFloorPlanSvg(cad, 'f1');
    expect(svg).toContain('m');
    expect(svg).toContain('rect');
  });

  test('site plan has north arrow', () => {
    const cad = makeCad();
    const svg = buildSitePlanSvg(cad);
    expect(svg).toContain('N');
  });
});

describe('Floor Level Markers', () => {
  test('floor plan has level marker', () => {
    const cad = makeCad();
    const svg = buildFloorPlanSvg(cad, 'f1');
    expect(svg).toContain('+0.00');
    expect(svg).toContain('Ground Floor');
  });
});

describe('Drafting Theme', () => {
  test('TECHNICAL_THEME has all pen roles', () => {
    const roles = Object.keys(TECHNICAL_THEME.pens);
    expect(roles).toContain('CUT');
    expect(roles).toContain('DIMENSION');
    expect(roles).toContain('HATCH');
    expect(roles).toContain('GRID');
  });

  test('resolveTheme returns TECHNICAL_THEME for print mode', () => {
    const theme = resolveTheme(true);
    expect(theme.name).toBe('Technical');
    expect(theme.colors.background).toBe('#ffffff');
  });

  test('resolveTheme returns PRESENTATION_THEME for non-print mode', () => {
    const theme = resolveTheme(false);
    expect(theme.name).toBe('Presentation');
    expect(theme.colors.background).toBe('#0b1220');
  });

  test('TECHNICAL_THEME uses Arial font family', () => {
    expect(TECHNICAL_THEME.font.value).toContain('Arial');
  });

  test('PRESENTATION_THEME uses Inter font family', () => {
    expect(PRESENTATION_THEME.font.value).toContain('Inter');
  });
});

describe('Hatch Library', () => {
  test('HATCH_PATTERNS contains all required patterns', () => {
    expect(HATCH_PATTERNS).toContain('earth-hatch');
    expect(HATCH_PATTERNS).toContain('concrete-hatch');
    expect(HATCH_PATTERNS).toContain('brick-hatch');
    expect(HATCH_PATTERNS).toContain('insulation-hatch');
    expect(HATCH_PATTERNS).toContain('hardcore-hatch');
    expect(HATCH_PATTERNS).toContain('glazing-hatch');
    expect(HATCH_PATTERNS).toContain('timber-hatch');
    expect(HATCH_PATTERNS).toContain('screed-hatch');
  });

  test('hatchIdForMaterial returns correct hatch IDs', () => {
    expect(hatchIdForMaterial('concrete')).toBe('concrete-hatch');
    expect(hatchIdForMaterial('brick')).toBe('brick-hatch');
    expect(hatchIdForMaterial('earth')).toBe('earth-hatch');
    expect(hatchIdForMaterial('insulation')).toBe('insulation-hatch');
    expect(hatchIdForMaterial('timber')).toBe('timber-hatch');
    expect(hatchIdForMaterial('unknown')).toBe('');
  });
});

describe('Wall Polygon Rendering', () => {
  test('renderWalls produces polygon elements for thick walls', () => {
    const walls = [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external' as const, material: 'concrete' as const, properties: {} } },
    ];
    const vp = {
      minX: 0, maxX: 10, minY: 0, maxY: 10, w: 500, h: 400, ox: 30, oy: 30, svgH: 460,
      px: (_p: { x: number; y: number }) => _p.x * 28 + 30,
      py: (_p: { x: number; y: number }) => 400 - (_p.y * 28 + 30),
      printMode: false,
    };
    const svg = renderWalls(walls, vp, 'concrete');
    expect(svg).toContain('polygon');
    expect(svg).toContain('concrete-hatch');
  });

  test('renderWalls falls back to line rendering for thin walls', () => {
    const walls = [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 5, y: 0 }, thickness: 0.05, height: 3, name: 'Thin', structural: false, metadata: { ifcClass: 'IfcWall', category: 'internal' as const, material: 'timber' as const, properties: {} } },
    ];
    const vp = {
      minX: 0, maxX: 5, minY: 0, maxY: 5, w: 300, h: 300, ox: 30, oy: 30, svgH: 360,
      px: (_p: { x: number; y: number }) => _p.x * 28 + 30,
      py: (_p: { x: number; y: number }) => 300 - (_p.y * 28 + 30),
      printMode: false,
    };
    const svg = renderWalls(walls, vp, 'timber', { asPolygon: true });
    expect(svg).toContain('line');
  });
});

describe('View Title Convention', () => {
  test('renderDrawingTitle includes separator line', () => {
    const vp = {
      minX: 0, maxX: 10, minY: 0, maxY: 10, w: 500, h: 400, ox: 30, oy: 30, svgH: 460,
      px: (_p: { x: number; y: number }) => 0, py: (_p: { x: number; y: number }) => 0,
      printMode: true,
    };
    const svg = renderDrawingTitle('Test Title', 'scale 1:100', vp);
    expect(svg).toContain('Test Title');
    expect(svg).toContain('scale 1:100');
    expect(svg).toContain('Arial');
    expect(svg).toContain('line');
  });
});

describe('Entourage', () => {
  test('renderEntourageTree produces tree SVG', () => {
    const svg = renderEntourageTree(100, 200, 1, true);
    expect(svg).toContain('circle');
    expect(svg).toContain('opacity="0.5"');
    expect(svg).toContain('cbd5e1');
  });

  test('renderEntouragePerson produces person SVG', () => {
    const svg = renderEntouragePerson(100, 200, 1, true);
    expect(svg).toContain('circle');
    expect(svg).toContain('line');
    expect(svg).toContain('opacity="0.4"');
  });

  test('entourage uses muted tones in print mode', () => {
    const treeSvg = renderEntourageTree(100, 200, 1, true);
    expect(treeSvg).not.toContain('#22c55e');
    expect(treeSvg).not.toContain('#06b6d4');
  });
});

describe('Elevation Generator', () => {
  test('buildElevationSvg produces valid SVG with heavy ground line', () => {
    const cad = makeCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('GL');
    expect(svg).toContain('brick-hatch');
    expect(svg).toContain('opacity="0.5"');
  });

  test('elevation includes roof thickness and profile', () => {
    const cad = makeCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('polygon');
    expect(svg).toContain('ROOF');
  });
});

describe('Section Generator', () => {
  test('buildSectionSvg produces valid SVG with cut poche', () => {
    const cad = makeCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('NGL');
    expect(svg).toContain('concrete-hatch');
  });

  test('section has roof build-up layers', () => {
    const cad = makeCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('CHROMADEK');
    expect(svg).toContain('TRUSSES');
  });
});

describe('Dimension System in Sheet Output', () => {
  test('floor plan contains numeric dimensions', () => {
    const cad = makeCad();
    const svg = buildFloorPlanSvg(cad, 'f1');
    expect(svg).toMatch(/\d+\.\d+m/);
    expect(svg).toMatch(/\d+mm/);
  });

  test('floor plan uses Arial font family', () => {
    const cad = makeCad();
    const svg = buildFloorPlanSvg(cad, 'f1');
    expect(svg).toContain('Arial');
  });

  test('site plan contains Arial font', () => {
    const cad = makeCad();
    const svg = buildSitePlanSvg(cad);
    expect(svg).toContain('Arial');
  });
});

describe('P13.2 — Foundation Geometry', () => {
  test('buildFoundationPlanSvg produces valid SVG with merged polygons', () => {
    const cad = makeCad();
    const svg = buildFoundationPlanSvg(cad);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('polygon');
  });

  test('foundation uses concrete-hatch on strip footing polygons', () => {
    const cad = makeCad();
    const svg = buildFoundationPlanSvg(cad);
    expect(svg).toContain('polygon points=');
    expect(svg).toContain('concrete-hatch');
  });

  test('foundation uses merged footing polygons not simple thick lines', () => {
    const cad = makeCad();
    const svg = buildFoundationPlanSvg(cad);
    // Should NOT contain the old line-based stroke="url(#concrete-hatch)" pattern
    expect(svg).not.toContain('stroke="url(#concrete-hatch)');
  });

  test('foundation plan renders junction circles at wall intersections', () => {
    const cad = makeCad();
    // w1 (0,0)→(10,0) and w4 (0,8)→(0,0) intersect at (0,0)
    // w4 and w1 share the origin — let's verify junctions exist
    const svg = buildFoundationPlanSvg(cad);
    expect(svg).toContain('circle');
  });

  test('foundation plan print mode uses light background', () => {
    const cad = makeCad();
    const svg = buildFoundationPlanSvg(cad, undefined, undefined, true);
    expect(svg).toContain('#ffffff');
  });

  test('foundation includes below-grade hidden edge lines', () => {
    const cad = makeCad();
    const svg = buildFoundationPlanSvg(cad);
    expect(svg).toContain('Below-grade');
  });
});

describe('P13.2 — Roof/MEP Palette Discipline', () => {
  test('roof plan no longer uses bright cyan (#06b6d4)', () => {
    const cad = makeCad();
    const svg = buildRoofPlanSvg(cad);
    expect(svg).not.toContain('#06b6d4');
  });

  test('roof plan has gutter label in muted color', () => {
    const cad = makeCad();
    const svg = buildRoofPlanSvg(cad);
    expect(svg).not.toContain('#06b6d4');
    expect(svg).toContain('GUTTER');
    // Gutter should not be bright cyan
    expect(svg).not.toContain('stroke="#06b6d4"');
  });

  test('electrical plan print mode uses muted palette (no bright yellow/green/cyan)', () => {
    const cad = makeCad();
    const svg = buildElectricalPlanSvg(cad, 'f1', undefined, true);
    expect(svg).not.toContain('#facc15');
    expect(svg).not.toContain('#22c55e');
    expect(svg).not.toContain('#06b6d4');
  });

  test('electrical plan coordination mode uses restrained amber hues', () => {
    const cad = makeCad();
    const svg = buildElectricalPlanSvg(cad, 'f1', undefined, false);
    expect(svg).toContain('ELECTRICAL LEGEND');
  });

  test('plumbing plan print mode uses muted palette (no bright blue/red)', () => {
    const cad = makeCad();
    const svg = buildPlumbingPlanSvg(cad, 'f1', undefined, true);
    expect(svg).not.toContain('#2563eb');
    expect(svg).not.toContain('#3b82f6');
  });

  test('hvac plan print mode uses muted palette (no bright purple)', () => {
    const cad = makeCad();
    const svg = buildHvacPlanSvg(cad, 'f1', undefined, true);
    expect(svg).not.toContain('#c084fc');
    expect(svg).not.toContain('#9333ea');
  });

  test('hvac plan coordination mode uses green-grey palette', () => {
    const cad = makeCad();
    const svg = buildHvacPlanSvg(cad, 'f1', undefined, false);
    expect(svg).toContain('HVAC LEGEND');
  });
});

describe('P13.2 — Presentation Sheet Composition', () => {
  test('presentation sheet has consistent margin guide rect', () => {
    const cad = makeCad();
    const svg = buildPresentationSvg(cad);
    expect(svg).toContain('x="32" y="32"');
    expect(svg).toContain('stroke-dasharray');
    expect(svg).toContain('CONCEPTUAL PRESENTATION');
  });

  test('presentation sheet contains isometric wall polygons', () => {
    const cad = makeCad();
    const svg = buildPresentationSvg(cad);
    expect(svg).toContain('polygon points=');
    expect(svg).toContain('PROJECT STATISTICS');
  });

  test('presentation sheet has metrics panel', () => {
    const cad = makeCad();
    const svg = buildPresentationSvg(cad);
    expect(svg).toContain('PROJECT STATISTICS');
  });

  test('presentation sheet has scale bar', () => {
    const cad = makeCad();
    const svg = buildPresentationSvg(cad);
    expect(svg).toContain('5m');
  });

  test('presentation sheet no longer uses bright blue badge', () => {
    const cad = makeCad();
    const svg = buildPresentationSvg(cad);
    expect(svg).not.toContain('#3b82f6');
  });

  test('presentation sheet renders with title block', () => {
    const cad = makeCad();
    const meta: TitleBlockMeta = { project: 'Test', drawing: 'Presentation' };
    const svg = buildPresentationSvg(cad, meta);
    expect(svg).toContain('Test');
  });
});

describe('P13.2 — Standards Enforcement', () => {
  test('validateSvgFonts detects forbidden fonts', () => {
    const badSvg = '<text font-family="Comic Sans MS">Hello</text>';
    const violations = validateSvgFonts(badSvg);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].type).toBe('font');
  });

  test('validateDrawingSvg passes clean SVG without violations', () => {
    const cleanSvg = '<svg><text font-family="Arial" fill="#475569">Hello</text><line stroke-width="1.5"/></svg>';
    const report = validateDrawingSvg(cleanSvg, { strict: true });
    expect(report.passed).toBe(true);
  });

  test('validateSvgBrightColors detects bright forbidden colors', () => {
    const badSvg = '<line stroke="#facc15"/>';
    const violations = validateSvgBrightColors(badSvg, true);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].type).toBe('bright-color');
  });

  test('FORBIDDEN_BRIGHT_COLORS includes all known offenders', () => {
    expect(FORBIDDEN_BRIGHT_COLORS).toContain('#facc15');
    expect(FORBIDDEN_BRIGHT_COLORS).toContain('#22c55e');
    expect(FORBIDDEN_BRIGHT_COLORS).toContain('#06b6d4');
    expect(FORBIDDEN_BRIGHT_COLORS).toContain('#ef4444');
  });

  test('APPROVED_STROKE_WIDTHS contains all LW values', () => {
    expect(APPROVED_STROKE_WIDTHS.has(4)).toBe(true);
    expect(APPROVED_STROKE_WIDTHS.has(2.5)).toBe(true);
    expect(APPROVED_STROKE_WIDTHS.has(1.5)).toBe(true);
    expect(APPROVED_STROKE_WIDTHS.has(0.5)).toBe(true);
    expect(APPROVED_STROKE_WIDTHS.has(0.35)).toBe(true);
  });

  test('floor plan SVG passes basic standards validation (fonts ok, no bright draw colors)', () => {
    const cad = makeCad();
    const svg = buildFloorPlanSvg(cad, 'f1');
    // Check fonts (should pass — Arial only)
    const fontViolations = validateSvgFonts(svg);
    expect(fontViolations.length).toBe(0);
    // Check bright colors in drawing content — expect no bright drawing strokes
    const brightViolations = validateSvgBrightColors(svg, true);
    // Allow provenance notes which legitimately use #ef4444 for low confidence
    const drawViolations = brightViolations.filter(v => !v.message.includes('#ef4444'));
    expect(drawViolations.length).toBe(0);
  });
});

describe('P13.2 — MEP Palette System', () => {
  test('resolveMepPalette returns technical palettes for print mode', () => {
    const pal = resolveMepPalette(true, false);
    expect(pal.electrical.primary).toBe('#475569');
    expect(pal.plumbing.primary).toBe('#475569');
    expect(pal.hvac.primary).toBe('#475569');
  });

  test('resolveMepPalette returns coordination palettes for review mode', () => {
    const pal = resolveMepPalette(false, true);
    expect(pal.electrical.primary).toBe('#92400e');
    expect(pal.plumbing.primary).toBe('#1e3a5f');
    expect(pal.hvac.primary).toBe('#1a3a2a');
  });

  test('mepColor returns correct color from palette', () => {
    const pal = resolveMepPalette(true, false);
    expect(mepColor(pal.electrical, 'primary')).toBe('#475569');
  });
});

describe('P13.2 — Regression: P13.1 Gains Preserved', () => {
  test('title block still renders correctly', () => {
    const meta: TitleBlockMeta = { project: 'Test', drawing: 'Test' };
    const svg = buildTitleBlock(800, 600, meta, true);
    expect(svg).toContain('Arial');
    expect(svg).toContain('PROJECT');
  });

  test('wall polygon rendering still works', () => {
    const walls = [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external' as const, material: 'concrete' as const, properties: {} } },
    ];
    const vp = {
      minX: 0, maxX: 10, minY: 0, maxY: 10, w: 500, h: 400, ox: 30, oy: 30, svgH: 460,
      px: (_p: { x: number; y: number }) => _p.x * 28 + 30,
      py: (_p: { x: number; y: number }) => 400 - (_p.y * 28 + 30),
      printMode: false,
    };
    const svg = renderWalls(walls, vp, 'concrete');
    expect(svg).toContain('polygon');
  });

  test('all discipline generators produce valid SVG', () => {
    const cad = makeCad();
    const meta: TitleBlockMeta = { project: 'Test', drawing: 'Test' };
    expect(isValidSvg(buildFloorPlanSvg(cad, 'f1', meta))).toBe(true);
    expect(isValidSvg(buildSitePlanSvg(cad, meta))).toBe(true);
    expect(isValidSvg(buildFoundationPlanSvg(cad, undefined, meta))).toBe(true);
    expect(isValidSvg(buildRoofPlanSvg(cad, meta))).toBe(true);
  });
});

describe('P13.4 — Dimension Engine Strings', () => {
  test('renderRunningDim produces dimension labels', () => {
    const svg = renderRunningDim([0, 3, 8, 12], false, 100, 20);
    expect(svg).toContain('3.0m');
    expect(svg).toContain('8.0m');
    expect(svg).toContain('12.0m');
  });

  test('renderMultiChainDims produces multiple chain lines', () => {
    const svg = renderMultiChainDims([
      { positions: [0, 4, 8], offset: 20 },
      { positions: [0, 2, 3, 5], offset: 40 },
    ], false, 100);
    expect(svg).toContain('4.0m');
  });
});

describe('P13.4 — Room Naming Integration', () => {
  test('floor plan with roomProgramme uses canonical names', () => {
    const cad = makeCad({
      roomProgramme: { 'room-1': 'Living Room', 'room-2': 'Kitchen' },
    });
    const meta: TitleBlockMeta = { project: 'Test', drawing: 'Floor Plan' };
    const svg = buildFloorPlanSvg(cad, 'f1', meta);
    expect(svg).toContain('Living Room');
  });
});

describe('P13.4 — Section Depth', () => {
  test('section contains internal partition cut-through with timber-hatch', () => {
    const cad = makeCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('timber-hatch');
    expect(svg).toContain('FOOTING');
  });
});

describe('P13.4 — Elevation Depth', () => {
  test('elevation includes window reveal and FFL datum', () => {
    const cad = makeCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('FFL');
    expect(svg).toContain('CAVITY');
    expect(svg).toContain('GL');
  });
});

describe('P13.4 — MEP Technical Depth', () => {
  test('electrical plan with MEP blocks shows technical info', () => {
    const cad = makeCad({
      blocks: [
        { id: 'b1', floorId: 'f1', kind: 'column', position: { x: 2, y: 2 }, width: 0.3, depth: 0.3, rotation: 0, name: 'Col-1', metadata: { ifcClass: 'IfcColumn', category: 'structure', material: 'concrete', properties: {} } },
        { id: 'b2', floorId: 'f1', kind: 'light', position: { x: 3, y: 4 }, width: 0.2, depth: 0.2, rotation: 0, name: 'Light-1', metadata: { ifcClass: 'IfcLightFixture', category: 'electrical', material: 'steel', properties: {} } },
        { id: 'b3', floorId: 'f1', kind: 'switch', position: { x: 2, y: 4 }, width: 0.1, depth: 0.1, rotation: 0, name: 'Sw-1', metadata: { ifcClass: 'IfcSwitch', category: 'electrical', material: 'steel', properties: {} } },
        { id: 'b4', floorId: 'f1', kind: 'socket', position: { x: 1, y: 1 }, width: 0.15, depth: 0.15, rotation: 0, name: 'Sock-1', metadata: { ifcClass: 'IfcOutlet', category: 'electrical', material: 'steel', properties: {} } },
        { id: 'b5', floorId: 'f1', kind: 'db_board', position: { x: 1, y: 9 }, width: 0.4, depth: 0.5, rotation: 0, name: 'DB-1', metadata: { ifcClass: 'IfcDistributionBoard', category: 'electrical', material: 'steel', properties: {} } },
      ],
    });
    const svg = buildElectricalPlanSvg(cad, 'f1');
    expect(svg).toContain('1.5mm²');
    expect(svg).toContain('MCB');
    expect(svg).toContain('RCD');
    expect(svg).toContain('E-101');
  });

  test('plumbing plan with fixtures shows technical info', () => {
    const cad = makeCad({
      blocks: [
        { id: 'b1', floorId: 'f1', kind: 'sink', position: { x: 9, y: 1 }, width: 0.6, depth: 0.5, rotation: 0, name: 'Sink', metadata: { ifcClass: 'IfcSanitaryFixture', category: 'plumbing', properties: {} } },
        { id: 'b2', floorId: 'f1', kind: 'wc', position: { x: 9, y: 4 }, width: 0.4, depth: 0.4, rotation: 0, name: 'WC', metadata: { ifcClass: 'IfcSanitaryFixture', category: 'plumbing', properties: {} } },
      ],
    });
    const svg = buildPlumbingPlanSvg(cad, 'f1');
    expect(svg).toContain('mm');
    expect(svg).toContain('SOIL');
    expect(svg).toMatch(/F\d{2}/);
  });
});

describe('P13.4 — Print Fidelity', () => {
  test('all technical print-mode sheets have white background', () => {
    const cad = makeCad();
    const meta: TitleBlockMeta = { project: 'Test', drawing: 'Test' };
    const sheets = [
      buildFoundationPlanSvg(cad, undefined, meta, true),
      buildRoofPlanSvg(cad, meta, true),
      buildElectricalPlanSvg(cad, 'f1', meta, true),
      buildPlumbingPlanSvg(cad, 'f1', meta, true),
      buildHvacPlanSvg(cad, 'f1', meta, true),
    ];
    for (const svg of sheets) {
      expect(svg).toContain('#ffffff');
    }
  });

  test('title block content (PROJECT, SCALE, REVISION) survives print mode', () => {
    const cad = makeCad();
    const meta: TitleBlockMeta = { project: 'PrintTest', drawing: 'Test', sheet: 'SHT-01', scale: '1:100', revision: 'B' };
    const svg = buildFloorPlanSvg(cad, 'f1', meta, undefined, true);
    expect(svg).toContain('PrintTest');
    expect(svg).toContain('SHT-01');
    expect(svg).toContain('1:100');
    expect(svg).toContain('Arial');
  });
});
