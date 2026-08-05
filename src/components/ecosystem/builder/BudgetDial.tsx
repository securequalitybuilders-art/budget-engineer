import { EcoCard, Stat, Bar } from '@/components/ecosystem/ui';
import { fmtCents, type EcosystemData } from '@/components/ecosystem/useEcosystemData';

export function BudgetDial({
  boqs, purchaseOrders, milestones,
}: { boqs: EcosystemData['boqs']; purchaseOrders: EcosystemData['purchaseOrders']; milestones: EcosystemData['milestones'] }) {
  const budgetCents = boqs.reduce((s, b) => s + b.totalCents, 0);
  const contingencyCents = boqs.reduce((s, b) => s + b.contingencyCents, 0);
  const committedCents = purchaseOrders.reduce((s, p) => s + p.totalCents, 0);
  const spentCents = milestones.reduce((s, m) => s + (m.actualCostCents ?? 0), 0);
  const usedCents = Math.max(committedCents, spentCents);
  const remainingCents = Math.max(budgetCents - usedCents, 0);
  const usedPct = budgetCents > 0 ? (usedCents / budgetCents) * 100 : 0;

  return (
    <EcoCard title="Budget dial" subtitle="Scope cost vs committed spend">
      <div className="relative mx-auto mb-3 flex h-36 w-36 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(#d4a574 ${usedPct}%, #f1f5f9 ${usedPct}% 100%)` }}>
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
          <span className="text-xs text-slate-400">Used</span>
          <span className="text-xl font-bold text-slate-800">{usedPct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Budget" value={fmtCents(budgetCents)} />
        <Stat label="Contingency" value={fmtCents(contingencyCents)} />
        <Stat label="Committed" value={fmtCents(committedCents)} tone={usedPct > 90 ? 'warn' : 'default'} />
        <Stat label="Remaining" value={fmtCents(remainingCents)} tone={remainingCents === 0 ? 'bad' : 'good'} />
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>Commitment headroom</span>
          <span>{Math.max(100 - usedPct, 0).toFixed(0)}%</span>
        </div>
        <Bar value={usedPct} max={100} tone={usedPct > 90 ? 'bad' : usedPct > 75 ? 'warn' : 'good'} />
      </div>
    </EcoCard>
  );
}
