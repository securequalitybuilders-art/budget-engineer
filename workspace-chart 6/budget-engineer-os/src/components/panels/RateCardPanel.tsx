import { useAppStore } from '../../store/appStore';
import { RATE_CARDS, cloneRateCard } from '../../lib/rateCard';
import { MaterialSystem } from '../../domain/types';

const MATS: MaterialSystem[] = ['concrete', 'steel', 'timber'];

export function RateCardPanel() {
  const card = useAppStore((s) => s.rateCard);
  const setRegion = useAppStore((s) => s.setRegion);
  const setRateCard = useAppStore((s) => s.setRateCard);

  const update = (patch: Partial<typeof card>) => {
    void setRateCard({ ...cloneRateCard(card), ...patch });
  };
  const updateWall = (m: MaterialSystem, v: number) => {
    const next = cloneRateCard(card);
    next.wall[m] = v;
    void setRateCard(next);
  };

  return (
    <div className="panel">
      <h3>Stage 44 · Regional Material-Cost Database</h3>
      <p className="sub">Editable rate cards per region &amp; currency · CWICR-style</p>

      <label className="field">Region</label>
      <select value={card.id in RATE_CARDS ? card.id : ''} onChange={(e) => void setRegion(e.target.value)}>
        {Object.values(RATE_CARDS).map((c) => (
          <option key={c.id} value={c.id}>{c.region} — {c.currency}</option>
        ))}
        {!(card.id in RATE_CARDS) && <option value="">Custom ({card.currency})</option>}
      </select>

      <div className="grid cols-3" style={{ gap: 10, marginTop: 14 }}>
        {MATS.map((m) => (
          <div key={m}>
            <label className="field">{m} wall ({card.symbol}/m²)</label>
            <input type="number" value={card.wall[m]} onChange={(e) => updateWall(m, Number(e.target.value))} />
          </div>
        ))}
      </div>

      <div className="grid cols-3" style={{ gap: 10, marginTop: 10 }}>
        <div>
          <label className="field">Slab ({card.symbol}/m²)</label>
          <input type="number" value={card.slab_m2} onChange={(e) => update({ slab_m2: Number(e.target.value) })} />
        </div>
        <div>
          <label className="field">Roof ({card.symbol}/m²)</label>
          <input type="number" value={card.roof_m2} onChange={(e) => update({ roof_m2: Number(e.target.value) })} />
        </div>
        <div>
          <label className="field">Rebar ({card.symbol}/t)</label>
          <input type="number" value={card.rebar_tonne} onChange={(e) => update({ rebar_tonne: Number(e.target.value) })} />
        </div>
      </div>

      <div className="grid cols-3" style={{ gap: 10, marginTop: 10 }}>
        <div>
          <label className="field">Contingency %</label>
          <input type="number" step="0.01" value={card.contingency} onChange={(e) => update({ contingency: Number(e.target.value) })} />
        </div>
        <div>
          <label className="field">Fees %</label>
          <input type="number" step="0.01" value={card.fees} onChange={(e) => update({ fees: Number(e.target.value) })} />
        </div>
        <div>
          <label className="field">VAT %</label>
          <input type="number" step="0.01" value={card.vat} onChange={(e) => update({ vat: Number(e.target.value) })} />
        </div>
      </div>

      <p className="note" style={{ marginTop: 10 }}>
        Active: <b style={{ color: '#e2e8f0' }}>{card.region}</b> · all BOQ totals and the cost chart
        recompute in <b style={{ color: '#06b6d4' }}>{card.currency}</b> on every edit, persisted to IndexedDB and audit-logged.
      </p>
    </div>
  );
}
