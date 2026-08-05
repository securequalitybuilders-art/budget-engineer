import { EcoCard, Pill, EmptyState, LinkButton } from '@/components/ecosystem/ui';
import { fmtCents, type EcosystemData } from '@/components/ecosystem/useEcosystemData';
import { aggregateMaterialDemand, estimateBulkDiscount } from '@/engine/ecosystem/groupBuy';

export function GroupBuyWidget({ boqs }: { boqs: EcosystemData['boqs'] }) {
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

  return (
    <EcoCard title="Group buy" subtitle="Combined demand to unlock bulk pricing" icon={<span aria-hidden>📦</span>}>
      {demand.length === 0 ? (
        <EmptyState message="No BOQ demand to aggregate yet." />
      ) : (
        <>
          <ul className="mb-3 space-y-2">
            {demand.map((d) => {
              const disc = estimateBulkDiscount(d.quantity, d.avgUnitCostCents);
              return (
                <li key={d.key} className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{d.label}</span>
                    <Pill tone={disc.discountPct >= 9 ? 'good' : disc.discountPct >= 3 ? 'accent' : 'neutral'}>
                      {disc.discountPct > 0 ? `−${disc.discountPct}%` : 'list'}
                    </Pill>
                  </div>
                  <div className="mt-0.5 flex justify-between text-[11px] text-slate-400">
                    <span>{d.quantity} {d.unit} · {d.projectCount} project(s)</span>
                    <span>{fmtCents(d.totalCostCents)} · save {fmtCents(disc.savingCents)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <LinkButton to="/ecosystem/supplier">Browse supplier deals</LinkButton>
        </>
      )}
    </EcoCard>
  );
}
