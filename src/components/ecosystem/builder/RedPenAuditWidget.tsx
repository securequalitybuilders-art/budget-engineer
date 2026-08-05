import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents, type EcosystemData } from '@/components/ecosystem/useEcosystemData';

function rateFor(itemDesc: string, rates: EcosystemData['rates']): number | undefined {
  const tokens = itemDesc.toLowerCase().split(/\s+/).slice(0, 3);
  return rates.find((r) =>
    tokens.some((t) => r.description.toLowerCase().includes(t) || r.code.toLowerCase().includes(t))
  )?.baseRateCents;
}

export function RedPenAuditWidget({ boqs, rates }: {
  boqs: EcosystemData['boqs'];
  rates: EcosystemData['rates'];
}) {
  const flagged: { section: string; item: string; rateCents: number; marketCents: number; overPct: number }[] = [];
  for (const boq of boqs) {
    for (const section of boq.sections) {
      for (const item of section.items) {
        const market = rateFor(item.description, rates);
        if (market && item.rateCents > market * 1.15) {
          flagged.push({
            section: section.title,
            item: item.description,
            rateCents: item.rateCents,
            marketCents: market,
            overPct: Math.round(((item.rateCents - market) / market) * 100),
          });
        }
      }
    }
  }
  flagged.sort((a, b) => b.overPct - a.overPct);

  const potentialSaving = flagged.reduce((s, f) => s + (f.rateCents - f.marketCents), 0);

  return (
    <EcoCard title="Red-pen audit" subtitle="BOQ rates vs the local market catalogue" icon={<span aria-hidden>✏️</span>}>
      {flagged.length === 0 ? (
        <EmptyState message="No line items priced above market. Your BOQ rates look competitive." />
      ) : (
        <>
          <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {flagged.length} line item(s) priced &gt;15% above market · potential saving {fmtCents(potentialSaving)}
          </div>
          <ul className="space-y-2">
            {flagged.slice(0, 6).map((f, i) => (
              <li key={i} className="rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{f.item}</span>
                  <Pill tone="bad">+{f.overPct}%</Pill>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  {f.section} · quoted {fmtCents(f.rateCents)} vs market {fmtCents(f.marketCents)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </EcoCard>
  );
}
