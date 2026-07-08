import { useEffect, useMemo, useRef, useState } from 'react';
import type { CadDocument, CadWall } from '../../domain/cad';

type DragState =
  | { kind: 'wall'; id: string; ids: string[]; startPx: number; startPy: number; dx: number; dy: number }
  | { kind: 'block'; id: string; ids: string[]; startPx: number; startPy: number; dx: number; dy: number }
  | { kind: 'opening'; id: string; wallId: string; wallLength: number; offset: number }
  | { kind: 'endpoint'; id: string; end: 'start' | 'end'; mx: number; my: number }
  | null;

type Tool = 'select' | 'move' | 'addWall' | 'delete';

type Props = {
  cad: CadDocument;
  activeFloorId: string | 'all';
  selectedElementId?: string;
  selectedElementIds?: string[];
  onSelect: (bimId?: string) => void;
  onSelectMany?: (bimIds: string[]) => void;
  onDuplicateSelection?: (bimIds: string[], dx?: number, dy?: number) => void;
  onExportSvg: (floorId: string) => void;
  onExportDxf: (floorId: string) => void;
  onMoveWall?: (wallId: string, dxMeters: number, dyMeters: number) => void;
  onMoveWalls?: (wallIds: string[], dxMeters: number, dyMeters: number) => void;
  onMoveBlock?: (blockId: string, xMeters: number, yMeters: number) => void;
  onMoveBlocks?: (blockIds: string[], dxMeters: number, dyMeters: number) => void;
  onMoveWallEndpoint?: (wallId: string, end: 'start' | 'end', xMeters: number, yMeters: number) => void;
  onMoveOpening?: (openingId: string, offsetMeters: number) => void;
  onAddWall?: (floorId: string, start: { x: number; y: number }, end: { x: number; y: number }) => void;
  onDeleteElement?: (kind: 'wall' | 'block', id: string) => void;
  onDeleteElements?: (items: { kind: 'wall' | 'block'; id: string }[]) => void;
};

const SCALE = 38;
const MARGIN = 48;
const GRID_M = 0.5; // snap resolution in metres

function wallCenter(w: CadWall) {
  return { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
}
function wallLength(w: CadWall) {
  return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
}
function snap(v: number, on: boolean) {
  return on ? Math.round(v / GRID_M) * GRID_M : Math.round(v * 100) / 100;
}
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(v, max));
}

