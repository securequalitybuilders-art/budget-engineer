import { db } from './db';
import { filterSnapshotsByProject } from './projectFilters';
import { buildPortfolioMetric, type PortfolioMetric } from './portfolioMetrics';

/**
 * Loads a project's full portfolio metrics directly from IndexedDB, independent
 * of the currently-active project in the store. This is what makes cross-project
 * analytics *truly* independent: left and right comparison sides each fetch their
 * own snapshots/BIM/BOQ rather than filtering the active-project-scoped store arrays.
 */
export async function loadProjectPortfolio(projectId?: string): Promise<PortfolioMetric[]> {
  if (!projectId) return [];
  const allSnapshots = await db.snapshots.orderBy('timestamp').reverse().toArray();
  const scoped = filterSnapshotsByProject(allSnapshots, projectId);
  const metrics: PortfolioMetric[] = [];
  for (const snapshot of scoped) {
    const [bim, boq] = await Promise.all([db.bimModels.get(snapshot.bimId), db.boqs.get(snapshot.boqId)]);
    if (bim && boq) metrics.push(buildPortfolioMetric(snapshot, boq, bim));
  }
  return metrics;
}

/**
 * Convenience loader that also folds in the project's *current live* BIM/BOQ
 * (the working state, not just historical snapshots) as a synthetic metric, so
 * cross-project comparison reflects the live model even before any snapshot exists.
 */
export async function loadProjectPortfolioWithLive(projectId?: string): Promise<PortfolioMetric[]> {
  if (!projectId) return [];
  const snapshotMetrics = await loadProjectPortfolio(projectId);
  const [liveBim, liveBoq] = await Promise.all([db.bimModels.get(`bim-${projectId}`), db.boqs.get(`boq-${projectId}`)]);
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
