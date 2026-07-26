import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectControlsStore } from '@/stores/projectControlsStore';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { computeMilestoneLifecycleSummary } from '@/lib/lifecycle/lifecycleSummary';
import { EmptyState } from '@/components/lifecycle/EmptyState';
import { NextStepHint } from '@/components/lifecycle/NextStepHint';
import { CrossStudioLinks, buildStudioLink } from '@/components/lifecycle/CrossStudioLinks';
import {
  BarChart3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Flag,
  ArrowRight,
} from 'lucide-react';

interface ProjectControlsDashboardProps {
  projectId: string;
}

type TabId = 'overview' | 'alerts';

export function ProjectControlsDashboard({ projectId }: ProjectControlsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { baselines, snapshots } = useProjectControlsStore();
  const milestones = useMilestoneStore((s) => s.milestones);
  const latestSnapshot = snapshots[0];
  const hasData = baselines.length > 0 || snapshots.length > 0;

  const milestoneSummary = useMemo(() => computeMilestoneLifecycleSummary(milestones), [milestones]);

  const metrics = useMemo(() => {
    if (!latestSnapshot || !baselines[0]) return null;
    return {
      scheduleVariance: latestSnapshot.scheduleVariance,
      costVariance: latestSnapshot.costVariance,
      spi: latestSnapshot.schedulePerformanceIndex,
      cpi: latestSnapshot.costPerformanceIndex,
      budgetUtilization: latestSnapshot.budgetUtilizationPct,
      plannedProgress: latestSnapshot.plannedProgressPct,
      actualProgress: latestSnapshot.actualProgressPct,
      plannedCost: latestSnapshot.plannedCostCents,
      actualCost: latestSnapshot.actualCostCents,
      elapsedDays: latestSnapshot.elapsedDays,
      plannedDuration: latestSnapshot.plannedDurationDays,
    };
  }, [latestSnapshot, baselines]);

  const crossLinks = useMemo(() => {
    const links = [
      buildStudioLink(projectId, 'assurance', 'Assurance', 'See assurance gate impact'),
      buildStudioLink(projectId, 'procurement', 'Procurement', 'View procurement cost data'),
      buildStudioLink(projectId, 'delivery', 'Delivery', 'View milestone-linked delivery'),
    ];
    return links;
  }, [projectId]);

  const nextAction = useMemo(() => {
    if (!hasData) {
      return { hint: 'Set a project baseline to begin tracking Earned Value Management (EVM) metrics.', severity: 'info' as const };
    }
    if (latestSnapshot?.alertConditions.some((a) => a.severity === 'critical')) {
      return { hint: `${latestSnapshot.alertConditions.filter((a) => a.severity === 'critical').length} critical alert(s) — review in the Alerts tab.`, severity: 'warning' as const };
    }
    return null;
  }, [hasData, latestSnapshot]);

  return (
    <div className="space-y-6">
      {/* Next action hint */}
      {nextAction && <NextStepHint hint={nextAction.hint} severity={nextAction.severity} />}

      <div className="flex gap-0 border-b border-stone-700/60 bg-stone-900/30 rounded-t-xl overflow-hidden">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
            activeTab === 'overview'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-stone-400 hover:text-stone-300 hover:border-stone-500'
          }`}
        >
          <BarChart3 size={14} />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
            activeTab === 'alerts'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-stone-400 hover:text-stone-300 hover:border-stone-500'
          }`}
        >
          <AlertTriangle size={14} />
          Alerts ({latestSnapshot?.alertConditions.length ?? 0})
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {!metrics ? (
            <EmptyState
              icon={<BarChart3 size={28} />}
              title="No project controls data yet"
              description="Set a project baseline in the delivery stage to begin tracking earned value, schedule, and cost performance."
              actionLabel="Go to Delivery"
              actionTo={`/project/${projectId}/studio/delivery`}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  label="Schedule Variance"
                  value={`${metrics.scheduleVariance >= 0 ? '+' : ''}${metrics.scheduleVariance.toFixed(1)}%`}
                  icon={<Clock size={14} />}
                  positive={metrics.scheduleVariance >= 0}
                  negative={metrics.scheduleVariance < -10}
                  sourceLink={{ to: `/project/${projectId}/studio/delivery`, label: 'Delivery' }}
                />
                <MetricCard
                  label="Cost Variance"
                  value={`${metrics.costVariance >= 0 ? '+' : ''}${metrics.costVariance.toFixed(1)}%`}
                  icon={<DollarSign size={14} />}
                  positive={metrics.costVariance >= 0}
                  negative={metrics.costVariance < -10}
                  sourceLink={{ to: `/project/${projectId}/studio/procurement`, label: 'Procurement' }}
                />
                <MetricCard
                  label="SPI"
                  value={metrics.spi.toFixed(2)}
                  icon={<TrendingUp size={14} />}
                  positive={metrics.spi >= 1}
                  negative={metrics.spi < 0.9}
                  sourceLink={{ to: `/project/${projectId}/studio/delivery`, label: 'Milestones' }}
                />
                <MetricCard
                  label="CPI"
                  value={metrics.cpi.toFixed(2)}
                  icon={<TrendingDown size={14} />}
                  positive={metrics.cpi >= 1}
                  negative={metrics.cpi < 0.9}
                  sourceLink={{ to: `/project/${projectId}/studio/procurement`, label: 'Costs' }}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-3">Progress</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[var(--text-muted)]">Planned</span>
                      <span className="font-medium text-[var(--text-primary)]">{metrics.plannedProgress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(metrics.plannedProgress, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[var(--text-muted)]">Actual</span>
                      <span className="font-medium text-[var(--text-primary)]">{metrics.actualProgress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div className={`h-full rounded-full ${metrics.actualProgress >= metrics.plannedProgress ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(metrics.actualProgress, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-[var(--text-tertiary)]">
                      <span>Source: Delivery milestones & schedule</span>
                      <Link to={`/project/${projectId}/studio/delivery`} className="text-cyan-400 hover:underline">
                        View delivery
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-3">Cost</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[var(--text-muted)]">Planned</span>
                      <span className="font-medium text-[var(--text-primary)]">{(metrics.plannedCost / 100).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[var(--text-muted)]">Actual</span>
                      <span className="font-medium text-[var(--text-primary)]">{(metrics.actualCost / 100).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[var(--text-muted)]">Budget Utilization</span>
                      <span className={`font-medium ${metrics.budgetUtilization > 100 ? 'text-red-400' : 'text-green-400'}`}>
                        {metrics.budgetUtilization.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[var(--text-muted)]">Duration</span>
                      <span className="font-medium text-[var(--text-primary)]">{metrics.elapsedDays}/{metrics.plannedDuration} days</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-[var(--text-tertiary)]">
                      <span>Source: Procurement & budget baseline</span>
                      <Link to={`/project/${projectId}/studio/procurement`} className="text-cyan-400 hover:underline">
                        View procurement
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Milestone Status — prominently displayed */}
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Flag size={14} className="text-cyan-400" />
                    <h3 className="text-xs font-semibold text-[var(--text-primary)]">Milestone Status</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-[var(--text-muted)]">{milestoneSummary.released}/{milestoneSummary.total} released</span>
                    <Link
                      to={`/project/${projectId}/studio/delivery`}
                      className="flex items-center gap-1 text-[9px] text-cyan-400 hover:underline"
                    >
                      Full board <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>
                {latestSnapshot!.milestoneStatuses.length > 0 ? (
                  <div className="space-y-1">
                    {latestSnapshot!.milestoneStatuses.map((ms) => (
                      <div key={ms.milestoneId} className="flex items-center justify-between py-1 text-[10px]">
                        <div className="flex items-center gap-2">
                          {ms.status === 'completed' ? <CheckCircle2 size={10} className="text-green-400" /> :
                           ms.status === 'overdue' || ms.status === 'at-risk' ? <XCircle size={10} className="text-red-400" /> :
                           <Clock size={10} className="text-amber-400" />}
                          <span className="text-[var(--text-primary)]">{ms.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-muted)]">{ms.plannedDate}</span>
                          <span className={`rounded px-1.5 py-0.5 font-medium ${
                            ms.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            ms.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                            ms.status === 'at-risk' ? 'bg-amber-500/20 text-amber-400' :
                            ms.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>{ms.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {milestones.length > 0
                      ? 'Milestone statuses not yet computed in snapshot.'
                      : 'No milestones defined. Create milestones in Delivery to track progress.'}
                  </div>
                )}
                {milestoneSummary.criticalDelayed.length > 0 && (
                  <div className="mt-2 rounded-md border border-red-500/20 bg-red-500/5 p-2">
                    <div className="flex items-center gap-1 text-[9px] text-red-400">
                      <AlertTriangle size={10} />
                      {milestoneSummary.criticalDelayed.length} critical milestone(s) delayed
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-2">
          {!latestSnapshot || latestSnapshot.alertConditions.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={28} className="text-green-400" />}
              title="No active alerts"
              description="Everything is on track based on the latest project controls snapshot. Alerts fire when schedule, cost, or milestone thresholds are breached."
            />
          ) : (
            latestSnapshot.alertConditions.map((alert) => (
              <div key={alert.id} className={`rounded-xl border p-4 ${
                alert.severity === 'critical' ? 'border-red-500/40 bg-red-500/5' :
                alert.severity === 'warning' ? 'border-amber-500/40 bg-amber-500/5' :
                'border-blue-500/40 bg-blue-500/5'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className={
                      alert.severity === 'critical' ? 'text-red-400' :
                      alert.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                    } />
                    <span className="text-xs font-medium text-[var(--text-primary)]">{alert.type}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                      alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      alert.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{alert.severity}</span>
                  </div>
                  <span className="text-[9px] text-[var(--text-tertiary)]">{alert.triggeredAt}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{alert.message}</p>
                {/* Drill-down link based on alert category */}
                <div className="mt-1.5">
                  {alert.type === 'schedule' && (
                    <Link to={`/project/${projectId}/studio/delivery`} className="text-[9px] text-cyan-400 hover:underline">
                      View delivery milestones →
                    </Link>
                  )}
                  {(alert.type === 'cost' || alert.type === 'resource') && (
                    <Link to={`/project/${projectId}/studio/procurement`} className="text-[9px] text-cyan-400 hover:underline">
                      View procurement costs →
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-2">Issues Summary</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-[var(--bg-tertiary)] p-2">
                <div className="text-lg font-bold text-red-400">{latestSnapshot?.issueCounts.openNCRs ?? 0}</div>
                <div className="text-[9px] text-[var(--text-muted)]">NCRs</div>
              </div>
              <div className="rounded-md bg-[var(--bg-tertiary)] p-2">
                <div className="text-lg font-bold text-amber-400">{latestSnapshot?.issueCounts.openRFIs ?? 0}</div>
                <div className="text-[9px] text-[var(--text-muted)]">RFIs</div>
              </div>
              <div className="rounded-md bg-[var(--bg-tertiary)] p-2">
                <div className="text-lg font-bold text-blue-400">{latestSnapshot?.issueCounts.openChangeOrders ?? 0}</div>
                <div className="text-[9px] text-[var(--text-muted)]">Changes</div>
              </div>
            </div>
          </div>

          {/* Milestone summary in alerts */}
          {milestoneSummary.total > 0 && (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--text-muted)]">Milestone Progress</span>
                <span className="font-medium text-[var(--text-primary)]">{milestoneSummary.overallProgressPct}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div className="h-full rounded-full bg-cyan-500" style={{ width: `${milestoneSummary.overallProgressPct}%` }} />
              </div>
              <div className="mt-1 flex gap-2 text-[9px] text-[var(--text-tertiary)]">
                <span>{milestoneSummary.released} released</span>
                <span>{milestoneSummary.held} held</span>
                <span>{milestoneSummary.pending} pending</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cross-studio navigation links */}
      <CrossStudioLinks projectId={projectId} links={crossLinks} title="Data sources" />
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  positive,
  negative,
  sourceLink,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  positive?: boolean;
  negative?: boolean;
  sourceLink?: { to: string; label: string };
}) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
      </div>
      <div className={`text-lg font-bold ${
        positive ? 'text-green-400' : negative ? 'text-red-400' : 'text-[var(--text-primary)]'
      }`}>
        {value}
      </div>
      {sourceLink && (
        <Link to={sourceLink.to} className="mt-1 block text-[8px] text-[var(--text-tertiary)] hover:text-cyan-400">
          Source: {sourceLink.label} →
        </Link>
      )}
    </div>
  );
}
