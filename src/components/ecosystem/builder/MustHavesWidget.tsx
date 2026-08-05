import { useState } from 'react';
import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents } from '@/components/ecosystem/useEcosystemData';
import { useSelectionsStore } from '@/stores/selectionsStore';

export function MustHavesWidget() {
  const items = useSelectionsStore((s) => s.items);
  const add = useSelectionsStore((s) => s.add);
  const remove = useSelectionsStore((s) => s.remove);
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('5000');

  const totalAllowance = items.reduce((s, i) => s + i.budgetAllowanceCents, 0);
  const totalActual = items.reduce((s, i) => s + i.actualCostCents, 0);

  return (
    <EcoCard title="Must-haves list" subtitle="Non-negotiable items and their cost exposure" icon={<span aria-hidden>⭐</span>}>
      <form className="mb-3 flex gap-2" onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        add({ name: name.trim(), category: 'Selection', budgetAllowanceCents: Number(budget) * 100, actualCostCents: Number(budget) * 100 });
        setName('');
      }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Porcelain tiles"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
        <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
          className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
        <button type="submit" className="rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">Add</button>
      </form>
      {items.length === 0 ? (
        <EmptyState message="Add the items you won't compromise on." />
      ) : (
        <>
          <ul className="mb-3 space-y-2">
            {items.map((i) => {
              const over = i.actualCostCents - i.budgetAllowanceCents;
              return (
                <li key={i.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{i.name}</div>
                    <div className="text-[11px] text-slate-400">
                      allowance {fmtCents(i.budgetAllowanceCents)} · actual {fmtCents(i.actualCostCents)}
                      {over > 0 ? ` · over by ${fmtCents(over)}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {over > 0 ? <Pill tone="bad">Over</Pill> : <Pill tone="good">On track</Pill>}
                    <button onClick={() => remove(i.id)} aria-label={`Remove ${i.name}`}
                      className="text-xs text-slate-300 hover:text-rose-500">✕</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between text-xs text-slate-400">
            <span>{items.length} must-have(s)</span>
            <span>{fmtCents(totalActual)} / {fmtCents(totalAllowance)}</span>
          </div>
        </>
      )}
    </EcoCard>
  );
}
