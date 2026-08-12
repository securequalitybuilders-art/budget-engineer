import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEcosystemData, fmtCents } from '@/components/ecosystem/useEcosystemData';
import { Stat } from '@/components/ecosystem/ui';
import { WorkflowPipeline } from '@/components/ecosystem/WorkflowPipeline';
import { BoqDispatchIntake } from '@/components/ecosystem/procurement/BoqDispatchIntake';
import { DispatchBoard } from '@/components/ecosystem/procurement/DispatchBoard';
import { SupplierMatch } from '@/components/ecosystem/procurement/SupplierMatch';
import { EscrowGatewayWidget } from '@/components/ecosystem/procurement/EscrowGatewayWidget';
import { dispatchSummary, listDispatchOrders, listEscrowHolds } from '@/lib/dispatch/dispatchActions';
import type { DispatchOrder, EscrowHold } from '@/domain/dispatch';
import { buildMarketIndex } from '@/engine/ecosystem/priceIndex';
import { MarketPriceTicker, DataTable } from '@/components/dzenhare';
import type { DataColumn } from '@/components/dzenhare';

export default function BulkProcurementDashboard() {
  const data = useEcosystemData();
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [holds, setHolds] = useState<EscrowHold[]>([]);

  const refresh = useCallback(async () => {
    const [nextOrders, nextHolds] = await Promise.all([listDispatchOrders(), listEscrowHolds()]);
    setOrders(nextOrders);
    setHolds(nextHolds);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listDispatchOrders()
      .then((o) => { if (!cancelled) setOrders(o); })
      .catch(() => undefined);
    listEscrowHolds()
      .then((h) => { if (!cancelled) setHolds(h); })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = dispatchSummary(orders, holds);

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

  const orderColumns: DataColumn<DispatchOrder>[] = [
    { key: 'id', header: 'Dispatch', render: (o) => o.id.slice(0, 8) },
    { key: 'supplierName', header: 'Supplier' },
    { key: 'lines', header: 'Lines', align: 'right', render: (o) => String(o.lines.length) },
    { key: 'totalCents', header: 'Value', align: 'right', render: (o) => fmtCents(o.totalCents) },
    {
      key: 'etaMinutes',
      header: 'ETA',
      align: 'right',
      render: (o) => (o.etaMinutes ? `${Math.round(o.etaMinutes / 60)}h` : '—'),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-accent">Bulk Procurement · B2B</p>
        <h1 className="text-2xl font-bold text-slate-800">Streamline procurement from the BOQ</h1>
        <p className="text-sm text-slate-400">Uber-for-construction JIT dispatch — order straight from the bill of quantities, track the truck by GPS, and pay through escrow.</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active dispatches" value={String(summary.active)} />
        <Stat label="Held in escrow" value={fmtCents(summary.heldValue)} tone="accent" />
        <Stat label="Released" value={fmtCents(summary.releasedValue)} tone="good" />
        <Stat label="Disputed" value={String(summary.disputedCount)} tone={summary.disputedCount > 0 ? 'bad' : 'default'} />
      </div>

      <div className="mb-6">
        <MarketPriceTicker items={tickerItems} currency="USD" />
      </div>

      {orders.length > 0 && (
        <div className="mb-6">
          <DataTable columns={orderColumns} rows={orders.slice(0, 8)} rowKey={(o) => o.id} />
        </div>
      )}

      <div className="mb-6">
        <WorkflowPipeline data={data} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BoqDispatchIntake projects={data.projects} boqs={data.boqs} providers={data.providers} orders={orders} onChanged={refresh} />
        <SupplierMatch providers={data.providers} orders={orders} />
        <DispatchBoard orders={orders} holds={holds} onChanged={refresh} />
        <EscrowGatewayWidget holds={holds} />
      </div>
    </div>
  );
}
