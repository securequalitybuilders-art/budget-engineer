import { useState } from 'react';
import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents, fmtDate, type EcosystemData } from '@/components/ecosystem/useEcosystemData';
import { saveQuote } from '@/lib/ecosystem/workflowActions';

export function PipelineWidget({ supplierQuotes, procurementRequests, providers, onChanged }: {
  supplierQuotes: EcosystemData['supplierQuotes'];
  procurementRequests: EcosystemData['procurementRequests'];
  providers: EcosystemData['providers'];
  onChanged: () => Promise<void>;
}) {
  const open = supplierQuotes.filter((q) => q.status === 'pending' || q.status === 'received' || q.status === 'evaluated');
  const won = supplierQuotes.filter((q) => q.status === 'awarded');
  const wonValue = won.reduce((s, q) => s + q.totalCents, 0);

  const supplier = providers.find((p) => p.type === 'supplier') ?? providers[0];
  const supplierId = supplier?.id ?? 'self';
  const supplierName = supplier?.name ?? 'My Supply Co.';

  const openRfqs = procurementRequests.filter((r) => r.status === 'quotes-sought' || r.status === 'quotes-received');

  const [quoteRfqId, setQuoteRfqId] = useState<string | null>(null);
  const [total, setTotal] = useState(5000);
  const [shipping, setShipping] = useState(0);
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submitQuote = async () => {
    if (!quoteRfqId) return;
    setBusy(true);
    setError(null);
    try {
      const q = await saveQuote(quoteRfqId, {
        supplierId,
        supplierName,
        totalCents: Math.round(total * 100),
        shippingCents: Math.round(shipping * 100),
        deliveryDays,
        notes: 'Priced from supplier dashboard',
      });
      setDone(q.quoteNumber);
      setQuoteRfqId(null);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit quote');
    } finally {
      setBusy(false);
    }
  };

  return (
    <EcoCard title="Sales pipeline" subtitle={`Quoting as ${supplierName}`} icon={<span aria-hidden>🚀</span>}>
      {supplierQuotes.length === 0 && openRfqs.length === 0 ? (
        <EmptyState message="No RFQs yet — quote one below as soon as the contractor issues it." />
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

          {done ? (
            <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {done} submitted — watch for an award.
            </div>
          ) : null}

          {quoteRfqId ? (
            <div className="mb-3 rounded-lg border border-brand/20 bg-brand/5 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Quote on {procurementRequests.find((r) => r.id === quoteRfqId)?.title ?? 'RFQ'}
                </span>
                <button onClick={() => setQuoteRfqId(null)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-[11px] font-medium text-slate-400">Total (USD)</span>
                  <input
                    aria-label="Quote total"
                    type="number"
                    min={0}
                    value={total}
                    onChange={(e) => setTotal(Number(e.target.value))}
                    className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-slate-400">Shipping</span>
                  <input
                    aria-label="Shipping"
                    type="number"
                    min={0}
                    value={shipping}
                    onChange={(e) => setShipping(Number(e.target.value))}
                    className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-slate-400">Lead (days)</span>
                  <input
                    aria-label="Lead days"
                    type="number"
                    min={0}
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(Number(e.target.value))}
                    className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700"
                  />
                </label>
              </div>
              {error ? <div className="mt-2 text-xs text-rose-600">{error}</div> : null}
              <button
                onClick={submitQuote}
                disabled={busy}
                className="mt-2 rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Submitting…' : 'Submit quote'}
              </button>
            </div>
          ) : null}

          {openRfqs.length > 0 ? (
            <div className="mb-3">
              <div className="mb-1.5 text-[11px] font-medium text-slate-400">OPEN RFQS YOU CAN PRICE</div>
              <ul className="space-y-1.5">
                {openRfqs.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{r.title}</div>
                      <div className="text-[11px] text-slate-400">{r.category} · budget {fmtCents(r.budgetCents)} · by {fmtDate(r.requiredByDate)}</div>
                    </div>
                    <button
                      onClick={() => { setQuoteRfqId(r.id); setDone(null); }}
                      className="rounded-lg border border-brand/30 px-2 py-1 text-[11px] font-medium text-brand-accent hover:bg-brand/5"
                    >
                      Quote →
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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
        </>
      )}
    </EcoCard>
  );
}
