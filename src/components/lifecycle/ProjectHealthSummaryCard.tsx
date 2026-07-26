import { useMemo } from 'react';
import { useAssuranceStore } from '@/stores/assuranceStore';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { useProjectControlsStore } from '@/stores/projectControlsStore';
import { useChangeStore } from '@/stores/changeStore';
import { useAuthStore } from '@/stores/authStore';
import { computeProjectReadiness, computeMilestoneLifecycleSummary, computeProjectHealthSummary } from '@/lib/lifecycle/lifecycleSummary';
import { Heart, Activity, AlertTriangle, CheckCircle2, Eye, ShieldCheck, Flag } from 'lucide-react';

export function ProjectHealthSummaryCard() {
  const assuranceStore = useAssuranceStore();
  const milestoneStore = useMilestoneStore();
  const controlsStore = useProjectControlsStore();
  const changeStore = useChangeStore();
  const userRole = useAuthStore((s) => s.user.role);

  const readiness = useMemo(() => computeProjectReadiness({
    intakes: assuranceStore.intakes,
    feasibilityAssessments: assuranceStore.feasibilityAssessments,
    riskGates: assuranceStore.riskGates,
    riskRegister: assuranceStore.riskRegister,
    solvencyChecks: assuranceStore.solvencyChecks,
  }), [assuranceStore.intakes, assuranceStore.feasibilityAssessments, assuranceStore.riskGates, assuranceStore.riskRegister, assuranceStore.solvencyChecks]);

  const milestoneSummary = useMemo(() => computeMilestoneLifecycleSummary(milestoneStore.milestones), [milestoneStore.milestones]);

  const health = useMemo(() => computeProjectHealthSummary({
    readiness,
    milestoneSummary,
    controlsSnapshot: controlsStore.snapshots[0] ?? null,
    ncrs: changeStore.ncrs,
    rfis: changeStore.rfis,
    snags: changeStore.snagItems,
  }), [readiness, milestoneSummary, controlsStore.snapshots, changeStore.ncrs, changeStore.rfis, changeStore.snagItems]);

  const healthConfig = useMemo(() => {
    switch (health.health) {
      case 'on-track': return { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', icon: CheckCircle2, label: 'On Track' };
      case 'at-risk': return { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: AlertTriangle, label: 'At Risk' };
      case 'critical': return { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: Activity, label: 'Critical' };
      default: return { color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30', icon: Heart, label: 'Unknown' };
    }
  }, [health.health]);

  const HealthIcon = healthConfig.icon;

  return (
    <div className={`rounded-xl border p-4 ${healthConfig.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HealthIcon size={16} className={healthConfig.color} />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Project Health</h3>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${healthConfig.color} ${healthConfig.bg}`}>
          {healthConfig.label}
        </span>
      </div>

      {/* Role badge */}
      {userRole !== 'owner' && (
        <div className="mb-2 flex items-center gap-1 rounded-md bg-[var(--bg-tertiary)] px-2 py-1">
          <Eye size={10} className="text-[var(--text-tertiary)]" />
          <span className="text-[8px] text-[var(--text-tertiary)]">
            {userRole === 'reviewer' ? 'Reviewer' : 'Viewer'} mode
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <MetricRow label="Readiness" value={readiness.overallState} color={readiness.overallState === 'cleared' ? 'text-green-400' : readiness.overallState === 'blocked' || readiness.overallState === 'rejected' ? 'text-red-400' : 'text-amber-400'} />
        <MetricRow label="Milestones" value={`${milestoneSummary.released}/${milestoneSummary.total}`} color="text-[var(--text-primary)]" />
        <MetricRow label="Progress" value={`${health.milestoneProgressPct}%`} color="text-cyan-400" />
        <MetricRow label="Open Issues" value={`${health.openIssues}`} color={health.openIssues > 0 ? 'text-amber-400' : 'text-green-400'} />
        {health.health !== 'unknown' && (
          <>
            <MetricRow label="Budget Util" value={`${health.budgetUtilizationPct.toFixed(0)}%`} color={health.budgetUtilizationPct > 100 ? 'text-red-400' : 'text-green-400'} />
            <MetricRow label="Schedule Var" value={`${health.scheduleVariance >= 0 ? '+' : ''}${health.scheduleVariance.toFixed(1)}%`} color={health.scheduleVariance >= 0 ? 'text-green-400' : 'text-red-400'} />
          </>
        )}
      </div>

      {/* Quick link bar */}
      <div className="mt-3 flex items-center gap-2 text-[8px] text-[var(--text-tertiary)]">
        <ShieldCheck size={10} />
        <span>Assurance</span>
        <span className="mx-0.5">·</span>
        <Flag size={10} />
        <span>{milestoneSummary.released}/{milestoneSummary.total} MS</span>
      </div>
    </div>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-[var(--bg-tertiary)] px-2 py-1">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  );
}
