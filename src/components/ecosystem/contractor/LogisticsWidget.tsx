import { EcoCard, Pill, EmptyState, Stat } from '@/components/ecosystem/ui';
import { fmtDate, type EcosystemData } from '@/components/ecosystem/useEcosystemData';

export function LogisticsWidget({ deliveryRecords, purchaseOrders }: {
  deliveryRecords: EcosystemData['deliveryRecords'];
  purchaseOrders: EcosystemData['purchaseOrders'];
}) {
  const poById = new Map(purchaseOrders.map((p) => [p.id, p]));
  const delayed = deliveryRecords.filter((d) => d.status === 'delayed');
  const onTheWay = deliveryRecords.filter((d) => d.status === 'in-transit');
  const delivered = deliveryRecords.filter((d) => d.status === 'delivered');

  return (
    <EcoCard title="Logistics" subtitle="Fleet and delivery coordination">
      {deliveryRecords.length === 0 ? (
        <EmptyState message="No deliveries logged yet." />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Stat label="In transit" value={String(onTheWay.length)} tone="accent" />
            <Stat label="Delayed" value={String(delayed.length)} tone={delayed.length > 0 ? 'bad' : 'good'} />
            <Stat label="Delivered" value={String(delivered.length)} tone="good" />
          </div>
          <ul className="space-y-2">
            {deliveryRecords.slice(0, 4).map((d) => {
              const po = poById.get(d.purchaseOrderId);
              const tone = d.status === 'delayed' ? 'bad' : d.status === 'in-transit' ? 'accent' : 'good';
              return (
                <li key={d.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{po?.title ?? d.deliveryNote}</div>
                    <div className="text-[11px] text-slate-400">{fmtDate(d.deliveryDate)} · note {d.deliveryNote || d.id.slice(0, 8)}</div>
                  </div>
                  <Pill tone={tone}>{d.status.replace('-', ' ')}</Pill>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </EcoCard>
  );
}
