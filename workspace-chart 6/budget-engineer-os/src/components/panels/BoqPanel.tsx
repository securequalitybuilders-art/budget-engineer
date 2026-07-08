import { BOQ } from '../../domain/types';
import { makeMoney } from '../../lib/currency';

export function BoqPanel({ boq }: { boq: BOQ }) {
  const fmt = makeMoney(boq.currency);
  const pct = (part: number, base: number) => base > 0 ? Math.round((part / base) * 100) : 0;
  const sub = boq.summary.subtotal;

  return (
    <div className="panel">
      <h3>Bill of Quantities</h3>
      <p className="sub">{boq.items.length} line items · {boq.currency}</p>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Description</th>
            <th className="num">Qty</th>
            <th>Unit</th>
            <th className="num">Rate</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {boq.items.map((it) => (
            <tr key={it.id}>
              <td><span className="tag">{it.category}</span></td>
              <td>{it.description}</td>
              <td className="num">{it.quantity.toLocaleString()}</td>
              <td>{it.unit}</td>
              <td className="num">{fmt(it.rate)}</td>
              <td className="num">{fmt(it.total)}</td>
            </tr>
          ))}
          <tr><td colSpan={5}>Subtotal</td><td className="num">{fmt(sub)}</td></tr>
          <tr><td colSpan={5}>Contingency ({pct(boq.summary.contingency, sub)}%)</td><td className="num">{fmt(boq.summary.contingency)}</td></tr>
          <tr><td colSpan={5}>Professional fees ({pct(boq.summary.fees, sub)}%)</td><td className="num">{fmt(boq.summary.fees)}</td></tr>
          <tr><td colSpan={5}>VAT</td><td className="num">{fmt(boq.summary.vat)}</td></tr>
          <tr className="total"><td colSpan={5}>Grand Total</td><td className="num">{fmt(boq.summary.grandTotal)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
