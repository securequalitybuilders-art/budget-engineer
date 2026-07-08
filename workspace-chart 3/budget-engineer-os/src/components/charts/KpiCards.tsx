import type { BOQ } from '../../domain/boq';
import type { BimModel } from '../../domain/bim';

export function KpiCards({ boq, bim }: { boq: BOQ; bim: BimModel }) {
  const slabArea = bim.elements.filter((e) => e.type === 'slab').reduce((sum, e) => sum + (e.type === 'slab' ? e.width * e.depth : 0), 0);
  const costPerM2 = slabArea > 0 ? boq.summary.grandTotal / slabArea : 0;
  const cards = [
    ['Subtotal', `${boq.summary.subtotal.toFixed(2)} USD`, '#d4a574'],
    ['Grand Total', `${boq.summary.grandTotal.toFixed(2)} USD`, '#8b5cf6'],
    ['Cost / m²', `${costPerM2.toFixed(2)} USD`, '#06b6d4'],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
      {cards.map(([label, value, color]) => (
        <div key={label} style={{ background: '#111c31', border: '1px solid #24324b', borderTop: `3px solid ${color}`, borderRadius: 18, padding: 16 }}>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
          <div style={{ color: '#f8fafc', fontSize: 24, fontWeight: 700 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
