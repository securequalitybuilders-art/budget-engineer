import { BOQ, BimModel } from '../../domain/types';
import { currencySymbol } from '../../lib/currency';

export function KpiCards({ boq, bim }: { boq: BOQ; bim: BimModel }) {
  const sym = currencySymbol(boq.currency);
  const fmt = (n: number) => sym + Math.round(n).toLocaleString();
  const slabArea = bim.elements.filter((e) => e.type === 'slab').reduce((s, e) => s + (e.area ?? 0), 0);
  const perM2 = slabArea > 0 ? boq.summary.grandTotal / slabArea : 0;
  const walls = bim.elements.filter((e) => e.type === 'wall').length;

  return (
    <div className="kpi">
      <div className="card">
        <div className="label">Grand Total</div>
        <div className="value green">{fmt(boq.summary.grandTotal)}</div>
      </div>
      <div className="card">
        <div className="label">Cost / m²</div>
        <div className="value cyan">{fmt(perM2)}</div>
      </div>
      <div className="card">
        <div className="label">Floor Area</div>
        <div className="value">{slabArea.toFixed(0)} m²</div>
      </div>
      <div className="card">
        <div className="label">Walls</div>
        <div className="value">{walls}</div>
      </div>
    </div>
  );
}
