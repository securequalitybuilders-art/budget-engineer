import { EcoCard, Stat, Bar, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents, type EcosystemData } from '@/components/ecosystem/useEcosystemData';

export function PnLWidget({
  milestones, purchaseOrders, procurementRequests,
}: { milestones: EcosystemData['milestones']; purchaseOrders: EcosystemData['purchaseOrders']; procurementRequests: EcosystemData['procurementRequests'] }) {
  const plannedCents = milestones.reduce((s, m) => s + m.plannedCostCents, 0);
  const actualCents = milestones.reduce((s, m) => s + (m.actualCostCents ?? m.plannedCostCents), 0);
  const poValue = purchaseOrders.reduce((s, p) => s + p.totalCents, 0);
  const requestBudget = procurementRequests.reduce((s, r) => s + r.budgetCents, 0);
  const variance = plannedCents - actualCents;
  const variancePct = plannedCents > 0 ? (variance / plannedCents) * 100 : 0;

  return (
    <EcoCard title="P&L · budget vs actual" subtitle="Milestone cost performance">
      {plannedCents === 0 && actualCents === 0 ? (
        <EmptyState message="No cost data yet — milestones with planned costs will populate this." />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Stat label="Planned" value={fmtCents(plannedCents)} />
            <Stat label="Actual" value={fmtCents(actualCents)} />
            <Stat label="Variance" value={`${variance >= 0 ? '+' : ''}${fmtCents(variance)}`} tone={variance >= 0 ? 'good' : 'bad'} />
            <Stat label="Variance %" value={`${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}%`} tone={variancePct >= 0 ? 'good' : 'bad'} />
          </div>
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>Cost to date</span>
              <span>{actualCents > 0 && plannedCents > 0 ? Math.min((actualCents / plannedCents) * 100, 100).toFixed(0) : 0}%</span>
            </div>
            <Bar value={actualCents} max={Math.max(plannedCents, actualCents, 1)} tone={variance >= 0 ? 'good' : 'warn'} />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>POs issued · {fmtCents(poValue)}</span>
            <span>RFQ budget pool · {fmtCents(requestBudget)}</span>
          </div>
        </>
      )}
    </EcoCard>
  );
}
