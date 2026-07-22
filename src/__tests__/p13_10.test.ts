import { describe, it, expect } from 'vitest';
import { buildElevationSvg } from '@/lib/drawings/elevation-svg';
import { buildSectionSvg } from '@/lib/drawings/section-svg';
import { buildFloorPlanSvg } from '@/lib/drawings/disciplines/floor-plan-svg';
import { createSheetCoordinator, DEFAULT_COORDINATOR } from '@/lib/drawings/sheet-coordination';
import { renderSlabEdgeProfile } from '@/lib/drawings/facade-depth';
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
      'r1': 'Living Room' as RoomProgramme,
      'r2': 'Kitchen' as RoomProgramme,
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

// ──────────────────────────────────────────────
// Sheet Coordination Tests
// ──────────────────────────────────────────────
describe('P13.10 — Sheet Coordination', () => {
  it('DEFAULT_COORDINATOR returns sheet numbers for known views', () => {
    expect(DEFAULT_COORDINATOR.getSheetForView('plan')).toBe('A-101');
    expect(DEFAULT_COORDINATOR.getSheetForView('section')).toBe('A-201');
    expect(DEFAULT_COORDINATOR.getSheetForView('front')).toBe('A-301');
    expect(DEFAULT_COORDINATOR.getSheetForView('left')).toBe('A-303');
  });

  it('DEFAULT_COORDINATOR returns fallback for unknown view', () => {
    expect(DEFAULT_COORDINATOR.getSheetForView('nonexistent')).toBe('A-000');
  });

  it('DEFAULT_COORDINATOR returns labels for known views', () => {
    expect(DEFAULT_COORDINATOR.getLabel('plan')).toBe('Floor Plan');
    expect(DEFAULT_COORDINATOR.getLabel('section')).toBe('Section A-A');
    expect(DEFAULT_COORDINATOR.getLabel('front')).toBe('Front Elevation');
  });

  it('coordsForSection returns correct view for AA axis', () => {
    const ref = DEFAULT_COORDINATOR.coordsForSection('AA');
    expect(ref).toBeDefined();
    expect(ref!.viewId).toBe('section');
    expect(ref!.sectionAxis).toBe('AA');
  });

  it('coordsForSection returns correct view for BB axis', () => {
    const ref = DEFAULT_COORDINATOR.coordsForSection('BB');
    expect(ref).toBeDefined();
    expect(ref!.viewId).toBe('section-bb');
  });

  it('coordsForElevation returns correct view for each orientation', () => {
    const front = DEFAULT_COORDINATOR.coordsForElevation('front');
    expect(front).toBeDefined();
    expect(front!.viewId).toBe('front');
    expect(front!.drawingNumber).toBe('E1');

    const rear = DEFAULT_COORDINATOR.coordsForElevation('rear');
    expect(rear).toBeDefined();
    expect(rear!.drawingNumber).toBe('E2');

    const left = DEFAULT_COORDINATOR.coordsForElevation('left');
    expect(left).toBeDefined();
    expect(left!.drawingNumber).toBe('E3');

    const right = DEFAULT_COORDINATOR.coordsForElevation('right');
    expect(right).toBeDefined();
    expect(right!.drawingNumber).toBe('E4');
  });

  it('getElevationRefs returns all elevation views', () => {
    const refs = DEFAULT_COORDINATOR.getElevationRefs();
    expect(refs.length).toBe(4);
    expect(refs.every(r => r.viewType === 'elevation')).toBe(true);
  });

  it('getSectionRefs returns all section views', () => {
    const refs = DEFAULT_COORDINATOR.getSectionRefs();
    expect(refs.length).toBe(3);
    expect(refs.every(r => r.viewType === 'section')).toBe(true);
  });

  it('registerView adds a new view to the coordinator', () => {
    const coord = createSheetCoordinator();
    coord.registerView({
      viewId: 'my-detail',
      viewType: 'detail',
      label: 'Detail A',
      sheetNumber: 'A-501',
      drawingNumber: 'D1',
    });
    expect(coord.getSheetForView('my-detail')).toBe('A-501');
    expect(coord.getLabel('my-detail')).toBe('Detail A');
  });

  it('getAllViews returns all registered views', () => {
    const coord = createSheetCoordinator([
      { viewId: 'plan', viewType: 'plan', label: 'Plan', sheetNumber: 'A-101', drawingNumber: '01' },
      { viewId: 'front', viewType: 'elevation', label: 'Front', sheetNumber: 'A-301', drawingNumber: 'E1', orientation: 'front' },
    ]);
    const all = coord.getAllViews();
    expect(all.length).toBe(2);
  });

  it('getPlanRefs returns only plan views', () => {
    const refs = DEFAULT_COORDINATOR.getPlanRefs();
    expect(refs.length).toBeGreaterThanOrEqual(1);
    expect(refs.every(r => r.viewType === 'plan')).toBe(true);
  });

  it('custom coordinator overrides default sheet numbers', () => {
    const coord = createSheetCoordinator([
      { viewId: 'front', viewType: 'elevation', label: 'Front Elevation', sheetNumber: 'E-001', drawingNumber: 'E1', orientation: 'front' },
    ]);
    expect(coord.getSheetForView('front')).toBe('E-001');
  });
});

