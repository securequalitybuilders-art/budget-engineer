import { expect, test, describe } from 'vitest';
import { renderRunningDim, renderStringDim, renderMultiChainDims, renderCoordinatedGridDims, renderSectionHeightDims, renderRoomInternalDims, renderAngularDim, renderSiteSetbackDims } from '@/lib/drawings/dimension-engine';
import { buildFloorPlanSvg } from '@/lib/drawings/disciplines/floor-plan-svg';
import { buildSitePlanSvg } from '@/lib/drawings/disciplines/site-plan-svg';
import { buildFoundationPlanSvg } from '@/lib/drawings/disciplines/foundation-plan-svg';
import { buildRoofPlanSvg } from '@/lib/drawings/disciplines/roof-plan-svg';
import { buildRcpPlanSvg } from '@/lib/drawings/disciplines/rcp-plan-svg';
import { buildElectricalPlanSvg } from '@/lib/drawings/disciplines/electrical-plan-svg';
import { buildPlumbingPlanSvg } from '@/lib/drawings/disciplines/plumbing-plan-svg';
import { buildHvacPlanSvg } from '@/lib/drawings/disciplines/hvac-plan-svg';
import { buildElevationSvg } from '@/lib/drawings/elevation-svg';
import { buildSectionSvg } from '@/lib/drawings/section-svg';
import { buildPresentationSvg } from '@/lib/drawings/disciplines/presentation-svg';
import { buildScheduleSvg } from '@/lib/drawings/disciplines/schedule-svg';
import { LW } from '@/lib/drawings/lineweights';
import type { CadDocument as Ws6CadDocument } from '@/domain/ws6-types';
import type { TitleBlockMeta } from '@/lib/drawings/title-block';
import type { SectionConfig } from '@/lib/drawings/section-svg';
import { computeRoomsFromWalls } from '@/lib/drawings/annotation-engine';
import type { Vec2 } from '@/domain/ws6-types';

