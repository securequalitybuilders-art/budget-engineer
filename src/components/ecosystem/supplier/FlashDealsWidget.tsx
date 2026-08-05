import { useState } from 'react';
import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents } from '@/components/ecosystem/useEcosystemData';
import { useFlashDealStore } from '@/stores/flashDealStore';

export function FlashDealsWidget() {
  const deals = useFlashDealStore((s) => s.deals);
  const add = useFlashDealStore((s) => s.add);
  const remove = useFlashDealStore((s) => s.remove);
  const toggle = useFlashDealStore((s) => s.toggleActive);

  const [itemName, setItemName] = useState('');
  const [normal, setNormal] = useState('1000');
  const [deal, setDeal] = useState('880');
  const [providerName, setProviderName] = useState('');

  const active = deals.filter((d) => d.active);

  return (
    <EcoCard title="Flash deals" subtitle="Short-window pricing to move stock" icon={<span aria-hidden>⚡</span>}>
      <form className="mb-3 grid grid-cols-2 gap-2" onSubmit={(e) => {
        e.preventDefault();
        if (!itemName.trim()) return;
        const normalCents = Number(normal) * 100;
        const dealCents = Number(deal) * 100;
        add({
          providerId: 'me', providerName: providerName.trim() || 'My store', itemName: itemName.trim(),
          normalPriceCents: normalCents, dealPriceCents: dealCents,
          discountPct: normalCents > 0 ? Math.round(((normalCents - dealCents) / normalCents) * 100) : 0,
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        });
        setItemName('');
      }}>
        <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Item name"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
        <input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="Store name"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
        <input type="number" value={normal} onChange={(e) => setNormal(e.target.value)} placeholder="Normal $"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
        <input type="number" value={deal} onChange={(e) => setDeal(e.target.value)} placeholder="Deal $"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
        <button type="submit" className="col-span-2 rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
          List flash deal
        </button>
      </form>
      {active.length === 0 ? (
        <EmptyState message="No live flash deals. Create one to boost demand." />
      ) : (
        <ul className="space-y-2">
          {active.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2">
              <div>
                <div className="text-sm font-medium text-slate-700">{d.itemName} · {d.providerName}</div>
                <div className="text-[11px] text-slate-400">
                  <span className="line-through">{fmtCents(d.normalPriceCents)}</span>
                  {' → '}
                  <span className="font-semibold text-amber-600">{fmtCents(d.dealPriceCents)}</span> · −{d.discountPct}%
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone="warn">Live</Pill>
                <button onClick={() => toggle(d.id)} aria-label="End deal" className="text-xs text-slate-300 hover:text-slate-400">End</button>
                <button onClick={() => remove(d.id)} aria-label="Delete deal" className="text-xs text-slate-300 hover:text-rose-500">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </EcoCard>
  );
}