// ──────────────────────────────────────────────
// Section SVG — Leader-Linked Notes Tests
// ──────────────────────────────────────────────
describe('P13.10 — Section Leader-Linked Notes', () => {
  it('section SVG contains keynote callouts instead of floating generic notes', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    // Should contain leader-linked callout elements
    expect(svg).toContain('<circle');
    expect(svg).toContain('<polyline');
    expect(svg).toContain('KEYNOTES');
  });

  it('section SVG no longer contains old CONSTRUCTION NOTES heading', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    // The old floating text notes should be replaced
    expect(svg).not.toContain('CONSTRUCTION NOTES');
  });

  it('section SVG references plan sheet', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('A-101');
    expect(svg).toContain('Floor Plan');
  });

  it('section SVG references elevation sheet', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('A-301');
    expect(svg).toContain('Front Elevation');
  });

  it('section SVG contains elevation reference bubble', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('E1'); // elevation reference label
  });

  it('section SVG contains cross-sheet reference to floor plan', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('CONT. ON');
    expect(svg).toContain('FLOOR PLAN');
  });

  it('section SVG contains sheet reference for this section', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('A-201');
  });

  it('section SVG valid in print mode with keynotes', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad, undefined, undefined, true);
    expect(svg).toContain('#ffffff');
    expect(svg).toContain('KEYNOTES');
  });

  it('multi-storey section SVG contains keynotes with correct references', () => {
    const cad = makeMultiStoreyCad(3);
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('KEYNOTES');
    expect(svg).toContain('A-301');
  });
});

// ──────────────────────────────────────────────
// Elevation — Side Differentiation Tests
// ──────────────────────────────────────────────
describe('P13.10 — Elevation Side Differentiation', () => {
  it('side elevation contains opening count annotation', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'left');
    expect(svg).toMatch(/openings/);
  });

  it('side elevation contains floor count annotation for multi-storey', () => {
    const cad = makeMultiStoreyCad(3);
    const svg = buildElevationSvg(cad, 'left');
    expect(svg).toContain('storeys');
  });

  it('side elevation contains orientation label', () => {
    const cad = makeMinimalCad();
    const leftSvg = buildElevationSvg(cad, 'left');
    const rightSvg = buildElevationSvg(cad, 'right');
    expect(leftSvg).toContain('LEFT SIDE');
    expect(rightSvg).toContain('RIGHT SIDE');
  });

  it('side elevation left/right differ in content', () => {
    const cad = makeMinimalCad();
    const leftSvg = buildElevationSvg(cad, 'left');
    const rightSvg = buildElevationSvg(cad, 'right');
    expect(leftSvg).toContain('LEFT');
    expect(rightSvg).toContain('RIGHT');
    expect(leftSvg).not.toBe(rightSvg);
  });

  it('side elevation contains building depth annotation', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'left');
    expect(svg).toMatch(/m deep/);
  });

  it('side elevation contains stair or orientation marker', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'left');
    expect(svg).toMatch(/LEFT SIDE|RIGHT SIDE/);
  });

  it('side elevation contains floor-to-floor info for multi-storey', () => {
    const cad = makeMultiStoreyCad(3);
    const svg = buildElevationSvg(cad, 'left');
    expect(svg).toContain('storeys');
    expect(svg).toContain('F→F');
  });

  it('front elevation does not contain side-specific markers', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).not.toContain('LEFT SIDE');
    expect(svg).not.toContain('RIGHT SIDE');
  });

  it('rear elevation contains service core annotation', () => {
    const cad = makeMultiStoreyCad(3);
    const svg = buildElevationSvg(cad, 'rear');
    expect(svg).toContain('SERVICE');
    expect(svg).toContain('STOREYS');
  });
});

