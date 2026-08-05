import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents, type EcosystemData } from '@/components/ecosystem/useEcosystemData';
import { aggregateMaterialDemand } from '@/engine/ecosystem/groupBuy';

export function DemandRadarWidget({ boqs, procurementRequests }: {
  boqs: EcosystemData['boqs'];
  procurementRequests: EcosystemData['procurementRequests'];
}) {
  const lines = boqs.flatMap((b) =>
    b.sections.flatMap((s) =>
      s.items.map((i) => ({
        id: `${b.id}-${i.id}`,
        projectId: b.projectId,
        description: i.description,
        quantity: i.quantity,
        unit: i.unit,
        unitCostCents: i.rateCents,
      }))
    )
  );
  const demand = aggregateMaterialDemand(lines).slice(0, 6);
  const openRequests = procurementRequests.filter((r) => r.status === 'quotes-sought' || r.status === 'quotes-received');

  return (
    <EcoCard title="Demand radar" subtitle="What the market is buying right now" icon={<span aria-hidden>📡</span>}>
      <div className="mb-3 rounded-lg bg-brand/5 px-3 py-2 text-xs text-brand-accent">
        {openRequests.length} open RFQ(s) live · {boqs.length} project BOQ(s) in scope
      </div>
      {demand.length === 0 ? (
        <EmptyState message="No aggregate demand signals yet." />
      ) : (
        <ul className="space-y-2">
          {demand.map((d) => (
            <li key={d.key} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <div>
                <div className="text-sm font-medium text-slate-700">{d.label}</div>
                <div className="text-[11px] text-slate-400">{d.quantity} {d.unit} across {d.projectCount} project(s)</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{fmtCents(d.totalCostCents)}</span>
                <Pill tone={d.projectCount >= 2 ? 'accent' : 'neutral'}>{d.projectCount} buyers</Pill>
              </div>
            </li>
          ))}
        </ul>
      )}
    </EcoCard>
  );
}