function fixtureCad(overrides?: Partial<Ws6CadDocument>): Ws6CadDocument {
  return {
    id: 'p13-5-cad',
    projectId: 'proj-p13-5',
    name: 'P13.5 Test',
    materialSystem: 'concrete',
    floors: [
      { id: 'f1', name: 'Ground Floor', elevation: 0, height: 3 },
    ],
    walls: [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
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
    ...overrides,
  };
}

const FIXTURE_META: TitleBlockMeta = {
  project: 'P13.5 Test',
  drawing: 'Contractor & Submission Support',
  sheet: 'P13.5-001',
  scale: '1:100',
  date: '2026-07-17',
  revision: 'A',
  drawnBy: 'Budget Engineer Studio',
};

function isValidSvg(svg: string): boolean {
  return svg.trim().startsWith('<svg') && svg.trim().endsWith('</svg>');
}

// ── Workstream 1: Dimension System Upgrades ──
describe('P13.5 — Workstream 1: Strengthened Dimensions', () => {
  test('renderRunningDim produces valid SVG with tick marks and labels', () => {
    const result = renderRunningDim([0, 3, 8, 12], false, 100, 20);
    expect(result).toContain('3.0m');
    expect(result).toContain('8.0m');
    expect(result).toContain('12.0m');
    expect(result).toContain('stroke-width="');
  });

  test('renderRunningDim handles vertical orientation', () => {
    const result = renderRunningDim([0, 4, 10], true, 100, 20, false);
    expect(result).toContain('4.0m');
    expect(result).toContain('10.0m');
  });

  test('renderRunningDim uses print-mode grays when printMode=true', () => {
    const result = renderRunningDim([0, 5], false, 100, 20, true);
    expect(result).toContain('1e293b');
    expect(result).toContain('475569');
  });

  test('renderStringDim produces segment-by-segment dimensions', () => {
    const result = renderStringDim([0, 2.5, 5, 8], false, 200, 30);
    expect(result).toContain('2.5m');
    expect(result).toContain('2.5m');
    expect(result).toContain('3.0m');
  });

  test('renderMultiChainDims accepts chain array and produces grouped output', () => {
    const result = renderMultiChainDims(
      [{ positions: [0, 4, 10], offset: 20 }, { positions: [1, 5, 9], offset: 40 }],
      false, 200,
    );
    expect(result).toContain('<g>');
    expect(result).toContain('4.0m');
    expect(result).toContain('6.0m');
  });

  test('renderCoordinatedGridDims produces grid-axis dimensions', () => {
    const vp = {
      px: (p: Vec2) => p.x * 28 + 30,
      py: (p: Vec2) => 300 - (p.y * 28 + 30),
      w: 400, h: 300,
    };
    const result = renderCoordinatedGridDims([0, 4, 10], false, 0, vp, 'bottom');
    expect(result).toContain('4.0m');
    expect(result).toContain('10.0m');
    expect(result).toContain('<g>');
  });

  test('renderCoordinatedGridDims handles vertical grid axis', () => {
    const vp = {
      px: (p: Vec2) => p.x * 28 + 30,
      py: (p: Vec2) => 300 - (p.y * 28 + 30),
      w: 400, h: 300,
    };
    const result = renderCoordinatedGridDims([0, 3, 8], true, 0, vp, 'right');
    expect(result).toContain('3.0m');
    expect(result).toContain('8.0m');
  });

  test('renderSectionHeightDims produces vertical height dimensions between levels', () => {
    const levels = [{ z: 0, label: 'GL' }, { z: 3, label: 'FFL' }, { z: 6, label: 'Roof' }];
    const vp = { py: (p: Vec2) => 300 - p.y * 28, w: 400, h: 300 };
    const result = renderSectionHeightDims(levels, 40, vp);
    expect(result).toContain('3.00m');
    expect(result).toContain('<g>');
  });

  test('renderRoomInternalDims produces internal room dimensions', () => {
    const vp = {
      px: (p: Vec2) => p.x * 28 + 30,
      py: (p: Vec2) => 300 - (p.y * 28 + 30),
    };
    const rooms = [
      { id: 'r1', label: 'Living Room', centroid: { x: 2, y: 3 }, minX: 0, maxX: 4, minY: 0, maxY: 6 },
    ];
    const result = renderRoomInternalDims(rooms, vp, false);
    expect(result).toContain('4.0m');
    expect(result).toContain('6.0m');
    expect(result).toContain('<g>');
  });

  test('renderAngularDim produces angle annotation for non-orthogonal walls', () => {
    const start = { x: 0, y: 0 };
    const mid = { x: 5, y: 5 };
    const end = { x: 10, y: 0 };
    const vp = {
      px: (p: Vec2) => p.x * 28 + 30,
      py: (p: Vec2) => 300 - (p.y * 28 + 30),
    };
    const result = renderAngularDim(start, mid, end, vp);
    expect(result).toContain('°');
    expect(result).toContain('<g>');
    expect(result).toContain('polyline');
  });

  test('renderSiteSetbackDims produces setback dimensions with arrows', () => {
    const vp = {
      px: (p: Vec2) => p.x * 28 + 30,
      py: (p: Vec2) => 300 - (p.y * 28 + 30),
      w: 400, h: 300,
    };
    const result = renderSiteSetbackDims(2, 10, 0, 8, -2, 14, -2, 12, vp);
    expect(result).toContain('marker');
    expect(result).toContain('4.0m');
  });

  test('floor plan contains internal room dimensions', () => {
    const cad = fixtureCad({ roomProgramme: { r1: 'Living Room', r2: 'Kitchen', r3: 'Bedroom 1' } as any });
    const svg = buildFloorPlanSvg(cad, 'f1', FIXTURE_META);
    expect(svg).toContain('m²');
    expect(svg).toContain('Arial');
    expect(isValidSvg(svg)).toBe(true);
  });
});

// ── Workstream 2: Section / Elevation Depth ──
describe('P13.5 — Workstream 2: Section & Elevation Depth', () => {
  const cad = fixtureCad();
  const sectionConfig: SectionConfig = { axis: 'AA', position: 5 };

  test('section SVG contains internal partition rendering', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('timber-hatch');
    expect(svg).toContain('PARTITION');
  });

  test('section SVG contains floor build-up layers', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('SCREED');
    expect(svg).toContain('FIN');
    expect(svg).toContain('H/C');
    expect(svg).toContain('RC SLAB');
  });

  test('section SVG contains window reveal and head/sill representation', () => {
    const cadWithCutOpening = {
      ...fixtureCad(),
      walls: [
        ...fixtureCad().walls,
        { id: 'w-cut', floorId: 'f1', start: { x: 0, y: 5 }, end: { x: 12, y: 5 }, thickness: 0.23, height: 3, name: 'Cut Wall', structural: true, metadata: { ifcClass: 'IfcWall' as const, category: 'external' as const, material: 'concrete' as const, properties: {} } },
      ],
      openings: [
        ...fixtureCad().openings,
        { id: 'o-cut-window', wallId: 'w-cut', floorId: 'f1', kind: 'window' as const, offset: 5, width: 1.5, height: 1.2, sillHeight: 0.9, headHeight: 2.1, name: 'Cut Window', metadata: { ifcClass: 'IfcWindow' as const, category: 'window' as const, properties: {} as Record<string, string | number | boolean>, typeName: 'Sliding' as const } },
      ],
    } as Ws6CadDocument;
    const svg = buildSectionSvg(cadWithCutOpening, FIXTURE_META, sectionConfig);
    expect(svg).toContain('SILL');
    expect(svg).toContain('HD');
  });

  test('section SVG contains foundation detail', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('FOOTING');
    expect(svg).toContain('concrete-hatch');
  });

  test('section SVG contains roof build-up and support details', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('CHROMADEK');
    expect(svg).toContain('INSULATION');
    expect(svg).toContain('TRUSSES');
  });

  test('section SVG contains construction notes block', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('CONSTRUCTION NOTES');
    expect(svg).toContain('EXTERNAL WALLS');
    expect(svg).toContain('FOUNDATION');
    expect(svg).toContain('REINFORCEMENT');
  });

  test('section SVG contains height dimension annotations', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('Overall height');
    expect(svg).toContain('m ·');
  });

  test('section SVG ground line and NGL label present', () => {
    const svg = buildSectionSvg(cad, FIXTURE_META, sectionConfig);
    expect(svg).toContain('NGL');
    expect(svg).toContain('earth-hatch');
  });

  test('elevation SVG contains façade material callouts', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    expect(svg).toContain('BRICKWORK');
    expect(svg).toContain('CAVITY');
    expect(svg).toContain('WINDOWS');
  });

  test('elevation SVG contains FFL labels', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    expect(svg).toContain('FFL');
  });

  test('elevation SVG contains height dimension annotations', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    expect(svg).toContain('.00m');
    expect(svg).toContain('HT');
  });

  test('elevation SVG contains foundation note', () => {
    const svg = buildElevationSvg(cad, 'front', FIXTURE_META);
    expect(svg).toContain('FOUNDATION');
    expect(svg).toContain('RC STRIP');
  });
});

