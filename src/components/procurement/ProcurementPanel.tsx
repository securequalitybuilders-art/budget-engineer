import { useState, useEffect } from 'react';
import { useProcurementStore } from '@/stores/procurementStore';
import { enrichProcurementWithBOQLinks, type LinkedBOQInfo } from '@/lib/lifecycle/procurementBoqLinker';
import { Box, ClipboardList, ShoppingCart, Truck, Link } from 'lucide-react';

interface ProcurementPanelProps {
  projectId: string;
}

type TabId = 'requests' | 'purchase-orders' | 'deliveries';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'requests', label: 'Requests', icon: <ClipboardList size={14} /> },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: <ShoppingCart size={14} /> },
  { id: 'deliveries', label: 'Deliveries', icon: <Truck size={14} /> },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  'quotes-sought': 'bg-blue-500/20 text-blue-400',
  'quotes-received': 'bg-indigo-500/20 text-indigo-400',
  evaluation: 'bg-amber-500/20 text-amber-400',
  awarded: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
  issued: 'bg-blue-500/20 text-blue-400',
  acknowledged: 'bg-indigo-500/20 text-indigo-400',
  'in-transit': 'bg-amber-500/20 text-amber-400',
  delivered: 'bg-green-500/20 text-green-400',
  'partially-delivered': 'bg-yellow-500/20 text-yellow-400',
  closed: 'bg-gray-500/20 text-gray-400',
  delayed: 'bg-red-500/20 text-red-400',
  pending: 'bg-gray-500/20 text-gray-400',
};

export function ProcurementPanel(_props: ProcurementPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('requests');
  const { requests, purchaseOrders, deliveryRecords } = useProcurementStore();
  const [boqEnrichment, setBoqEnrichment] = useState<Map<string, LinkedBOQInfo>>(new Map());

  useEffect(() => {
    if (requests.length > 0) {
      enrichProcurementWithBOQLinks(requests).then((enriched) => {
        setBoqEnrichment(new Map(enriched.map((r) => [r.id, r.linkedBOQInfo])));
      });
    }
  }, [requests]);

  return (
    <div className="space-y-6">
      <div className="flex gap-0 border-b border-stone-700/60 bg-stone-900/30 rounded-t-xl overflow-hidden">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-stone-400 hover:text-stone-300 hover:border-stone-500'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'requests' && (
        <div className="space-y-2">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
              <Box size={32} className="text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">No procurement requests yet.</p>
            </div>
          ) : (
            requests.map((req) => {
              const boq = boqEnrichment.get(req.id);
              return (
                <div key={req.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{req.title}</span>
                      <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">
                        {req.requestNumber}
                      </span>
                      {req.linkedBOQLineIds.length > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] text-cyan-400">
                          <Link size={10} />
                          {req.linkedBOQLineIds.length} BOQ
                        </span>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${STATUS_COLORS[req.status] || ''}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mb-1">{req.description}</p>
                  <div className="flex gap-3 text-[9px] text-[var(--text-tertiary)]">
                    <span>Priority: {req.priority}</span>
                    <span>Budget: {req.budgetCents.toLocaleString()}¢</span>
                    <span>Est: {req.estimatedCostCents.toLocaleString()}¢</span>
                    <span>Required: {req.requiredByDate}</span>
                  </div>
                  {boq && (
                    <div className="mt-2 rounded-md bg-cyan-500/5 border border-cyan-500/20 p-2 text-[9px] text-cyan-300">
                      <span className="font-medium">BOQ Linked Cost: {boq.totalLinkedCostCents}¢</span>
                      <span className="ml-2">| {boq.boqLineDescriptions.join(', ') || 'No descriptions'}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'purchase-orders' && (
        <div className="space-y-2">
          {purchaseOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
              <Box size={32} className="text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">No purchase orders yet.</p>
            </div>
          ) : (
            purchaseOrders.map((po) => (
              <div key={po.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{po.title}</span>
                    <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">{po.poNumber}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${STATUS_COLORS[po.status] || ''}`}>
                    {po.status}
                  </span>
                </div>
                <div className="flex gap-3 text-[9px] text-[var(--text-tertiary)]">
                  <span>Total: {po.totalCents.toLocaleString()}¢</span>
                  <span>Delivery: {po.deliveryDate}</span>
                  <span>Issued by: {po.issuedBy}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'deliveries' && (
        <div className="space-y-2">
          {deliveryRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
              <Box size={32} className="text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">No delivery records yet.</p>
            </div>
          ) : (
            deliveryRecords.map((dr) => (
              <div key={dr.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Delivery Note: {dr.deliveryNote}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${STATUS_COLORS[dr.status] || ''}`}>
                    {dr.status}
                  </span>
                </div>
                <div className="flex gap-3 text-[9px] text-[var(--text-tertiary)]">
                  <span>Date: {dr.deliveryDate}</span>
                  <span>Received by: {dr.receivedBy}</span>
                  <span>Items: {dr.items.length}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
