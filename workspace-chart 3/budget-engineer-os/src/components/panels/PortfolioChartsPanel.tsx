import type { PortfolioMetric } from '../../lib/portfolioMetrics';

export function PortfolioChartsPanel({ items }: { items: PortfolioMetric[] }) {
  const max = Math.max(...items.map((i) => i.grandTotal), 1);
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Portfolio Charts</h3>
      {items.length === 0 ? <p style={mutedStyle}>Create snapshots to see portfolio charts.</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item) => (
            <div key={item.snapshotId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: '#cbd5e1' }}>
                <span>{item.name}</span>
                <span>{item.grandTotal.toFixed(2)} USD</span>
              </div>
              <div style={{ background: '#0b1220', borderRadius: 999, height: 12, overflow: 'hidden', border: '1px solid #24324b' }}>
                <div style={{ width: `${(item.grandTotal / max) * 100}%`, height: '100%', background: '#8b5cf6' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8' };