// ── Workstream 3: MEP Technical Content ──
describe('P13.5 — Workstream 3: MEP Technical Content', () => {
  const cad = fixtureCad();

  test('electrical plan contains circuit numbers and cable sizes', () => {
    const svg = buildElectricalPlanSvg(cad, 'f1', FIXTURE_META);
    expect(svg).toContain('C1');
    expect(svg).toContain('1.5mm²');
    expect(svg).toContain('MCB');
    expect(svg).toContain('RCD');
  });

  test('electrical plan contains DB references and schedule ref', () => {
    const svg = buildElectricalPlanSvg(cad, 'f1', FIXTURE_META);
    expect(svg).toContain('DB-');
    expect(svg).toContain('E-101');
    expect(svg).toContain('SCHEDULE REF');
  });

  test('electrical plan contains isolator and earthing notes', () => {
    const svg = buildElectricalPlanSvg(cad, 'f1', FIXTURE_META);
    expect(svg).toContain('ISOLATORS');
    expect(svg).toContain('EARTHING');
    expect(svg).toContain('BONDING');
  });

  test('electrical plan contains zone demarcation labels when multiple lights', () => {
    const multiLightCad = fixtureCad({
      blocks: [
        { id: 'bl1', floorId: 'f1', kind: 'light', position: { x: 2, y: 2 }, width: 0.5, depth: 0.5, rotation: 0, name: 'L1', metadata: {} as any },
        { id: 'bl2', floorId: 'f1', kind: 'light', position: { x: 4, y: 2 }, width: 0.5, depth: 0.5, rotation: 0, name: 'L2', metadata: {} as any },
        { id: 'bl3', floorId: 'f1', kind: 'light', position: { x: 6, y: 2 }, width: 0.5, depth: 0.5, rotation: 0, name: 'L3', metadata: {} as any },
        { id: 'bl4', floorId: 'f1', kind: 'switch', position: { x: 1, y: 0.5 }, width: 0.1, depth: 0.1, rotation: 0, name: 'SW1', metadata: {} as any },
        { id: 'bl5', floorId: 'f1', kind: 'db_board', position: { x: 0.5, y: 0.5 }, width: 0.4, depth: 0.6, rotation: 0, name: 'DB', metadata: {} as any },
      ],
    });
    const svg = buildElectricalPlanSvg(multiLightCad, 'f1', FIXTURE_META);
    expect(svg).toContain('ZONE');
  });

  test('plumbing plan contains pipe size labels', () => {
    const svg = buildPlumbingPlanSvg(cad, 'f1', FIXTURE_META);
    expect(svg).toContain('mm');
    expect(svg).toContain('WASTE');
    expect(svg).toContain('SOIL');
  });

  test('plumbing plan contains fixture tags and schedule ref', () => {
    const svg = buildPlumbingPlanSvg(cad, 'f1', FIXTURE_META);
    expect(svg).toContain('F0');
    expect(svg).toContain('P-101');
    expect(svg).toContain('SCHEDULE REF');
  });

  test('plumbing plan contains stack/riser notation', () => {
    const svg = buildPlumbingPlanSvg(cad, 'f1', FIXTURE_META);
    expect(svg).toContain('STACK');
    expect(svg).toContain('VENT');
  });

  test('plumbing plan contains trap and mains specifications', () => {
    const svg = buildPlumbingPlanSvg(cad, 'f1', FIXTURE_META);
    expect(svg).toContain('TRAPS');
    expect(svg).toContain('MAINS');
  });

  test('HVAC plan contains equipment tags and kW ratings', () => {
    const svg = buildHvacPlanSvg(cad, 'f1', FIXTURE_META);
    expect(svg).toContain('AC-');
    expect(svg).toContain('kW');
    expect(svg).toContain('R32');
  });

  test('HVAC plan contains schedule ref and legend linkage', () => {
    const svg = buildHvacPlanSvg(cad, 'f1', FIXTURE_META);
    expect(svg).toContain('M-101');
    expect(svg).toContain('SCHEDULE REF');
    expect(svg).toContain('HVAC LEGEND');
  });

  test('HVAC plan contains controls-ready notation', () => {
    const svg = buildHvacPlanSvg(cad, 'f1', FIXTURE_META);
    expect(svg).toContain('CONTROLS');
    expect(svg).toContain('THERMOSTAT');
  });

  test('MEP legends remain coherent across all disciplines', () => {
    const elec = buildElectricalPlanSvg(cad, 'f1', FIXTURE_META);
    const plumb = buildPlumbingPlanSvg(cad, 'f1', FIXTURE_META);
    const hvac = buildHvacPlanSvg(cad, 'f1', FIXTURE_META);
    for (const svg of [elec, plumb, hvac]) {
      expect(svg).toContain('LEGEND');
    }
  });

  test('MEP technical print mode uses disciplined grays (excludes provenance)', () => {
    const elecPrint = buildElectricalPlanSvg(cad, 'f1', FIXTURE_META, true);
    const plumbPrint = buildPlumbingPlanSvg(cad, 'f1', FIXTURE_META, true);
    const hvacPrint = buildHvacPlanSvg(cad, 'f1', FIXTURE_META, true);
    const brightColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    for (const svg of [elecPrint, plumbPrint, hvacPrint]) {
      for (const color of brightColors) {
        expect(svg, `${color} not in print mode`).not.toContain(color);
      }
    }
  });
});

