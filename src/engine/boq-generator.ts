import type { BimModel } from '../domain/bim';
import type { BOQ, BOQLineItem } from '../lib/boq/boq-types';

const rates = { wall_m2: 85, slab_m2: 110, roof_m2: 75, opening_each: 250, object_each: 120 };
const round = (n: number) => Math.round(n * 100) / 100;

export function generateBoqFromBim(bim: BimModel): BOQ {
  const items: BOQLineItem[] = [];
  for (const e of bim.elements) {
    if (e.type === 'wall') {
      const dx = e.end.x - e.start.x, dz = e.end.z - e.start.z;
      const qty = round(Math.sqrt(dx * dx + dz * dz) * e.height);
      items.push({ id: `boq-${e.id}`, quantityRef: e.quantityRefs?.[0] ?? e.id, category: 'Walls', description: e.name, unit: 'm²', quantity: qty, rate: rates.wall_m2, total: round(qty * rates.wall_m2) });
    }
    if (e.type === 'slab') {
      const qty = round(e.width * e.depth);
      items.push({ id: `boq-${e.id}`, quantityRef: e.quantityRefs?.[0] ?? e.id, category: 'Slabs', description: e.name, unit: 'm²', quantity: qty, rate: rates.slab_m2, total: round(qty * rates.slab_m2) });
    }
    if (e.type === 'roof') {
      const qty = round(e.width * e.depth);
      items.push({ id: `boq-${e.id}`, quantityRef: e.quantityRefs?.[0] ?? e.id, category: 'Roof', description: e.name, unit: 'm²', quantity: qty, rate: rates.roof_m2, total: round(qty * rates.roof_m2) });
    }
    if (e.type === 'opening') items.push({ id: `boq-${e.id}`, quantityRef: e.quantityRefs?.[0] ?? e.id, category: 'Openings', description: e.name, unit: 'each', quantity: 1, rate: rates.opening_each, total: rates.opening_each });
    if (e.type === 'block') items.push({ id: `boq-${e.id}`, quantityRef: e.quantityRefs?.[0] ?? e.id, category: 'Objects', description: e.name, unit: 'each', quantity: 1, rate: rates.object_each, total: rates.object_each });
  }
  const subtotal = round(items.reduce((sum, item) => sum + item.total, 0));
  const contingency = round(subtotal * 0.05);
  const professionalFees = round(subtotal * 0.07);
  const vat = round((subtotal + contingency + professionalFees) * 0.15);
  const grandTotal = round(subtotal + contingency + professionalFees + vat);
  return { id: `boq-${bim.projectId}`, projectId: bim.projectId, currency: 'USD', items, summary: { subtotal, contingency, professionalFees, vat, grandTotal } };
}
