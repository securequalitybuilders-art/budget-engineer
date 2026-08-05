import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtDate, type EcosystemData } from '@/components/ecosystem/useEcosystemData';

export function FleetWidget({ deliveryRecords, purchaseOrders }: {
  deliveryRecords: EcosystemData['deliveryRecords'];
  purchaseOrders: EcosystemData['purchaseOrders'];
}) {
  const poById = new Map(purchaseOrders.map((p) => [p.id, p]));
  const mapRows = deliveryRecords.slice(0, 6);

  return (
    <EcoCard title="Delivery fleet · geofence" subtitle="Track drops by site zone" icon={<span aria-hidden>🚚</span>}>
      {mapRows.length === 0 ? (
        <EmptyState message="No fleet movements logged yet." />
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
              return (
                <li key={d.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-slate-600">{po?.title ?? d.deliveryNote}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{fmtDate(d.deliveryDate)}</span>
                    <Pill tone={d.status === 'delayed' ? 'bad' : d.status === 'in-transit' ? 'accent' : 'good'}>
                      {d.status.replace('-', ' ')}
                    </Pill>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </EcoCard>
  );
}