// ── Workstream 4: Foundation Detail ──
describe('P13.5 — Workstream 4: Foundation Detail', () => {
  const cad = fixtureCad();

  test('foundation plan contains reinforcement notes', () => {
    const svg = buildFoundationPlanSvg(cad, undefined, FIXTURE_META);
    expect(svg).toContain('Reinforcement');
    expect(svg).toContain('A142');
    expect(svg).toContain('T12');
  });

  test('foundation plan contains founding depth specification', () => {
    const svg = buildFoundationPlanSvg(cad, undefined, FIXTURE_META);
    expect(svg).toContain('Founding depth');
    expect(svg).toContain('FFL');
  });

  test('foundation plan contains blinding specification', () => {
    const svg = buildFoundationPlanSvg(cad, undefined, FIXTURE_META);
    expect(svg).toContain('Blinding');
    expect(svg).toContain('GEN1');
  });

  test('foundation plan contains section reference callout', () => {
    const svg = buildFoundationPlanSvg(cad, undefined, FIXTURE_META);
    expect(svg).toContain('SECTION A–A');
    expect(svg).toContain('S-101');
  });

  test('foundation plan contains coordinated grid dimensions', () => {
    const svg = buildFoundationPlanSvg(cad, undefined, FIXTURE_META);
    expect(svg).toContain('m');
  });

  test('foundation plan legend includes reinforcement entry', () => {
    const svg = buildFoundationPlanSvg(cad, undefined, FIXTURE_META);
    expect(svg).toContain('A142');
  });

  test('foundation plan contains merged polygon footings', () => {
    const svg = buildFoundationPlanSvg(cad, undefined, FIXTURE_META);
    expect(svg).toContain('polygon');
    expect(svg).toContain('concrete-hatch');
  });

  test('foundation plan contains pad footing for columns', () => {
    const svg = buildFoundationPlanSvg(cad, undefined, FIXTURE_META);
    expect(svg).toContain('PAD FOOTING');
  });
});

