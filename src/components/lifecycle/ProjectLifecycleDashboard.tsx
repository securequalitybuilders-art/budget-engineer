import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useAssuranceStore } from '@/stores/assuranceStore';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { useProcurementStore } from '@/stores/procurementStore';
import { useHandoverStore } from '@/stores/handoverStore';
import { useProjectControlsStore } from '@/stores/projectControlsStore';
import { useChangeStore } from '@/stores/changeStore';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useWipaaStore } from '@/stores/wipaaStore';
import { useMarketIndexStore } from '@/stores/marketIndexStore';
import { summarizeLedger } from '@/engine/ledger/trueLedger';
import { sortSnapshotsDesc } from '@/engine/payment/wipaaAutoRun';
import { fmtCents } from '@/components/ecosystem/useEcosystemData';
import {
  computeProjectReadiness, computeMilestoneLifecycleSummary,
  computeProcurementLifecycleSummary, computeHandoverLifecycleSummary,
  computeProjectHealthSummary, computeProjectLifecycleSummary,
} from '@/lib/lifecycle/lifecycleSummary';
import { ShieldCheck, Flag, ShoppingCart, FolderOpen, AlertTriangle, ArrowRight, BookOpenCheck, Scale, TrendingUp } from 'lucide-react';

interface ProjectLifecycleDashboardProps {
  projectId: string;
}

export function ProjectLifecycleDashboard({ projectId }: ProjectLifecycleDashboardProps) {
  const intakes = useAssuranceStore((s) => s.intakes);
  const feasibilityAssessments = useAssuranceStore((s) => s.feasibilityAssessments);
  const riskGates = useAssuranceStore((s) => s.riskGates);
  const riskRegister = useAssuranceStore((s) => s.riskRegister);
  const solvencyChecks = useAssuranceStore((s) => s.solvencyChecks);
  const milestones = useMilestoneStore((s) => s.milestones);
  const requests = useProcurementStore((s) => s.requests);
  const purchaseOrdersFull = useProcurementStore(useShallow(s => s.purchaseOrders.map(po => ({ status: po.status, totalCents: po.totalCents }))));
  const completionStages = useHandoverStore((s) => s.completionStages);
  const snagLists = useHandoverStore((s) => s.snagLists);
  const handoverPackagesStatus = useHandoverStore(useShallow(s => s.handoverPackages.map(p => ({ status: p.status }))));
  const assetRegister = useHandoverStore((s) => s.assetRegister);
  const warrantyRecordsStatus = useHandoverStore(useShallow(s => s.warrantyRecords.map(w => ({ status: w.status }))));
  const snapshots = useProjectControlsStore((s) => s.snapshots);
  const ncrs = useChangeStore((s) => s.ncrs);
  const rfis = useChangeStore((s) => s.rfis);
  const snagItems = useChangeStore((s) => s.snagItems);
  const ledgerEntries = useLedgerStore((s) => s.entries);
  const ledgerSummary = useMemo(() => summarizeLedger(ledgerEntries), [ledgerEntries]);
  const wipaaSnapshots = useWipaaStore((s) => s.snapshots);
  const runWipaaAutoRollover = useWipaaStore((s) => s.runAutoRollover);
  const latestWipaa = useMemo(() => sortSnapshotsDesc(wipaaSnapshots)[0], [wipaaSnapshots]);
  const marketIndex = useMarketIndexStore((s) => s.snapshot);
  const runMarketIndexRefresh = useMarketIndexStore((s) => s.autoRefresh);

  useEffect(() => {
    if (!projectId) return;
    runWipaaAutoRollover(projectId).catch(() => {});
    runMarketIndexRefresh().catch(() => {});
  }, [projectId, runWipaaAutoRollover, runMarketIndexRefresh]);

  const readiness = useMemo(() => computeProjectReadiness({
    intakes, feasibilityAssessments, riskGates, riskRegister, solvencyChecks,
  }), [intakes, feasibilityAssessments, riskGates, riskRegister, solvencyChecks]);

  const milestoneSummary = useMemo(() => computeMilestoneLifecycleSummary(milestones), [milestones]);

  const procurementSummary = useMemo(() => computeProcurementLifecycleSummary({
    requests,
    purchaseOrders: purchaseOrdersFull,
  }), [requests, purchaseOrdersFull]);

  const handoverSummary = useMemo(() => computeHandoverLifecycleSummary({
    completionStages,
    snagLists,
    handoverPackages: handoverPackagesStatus,
    assetRegister,
    warrantyRecords: warrantyRecordsStatus,
  }), [completionStages, snagLists, handoverPackagesStatus, assetRegister, warrantyRecordsStatus]);

  const health = useMemo(() => computeProjectHealthSummary({
    readiness,
    milestoneSummary,
    controlsSnapshot: snapshots[0] ?? null,
    ncrs, rfis, snags: snagItems,
  }), [readiness, milestoneSummary, snapshots, ncrs, rfis, snagItems]);

  const lifecycle = useMemo(() => computeProjectLifecycleSummary({
    readiness,
    milestoneSummary,
    procurementSummary,
    handoverSummary,
    health,
    solvencyChecks,
    projectId,
  }), [readiness, milestoneSummary, procurementSummary, handoverSummary, health, solvencyChecks, projectId]);

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

        {/* Seven module summary cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
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
          <ModuleSummaryCard
            icon={<BookOpenCheck size={14} />}
            label="True Ledger"
            value={ledgerSummary.entryCount > 0 ? fmtCents(ledgerSummary.totalCents) : '—'}
            color={ledgerSummary.unallocatedCents > 0 ? 'text-amber-400' : 'text-cyan-400'}
            detail={ledgerSummary.entryCount > 0 ? `${ledgerSummary.entryCount} coded · ${fmtCents(ledgerSummary.unallocatedCents)} uncoded` : 'No entries yet'}
            linkTo={`/project/${projectId}/studio/ledger`}
          />
          <ModuleSummaryCard
            icon={<Scale size={14} />}
            label="WIPAA"
            value={latestWipaa ? latestWipaa.billingStatus : '—'}
            color={latestWipaa?.billingStatus === 'on-track' ? 'text-green-400' : latestWipaa?.billingStatus === 'under-billed' ? 'text-amber-400' : latestWipaa?.billingStatus === 'over-billed' ? 'text-red-400' : 'text-gray-400'}
            detail={latestWipaa
              ? latestWipaa.overUnderBilledCents === 0
                ? `${latestWipaa.costPctComplete.toFixed(0)}% · on track`
                : `${fmtCents(Math.abs(latestWipaa.overUnderBilledCents))} ${latestWipaa.overUnderBilledCents > 0 ? 'under' : 'over'} billed`
              : 'No snapshot yet'}
            linkTo={`/project/${projectId}/studio/wipaa`}
          />
          <ModuleSummaryCard
            icon={<TrendingUp size={14} />}
            label="Market Index"
            value={marketIndex ? String(marketIndex.symbolCount) : '—'}
            color={marketIndex ? 'text-cyan-400' : 'text-gray-400'}
            detail={marketIndex
              ? `${marketIndex.currency} · ${marketIndex.dayKey}`
              : 'Refresh on open'}
            linkTo={`/project/${projectId}/studio/market-index`}
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
