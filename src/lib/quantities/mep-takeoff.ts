import type { BimModel, BimRoomZone } from '../../domain/bim';

export interface SpaceMepScheduleItem {
  zoneId: string;
  spaceName: string;
  program: string;
  area: number;
  elecPoints: number;
  lightPoints: number;
  plumbPoints: number;
  estimatedCostUsd: number;
}

export interface MepTakeoffSummary {
  spaceSchedules: SpaceMepScheduleItem[];
  totalElecPoints: number;
  totalLightPoints: number;
  totalPlumbPoints: number;
  totalMepCostUsd: number;
  efficiencyScore: string;
}

function getZoneProgram(zone: BimRoomZone): string {
  const prog = zone.properties?.['program'];
  if (typeof prog === 'string' && prog.length > 0) return prog;
  const name = zone.name?.toLowerCase() || '';
  if (name.includes('kitchen')) return 'kitchen';
  if (name.includes('bath') || name.includes('wc') || name.includes('toilet')) return 'bathroom';
  if (name.includes('bed')) return 'bedroom';
  if (name.includes('lounge') || name.includes('living')) return 'living';
  return 'Open Plan Studio Space';
}

function getZoneArea(zone: BimRoomZone): number {
  if (zone.width && zone.depth) return zone.width * zone.depth;
  return 10;
}

export function computeMepTakeoff(bim: BimModel): MepTakeoffSummary {
  const zones = bim.elements.filter(e => e.type === 'roomZone') as BimRoomZone[];
  const scheds: SpaceMepScheduleItem[] = [];
  let totElec = 0, totLight = 0, totPlumb = 0, totCost = 0;

  for (const z of zones) {
    const prog = getZoneProgram(z).toLowerCase();
    const area = getZoneArea(z);
    let ep = 6, lp = Math.ceil(area / 6), pp = 0;

    if (prog.includes('kitchen')) {
      ep = 8; lp = 4; pp = 3;
    } else if (prog.includes('bath') || prog.includes('wc')) {
      ep = 2; lp = 2; pp = 5;
    } else if (prog.includes('bed')) {
      ep = 4; lp = Math.ceil(area / 8); pp = 0;
    }

    const cost = (ep + lp) * 65 + pp * 180;
    totElec += ep;
    totLight += lp;
    totPlumb += pp;
    totCost += cost;

    scheds.push({
      zoneId: z.id,
      spaceName: z.name,
      program: z.properties?.['program'] as string || 'Open Plan',
      area,
      elecPoints: ep,
      lightPoints: lp,
      plumbPoints: pp,
      estimatedCostUsd: cost
    });
  }

  const totArea = zones.reduce((a, b) => a + getZoneArea(b), 0);
  const avgCostPerM2 = totArea > 0 ? totCost / totArea : 0;
  let score = 'Optimized Standard';
  if (avgCostPerM2 > 45) score = 'High Density MEP';

  return {
    spaceSchedules: scheds,
    totalElecPoints: totElec,
    totalLightPoints: totLight,
    totalPlumbPoints: totPlumb,
    totalMepCostUsd: totCost,
    efficiencyScore: score
  };
}
