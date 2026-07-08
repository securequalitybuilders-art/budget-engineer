import React, { useState } from 'react';
import type { CadDocument, CadWall, CadOpening } from '../../domain/cad';
interface Props { cad: CadDocument | null; selectedElementId: string | null; selectedElementIds: string[]; onUpdateWall: (id: string, props: Partial<Pick<CadWall, 'thickness' | 'structural' | 'name' | 'height' | 'material'>>) => void; onUpdateWalls: (ids: string[], props: Partial<Pick<CadWall, 'thickness' | 'structural' | 'name' | 'height' | 'material'>>) => void; onUpdateOpening: (id: string, patch: Partial<Pick<CadOpening, 'kind' | 'width'>>) => void; onUpdateOpeningFamily: (id: string, params: Record<string, string | number | boolean>) => void; onAddOpening: (wallId: string, kind: 'door' | 'window', offset?: number) => void; onDeleteOpening: (id: string) => void; onDeleteElement: (kind: 'wall' | 'block', id: string) => void; onGenerateColumns: (floorId: string) => void; onGenerateBeams: (floorId: string) => void; onGenerateFootings: (floorId: string) => void; onUpdateMaterial: (elementId: string, material: 'concrete' | 'steel' | 'timber') => void; activeFloorId: string | null; }
export default function CadPropertiesPanel(props: Props) {
  const { cad, selectedElementId, selectedElementIds, onUpdateWall, onUpdateWalls, onUpdateOpening, onUpdateOpeningFamily, onAddOpening, onDeleteOpening, onDeleteElement, onGenerateColumns, onGenerateBeams, onGenerateFootings, onUpdateMaterial, activeFloorId } = props;
  const [rejectReason, setRejectReason] = useState('');
  if (!cad) return null;
  const bimId = selectedElementId;
  const cadId = bimId?.replace(/^bim-/, '') || '';
  const wall = cad.walls.find(w => w.id === cadId);
  const opening = cad.openings.find(o => o.id === cadId);
  const block = cad.blocks.find(b => b.id === cadId);
  const selectedWalls = cad.walls.filter(w => selectedElementIds.includes(`bim-${w.id}`));
  const selectedOpenings = cad.openings.filter(o => selectedElementIds.includes(`bim-${o.id}`));
  const isMultiWall = selectedWalls.length > 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {isMultiWall && (
        <div style={{ padding: 12, border: '1px solid #24324b', borderRadius: 8, background: '#111c31' }}>
          <div style={{ fontSize: 12, color: '#7dd3fc', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06B6D4', animation: 'pulse 1s infinite' }} />
            Batch Edit {selectedWalls.length} Walls
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><label style={{ fontSize: 11, color: '#94a3b8' }}>Thickness (m)</label><input type="number" step={0.05} defaultValue={selectedWalls[0]?.thickness || 0.2} onChange={e => onUpdateWalls(selectedWalls.map(w => w.id), { thickness: parseFloat(e.target.value) })} style={{ width: '100%', background: '#0b1220', border: '1px solid #24324b', color: '#f8fafc', borderRadius: 4, padding: '6px 8px', fontSize: 12 }} /></div>
            <div><label style={{ fontSize: 11, color: '#94a3b8' }}>Height (m)</label><input type="number" step={0.1} defaultValue={selectedWalls[0]?.height || 3} onChange={e => onUpdateWalls(selectedWalls.map(w => w.id), { height: parseFloat(e.target.value) })} style={{ width: '100%', background: '#0b1220', border: '1px solid #24324b', color: '#f8fafc', borderRadius: 4, padding: '6px 8px', fontSize: 12 }} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#94a3b8' }}><input type="checkbox" defaultChecked={selectedWalls[0]?.structural} onChange={e => onUpdateWalls(selectedWalls.map(w => w.id), { structural: e.target.checked })} /> Structural</label>
          <button onClick={() => onUpdateWalls(selectedWalls.map(w => w.id), { material: 'Masonry Brick' })} style={{ marginTop: 8, width: '100%', padding: '8px 0', background: '#1a365d', color: '#f8fafc', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Apply Masonry Brick</button>
        </div>
      )}
      {wall && !isMultiWall && (
        <div style={{ padding: 12, border: '1px solid #24324b', borderRadius: 8, background: '#111c31' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 8 }}>{wall.name || 'Wall'} <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>({wall.id})</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div><label style={{ fontSize: 11, color: '#94a3b8' }}>Thickness</label><input type="number" step={0.05} value={wall.thickness} onChange={e => onUpdateWall(wall.id, { thickness: parseFloat(e.target.value) })} style={{ width: '100%', background: '#0b1220', border: '1px solid #24324b', color: '#f8fafc', borderRadius: 4, padding: '6px 8px', fontSize: 12 }} /></div>
            <div><label style={{ fontSize: 11, color: '#94a3b8' }}>Height</label><input type="number" step={0.1} value={wall.height} onChange={e => onUpdateWall(wall.id, { height: parseFloat(e.target.value) })} style={{ width: '100%', background: '#0b1220', border: '1px solid #24324b', color: '#f8fafc', borderRadius: 4, padding: '6px 8px', fontSize: 12 }} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', marginBottom: 8 }}><input type="checkbox" checked={!!wall.structural} onChange={e => onUpdateWall(wall.id, { structural: e.target.checked })} /> Structural</label>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Material</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['concrete','steel','timber'] as const).map(m => (
                <button key={m} onClick={() => onUpdateMaterial(wall.id, m)} style={{ flex: 1, padding: '4px 0', borderRadius: 4, border: '1px solid #24324b', background: (wall.metadata?.material as string) === m ? '#1a365d' : '#0b1220', color: (wall.metadata?.material as string) === m ? '#f8fafc' : '#94a3b8', fontSize: 10, textTransform: 'capitalize' }}>{m}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button onClick={() => onAddOpening(wall.id, 'door', 0.5)} style={{ flex: 1, padding: '6px 0', background: '#0b1220', border: '1px solid #24324b', color: '#22c55e', borderRadius: 6, fontSize: 11 }}>+ Door</button>
            <button onClick={() => onAddOpening(wall.id, 'window', 0.5)} style={{ flex: 1, padding: '6px 0', background: '#0b1220', border: '1px solid #24324b', color: '#06B6D4', borderRadius: 6, fontSize: 11 }}>+ Window</button>
          </div>
          {cad.openings.filter(o => o.wallId === wall.id).map(o => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
              <span>{o.kind}</span><span>{o.width.toFixed(2)}m</span>
              <button onClick={() => onUpdateOpening(o.id, { kind: o.kind === 'door' ? 'window' : 'door' })} style={{ padding: '2px 6px', fontSize: 10, background: '#1a365d', border: 'none', color: '#f8fafc', borderRadius: 4 }}>Swap</button>
              <button onClick={() => onDeleteOpening(o.id)} style={{ padding: '2px 6px', fontSize: 10, background: '#450a0a', border: 'none', color: '#fca5a5', borderRadius: 4 }}>Delete</button>
            </div>
          ))}
          <button onClick={() => onDeleteElement('wall', wall.id)} style={{ width: '100%', marginTop: 6, padding: '6px 0', background: '#450a0a', border: 'none', color: '#fca5a5', borderRadius: 6, fontSize: 11 }}>Delete Wall</button>
        </div>
      )}
      {opening && (
        <div style={{ padding: 12, border: '1px solid #24324b', borderRadius: 8, background: '#111c31' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 8 }}>{opening.name || opening.kind} <span style={{ fontSize: 10, color: '#94a3b8' }}>({opening.id})</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div><label style={{ fontSize: 11, color: '#94a3b8' }}>Kind</label><select value={opening.kind} onChange={e => onUpdateOpening(opening.id, { kind: e.target.value as 'door' | 'window' })} style={{ width: '100%', background: '#0b1220', border: '1px solid #24324b', color: '#f8fafc', borderRadius: 4, padding: '6px 8px', fontSize: 12 }}><option value="door">Door</option><option value="window">Window</option></select></div>
            <div><label style={{ fontSize: 11, color: '#94a3b8' }}>Width (m)</label><input type="number" step={0.05} value={opening.width} onChange={e => onUpdateOpening(opening.id, { width: parseFloat(e.target.value) })} style={{ width: '100%', background: '#0b1220', border: '1px solid #24324b', color: '#f8fafc', borderRadius: 4, padding: '6px 8px', fontSize: 12 }} /></div>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Hardware / Family</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => onUpdateOpeningFamily(opening.id, { hardware: 'Commercial Panic Bar', hardwareCost: 180 })} style={{ padding: '4px 8px', fontSize: 10, background: '#0b1220', border: '1px solid #24324b', color: '#f8fafc', borderRadius: 4 }}>Panic Bar ($180)</button>
            <button onClick={() => onUpdateOpeningFamily(opening.id, { hardware: 'Modern Lever', hardwareCost: 45 })} style={{ padding: '4px 8px', fontSize: 10, background: '#0b1220', border: '1px solid #24324b', color: '#f8fafc', borderRadius: 4 }}>Lever ($45)</button>
            <button onClick={() => onUpdateOpeningFamily(opening.id, { glazingRatio: 0.8, solarPanel: true, solarCost: 120 })} style={{ padding: '4px 8px', fontSize: 10, background: '#0b1220', border: '1px solid #24324b', color: '#f8fafc', borderRadius: 4 }}>80% Glazing (+$120)</button>
          </div>
          <button onClick={() => onDeleteOpening(opening.id)} style={{ width: '100%', marginTop: 8, padding: '6px 0', background: '#450a0a', border: 'none', color: '#fca5a5', borderRadius: 6, fontSize: 11 }}>Delete Opening</button>
        </div>
      )}
      {block && (
        <div style={{ padding: 12, border: '1px solid #24324b', borderRadius: 8, background: '#111c31' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 8 }}>{block.name || block.kind} <span style={{ fontSize: 10, color: '#94a3b8' }}>({block.id})</span></div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{block.width.toFixed(2)} × {block.depth.toFixed(2)} m</div>
          {block.kind === 'column' && (
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Material</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['concrete','steel','timber'] as const).map(m => (
                  <button key={m} onClick={() => onUpdateMaterial(block.id, m)} style={{ flex: 1, padding: '4px 0', borderRadius: 4, border: '1px solid #24324b', background: (block.metadata?.material as string) === m ? '#1a365d' : '#0b1220', color: (block.metadata?.material as string) === m ? '#f8fafc' : '#94a3b8', fontSize: 10, textTransform: 'capitalize' }}>{m}</button>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => onDeleteElement('block', block.id)} style={{ width: '100%', marginTop: 8, padding: '6px 0', background: '#450a0a', border: 'none', color: '#fca5a5', borderRadius: 6, fontSize: 11 }}>Delete Block</button>
        </div>
      )}
      {!wall && !opening && !block && !isMultiWall && (
        <div style={{ padding: 12, border: '1px solid #24324b', borderRadius: 8, background: '#111c31' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 8 }}>Generate Structural Frame</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Auto-place structural elements for {activeFloorId || 'current floor'}</div>
          <button onClick={() => activeFloorId && onGenerateColumns(activeFloorId)} style={{ width: '100%', marginBottom: 8, padding: '8px 0', background: '#1a365d', color: '#f8fafc', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>🏛 Auto Columns</button>
          <button onClick={() => activeFloorId && onGenerateBeams(activeFloorId)} style={{ width: '100%', marginBottom: 8, padding: '8px 0', background: '#06B6D4', color: '#0b1220', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🏗 Auto Beams</button>
          <button onClick={() => activeFloorId && onGenerateFootings(activeFloorId)} style={{ width: '100%', padding: '8px 0', background: '#22c55e', color: '#0b1220', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🧱 Auto Footings</button>
          <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>Beams connect columns and link walls into a structural grid. Footings anchor columns to the ground.</div>
        </div>
      )}
    </div>
  );
}