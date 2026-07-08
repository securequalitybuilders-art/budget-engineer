export function BoqDeltaChartPanel({ left, right }: { left: Record<string, number>; right: Record<string, number> }) {
  const categories = Array.from(new Set([...Object.keys(left), ...Object.keys(right)]));
  const deltas = categories.map((c) => ({ category: c, delta: (right[c] ?? 0) - (left[c] ?? 0) }));
  const max = Math.max(...deltas.map((d) => Math.abs(d.delta)), 1);
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>BOQ Category Delta Chart</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {deltas.map((d) => (
          <div key={d.category}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: '#cbd5e1' }}>
              <span>{d.category}</span>
              <span>{d.delta.toFixed(2)} USD</span>
            </div>
            <div style={{ background: '#0b1220', borderRadius: 999, height: 12, overflow: 'hidden', border: '1px solid #24324b' }}>
              <div style={{ width: `${(Math.abs(d.delta) / max) * 100}%`, height: '100%', background: d.delta >= 0 ? '#22c55e' : '#ef4444' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
