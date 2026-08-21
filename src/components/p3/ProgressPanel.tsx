import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useGreenFlagStore } from '@/stores/greenFlagStore';
import { useProjectStore } from '@/stores/projectStore';
import { DataTable, DzCard, DzPill, Kicker, PageEnter } from '@/components/dzenhare';
import { buildProgressStatus, buildMilestoneHolds } from '@/engine/sitehawk/progressTracker';
import type { MilestoneHold } from '@/engine/sitehawk/progressTracker';

const MILESTONE_SPLIT = [
  { name: 'Substructure (35%)', pct: 35, amountCents: 500000 },
  { name: 'Superstructure (40%)', pct: 40, amountCents: 600000 },
  { name: 'Finishes (25%)', pct: 25, amountCents: 400000 },
];

const HOLD_STATUS_TONE: Record<string, 'verified' | 'disputed' | 'neutral'> = {
  released: 'verified',
  'ready-for-approval': 'neutral',
  held: 'disputed',
  rejected: 'disputed',
};

export function ProgressPanel() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { digitalTwinTimeline, verificationReports, loadForProject } = useSiteHawkStore(
    useShallow((s) => ({
      digitalTwinTimeline: s.digitalTwinTimeline,
      verificationReports: s.verificationReports,
      loadForProject: s.loadForProject,
    })),
  );
  const baseline = useGreenFlagStore((s) => s.costBaselines.find((b: { projectId: string }) => b.projectId === projectId) ?? null);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const projectTimeline = useMemo(
    () => digitalTwinTimeline.filter((t) => t.projectId === projectId),
    [digitalTwinTimeline, projectId],
  );
  const projectReports = useMemo(
    () => verificationReports.filter((r) => r.projectId === projectId),
    [verificationReports, projectId],
  );

  const verified = projectReports.some((r) => r.verdict === 'pass');
  const latestPhoto = projectTimeline.length > 0 ? projectTimeline[projectTimeline.length - 1].capturedAt : null;

  const budgetCents = baseline?.totalCents ?? 1500000;
  const spentCents = Math.round(budgetCents * 0.45);

  const status = buildProgressStatus({
    wbsLines: [{ wbsCode: '01', name: 'Total', budgetCents, spentCents }],
    contractValueCents: budgetCents,
    billedToDateCents: Math.round(budgetCents * 0.35),
    incurredCents: spentCents,
    revenueEarnedCents: Math.round(budgetCents * 0.35),
    overUnderBilledCents: Math.round(budgetCents * -0.1),
    wipaaStatus: 'under-billed',
    milestoneName: MILESTONE_SPLIT[0].name,
    milestoneStatus: verified ? 'verified' : 'pending',
  });

  const holds = buildMilestoneHolds(
    MILESTONE_SPLIT.map((m) => ({
      name: m.name,
      amountCents: m.amountCents,
      verified,
      released: false,
    })),
    latestPhoto,
    null,
  );

  const totalHoldCents = holds.reduce((s, h) => s + h.holdAmountCents, 0);

  return (
      <PageEnter className="space-y-4">
        {/* KPI row */}
        <div className="grid gap-4 lg:grid-cols-4">
          <DzCard className="p-4">
            <Kicker>Completion</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{status.completionPct}%</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
              <div className="h-full rounded-full bg-[var(--brand-accent)]" style={{ width: `${Math.min(100, status.completionPct)}%` }} />
            </div>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Gross Margin</Kicker>
            <div className="mt-1 flex items-center gap-1">
              {status.grossMarginPct >= 0
                ? <TrendingUp className="h-4 w-4 text-[var(--success)]" />
                : <TrendingDown className="h-4 w-4 text-[var(--danger)]" />
              }
              <span className={`font-display text-2xl font-bold ${status.grossMarginPct >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {status.grossMarginPct}%
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">contract vs incurred</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Variance</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${status.varianceCents >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              ${(status.varianceCents / 100).toFixed(0)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">budget remaining</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Escrow Holds</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">${(totalHoldCents / 100).toFixed(0)}</p>
            <p className="text-xs text-[var(--text-muted)]">{holds.filter((h) => h.status === 'released').length}/{holds.length} released</p>
          </DzCard>
        </div>

        {/* Milestone holds table */}
        <DzCard className="p-4">
          <Kicker>Escrow Milestone Holds</Kicker>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Payment milestones gated on photo verification + inspection checklist sign-off</p>
          <DataTable
            columns={[
              { key: 'name', header: 'Milestone' },
              { key: 'holdAmountCents', header: 'Hold', align: 'right', render: (r: MilestoneHold) => `$${(r.holdAmountCents / 100).toFixed(0)}` },
              { key: 'status', header: 'Status', render: (r: MilestoneHold) => <DzPill tone={HOLD_STATUS_TONE[r.status]}>{r.status}</DzPill> },
              { key: 'latestPhotoDate', header: 'Latest Photo', render: (r: MilestoneHold) => r.latestPhotoDate ? new Date(r.latestPhotoDate).toLocaleDateString() : '-' },
              { key: 'nextDelivery', header: 'Next Delivery', render: (r: MilestoneHold) => r.nextDelivery ?? '-' },
            ]}
            rows={holds}
            rowKey={(r) => r.name}
            className="mt-3"
          />
        </DzCard>

        {/* WIPAA status */}
        <DzCard className="p-4">
          <Kicker>WIPAA Status</Kicker>
          <div className="mt-2 flex items-center gap-3">
            <DzPill tone={status.wipaaStatus === 'on-track' ? 'verified' : status.wipaaStatus === 'under-billed' ? 'neutral' : 'disputed'}>
              {status.wipaaStatus ?? 'No data'}
            </DzPill>
            <span className="text-xs text-[var(--text-muted)]">
              ${((status.spentToDateCents) / 100).toFixed(0)} spent of ${(status.budgetCents / 100).toFixed(0)} budget
            </span>
          </div>
        </DzCard>
      </PageEnter>
  );
}
