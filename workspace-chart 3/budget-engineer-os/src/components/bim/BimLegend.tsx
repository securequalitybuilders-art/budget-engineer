export function BimLegend() {
  const items = [
    ['Walls', '#1a365d'],
    ['Slabs', '#d4a574'],
    ['Roof', '#8b5cf6'],
    ['Openings', '#06b6d4'],
    ['Blocks / Furniture', '#64748b'],
    ['Selected', '#f59e0b'],
  ];
  return (
    <div style={{ background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Legend</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map(([name, color]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: color as string, display: 'inline-block' }} />
            <span style={{ color: '#cbd5e1', fontSize: 13 }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
