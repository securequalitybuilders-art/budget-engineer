import { useState } from 'react';
import { EcoCard, EmptyState, Pill } from '@/components/ecosystem/ui';
import { fmtCents, fmtDate } from '@/components/ecosystem/useEcosystemData';
import type { DispatchOrder, DispatchState, DisputeType, EscrowHold } from '@/domain/dispatch';
import { DISPATCH_FLOW } from '@/domain/dispatch';
import {
  cancelDispatch,
  disputeHold,
  enterSiteGeofence,
  leaveSupplierYard,
  resolveHold,
  transitionOrder,
  verifyAndRelease,
} from '@/lib/dispatch/dispatchActions';
import { dispatchFlowIndex } from '@/engine/dispatch/jitDispatchEngine';
import { DISPUTE_LABELS } from '@/engine/dispatch/escrowGateway';

const STATE_TONE: Record<DispatchState, 'neutral' | 'good' | 'warn' | 'bad' | 'accent'> = {
  pending: 'neutral',
  accepted: 'accent',
  'en-route': 'accent',
  arrived: 'warn',
  delivered: 'warn',
  verified: 'good',
  completed: 'good',
  cancelled: 'bad',
};

export function DispatchBoard({ orders, holds, onChanged }: {
  orders: DispatchOrder[];
  holds: EscrowHold[];
  onChanged: () => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [disputeFor, setDisputeFor] = useState<string | null>(null);
  const [disputeType, setDisputeType] = useState<DisputeType>('quality');
  const [disputeReason, setDisputeReason] = useState('');
  const [error, setError] = useState('');

  const holdByOrder = new Map(holds.map((h) => [h.orderId, h]));
  const active = [...orders].sort((a, b) => (b.createdAt < a.createdAt ? -1 : 1)).slice(0, 8);

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError('');
    try {
      await action();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const raiseDispute = async (id: string) => {
    setBusyId(id);
    setError('');
    try {
      await disputeHold(id, {
        type: disputeType,
        reason: disputeReason.trim() || DISPUTE_LABELS[disputeType],
        raisedBy: 'bulk-procurement',
      });
      setDisputeFor(null);
      setDisputeReason('');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dispute failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <EcoCard
      title="Dispatch board · live tracking"
      subtitle="Simulated GPS lifecycle from supplier yard to site geofence"
      icon={<span aria-hidden>🛰️</span>}
      className="lg:col-span-2"
    >
      {error ? <p className="mb-2 text-xs font-medium text-rose-600">{error}</p> : null}
      {active.length === 0 ? (
        <EmptyState message="No dispatch orders yet. Dispatch a BOQ above to start the JIT pipeline." />
      ) : (
        <ul className="space-y-2">
          {active.map((o) => {
            const hold = holdByOrder.get(o.id);
            const flowIdx = dispatchFlowIndex(o.state);
            const pct = flowIdx === -1 ? 0 : Math.round((flowIdx / (DISPATCH_FLOW.length - 1)) * 100);
            const isOpen = o.state !== 'completed' && o.state !== 'cancelled';
            return (
              <li key={o.id} className="rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className="truncate">{o.supplierName}</span>
                      <Pill tone={STATE_TONE[o.state]}>{o.state}</Pill>
                      {hold ? (
                        <Pill tone={hold.status === 'released' ? 'good' : hold.status === 'disputed' ? 'bad' : 'neutral'}>
                          escrow {hold.status}
                        </Pill>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {o.projectName ?? 'Project'} · {fmtCents(o.totalCents)} · {o.lines.length} lines
                      {o.routeKm != null ? ` · ${o.routeKm} km` : ''}
                      {o.etaMinutes != null ? ` · ${o.etaMinutes} min ETA` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-brand-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400">{o.id.slice(0, 8)} · {fmtDate(o.createdAt)}</div>
                  </div>
                </div>

                {isOpen ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {o.state === 'pending' ? (
                      <>
                        <button onClick={() => run(o.id, () => transitionOrder(o.id, 'accepted', 'Supplier accepted order'))} disabled={busyId === o.id} className="rounded-lg bg-brand-accent px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50">Accept</button>
                        <button onClick={() => run(o.id, () => cancelDispatch(o.id, 'Order cancelled by buyer'))} disabled={busyId === o.id} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                      </>
                    ) : null}
                    {o.state === 'accepted' ? (
                      <>
                        <button onClick={() => run(o.id, () => leaveSupplierYard(o.id))} disabled={busyId === o.id} className="rounded-lg bg-brand-accent px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50">Simulate: leave yard</button>
                        <button onClick={() => run(o.id, () => cancelDispatch(o.id, 'Order cancelled by buyer'))} disabled={busyId === o.id} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                      </>
                    ) : null}
                    {o.state === 'en-route' ? (
                      <button onClick={() => run(o.id, () => enterSiteGeofence(o.id))} disabled={busyId === o.id} className="rounded-lg bg-brand-accent px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50">Simulate: enter site</button>
                    ) : null}
                    {o.state === 'arrived' ? (
                      <button onClick={() => run(o.id, () => transitionOrder(o.id, 'delivered', 'Delivery offloaded at site'))} disabled={busyId === o.id} className="rounded-lg bg-brand-accent px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50">Mark delivered</button>
                    ) : null}
                    {o.state === 'delivered' ? (
                      <button onClick={() => run(o.id, () => verifyAndRelease(o.id))} disabled={busyId === o.id} className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50">Verify GPS + release escrow</button>
                    ) : null}
                    {hold && hold.status === 'held' && o.state !== 'delivered' ? (
                      <button onClick={() => setDisputeFor(disputeFor === o.id ? null : o.id)} className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50">
                        {disputeFor === o.id ? 'Cancel dispute' : 'Dispute hold'}
                      </button>
                    ) : null}
                    {hold && hold.status === 'disputed' ? (
                      <button onClick={() => run(o.id, () => resolveHold(o.id))} disabled={busyId === o.id} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Resolve dispute</button>
                    ) : null}
                  </div>
                ) : null}

                {disputeFor === o.id && hold && hold.status === 'held' ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 px-2 py-2">
                    <select
                      aria-label="Dispute type"
                      value={disputeType}
                      onChange={(e) => setDisputeType(e.target.value as DisputeType)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700"
                    >
                      {Object.entries(DISPUTE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <input
                      aria-label="Dispute reason"
                      placeholder="Reason"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="min-w-40 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700"
                    />
                    <button onClick={() => raiseDispute(o.id)} disabled={busyId === o.id} className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
                      {busyId === o.id ? 'Raising…' : 'Raise dispute'}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </EcoCard>
  );
}