// ──────────────────────────────────────────────
// Elevation — Sheet Coordination Tests
// ──────────────────────────────────────────────
describe('P13.10 — Elevation Sheet References', () => {
  it('front elevation references section sheet', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('A-201');
  });

  it('front elevation has elevation reference bubble with correct drawing number', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('E1');
  });

  it('side elevation has elevation reference bubble', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'left');
    expect(svg).toContain('E3');
  });

  it('rear elevation has elevation reference bubble', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'rear');
    expect(svg).toContain('E2');
  });

  it('cross-sheet reference uses correct section sheet number', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('A-201');
  });
});

// ──────────────────────────────────────────────
// Facade Depth — Slab Edge Profile Tests
// ──────────────────────────────────────────────
describe('P13.10 — Slab Edge Profile', () => {
  it('renderSlabEdgeProfile returns rect with concrete hatch', () => {
    const parts = renderSlabEdgeProfile(50, 350, 200, 4, false);
    const svg = parts.join('');
    expect(svg).toContain('<rect');
    expect(svg).toContain('concrete-hatch');
  });

  it('renderSlabEdgeProfile uses print mode colors', () => {
    const parts = renderSlabEdgeProfile(50, 350, 200, 4, true);
    const svg = parts.join('');
    expect(svg).toContain('#cbd5e1');
  });

  it('renderSlabEdgeProfile returns correct y position', () => {
    const parts = renderSlabEdgeProfile(50, 350, 200, 4, false);
    const svg = parts.join('');
    expect(svg).toContain('y="200.0"');
  });
});

