import type { InteriorProject, MaterialDef } from '@/domain/interior';
import { getFixtureById } from '@/lib/interior/fixtures';
import { generateFinishSchedule } from '@/lib/interior/finishSchedule';

export interface InteriorBoqLineItem {
  code: string;
  description: string;
  quantity: number;
  unit: string;
  rateCents: number;
  totalCents: number;
  source: 'interior-finish' | 'interior-fixture';
}

export function interiorFinishesToBoq(
  project: InteriorProject,
  materials: MaterialDef[]
): InteriorBoqLineItem[] {
  const schedule = generateFinishSchedule(project.rooms, materials);
  return schedule.map((item) => ({
    code: `INT-FIN-${item.surface.toUpperCase()}`,
    description: `${item.materialName} — ${item.roomName} (${item.surface})`,
    quantity: item.quantityM2,
    unit: 'm2',
    rateCents: item.rateCents,
    totalCents: item.totalCents,
    source: 'interior-finish' as const,
  }));
}

export function interiorFixturesToBoq(
  project: InteriorProject,
  _materials: MaterialDef[]
): InteriorBoqLineItem[] {
  const items: InteriorBoqLineItem[] = [];

  for (const fixture of project.fixtures) {
    const def = getFixtureById(fixture.fixtureTypeId);
    if (!def) continue;

    const room = project.rooms.find((r) => r.roomId === fixture.roomId);
    const roomName = room?.name ?? 'Unknown';

    items.push({
      code: `INT-FIX-${def.category.toUpperCase()}`,
      description: `${def.name} — ${roomName}`,
      quantity: 1,
      unit: 'each',
      rateCents: fixtureRateCents(def.id),
      totalCents: fixtureRateCents(def.id),
      source: 'interior-fixture',
    });
  }

  return items;
}

function fixtureRateCents(fixtureTypeId: string): number {
  const rates: Record<string, number> = {
    'WC-CLOSET': 25000,
    'WC-WALLHUNG': 35000,
    'BIDET': 28000,
    'URINAL': 22000,
    'BASIN-WALL': 18000,
    'BASIN-PED': 25000,
    'BASIN-VANITY': 45000,
    'SHOWER-TRAY': 32000,
    'SHOWER-LINEAR': 55000,
    'BATH-STANDARD': 60000,
    'BATH-CORNER': 85000,
    'BATH-FREESTD': 120000,
    'SINK-KITCHEN': 35000,
    'SINK-DBL': 50000,
    'LAUNDRY-TUB': 25000,
    'COOKTOP-4': 40000,
    'COOKTOP-6': 60000,
    'OVEN-SINGLE': 55000,
    'OVEN-DBL': 95000,
    'EXTRACTOR': 30000,
    'FRIDGE': 50000,
    'FRIDGE-AMERICN': 90000,
    'DISHWASHER': 45000,
    'KITCHEN-ISLAND': 120000,
    'LIGHT-CEILING': 8000,
    'LIGHT-RECESSED': 5000,
    'LIGHT-PENDANT': 12000,
    'LIGHT-WALL': 7000,
    'LIGHT-TRACK': 15000,
    'EXIT-SIGN': 6000,
    'BED-SINGLE': 40000,
    'BED-DBL': 60000,
    'BED-KING': 85000,
    'SOFA-2SEAT': 45000,
    'SOFA-3SEAT': 65000,
    'SOFA-CORNER': 95000,
    'DINING-TABLE-4': 35000,
    'DINING-TABLE-6': 50000,
    'DINING-TABLE-8': 70000,
    'CHAIR-DINING': 12000,
    'CHAIR-DESK': 15000,
    'CHAIR-ARM': 25000,
    'DESK': 30000,
    'DESK-CORNER': 45000,
    'BOOKSHELF': 35000,
    'WARDROBE-2DR': 55000,
    'WARDROBE-3DR': 75000,
    'NIGHTSTAND': 15000,
    'COFFEE-TABLE': 20000,
    'TV-UNIT': 40000,
    'MIRROR-WALL': 12000,
    'TOWEL-RAIL': 5000,
    'TOWEL-RING': 3000,
    'TOILET-ROLL': 2500,
    'SOAP-DISP': 3000,
    'CURTAIN-ROD': 8000,
    'BLINDS': 15000,
    'RADIATOR': 35000,
    'TOWEL-RADIATOR': 25000,
    'FAN-CEILING': 25000,
    'AC-UNIT': 60000,
  };
  return rates[fixtureTypeId] ?? 15000;
}

export function interiorToBoqTotal(
  project: InteriorProject,
  materials: MaterialDef[]
): { items: InteriorBoqLineItem[]; totalCents: number } {
  const finishes = interiorFinishesToBoq(project, materials);
  const fixtures = interiorFixturesToBoq(project, materials);
  const all = [...finishes, ...fixtures];
  return {
    items: all,
    totalCents: all.reduce((sum, item) => sum + item.totalCents, 0),
  };
}
