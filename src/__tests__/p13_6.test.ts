import { expect, test, describe } from 'vitest';
import { renderDetailBubble, renderElevationRefMark, renderWallTypeTag, renderFinishTag, renderCrossSheetRef, renderKeynoteSchedule, computeRoomsFromWalls } from '@/lib/drawings/annotation-engine';
import { buildFloorPlanSvg } from '@/lib/drawings/disciplines/floor-plan-svg';
import { buildElectricalPlanSvg } from '@/lib/drawings/disciplines/electrical-plan-svg';
import { buildPlumbingPlanSvg } from '@/lib/drawings/disciplines/plumbing-plan-svg';
import { buildHvacPlanSvg } from '@/lib/drawings/disciplines/hvac-plan-svg';
import type { CadDocument as Ws6CadDocument } from '@/domain/ws6-types';
import type { TitleBlockMeta } from '@/lib/drawings/title-block';

function fixtureCad(overrides?: Partial<Ws6CadDocument>): Ws6CadDocument {
  return {
    id: 'p13-6-cad',
    projectId: 'proj-p13-6',
    name: 'P13.6 Test',
    materialSystem: 'concrete',
    floors: [
      { id: 'f1', name: 'Ground Floor', elevation: 0, height: 3 },
    ],
    walls: [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.3, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w2', floorId: 'f1', start: { x: 12, y: 0 }, end: { x: 12, y: 10 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w3', floorId: 'f1', start: { x: 12, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w4', floorId: 'f1', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w5', floorId: 'f1', start: { x: 4, y: 0 }, end: { x: 4, y: 10 }, thickness: 0.15, height: 3, name: 'Int Wall', structural: false, metadata: { ifcClass: 'IfcWall', category: 'internal', material: 'timber', properties: {} } },
      { id: 'w6', floorId: 'f1', start: { x: 8, y: 0 }, end: { x: 8, y: 10 }, thickness: 0.15, height: 3, name: 'Int Wall 2', structural: false, metadata: { ifcClass: 'IfcWall', category: 'internal', material: 'timber', properties: {} } },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', floorId: 'f1', kind: 'door', offset: 2, width: 0.9, height: 2.1, sillHeight: 0, headHeight: 2.1, name: 'Front Door', metadata: { ifcClass: 'IfcDoor', category: 'door', material: 'timber', properties: {}, fireRating: 'FD30' } },
      { id: 'o2', wallId: 'w1', floorId: 'f1', kind: 'window', offset: 6, width: 1.5, height: 1.2, sillHeight: 0.9, headHeight: 2.1, name: 'Living Window', metadata: { ifcClass: 'IfcWindow', category: 'window', properties: {}, typeName: 'Sliding' } },
    ],
    blocks: [
      { id: 'b1', floorId: 'f1', kind: 'light', position: { x: 2, y: 2 }, width: 0.5, depth: 0.5, rotation: 0, name: 'Light-1', metadata: { ifcClass: 'IfcFixture', category: 'electrical', material: 'steel', properties: {} } },
      { id: 'b2', floorId: 'f1', kind: 'switch', position: { x: 2.5, y: 0.5 }, width: 0.1, depth: 0.1, rotation: 0, name: 'Sw-1', metadata: { ifcClass: 'IfcSwitchingDevice', category: 'electrical', material: 'steel', properties: {} } },
      { id: 'b3', floorId: 'f1', kind: 'socket', position: { x: 6, y: 2 }, width: 0.15, depth: 0.1, rotation: 0, name: 'Skt-1', metadata: { ifcClass: 'IfcOutlet', category: 'electrical', material: 'steel', properties: {} } },
      { id: 'b4', floorId: 'f1', kind: 'db_board', position: { x: 1, y: 1 }, width: 0.4, depth: 0.6, rotation: 0, name: 'DB-1', metadata: { ifcClass: 'IfcDistributionBoard', category: 'electrical', material: 'steel', properties: {} } },
      { id: 'b5', floorId: 'f1', kind: 'wc', position: { x: 9, y: 8 }, width: 0.4, depth: 0.4, rotation: 0, name: 'WC-1', metadata: { ifcClass: 'IfcSanitaryTerminal', category: 'plumbing', material: 'steel', properties: {} } },
      { id: 'b6', floorId: 'f1', kind: 'sink', position: { x: 9, y: 6 }, width: 0.6, depth: 0.5, rotation: 0, name: 'Sink-1', metadata: { ifcClass: 'IfcSanitaryTerminal', category: 'plumbing', material: 'steel', properties: {} } },
      { id: 'b7', floorId: 'f1', kind: 'hvac_unit', position: { x: 6, y: 5 }, width: 0.8, depth: 0.6, rotation: 0, name: 'AC-1', metadata: { ifcClass: 'IfcUnitaryEquipment', category: 'hvac', material: 'steel', properties: {} } },
      { id: 'b8', floorId: 'f1', kind: 'diffuser', position: { x: 3, y: 5 }, width: 0.3, depth: 0.3, rotation: 0, name: 'Diff-1', metadata: { ifcClass: 'IfcAirTerminal', category: 'hvac', material: 'steel', properties: {} } },
      { id: 'b9', floorId: 'f1', kind: 'column', position: { x: 6, y: 3 }, width: 0.3, depth: 0.3, rotation: 0, name: 'Col-1', metadata: { ifcClass: 'IfcColumn', category: 'structure', material: 'concrete', properties: {} } },
    ],
    boundaries: [
      { id: 'bnd1', points: [{ x: -2, y: -2 }, { x: 14, y: -2 }, { x: 14, y: 12 }, { x: -2, y: 12 }], layerId: 'boundaries', boundaryMode: 'verified' },
    ],
    roomProgramme: { r1: 'Living Room', r2: 'Kitchen', r3: 'Bedroom 1' },
    ...overrides,
  };
}

