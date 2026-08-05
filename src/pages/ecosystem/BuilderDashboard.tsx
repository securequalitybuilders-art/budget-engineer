import { useEcosystemData, fmtCents } from '@/components/ecosystem/useEcosystemData';
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

export default function BuilderDashboard() {
  const data = useEcosystemData();
  const totalBudget = data.boqs.reduce((s, b) => s + b.totalCents, 0);
  const committed = data.purchaseOrders.reduce((s, p) => s + p.totalCents, 0);
  const inFlight = data.deliveryRecords.filter((d) => d.status === 'in-transit').length;

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
