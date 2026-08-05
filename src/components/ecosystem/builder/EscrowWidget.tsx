import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { type EcosystemData } from '@/components/ecosystem/useEcosystemData';

export function EscrowWidget({ escrows, milestones }: {
  escrows: EcosystemData['escrows'];
  milestones: EcosystemData['milestones'];
}) {
  const released = escrows.reduce((s, e) => s + e.milestones.filter((m) => m.status === 'released').length, 0);
  const pending = escrows.reduce((s, e) => s + e.milestones.filter((m) => m.status === 'verified').length, 0);
  const disputed = escrows.reduce((s, e) => s + e.milestones.filter((m) => m.status === 'disputed').length, 0);

  return (
    <EcoCard title="Milestone escrow" subtitle="Funds held against verified progress">
      {escrows.length === 0 ? (
        <EmptyState message="No escrow agreements yet. These are created when a build contract starts." />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-emerald-50 px-3 py-2">
              <div className="text-xs text-slate-400">Released</div>
              <div className="text-lg font-bold text-emerald-600">{released}</div>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2">
              <div className="text-xs text-slate-400">Verified</div>
              <div className="text-lg font-bold text-amber-600">{pending}</div>
            </div>
            <div className="rounded-lg bg-rose-50 px-3 py-2">
              <div className="text-xs text-slate-400">Disputed</div>
              <div className="text-lg font-bold text-rose-600">{disputed}</div>
            </div>
          </div>
          <ul className="space-y-2">
            {escrows.slice(0, 4).map((e) => {
              const ms = e.milestones;
              const pct = ms.length > 0 ? ms.filter((m) => m.status === 'released').length / ms.length : 0;
              return (
                <li key={e.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Contract {e.contractReference ?? e.id.slice(0, 8)}</span>
                    <Pill tone={e.status === 'released' ? 'good' : e.status === 'disputed' ? 'bad' : 'accent'}>{e.status}</Pill>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct * 100}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">{Math.round(pct * 100)}% of milestone funds released</div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 text-xs text-slate-400">
            {milestones.filter((m) => m.releaseState === 'pending-review').length} milestone(s) awaiting verification release.
          </div>
        </>
      )}
    </EcoCard>
  );
}
