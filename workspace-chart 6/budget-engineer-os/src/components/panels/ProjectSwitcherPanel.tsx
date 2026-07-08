import { useState } from 'react';
import { useAppStore } from '../../store/appStore';

export function ProjectSwitcherPanel() {
  const projects = useAppStore((s) => s.projects);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const createProject = useAppStore((s) => s.createProject);
  const openProject = useAppStore((s) => s.openProject);
  const archiveProject = useAppStore((s) => s.archiveProject);
  const renameProject = useAppStore((s) => s.renameProject);
  const [newName, setNewName] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const visible = projects.filter((p) => showArchived || !p.archived);

  return (
    <div className="panel">
      <h3>Projects</h3>
      <p className="sub">{projects.filter((p) => !p.archived).length} active · each scheme has its own CAD / BIM / BOQ</p>

      <div className="btn-row" style={{ marginBottom: 12 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New scheme name"
          style={{ flex: 1, minWidth: 140 }}
          onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) { void createProject(newName); setNewName(''); } }}
        />
        <button
          className="primary"
          onClick={() => { if (newName.trim()) { void createProject(newName); setNewName(''); } }}
        >
          + New Project
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {visible.map((p) => {
          const active = p.id === activeProjectId;
          return (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                borderRadius: 8, background: active ? 'rgba(6,182,212,.10)' : '#0b1220',
                border: `1px solid ${active ? '#06b6d4' : '#24324b'}`, opacity: p.archived ? 0.55 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ color: '#e2e8f0', fontWeight: active ? 700 : 500, cursor: 'pointer' }}
                  onClick={() => { if (!active) void openProject(p.id); }}
                  onDoubleClick={() => {
                    const n = window.prompt('Rename scheme', p.name);
                    if (n) void renameProject(p.id, n);
                  }}
                  title="Click to open · double-click to rename"
                >
                  {p.name} {active && <span className="tag" style={{ marginLeft: 6 }}>active</span>}
                  {p.archived && <span className="tag" style={{ marginLeft: 6, color: '#94a3b8', borderColor: '#475569' }}>archived</span>}
                </div>
                <div className="note">{new Date(p.createdAt).toLocaleDateString()}</div>
              </div>
              {!active && !p.archived && <button onClick={() => void openProject(p.id)}>Open</button>}
              <button onClick={() => void archiveProject(p.id)}>{p.archived ? 'Restore' : 'Archive'}</button>
            </div>
          );
        })}
      </div>

      {projects.some((p) => p.archived) && (
        <label className="note" style={{ display: 'flex', gap: 6, marginTop: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} style={{ width: 'auto' }} />
          Show archived
        </label>
      )}
    </div>
  );
}
