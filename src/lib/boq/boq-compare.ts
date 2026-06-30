import type { BOQ } from './boq-types';

export type BoqLineComparison = {
  key: string;
  description: string;
  beforeQuantity: number;
  afterQuantity: number;
  beforeTotal: number;
  afterTotal: number;
  deltaTotal: number;
};

export function compareBoqLineItems(before: BOQ, after: BOQ): BoqLineComparison[] {
  const keys = new Set([...before.items.map((i) => i.quantityRef), ...after.items.map((i) => i.quantityRef)]);
  return Array.from(keys).map((key) => {
    const a = before.items.find((i) => i.quantityRef === key);
    const b = after.items.find((i) => i.quantityRef === key);
    return {
      key,
      description: b?.description ?? a?.description ?? key,
      beforeQuantity: a?.quantity ?? 0,
      afterQuantity: b?.quantity ?? 0,
      beforeTotal: a?.total ?? 0,
      afterTotal: b?.total ?? 0,
      deltaTotal: (b?.total ?? 0) - (a?.total ?? 0),
    };
  }).sort((x, y) => Math.abs(y.deltaTotal) - Math.abs(x.deltaTotal));
}
