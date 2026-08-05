import { useState } from 'react';
import { useEcosystemData, fmtCents } from '@/components/ecosystem/useEcosystemData';
import { Stat } from '@/components/ecosystem/ui';
import { WorkflowPipeline } from '@/components/ecosystem/WorkflowPipeline';
import { PortfolioWidget } from '@/components/ecosystem/contractor/PortfolioWidget';
import { RfqCreateWidget } from '@/components/ecosystem/contractor/RfqCreateWidget';
import { PnLWidget } from '@/components/ecosystem/contractor/PnLWidget';
import { P4pWidget } from '@/components/ecosystem/contractor/P4pWidget';
import { PriceIndexWidget } from '@/components/ecosystem/contractor/PriceIndexWidget';
import { ProcurementTcoWidget } from '@/components/ecosystem/contractor/ProcurementTcoWidget';
import { LogisticsWidget } from '@/components/ecosystem/contractor/LogisticsWidget';
import { WipaaWidget } from '@/components/ecosystem/contractor/WipaaWidget';
import { ResourceHubsWidget } from '@/components/ecosystem/contractor/ResourceHubsWidget';
import { PendingAlertsWidget } from '@/components/ecosystem/contractor/PendingAlertsWidget';

export default function ContractorDashboard() {
  const data = useEcosystemData();
  const contracts = data.escrows.reduce((s, e) => s + e.totalAmount, 0);
  const released = data.escrows.reduce(
    (s, e) => s + e.milestones.filter((m) => m.status === 'released').length, 0
  );
  const [rfqProjectId, setRfqProjectId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-accent">Contractor · B2B</p>
        <h1 className="text-2xl font-bold text-slate-800">Portfolio command centre</h1>
        <p className="text-sm text-slate-400">Payments, procurement and logistics across all projects.</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active escrow contracts" value={String(data.escrows.length)} />
        <Stat label="Contract value" value={fmtCents(contracts * 100)} />
        <Stat label="Milestones released" value={String(released)} tone="good" />
        <Stat label="Open RFQs" value={String(data.procurementRequests.filter((r) => r.status === 'quotes-sought' || r.status === 'quotes-received').length)} tone="accent" />
      </div>

      <div className="mb-6">
        <WorkflowPipeline data={data} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PortfolioWidget projects={data.projects} escrows={data.escrows} onStartProcurement={setRfqProjectId} />
        <RfqCreateWidget projects={data.projects} defaultProjectId={rfqProjectId} onCreated={data.refresh} />
        <PnLWidget milestones={data.milestones} purchaseOrders={data.purchaseOrders} procurementRequests={data.procurementRequests} />
        <P4pWidget milestones={data.milestones} />
        <WipaaWidget escrows={data.escrows} />
        <ProcurementTcoWidget supplierQuotes={data.supplierQuotes} procurementRequests={data.procurementRequests} onAwarded={data.refresh} />
        <PriceIndexWidget rates={data.rates} />
        <LogisticsWidget deliveryRecords={data.deliveryRecords} purchaseOrders={data.purchaseOrders} />
        <ResourceHubsWidget providers={data.providers} />
        <PendingAlertsWidget changeOrders={data.changeOrders} rfis={data.rfis} purchaseOrders={data.purchaseOrders} milestones={data.milestones} />
      </div>
    </div>
  );
}
