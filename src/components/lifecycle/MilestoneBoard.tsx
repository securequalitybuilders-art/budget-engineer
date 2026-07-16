import { useMemo } from 'react';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { computeMilestoneLifecycleSummary } from '@/lib/lifecycle/lifecycleSummary';
import { Flag, CheckCircle2, Clock, XCircle, Lock } from 'lucide-react';

export function MilestoneBoard() {
  const { milestones } = useMilestoneStore();
  const summary = useMemo(() => computeMilestoneLifecycleSummary(milestones), [milestones]);

  if (milestones.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 text-center text-sm text-[var(--text-muted)]">
        <Flag size={24} className="mx-auto mb-2 text-[var(--text-tertiary)]" />
        No milestones defined. Create milestones to begin tracking delivery progress.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        <SummaryCard label="Total" value={summary.total} color="text-[var(--text-primary)]" />
        <SummaryCard label="Released" value={summary.released} color="text-green-400" icon={<CheckCircle2 size={12} />} />
        <SummaryCard label="Held" value={summary.held} color="text-amber-400" icon={<Clock size={12} />} />
        <SummaryCard label="Rejected" value={summary.rejected} color="text-red-400" icon={<XCircle size={12} />} />
        <SummaryCard label="Pending" value={summary.pending} color="text-blue-400" icon={<Lock size={12} />} />
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">Overall Progress</h3>
          <span className="text-xs font-bold text-[var(--text-primary)]">{summary.overallProgressPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-cyan-500 transition-all duration-500"
            style={{ width: `${summary.overallProgressPct}%` }}
          />
        </div>
      </div>

      {Object.keys(summary.byCategory).length > 0 && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-3">By Category</h3>
          <div className="space-y-2">
            {Object.entries(summary.byCategory).map(([category, data]) => (
              <div key={category}>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="capitalize text-[var(--text-secondary)]">{category}</span>
                  <span className="text-[var(--text-muted)]">{data.released}/{data.total} ({data.progressPct}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                  <div className="h-full rounded-full bg-cyan-500/60" style={{ width: `${data.progressPct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.criticalDelayed.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <h3 className="text-xs font-semibold text-red-400 mb-2">Critical Delays</h3>
          {summary.criticalDelayed.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] mb-1">
              <XCircle size={10} className="text-red-400 shrink-0" />
              <span>{m.name}</span>
              <span className="text-red-400">({m.delayDays}d delayed)</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        {milestones.map((m) => {
          const stateColor = m.releaseState === 'released' ? 'border-green-500/30 bg-green-500/5' :
            m.releaseState === 'rejected' ? 'border-red-500/30 bg-red-500/5' :
            m.releaseState === 'held' ? 'border-amber-500/30 bg-amber-500/5' :
            'border-[var(--border-default)] bg-[var(--bg-secondary)]';

          return (
            <div key={m.id} className={`rounded-lg border p-3 ${stateColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate">{m.name}</span>
                  <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)] capitalize">{m.category}</span>
                  {m.isCritical && <span className="text-[9px] text-red-400">Critical</span>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                  m.releaseState === 'released' ? 'bg-green-500/20 text-green-400' :
                  m.releaseState === 'rejected' ? 'bg-red-500/20 text-red-400' :
                  m.releaseState === 'held' ? 'bg-amber-500/20 text-amber-400' :
                  m.releaseState === 'pending-review' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>{m.releaseState}</span>
              </div>
              <div className="mt-1 flex gap-3 text-[9px] text-[var(--text-tertiary)]">
                <span>Planned: {m.plannedDate}</span>
                {m.actualDate && <span>Actual: {m.actualDate}</span>}
                <span>Proof: {m.proofArtifacts.length}</span>
                <span>Reviews: {m.reviewChecks.filter((c) => c.decision).length}/{m.reviewChecks.length}</span>
                <span>Conditions: {m.releaseConditions.filter((c) => c.met).length}/{m.releaseConditions.length}</span>
                {m.delayDays && <span className="text-red-400">{m.delayDays}d delay</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-2 text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        {icon}
        <div className={`text-lg font-bold ${color}`}>{value}</div>
      </div>
      <div className="text-[9px] text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
