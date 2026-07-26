import type { BOQ } from './boq-types';

export function boqCategoryTotals(boq: BOQ): Record<string, number> {
  return boq.items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + item.total;
    return acc;
  }, {});
}
