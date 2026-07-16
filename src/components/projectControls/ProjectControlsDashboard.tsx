import { useMemo, useState } from 'react';
import { useProjectControlsStore } from '@/stores/projectControlsStore';
import {
  BarChart3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Box,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface ProjectControlsDashboardProps {
  projectId: string;
}

type TabId = 'overview' | 'alerts';

export function ProjectControlsDashboard(_props: ProjectControlsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { baselines, snapshots } = useProjectControlsStore();
  const latestSnapshot = snapshots[0];

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

  return (
    <div className="space-y-6">
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
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
              <Box size={32} className="text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">No project controls data yet. Set a baseline to begin tracking.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  label="Schedule Variance"
                  value={`${metrics.scheduleVariance >= 0 ? '+' : ''}${metrics.scheduleVariance.toFixed(1)}%`}
                  icon={<Clock size={14} />}
                  positive={metrics.scheduleVariance >= 0}
                  negative={metrics.scheduleVariance < -10}
                />
                <MetricCard
                  label="Cost Variance"
                  value={`${metrics.costVariance >= 0 ? '+' : ''}${metrics.costVariance.toFixed(1)}%`}
                  icon={<DollarSign size={14} />}
                  positive={metrics.costVariance >= 0}
                  negative={metrics.costVariance < -10}
                />
                <MetricCard
                  label="SPI"
                  value={metrics.spi.toFixed(2)}
                  icon={<TrendingUp size={14} />}
                  positive={metrics.spi >= 1}
                  negative={metrics.spi < 0.9}
                />
                <MetricCard
                  label="CPI"
                  value={metrics.cpi.toFixed(2)}
                  icon={<TrendingDown size={14} />}
                  positive={metrics.cpi >= 1}
                  negative={metrics.cpi < 0.9}
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
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-3">Milestone Status</h3>
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
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-2">
          {!latestSnapshot || latestSnapshot.alertConditions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
              <CheckCircle2 size={32} className="text-green-400" />
              <p className="text-sm text-[var(--text-muted)]">No active alerts. Everything is on track.</p>
            </div>
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
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  positive,
  negative,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  positive?: boolean;
  negative?: boolean;
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
    </div>
  );
}
