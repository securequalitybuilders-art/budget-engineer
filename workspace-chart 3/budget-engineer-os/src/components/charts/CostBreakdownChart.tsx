import type { BOQ } from '../../domain/boq';

export function CostBreakdownChart({ boq }: { boq: BOQ }) {
  const totals = boq.items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + item.total;
    return acc;
  }, {});
  const max = Math.max(...Object.values(totals), 1);
  const colors: Record<string, string> = {
    Walls: '#1a365d',
    Slabs: '#d4a574',
    Roof: '#8b5cf6',
    Openings: '#06b6d4',
    Objects: '#64748b',
  };

  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Cost Breakdown</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {Object.entries(totals).map(([key, value]) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: '#cbd5e1' }}>
              <span>{key}</span>
              <span>{value.toFixed(2)} USD</span>
            </div>
            <div style={{ background: '#0b1220', borderRadius: 999, height: 12, overflow: 'hidden', border: '1px solid #24324b' }}>
              <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: colors[key] ?? '#94a3b8' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
