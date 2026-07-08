export function FloorVisibilityPanel({
  floors,
  activeFloorId,
  onChange,
}: {
  floors: { id: string; name: string }[];
  activeFloorId: string | 'all';
  onChange: (id: string | 'all') => void;
}) {
  return (
    <div style={{ background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Floor Visibility</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={() => onChange('all')} style={chip(activeFloorId === 'all')}>All Floors</button>
        {floors.map((floor) => (
          <button key={floor.id} onClick={() => onChange(floor.id)} style={chip(activeFloorId === floor.id)}>{floor.name}</button>
        ))}
      </div>
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    background: active ? '#d4a574' : '#0b1220',
    color: active ? '#111827' : '#e2e8f0',
    border: '1px solid #30425f',
    padding: '8px 10px',
    borderRadius: 999,
    cursor: 'pointer',
  };
}
