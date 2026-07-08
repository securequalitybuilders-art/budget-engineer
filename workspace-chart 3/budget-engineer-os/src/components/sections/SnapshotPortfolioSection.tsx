import type { ProjectSnapshot } from '../../domain/versioning';
import type { SnapshotComparisonState } from '../../store/appStore';
import type { PortfolioMetric } from '../../lib/portfolioMetrics';
import { ProjectSnapshotsPanel } from '../panels/ProjectSnapshotsPanel';
import { PortfolioDashboardPanel } from '../panels/PortfolioDashboardPanel';
import { PortfolioChartsPanel } from '../panels/PortfolioChartsPanel';
import { SnapshotComparisonPanel } from '../panels/SnapshotComparisonPanel';
import { ComparisonDashboardPanel } from '../panels/ComparisonDashboardPanel';
import { SnapshotDiffTablePanel } from '../panels/SnapshotDiffTablePanel';
import { QuantityComparisonPanel } from '../panels/QuantityComparisonPanel';
import { BoqLineComparisonPanel } from '../panels/BoqLineComparisonPanel';

export type SnapshotPortfolioSectionProps = {
  snapshots: ProjectSnapshot[];
  portfolio: PortfolioMetric[];
  comparison: SnapshotComparisonState;
  snapshotA?: ProjectSnapshot;
  snapshotB?: ProjectSnapshot;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (id: string) => void;
  onSelectA: (id: string) => void;
  onSelectB: (id: string) => void;
};

export default function SnapshotPortfolioSection({
  snapshots,
  portfolio,
  comparison,
  snapshotA,
  snapshotB,
  onCreateSnapshot,
  onRestoreSnapshot,
  onSelectA,
  onSelectB,
}: SnapshotPortfolioSectionProps) {
  return (
    <>
      <ProjectSnapshotsPanel items={snapshots} onCreate={onCreateSnapshot} onRestore={onRestoreSnapshot} />
      <PortfolioDashboardPanel items={portfolio} />
      <PortfolioChartsPanel items={portfolio} />
      <SnapshotComparisonPanel snapshots={snapshots} selectedA={comparison.snapshotAId} selectedB={comparison.snapshotBId} onSelectA={onSelectA} onSelectB={onSelectB} diff={comparison.diff} />
      <ComparisonDashboardPanel snapshotA={snapshotA} snapshotB={snapshotB} diff={comparison.diff} />
      <SnapshotDiffTablePanel snapshotA={snapshotA} snapshotB={snapshotB} diff={comparison.diff} />
      <QuantityComparisonPanel snapshotA={snapshotA} snapshotB={snapshotB} diff={comparison.diff} />
      <BoqLineComparisonPanel items={comparison.boqLineItems} />
    </>
  );
}
