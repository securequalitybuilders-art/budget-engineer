import type { ProjectRecord } from '../../domain/project';

export function ProjectWorkspacePanel({
  items,
  activeProjectId,
  onCreate,
  onOpen,
  onArchive,
}: {
  items: ProjectRecord[];
  activeProjectId?: string;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={titleStyle}>Project Workspace</h3>
        <button style={buttonStyle} onClick={onCreate}>New Project</button>
      </div>
      {items.length === 0 ? <p style={mutedStyle}>No projects in workspace yet.</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item) => (
            <div key={item.id} style={{ ...itemStyle, borderColor: item.id === activeProjectId ? '#d4a57455' : '#24324b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ color: '#f8fafc', fontSize: 13 }}>{item.name}</strong>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>{item.status}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>Updated {new Date(item.updatedAt).toLocaleString()}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={smallButton} onClick={() => onOpen(item.id)}>Open</button>
                {item.status !== 'archived' && <button style={smallButton} onClick={() => onArchive(item.id)}>Archive</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8' };
const itemStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 10, padding: 10 };
const buttonStyle: React.CSSProperties = { background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', padding: '8px 10px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' };
const smallButton: React.CSSProperties = { ...buttonStyle, padding: '6px 8px', fontSize: 12 };
