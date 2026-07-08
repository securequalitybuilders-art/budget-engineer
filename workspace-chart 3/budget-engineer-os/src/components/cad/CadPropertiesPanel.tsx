import { useEffect, useState } from 'react';
import type { CadDocument, CadWall, CadOpening } from '../../domain/cad';

type Props = {
  cad: CadDocument;
  selectedElementId?: string;
  onUpdateWallProps: (wallId: string, patch: { thickness?: number; structural?: boolean; name?: string }) => void;
  onUpdateOpening: (openingId: string, patch: { kind?: 'door' | 'window'; width?: number }) => void;
  onAddOpening: (wallId: string, kind: 'door' | 'window', offset: number) => void;
  onDeleteOpening: (openingId: string) => void;
};

// Resolve the selected BIM id (bim-{cadId}) back to its CAD wall/opening.
function resolveCad(cad: CadDocument, selectedElementId?: string): { wall?: CadWall; opening?: CadOpening } {
  if (!selectedElementId) return {};
  const cadId = selectedElementId.replace(/^bim-/, '');
  return { wall: cad.walls.find((w) => w.id === cadId), opening: cad.openings.find((o) => o.id === cadId) };
}

export function CadPropertiesPanel({ cad, selectedElementId, onUpdateWallProps, onUpdateOpening, onAddOpening, onDeleteOpening }: Props) {
  const { wall, opening } = resolveCad(cad, selectedElementId);

  if (!wall && !opening) {
    return (
      <div style={panelStyle}>
        <h3 style={titleStyle}>CAD Properties</h3>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, lineHeight: 1.5 }}>Select a wall or opening in the 2D plan (Select tool) to edit its properties, add doors/windows, or remove openings.</p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>CAD Properties</h3>
      {wall && <WallEditor wall={wall} cad={cad} onUpdateWallProps={onUpdateWallProps} onAddOpening={onAddOpening} onDeleteOpening={onDeleteOpening} onUpdateOpening={onUpdateOpening} />}
      {opening && <OpeningEditor opening={opening} onUpdateOpening={onUpdateOpening} onDeleteOpening={onDeleteOpening} />}
    </div>
  );
}

function WallEditor({ wall, cad, onUpdateWallProps, onAddOpening, onDeleteOpening, onUpdateOpening }: { wall: CadWall; cad: CadDocument; onUpdateWallProps: Props['onUpdateWallProps']; onAddOpening: Props['onAddOpening']; onDeleteOpening: Props['onDeleteOpening']; onUpdateOpening: Props['onUpdateOpening'] }) {
  const [thickness, setThickness] = useState(String(wall.thickness));
  const [name, setName] = useState(wall.name);
  const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  const wallOpenings = cad.openings.filter((o) => o.wallId === wall.id);

  useEffect(() => { setThickness(String(wall.thickness)); setName(wall.name); }, [wall.id, wall.thickness, wall.name]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Field label="Wall">
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => onUpdateWallProps(wall.id, { name })} style={inputStyle} />
      </Field>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>Length: <strong style={{ color: '#7dd3fc' }}>{len.toFixed(2)} m</strong></div>
      <Field label="Thickness (m)">
        <input type="number" step="0.05" min="0.05" value={thickness} onChange={(e) => setThickness(e.target.value)} onBlur={() => { const v = parseFloat(thickness); if (!Number.isNaN(v) && v > 0) onUpdateWallProps(wall.id, { thickness: v }); }} style={inputStyle} />
      </Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', fontSize: 13 }}>
        <input type="checkbox" checked={Boolean(wall.metadata.properties.structural)} onChange={(e) => onUpdateWallProps(wall.id, { structural: e.target.checked })} />
        Structural
      </label>

      <div style={dividerStyle} />
      <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>Openings on this wall</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={addBtn('#22c55e')} onClick={() => onAddOpening(wall.id, 'door', Math.max(0.5, len / 2))}>+ Door</button>
        <button style={addBtn('#06b6d4')} onClick={() => onAddOpening(wall.id, 'window', Math.max(0.5, len / 2))}>+ Window</button>
      </div>
      {wallOpenings.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>No openings yet.</div>}
      {wallOpenings.map((o) => (
        <div key={o.id} style={openingRow}>
          <span style={{ color: '#f8fafc', fontSize: 12 }}>{o.kind} · {o.width.toFixed(2)}m @ {o.offset.toFixed(2)}m</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={miniBtn} onClick={() => onUpdateOpening(o.id, { kind: o.kind === 'door' ? 'window' : 'door' })}>↔ {o.kind === 'door' ? 'Window' : 'Door'}</button>
            <button style={{ ...miniBtn, color: '#fca5a5', borderColor: '#7f1d1d' }} onClick={() => onDeleteOpening(o.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function OpeningEditor({ opening, onUpdateOpening, onDeleteOpening }: { opening: CadOpening; onUpdateOpening: Props['onUpdateOpening']; onDeleteOpening: Props['onDeleteOpening'] }) {
  const [width, setWidth] = useState(String(opening.width));
  useEffect(() => { setWidth(String(opening.width)); }, [opening.id, opening.width]);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Field label="Opening type">
        <select value={opening.kind} onChange={(e) => onUpdateOpening(opening.id, { kind: e.target.value as 'door' | 'window' })} style={inputStyle}>
          <option value="door">Door</option>
          <option value="window">Window</option>
        </select>
      </Field>
      <Field label="Width (m)">
        <input type="number" step="0.1" min="0.3" value={width} onChange={(e) => setWidth(e.target.value)} onBlur={() => { const v = parseFloat(width); if (!Number.isNaN(v) && v > 0) onUpdateOpening(opening.id, { width: v }); }} style={inputStyle} />
      </Field>
      <button style={{ ...addBtn('#ef4444') }} onClick={() => onDeleteOpening(opening.id)}>Delete opening</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 4 }}><span style={{ color: '#94a3b8', fontSize: 12 }}>{label}</span>{children}</label>;
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const inputStyle: React.CSSProperties = { width: '100%', background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', borderRadius: 10, padding: '8px 10px', fontSize: 13 };
const dividerStyle: React.CSSProperties = { height: 1, background: '#24324b', margin: '2px 0' };
const openingRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: '#0b1220', border: '1px solid #24324b', borderRadius: 10, padding: '8px 10px', flexWrap: 'wrap' };
const addBtn = (color: string): React.CSSProperties => ({ background: `${color}22`, color, border: `1px solid ${color}55`, padding: '8px 10px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 });
const miniBtn: React.CSSProperties = { background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', padding: '4px 8px', borderRadius: 8, fontSize: 11, cursor: 'pointer' };
