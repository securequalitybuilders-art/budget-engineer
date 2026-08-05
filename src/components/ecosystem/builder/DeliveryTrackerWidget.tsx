import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtDate, type EcosystemData } from '@/components/ecosystem/useEcosystemData';

export function DeliveryTrackerWidget({ deliveryRecords, purchaseOrders }: {
  deliveryRecords: EcosystemData['deliveryRecords'];
  purchaseOrders: EcosystemData['purchaseOrders'];
}) {
  const poById = new Map(purchaseOrders.map((p) => [p.id, p]));
  const active = [...deliveryRecords]
    .filter((d) => d.status === 'in-transit' || d.status === 'delayed' || d.status === 'partially-delivered')
    .slice(0, 5);

  return (
    <EcoCard title="Delivery tracker" subtitle="Materials on the move">
      {active.length === 0 ? (
        <EmptyState message="No active deliveries. New orders will appear here." />
      ) : (
        <ul className="space-y-2">
          {active.map((d) => {
            const po = poById.get(d.purchaseOrderId);
            const tone = d.status === 'delayed' ? 'bad' : d.status === 'in-transit' ? 'accent' : 'warn';
            return (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-slate-700">{po?.title ?? po?.poNumber ?? d.deliveryNote ?? 'Delivery'}</div>
                  <div className="text-[11px] text-slate-400">
                    Note {d.deliveryNote || d.id.slice(0, 8)} · due {fmtDate(d.deliveryDate)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={tone}>{d.status.replace('-', ' ')}</Pill>
                  {d.items.some((i) => i.quantityRejected > 0) ? <Pill tone="bad">Rejects</Pill> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </EcoCard>
  );
}
