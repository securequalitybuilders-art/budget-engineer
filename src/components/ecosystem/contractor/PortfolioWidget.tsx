import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { type EcosystemData } from '@/components/ecosystem/useEcosystemData';
import { projectStage, lifecycleStats, type ProjectStage } from '@/engine/ecosystem/workflow';

const STAGE_TONE: Record<ProjectStage, 'neutral' | 'accent' | 'good'> = {
  bidding: 'accent',
  active: 'neutral',
  closed: 'good',
};

export function PortfolioWidget({ projects, escrows, onStartProcurement }: {
  projects: EcosystemData['projects'];
  escrows: EcosystemData['escrows'];
  onStartProcurement: (projectId: string) => void;
}) {
  const stats = lifecycleStats(projects, escrows);

  return (
    <EcoCard
      title="Portfolio · lifecycle"
      subtitle={`${stats.bidding} bidding · ${stats.active} active · ${stats.closed} closed`}
    >
      {projects.length === 0 ? (
        <EmptyState message="No projects in your portfolio yet." />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-amber-50 px-3 py-2">
              <div className="text-[11px] text-slate-400">Bidding</div>
              <div className="text-lg font-bold text-amber-600">{stats.bidding}</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-[11px] text-slate-400">Active</div>
              <div className="text-lg font-bold text-slate-700">{stats.active}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2">
              <div className="text-[11px] text-slate-400">Closed</div>
              <div className="text-lg font-bold text-emerald-600">{stats.closed}</div>
            </div>
          </div>
          <ul className="space-y-2">
            {projects.slice(0, 5).map((p) => {
              const stage = projectStage(p, escrows);
              return (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{p.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {p.region} · {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone={STAGE_TONE[stage]}>{stage}</Pill>
                    {stage === 'bidding' ? (
                      <button
                        onClick={() => onStartProcurement(p.id)}
                        className="rounded-lg border border-brand/30 px-2 py-1 text-[11px] font-medium text-brand-accent hover:bg-brand/5"
                      >
                        Procure →
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </EcoCard>
  );
}
