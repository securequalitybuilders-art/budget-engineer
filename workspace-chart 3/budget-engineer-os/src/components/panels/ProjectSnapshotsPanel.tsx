import type { ProjectSnapshot } from '../../domain/versioning';

export function ProjectSnapshotsPanel({
  items,
  onCreate,
  onRestore,
}: {
  items: ProjectSnapshot[];
  onCreate: () => void;
  onRestore: (id: string) => void;
}) {
  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={titleStyle}>Project Snapshots</h3>
        <button style={buttonStyle} onClick={onCreate}>Create Snapshot</button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {items.length === 0 ? <div style={mutedStyle}>No snapshots saved yet.</div> : items.map((item) => (
          <div key={item.id} style={itemStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ color: '#f8fafc', fontSize: 13 }}>{item.name}</strong>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>{new Date(item.timestamp).toLocaleString()}</span>
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>{item.notes ?? 'Saved project state snapshot.'}</div>
            <button style={{ ...buttonStyle, marginTop: 8 }} onClick={() => onRestore(item.id)}>Restore</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8' };
const itemStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 12, padding: 10 };
const buttonStyle: React.CSSProperties = { background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', padding: '8px 10px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' };
