import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { GitBranch } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useGreenFlagStore } from '@/stores/greenFlagStore';
import { useProjectStore } from '@/stores/projectStore';
import { toGanttRows, buildRiskRegister } from '@/engine/sitehawk/criticalPath';
import { StageScaffold } from './StageScaffold';
import { CriticalPathGantt } from '@/components/p1/CriticalPathGantt';
import { CashflowChart } from '@/components/p1/CashflowChart';
import { RiskRegisterCard } from '@/components/p1/RiskRegisterCard';
import { DzCard, Kicker, Money, PageEnter } from '@/components/dzenhare';

export function P1CriticalPathStage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { schedules, isLoading, loadForProject } = useSiteHawkStore(
    useShallow((s) => ({
      schedules: s.schedules,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
    })),
  );
  const costBaselines = useGreenFlagStore(
    useShallow((s) => s.costBaselines),
  );

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const projectSchedules = useMemo(
    () => schedules.filter((s) => s.projectId === projectId),
    [schedules, projectId],
  );
  const projectBaseline = useMemo(
    () => costBaselines.find((b) => b.projectId === projectId) ?? null,
    [costBaselines, projectId],
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
  const totalCostCents = useMemo(
    () => projectSchedules.reduce((s, r) => s + r.costCents, 0),
    [projectSchedules],
  );
  const risks = useMemo(
    () => buildRiskRegister(projectId ?? 'local', projectSchedules, projectBaseline),
    [projectId, projectSchedules, projectBaseline],
  );

  return (
    <StageScaffold
      stageId="p1-critical-path"
      icon={GitBranch}
      empty={!isLoading && projectSchedules.length === 0}
      emptyTitle="No schedule loaded"
      emptyMessage="Import a WBS schedule or generate one from the BOQ — the Critical Path engine runs CPM, identifies float, and builds the Gantt + cashflow S-curve."
    >
      <PageEnter className="space-y-4">
        {/* Summary cards */}
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
            <Kicker>Total cost</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--brand-accent)]">
              <Money cents={totalCostCents} />
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              <Money cents={criticalCostCents} className="text-xs" /> at risk on critical path
            </p>
          </DzCard>
        </div>

        {/* Critical Path Gantt with WBS Dictionary + Schedule of Values */}
        <CriticalPathGantt
          projectId={projectId ?? 'local'}
          schedule={projectSchedules}
          baseline={projectBaseline}
        />

        {/* Monthly Cashflow Projection */}
        <CashflowChart baseline={projectBaseline} schedule={projectSchedules} />

        {/* Risk Register with SADC Volatility */}
        <RiskRegisterCard risks={risks} />
      </PageEnter>
    </StageScaffold>
  );
}
