import type { ZoneCostSummary } from '../zones/zone-cost';

export function buildRoomScheduleCsv(items: ZoneCostSummary[]) {
  const header = ['zoneId', 'name', 'program', 'area_m2', 'estimated_cost_usd', 'cost_per_m2_usd'];
  const rows = items.map((item) => [
    item.zoneId,
    escapeCsv(item.name),
    escapeCsv(item.program),
    item.area,
    item.estimatedCost,
    item.costPerM2,
  ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function escapeCsv(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