const FIXTURE_META: TitleBlockMeta = {
  project: 'P13.6 Test',
  drawing: 'MEP & Annotation Deepening',
  sheet: 'P13.6-001',
  scale: '1:100',
  date: '2026-07-17',
  revision: 'A',
  drawnBy: 'Budget Engineer Studio',
};

function isValidSvg(svg: string): boolean {
  return svg.trim().startsWith('<svg') && svg.trim().endsWith('</svg>');
}

// ── Workstream 1: Electrical Technical Deepening ──
describe('P13.6 — Workstream 1: Electrical Technical Deepening', () => {
  const cad = fixtureCad();
  const floorId = 'f1';

  test('electrical plan contains circuit grouping labels (C#, Z#)', () => {
    const svg = buildElectricalPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('C1');
    expect(svg).toContain('Z');
  });

  test('electrical plan contains DB outgoing-way reference', () => {
    const svg = buildElectricalPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('OUTGOING');
    expect(svg).toContain('WAYS');
    expect(svg).toContain('CCTS');
  });

  test('electrical plan contains load estimation label', () => {
    const svg = buildElectricalPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('kVA');
    expect(svg).toContain('EST. LOAD');
  });

  test('electrical plan contains power point category tags', () => {
    const svg = buildElectricalPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('GEN PURP');
  });

  test('electrical plan contains circuit schedule reference block', () => {
    const svg = buildElectricalPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('CIRCUIT SCHEDULE');
    expect(svg).toContain('RCBO');
    expect(svg).toContain('MCB');
  });

  test('electrical plan produces valid SVG', () => {
    const svg = buildElectricalPlanSvg(cad, floorId, FIXTURE_META);
    expect(isValidSvg(svg)).toBe(true);
  });

  test('electrical plan print mode uses disciplined grays', () => {
    const svg = buildElectricalPlanSvg(cad, floorId, FIXTURE_META, true);
    const brightColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    for (const c of brightColors) {
      expect(svg, `${c} not in print mode`).not.toContain(c);
    }
  });

  test('electrical plan contains zone demarcation labels', () => {
    const svg = buildElectricalPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('ZONE');
    expect(svg).toContain('kW');
  });
});

