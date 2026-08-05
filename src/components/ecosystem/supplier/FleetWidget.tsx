import { useState } from 'react';
import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents, fmtDate, type EcosystemData } from '@/components/ecosystem/useEcosystemData';
import { saveDelivery, saveRejectedDelivery } from '@/lib/ecosystem/workflowActions';

export function FleetWidget({ deliveryRecords, purchaseOrders, onChanged }: {
  deliveryRecords: EcosystemData['deliveryRecords'];
  purchaseOrders: EcosystemData['purchaseOrders'];
  onChanged: () => Promise<void>;
}) {
  const poById = new Map(purchaseOrders.map((p) => [p.id, p]));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [disputeFor, setDisputeFor] = useState<string | null>(null);
  const [rejectQty, setRejectQty] = useState(1);
  const [rejectReason, setRejectReason] = useState('');

  const inFlight = purchaseOrders.filter(
    (p) => p.status === 'issued' || p.status === 'acknowledged' || p.status === 'in-transit'
  );
  const mapRows = deliveryRecords.slice(0, 6);

  const confirm = async (poId: string) => {
    setBusyId(poId);
    try {
      await saveDelivery(poId);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

  const dispute = async (poId: string) => {
    setBusyId(poId);
    try {
      await saveRejectedDelivery({ purchaseOrderId: poId, quantityRejected: rejectQty, reason: rejectReason.trim() || 'Rejected on inspection' });
      setDisputeFor(null);
      setRejectReason('');
      setRejectQty(1);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <EcoCard title="Delivery fleet · geofence" subtitle="Confirm drops to release escrow" icon={<span aria-hidden>🚚</span>}>
      {inFlight.length > 0 ? (
        <div className="mb-3">
          <div className="mb-1.5 text-[11px] font-medium text-slate-400">AWAITING CONFIRMATION</div>
          <ul className="space-y-1.5">
            {inFlight.slice(0, 4).map((po) => (
              <li key={po.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-slate-700">{po.title}</div>
                  <div className="text-[11px] text-slate-400">{fmtCents(po.totalCents)} · {po.poNumber} · due {fmtDate(po.deliveryDate)}</div>
                </div>
                <button
                  onClick={() => confirm(po.id)}
                  disabled={busyId === po.id}
                  className="rounded-lg bg-brand-accent px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busyId === po.id ? 'Confirming…' : 'Confirm drop'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {mapRows.length === 0 ? (
        <EmptyState message={inFlight.length > 0 ? 'Confirm a drop above to release its escrow.' : 'No fleet movements logged yet.'} />
      ) : (
        <>
          <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="mb-1 text-[11px] font-medium text-slate-400">SITE DELIVERY MAP</div>
            <svg viewBox="0 0 300 90" className="w-full" role="img" aria-label="Delivery drop-off map">
              <rect x="10" y="15" width="280" height="60" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
              <path d="M40 75 L150 20 L260 75 Z" fill="none" stroke="#cbd5e1" strokeDasharray="4 3" />
              {mapRows.slice(0, 4).map((d, i) => {
                const x = 50 + i * 65;
                const tone = d.status === 'delayed' ? '#e11d48' : d.status === 'in-transit' ? '#d4a574' : '#10b981';
                return (
                  <g key={d.id}>
                    <circle cx={x} cy={30 + (i % 2) * 22} r="6" fill={tone} />
                    <circle cx={x} cy={30 + (i % 2) * 22} r="11" fill={tone} opacity="0.25" />
                    <text x={x - 14} y={58 + (i % 2) * 2} fontSize="8" fill="#94a3b8">{d.deliveryNote || d.id.slice(0, 6)}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <ul className="space-y-1.5">
            {mapRows.map((d) => {
              const po = poById.get(d.purchaseOrderId);
              const isDisputed = d.items.some((i) => i.quantityRejected > 0);
              return (
                <li key={d.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate text-slate-600">{po?.title ?? d.deliveryNote}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{fmtDate(d.deliveryDate)}</span>
                      <Pill tone={isDisputed ? 'bad' : d.status === 'delayed' ? 'bad' : d.status === 'in-transit' ? 'accent' : 'good'}>
                        {isDisputed ? 'disputed' : d.status.replace('-', ' ')}
                      </Pill>
                    </span>
                  </div>
                  {!isDisputed ? (
                    <div className="mt-1 flex justify-end">
                      <button
                        onClick={() => setDisputeFor(disputeFor === d.purchaseOrderId ? null : d.purchaseOrderId)}
                        className="text-[11px] font-medium text-brand-accent hover:underline"
                      >
                        {disputeFor === d.purchaseOrderId ? 'Cancel dispute' : 'Dispute delivery'}
                      </button>
                    </div>
                  ) : null}
                  {disputeFor === d.purchaseOrderId && !isDisputed ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 px-2 py-2">
                      <input
                        aria-label="Rejected quantity"
                        type="number"
                        min={1}
                        max={d.items[0]?.quantityDelivered ?? 1}
                        value={rejectQty}
                        onChange={(e) => setRejectQty(Number(e.target.value))}
                        className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700"
                      />
                      <input
                        aria-label="Rejection reason"
                        placeholder="Reason (e.g. cracked sheets)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="min-w-40 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700"
                      />
                      <button
                        onClick={() => dispute(d.purchaseOrderId)}
                        disabled={busyId === d.purchaseOrderId}
                        className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {busyId === d.purchaseOrderId ? 'Raising…' : 'Raise dispute'}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </EcoCard>
  );
}
