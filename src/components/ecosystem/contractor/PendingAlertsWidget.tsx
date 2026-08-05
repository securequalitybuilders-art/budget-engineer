import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents, type EcosystemData } from '@/components/ecosystem/useEcosystemData';

export function PendingAlertsWidget({ changeOrders, rfis, purchaseOrders, milestones }: {
  changeOrders: EcosystemData['changeOrders'];
  rfis: EcosystemData['rfis'];
  purchaseOrders: EcosystemData['purchaseOrders'];
  milestones: EcosystemData['milestones'];
}) {
  const pendingCo = changeOrders.filter((c) => c.status === 'pending-review' || c.status === 'draft');
  const openRfis = rfis.filter((r) => r.status === 'open' || r.status === 'escalated');
  const unacknowledged = purchaseOrders.filter((p) => p.status === 'issued' || p.status === 'draft');
  const overdueMilestones = milestones.filter((m) => m.releaseState !== 'released' && m.plannedDate && new Date(m.plannedDate) < new Date());

  const alerts = [
    { label: 'Change orders to review', count: pendingCo.length, tone: 'warn' as const },
    { label: 'Open RFIs', count: openRfis.length, tone: 'accent' as const },
    { label: 'POs awaiting acknowledgement', count: unacknowledged.length, tone: 'neutral' as const },
    { label: 'Overdue milestones', count: overdueMilestones.length, tone: 'bad' as const },
  ];
  const total = alerts.reduce((s, a) => s + a.count, 0);

  return (
    <EcoCard title="Pending items" subtitle={`${total} action(s) need attention`}>
      {total === 0 ? (
        <EmptyState message="All clear — nothing pending review." />
      ) : (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {alerts.map((a) => (
            <div key={a.label} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <span className="text-xs text-slate-400">{a.label}</span>
              <Pill tone={a.tone}>{a.count}</Pill>
            </div>
          ))}
        </div>
      )}
      {pendingCo[0] ? (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {pendingCo[0].title} · {fmtCents(pendingCo[0].costImpactCents ?? 0)}
        </div>
      ) : null}
    </EcoCard>
  );
}
