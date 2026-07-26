import type { BimModel } from '../../domain/bim';
import type { BOQ } from '../boq/boq-types';

export type SnapshotDiff = {
  wallDelta: number;
  openingDelta: number;
  zoneDelta: number;
  boqGrandTotalDelta: number;
  boqSubtotalDelta: number;
  addedIds: string[];
  removedIds: string[];
  modifiedIds: string[];
};

export function diffProjectState(aBim: BimModel, aBoq: BOQ, bBim: BimModel, bBoq: BOQ): SnapshotDiff {
  const count = (model: BimModel, type: string) => model.elements.filter((e) => e.type === type).length;

  const aMap = new Map(aBim.elements.map((e) => [e.id, JSON.stringify(e)]));
  const bMap = new Map(bBim.elements.map((e) => [e.id, JSON.stringify(e)]));

  const addedIds = bBim.elements.filter((e) => !aMap.has(e.id)).map((e) => e.id);
  const removedIds = aBim.elements.filter((e) => !bMap.has(e.id)).map((e) => e.id);
  const modifiedIds = bBim.elements.filter((e) => aMap.has(e.id) && aMap.get(e.id) !== JSON.stringify(e)).map((e) => e.id);

  return {
    wallDelta: count(bBim, 'wall') - count(aBim, 'wall'),
    openingDelta: count(bBim, 'opening') - count(aBim, 'opening'),
    zoneDelta: count(bBim, 'roomZone') - count(aBim, 'roomZone'),
    boqGrandTotalDelta: round(bBoq.summary.grandTotal - aBoq.summary.grandTotal),
    boqSubtotalDelta: round(bBoq.summary.subtotal - aBoq.summary.subtotal),
    addedIds,
    removedIds,
    modifiedIds,
  };
}

function round(n: number) { return Math.round(n * 100) / 100; }
