import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents, type EcosystemData } from '@/components/ecosystem/useEcosystemData';
import { compareSuppliers } from '@/engine/ecosystem/tco';

export function ProcurementTcoWidget({ supplierQuotes, procurementRequests }: {
  supplierQuotes: EcosystemData['supplierQuotes'];
  procurementRequests: EcosystemData['procurementRequests'];
}) {
  const reqById = new Map(procurementRequests.map((r) => [r.id, r]));

  const comparisons = compareSuppliers(
    supplierQuotes.map((q) => {
      const req = reqById.get(q.procurementRequestId);
      return {
        id: q.id,
        name: `${q.supplierName} · ${req?.title ?? q.quoteNumber}`,
        input: {
          priceCents: q.totalCents,
          freightCents: q.shippingCents,
          onTimeDeliveryPct: 100 - Math.max(q.deliveryDays - 7, 0) * 5,
          defectRatePct: 1.5,
          laborDowntimeCostCentsPerDay: 20_000_00,
          leadDays: q.deliveryDays,
          typicalLeadDays: 7,
        },
      };
    })
  ).slice(0, 5);

  return (
    <EcoCard title="Procurement · TCO view" subtitle="True cost including freight, downtime and defects" icon={<span aria-hidden>🔍</span>}>
      {comparisons.length === 0 ? (
        <EmptyState message="No supplier quotes to compare yet. Send an RFQ to start." />
      ) : (
        <>
          <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
            Ranked by total cost of ownership — cheapest raw price may not win.
          </div>
          <ul className="space-y-2">
            {comparisons.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand-accent">{c.rank}</span>
                    <span className="text-sm font-medium text-slate-700">{c.name}</span>
                  </div>
                  <Pill tone={c.rank === 1 ? 'good' : 'neutral'}>
                    {c.rank === 1 ? 'Best TCO' : `#${c.rank}`}
                  </Pill>
                </div>
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>price {fmtCents(c.result.priceCents)} · freight {fmtCents(c.result.freightCents)}</span>
                  <span>TCO {fmtCents(c.result.totalCostCents)}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </EcoCard>
  );
}
