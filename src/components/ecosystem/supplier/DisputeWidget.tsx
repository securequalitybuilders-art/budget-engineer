import { useState } from 'react';
import { EcoCard, Pill, EmptyState, Stat } from '@/components/ecosystem/ui';
import { fmtCents, fmtDate } from '@/components/ecosystem/useEcosystemData';
import { generateCreditNote, settleCreditNote, creditNoteTotals } from '@/engine/ecosystem/creditNote';
import { useFlashDealStore } from '@/stores/flashDealStore';

interface DisputeState {
  notes: ReturnType<typeof generateCreditNote>[];
}

export function DisputeWidget() {
  const [state, setState] = useState<DisputeState>({ notes: [] });
  const deals = useFlashDealStore((s) => s.deals);

  const [amount, setAmount] = useState('5000');
  const [reason, setReason] = useState('');

  const totals = creditNoteTotals(state.notes);

  return (
    <EcoCard title="Disputes · credit notes" subtitle="90/10 split — immediate credit, balance on settlement" icon={<span aria-hidden>🧾</span>}>
      <form className="mb-3 space-y-2" onSubmit={(e) => {
        e.preventDefault();
        if (!reason.trim() || Number(amount) <= 0) return;
        const note = generateCreditNote({ rejectedAmountCents: Number(amount) * 100, reason: reason.trim() });
        setState((s) => ({ notes: [...s.notes, note] }));
        setReason('');
      }}>
        <div className="flex gap-2">
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. rejected delivery)"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
          <button type="submit" className="rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
            Issue credit
          </button>
        </div>
      </form>
      {state.notes.length === 0 ? (
        <EmptyState message="No credit notes issued yet." />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Stat label="Issued" value={String(totals.count)} />
            <Stat label="Credited now" value={fmtCents(totals.immediateCents)} tone="good" />
            <Stat label="Held on settlement" value={fmtCents(totals.heldCents)} tone="warn" />
          </div>
          <ul className="space-y-2">
            {state.notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{n.reason}</span>
                  <div className="flex items-center gap-2">
                    <Pill tone={n.status === 'settled' ? 'good' : 'accent'}>{n.status}</Pill>
                    {n.status === 'issued' ? (
                      <button onClick={() => setState((s) => ({ notes: s.notes.map((x) => (x.id === n.id ? settleCreditNote(x) : x)) }))}
                        className="text-xs text-slate-400 hover:text-emerald-600">Settle</button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  {fmtCents(n.amountCents)} · {fmtCents(n.immediateCents)} now · {fmtCents(n.heldCents)} held · {fmtDate(n.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
        {deals.length} live flash deal(s) — credit notes can be offset against future purchases.
      </div>
    </EcoCard>
  );
}
