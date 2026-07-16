import { describe, it, expect } from 'vitest';
import { generateFinishSchedule, finishScheduleToCsv, generateFinishScheduleHtml } from '@/lib/interior/finishScheduleGenerator';
import { generateFFESchedule, ffeScheduleToCsv, generateFFEScheduleHtml } from '@/lib/interior/ffeScheduleGenerator';
import { generateWetAreaElevation, generateKitchenElevation, generateWardrobeElevation, generateElevationSvg } from '@/lib/interior/elevationGenerator';
import { generateDefaultJoineryDefs, generateDefaultJoinery, joineryScheduleHtml } from '@/lib/interior/joineryGenerator';
import type { InteriorProject, InteriorRoom, FixtureInstance, JoineryInstance } from '@/domain/interior';

function makeInteriorProject(overrides?: Partial<InteriorProject>): InteriorProject {
  const rooms: InteriorRoom[] = [
    { roomId: 'r1', roomType: 'bathroom', name: 'Master Bath', position: { x: 0, y: 0 }, dimensions: { width: 3, height: 2.5 }, rotation: 0, finishSpec: { wallMaterialId: 'tile-w', floorMaterialId: 'tile-f', ceilingMaterialId: 'paint-c', wallFinish: 'Ceramic Tile', floorFinish: 'Porcelain Tile', ceilingFinish: 'Paint' }, notes: '' },
    { roomId: 'r2', roomType: 'kitchen', name: 'Kitchen', position: { x: 3, y: 0 }, dimensions: { width: 4, height: 3 }, rotation: 0, finishSpec: { wallMaterialId: 'paint-w', floorMaterialId: 'vinyl-f', ceilingMaterialId: 'paint-c', wallFinish: 'Paint', floorFinish: 'Vinyl', ceilingFinish: 'Paint' }, notes: '' },
    { roomId: 'r3', roomType: 'bedroom', name: 'Main Bedroom', position: { x: 0, y: 3 }, dimensions: { width: 4, height: 4 }, rotation: 0, finishSpec: { wallMaterialId: 'paint-w', floorMaterialId: 'carpet-f', ceilingMaterialId: 'paint-c', wallFinish: 'Paint', floorFinish: 'Carpet', ceilingFinish: 'Paint' }, notes: '' },
  ];
  const fixtures: FixtureInstance[] = [
    { instanceId: 'f1', fixtureTypeId: 'wc', position: { x: 0.5, y: 1 }, rotation: 0, roomId: 'r1', flipped: false },
    { instanceId: 'f2', fixtureTypeId: 'basin', position: { x: 2, y: 1.5 }, rotation: 0, roomId: 'r1', flipped: false },
    { instanceId: 'f3', fixtureTypeId: 'shower', position: { x: 0.5, y: 0.5 }, rotation: 0, roomId: 'r1', flipped: false },
  ];

  return {
    id: 'int-proj-1',
    projectId: 'p1',
    rooms,
    fixtures,
    materialAssignments: [],
    joinery: [],
    joineryDefs: [],
    ffeEntries: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('P15 — Interior Documentation Studio', () => {
  describe('generateFinishSchedule', () => {
    it('generates finish schedule entries for all rooms', () => {
      const proj = makeInteriorProject();
      const schedule = generateFinishSchedule(proj);
      expect(schedule).toHaveLength(3);
      expect(schedule[0].roomName).toBe('Master Bath');
      expect(schedule[1].wallFinish).toBe('Paint');
      expect(schedule[2].floorFinish).toBe('Carpet');
    });

    it('computes approximate areas when no assignments exist', () => {
      const proj = makeInteriorProject();
      const schedule = generateFinishSchedule(proj);
      for (const entry of schedule) {
        expect(entry.wallAreaM2).toBeGreaterThan(0);
        expect(entry.floorAreaM2).toBeGreaterThan(0);
        expect(entry.ceilingAreaM2).toBeGreaterThan(0);
      }
    });

    it('generates CSV output', () => {
      const proj = makeInteriorProject();
      const schedule = generateFinishSchedule(proj);
      const csv = finishScheduleToCsv(schedule);
      expect(csv).toContain('Room,Type,Wall Finish');
      expect(csv).toContain('Master Bath');
      expect(csv).toContain('Kitchen');
    });

    it('generates HTML table', () => {
      const proj = makeInteriorProject();
      const schedule = generateFinishSchedule(proj);
      const html = generateFinishScheduleHtml(schedule);
      expect(html).toContain('<table');
      expect(html).toContain('</table>');
      expect(html).toContain('Master Bath');
      expect(html).toContain('Carpet');
    });
  });

  describe('generateFFESchedule', () => {
    it('generates FF&E entries from fixtures when no entries exist', () => {
      const proj = makeInteriorProject();
      const schedule = generateFFESchedule(proj);
      expect(schedule.length).toBeGreaterThanOrEqual(3);
      expect(schedule[0].category).toBe('fixture');
    });

    it('uses existing entries when provided', () => {
      const proj = makeInteriorProject({
        ffeEntries: [{ id: 'ffe1', roomId: 'r1', itemName: 'Sofa', supplier: 'Co', modelRef: 'X1', quantity: 2, unit: 'each', rateCents: 50000, category: 'furniture' }],
      });
      const schedule = generateFFESchedule(proj);
      expect(schedule).toHaveLength(1);
      expect(schedule[0].itemName).toBe('Sofa');
    });

    it('generates CSV', () => {
      const proj = makeInteriorProject();
      const schedule = generateFFESchedule(proj);
      const csv = ffeScheduleToCsv(schedule);
      expect(csv).toContain('Item,Room,Category');
    });

    it('generates HTML', () => {
      const proj = makeInteriorProject();
      const schedule = generateFFESchedule(proj);
      const html = generateFFEScheduleHtml(schedule);
      expect(html).toContain('<table');
      expect(html).toContain('</table>');
    });
  });

  describe('elevationGenerator', () => {
    it('generates wet area elevation data', () => {
      const proj = makeInteriorProject();
      const elevation = generateWetAreaElevation(proj, 'r1');
      expect(elevation).not.toBeNull();
      expect(elevation!.roomName).toBe('Master Bath');
      expect(elevation!.walls).toHaveLength(4);
    });

    it('returns null for non-existent room', () => {
      const proj = makeInteriorProject();
      const elevation = generateWetAreaElevation(proj, 'nonexistent');
      expect(elevation).toBeNull();
    });

    it('generates kitchen elevation data', () => {
      const proj = makeInteriorProject();
      const elevation = generateKitchenElevation(proj, 'r2');
      expect(elevation).not.toBeNull();
      expect(elevation!.walls).toHaveLength(2);
    });

    it('generates wardrobe elevation data when joinery exists', () => {
      const defs = generateDefaultJoineryDefs();
      const wardrobeInst: JoineryInstance = {
        instanceId: 'ji1', joineryDefId: 'wardrobe-2dr', roomId: 'r3',
        wallIndex: 0, position: { x: 0, y: 0 }, width: 1800, height: 2400, notes: '',
      };
      const proj = makeInteriorProject({
        joinery: [wardrobeInst],
        joineryDefs: [defs[0]],
      });
      const elevation = generateWardrobeElevation(proj, 'r3');
      expect(elevation).not.toBeNull();
      expect(elevation!.wardrobes).toHaveLength(1);
      expect(elevation!.wardrobes[0].doorStyle).toBe('sliding');
    });

    it('returns null for no wardrobe joinery', () => {
      const proj = makeInteriorProject();
      const elevation = generateWardrobeElevation(proj, 'r3');
      expect(elevation).toBeNull();
    });
  });

  describe('generateElevationSvg', () => {
    it('generates SVG for wet area elevation', () => {
      const proj = makeInteriorProject();
      const data = generateWetAreaElevation(proj, 'r1')!;
      const svg = generateElevationSvg(data);
      expect(svg).toContain('<svg');
      expect(svg).toContain('Elevation');
    });

    it('generates SVG for kitchen elevation', () => {
      const proj = makeInteriorProject();
      const data = generateKitchenElevation(proj, 'r2')!;
      const svg = generateElevationSvg(data);
      expect(svg).toContain('<svg');
      expect(svg).toContain('Cooker');
    });

    it('generates SVG for wardrobe elevation', () => {
      const defs = generateDefaultJoineryDefs();
      const proj = makeInteriorProject({
        joinery: [{ instanceId: 'ji1', joineryDefId: 'wardrobe-2dr', roomId: 'r3', wallIndex: 0, position: { x: 0, y: 0 }, width: 1800, height: 2400, notes: '' }],
        joineryDefs: [defs[0]],
      });
      const data = generateWardrobeElevation(proj, 'r3');
      expect(data).not.toBeNull();
      const svg = generateElevationSvg(data!);
      expect(svg).toContain('<svg');
      expect(svg).toContain('sliding');
    });
  });

  describe('joineryGenerator', () => {
    it('generates default joinery definitions', () => {
      const defs = generateDefaultJoineryDefs();
      expect(defs.length).toBeGreaterThanOrEqual(7);
      expect(defs[0].joineryType).toBe('wardrobe');
      expect(defs[5].joineryType).toBe('kitchen-unit');
    });

    it('generates default joinery from room IDs', () => {
      const { defs, instances } = generateDefaultJoinery('p1', ['r1', 'r2']);
      expect(defs).toHaveLength(7);
      expect(instances).toHaveLength(2);
    });

    it('generates joinery schedule HTML', () => {
      const defs = generateDefaultJoineryDefs();
      const html = joineryScheduleHtml(defs, []);
      expect(html).toContain('<table');
      expect(html).toContain('Wardrobe');
    });
  });
});
