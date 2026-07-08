import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { buildCadDxf, buildCadSvg } from '../../lib/cadExport';

export function CadPlanView() {
  const state = useAppStore();
  const floor = state.cadDoc.floors.find(f => f.id === state.activeFloorId) || state.cadDoc.floors[0];
  const walls = state.cadDoc.walls.filter(w => w.floorId === floor.id);
  const openings = state.cadDoc.openings.filter(o => o.floorId === floor.id);
  const blocks = state.cadDoc.blocks.filter(b => b.floorId === floor.id);

  const [mode, setMode] = useState<'select' | 'move' | 'add' | 'delete' | 'trim'>('select');
  const [trimPrimaryId, setTrimPrimaryId] = useState<string | null>(null);
  const [showDims, setShowDims] = useState(true);
  const [dupDx, setDupDx] = useState(1.0);
  const [dupDy, setDupDy] = useState(1.0);
  const [addStart, setAddStart] = useState<{x:number;y:number}|null>(null);
  const [previewPos, setPreviewPos] = useState<{x:number;y:number}>({x:0,y:0});
  const [dragItem, setDragItem] = useState<{type:'wall'|'block'|'opening'|'endpoint'; id:string; end?:'start'|'end'; startX:number; startY:number}|null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  function getCoords(e: React.MouseEvent) {
    if (!svgRef.current) return {x:0, y:0};
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return {x:0, y:0};
    const sPt = pt.matrixTransform(ctm.inverse());
    let x = (sPt.x - 80) / 40;
    let y = (sPt.y - 80) / (-40) - 10;
    if (state.snapToGrid) {
      x = Math.round(x / state.gridResolution) * state.gridResolution;
      y = Math.round(y / state.gridResolution) * state.gridResolution;
    }
    return {x, y};
  }

  function handleSvgClick(e: React.MouseEvent) {
    const pt = getCoords(e);
    if (mode === 'add') {
      if (!addStart) {
        setAddStart(pt);
      } else {
        state.addCadWall(floor.id, addStart, pt);
        setAddStart(null);
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    const pt = getCoords(e);
    setPreviewPos(pt);
    if (dragItem && mode === 'move') {
      const dx = pt.x - dragItem.startX;
      const dy = pt.y - dragItem.startY;
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        if (dragItem.type === 'wall') {
          const selWalls = state.selectedElementIds.map(id => id.replace(/^bim-/, '')).filter(id => state.cadDoc.walls.some(w => w.id === id));
          if (selWalls.length > 1 && selWalls.includes(dragItem.id)) {
            state.moveCadWalls(selWalls, dx, dy);
          } else {
            state.moveCadWall(dragItem.id, dx, dy);
          }
          setDragItem({ ...dragItem, startX: pt.x, startY: pt.y });
        } else if (dragItem.type === 'block') {
          state.moveCadBlock(dragItem.id, pt.x, pt.y);
          setDragItem({ ...dragItem, startX: pt.x, startY: pt.y });
        } else if (dragItem.type === 'opening') {
          state.moveCadOpening(dragItem.id, pt.x);
        } else if (dragItem.type === 'endpoint' && dragItem.end) {
          state.moveCadWallEndpoint(dragItem.id, dragItem.end, pt.x, pt.y);
        }
      }
    }
  }

  function handleMouseUp() {
    setDragItem(null);
  }

  function handleItemClick(e: React.MouseEvent, bimId: string, cadId: string, kind: 'wall'|'block'|'opening') {
    e.stopPropagation();
    if (mode === 'delete') {
      if (kind === 'opening') state.deleteCadOpening(cadId);
      else state.deleteCadElement(kind, cadId);
      return;
    }
    if (mode === 'trim') {
      if (kind !== 'wall') return;
      if (!trimPrimaryId) {
        setTrimPrimaryId(cadId);
      } else if (trimPrimaryId !== cadId) {
        state.trimExtendCadWalls(trimPrimaryId, cadId);
        setTrimPrimaryId(null);
      }
      return;
    }
    if (e.shiftKey) {
      const exists = state.selectedElementIds.includes(bimId);
      const next = exists ? state.selectedElementIds.filter(id => id !== bimId) : [...state.selectedElementIds, bimId];
      state.setSelectedElements(next);
    } else {
      state.setSelectedElements([bimId]);
    }
  }

  function startDrag(e: React.MouseEvent, type: any, id: string, end?: any) {
    e.stopPropagation();
    if (mode === 'move') {
      const pt = getCoords(e);
      setDragItem({ type, id, end, startX: pt.x, startY: pt.y });
    }
  }

  function exportSvg() {
    const data = buildCadSvg(state.cadDoc, floor.id);
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cad-plan-${floor.id}.svg`;
    a.click(); URL.revokeObjectURL(url);
  }

  function exportDxf() {
    const data = buildCadDxf(state.cadDoc, floor.id);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cad-plan-${floor.id}.dxf`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#24324b] mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-[#d4a574]"></span>
          <h2 className="font-bold text-[#f8fafc]">2D CAD Drawing Canvas ({floor.name})</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportSvg} className="px-2.5 py-1 text-xs bg-[#1a365d] hover:bg-[#24324b] text-[#7dd3fc] rounded transition">Download SVG</button>
          <button onClick={exportDxf} className="px-2.5 py-1 text-xs bg-[#1a365d] hover:bg-[#24324b] text-[#7dd3fc] rounded transition">Download DXF R12</button>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b1220] p-2 rounded-lg border border-[#24324b] mb-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setMode('select'); setAddStart(null); setTrimPrimaryId(null); }} className={`px-2.5 py-1 text-xs rounded transition ${mode === 'select' ? 'bg-[#06B6D4] text-[#0b1220] font-bold' : 'text-[#94a3b8] hover:bg-[#111c31]'}`}>Select</button>
          <button onClick={() => { setMode('move'); setAddStart(null); setTrimPrimaryId(null); }} className={`px-2.5 py-1 text-xs rounded transition ${mode === 'move' ? 'bg-[#06B6D4] text-[#0b1220] font-bold' : 'text-[#94a3b8] hover:bg-[#111c31]'}`}>Move / Reshape</button>
          <button onClick={() => { setMode('add'); setTrimPrimaryId(null); }} className={`px-2.5 py-1 text-xs rounded transition ${mode === 'add' ? 'bg-[#22c55e] text-[#0b1220] font-bold' : 'text-[#94a3b8] hover:bg-[#111c31]'}`}>+ Add Wall</button>
          <button onClick={() => { setMode('trim'); setAddStart(null); }} className={`px-2.5 py-1 text-xs rounded transition ${mode === 'trim' ? 'bg-[#8B5CF6] text-[#f8fafc] font-bold shadow' : 'text-[#94a3b8] hover:bg-[#111c31]'}`}>✂ Trim / Join</button>
          <button onClick={() => state.generateStructuralColumns(floor.id)} className="px-2.5 py-1 text-xs bg-[#1a365d] hover:bg-[#06B6D4] hover:text-[#0b1220] text-[#7dd3fc] font-bold rounded transition shadow" title="Stage 30 Automated Grid Columns">🏛 Auto Columns</button>
          <button onClick={() => { setMode('delete'); setAddStart(null); setTrimPrimaryId(null); }} className={`px-2.5 py-1 text-xs rounded transition ${mode === 'delete' ? 'bg-[#ef4444] text-[#f8fafc] font-bold' : 'text-[#94a3b8] hover:bg-[#111c31]'}`}>Delete</button>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-[#94a3b8] cursor-pointer">
            <input type="checkbox" checked={state.snapToGrid} onChange={e => state.setSnapToGrid(e.target.checked)} className="rounded bg-[#111c31] border-[#24324b] text-[#06B6D4]" />
            Snap 0.5m
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[#94a3b8] cursor-pointer">
            <input type="checkbox" checked={showDims} onChange={e => setShowDims(e.target.checked)} className="rounded bg-[#111c31] border-[#24324b] text-[#06B6D4]" />
            Dimensions
          </label>
          <button onClick={() => state.duplicateCadSelection(state.selectedElementIds, dupDx, dupDy)} className="px-2 py-1 text-xs bg-[#8B5CF6] hover:bg-[#a78bfa] text-[#f8fafc] rounded font-medium transition" title="Ctrl+D shortcut">Duplicate Selected</button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="bg-[#0b1220] border border-[#24324b] rounded-lg overflow-hidden relative flex items-center justify-center p-2" style={{ height: 420 }}>
        <svg
          ref={svgRef}
          viewBox="-2 -2 18 13"
          width="100%"
          height="100%"
          style={{ background: '#0b1220', cursor: mode === 'add' ? 'crosshair' : mode === 'move' ? 'grab' : mode === 'trim' ? 'cell' : 'default' }}
          onClick={handleSvgClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <defs>
            <pattern id="cadGrid" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#1e293b" strokeWidth="0.03"/>
            </pattern>
          </defs>
          <rect x="-2" y="-2" width="18" height="13" fill="url(#cadGrid)" onClick={() => state.setSelectedElements([])} />

          {/* Coordinate system transform */}
          <g transform="scale(1, -1) translate(0, -9)">
            {/* Walls */}
            {walls.map(w => {
              const bimId = `bim-${w.id}`;
              const isSel = state.selectedElementIds.includes(bimId);
              const isTrimPrimary = mode === 'trim' && trimPrimaryId === w.id;
              const len = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
              const mx = (w.start.x + w.end.x) / 2;
              const my = (w.start.y + w.end.y) / 2;

              return (
                <g key={w.id} onClick={e => handleItemClick(e, bimId, w.id, 'wall')} onMouseDown={e => startDrag(e, 'wall', w.id)}>
                  <line
                    x1={w.start.x} y1={w.start.y} x2={w.end.x} y2={w.end.y}
                    stroke={isTrimPrimary ? '#8B5CF6' : isSel ? '#f59e0b' : w.structural ? '#1a365d' : '#d4a574'}
                    strokeWidth={isTrimPrimary ? w.thickness * 1.5 : w.thickness}
                    strokeDasharray={isTrimPrimary ? '0.3, 0.1' : undefined}
                    strokeLinecap="square"
                    style={{ transition: 'all 0.15s' }}
                  />
                  {/* Reshape Endpoints in Move mode */}
                  {mode === 'move' && isSel && (
                    <>
                      <circle cx={w.start.x} cy={w.start.y} r={0.2} fill="#06B6D4" onMouseDown={e => startDrag(e, 'endpoint', w.id, 'start')} className="cursor-pointer" />
                      <circle cx={w.end.x} cy={w.end.y} r={0.2} fill="#06B6D4" onMouseDown={e => startDrag(e, 'endpoint', w.id, 'end')} className="cursor-pointer" />
                    </>
                  )}
                  {showDims && (
                    <g transform={`translate(${mx}, ${my}) scale(1, -1)`}>
                      <rect x="-0.7" y="-0.2" width="1.4" height="0.4" rx="0.05" fill="#0b1220" opacity="0.8" />
                      <text x="0" y="0.1" fill="#7dd3fc" fontSize="0.25" textAnchor="middle" fontFamily="JetBrains Mono">{len.toFixed(1)}m</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Openings */}
            {openings.map(o => {
              const bimId = `bim-${o.id}`;
              const isSel = state.selectedElementIds.includes(bimId);
              const w = walls.find(wa => wa.id === o.wallId);
              if (!w) return null;
              const len = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) || 1;
              const t = o.offset / len;
              const ox = w.start.x + (w.end.x - w.start.x) * t;
              const oy = w.start.y + (w.end.y - w.start.y) * t;
              const props = o.metadata?.properties || {};
              const hasGlass = o.kind === 'door' && parseFloat(props.glazingRatio || '0') > 0;
              const mullions = parseInt(props.mullionCount || '0');

              return (
                <g key={o.id} onClick={e => handleItemClick(e, bimId, o.id, 'opening')} onMouseDown={e => startDrag(e, 'opening', o.id)} className="cursor-pointer">
                  <circle
                    cx={ox} cy={oy} r={o.width / 2}
                    fill={isSel ? '#f59e0b' : o.kind === 'door' ? '#22c55e' : '#06B6D4'}
                    className="shadow"
                  />
                  {/* Stage 28 Parametric Glass / Mullion Visualization */}
                  {hasGlass && <circle cx={ox} cy={oy} r={o.width / 3} fill="none" stroke="#06B6D4" strokeWidth="0.05" strokeDasharray="0.1, 0.05" />}
                  {o.kind === 'window' && mullions > 0 && (
                    <line x1={ox} y1={oy - o.width/2} x2={ox} y2={oy + o.width/2} stroke="#0b1220" strokeWidth="0.06" />
                  )}
                </g>
              );
            })}

            {/* Blocks & Stage 30 Columns */}
            {blocks.map(b => {
              const bimId = `bim-${b.id}`;
              const isSel = state.selectedElementIds.includes(bimId);
              const isCol = b.kind === 'column' || b.metadata?.ifcClass === 'IfcColumnStandardCase';

              return (
                <g key={b.id} onClick={e => handleItemClick(e, bimId, b.id, 'block')} onMouseDown={e => startDrag(e, 'block', b.id)}>
                  <rect
                    x={b.position.x} y={b.position.y} width={b.width} height={b.depth}
                    fill={isSel ? '#f59e0b' : isCol ? '#1a365d' : '#8B5CF6'}
                    opacity={isSel ? 0.9 : 0.8}
                    rx={isCol ? 0.02 : 0.1}
                    stroke={isSel ? '#f8fafc' : isCol ? '#06B6D4' : '#24324b'}
                    strokeWidth={isCol ? 0.08 : 0.05}
                  />
                  {isCol && (
                    <>
                      <line x1={b.position.x} y1={b.position.y} x2={b.position.x + b.width} y2={b.position.y + b.depth} stroke="#06B6D4" strokeWidth="0.04" />
                      <line x1={b.position.x + b.width} y1={b.position.y} x2={b.position.x} y2={b.position.y + b.depth} stroke="#06B6D4" strokeWidth="0.04" />
                    </>
                  )}
                  {!isCol && (
                    <g transform={`translate(${b.position.x + b.width/2}, ${b.position.y + b.depth/2}) scale(1, -1)`}>
                      <text x="0" y="0.1" fill="#f8fafc" fontSize="0.3" textAnchor="middle" fontFamily="JetBrains Mono">{b.name}</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Rubber-band preview for Add Wall */}
            {mode === 'add' && addStart && (
              <line x1={addStart.x} y1={addStart.y} x2={previewPos.x} y2={previewPos.y} stroke="#22c55e" strokeWidth="0.15" strokeDasharray="0.2, 0.2" />
            )}
          </g>
        </svg>

        <div className="absolute bottom-2 left-2 text-xs bg-[#111c31]/90 border border-[#24324b] px-2.5 py-1 rounded text-[#94a3b8] pointer-events-none">
          {mode === 'add' ? (addStart ? 'Click end coordinate to place wall' : 'Click start coordinate') : mode === 'trim' ? (trimPrimaryId ? `Click second wall to join corner with ${trimPrimaryId}` : 'Click first wall to trim/join corner') : `Cursor: X=${previewPos.x.toFixed(1)}m, Y=${previewPos.y.toFixed(1)}m`}
        </div>
      </div>
    </div>
  );
}
