import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents, fmtDate, type EcosystemData } from '@/components/ecosystem/useEcosystemData';

export function PipelineWidget({ supplierQuotes, procurementRequests }: {
  supplierQuotes: EcosystemData['supplierQuotes'];
  procurementRequests: EcosystemData['procurementRequests'];
}) {
  const open = supplierQuotes.filter((q) => q.status === 'pending' || q.status === 'received' || q.status === 'evaluated');
  const won = supplierQuotes.filter((q) => q.status === 'awarded');
  const value = supplierQuotes.reduce((s, q) => s + q.totalCents, 0);
  const wonValue = won.reduce((s, q) => s + q.totalCents, 0);

  return (
    <EcoCard title="Sales pipeline" subtitle="Quotes in flight and wins" icon={<span aria-hidden>🚀</span>}>
      {supplierQuotes.length === 0 ? (
        <EmptyState message="No quotes yet. Respond to RFQs to fill your pipeline." />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-400">Open</div>
              <div className="text-lg font-bold text-slate-800">{open.length}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2">
              <div className="text-xs text-slate-400">Won</div>
              <div className="text-lg font-bold text-emerald-600">{won.length}</div>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2">
              <div className="text-xs text-slate-400">Won value</div>
              <div className="text-sm font-bold text-amber-600">{fmtCents(wonValue)}</div>
            </div>
          </div>
          <ul className="space-y-2">
            {supplierQuotes.slice(0, 5).map((q) => (
              <li key={q.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-slate-700">{q.quoteNumber}</div>
                  <div className="text-[11px] text-slate-400">{fmtCents(q.totalCents)} · valid to {fmtDate(q.validUntil)}</div>
                </div>
                <Pill tone={q.status === 'awarded' ? 'good' : q.status === 'declined' ? 'bad' : 'accent'}>{q.status}</Pill>
              </li>
            ))}
          </ul>
          <div className="mt-2 text-xs text-slate-400">Total pipeline value {fmtCents(value)} · {procurementRequests.length} active RFQ(s)</div>
        </>
      )}
    </EcoCard>
  );
}
