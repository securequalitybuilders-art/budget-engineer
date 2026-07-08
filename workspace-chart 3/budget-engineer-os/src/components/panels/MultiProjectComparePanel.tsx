import type { ProjectRecord } from '../../domain/project';

export function MultiProjectComparePanel({
  projects,
  leftProjectId,
  rightProjectId,
  onLeft,
  onRight,
}: {
  projects: ProjectRecord[];
  leftProjectId?: string;
  rightProjectId?: string;
  onLeft: (id: string) => void;
  onRight: (id: string) => void;
}) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Multi-Project Compare</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        <select value={leftProjectId ?? ''} onChange={(e) => onLeft(e.target.value)} style={selectStyle}>
          <option value="">Select left project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={rightProjectId ?? ''} onChange={(e) => onRight(e.target.value)} style={selectStyle}>
          <option value="">Select right project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const selectStyle: React.CSSProperties = { background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', padding: '10px 12px', borderRadius: 10 };
