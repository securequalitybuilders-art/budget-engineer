import type { ProjectSnapshot } from '../../domain/versioning';
import type { TransactionEvent } from '../../domain/transaction';
import type { PortfolioMetric } from './portfolio-metrics';

export function filterSnapshotsByProject(items: ProjectSnapshot[], projectId?: string) {
  return projectId ? items.filter((s) => s.projectId === projectId) : items;
}

export function filterTransactionsByProject(items: TransactionEvent[], projectId?: string) {
  if (!projectId) return items;
  return items.filter((t) => t.entityId.includes(projectId) || (typeof t.metadata?.projectId === 'string' && t.metadata.projectId === projectId));
}

export function filterPortfolioByProject(items: PortfolioMetric[], snapshots: ProjectSnapshot[], projectId?: string) {
  if (!projectId) return items;
  const allowed = new Set(snapshots.filter((s) => s.projectId === projectId).map((s) => s.id));
  return items.filter((p) => allowed.has(p.snapshotId));
}
