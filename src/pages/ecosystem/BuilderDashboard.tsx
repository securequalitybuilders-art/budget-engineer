import { useMemo, useState } from 'react';
import { useEcosystemData, fmtCents, fmtDate } from '@/components/ecosystem/useEcosystemData';
import { Stat } from '@/components/ecosystem/ui';
import { RoadmapWidget, VerificationTimeline } from '@/components/ecosystem/builder/RoadmapWidget';
import { BudgetDial } from '@/components/ecosystem/builder/BudgetDial';
import { FeasibilityWidget } from '@/components/ecosystem/builder/FeasibilityWidget';
import { EscrowWidget } from '@/components/ecosystem/builder/EscrowWidget';
import { FindAProWidget } from '@/components/ecosystem/builder/FindAProWidget';
import { DeliveryTrackerWidget } from '@/components/ecosystem/builder/DeliveryTrackerWidget';
import { RedPenAuditWidget } from '@/components/ecosystem/builder/RedPenAuditWidget';
import { GroupBuyWidget } from '@/components/ecosystem/builder/GroupBuyWidget';
import { MustHavesWidget } from '@/components/ecosystem/builder/MustHavesWidget';
import {
  EscrowVaultCard,
  MilestoneProgressCard,
  MaterialsTransparencyPanel,
  ContingencySpendDownCard,
} from '@/components/dzenhare';
import type { VaultStatus } from '@/components/dzenhare';

export default function BuilderDashboard() {
  const data = useEcosystemData();
  const totalBudget = data.boqs.reduce((s, b) => s + b.totalCents, 0);
  const committed = data.purchaseOrders.reduce((s, p) => s + p.totalCents, 0);
  const inFlight = data.deliveryRecords.filter((d) => d.status === 'in-transit').length;
  const [approvedMilestoneId, setApprovedMilestoneId] = useState<string | null>(null);

  const escrowTotalCents = useMemo(
    () => Math.round(data.escrows.reduce((s, e) => s + e.totalAmount * 100, 0)),
    [data.escrows],
  );
  const vaultHasDispute = useMemo(
    () => data.escrows.some((e) => e.status === 'disputed' || e.milestones.some((m) => m.status === 'disputed')),
    [data.escrows],
  );
  const vaultAllReleased = useMemo(
    () =>
      data.escrows.length > 0 &&
      data.escrows.every((e) => e.status === 'released' || e.milestones.every((m) => m.status === 'released')),
    [data.escrows],
  );
  const vaultStatus: VaultStatus = vaultHasDispute ? 'disputed' : vaultAllReleased ? 'released' : 'pending';

  const milestoneTotal = data.milestones.reduce((s, m) => s + (m.plannedCostCents ?? 0), 0);
  const milestoneDone = data.milestones
    .filter((m) => m.releaseState === 'released')
    .reduce((s, m) => s + (m.plannedCostCents ?? 0), 0);
  const progressPct = milestoneTotal > 0 ? Math.round((milestoneDone / milestoneTotal) * 100) : 0;

  const nextMilestone = useMemo(
    () =>
      [...data.milestones]
        .filter((m) => m.releaseState === 'locked' || m.releaseState === 'pending-review' || m.releaseState === 'held')
        .sort((a, b) => a.order - b.order)[0],
    [data.milestones],
  );
  const nextPhotoCount = nextMilestone
    ? nextMilestone.proofArtifacts.filter((a) => a.type === 'photo').length
    : 0;
  const nextDelivery = useMemo(() => {
    const upcoming = data.deliveryRecords.find((d) => d.status === 'in-transit' || d.status === 'delayed');
    if (upcoming) return fmtDate(upcoming.deliveryDate);
    const poDates = data.purchaseOrders
      .map((p) => p.deliveryDate)
      .filter(Boolean)
      .sort();
    return poDates.length ? fmtDate(poDates[0]) : undefined;
  }, [data.deliveryRecords, data.purchaseOrders]);

  const materialLines = useMemo(
    () =>
      data.purchaseOrders
        .filter((p) => p.status !== 'cancelled')
        .flatMap((p) =>
          p.lineItems.map((li) => ({
            id: `${p.poNumber}-${li.id}`,
            name: li.description,
            supplier: p.poNumber,
            totalCents: li.totalCents,
            qty: li.quantity ? `${li.quantity} ${li.unit}`.trim() : undefined,
          })),
        )
        .slice(0, 5),
    [data.purchaseOrders],
  );
  const materialsTotalCents = materialLines.reduce((s, m) => s + m.totalCents, 0);
  const lockedUntil = useMemo(() => {
    const dates = data.purchaseOrders.map((p) => p.deliveryDate).filter(Boolean).sort();
    return dates.length ? fmtDate(dates[0]) : undefined;
  }, [data.purchaseOrders]);

  const spendDownOptions = useMemo(
    () =>
      data.changeOrders.slice(0, 3).map((c, i) => ({
        id: c.id,
        label: c.title,
        amountCents: c.costImpactCents,
        source: (i % 2 === 0 ? 'ai' : 'owner') as 'ai' | 'owner',
        blurb: c.description,
      })),
    [data.changeOrders],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-accent">Builder · B2C</p>
        <h1 className="text-2xl font-bold text-slate-800">My build, at a glance</h1>
        <p className="text-sm text-slate-400">Everything your project needs, in one place.</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Scope cost" value={fmtCents(totalBudget)} />
        <Stat label="Committed" value={fmtCents(committed)} />
        <Stat label="Deliveries in transit" value={String(inFlight)} tone={inFlight > 0 ? 'accent' : 'default'} />
        <Stat label="Verified providers" value={String(data.providers.filter((p) => p.verificationStatus === 'verified').length)} tone="good" />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {data.escrows.length > 0 && (
          <EscrowVaultCard
            securedCents={escrowTotalCents}
            status={vaultStatus}
            footnote={`${data.escrows.length} escrow account${data.escrows.length === 1 ? '' : 's'} active`}
          />
        )}
        {nextMilestone && (
          <MilestoneProgressCard
            progressPct={progressPct}
            milestoneLabel={`Milestone ${nextMilestone.order + 1} · ${nextMilestone.category ?? 'progress'}`}
            photoCount={nextPhotoCount}
            nextDelivery={nextDelivery}
            holdCents={nextMilestone.plannedCostCents ?? 0}
            approved={approvedMilestoneId === nextMilestone.id}
            onReview={() => undefined}
            onApprove={() => setApprovedMilestoneId(nextMilestone.id)}
          />
        )}
        <MaterialsTransparencyPanel
          materials={materialLines}
          totalCents={materialsTotalCents}
          lockedUntil={lockedUntil}
        />
        <ContingencySpendDownCard
          remainingCents={Math.max(0, totalBudget - committed)}
          options={spendDownOptions}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RoadmapWidget milestones={data.milestones} />
        <BudgetDial boqs={data.boqs} purchaseOrders={data.purchaseOrders} milestones={data.milestones} />
        <VerificationTimeline milestones={data.milestones} />
        <FeasibilityWidget estimatedCostCents={totalBudget} />
        <EscrowWidget escrows={data.escrows} milestones={data.milestones} />
        <FindAProWidget providers={data.providers} />
        <DeliveryTrackerWidget deliveryRecords={data.deliveryRecords} purchaseOrders={data.purchaseOrders} />
        <RedPenAuditWidget boqs={data.boqs} rates={data.rates} />
        <GroupBuyWidget boqs={data.boqs} />
        <MustHavesWidget />
      </div>
    </div>
  );
}
