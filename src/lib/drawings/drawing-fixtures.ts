/**
 * Drawing Fixture Utilities
 *
 * Provides deterministic known-good SVG fixtures for visual regression
 * protection of key drawing outputs.
 *
 * P13.3 — Visual Regression Confidence
 */
import type { CadDocument, Vec2 } from '@/domain/ws6-types';
import type { TitleBlockMeta } from './title-block';
import type { SectionConfig } from './section-svg';
import { buildFloorPlanSvg } from './disciplines/floor-plan-svg';
import { buildSitePlanSvg } from './disciplines/site-plan-svg';
import { buildFoundationPlanSvg } from './disciplines/foundation-plan-svg';
import { buildRoofPlanSvg } from './disciplines/roof-plan-svg';
import { buildRcpPlanSvg } from './disciplines/rcp-plan-svg';
import { buildElectricalPlanSvg } from './disciplines/electrical-plan-svg';
import { buildPlumbingPlanSvg } from './disciplines/plumbing-plan-svg';
import { buildHvacPlanSvg } from './disciplines/hvac-plan-svg';
import { buildPresentationSvg } from './disciplines/presentation-svg';
import { buildElevationSvg } from './elevation-svg';
import { buildSectionSvg } from './section-svg';

export const STANDARD_FIXTURE_META: TitleBlockMeta = {
  project: 'Fixture Test',
  drawing: 'Fixture Drawing',
  sheet: 'FIX-001',
  scale: '1:100',
  date: '2026-01-15',
  revision: 'A',
  drawnBy: 'Fixture Engine',
};

