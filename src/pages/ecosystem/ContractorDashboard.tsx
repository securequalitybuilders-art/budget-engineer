import { useMemo, useState } from 'react';
import { useEcosystemData, fmtCents, fmtDate } from '@/components/ecosystem/useEcosystemData';
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
import { closeProject, reopenProject } from '@/lib/ecosystem/workflowActions';
import { buildMarketIndex } from '@/engine/ecosystem/priceIndex';
import { MarketPriceTicker, ContractorMatchCard, DataTable } from '@/components/dzenhare';
import type { DataColumn } from '@/components/dzenhare';
import type { PurchaseOrder } from '@/domain/procurement';

export default function ContractorDashboard() {
  const data = useEcosystemData();
  const contracts = data.escrows.reduce((s, e) => s + e.totalAmount, 0);
  const released = data.escrows.reduce(
    (s, e) => s + e.milestones.filter((m) => m.status === 'released').length, 0
  );
  const [rfqProjectId, setRfqProjectId] = useState<string | null>(null);

  const wipaaScore = useMemo(() => {
    const milestones = data.escrows.flatMap((e) => e.milestones);
    if (milestones.length === 0) return undefined;
    return Math.round((milestones.filter((m) => m.status === 'released').length / milestones.length) * 100);
  }, [data.escrows]);

  const tickerItems = useMemo(
    () =>
      buildMarketIndex(data.rates, 26, 'USD', 30)
        .slice(0, 10)
        .map((i) => ({
          symbol: i.symbol,
          label: i.label,
          unit: i.unit,
          currentCents: i.currentCents,
          changePct: i.changePct,
        })),
    [data.rates],
  );

  const bestProvider = useMemo(() => {
    const candidates = data.providers.filter(
      (p) => (p.type === 'contractor' || p.type === 'subcontractor') && p.verificationStatus === 'verified',
    );
    return [...candidates].sort((a, b) => b.rating - a.rating)[0];
  }, [data.providers]);

  const poColumns: DataColumn<PurchaseOrder>[] = [
    { key: 'poNumber', header: 'Order' },
    { key: 'title', header: 'Description' },
    { key: 'status', header: 'Status' },
    { key: 'totalCents', header: 'Total', align: 'right', render: (p) => fmtCents(p.totalCents) },
    { key: 'deliveryDate', header: 'Delivery', render: (p) => (p.deliveryDate ? fmtDate(p.deliveryDate) : '—') },
  ];

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
        <MarketPriceTicker items={tickerItems} currency="USD" />
      </div>

      {bestProvider && (
        <div className="mb-6 grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <ContractorMatchCard
              name={bestProvider.name}
              category={bestProvider.category ? String(bestProvider.category) : bestProvider.type}
              rating={bestProvider.rating}
              reviews={bestProvider.reviews.length}
              feeCents={Math.round(contracts * 100 * 0.02)}
              wipaaScore={wipaaScore}
              metrics={[
                { key: 'loc', icon: 'location', label: 'Based in', value: bestProvider.location.city },
                { key: 'port', icon: 'portfolio', label: 'Projects completed', value: String(bestProvider.completedProjects) },
                { key: 'time', icon: 'timeline', label: 'Availability', value: bestProvider.availability.status.replace(/_/g, ' ') },
                { key: 'trend', icon: 'trend', label: 'Rating trend', value: `${bestProvider.rating.toFixed(1)} / 5` },
              ]}
              onViewProjects={() => setRfqProjectId(null)}
              onApprove={() => setRfqProjectId(null)}
              onAlternatives={() => setRfqProjectId(null)}
            />
          </div>
          <div className="lg:col-span-3">
            <DataTable
              columns={poColumns}
              rows={data.purchaseOrders.slice(0, 8)}
              rowKey={(p) => p.id}
            />
          </div>
        </div>
      )}

      <div className="mb-6">
        <WorkflowPipeline data={data} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PortfolioWidget
          projects={data.projects}
          escrows={data.escrows}
          onStartProcurement={setRfqProjectId}
          onCloseProject={(id) => closeProject(id).then(data.refresh)}
          onReopenProject={(id) => reopenProject(id).then(data.refresh)}
        />
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