export function CadPlanView({ cad, activeFloorId, selectedElementId, selectedElementIds = [], onSelect, onSelectMany, onDuplicateSelection, onExportSvg, onExportDxf, onMoveWall, onMoveWalls, onMoveBlock, onMoveBlocks, onMoveWallEndpoint, onMoveOpening, onAddWall, onDeleteElement, onDeleteElements }: Props) {
  const resolvedFloorId = activeFloorId === 'all' ? cad.floors[0]?.id : activeFloorId;
  const [showDims, setShowDims] = useState(true);
  const [tool, setTool] = useState<Tool>('select');
  const [snapOn, setSnapOn] = useState(true);
  const [drag, setDrag] = useState<DragState>(null);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [duplicateNudge, setDuplicateNudge] = useState({ dx: 1, dy: 1 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const editable = Boolean(onMoveWall && onMoveBlock);
  const selectedSet = useMemo(() => new Set(selectedElementIds), [selectedElementIds]);

  const { walls, openings, blocks, W, H, tx, ty, mxFromPx, myFromPy } = useMemo(() => {
    const fId = resolvedFloorId;
    const walls = cad.walls.filter((w) => w.floorId === fId);
    const openings = cad.openings.filter((o) => o.floorId === fId);
    const blocks = cad.blocks.filter((b) => b.floorId === fId);
    const xs = [...walls.flatMap((w) => [w.start.x, w.end.x]), ...blocks.map((b) => b.position.x)];
    const ys = [...walls.flatMap((w) => [w.start.y, w.end.y]), ...blocks.map((b) => b.position.y)];
    const maxX = Math.max(1, ...xs, 8);
    const maxY = Math.max(1, ...ys, 6);
    const W = maxX * SCALE + MARGIN * 2;
    const H = maxY * SCALE + MARGIN * 2;
    const tx = (x: number) => MARGIN + x * SCALE;
    const ty = (y: number) => H - MARGIN - y * SCALE;
    const mxFromPx = (px: number) => (px - MARGIN) / SCALE;
    const myFromPy = (py: number) => (H - MARGIN - py) / SCALE;
    return { walls, openings, blocks, W, H, tx, ty, mxFromPx, myFromPy };
  }, [cad, resolvedFloorId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selectedElementIds.length > 0 && onDuplicateSelection) {
        e.preventDefault();
        onDuplicateSelection(selectedElementIds, duplicateNudge.dx, duplicateNudge.dy);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [duplicateNudge.dx, duplicateNudge.dy, onDuplicateSelection, selectedElementIds]);

  function toSvgPoint(e: React.MouseEvent): { px: number; py: number } {
    const svg = svgRef.current;
    if (!svg) return { px: 0, py: 0 };
    const rect = svg.getBoundingClientRect();
    return { px: (e.clientX - rect.left) * (W / rect.width), py: (e.clientY - rect.top) * (H / rect.height) };
  }
  function toMeters(e: React.MouseEvent) {
    const { px, py } = toSvgPoint(e);
    return { x: snap(mxFromPx(px), snapOn), y: snap(myFromPy(py), snapOn) };
  }

  function resolveDragIds(kind: 'wall' | 'block', id: string): string[] {
    const bimId = `bim-${id}`;
    if (selectedSet.has(bimId)) {
      return selectedElementIds.filter((selId) => kind === 'wall' ? walls.some((w) => `bim-${w.id}` === selId) : blocks.some((b) => `bim-${b.id}` === selId)).map((selId) => selId.replace(/^bim-/, ''));
    }
    return [id];
  }

  function handleSelection(bimId: string, additive: boolean) {
    if (!onSelectMany || !additive) {
      onSelect(bimId);
      return;
    }
    const next = selectedSet.has(bimId) ? selectedElementIds.filter((id) => id !== bimId) : [...selectedElementIds, bimId];
    onSelectMany(next);
  }

  function startMove(kind: 'wall' | 'block', id: string, e: React.MouseEvent) {
    if (tool !== 'move' || !editable) return;
    e.stopPropagation();
    const { px, py } = toSvgPoint(e);
    const ids = resolveDragIds(kind, id);
    setDrag({ kind, id, ids, startPx: px, startPy: py, dx: 0, dy: 0 });
  }
  function startEndpoint(id: string, end: 'start' | 'end', e: React.MouseEvent) {
    if (tool !== 'move' || !onMoveWallEndpoint) return;
    e.stopPropagation();
    const m = toMeters(e);
    setDrag({ kind: 'endpoint', id, end, mx: m.x, my: m.y });
  }
  function startOpening(openingId: string, wallId: string, wallLengthMeters: number, offsetMeters: number, e: React.MouseEvent) {
    if (tool !== 'move' || !onMoveOpening) return;
    e.stopPropagation();
    setDrag({ kind: 'opening', id: openingId, wallId, wallLength: wallLengthMeters, offset: offsetMeters });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (tool === 'addWall') setCursor(toMeters(e));
    if (!drag) return;
    if (drag.kind === 'endpoint') {
      const m = toMeters(e);
      setDrag({ ...drag, mx: m.x, my: m.y });
      return;
    }
    if (drag.kind === 'opening') {
      const wall = walls.find((w) => w.id === drag.wallId);
      const m = toMeters(e);
      if (!wall) return;
      const vx = wall.end.x - wall.start.x;
      const vy = wall.end.y - wall.start.y;
      const len = Math.hypot(vx, vy) || drag.wallLength || 1;
      const proj = ((m.x - wall.start.x) * vx + (m.y - wall.start.y) * vy) / len;
      setDrag({ ...drag, offset: clamp(snap(proj, snapOn), 0, len) });
      return;
    }
    const { px, py } = toSvgPoint(e);
    setDrag({ ...drag, dx: px - drag.startPx, dy: py - drag.startPy });
  }

  function endDrag() {
    if (!drag) return;
    if (drag.kind === 'endpoint') {
      onMoveWallEndpoint?.(drag.id, drag.end, drag.mx, drag.my);
      setDrag(null);
      return;
    }
    if (drag.kind === 'opening') {
      onMoveOpening?.(drag.id, drag.offset);
      setDrag(null);
      return;
    }
    const dxMeters = snap(drag.dx / SCALE, snapOn);
    const dyMeters = snap(-drag.dy / SCALE, snapOn);
    if (Math.abs(dxMeters) > 0.01 || Math.abs(dyMeters) > 0.01) {
      if (drag.kind === 'wall') {
        if (drag.ids.length > 1 && onMoveWalls) onMoveWalls(drag.ids, dxMeters, dyMeters);
        else onMoveWall?.(drag.id, dxMeters, dyMeters);
      } else {
        if (drag.ids.length > 1 && onMoveBlocks) onMoveBlocks(drag.ids, dxMeters, dyMeters);
        else {
          const b = blocks.find((x) => x.id === drag.id);
          if (b) onMoveBlock?.(drag.id, b.position.x + dxMeters, b.position.y + dyMeters);
        }
      }
    }
    setDrag(null);
  }

  function onCanvasClick(e: React.MouseEvent) {
    if (tool === 'addWall' && onAddWall && resolvedFloorId) {
      const m = toMeters(e);
      if (!pending) {
        setPending(m);
        return;
      }
      onAddWall(resolvedFloorId, pending, m);
      setPending(null);
      return;
    }
    if (!drag) {
      onSelect(undefined);
      onSelectMany?.([]);
    }
  }

  function handleElementClick(bimId: string, kind: 'wall' | 'block', id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (tool === 'delete') {
      if (selectedSet.has(bimId) && selectedElementIds.length > 1 && onDeleteElements) {
        const items = selectedElementIds
          .map((selId) => selId.replace(/^bim-/, ''))
          .filter((rawId) => walls.some((w) => w.id === rawId) || blocks.some((b) => b.id === rawId))
          .map((rawId) => walls.some((w) => w.id === rawId) ? { kind: 'wall' as const, id: rawId } : { kind: 'block' as const, id: rawId });
        onDeleteElements(items);
        return;
      }
      onDeleteElement?.(kind, id);
      return;
    }
    if (tool === 'select') handleSelection(bimId, e.shiftKey);
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>2D CAD Floor Plan Editor</h3>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{cad.name} · {cad.floors.find((f) => f.id === resolvedFloorId)?.name ?? 'Floor'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btn(false)} onClick={() => resolvedFloorId && onExportSvg(resolvedFloorId)}>Export SVG</button>
          <button style={btn(false)} onClick={() => resolvedFloorId && onExportDxf(resolvedFloorId)}>Export DXF</button>
        </div>
      </div>

      {editable && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <button style={btn(tool === 'select')} onClick={() => { setTool('select'); setPending(null); }}>Select</button>
            <button style={btn(tool === 'move')} onClick={() => { setTool('move'); setPending(null); }}>Move / Reshape</button>
            <button style={btn(tool === 'addWall')} onClick={() => { setTool('addWall'); setPending(null); }}>Add Wall</button>
            <button style={btn(tool === 'delete')} onClick={() => { setTool('delete'); setPending(null); }}>Delete</button>
            <span style={{ width: 1, background: '#24324b' }} />
            <button style={btn(snapOn)} onClick={() => setSnapOn((v) => !v)}>{snapOn ? `Snap ${GRID_M}m: On` : 'Snap: Off'}</button>
            <button style={btn(showDims)} onClick={() => setShowDims((v) => !v)}>{showDims ? 'Dims: On' : 'Dims: Off'}</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8, marginBottom: 10 }}>
            <label style={fieldStyle}><span>Duplicate ΔX (m)</span><input type="number" step="0.5" value={duplicateNudge.dx} onChange={(e) => setDuplicateNudge((v) => ({ ...v, dx: Number(e.target.value) }))} style={inputStyle} /></label>
            <label style={fieldStyle}><span>Duplicate ΔY (m)</span><input type="number" step="0.5" value={duplicateNudge.dy} onChange={(e) => setDuplicateNudge((v) => ({ ...v, dy: Number(e.target.value) }))} style={inputStyle} /></label>
            <button style={btn(Boolean(selectedElementIds.length))} disabled={!selectedElementIds.length} onClick={() => onDuplicateSelection?.(selectedElementIds, duplicateNudge.dx, duplicateNudge.dy)}>Duplicate Selected</button>
            <div style={{ ...shortcutStyle }}>{selectedElementIds.length ? 'Shortcut: Ctrl/Cmd + D' : 'Select items to duplicate'}</div>
          </div>
        </>
      )}

      {tool === 'select' && <div style={{ color: '#7dd3fc', fontSize: 12, marginBottom: 8 }}>Tip: hold Shift while clicking walls/openings/objects to build a multi-selection set. Duplicate from the toolbar or with Ctrl/Cmd + D.</div>}
      {tool === 'addWall' && <div style={{ color: '#7dd3fc', fontSize: 12, marginBottom: 8 }}>{pending ? 'Click to place the wall end point.' : 'Click to place the wall start point.'}</div>}
      {tool === 'move' && <div style={{ color: '#7dd3fc', fontSize: 12, marginBottom: 8 }}>Drag a wall/object to translate, drag cyan endpoint handles to reshape a wall, or drag door/window markers along their host wall to update opening offset. If the dragged item is part of the current multi-selection, the entire selected set moves together. BIM + BOQ regenerate on release.</div>}
      {tool === 'delete' && <div style={{ color: '#fca5a5', fontSize: 12, marginBottom: 8 }}>Click a wall or object to delete it. If it is part of the current multi-selection, the entire selected set is deleted together (openings on deleted walls are removed too).</div>}

      <div style={{ overflow: 'auto', background: '#0b1220', border: '1px solid #24324b', borderRadius: 14, padding: 8 }}>
        <svg
          ref={svgRef}
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', minWidth: '100%', cursor: drag ? 'grabbing' : tool === 'addWall' ? 'crosshair' : 'default', userSelect: 'none' }}
          onClick={onCanvasClick}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={() => { endDrag(); setCursor(null); }}
        >
          <defs>
            <pattern id="cadgrid" width={SCALE * (GRID_M * 2)} height={SCALE * (GRID_M * 2)} patternUnits="userSpaceOnUse">
              <path d={`M ${SCALE * (GRID_M * 2)} 0 L 0 0 0 ${SCALE * (GRID_M * 2)}`} fill="none" stroke="#16243c" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#cadgrid)" />

          {walls.map((w) => {
            const bimId = `bim-${w.id}`;
            const isSel = selectedElementId === bimId || selectedSet.has(bimId);
            const isDragging = drag?.kind === 'wall' && drag.ids.includes(w.id);
            const isEndpoint = drag?.kind === 'endpoint' && drag.id === w.id;
            const ox = isDragging && drag.kind === 'wall' ? drag.dx : 0;
            const oy = isDragging && drag.kind === 'wall' ? drag.dy : 0;
            const sx = isEndpoint && drag.end === 'start' ? drag.mx : w.start.x;
            const sy = isEndpoint && drag.end === 'start' ? drag.my : w.start.y;
            const ex = isEndpoint && drag.end === 'end' ? drag.mx : w.end.x;
            const ey = isEndpoint && drag.end === 'end' ? drag.my : w.end.y;
            return (
              <g key={w.id}>
                <line
                  x1={tx(sx) + ox} y1={ty(sy) + oy} x2={tx(ex) + ox} y2={ty(ey) + oy}
                  stroke={isSel || isDragging || isEndpoint ? '#06b6d4' : w.metadata.properties.structural ? '#e2e8f0' : '#94a3b8'}
                  strokeWidth={Math.max(3, w.thickness * SCALE)}
                  strokeLinecap="round"
                  style={{ cursor: tool === 'move' ? 'grab' : tool === 'delete' ? 'not-allowed' : 'pointer' }}
                  onMouseDown={(e) => startMove('wall', w.id, e)}
                  onClick={(e) => handleElementClick(bimId, 'wall', w.id, e)}
                >
                  <title>{w.name} · {wallLength(w).toFixed(2)}m</title>
                </line>
                {tool === 'move' && onMoveWallEndpoint && (
                  <>
                    <circle cx={tx(sx) + ox} cy={ty(sy) + oy} r={6} fill="#06b6d4" stroke="#0b1220" strokeWidth="2" style={{ cursor: 'grab' }} onMouseDown={(e) => startEndpoint(w.id, 'start', e)} />
                    <circle cx={tx(ex) + ox} cy={ty(ey) + oy} r={6} fill="#06b6d4" stroke="#0b1220" strokeWidth="2" style={{ cursor: 'grab' }} onMouseDown={(e) => startEndpoint(w.id, 'end', e)} />
                  </>
                )}
              </g>
            );
          })}

          {openings.map((o) => {
            const wall = walls.find((w) => w.id === o.wallId);
            if (!wall) return null;
            const len = wallLength(wall);
            const activeOffset = drag?.kind === 'opening' && drag.id === o.id ? drag.offset : o.offset;
            const t = len ? activeOffset / len : 0;
            const px = wall.start.x + (wall.end.x - wall.start.x) * t;
            const py = wall.start.y + (wall.end.y - wall.start.y) * t;
            const bimId = `bim-${o.id}`;
            const isSel = selectedElementId === bimId || selectedSet.has(bimId);
            const isDragging = drag?.kind === 'opening' && drag.id === o.id;
            const color = o.kind === 'door' ? '#22c55e' : '#06b6d4';
            return (
              <g
                key={o.id}
                style={{ cursor: tool === 'move' ? 'grab' : 'pointer' }}
                onMouseDown={(e) => startOpening(o.id, o.wallId, len, o.offset, e)}
                onClick={(e) => { e.stopPropagation(); if (tool === 'select') handleSelection(bimId, e.shiftKey); }}
              >
                <circle cx={tx(px)} cy={ty(py)} r={isDragging ? 10 : 8} fill={isSel || isDragging ? '#f8fafc' : color} stroke="#0b1220" strokeWidth="2" />
                <text x={tx(px)} y={ty(py) - 14} fill={isDragging ? '#f8fafc' : '#94a3b8'} fontSize="10" textAnchor="middle">{activeOffset.toFixed(2)}m</text>
                <title>{o.name} ({o.kind}) · {o.width.toFixed(2)}m · offset {activeOffset.toFixed(2)}m</title>
              </g>
            );
          })}

          {blocks.map((b) => {
            const bimId = `bim-${b.id}`;
            const isSel = selectedElementId === bimId || selectedSet.has(bimId);
            const isDragging = drag?.kind === 'block' && drag.ids.includes(b.id);
            const ox = isDragging && drag.kind === 'block' ? drag.dx : 0;
            const oy = isDragging && drag.kind === 'block' ? drag.dy : 0;
            return (
              <g
                key={b.id}
                style={{ cursor: tool === 'move' ? 'grab' : tool === 'delete' ? 'not-allowed' : 'pointer' }}
                onMouseDown={(e) => startMove('block', b.id, e)}
                onClick={(e) => handleElementClick(bimId, 'block', b.id, e)}
              >
                <rect
                  x={tx(b.position.x) - (b.width * SCALE) / 2 + ox}
                  y={ty(b.position.y) - (b.depth * SCALE) / 2 + oy}
                  width={b.width * SCALE}
                  height={b.depth * SCALE}
                  rx={4}
                  fill={isSel || isDragging ? '#d4a57455' : '#d4a57422'}
                  stroke={isSel || isDragging ? '#f1d2a7' : '#d4a574'}
                  strokeWidth="2"
                />
                <text x={tx(b.position.x) + ox} y={ty(b.position.y) + oy} fill="#f5d7ac" fontSize="11" textAnchor="middle" dominantBaseline="middle">{b.name}</text>
                <title>{b.name}</title>
              </g>
            );
          })}

          {tool === 'addWall' && pending && cursor && (
            <line x1={tx(pending.x)} y1={ty(pending.y)} x2={tx(cursor.x)} y2={ty(cursor.y)} stroke="#22c55e" strokeWidth="3" strokeDasharray="6 4" strokeLinecap="round" />
          )}
          {tool === 'addWall' && pending && (
            <circle cx={tx(pending.x)} cy={ty(pending.y)} r={5} fill="#22c55e" />
          )}

          {showDims && walls.map((w) => {
            const c = wallCenter(w);
            return <text key={`dim-${w.id}`} x={tx(c.x)} y={ty(c.y) - 6} fill="#7dd3fc" fontSize="11" textAnchor="middle">{wallLength(w).toFixed(2)}m</text>;
          })}
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Legend color="#e2e8f0" label="Structural wall" />
          <Legend color="#94a3b8" label="Partition" />
          <Legend color="#22c55e" label="Door" />
          <Legend color="#06b6d4" label="Window" />
          <Legend color="#d4a574" label="Furniture / object" />
        </div>
        <span>{selectedElementIds.length > 1 ? `${selectedElementIds.length} elements selected for grouped operations.` : 'Edits flow CAD → BIM → BOQ and are logged for audit.'}</span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: 'inline-block' }} />{label}</span>;
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const btn = (active: boolean): React.CSSProperties => ({ background: active ? '#06b6d422' : '#0b1220', color: active ? '#7dd3fc' : '#e2e8f0', border: `1px solid ${active ? '#06b6d455' : '#24324b'}`, padding: '8px 10px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13, opacity: active ? 1 : undefined });
const fieldStyle: React.CSSProperties = { display: 'grid', gap: 4, color: '#94a3b8', fontSize: 12 };
const inputStyle: React.CSSProperties = { width: '100%', background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', borderRadius: 10, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' };
const shortcutStyle: React.CSSProperties = { display: 'grid', placeItems: 'center', padding: '8px 10px', borderRadius: 10, border: '1px dashed #24324b', color: '#94a3b8', fontSize: 12, background: '#0b1220' };