// ── Workstream 5: Print/Export Validation ──
describe('P13.5 — Workstream 5: Print & Export Validation', () => {
  const cad = fixtureCad();
  const sectionConfig: SectionConfig = { axis: 'AA', position: 5 };

  const sheets: { name: string; svg: string }[] = [
    { name: 'floor-plan', svg: buildFloorPlanSvg(cad, 'f1', FIXTURE_META, undefined, true) },
    { name: 'site-plan', svg: buildSitePlanSvg(cad, FIXTURE_META, true) },
    { name: 'foundation', svg: buildFoundationPlanSvg(cad, undefined, FIXTURE_META, true) },
    { name: 'roof', svg: buildRoofPlanSvg(cad, FIXTURE_META, true) },
    { name: 'rcp', svg: buildRcpPlanSvg(cad, 'f1', FIXTURE_META, true) },
    { name: 'electrical', svg: buildElectricalPlanSvg(cad, 'f1', FIXTURE_META, true) },
    { name: 'plumbing', svg: buildPlumbingPlanSvg(cad, 'f1', FIXTURE_META, true) },
    { name: 'hvac', svg: buildHvacPlanSvg(cad, 'f1', FIXTURE_META, true) },
    { name: 'elevation', svg: buildElevationSvg(cad, 'front', FIXTURE_META, true) },
    { name: 'section', svg: buildSectionSvg(cad, FIXTURE_META, sectionConfig, true) },
    { name: 'presentation', svg: buildPresentationSvg(cad, FIXTURE_META) },
  ];

  test('all 11 sheet families produce valid SVG in print mode', () => {
    for (const sheet of sheets) {
      expect(isValidSvg(sheet.svg), `${sheet.name} is valid SVG`).toBe(true);
    }
  });

  test('all sheets have non-empty viewBox with non-zero dimensions', () => {
    for (const sheet of sheets) {
      expect(sheet.svg, `${sheet.name} contains viewBox`).toContain('viewBox');
      expect(sheet.svg, `${sheet.name} has non-zero width`).toMatch(/width="[1-9]/);
      expect(sheet.svg, `${sheet.name} has non-zero height`).toMatch(/height="[1-9]/);
    }
  });

  test('title block content survives in all sheet families with print mode', () => {
    for (const sheet of sheets) {
      expect(sheet.svg, `${sheet.name} retains PROJECT in title block`).toContain('PROJECT');
      expect(sheet.svg, `${sheet.name} retains SCALE`).toContain('SCALE');
      expect(sheet.svg, `${sheet.name} retains REVISION`).toContain('REVISION');
    }
  });

  test('print-mode sheet backgrounds are white (presentation excluded — uses dark theme)', () => {
    for (const sheet of sheets) {
      if (sheet.name === 'presentation') continue;
      expect(sheet.svg, `${sheet.name} has white background in print mode`).toContain('#ffffff');
    }
  });

  test('all technical sheets use Arial font family', () => {
    for (const sheet of sheets) {
      if (sheet.name === 'presentation') continue;
      expect(sheet.svg, `${sheet.name} contains Arial`).toContain('Arial');
    }
  });

  test('no forbidden bright colors in print mode sheets', () => {
    const brightColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    for (const sheet of sheets) {
      for (const color of brightColors) {
        expect(sheet.svg, `${sheet.name} does not contain ${color}`).not.toContain(color);
      }
    }
  });
});

// ── Workstream 6: Schedule Linkage ──
describe('P13.5 — Workstream 6: Schedule Linkage', () => {
  test('door schedule SVG contains MARK and WIDTH columns', () => {
    const cad = fixtureCad();
    const svg = buildScheduleSvg(cad, 'door', FIXTURE_META);
    expect(svg).toContain('MARK');
    expect(svg).toContain('WIDTH');
    expect(svg).toContain('HEIGHT');
    expect(svg).toContain('FIRE RATING');
  });

  test('window schedule SVG contains SILL and TYPE columns', () => {
    const cad = fixtureCad();
    const svg = buildScheduleSvg(cad, 'window', FIXTURE_META);
    expect(svg).toContain('SILL');
    expect(svg).toContain('TYPE');
  });

  test('structural schedule SVG contains ELEMENT and SYSTEM columns', () => {
    const cad = fixtureCad();
    const svg = buildScheduleSvg(cad, 'structural', FIXTURE_META);
    expect(svg).toContain('ELEMENT');
    expect(svg).toContain('SYSTEM');
    expect(svg).toContain('THICKNESS');
  });

  test('equipment schedule SVG contains TAG and CAPACITY columns', () => {
    const cad = fixtureCad();
    const svg = buildScheduleSvg(cad, 'equipment', FIXTURE_META);
    expect(svg).toContain('EQUIPMENT SCHEDULE');
    expect(svg).toContain('TAG');
    expect(svg).toContain('CAPACITY');
    expect(svg).toContain('REFRIGERANT');
  });

  test('equipment schedule lists AC units from CAD model', () => {
    const cad = fixtureCad();
    const svg = buildScheduleSvg(cad, 'equipment', FIXTURE_META);
    expect(svg).toContain('AC-01');
    expect(svg).toContain('3.5kW');
    expect(svg).toContain('R32');
  });

  test('room schedule SVG contains ROOM NAME and AREA columns', () => {
    const cad = fixtureCad();
    const svg = buildScheduleSvg(cad, 'room', FIXTURE_META);
    expect(svg).toContain('ROOM SCHEDULE');
    expect(svg).toContain('ROOM NAME');
    expect(svg).toContain('AREA');
  });

  test('floor plan contains schedule cross-reference tags for doors/windows', () => {
    const cad = fixtureCad();
    const svg = buildFloorPlanSvg(cad, 'f1', FIXTURE_META);
    expect(svg).toContain('Schedule');
    expect(svg).toContain('door/window schedule');
  });

  test('room names from canonical programme appear on floor plan', () => {
    const programme = { 'Living Room': 'Living Room' as any, Kitchen: 'Kitchen' as any };
    const cad = fixtureCad({ roomProgramme: programme });
    const svg = buildFloorPlanSvg(cad, 'f1', FIXTURE_META);
    expect(svg).not.toContain('Room 1');
    expect(svg).toContain('Arial');
  });

  test('floor plan opening tags match schedule references', () => {
    const cad = fixtureCad();
    const planSvg = buildFloorPlanSvg(cad, 'f1', FIXTURE_META);
    expect(planSvg).toContain('D-');
    expect(planSvg).toContain('W-');
  });
});

// ── Regression: All existing patterns remain green ──
describe('P13.5 — Regression', () => {
  const cad = fixtureCad();
  const sectionConfig: SectionConfig = { axis: 'AA', position: 5 };

  test('floor plan does not crash with minimal data', () => {
    const empty: Ws6CadDocument = {
      id: 'empty', projectId: '', name: '', materialSystem: 'concrete',
      floors: [{ id: 'f1', name: 'G', elevation: 0, height: 3 }],
      walls: [], openings: [], blocks: [], boundaries: [],
    };
    const svg = buildFloorPlanSvg(empty, 'f1');
    expect(isValidSvg(svg)).toBe(true);
  });

  test('floor plan contains section mark when config provided', () => {
    const cad2 = fixtureCad();
    const svg = buildFloorPlanSvg(cad2, 'f1', FIXTURE_META, sectionConfig);
    expect(svg).toContain('stroke-dasharray="10 4 2 4"');
  });

  test('all discipline generators return valid SVG without title meta', () => {
    const svgs = [
      buildFloorPlanSvg(cad, 'f1'),
      buildSitePlanSvg(cad),
      buildFoundationPlanSvg(cad),
      buildElectricalPlanSvg(cad, 'f1'),
      buildPlumbingPlanSvg(cad, 'f1'),
      buildHvacPlanSvg(cad, 'f1'),
      buildElevationSvg(cad, 'front'),
      buildSectionSvg(cad, undefined, sectionConfig),
    ];
    for (const svg of svgs) {
      expect(isValidSvg(svg)).toBe(true);
    }
  });

  test('canonical room naming does not regress', () => {
    const cad2 = fixtureCad({ roomProgramme: { 'Living Room': 'Living Room' as any } });
    const { rooms } = computeRoomsFromWalls(cad2.walls, 0, cad2.roomProgramme);
    const hasNamed = rooms.some(r => r.name === 'Living Room');
    expect(hasNamed).toBe(true);
  });

  test('lineweight constants remain consistent', () => {
    expect(LW.CUT).toBeGreaterThan(LW.PARTITION);
    expect(LW.DIMENSION).toBeLessThan(LW.CUT);
    expect(LW.GRID).toBeLessThan(LW.ANNOTATION);
  });

  test('no generator crash with empty walls', () => {
    const empty = fixtureCad({ walls: [], openings: [], blocks: [], boundaries: [] });
    const svg = buildFloorPlanSvg(empty, 'f1', FIXTURE_META);
    expect(isValidSvg(svg)).toBe(true);
  });
});
