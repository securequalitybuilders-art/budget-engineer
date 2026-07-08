import { BOQ } from '../../domain/types';
import { currencySymbol } from '../../lib/currency';

const COLORS = ['#1a365d', '#06b6d4', '#8b5cf6', '#d4a574', '#22c55e', '#f59e0b', '#ef4444', '#64748b', '#0ea5e9', '#a78bfa'];

export function CostBreakdownChart({ boq }: { boq: BOQ }) {
  const sym = currencySymbol(boq.currency);
  const fmt = (n: number) => sym + Math.round(n).toLocaleString();
  const byCat = new Map<string, number>();
  for (const it of boq.items) byCat.set(it.category, (byCat.get(it.category) ?? 0) + it.total);
  const rows = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map((r) => r[1]), 1);

  return (
    <div className="panel">
      <h3>Cost Breakdown by Category</h3>
      <p className="sub">Subtotal {fmt(boq.summary.subtotal)}</p>
      {rows.map(([cat, val], i) => (
        <div key={cat} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: '#e2e8f0' }}>{cat}</span>
            <span style={{ color: '#94a3b8' }}>{fmt(val)}</span>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: '#0b1220' }}>
            <div style={{ width: `${(val / max) * 100}%`, height: '100%', borderRadius: 999, background: COLORS[i % COLORS.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}
