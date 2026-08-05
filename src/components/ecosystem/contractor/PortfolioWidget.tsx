import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { type EcosystemData } from '@/components/ecosystem/useEcosystemData';

export function PortfolioWidget({ projects }: { projects: EcosystemData['projects'] }) {
  const active = projects.filter((p) => p.status !== 'draft' && p.status !== 'concept');
  const completed = projects.filter((p) => p.status === 'tender');

  return (
    <EcoCard title="Portfolio" subtitle={`${active.length} in progress · ${completed.length} in tender`}>
      {projects.length === 0 ? (
        <EmptyState message="No projects in your portfolio yet." />
      ) : (
        <ul className="space-y-2">
          {projects.slice(0, 5).map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <div>
                <div className="text-sm font-medium text-slate-700">{p.name}</div>
                <div className="text-[11px] text-slate-400">
                  {p.region} · {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={p.status === 'tender' ? 'good' : p.status !== 'draft' ? 'accent' : 'neutral'}>{p.status}</Pill>
              </div>
            </li>
          ))}
        </ul>
      )}
    </EcoCard>
  );
}
