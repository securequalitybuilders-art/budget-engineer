import { ProjectSnapshot } from '../domain/versioning';

export function computeSnapshotDiff(snapA?: ProjectSnapshot, snapB?: ProjectSnapshot) {
  if (!snapA || !snapB) return null;
  return {
    wallsDelta: snapB.cadDoc.walls.length - snapA.cadDoc.walls.length,
    openingsDelta: snapB.cadDoc.openings.length - snapA.cadDoc.openings.length,
    zonesDelta: snapB.bimModel.elements.filter(e => e.type === 'roomZone').length - snapA.bimModel.elements.filter(e => e.type === 'roomZone').length,
    subtotalDelta: snapB.boq.summary.subtotal - snapA.boq.summary.subtotal,
    grandTotalDelta: snapB.boq.summary.grandTotal - snapA.boq.summary.grandTotal
  };
}
