import { useMemo } from 'react';
import { EcoCard, EmptyState, Pill } from '@/components/ecosystem/ui';
import { fmtCents, fmtDate } from '@/components/ecosystem/useEcosystemData';
import type { EscrowHold } from '@/domain/dispatch';
import { escrowSummary, DISPUTE_LABELS } from '@/engine/dispatch/escrowGateway';

export function EscrowGatewayWidget({ holds }: { holds: EscrowHold[] }) {
  const summary = useMemo(() => escrowSummary(holds), [holds]);
  const recent = [...holds].sort((a, b) => (b.heldAt < a.heldAt ? -1 : 1)).slice(0, 6);

  return (
    <EcoCard
      title="Escrow gateway"
      subtitle="Funds held per dispatch until GPS verification + engineer sign-off"
      icon={<span aria-hidden>🔒</span>}
    >
      {holds.length === 0 ? (
        <EmptyState message="No escrow holds yet. Payment is secured the moment an order is dispatched." />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-[11px] text-slate-400">Held in trust</div>
              <div className="text-lg font-bold text-slate-800">{fmtCents(summary.totalHeldCents)}</div>
              <div className="text-[10px] text-slate-400">{summary.heldCount} holds</div>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2">
              <div className="text-[11px] text-emerald-600">Released</div>
              <div className="text-lg font-bold text-emerald-700">{fmtCents(summary.totalReleasedCents)}</div>
              <div className="text-[10px] text-emerald-600/70">{summary.releasedCount} releases</div>
            </div>
          </div>
          <ul className="space-y-1.5">
            {recent.map((h) => (
              <li key={h.id} className="rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{fmtCents(h.amountCents)}</span>
                  <span className="flex items-center gap-1.5">
                    {h.dispute ? (
                      <Pill tone="bad">{DISPUTE_LABELS[h.dispute.type]}</Pill>
                    ) : (
                      <Pill tone={h.status === 'released' ? 'good' : h.status === 'refunded' ? 'warn' : 'neutral'}>{h.status}</Pill>
                    )}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{fmtDate(h.heldAt)}</span>
                  <span>GPS {h.gpsVerified ? '✓' : '✗'}</span>
                  <span>sign-off {h.engineerSignoff ? '✓' : '✗'}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </EcoCard>
  );
}
