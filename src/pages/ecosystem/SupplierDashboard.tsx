import { useEcosystemData, fmtCents } from '@/components/ecosystem/useEcosystemData';
import { Stat } from '@/components/ecosystem/ui';
import { WorkflowPipeline } from '@/components/ecosystem/WorkflowPipeline';
import { PipelineWidget } from '@/components/ecosystem/supplier/PipelineWidget';
import { ScorecardWidget } from '@/components/ecosystem/supplier/ScorecardWidget';
import { QuotingToolWidget } from '@/components/ecosystem/supplier/QuotingToolWidget';
import { EscrowLinkWidget } from '@/components/ecosystem/supplier/EscrowLinkWidget';
import { ProofOfFundsWidget } from '@/components/ecosystem/supplier/ProofOfFundsWidget';
import { FleetWidget } from '@/components/ecosystem/supplier/FleetWidget';
import { DemandRadarWidget } from '@/components/ecosystem/supplier/DemandRadarWidget';
import { FlashDealsWidget } from '@/components/ecosystem/supplier/FlashDealsWidget';
import { DisputeWidget } from '@/components/ecosystem/supplier/DisputeWidget';

export default function SupplierDashboard() {
  const data = useEcosystemData();
  const awarded = data.supplierQuotes.filter((q) => q.status === 'awarded');
  const awardedValue = awarded.reduce((s, q) => s + q.totalCents, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-accent">Supplier · B2B</p>
        <h1 className="text-2xl font-bold text-slate-800">Sell to the build market</h1>
        <p className="text-sm text-slate-400">Win work, move stock and get paid securely.</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Quotes submitted" value={String(data.supplierQuotes.length)} />
        <Stat label="Awards won" value={String(awarded.length)} tone="good" />
        <Stat label="Awarded value" value={fmtCents(awardedValue)} tone="accent" />
        <Stat label="Live RFQs" value={String(data.procurementRequests.filter((r) => r.status === 'quotes-sought').length)} tone="accent" />
      </div>

      <div className="mb-6">
        <WorkflowPipeline data={data} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PipelineWidget supplierQuotes={data.supplierQuotes} procurementRequests={data.procurementRequests} providers={data.providers} onChanged={data.refresh} />
        <ScorecardWidget providers={data.providers} />
        <QuotingToolWidget />
        <EscrowLinkWidget escrows={data.escrows} />
        <ProofOfFundsWidget providers={data.providers} />
        <FleetWidget deliveryRecords={data.deliveryRecords} purchaseOrders={data.purchaseOrders} onChanged={data.refresh} />
        <DemandRadarWidget boqs={data.boqs} procurementRequests={data.procurementRequests} />
        <FlashDealsWidget />
        <DisputeWidget />
      </div>
    </div>
  );
}
