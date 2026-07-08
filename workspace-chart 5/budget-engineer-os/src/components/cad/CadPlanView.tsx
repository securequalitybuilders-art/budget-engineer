import React, { useState, useRef, useCallback, useMemo } from 'react';
import type { CadDocument, CadWall, CadBlock, Vec2 } from '../../domain/cad';
type Tool = 'select' | 'move' | 'addWall' | 'delete' | 'trim';
interface Props {
  cad: CadDocument | null;
  selectedElementId: string | null;
  selectedElementIds: string[];
  activeFloorId: string | null;
  onSelectElement: (id: string | null, shift?: boolean) => void;
  onMoveWall: (wallId: string, dx: number, dy: number) => void;
  onMoveBlock: (blockId: string, x: number, y: number) => void;
  onMoveEndpoint: (wallId: string, end: 'start' | 'end', x: number, y: number) => void;
  onAddWall: (floorId: string, start: Vec2, end: Vec2) => void;
  onDeleteElement: (kind: 'wall' | 'block', id: string) => void;
  onMoveOpening: (openingId: string, offset: number) => void;
  onTrimExtend: (a: string, b: string) => void;
  onGenerateColumns: (floorId: string) => void;
  onGenerateBeams: (floorId: string) => void;
  onGenerateFootings: (floorId: string) => void;
  materialSystem?: 'concrete' | 'steel' | 'timber';
  onSetMaterialSystem?: (system: 'concrete' | 'steel' | 'timber') => void;
}
const SCALE = 40;
const GRID = 0.5;
function roundGrid(n: number, snap: boolean): number { return snap ? Math.round(n / GRID) * GRID : Math.round(n * 100) / 100; }
export default function CadPlanView(props: Props) {
  const [tool, setTool] = useState<Tool>('select');
  const [snap, setSnap] = useState(true);
  const [showDims, setShowDims] = useState(true);
  const [showLoadPath, setShowLoadPath] = useState(false);
  const [localMaterial, setLocalMaterial] = useState<'concrete' | 'steel' | 'timber'>('concrete');
  const { cad, selectedElementId, selectedElementIds, activeFloorId, onSelectElement, onMoveWall, onMoveBlock, onMoveEndpoint, onAddWall, onDeleteElement, onMoveOpening, onTrimExtend, onGenerateColumns, onGenerateBeams, onGenerateFootings, materialSystem: propMaterial, onSetMaterialSystem } = props;
  const activeMaterial = propMaterial || localMaterial;
  const [dragging, setDragging] = useState<{ kind: 'wall' | 'block' | 'endpoint' | 'opening'; id: string; sub?: 'start' | 'end'; origin: Vec2; pointer: Vec2 } | null>(null);
  const [addWallStart, setAddWallStart] = useState<Vec2 | null>(null);
  const [trimA, setTrimA] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const floor = cad?.floors.find(f => f.id === activeFloorId);
  const walls = cad?.walls.filter(w => w.floorId === activeFloorId) || [];
  const openings = cad?.openings.filter(o => o.floorId === activeFloorId) || [];
  const blocks = cad?.blocks.filter(b => b.floorId === activeFloorId) || [];
  const toSvg = (v: Vec2) => ({ x: v.x * SCALE, y: v.y * SCALE });
  const fromSvg = (x: number, y: number): Vec2 => {
    const rect = svgRef.current?.getBoundingClientRect();
    const sx = rect ? x - rect.left : x;
    const sy = rect ? y - rect.top : y;
    return { x: roundGrid(sx / SCALE, snap), y: roundGrid(sy / SCALE, snap) };
  };
  const wallLen = (w: CadWall) => Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
  const wallTangent = (w: CadWall) => { const l = wallLen(w) || 1; return { x: (w.end.x - w.start.x) / l, y: (w.end.y - w.start.y) / l }; };
  const wallNormal = (w: CadWall) => { const t = wallTangent(w); return { x: -t.y, y: t.x }; };
  const materialDensity = (mat: string): number => ({ concrete: 25, steel: 0.5, timber: 6 })[mat] || 25;
  const roofDeadLoad = (mat: string): number => ({ concrete: 3.75, steel: 2.5, timber: 0.9 })[mat] || 3.75;
  const liveLoad = 1.5;
  const wallSelfWeight = (w: CadWall, mat: string): number => {
    const rho = materialDensity(mat);
    const th = w.thickness || 0.2;
    const h = w.height || 3;
    return rho * th * h;
  };
  const tributaryWidth = (w: CadWall, allWalls: CadWall[]): number => {
    const t = wallTangent(w);
    const mid = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
    const isHoriz = Math.abs(t.x) > Math.abs(t.y);
    let minDist = Infinity;
    for (const other of allWalls) {
      if (other.id === w.id || other.id.startsWith('beam-')) continue;
      const ot = wallTangent(other);
      const isParallel = Math.abs(t.x * ot.y - t.y * ot.x) < 0.3;
      if (!isParallel) continue;
      const omid = { x: (other.start.x + other.end.x) / 2, y: (other.start.y + other.end.y) / 2 };
      const dx = omid.x - mid.x, dy = omid.y - mid.y;
      const dist = Math.abs(dx * t.y - dy * t.x);
      if (dist > 0.1 && dist < minDist) minDist = dist;
    }
    return minDist === Infinity ? 2.0 : minDist / 2;
  };
  const computeWallLoad = (w: CadWall, allWalls: CadWall[], mat: string): number => {
    const len = wallLen(w);
    const tw = tributaryWidth(w, allWalls);
    const roofLoad = (roofDeadLoad(mat) + liveLoad) * tw * len;
    const selfWeight = wallSelfWeight(w, mat) * len;
    return Math.round((roofLoad + selfWeight) * 10) / 10;
  };
  const loadPathData = useMemo(() => {
    const wallLoads = new Map<string, number>();
    for (const w of walls) {
      if (!w.structural || w.id.startsWith('beam-')) continue;
      const mat = (w.metadata?.material as string) || 'concrete';
      wallLoads.set(w.id, computeWallLoad(w, walls, mat));
    }
    const colWallLoads = new Map<string, number>();
    for (const col of blocks.filter(b => b.kind === 'column')) {
      let sum = 0;
      for (const w of walls.filter(w => w.structural && !w.id.startsWith('beam-'))) {
        const mid = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
        const cols = blocks.filter(b => b.kind === 'column');
        const nearest = cols.reduce((best, c) => Math.hypot(c.position.x - mid.x, c.position.y - mid.y) < Math.hypot(best.position.x - mid.x, best.position.y - mid.y) ? c : best, cols[0]);
        if (nearest && nearest.id === col.id) sum += wallLoads.get(w.id) || 0;
      }
      colWallLoads.set(col.id, Math.round(sum * 10) / 10);
    }
    const beamLoads = new Map<string, number>();
    for (const b of walls.filter(w => w.id.startsWith('beam-'))) {
      const colS = blocks.find(c => c.kind === 'column' && Math.hypot(c.position.x - b.start.x, c.position.y - b.start.y) < 0.3);
      const colE = blocks.find(c => c.kind === 'column' && Math.hypot(c.position.x - b.end.x, c.position.y - b.end.y) < 0.3);
      const loadS = colS ? colWallLoads.get(colS.id) || 0 : 0;
      const loadE = colE ? colWallLoads.get(colE.id) || 0 : 0;
      beamLoads.set(b.id, Math.round((loadS + loadE) / 2 * 10) / 10);
    }
    const colTotalLoads = new Map<string, number>();
    for (const col of blocks.filter(b => b.kind === 'column')) {
      let sum = colWallLoads.get(col.id) || 0;
      for (const b of walls.filter(w => w.id.startsWith('beam-'))) {
        const nearS = blocks.find(c => c.kind === 'column' && c.id === col.id && Math.hypot(c.position.x - b.start.x, c.position.y - b.start.y) < 0.3);
        const nearE = blocks.find(c => c.kind === 'column' && c.id === col.id && Math.hypot(c.position.x - b.end.x, c.position.y - b.end.y) < 0.3);
        if (nearS || nearE) sum += (beamLoads.get(b.id) || 0) / 2;
      }
      colTotalLoads.set(col.id, Math.round(sum * 10) / 10);
    }
    return { wallLoads, colWallLoads, beamLoads, colTotalLoads };
  }, [walls, blocks]);
  const onSvgDown = useCallback((e: React.MouseEvent) => {
    if (!cad || !floor) return;
    const pos = fromSvg(e.clientX, e.clientY);
    if (tool === 'addWall') { if (!addWallStart) { setAddWallStart(pos); } else { onAddWall(floor.id, addWallStart, pos); setAddWallStart(null); } return; }
    if (tool === 'delete') { return; }
    if (tool === 'trim') { return; }
    const target = (e.target as HTMLElement).getAttribute('data-id');
    if (target) {
      const kind = (e.target as HTMLElement).getAttribute('data-kind') as 'wall' | 'block' | 'opening';
      if (tool === 'select') { onSelectElement(`bim-${target}`, e.shiftKey); return; }
      if (tool === 'move') {
        if (kind === 'wall') { setDragging({ kind: 'wall', id: target, origin: pos, pointer: pos }); onSelectElement(`bim-${target}`, e.shiftKey); }
        if (kind === 'block') { setDragging({ kind: 'block', id: target, origin: pos, pointer: pos }); onSelectElement(`bim-${target}`, e.shiftKey); }
        if (kind === 'opening') { setDragging({ kind: 'opening', id: target, origin: pos, pointer: pos }); onSelectElement(`bim-${target}`, e.shiftKey); }
        return;
      }
    }
    onSelectElement(null, false);
  }, [cad, floor, tool, addWallStart, snap, onSelectElement, onAddWall, onMoveWall, onMoveBlock]);
  const onSvgMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !cad) return;
    const pos = fromSvg(e.clientX, e.clientY);
    if (dragging.kind === 'wall') { const dx = pos.x - dragging.pointer.x; const dy = pos.y - dragging.pointer.y; onMoveWall(dragging.id, dx, dy); setDragging({ ...dragging, pointer: pos }); }
    if (dragging.kind === 'block') { onMoveBlock(dragging.id, pos.x, pos.y); setDragging({ ...dragging, pointer: pos }); }
    if (dragging.kind === 'opening') { const o = cad.openings.find(x => x.id === dragging.id); if (!o) return; const w = cad.walls.find(x => x.id === o.wallId); if (!w) return; const t = wallTangent(w); const proj = (pos.x - w.start.x) * t.x + (pos.y - w.start.y) * t.y; onMoveOpening(dragging.id, Math.max(0.2, Math.min(wallLen(w) - o.width - 0.2, proj))); setDragging({ ...dragging, pointer: pos }); }
  }, [dragging, cad, onMoveWall, onMoveBlock, onMoveOpening]);
  const onSvgUp = useCallback(() => { setDragging(null); }, []);
  const handleEndpointDown = (wallId: string, end: 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation(); if (tool !== 'move') return;
    const w = walls.find(x => x.id === wallId); if (!w) return;
    const pos = fromSvg(e.clientX, e.clientY);
    setDragging({ kind: 'endpoint', id: wallId, sub: end, origin: pos, pointer: pos });
    onSelectElement(`bim-${wallId}`, e.shiftKey);
  };
  const handleEndpointMove = (e: React.MouseEvent) => {
    if (!dragging || dragging.kind !== 'endpoint' || !dragging.sub) return;
    const pos = fromSvg(e.clientX, e.clientY);
    onMoveEndpoint(dragging.id, dragging.sub, pos.x, pos.y);
    setDragging({ ...dragging, pointer: pos });
  };
  if (!cad || !floor) return <div style={{ padding: 20, color: '#94a3b8' }}>No CAD data</div>;
  const bounds = { minX: 0, minY: 0, maxX: 16, maxY: 12 };
  for (const w of walls) { bounds.minX = Math.min(bounds.minX, w.start.x, w.end.x); bounds.minY = Math.min(bounds.minY, w.start.y, w.end.y); bounds.maxX = Math.max(bounds.maxX, w.start.x, w.end.x); bounds.maxY = Math.max(bounds.maxY, w.start.y, w.end.y); }
  const pad = 1; const vw = (bounds.maxX - bounds.minX + pad * 2) * SCALE; const vh = (bounds.maxY - bounds.minY + pad * 2) * SCALE;
  const offX = (bounds.minX - pad) * SCALE; const offY = (bounds.minY - pad) * SCALE;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['select', 'move', 'addWall', 'delete', 'trim'] as Tool[]).map(t => <button key={t} onClick={() => { setTool(t); setTrimA(null); }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #24324b', background: tool === t ? '#1a365d' : '#0b1220', color: tool === t ? '#f8fafc' : '#94a3b8', fontSize: 12 }}>{t === 'select' ? 'Select' : t === 'move' ? 'Move/Reshape' : t === 'addWall' ? 'Add Wall' : t === 'delete' ? 'Delete' : 'Trim/Join'}</button>)}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} /> Snap {GRID}m</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}><input type="checkbox" checked={showDims} onChange={e => setShowDims(e.target.checked)} /> Dims</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}><input type="checkbox" checked={showLoadPath} onChange={e => setShowLoadPath(e.target.checked)} /> Load Path</label>
        <button onClick={() => onGenerateColumns(floor.id)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #24324b', background: '#0b1220', color: '#d4a574', fontSize: 12 }}>🏛 Auto Columns</button>
        <button onClick={() => onGenerateBeams(floor.id)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #24324b', background: '#0b1220', color: '#06B6D4', fontSize: 12 }}>🏗 Auto Beams</button>
        <button onClick={() => onGenerateFootings(floor.id)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #24324b', background: '#0b1220', color: '#22c55e', fontSize: 12 }}>🧱 Auto Footings</button>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {(['concrete','steel','timber'] as const).map(m => (
            <button key={m} onClick={() => { setLocalMaterial(m); onSetMaterialSystem?.(m); }} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #24324b', background: activeMaterial === m ? '#1a365d' : '#0b1220', color: activeMaterial === m ? '#f8fafc' : '#94a3b8', fontSize: 10, textTransform: 'capitalize' }}>{m}</button>
          ))}
        </div>
      </div>
      <svg ref={svgRef} onMouseDown={onSvgDown} onMouseMove={dragging?.kind === 'endpoint' ? handleEndpointMove : onSvgMove} onMouseUp={onSvgUp} onMouseLeave={onSvgUp} viewBox={`0 0 ${vw} ${vh}`} style={{ width: '100%', height: 420, background: '#0b1220', borderRadius: 8, border: '1px solid #24324b', cursor: tool === 'addWall' ? 'crosshair' : dragging ? 'grabbing' : 'default' }}>
        <defs><pattern id="grid" width={GRID * SCALE} height={GRID * SCALE} patternUnits="userSpaceOnUse"><path d={`M ${GRID * SCALE} 0 L 0 0 0 ${GRID * SCALE}`} fill="none" stroke="#1a2b45" strokeWidth={0.5} /></pattern><marker id="arrow-red" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" /></marker><marker id="arrow-orange" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" /></marker><marker id="arrow-yellow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#eab308" /></marker></defs>
        <rect x={0} y={0} width={vw} height={vh} fill="url(#grid)" />
        <g transform={`translate(${-offX}, ${-offY})`}>
          {walls.map(w => {
            const s = toSvg(w.start); const e = toSvg(w.end); const n = wallNormal(w); const th = w.thickness * SCALE; const hw = th / 2;
            const selected = selectedElementId === `bim-${w.id}` || selectedElementIds.includes(`bim-${w.id}`);
            const isBeam = w.id.startsWith('beam-');
            const mat = (w.metadata?.material as string) || 'concrete';
            const materialColor = mat === 'steel' ? '#64748b' : mat === 'timber' ? '#a0522d' : '#1a365d';
            const color = isBeam ? '#06B6D4' : w.structural ? materialColor : '#24324b';
            const stroke = selected ? '#f8fafc' : color;
            const sw = isBeam ? 3 : 2 + (w.thickness || 0.2) * 4;
            return <g key={w.id}>
              <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={stroke} strokeWidth={sw} data-id={w.id} data-kind="wall" style={{ pointerEvents: 'stroke', cursor: tool === 'move' ? 'move' : 'pointer' }} />
              {tool === 'move' && !isBeam && (
                <g>
                  <circle cx={s.x} cy={s.y} r={5} fill={selected ? '#f8fafc' : '#7dd3fc'} stroke="#0b1220" strokeWidth={1} style={{ cursor: 'move' }} onMouseDown={e => handleEndpointDown(w.id, 'start', e)} />
                  <circle cx={e.x} cy={e.y} r={5} fill={selected ? '#f8fafc' : '#7dd3fc'} stroke="#0b1220" strokeWidth={1} style={{ cursor: 'move' }} onMouseDown={e => handleEndpointDown(w.id, 'end', e)} />
                </g>
              )}
              {showDims && !isBeam && (
                <g>
                  <text x={(s.x + e.x) / 2 + n.x * (hw + 14)} y={(s.y + e.y) / 2 + n.y * (hw + 14)} fill="#94a3b8" fontSize={10} textAnchor="middle" dominantBaseline="middle">{wallLen(w).toFixed(2)}m</text>
                  <line x1={(s.x + e.x) / 2 + n.x * (hw + 4)} y1={(s.y + e.y) / 2 + n.y * (hw + 4)} x2={(s.x + e.x) / 2 + n.x * (hw + 10)} y2={(s.y + e.y) / 2 + n.y * (hw + 10)} stroke="#94a3b8" strokeWidth={0.5} />
                </g>
              )}
            </g>;
          })}
          {openings.map(o => {
            const w = walls.find(x => x.id === o.wallId); if (!w) return null;
            const t = wallTangent(w); const n = wallNormal(w); const th = (w.thickness || 0.2) * SCALE; const hw = th / 2;
            const pos = { x: w.start.x + t.x * o.offset, y: w.start.y + t.y * o.offset };
            const sp = toSvg(pos);
            const selected = selectedElementId === `bim-${o.id}`;
            return <g key={o.id} data-id={o.id} data-kind="opening" onMouseDown={(e) => { e.stopPropagation(); if (tool === 'select') { onSelectElement(`bim-${o.id}`, e.shiftKey); } else if (tool === 'move') { setDragging({ kind: 'opening', id: o.id, origin: fromSvg(e.clientX, e.clientY), pointer: fromSvg(e.clientX, e.clientY) }); onSelectElement(`bim-${o.id}`, e.shiftKey); } else if (tool === 'delete') { /* handled by parent */ } }} style={{ cursor: tool === 'move' ? 'ew-resize' : 'pointer' }}>
              <line x1={sp.x - t.x * (o.width * SCALE / 2)} y1={sp.y - t.y * (o.width * SCALE / 2)} x2={sp.x + t.x * (o.width * SCALE / 2)} y2={sp.y + t.y * (o.width * SCALE / 2)} stroke={selected ? '#f8fafc' : o.kind === 'door' ? '#22c55e' : '#06B6D4'} strokeWidth={th + 2} strokeLinecap="butt" />
              <circle cx={sp.x} cy={sp.y} r={3} fill={selected ? '#f8fafc' : '#7dd3fc'} />
            </g>;
          })}
          {blocks.filter(b => b.kind === 'footing').map(b => {
            const p = toSvg(b.position); const w = b.width * SCALE; const d = b.depth * SCALE; const selected = selectedElementId === `bim-${b.id}` || selectedElementIds.includes(`bim-${b.id}`);
            return <g key={b.id} data-id={b.id} data-kind="block" onMouseDown={(e) => { if (tool === 'select') { onSelectElement(`bim-${b.id}`, e.shiftKey); } else if (tool === 'move') { setDragging({ kind: 'block', id: b.id, origin: fromSvg(e.clientX, e.clientY), pointer: fromSvg(e.clientX, e.clientY) }); onSelectElement(`bim-${b.id}`, e.shiftKey); } }} style={{ cursor: tool === 'move' ? 'move' : 'pointer' }}>
              <rect x={p.x - w / 2} y={p.y - d / 2} width={w} height={d} fill="none" stroke={selected ? '#f8fafc' : '#22c55e'} strokeWidth={2} strokeDasharray="4 4" opacity={0.7} />
            </g>;
          })}
          {blocks.filter(b => b.kind !== 'footing').map(b => {
            const p = toSvg(b.position); const w = b.width * SCALE; const d = b.depth * SCALE; const selected = selectedElementId === `bim-${b.id}` || selectedElementIds.includes(`bim-${b.id}`);
            const mat = (b.metadata?.material as string) || 'concrete';
            const materialColor = mat === 'steel' ? '#64748b' : mat === 'timber' ? '#a0522d' : '#1a365d';
            const color = b.kind === 'column' ? materialColor : '#d4a574';
            return <g key={b.id} data-id={b.id} data-kind="block" onMouseDown={(e) => { if (tool === 'select') { onSelectElement(`bim-${b.id}`, e.shiftKey); } else if (tool === 'move') { setDragging({ kind: 'block', id: b.id, origin: fromSvg(e.clientX, e.clientY), pointer: fromSvg(e.clientX, e.clientY) }); onSelectElement(`bim-${b.id}`, e.shiftKey); } }} style={{ cursor: tool === 'move' ? 'move' : 'pointer' }}>
              <rect x={p.x - w / 2} y={p.y - d / 2} width={w} height={d} fill={color} stroke={selected ? '#f8fafc' : '#0b1220'} strokeWidth={1} opacity={0.9} />
              {b.kind === 'column' && (
                <g>
                  <line x1={p.x - w / 2} y1={p.y - d / 2} x2={p.x + w / 2} y2={p.y + d / 2} stroke="#7dd3fc" strokeWidth={1} />
                  <line x1={p.x + w / 2} y1={p.y - d / 2} x2={p.x - w / 2} y2={p.y + d / 2} stroke="#7dd3fc" strokeWidth={1} />
                </g>
              )}
              <text x={p.x} y={p.y - d / 2 - 4} fill="#f8fafc" fontSize={9} textAnchor="middle">{b.name || b.kind}</text>
            </g>;
          })}
          {addWallStart && <line x1={toSvg(addWallStart).x} y1={toSvg(addWallStart).y} x2={toSvg(dragging?.pointer || addWallStart).x} y2={toSvg(dragging?.pointer || addWallStart).y} stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4" />}
          {showLoadPath && (
            <g opacity={0.7}>
              {walls.filter(w => w.structural && !w.id.startsWith('beam-')).map(w => {
                const mid = toSvg({ x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 });
                const cols = blocks.filter(b => b.kind === 'column');
                const targets = cols.length ? cols.map(c => toSvg(c.position)) : [toSvg({ x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 + 0.5 })];
                const nearest = targets.reduce((best, p) => Math.hypot(p.x - mid.x, p.y - mid.y) < Math.hypot(best.x - mid.x, best.y - mid.y) ? p : best, targets[0]);
                const load = loadPathData.wallLoads.get(w.id) || 0;
                const lx = (mid.x + nearest.x) / 2, ly = (mid.y + nearest.y) / 2;
                return <g key={`lp-wall-${w.id}`}><line x1={mid.x} y1={mid.y} x2={nearest.x} y2={nearest.y} stroke="#ef4444" strokeWidth={2} markerEnd="url(#arrow-red)" fill="none" /><rect x={lx - 14} y={ly - 8} width={28} height={14} rx={3} fill="#0b1220" opacity={0.85} /><text x={lx} y={ly + 3} fill="#ef4444" fontSize={8} textAnchor="middle" fontWeight={700}>{load}kN</text></g>;
              })}
              {walls.filter(w => w.id.startsWith('beam-')).map(b => {
                const mid = toSvg({ x: (b.start.x + b.end.x) / 2, y: (b.start.y + b.end.y) / 2 });
                const s = toSvg(b.start); const e = toSvg(b.end);
                const load = loadPathData.beamLoads.get(b.id) || 0;
                return <g key={`lp-beam-${b.id}`}><line x1={mid.x} y1={mid.y} x2={s.x} y2={s.y} stroke="#f59e0b" strokeWidth={2} markerEnd="url(#arrow-orange)" fill="none" /><rect x={(mid.x + s.x) / 2 - 14} y={(mid.y + s.y) / 2 - 8} width={28} height={14} rx={3} fill="#0b1220" opacity={0.85} /><text x={(mid.x + s.x) / 2} y={(mid.y + s.y) / 2 + 3} fill="#f59e0b" fontSize={8} textAnchor="middle" fontWeight={700}>{load}kN</text><line x1={mid.x} y1={mid.y} x2={e.x} y2={e.y} stroke="#f59e0b" strokeWidth={2} markerEnd="url(#arrow-orange)" fill="none" /><rect x={(mid.x + e.x) / 2 - 14} y={(mid.y + e.y) / 2 - 8} width={28} height={14} rx={3} fill="#0b1220" opacity={0.85} /><text x={(mid.x + e.x) / 2} y={(mid.y + e.y) / 2 + 3} fill="#f59e0b" fontSize={8} textAnchor="middle" fontWeight={700}>{load}kN</text></g>;
              })}
              {blocks.filter(b => b.kind === 'column').map(col => {
                const cp = toSvg(col.position);
                const ft = blocks.find(b => b.kind === 'footing' && Math.hypot(b.position.x - col.position.x, b.position.y - col.position.y) < 0.3);
                if (!ft) return null;
                const fp = toSvg(ft.position);
                const totalLoad = loadPathData.colTotalLoads.get(col.id) || 0;
                const lx = (cp.x + fp.x) / 2, ly = (cp.y + fp.y) / 2;
                return <g key={`lp-col-${col.id}`}><line x1={cp.x} y1={cp.y} x2={fp.x} y2={fp.y} stroke="#eab308" strokeWidth={2} markerEnd="url(#arrow-yellow)" fill="none" /><rect x={lx - 16} y={ly - 8} width={32} height={14} rx={3} fill="#0b1220" opacity={0.85} /><text x={lx} y={ly + 3} fill="#eab308" fontSize={8} textAnchor="middle" fontWeight={700}>{totalLoad}kN</text></g>;
              })}
            </g>
          )}
        </g>
      </svg>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#94a3b8' }}>
        <span>Walls: {walls.length}</span><span>Openings: {openings.length}</span><span>Blocks: {blocks.length}</span><span>Beams: {walls.filter(w => w.id.startsWith('beam-')).length}</span><span>Footings: {blocks.filter(b => b.kind === 'footing').length}</span>
      </div>
    </div>
  );
}