export function makeFixtureCad(overrides?: Partial<CadDocument>): CadDocument {
  return {
    id: 'fixture-cad-1',
    projectId: 'fixture-proj-1',
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
      { id: 'w6', floorId: 'f2', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w7', floorId: 'f2', start: { x: 12, y: 0 }, end: { x: 12, y: 10 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w8', floorId: 'f2', start: { x: 12, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
      { id: 'w9', floorId: 'f2', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, thickness: 0.23, height: 3, name: 'Ext Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'external', material: 'concrete', properties: {} } },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', floorId: 'f1', kind: 'door', offset: 2, width: 0.9, height: 2.1, sillHeight: 0, headHeight: 2.1, name: 'Front Door', metadata: { ifcClass: 'IfcDoor', category: 'door', material: 'timber', properties: {}, fireRating: 'FD30' } },
      { id: 'o2', wallId: 'w1', floorId: 'f1', kind: 'window', offset: 5, width: 1.5, height: 1.2, sillHeight: 0.9, headHeight: 2.1, name: 'Living Window', metadata: { ifcClass: 'IfcWindow', category: 'window', properties: {}, typeName: 'Sliding' } },
      { id: 'o3', wallId: 'w5', floorId: 'f1', kind: 'door', offset: 3, width: 0.8, height: 2.1, sillHeight: 0, headHeight: 2.1, name: 'Int Door', metadata: { ifcClass: 'IfcDoor', category: 'door', material: 'timber', properties: {}, fireRating: 'FD30' } },
    ],
    blocks: [
      { id: 'b1', floorId: 'f1', kind: 'column', position: { x: 3, y: 3 }, width: 0.3, depth: 0.3, rotation: 0, name: 'Col-1', metadata: { ifcClass: 'IfcColumn', category: 'structure', material: 'concrete', properties: {} } },
      { id: 'b2', floorId: 'f1', kind: 'sink', position: { x: 6, y: 2 }, width: 0.6, depth: 0.5, rotation: 0, name: 'Kitchen Sink', metadata: { ifcClass: 'IfcSanitaryFixture', category: 'plumbing', properties: {} } },
    ],
    boundaries: [
      { id: 'bnd1', points: [{ x: -3, y: -3 } as Vec2, { x: 15, y: -3 } as Vec2, { x: 15, y: 13 } as Vec2, { x: -3, y: 13 } as Vec2], layerId: 'boundaries', boundaryMode: 'verified' },
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

export type FixtureKey =
  | 'floor-plan'
  | 'site-plan'
  | 'foundation'
  | 'roof'
  | 'rcp'
  | 'electrical'
  | 'plumbing'
  | 'hvac'
  | 'elevation-front'
  | 'elevation-side'
  | 'section'
  | 'presentation';

export interface FixtureOutput {
  key: FixtureKey;
  svg: string;
  mode: 'technical' | 'presentation';
}

export function generateFixtures(
  keys: FixtureKey[],
  printMode = false,
): FixtureOutput[] {
  const cad = makeFixtureCad();
  const meta = { ...STANDARD_FIXTURE_META };
  const sectionConfig: SectionConfig = { axis: 'AA', position: 5 };

  const generatorMap: Record<FixtureKey, () => string> = {
    'floor-plan': () => buildFloorPlanSvg(cad, 'f1', meta, undefined, printMode),
    'site-plan': () => buildSitePlanSvg(cad, meta, printMode),
    'foundation': () => buildFoundationPlanSvg(cad, undefined, meta, printMode),
    'roof': () => buildRoofPlanSvg(cad, meta, printMode),
    'rcp': () => buildRcpPlanSvg(cad, 'f1', meta, printMode),
    'electrical': () => buildElectricalPlanSvg(cad, 'f1', meta, printMode),
    'plumbing': () => buildPlumbingPlanSvg(cad, 'f1', meta, printMode),
    'hvac': () => buildHvacPlanSvg(cad, 'f1', meta, printMode),
    'elevation-front': () => buildElevationSvg(cad, 'front', meta, printMode),
    'elevation-side': () => buildElevationSvg(cad, 'side', meta, printMode),
    'section': () => buildSectionSvg(cad, meta, sectionConfig, printMode),
    'presentation': () => buildPresentationSvg(cad, meta),
  };

  return keys.map((key) => ({
    key,
    svg: generatorMap[key](),
    mode: printMode ? 'technical' : 'presentation',
  }));
}

export interface StructuralAssertion {
  name: string;
  check: (svg: string) => boolean;
}

export const STANDARD_STRUCTURAL_ASSERTIONS: StructuralAssertion[] = [
  { name: 'starts-with-svg', check: (s) => s.trim().startsWith('<svg') },
  { name: 'ends-with-svg', check: (s) => s.trim().endsWith('</svg>') },
  { name: 'contains-defs', check: (s) => s.includes('<defs>') },
  { name: 'contains-arial-font', check: (s) => s.includes('Arial') },
  { name: 'no-comic-sans', check: (s) => !s.toLowerCase().includes('comic sans') },
];

/**
 * Assert that a fixture output passes all standard structural checks.
 */
export function assertFixtureStructural(fixture: FixtureOutput): string[] {
  const failures: string[] = [];
  for (const assertion of STANDARD_STRUCTURAL_ASSERTIONS) {
    if (!assertion.check(fixture.svg)) {
      failures.push(`${fixture.key}: ${assertion.name} failed`);
    }
  }
  return failures;
}

/**
 * Check that a fixture SVG contains expected structural elements
 * specific to its sheet type.
 */
export function assertFixtureContent(fixture: FixtureOutput): string[] {
  const failures: string[] = [];
  const svg = fixture.svg;

  switch (fixture.key) {
    case 'floor-plan':
      if (!svg.includes('polygon')) failures.push('floor-plan: missing polygon walls');
      if (!svg.includes('LEGEND')) failures.push('floor-plan: missing legend');
      if (!svg.includes('+')) failures.push('floor-plan: missing level marker');
      break;
    case 'site-plan':
      if (!svg.includes('boundary')) failures.push('site-plan: missing boundary');
      if (!svg.includes('SETBACK')) failures.push('site-plan: missing setback');
      break;
    case 'foundation':
      if (!svg.includes('polygon')) failures.push('foundation: missing footing polygons');
      if (!svg.includes('concrete-hatch')) failures.push('foundation: missing concrete hatch');
      break;
    case 'elevation-front':
    case 'elevation-side':
      if (!svg.includes('±0.000')) failures.push('elevation: missing ground line datum');
      break;
    case 'section':
      if (!svg.includes('NGL')) failures.push('section: missing natural ground level');
      if (!svg.includes('cut')) failures.push('section: missing cut reference');
      break;
    case 'presentation':
      if (!svg.includes('CONCEPTUAL')) failures.push('presentation: missing title');
      if (!svg.includes('PROJECT STATISTICS')) failures.push('presentation: missing metrics');
      break;
  }

  return failures;
}
