import { useMemo } from 'react';
import { EcoCard, EmptyState, Pill } from '@/components/ecosystem/ui';
import { fmtCents } from '@/components/ecosystem/useEcosystemData';
import type { Provider } from '@/domain/marketplace';
import type { DispatchOrder } from '@/domain/dispatch';
import { siteGeofenceAround, suppliersToMatchable } from '@/lib/dispatch/dispatchActions';
import { matchBestSupplier, rankSuppliers } from '@/engine/dispatch/jitDispatchEngine';

export function SupplierMatch({ providers, orders }: {
  providers: Provider[];
  orders: DispatchOrder[];
}) {
  const geofence = useMemo(() => siteGeofenceAround(), []);
  const estimatedValueCents = useMemo(
    () => orders.reduce((s, o) => s + o.totalCents, 0) || 1_000_00,
    [orders],
  );
  const ranked = useMemo(() => {
    const matchables = suppliersToMatchable(providers, estimatedValueCents);
    const order = { siteGeofence: geofence };
    return rankSuppliers(order, matchables);
  }, [providers, geofence, estimatedValueCents]);
  const best = matchBestSupplier({ siteGeofence: geofence }, suppliersToMatchable(providers, estimatedValueCents));

  return (
    <EcoCard
      title="Supplier matching"
      subtitle="Ranked by price, distance, rating and on-time reliability"
      icon={<span aria-hidden>🎯</span>}
    >
      {ranked.length === 0 ? (
        <EmptyState message="No verified suppliers yet. Register suppliers in the Marketplace to enable matching." />
      ) : (
        <>
          {best ? (
            <div className="mb-3 rounded-lg border border-brand/10 bg-brand/5 px-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Best match: {best.name}</span>
                <Pill tone="accent">{best.etaMinutes} min ETA</Pill>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                {best.distanceKm.toFixed(1)} km from site · quote {fmtCents(best.quoteCents)} · score {(best.score * 100).toFixed(0)}/100
              </div>
            </div>
          ) : null}
          <ul className="space-y-1.5">
            {ranked.slice(0, 6).map((s, i) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <span className="text-slate-400">#{i + 1}</span>
                    <span className="truncate">{s.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {s.distanceKm.toFixed(1)} km · {s.etaMinutes} min · reliability {s.reliabilityScore}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-800">{fmtCents(s.quoteCents)}</div>
                  <div className="text-[11px] text-slate-400">score {(s.score * 100).toFixed(0)}</div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </EcoCard>
  );
}
