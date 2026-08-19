import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { GitBranch } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { toGanttRows, cashflowCurve } from '@/engine/sitehawk/criticalPath';
import { StageScaffold } from './StageScaffold';
import { DataTable, DzCard, DzPill, Kicker, Money, PageEnter } from '@/components/dzenhare';

export function P1CriticalPathStage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { schedules, isLoading, loadForProject } = useSiteHawkStore(
    useShallow((s) => ({
      schedules: s.schedules,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
    })),
  );

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const projectSchedules = useMemo(
    () => schedules.filter((s) => s.projectId === projectId),
    [schedules, projectId],
  );

  const ganttRows = useMemo(() => toGanttRows(projectSchedules), [projectSchedules]);
  const criticalRows = useMemo(() => ganttRows.filter((r) => r.critical), [ganttRows]);
  const totalDuration = useMemo(
    () => Math.max(0, ...ganttRows.map((r) => r.endDays)),
    [ganttRows],
  );
  const criticalCostCents = useMemo(
    () => criticalRows.reduce((sum, r) => {
      const rec = projectSchedules.find((s) => s.id === r.id);
      return sum + (rec?.costCents ?? 0);
    }, 0),
    [criticalRows, projectSchedules],
  );
  const curve = useMemo(() => cashflowCurve(null, projectSchedules), [projectSchedules]);

  return (
    <StageScaffold
      stageId="p1-critical-path"
      icon={GitBranch}
      empty={!isLoading && projectSchedules.length === 0}
      emptyTitle="No schedule loaded"
      emptyMessage="Import a WBS schedule or generate one from the BOQ — the Critical Path engine runs CPM, identifies float, and builds the Gantt + cashflow S-curve."
    >
      <PageEnter className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <DzCard className="p-4">
            <Kicker>Total tasks</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{ganttRows.length}</p>
            <p className="text-xs text-[var(--text-muted)]">CPM-mapped activities</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Critical path</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--danger)]">{criticalRows.length}</p>
            <p className="text-xs text-[var(--text-muted)]">zero-float tasks on the longest chain</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Duration</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{totalDuration}d</p>
            <p className="text-xs text-[var(--text-muted)]">critical-path length (days)</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Critical cost</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--brand-accent)]">
              <Money cents={criticalCostCents} />
            </p>
            <p className="text-xs text-[var(--text-muted)]">at-risk if delayed</p>
          </DzCard>
        </div>

        <DzCard className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <Kicker>Gantt chart</Kicker>
            <span className="text-[11px] text-[var(--text-muted)]">{totalDuration} day span · {criticalRows.length} critical</span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {ganttRows.map((row) => {
                const leftPct = totalDuration > 0 ? (row.startDays / totalDuration) * 100 : 0;
                const widthPct = totalDuration > 0 ? (row.durationDays / totalDuration) * 100 : 0;
                return (
                  <div key={row.id} className="mb-1.5 flex items-center gap-2" data-testid="gantt-row">
                    <span className="w-36 shrink-0 truncate text-[11px] text-[var(--text-primary)]">{row.task}</span>
                    <div className="relative h-5 flex-1 rounded bg-[var(--bg-tertiary)]/60">
                      <div
                        className={`absolute top-0 h-full rounded ${row.critical ? 'bg-[var(--danger)]/80' : 'bg-[var(--brand-primary)]/60'}`}
                        style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right font-mono text-[10px] text-[var(--text-muted)]">{row.durationDays}d</span>
                  </div>
                );
              })}
              {ganttRows.length === 0 && (
                <p className="py-8 text-center text-xs text-[var(--text-muted)]">No schedule tasks — generate or import a WBS schedule.</p>
              )}
            </div>
          </div>
        </DzCard>

        {curve.length > 0 && (
          <DzCard className="p-4">
            <Kicker>Cashflow S-curve</Kicker>
            <div className="mt-3 flex items-end gap-1" data-testid="cashflow-curve">
              {curve.map((pt, i) => {
                const maxCents = curve[curve.length - 1].cumulativeCents || 1;
                const hPct = (pt.cumulativeCents / maxCents) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-[var(--brand-accent)]/70"
                    style={{ height: `${Math.max(hPct, 2)}%` }}
                    title={`Day ${pt.day}: ${pt.cumulativeCents.toLocaleString()} cents`}
                  />
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
              <span>Day 0</span>
              <span>Day {curve[curve.length - 1]?.day}</span>
            </div>
          </DzCard>
        )}

        <DzCard className="p-4">
          <Kicker>Schedule detail</Kicker>
          <DataTable
            columns={[
              { key: 'task', header: 'Task' },
              { key: 'wbsCode', header: 'WBS', render: (r) => <span className="font-mono text-xs">{r.wbsCode}</span> },
              { key: 'startDays', header: 'Start', align: 'right', render: (r) => `Day ${r.startDays}` },
              { key: 'durationDays', header: 'Duration', align: 'right', render: (r) => `${r.durationDays}d` },
              { key: 'critical', header: 'Critical', render: (r) => r.critical ? <DzPill tone="disputed">Critical</DzPill> : <DzPill tone="neutral">Float</DzPill> },
            ]}
            rows={ganttRows}
            rowKey={(r) => r.id}
            className="mt-2"
          />
        </DzCard>
      </PageEnter>
    </StageScaffold>
  );
}
