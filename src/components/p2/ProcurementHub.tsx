/**
 * P2 Procurement Hub panel.
 * Purchase orders, invoices, matching, and 3-way match.
 */
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ShoppingCart, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { buildJobCostSummary } from '@/engine/sitehawk/realTimeJobCosting';
import { DataTable, DzCard, DzPill, Kicker, Money } from '@/components/dzenhare';

export function ProcurementHub() {
  const { id: projectId } = useProjectStore(s => ({ id: s.projects[0]?.id ?? 'local' }));
  const { pos, invoices, loadForProject } = useSiteHawkStore(useShallow(s => ({
    pos: s.pos,
    invoices: s.invoices,
    loadForProject: s.loadForProject,
  })));

  useEffect(() => { loadForProject(projectId); }, [projectId, loadForProject]);

  const summary = useMemo(() => buildJobCostSummary(pos, invoices), [pos, invoices]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <DzCard>
          <Kicker><ShoppingCart size={14} className="inline mr-1" />Purchase Orders</Kicker>
          <div className="text-2xl font-bold">{summary.poCount}</div>
          <DzPill tone="neutral">{summary.unmatchedPos} unmatched</DzPill>
        </DzCard>
        <DzCard>
          <Kicker><FileText size={14} className="inline mr-1" />Invoices</Kicker>
          <div className="text-2xl font-bold">{summary.invoiceCount}</div>
          <DzPill tone={summary.pendingInvoiceCents > 0 ? 'verified' : 'neutral'}>pending</DzPill>
        </DzCard>
        <DzCard>
          <Kicker>PO Total</Kicker>
          <Money cents={summary.totalPoCostCents} />
        </DzCard>
        <DzCard>
          <Kicker>Invoice Total</Kicker>
          <Money cents={summary.totalBilledCents} />
          {summary.varianceCents !== 0 && (
            <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} />
              Variance <Money cents={summary.varianceCents} />
            </div>
          )}
        </DzCard>
        <DzCard>
          <Kicker>Paid</Kicker>
          <Money cents={summary.paidCents} />
          <DzPill tone="released"><CheckCircle size={12} className="inline mr-1" />settled</DzPill>
        </DzCard>
      </div>

      <DzCard>
        <h3 className="text-sm font-semibold text-stone-300 mb-3">Purchase Orders</h3>
        <DataTable
          columns={[
            { key: 'poNumber', header: 'PO #' },
            { key: 'supplierName', header: 'Supplier' },
            { key: 'material', header: 'Material' },
            { key: 'quantity', header: 'Qty', render: (r) => `${r.quantity} ${r.unit}` },
            { key: 'totalCostCents', header: 'Total', render: (r) => <Money cents={r.totalCostCents} /> },
            { key: 'status', header: 'Status', render: (r) => {
              const tone = r.status === 'paid' ? 'released' : r.status === 'received' ? 'verified' : r.status === 'invoiced' ? 'neutral' : 'disputed';
              return <DzPill tone={tone}>{r.status}</DzPill>;
            }},
          ]}
          rows={pos}
          rowKey={(r) => r.id}
        />
      </DzCard>

      <DzCard>
        <h3 className="text-sm font-semibold text-stone-300 mb-3">Invoices</h3>
        <DataTable
          columns={[
            { key: 'invoiceRef', header: 'Invoice #' },
            { key: 'supplierName', header: 'Supplier' },
            { key: 'amountCents', header: 'Amount', render: (r) => <Money cents={r.amountCents} /> },
            { key: 'taxCents', header: 'Tax', render: (r) => <Money cents={r.taxCents} /> },
            { key: 'totalCents', header: 'Total', render: (r) => <Money cents={r.totalCents} /> },
            { key: 'status', header: 'Status', render: (r) => {
              const tone = r.status === 'paid' ? 'released' : r.status === 'approved' ? 'verified' : 'neutral';
              return <DzPill tone={tone}>{r.status}</DzPill>;
            }},
          ]}
          rows={invoices}
          rowKey={(r) => r.id}
        />
      </DzCard>
    </div>
  );
}
