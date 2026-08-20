/**
 * P2 Real-Time Job Costing Panel.
 * Live PO/invoice tracking, cost summary, labour hours auto-coding.
 */
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { DollarSign, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { useGreenFlagStore } from '@/stores/greenFlagStore';
import { buildJobCostSummary } from '@/engine/sitehawk/realTimeJobCosting';
import { aggregateJobCosts } from '@/engine/sitehawk/resourceScheduling';
import { DataTable, DzCard, DzPill, Kicker, Money } from '@/components/dzenhare';

export function RealTimeJobCostingPanel() {
  const { id: projectId } = useProjectStore(s => ({ id: s.projects[0]?.id ?? 'local' }));
  const { pos, invoices, schedules, loadForProject } = useSiteHawkStore(useShallow(s => ({
    pos: s.pos,
    invoices: s.invoices,
    schedules: s.resourceSchedules,
    loadForProject: s.loadForProject,
  })));
  const baselines = useGreenFlagStore(s => s.costBaselines);
  const baseline = baselines.find(b => b.projectId === projectId);

  useEffect(() => { loadForProject(projectId); }, [projectId, loadForProject]);

  const poSummary = useMemo(() => buildJobCostSummary(pos, invoices), [pos, invoices]);
  const jobCosts = useMemo(() => aggregateJobCosts(schedules), [schedules]);

  const committedCents = poSummary.totalPoCostCents;
  const spentCents = poSummary.paidCents;
  const budgetCents = baseline?.totalCostCents ?? 0;
  const budgetUsedPct = budgetCents > 0 ? Math.round(spentCents / budgetCents * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DzCard>
          <Kicker><DollarSign size={14} className="inline mr-1" />Budget</Kicker>
          <Money cents={budgetCents} />
          <div className="text-xs text-stone-400 mt-1">{budgetUsedPct}% used</div>
          <div className="mt-1 h-2 rounded bg-stone-800 overflow-hidden">
            <div className="h-full bg-amber-500 rounded" style={{ width: `${Math.min(budgetUsedPct, 100)}%` }} />
          </div>
        </DzCard>
        <DzCard>
          <Kicker><Clock size={14} className="inline mr-1" />Committed (POs)</Kicker>
          <Money cents={committedCents} />
          <DzPill tone="neutral">{poSummary.poCount} POs</DzPill>
        </DzCard>
        <DzCard>
          <Kicker><FileText size={14} className="inline mr-1" />Spent (Paid)</Kicker>
          <Money cents={spentCents} />
          <DzPill tone="released"><CheckCircle size={12} className="inline mr-1" />cleared</DzPill>
        </DzCard>
        <DzCard>
          <Kicker><AlertTriangle size={14} className="inline mr-1" />Pending Invoices</Kicker>
          <Money cents={poSummary.pendingInvoiceCents} />
          {poSummary.unmatchedPos > 0 && (
            <DzPill tone="disputed">{poSummary.unmatchedPos} unmatched</DzPill>
          )}
        </DzCard>
      </div>

      <DzCard>
        <h3 className="text-sm font-semibold text-stone-300 mb-3">Cost Breakdown</h3>
        <div className="space-y-2">
          {[
            { label: 'Labour (auto-coded)', cents: jobCosts.labourCents },
            { label: 'Material (committed)', cents: poSummary.totalPoCostCents },
            { label: 'Invoiced', cents: poSummary.totalBilledCents },
            { label: 'Tax', cents: poSummary.totalTaxCents },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-1 border-b border-stone-800">
              <span className="text-sm text-stone-400">{row.label}</span>
              <Money cents={row.cents} />
            </div>
          ))}
        </div>
      </DzCard>

      {pos.length > 0 && (
        <DzCard>
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Recent Purchase Orders</h3>
          <DataTable
            columns={[
              { key: 'poNumber', header: 'PO #' },
              { key: 'supplierName', header: 'Supplier' },
              { key: 'material', header: 'Material' },
              { key: 'totalCostCents', header: 'Cost', render: (r) => <Money cents={r.totalCostCents} /> },
              { key: 'status', header: 'Status', render: (r) => {
                const tone = r.status === 'paid' ? 'released' : r.status === 'received' ? 'verified' : 'neutral';
                return <DzPill tone={tone}>{r.status}</DzPill>;
              }},
            ]}
            rows={pos.slice(0, 10)}
            rowKey={(r) => r.id}
          />
        </DzCard>
      )}
    </div>
  );
}
