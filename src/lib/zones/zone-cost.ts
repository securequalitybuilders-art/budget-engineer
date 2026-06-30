import type { BimElement, BimModel } from '../../domain/bim';
import type { BOQ } from '../boq/boq-types';

export type ZoneCostSummary = {
  zoneId: string;
  name: string;
  program: string;
  area: number;
  estimatedCost: number;
  costPerM2: number;
};

export function estimateZoneCosts(bim: BimModel, boq: BOQ): ZoneCostSummary[] {
  const totalArea = bim.elements.filter((e) => e.type === 'roomZone').reduce((sum, e) => sum + zoneArea(e), 0);
  const totalCost = boq.summary.grandTotal || 0;
  return bim.elements
    .filter((e): e is Extract<BimElement, { type: 'roomZone' }> => e.type === 'roomZone')
    .map((zone) => {
      const area = zoneArea(zone);
      const estimatedCost = totalArea > 0 ? round((area / totalArea) * totalCost) : 0;
      return {
        zoneId: zone.id,
        name: zone.name,
        program: String(zone.properties.program ?? 'Unassigned'),
        area: round(area),
        estimatedCost,
        costPerM2: area > 0 ? round(estimatedCost / area) : 0,
      };
    });
}

function zoneArea(zone: Extract<BimElement, { type: 'roomZone' }>) {
  return zone.width * zone.depth;
}
function round(n: number) { return Math.round(n * 100) / 100; }
