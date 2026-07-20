import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAssuranceStore } from '@/stores/assuranceStore';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { useProcurementStore } from '@/stores/procurementStore';
import { useHandoverStore } from '@/stores/handoverStore';
import { useProjectControlsStore } from '@/stores/projectControlsStore';
import { useChangeStore } from '@/stores/changeStore';
import {
  computeProjectReadiness, computeMilestoneLifecycleSummary,
  computeProcurementLifecycleSummary, computeHandoverLifecycleSummary,
  computeProjectHealthSummary, computeProjectLifecycleSummary,
} from '@/lib/lifecycle/lifecycleSummary';
import { ShieldCheck, Flag, ShoppingCart, FolderOpen, AlertTriangle, ArrowRight } from 'lucide-react';

interface ProjectLifecycleDashboardProps {
  projectId: string;
}

export function ProjectLifecycleDashboard({ projectId }: ProjectLifecycleDashboardProps) {
  const assuranceStore = useAssuranceStore();
  const milestoneStore = useMilestoneStore();
  const procurementStore = useProcurementStore();
  const handoverStore = useHandoverStore();
  const controlsStore = useProjectControlsStore();
  const changeStore = useChangeStore();

  const readiness = useMemo(() => computeProjectReadiness({
    intakes: assuranceStore.intakes,
    feasibilityAssessments: assuranceStore.feasibilityAssessments,
    riskGates: assuranceStore.riskGates,
    riskRegister: assuranceStore.riskRegister,
    solvencyChecks: assuranceStore.solvencyChecks,
  }), [assuranceStore]);

  const milestoneSummary = useMemo(() => computeMilestoneLifecycleSummary(milestoneStore.milestones), [milestoneStore.milestones]);

  const procurementSummary = useMemo(() => computeProcurementLifecycleSummary({
    requests: procurementStore.requests,
    purchaseOrders: procurementStore.purchaseOrders.map(po => ({ status: po.status, totalCents: po.totalCents })),
  }), [procurementStore.requests, procurementStore.purchaseOrders]);

  const handoverSummary = useMemo(() => computeHandoverLifecycleSummary({
    completionStages: handoverStore.completionStages,
    snagLists: handoverStore.snagLists,
    handoverPackages: handoverStore.handoverPackages.map(p => ({ status: p.status })),
    assetRegister: handoverStore.assetRegister,
    warrantyRecords: handoverStore.warrantyRecords.map(w => ({ status: w.status })),
  }), [handoverStore]);

  const health = useMemo(() => computeProjectHealthSummary({
    readiness,
    milestoneSummary,
    controlsSnapshot: controlsStore.snapshots[0] ?? null,
    ncrs: changeStore.ncrs,
    rfis: changeStore.rfis,
    snags: changeStore.snagItems,
  }), [readiness, milestoneSummary, controlsStore.snapshots, changeStore.ncrs, changeStore.rfis, changeStore.snagItems]);

  const lifecycle = useMemo(() => computeProjectLifecycleSummary({
    readiness,
    milestoneSummary,
    procurementSummary,
    handoverSummary,
    health,
    solvencyChecks: assuranceStore.solvencyChecks,
    projectId,
  }), [readiness, milestoneSummary, procurementSummary, handoverSummary, health, assuranceStore.solvencyChecks, projectId]);

  const healthColor = lifecycle.health.health === 'on-track' ? 'text-green-400' :
    lifecycle.health.health === 'critical' ? 'text-red-400' :
    lifecycle.health.health === 'at-risk' ? 'text-amber-400' : 'text-gray-400';

  const healthBg = lifecycle.health.health === 'on-track' ? 'border-green-500/30 bg-green-500/5' :
    lifecycle.health.health === 'critical' ? 'border-red-500/30 bg-red-500/5' :
    lifecycle.health.health === 'at-risk' ? 'border-amber-500/30 bg-amber-500/5' :
    'border-gray-500/20 bg-gray-500/5';

  return (
    <div className="space-y-6">
      {/* Health banner */}
      <div className={`rounded-xl border p-4 ${healthBg}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold capitalize ${healthColor}`}>{lifecycle.health.health}</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {lifecycle.health.milestoneProgressPct}% milestone progress · {lifecycle.health.openIssues} open issue(s)
            </span>
          </div>
          {lifecycle.nextActions.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] text-amber-400">
              {lifecycle.nextActions.filter(a => a.priority === 'high').length} blocker(s)
            </span>
          )}
        </div>

        {/* Four module summary cards */}
        <div className="grid grid-cols-4 gap-3">
          <ModuleSummaryCard
            icon={<ShieldCheck size={14} />}
            label="Assurance"
            value={readiness.overallState}
            color={readiness.overallState === 'cleared' ? 'text-green-400' : readiness.overallState === 'blocked' || readiness.overallState === 'rejected' ? 'text-red-400' : 'text-amber-400'}
            detail={readiness.blockers.length > 0 ? `${readiness.blockers.length} blocker(s)` : 'No blockers'}
            linkTo={`/project/${projectId}/studio/assurance`}
          />
          <ModuleSummaryCard
            icon={<Flag size={14} />}
            label="Milestones"
            value={`${milestoneSummary.released}/${milestoneSummary.total}`}
            color={milestoneSummary.total > 0 ? 'text-cyan-400' : 'text-gray-400'}
            detail={`${milestoneSummary.overallProgressPct}% complete`}
            linkTo={`/project/${projectId}/studio/delivery`}
          />
          <ModuleSummaryCard
            icon={<ShoppingCart size={14} />}
            label="Procurement"
            value={`${procurementSummary.awardedRequests}/${procurementSummary.totalRequests}`}
            color={procurementSummary.openRequests > 0 ? 'text-amber-400' : 'text-green-400'}
            detail={`${procurementSummary.totalPurchaseOrders} PO(s)`}
            linkTo={`/project/${projectId}/studio/procurement`}
          />
          <ModuleSummaryCard
            icon={<FolderOpen size={14} />}
            label="Handover"
            value={handoverSummary.isHandoverReady ? 'Ready' : `${handoverSummary.completionStagesAchieved}/${handoverSummary.completionStagesTotal}`}
            color={handoverSummary.isHandoverReady ? 'text-green-400' : handoverSummary.completionStagesTotal > 0 ? 'text-amber-400' : 'text-gray-400'}
            detail={`${handoverSummary.openSnagItems} open snag(s)`}
            linkTo={`/project/${projectId}/studio/handover`}
          />
        </div>
      </div>

      {/* Dependencies / blocking relationships */}
      {lifecycle.dependencies.filter(d => d.status !== 'clear' && d.status !== 'unknown').length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-400" />
            <h3 className="text-xs font-semibold text-amber-300">Active Dependencies & Blockers</h3>
          </div>
          <div className="space-y-1.5">
            {lifecycle.dependencies.filter(d => d.status !== 'clear' && d.status !== 'unknown').map((dep, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--bg-tertiary)] px-3 py-2">
                <span className={`text-[9px] font-medium ${dep.status === 'blocked' ? 'text-red-400' : 'text-amber-400'}`}>
                  {dep.fromModule} → {dep.toModule}:
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] flex-1">{dep.reason}</span>
                {dep.actionLabel && dep.actionTo && (
                  <Link to={dep.actionTo} className="shrink-0 rounded bg-white/5 px-2 py-0.5 text-[9px] text-cyan-300 transition-colors hover:bg-white/10">
                    {dep.actionLabel}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next actions ordered by priority */}
      {lifecycle.nextActions.length > 0 && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight size={14} className="text-cyan-400" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">Recommended Next Actions</h3>
          </div>
          <div className="space-y-1.5">
            {lifecycle.nextActions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--bg-tertiary)] px-3 py-2">
                <span className={`shrink-0 text-[9px] font-medium ${
                  action.priority === 'high' ? 'text-red-400' : action.priority === 'medium' ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                  {action.priority === 'high' ? '!' : action.priority === 'medium' ? '→' : '·'}
                </span>
                <span className="shrink-0 text-[9px] text-[var(--text-tertiary)] capitalize">{action.module}</span>
                <span className="text-[10px] text-[var(--text-secondary)] flex-1">{action.action}</span>
                {action.actionTo && (
                  <Link to={action.actionTo} className="shrink-0 rounded bg-white/5 px-2 py-0.5 text-[9px] text-cyan-300 transition-colors hover:bg-white/10">
                    Go
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EVM snapshot if available */}
      {health.health !== 'unknown' && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
            <div className="text-[9px] text-[var(--text-muted)] mb-1">Budget Utilization</div>
            <div className={`text-sm font-bold ${health.budgetUtilizationPct > 100 ? 'text-red-400' : 'text-green-400'}`}>
              {health.budgetUtilizationPct.toFixed(0)}%
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
            <div className="text-[9px] text-[var(--text-muted)] mb-1">Schedule Variance</div>
            <div className={`text-sm font-bold ${health.scheduleVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {health.scheduleVariance >= 0 ? '+' : ''}{health.scheduleVariance.toFixed(1)}%
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
            <div className="text-[9px] text-[var(--text-muted)] mb-1">Cost Variance</div>
            <div className={`text-sm font-bold ${health.costVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {health.costVariance >= 0 ? '+' : ''}{health.costVariance.toFixed(1)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModuleSummaryCard({ icon, label, value, color, detail, linkTo }: {
  icon: React.ReactNode; label: string; value: string;
  color: string; detail: string; linkTo: string;
}) {
  return (
    <Link to={linkTo} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 transition-colors hover:bg-[var(--bg-hover)]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <span className="text-[9px] font-medium text-[var(--text-muted)]">{label}</span>
      </div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[8px] text-[var(--text-tertiary)] mt-0.5">{detail}</div>
    </Link>
  );
}
