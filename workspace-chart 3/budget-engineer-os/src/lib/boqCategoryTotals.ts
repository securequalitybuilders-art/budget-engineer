import type { BOQ } from '../domain/boq';

export function boqCategoryTotals(boq: BOQ): Record<string, number> {
  return boq.items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + item.total;
    return acc;
  }, {});
}