// ── Workstream 2: Plumbing Technical Deepening ──
describe('P13.6 — Workstream 2: Plumbing Technical Deepening', () => {
  const cad = fixtureCad();
  const floorId = 'f1';

  test('plumbing plan contains wet-core / service shaft notation', () => {
    const svg = buildPlumbingPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('WET CORE');
    expect(svg).toContain('SERVICES SHAFT');
  });

  test('plumbing plan contains vent route label', () => {
    const svg = buildPlumbingPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('VENT');
    expect(svg).toContain('OPEN VENT');
  });

  test('plumbing plan contains hot/cold supply labels with pipe sizes', () => {
    const svg = buildPlumbingPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('HOT');
    expect(svg).toContain('COLD');
    expect(svg).toContain('15mm');
  });

  test('plumbing plan contains enhanced legend with wet core entry', () => {
    const svg = buildPlumbingPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('PLUMBING LEGEND');
    expect(svg).toContain('Wet core');
    expect(svg).toContain('Vent pipe');
  });

  test('plumbing plan produces valid SVG', () => {
    const svg = buildPlumbingPlanSvg(cad, floorId, FIXTURE_META);
    expect(isValidSvg(svg)).toBe(true);
  });

  test('plumbing plan print mode uses disciplined grays', () => {
    const svg = buildPlumbingPlanSvg(cad, floorId, FIXTURE_META, true);
    const brightColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
    for (const c of brightColors) {
      expect(svg, `${c} not in print mode`).not.toContain(c);
    }
  });
});

// ── Workstream 3: HVAC Technical Deepening ──
describe('P13.6 — Workstream 3: HVAC Technical Deepening', () => {
  const cad = fixtureCad();
  const floorId = 'f1';

  test('HVAC plan contains zone labels', () => {
    const svg = buildHvacPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('Zone');
  });

  test('HVAC plan contains controls-ready notation (DDC, MODBUS)', () => {
    const svg = buildHvacPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('DDC');
    expect(svg).toContain('MODBUS');
  });

  test('HVAC plan contains equipment schedule with zone references', () => {
    const svg = buildHvacPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('EQUIPMENT SCHEDULE');
    expect(svg).toContain('COP');
  });

  test('HVAC plan contains duct zone labels', () => {
    const svg = buildHvacPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('DUCT');
    expect(svg).toContain('mm');
  });

  test('HVAC plan produces valid SVG', () => {
    const svg = buildHvacPlanSvg(cad, floorId, FIXTURE_META);
    expect(isValidSvg(svg)).toBe(true);
  });

  test('HVAC plan contains independent zone temperature control notation', () => {
    const svg = buildHvacPlanSvg(cad, floorId, FIXTURE_META);
    expect(svg).toContain('ZONES');
    expect(svg).toContain('INDEPENDENT');
  });

  test('HVAC plan print mode uses disciplined grays', () => {
    const svg = buildHvacPlanSvg(cad, floorId, FIXTURE_META, true);
    const brightColors = ['#ff0000', '#00ff00', '#0000ff'];
    for (const c of brightColors) {
      expect(svg, `${c} not in print mode`).not.toContain(c);
    }
  });
});

