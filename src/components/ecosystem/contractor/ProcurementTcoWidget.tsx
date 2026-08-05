import { useState } from 'react';
import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents, type EcosystemData } from '@/components/ecosystem/useEcosystemData';
import { compareSuppliers } from '@/engine/ecosystem/tco';
import { saveAward } from '@/lib/ecosystem/workflowActions';

export function ProcurementTcoWidget({ supplierQuotes, procurementRequests, onAwarded }: {
  supplierQuotes: EcosystemData['supplierQuotes'];
  procurementRequests: EcosystemData['procurementRequests'];
  onAwarded: () => Promise<void>;
}) {
  const reqById = new Map(procurementRequests.map((r) => [r.id, r]));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [awarded, setAwarded] = useState<Set<string>>(new Set(supplierQuotes.filter((q) => q.status === 'awarded').map((q) => q.id)));

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

  const award = async (quoteId: string, rfqId: string) => {
    setBusyId(quoteId);
    try {
      await saveAward({ rfqId, quoteId });
      setAwarded((prev) => new Set(prev).add(quoteId));
      await onAwarded();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <EcoCard title="Procurement · TCO view" subtitle="True cost including freight, downtime and defects" icon={<span aria-hidden>🔍</span>}>
      {comparisons.length === 0 ? (
        <EmptyState message="No supplier quotes to compare yet. Send an RFQ to start." />
      ) : (
        <>
          <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
            Ranked by total cost of ownership — award the winning quote and escrow funds release on delivery.
          </div>
          <ul className="space-y-2">
            {comparisons.map((c) => {
              const quote = supplierQuotes.find((q) => q.id === c.id);
              const isWon = awarded.has(c.id);
              return (
                <li key={c.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand-accent">{c.rank}</span>
                      <span className="text-sm font-medium text-slate-700">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Pill tone={c.rank === 1 ? 'good' : 'neutral'}>
                        {c.rank === 1 ? 'Best TCO' : `#${c.rank}`}
                      </Pill>
                      {quote ? (
                        isWon ? (
                          <Pill tone="good">Awarded</Pill>
                        ) : (
                          <button
                            onClick={() => award(quote.id, quote.procurementRequestId)}
                            disabled={busyId === quote.id}
                            className="rounded-lg bg-brand-accent px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {busyId === quote.id ? 'Awarding…' : 'Award'}
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>price {fmtCents(c.result.priceCents)} · freight {fmtCents(c.result.freightCents)}</span>
                    <span>TCO {fmtCents(c.result.totalCostCents)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </EcoCard>
  );
}
