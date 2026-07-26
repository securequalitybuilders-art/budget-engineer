import type { ProjectSnapshot } from '../../domain/versioning';
import type { BOQ } from '../boq/boq-types';
import type { BimModel } from '../../domain/bim';

export type PortfolioMetric = {
  snapshotId: string;
  name: string;
  grandTotal: number;
  subtotal: number;
  zoneCount: number;
  wallCount: number;
};

export function buildPortfolioMetric(snapshot: ProjectSnapshot, boq: BOQ, bim: BimModel): PortfolioMetric {
  return {
    snapshotId: snapshot.id,
    name: snapshot.name,
    grandTotal: boq.summary.grandTotal,
    subtotal: boq.summary.subtotal,
    zoneCount: bim.elements.filter((e) => e.type === 'roomZone').length,
    wallCount: bim.elements.filter((e) => e.type === 'wall').length,
  };
}