// ── Workstream 4: Annotation / Detail Referencing ──
describe('P13.6 — Workstream 4: Annotation & Detail Referencing', () => {
  test('renderDetailBubble contains detail number and sheet reference', () => {
    const result = renderDetailBubble(1, 'A-201', 100, 200, false);
    expect(result).toContain('1');
    expect(result).toContain('A-201');
    expect(result).toContain('circle');
    expect(result).toContain('rect');
  });

  test('renderElevationRefMark contains elevation label and sheet ref', () => {
    const result = renderElevationRefMark('E1', 'A-301', 100, 200, 'right', false);
    expect(result).toContain('E1');
    expect(result).toContain('A-301');
    expect(result).toContain('line');
    expect(result).toContain('circle');
  });

  test('renderElevationRefMark supports direction variants', () => {
    const left = renderElevationRefMark('E2', 'A-302', 100, 200, 'left');
    const up = renderElevationRefMark('E3', 'A-303', 100, 200, 'up');
    const down = renderElevationRefMark('E4', 'A-304', 100, 200, 'down');
    expect(left).toContain('E2');
    expect(up).toContain('E3');
    expect(down).toContain('E4');
  });

  test('renderWallTypeTag produces wall type code', () => {
    const result = renderWallTypeTag('W1', 100, 200, false);
    expect(result).toContain('W1');
    expect(result).toContain('rect');
  });

  test('renderFinishTag produces finish code in dashed circle', () => {
    const result = renderFinishTag('F1', 100, 200, false);
    expect(result).toContain('F1');
    expect(result).toContain('circle');
    expect(result).toContain('dasharray');
  });

  test('renderCrossSheetRef contains target sheet and drawing reference', () => {
    const result = renderCrossSheetRef('A-401', 'Section A–A', 100, 200, false);
    expect(result).toContain('A-401');
    expect(result).toContain('Section A–A');
    expect(result).toContain('CONT.');
  });

  test('renderKeynoteSchedule renders numbered keynote list', () => {
    const keynotes = [
      { number: 1, text: 'All structural walls reinforced concrete' },
      { number: 2, text: 'Roof construction: Chromadek on timber trusses' },
      { number: 3, text: 'Floor build-up: RC slab + screed + finish' },
    ];
    const result = renderKeynoteSchedule(keynotes, 50, 50, false);
    expect(result).toContain('KEYNOTES');
    expect(result).toContain('1');
    expect(result).toContain('2');
    expect(result).toContain('3');
    expect(result).toContain('reinforced concrete');
    expect(result).toContain('Chromadek');
    expect(result).toContain('RC slab');
  });

  test('renderKeynoteSchedule handles empty array', () => {
    const result = renderKeynoteSchedule([], 50, 50, false);
    expect(result).toContain('KEYNOTES');
  });

  test('floor plan contains wall type tags on structural walls', () => {
    const svg = buildFloorPlanSvg(fixtureCad(), 'f1', FIXTURE_META);
    expect(svg).toContain('W1');
    expect(svg).toContain('W2');
  });

  test('floor plan contains detail/callout reference bubbles', () => {
    const svg = buildFloorPlanSvg(fixtureCad(), 'f1', FIXTURE_META);
    expect(svg).toContain('A-201');
    expect(svg).toContain('A-202');
  });

  test('floor plan contains elevation reference marks with sheet refs', () => {
    const svg = buildFloorPlanSvg(fixtureCad(), 'f1', FIXTURE_META);
    expect(svg).toContain('E1');
    expect(svg).toContain('A-301');
    expect(svg).toContain('E2');
    expect(svg).toContain('A-302');
  });

  test('floor plan contains cross-sheet references', () => {
    const svg = buildFloorPlanSvg(fixtureCad(), 'f1', FIXTURE_META);
    expect(svg).toContain('A-401');
    expect(svg).toContain('CONT.');
  });

  test('floor plan print mode contains all annotation references', () => {
    const svg = buildFloorPlanSvg(fixtureCad(), 'f1', FIXTURE_META, undefined, true);
    expect(svg).toContain('W1');
    expect(svg).toContain('A-201');
    expect(svg).toContain('E1');
    expect(svg).toContain('A-401');
  });
});

// ── Regression ──
describe('P13.6 — Regression', () => {
  test('floor plan still renders valid SVG with minimal data', () => {
    const minimal: Ws6CadDocument = {
      id: 'min', projectId: 'min', name: 'Min', materialSystem: 'concrete',
      floors: [{ id: 'f1', name: 'GF', elevation: 0, height: 3 }],
      walls: [], openings: [], blocks: [],
    };
    const svg = buildFloorPlanSvg(minimal, 'f1', FIXTURE_META);
    expect(isValidSvg(svg)).toBe(true);
  });

  test('all discipline generators return valid SVG', () => {
    const cad = fixtureCad();
    const sheets = [
      { name: 'electrical', svg: buildElectricalPlanSvg(cad, 'f1', FIXTURE_META) },
      { name: 'plumbing', svg: buildPlumbingPlanSvg(cad, 'f1', FIXTURE_META) },
      { name: 'hvac', svg: buildHvacPlanSvg(cad, 'f1', FIXTURE_META) },
      { name: 'floor', svg: buildFloorPlanSvg(cad, 'f1', FIXTURE_META) },
    ];
    for (const s of sheets) {
      expect(isValidSvg(s.svg), `${s.name} produces valid SVG`).toBe(true);
    }
  });

  test('room naming does not regress', () => {
    const cad = fixtureCad({ roomProgramme: { r1: 'Living Room', r2: 'Kitchen' } });
    const { rooms } = computeRoomsFromWalls(cad.walls, 0, cad.roomProgramme);
    expect(rooms.length).toBeGreaterThanOrEqual(2);
    expect(rooms.some(r => r.name === 'Living Room')).toBe(true);
  });

  test('fixture with no overrides does not crash', () => {
    const cad = fixtureCad();
    expect(() => buildElectricalPlanSvg(cad, 'f1')).not.toThrow();
    expect(() => buildPlumbingPlanSvg(cad, 'f1')).not.toThrow();
    expect(() => buildHvacPlanSvg(cad, 'f1')).not.toThrow();
    expect(() => buildFloorPlanSvg(cad, 'f1')).not.toThrow();
  });
});
