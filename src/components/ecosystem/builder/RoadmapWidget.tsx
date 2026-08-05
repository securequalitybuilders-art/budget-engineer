import { EcoCard, Stat, Pill, Bar, EmptyState } from '@/components/ecosystem/ui';
import { fmtDate, type EcosystemData } from '@/components/ecosystem/useEcosystemData';

const PHASE_LABELS: Record<string, string> = {
  design: 'Design',
  procurement: 'Procurement',
  construction: 'Construction',
  commissioning: 'Commissioning',
  handover: 'Handover',
};

const PHASE_ORDER = ['design', 'procurement', 'construction', 'commissioning', 'handover'];

export function RoadmapWidget({ milestones }: { milestones: EcosystemData['milestones'] }) {
  const byPhase = PHASE_ORDER.map((phase) => {
    const items = milestones.filter((m) => m.category === phase);
    const done = items.filter((m) => m.releaseState === 'released').length;
    return { phase, label: PHASE_LABELS[phase], total: items.length, done };
  });
  const active = byPhase.find((p) => p.done < p.total) ?? byPhase[byPhase.length - 1];

  return (
    <EcoCard title="Project roadmap" subtitle="Milestone phases and progress">
      {milestones.length === 0 ? (
        <EmptyState message="No milestones scheduled yet. Milestones appear as your plan is scoped." />
      ) : (
        <ol className="space-y-3">
          {byPhase.map((p, i) => {
            const isActive = active?.phase === p.phase;
            return (
              <li key={p.phase} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                    p.done === p.total ? 'bg-emerald-500 text-white' : isActive ? 'bg-brand-accent text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {p.done === p.total ? '✓' : i + 1}
                  </span>
                  {i < byPhase.length - 1 ? <span className="my-1 h-4 w-px bg-slate-200" /> : null}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{p.label}</span>
                    <Pill tone={p.done === p.total ? 'good' : isActive ? 'accent' : 'neutral'}>
                      {p.done}/{p.total}
                    </Pill>
                  </div>
                  <Bar value={p.done} max={Math.max(p.total, 1)} tone={p.done === p.total ? 'good' : 'accent'} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </EcoCard>
  );
}

export function VerificationTimeline({ milestones }: { milestones: EcosystemData['milestones'] }) {
  const upcoming = [...milestones]
    .filter((m) => m.releaseState === 'locked' && m.plannedDate)
    .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))
    .slice(0, 4);
  const released = milestones.filter((m) => m.releaseState === 'released').length;

  return (
    <EcoCard title="Digital-twin verification" subtitle="Proof-of-work on the build timeline">
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="Verified" value={String(released)} tone="good" />
        <Stat label="Awaiting" value={String(milestones.length - released)} />
        <Stat label="Proof artifacts" value={String(milestones.reduce((s, m) => s + m.proofArtifacts.length, 0))} />
      </div>
      {upcoming.length === 0 ? (
        <EmptyState message="No upcoming verification gates." />
      ) : (
        <ul className="space-y-2">
          {upcoming.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <div>
                <div className="text-sm font-medium text-slate-700">{m.name}</div>
                <div className="text-[11px] text-slate-400">{fmtDate(m.plannedDate)} · {m.requiredArtifacts.join(', ') || 'verification'}</div>
              </div>
              <Pill tone="warn">Gated</Pill>
            </li>
          ))}
        </ul>
      )}
    </EcoCard>
  );
}
