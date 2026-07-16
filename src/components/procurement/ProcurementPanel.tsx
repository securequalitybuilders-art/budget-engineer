import { useState, useEffect, useMemo } from 'react';
import { useProcurementStore } from '@/stores/procurementStore';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { enrichProcurementWithBOQLinks, type LinkedBOQInfo } from '@/lib/lifecycle/procurementBoqLinker';
import { computeProcurementLifecycleSummary } from '@/lib/lifecycle/lifecycleSummary';
import { EmptyState } from '@/components/lifecycle/EmptyState';
import { NextStepHint } from '@/components/lifecycle/NextStepHint';
import { CrossStudioLinks, buildStudioLink } from '@/components/lifecycle/CrossStudioLinks';
import { ClipboardList, ShoppingCart, Truck, Link, ArrowRight } from 'lucide-react';

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

export function ProcurementPanel({ projectId }: ProcurementPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('requests');
  const { requests, purchaseOrders, deliveryRecords } = useProcurementStore();
  const milestones = useMilestoneStore((s) => s.milestones);
  const [boqEnrichment, setBoqEnrichment] = useState<Map<string, LinkedBOQInfo>>(new Map());

  useEffect(() => {
    if (requests.length > 0) {
      enrichProcurementWithBOQLinks(requests).then((enriched) => {
        setBoqEnrichment(new Map(enriched.map((r) => [r.id, r.linkedBOQInfo])));
      });
    }
  }, [requests]);

  const hasData = requests.length > 0 || purchaseOrders.length > 0 || deliveryRecords.length > 0;

  const summary = useMemo(() => computeProcurementLifecycleSummary({ requests, purchaseOrders }), [requests, purchaseOrders]);

  const crossLinks = useMemo(() => {
    const links = [buildStudioLink(projectId, 'project-controls', 'Project Controls', 'See procurement cost on controls')];
    if (milestones.length > 0) {
      links.push(buildStudioLink(projectId, 'delivery', 'Delivery', 'View milestone-linked delivery'));
    }
    return links;
  }, [projectId, milestones.length]);

  const nextAction = useMemo(() => {
    if (!hasData) {
      return { hint: 'Procurement starts from BOQ-derived requests. Complete the BOQ to generate initial procurement needs.', severity: 'info' as const };
    }
    const openRequests = requests.filter((r) => r.status !== 'awarded' && r.status !== 'cancelled');
    if (openRequests.length > 0) {
      return { hint: `${openRequests.length} request(s) awaiting action. Review quotes and award to proceed.`, severity: 'warning' as const };
    }
    return null;
  }, [hasData, requests]);

  return (
    <div className="space-y-6">
      {/* Next action hint */}
      {nextAction && <NextStepHint hint={nextAction.hint} severity={nextAction.severity} />}

      {/* Procurement summary bar */}
      {hasData && (
        <div className="grid grid-cols-4 gap-2">
          <SummaryMini label="Open Requests" value={summary.openRequests} color={summary.openRequests > 0 ? 'text-amber-400' : 'text-green-400'} />
          <SummaryMini label="Awarded" value={summary.awardedRequests} color="text-green-400" />
          <SummaryMini label="POs Issued" value={summary.totalPurchaseOrders} color="text-cyan-400" />
          <SummaryMini label="BOQ Links" value={summary.linkedBOQLinesCount} color="text-indigo-400" />
        </div>
      )}

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

      {!hasData ? (
        <EmptyState
          icon={<ShoppingCart size={28} />}
          title="No procurement data yet"
          description="Procurement requests are typically created from BOQ line items. Complete the BOQ first, then procurement will show linked requests here."
          actionLabel="View BOQ"
          actionTo={`/project/${projectId}`}
        />
      ) : (
        <>
          {activeTab === 'requests' && (
            <div className="space-y-2">
              {requests.length === 0 ? (
                <EmptyState
                  title="No procurement requests yet"
                  description="Create procurement requests linked to BOQ items or schedule lines."
                  compact
                />
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
                        <span>Est. Cost: {req.estimatedCostCents.toLocaleString()}¢</span>
                        <span>Required: {req.requiredByDate}</span>
                      </div>
                      {boq && (
                        <div className="mt-2 space-y-1 rounded-md bg-cyan-500/5 border border-cyan-500/20 p-2">
                          <div className="flex items-center gap-1 text-[9px] text-cyan-300">
                            <Link size={10} />
                            <span className="font-medium">BOQ Lineage</span>
                          </div>
                          <div className="text-[9px] text-cyan-300/80">
                            Linked cost: {boq.totalLinkedCostCents}¢
                          </div>
                          {boq.boqLineDescriptions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {boq.boqLineDescriptions.map((desc, i) => (
                                <span key={i} className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[8px] text-cyan-300/70">{desc}</span>
                              ))}
                            </div>
                          )}
                          {req.status === 'quotes-sought' || req.status === 'quotes-received' ? (
                            <div className="mt-1 flex items-center gap-1 text-[9px] text-amber-300">
                              <ArrowRight size={10} />
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              Quote{(req as any).quotes?.length ? ` comparison (${(req as any).quotes.length} received)` : 's being collected'}
                            </div>
                          ) : null}
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
                <EmptyState
                  title="No purchase orders yet"
                  description="Award procurement requests to generate purchase orders."
                  compact
                />
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
                <EmptyState
                  title="No delivery records yet"
                  description="Deliveries are recorded against purchase orders once materials arrive on site."
                  compact
                />
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
        </>
      )}

      {/* Cross-studio links */}
      <CrossStudioLinks projectId={projectId} links={crossLinks} title="Related contexts" />
    </div>
  );
}

function SummaryMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-2 text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[8px] text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
