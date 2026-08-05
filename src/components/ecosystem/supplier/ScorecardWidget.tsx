import { EcoCard, Pill, EmptyState, Bar } from '@/components/ecosystem/ui';
import { fmtCents, type EcosystemData } from '@/components/ecosystem/useEcosystemData';
import { supplierScore } from '@/lib/ecosystem/scorecard';

export function ScorecardWidget({ providers }: { providers: EcosystemData['providers'] }) {
  const suppliers = providers.filter((p) => p.type === 'supplier').slice(0, 5);

  return (
    <EcoCard title="Supplier scorecard" subtitle="On-time, quality and lead-time composite" icon={<span aria-hidden>🏅</span>}>
      {suppliers.length === 0 ? (
        <EmptyState message="No suppliers registered to score." />
      ) : (
        <ul className="space-y-3">
          {suppliers.map((p) => {
            const s = supplierScore(p);
            return (
              <li key={p.id}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <Pill tone={s.score >= 80 ? 'good' : s.score >= 60 ? 'warn' : 'bad'}>{s.score}/100</Pill>
                    {p.rating > 0 ? <span className="text-xs text-slate-400">★ {p.rating.toFixed(1)}</span> : null}
                  </div>
                </div>
                <Bar value={s.score} max={100} tone={s.score >= 80 ? 'good' : s.score >= 60 ? 'warn' : 'bad'} />
                <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                  <span>OTD {s.onTime}</span>
                  <span>Quality {s.quality}</span>
                  <span>Lead {s.lead}</span>
                  <span>{fmtCents(p.totalContractValue ?? 0)} value</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </EcoCard>
  );
}
