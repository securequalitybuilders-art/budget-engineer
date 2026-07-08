import { useState } from 'react';
import { RATE_CARDS, cloneRateCard, RateCard } from '@/lib/rates/rate-card';
import { MaterialSystem } from '@/domain/ws6-types';

const MATS: MaterialSystem[] = ['concrete', 'steel', 'timber'];

interface RateCardPanelProps {
  card?: RateCard;
  onChange?: (card: RateCard) => void;
}

export function RateCardPanel({ card: externalCard, onChange }: RateCardPanelProps) {
  const [internal, setInternal] = useState<RateCard>(externalCard ?? RATE_CARDS.zimbabwe);
  const card = externalCard ?? internal;

  const updateCard = (patch: Partial<RateCard>) => {
    const next = { ...cloneRateCard(card), ...patch };
    setInternal(next);
    onChange?.(next);
  };
  const updateWall = (m: MaterialSystem, v: number) => {
    const next = cloneRateCard(card);
    next.wall[m] = v;
    setInternal(next);
    onChange?.(next);
  };

  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-4">
      <h3 className="font-semibold text-stone-100">Regional Material-Cost Database</h3>
      <p className="mb-3 text-xs text-stone-400">Editable rate cards per region &amp; currency · CWICR-style</p>

      <label htmlFor="rate-region" className="mb-1 block text-xs font-medium text-stone-400">Region</label>
      <select
        id="rate-region"
        value={card.id in RATE_CARDS ? card.id : ''}
        onChange={(e) => {
          const preset = RATE_CARDS[e.target.value];
          if (preset) {
            setInternal(cloneRateCard(preset));
            onChange?.(cloneRateCard(preset));
          }
        }}
        className="mb-3 w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200"
      >
        {Object.values(RATE_CARDS).map((c) => (
          <option key={c.id} value={c.id}>{c.region} — {c.currency}</option>
        ))}
      </select>

      <div className="mb-3 grid grid-cols-3 gap-3">
        {MATS.map((m) => (
          <div key={m}>
            <label className="mb-1 block text-xs font-medium text-stone-400">{m} wall ({card.symbol}/m²)</label>
            <input
              type="number"
              value={card.wall[m]}
              onChange={(e) => updateWall(m, Number(e.target.value))}
              className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200"
            />
          </div>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-400">Slab ({card.symbol}/m²)</label>
          <input type="number" value={card.slab_m2} onChange={(e) => updateCard({ slab_m2: Number(e.target.value) })}
            className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-400">Roof ({card.symbol}/m²)</label>
          <input type="number" value={card.roof_m2} onChange={(e) => updateCard({ roof_m2: Number(e.target.value) })}
            className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-400">Rebar ({card.symbol}/t)</label>
          <input type="number" value={card.rebar_tonne} onChange={(e) => updateCard({ rebar_tonne: Number(e.target.value) })}
            className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200" />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-400">Contingency %</label>
          <input type="number" step="0.01" value={card.contingency} onChange={(e) => updateCard({ contingency: Number(e.target.value) })}
            className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-400">Fees %</label>
          <input type="number" step="0.01" value={card.fees} onChange={(e) => updateCard({ fees: Number(e.target.value) })}
            className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-400">VAT %</label>
          <input type="number" step="0.01" value={card.vat} onChange={(e) => updateCard({ vat: Number(e.target.value) })}
            className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200" />
        </div>
      </div>

      <p className="text-xs text-stone-400">
        Active: <b className="text-stone-200">{card.region}</b> · all BOQ totals and the cost chart
        recompute in <b className="text-cyan-400">{card.currency}</b> on every edit, persisted to IndexedDB and audit-logged.
      </p>
    </div>
  );
}
