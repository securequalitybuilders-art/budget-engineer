import type { BOQLineItem } from '../boq/boq-types';
import type { ZoneTrace } from './zone-trace';

export type ZoneBoqGroup = {
  zoneId: string;
  zoneName: string;
  categoryTotals: { category: string; total: number }[];
  total: number;
  items: BOQLineItem[];
};

export function groupZoneBoq(trace?: ZoneTrace): ZoneBoqGroup | undefined {
  if (!trace) return undefined;
  const totals = new Map<string, number>();
  trace.items.forEach((item) => totals.set(item.category, (totals.get(item.category) ?? 0) + item.total));
  return {
    zoneId: trace.zoneId,
    zoneName: trace.zoneName,
    categoryTotals: Array.from(totals.entries()).map(([category, total]) => ({ category, total })),
    total: trace.items.reduce((sum, item) => sum + item.total, 0),
    items: trace.items,
  };
}