// ──────────────────────────────────────────────
// Drawing-Set Coherence Tests
// ──────────────────────────────────────────────
describe('P13.10 — Drawing-Set Coherence', () => {
  it('front elevation SVG contains cross-sheet reference to sections', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('CONT. ON');
    expect(svg).toContain('A-201');
  });

  it('section SVG contains plan reference', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('REFER TO');
  });

  it('section SVG contains elevation reference', () => {
    const cad = makeMinimalCad();
    const svg = buildSectionSvg(cad);
    expect(svg).toContain('ELEVATION');
  });

  it('all four elevations generate without error', () => {
    const cad = makeMinimalCad();
    for (const view of ['front', 'rear', 'left', 'right'] as const) {
      const svg = buildElevationSvg(cad, view);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }
  });

  it('section SVG valid in both print modes', () => {
    const cad = makeMinimalCad();
    const printSvg = buildSectionSvg(cad, undefined, undefined, true);
    const darkSvg = buildSectionSvg(cad, undefined, undefined, false);
    expect(printSvg).toContain('#ffffff');
    expect(darkSvg).toContain('#0b1220');
  });

  it('elevations valid in both print modes', () => {
    const cad = makeMinimalCad();
    for (const view of ['front', 'rear', 'left', 'right'] as const) {
      const printSvg = buildElevationSvg(cad, view, undefined, true);
      const darkSvg = buildElevationSvg(cad, view, undefined, false);
      expect(printSvg).toContain('#ffffff');
      expect(darkSvg).toContain('#0b1220');
    }
  });

  it('no regressions — front elevation still contains ENTRY', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('ENTRY');
  });

  it('no regressions — rear elevation still contains REAR label', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'rear');
    expect(svg).toContain('REAR');
  });

  it('no regressions — datum levels still present', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('FFL');
    expect(svg).toContain('GL');
  });

  it('no regressions — scale note still present', () => {
    const cad = makeMinimalCad();
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('Scale');
  });

  it('no regressions — slab shadow lines present in multi-storey', () => {
    const cad = makeMultiStoreyCad(3);
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('opacity="0.35"');
  });

  it('no regressions — slab edge profiles present in multi-storey', () => {
    const cad = makeMultiStoreyCad(3);
    const svg = buildElevationSvg(cad, 'front');
    expect(svg).toContain('concrete-hatch');
  });

  describe('P13.10a — Floor Plan Coordinator Integration', () => {
    it('default coordinator resolves detail bubbles to A-201 and A-202', () => {
      const cad = makeMinimalCad();
      const svg = buildFloorPlanSvg(cad);
      expect(svg).toContain('A-201');
      expect(svg).toContain('A-202');
    });

    it('default coordinator resolves elevation ref marks to A-301 and A-302', () => {
      const cad = makeMinimalCad();
      const svg = buildFloorPlanSvg(cad);
      expect(svg).toContain('A-301');
      expect(svg).toContain('A-302');
    });

    it('default coordinator resolves cross-sheet ref to A-401 and Section A–A', () => {
      const cad = makeMinimalCad();
      const svg = buildFloorPlanSvg(cad);
      expect(svg).toContain('A-401');
      expect(svg).toContain('Section A–A');
    });

    it('default coordinator resolves schedule ref to A-601', () => {
      const cad = makeMinimalCad();
      const svg = buildFloorPlanSvg(cad);
      expect(svg).toContain('A-601');
      expect(svg).toContain('See door/window schedule');
    });

    it('custom coordinator overrides all sheet references', () => {
      const coord = createSheetCoordinator([
        { viewId: 'detail-1', viewType: 'detail', label: 'Detail 1', sheetNumber: 'A-101', drawingNumber: 'D1' },
        { viewId: 'detail-2', viewType: 'detail', label: 'Detail 2', sheetNumber: 'A-102', drawingNumber: 'D2' },
        { viewId: 'front', viewType: 'elevation', label: 'Front Elevation', sheetNumber: 'A-201', drawingNumber: 'E1', orientation: 'front' as const },
        { viewId: 'rear', viewType: 'elevation', label: 'Rear Elevation', sheetNumber: 'A-202', drawingNumber: 'E2', orientation: 'rear' as const },
        { viewId: 'section-aa-alt', viewType: 'section', label: 'Section X–X', sheetNumber: 'A-301', drawingNumber: 'S3' },
        { viewId: 'schedule-door', viewType: 'schedule', label: 'Door Schedule', sheetNumber: 'A-501', drawingNumber: 'D1' },
        { viewId: 'plan', viewType: 'plan', label: 'Floor Plan', sheetNumber: 'A-001', drawingNumber: '01' },
      ]);
      const cad = makeMinimalCad();
      const svg = buildFloorPlanSvg(cad, undefined, undefined, undefined, false, coord);
      expect(svg).toContain('A-101');
      expect(svg).toContain('A-102');
      expect(svg).toContain('A-201');
      expect(svg).toContain('A-202');
      expect(svg).toContain('A-301');
      expect(svg).toContain('A-501');
      expect(svg).toContain('Section X–X');
      expect(svg).not.toContain('A-401');
      expect(svg).not.toContain('A-601');
    });

    it('no regressions — floor plan still has section mark, legend, and drawing title', () => {
      const cad = makeMinimalCad();
      const svg = buildFloorPlanSvg(cad);
      expect(svg).toContain('LEGEND');
      expect(svg).toContain('Floor Plan');
      expect(svg).toContain('scale 1:100');
    });
  });
});
