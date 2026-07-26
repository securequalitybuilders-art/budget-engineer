import type { BOQ as Ws3Boq } from '../boq/boq-types';
import { filterSnapshotsByProject } from './project-filters';
import { buildPortfolioMetric, type PortfolioMetric } from './portfolio-metrics';
import { db } from '../../db/db';

export async function loadProjectPortfolio(projectId?: string): Promise<PortfolioMetric[]> {
  if (!projectId) return [];
  const allSnapshots = await db.snapshots?.orderBy('timestamp').reverse().toArray() ?? [];
  const scoped = filterSnapshotsByProject(allSnapshots, projectId);
  const metrics: PortfolioMetric[] = [];
  for (const snapshot of scoped) {
    const bim = await db.bimModels?.get(snapshot.bimId);
    const boq = await db.boqs?.get(snapshot.boqId) as unknown as Ws3Boq | undefined;
    if (bim && boq) metrics.push(buildPortfolioMetric(snapshot, boq, bim));
  }
  return metrics;
}

export async function loadProjectPortfolioWithLive(projectId?: string): Promise<PortfolioMetric[]> {
  if (!projectId) return [];
  const snapshotMetrics = await loadProjectPortfolio(projectId);
  const liveBim = await db.bimModels?.get(`bim-${projectId}`);
  const liveBoq = await db.boqs?.get(`boq-${projectId}`) as Ws3Boq | undefined;
  if (liveBim && liveBoq) {
    snapshotMetrics.unshift({
      snapshotId: `live-${projectId}`,
      name: 'Live working state',
      grandTotal: liveBoq.summary.grandTotal,
      subtotal: liveBoq.summary.subtotal,
      zoneCount: liveBim.elements.filter((e) => e.type === 'roomZone').length,
      wallCount: liveBim.elements.filter((e) => e.type === 'wall').length,
    });
  }
  return snapshotMetrics;
}
