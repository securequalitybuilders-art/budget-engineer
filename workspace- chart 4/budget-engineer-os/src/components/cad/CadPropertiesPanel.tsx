import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';

export function CadPropertiesPanel() {
  const state = useAppStore();
  const selectedIds = state.selectedElementIds;

  // Single Wall states
  const [thickness, setThickness] = useState(0.2);
  const [structural, setStructural] = useState(true);
  
  // Stage 26 Grouped Wall states
  const [batchThickness, setBatchThickness] = useState(0.2);
  const [batchHeight, setBatchHeight] = useState(3.0);
  const [batchStructural, setBatchStructural] = useState(true);
  const [batchMaterial, setBatchMaterial] = useState('Concrete (IfcWallStandardCase)');

  const cadWallIds = selectedIds.map(id => id.replace(/^bim-/, '')).filter(id => state.cadDoc.walls.some(w => w.id === id));
  const cadOpeningIds = selectedIds.map(id => id.replace(/^bim-/, '')).filter(id => state.cadDoc.openings.some(o => o.id === id));

  const floorCols = state.cadDoc.blocks.filter(b => b.floorId === state.activeFloorId && (b.kind === 'column' || b.metadata?.ifcClass === 'IfcColumnStandardCase'));

  if (selectedIds.length === 0) {
    return (
      <div className="space-y-4">
        {/* Stage 30 Auto Columns Generator */}
        <div className="bg-[#111c31] border border-[#1a365d] rounded-xl p-4 text-[#e2e8f0] shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[#24324b] mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] animate-ping"></span>
              <h3 className="font-bold text-[#f8fafc]">Automated Structural Column Grid Generator</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-[#1a365d] text-[#7dd3fc]">Stage 30</span>
          </div>

          <p className="text-xs text-[#94a3b8] mb-4">
            Analyze structural load-bearing wall geometry on the active floor and automatically place reinforced concrete column foundations at corner intersections (<strong className="text-[#06B6D4] font-mono">{floorCols.length} columns active</strong>).
          </p>

          <button
            onClick={() => state.generateStructuralColumns(state.activeFloorId)}
            className="w-full py-2.5 px-4 rounded-lg font-bold bg-[#1a365d] hover:bg-[#06B6D4] hover:text-[#0b1220] text-[#7dd3fc] transition shadow flex items-center justify-center gap-2"
          >
            🏛 Auto-Place Structural Columns at Corners
          </button>
        </div>

        <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#94a3b8] text-sm flex items-center justify-center shadow-lg">
          Click any wall, opening, or object in the 2D CAD canvas or 3D BIM viewer to inspect and edit properties.
        </div>
      </div>
    );
  }

  // STAGE 27: Corner & Intersection Solver (Exactly 2 walls selected)
  if (cadWallIds.length === 2) {
    return (
      <div className="space-y-4">
        <div className="bg-[#111c31] border border-[#8B5CF6] rounded-xl p-4 text-[#e2e8f0] shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[#24324b] mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] animate-pulse"></span>
              <h3 className="font-bold text-[#f8fafc] text-base">Corner & Intersection Solver (2 walls selected)</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-[#1a365d] text-[#7dd3fc] border border-[#8B5CF6]/30">Stage 27</span>
          </div>

          <p className="text-xs text-[#94a3b8] mb-4">
            Automatically calculate orthogonal intersection coordinates and fillet join walls <strong className="text-[#f8fafc] font-mono">{cadWallIds[0]}</strong> & <strong className="text-[#f8fafc] font-mono">{cadWallIds[1]}</strong>.
          </p>

          <button
            onClick={() => state.trimExtendCadWalls(cadWallIds[0], cadWallIds[1])}
            className="w-full py-2.5 px-4 rounded-lg font-bold bg-[#8B5CF6] hover:bg-[#a78bfa] text-[#f8fafc] transition shadow-lg shadow-[#8B5CF6]/20 flex items-center justify-center gap-2"
          >
            ✂ Trim / Join Both Walls at Corner Intersection
          </button>
        </div>

        {/* Stage 26 Group Wall Properties */}
        <div className="bg-[#111c31] border border-[#06B6D4] rounded-xl p-4 text-[#e2e8f0] shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[#24324b] mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] animate-pulse"></span>
              <h3 className="font-bold text-[#f8fafc] text-base">Group Wall Properties (2 walls selected)</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-[#1a365d] text-[#7dd3fc] border border-[#06B6D4]/30">Stage 26</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1">Thickness (m)</label>
              <input
                type="number" step="0.05"
                className="w-full bg-[#0b1220] border border-[#24324b] rounded px-3 py-1.5 text-sm text-[#f8fafc] focus:outline-none focus:border-[#06B6D4]"
                value={batchThickness}
                onChange={e => setBatchThickness(parseFloat(e.target.value) || 0.2)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1">Height (m)</label>
              <input
                type="number" step="0.1"
                className="w-full bg-[#0b1220] border border-[#24324b] rounded px-3 py-1.5 text-sm text-[#f8fafc] focus:outline-none focus:border-[#06B6D4]"
                value={batchHeight}
                onChange={e => setBatchHeight(parseFloat(e.target.value) || 3.0)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#94a3b8] mb-1">IFC Material / Classification</label>
              <select
                className="w-full bg-[#0b1220] border border-[#24324b] rounded px-3 py-1.5 text-sm text-[#f8fafc] focus:outline-none focus:border-[#06B6D4]"
                value={batchMaterial}
                onChange={e => setBatchMaterial(e.target.value)}
              >
                <option value="Concrete (IfcWallStandardCase)">Concrete (IfcWallStandardCase)</option>
                <option value="Masonry Brick (IfcWallStandardCase)">Masonry Brick (IfcWallStandardCase)</option>
                <option value="Timber Stud (IfcWall)">Timber Stud (IfcWall)</option>
                <option value="Glass Partition (IfcCurtainWall)">Glass Partition (IfcCurtainWall)</option>
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-2.5 pt-1">
              <input
                type="checkbox" id="batchStrc2"
                checked={batchStructural}
                onChange={e => setBatchStructural(e.target.checked)}
                className="rounded bg-[#0b1220] border-[#24324b] text-[#06B6D4]"
              />
              <label htmlFor="batchStrc2" className="text-sm text-[#f8fafc] cursor-pointer">Load-bearing Structural Wall Construction</label>
            </div>
          </div>

          <button
            onClick={() => {
              state.updateCadWallsProps(cadWallIds, {
                thickness: batchThickness,
                height: batchHeight,
                structural: batchStructural,
                material: batchMaterial
              });
            }}
            className="w-full py-2.5 px-4 rounded-lg font-bold bg-[#06B6D4] hover:bg-[#7dd3fc] text-[#0b1220] transition shadow-lg shadow-[#06B6D4]/20 flex items-center justify-center gap-2"
          >
            Apply Group Edits to 2 Highlighted Walls
          </button>
        </div>
      </div>
    );
  }

  // STAGE 26: Grouped Property Edits for Selected Walls (> 2 walls)
  if (cadWallIds.length > 2) {
    return (
      <div className="bg-[#111c31] border border-[#06B6D4] rounded-xl p-4 text-[#e2e8f0] shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-[#24324b] mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] animate-pulse"></span>
            <h3 className="font-bold text-[#f8fafc] text-base">Group Wall Properties ({cadWallIds.length} walls selected)</h3>
          </div>
          <span className="text-xs px-2 py-0.5 rounded font-semibold bg-[#1a365d] text-[#7dd3fc] border border-[#06B6D4]/30">Stage 26</span>
        </div>

        <p className="text-xs text-[#94a3b8] mb-4">
          Simultaneously update physical engineering parameters and IFC material classification across all {cadWallIds.length} highlighted walls.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-[#94a3b8] mb-1">Thickness (m)</label>
            <input
              type="number" step="0.05"
              className="w-full bg-[#0b1220] border border-[#24324b] rounded px-3 py-1.5 text-sm text-[#f8fafc] focus:outline-none focus:border-[#06B6D4]"
              value={batchThickness}
              onChange={e => setBatchThickness(parseFloat(e.target.value) || 0.2)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#94a3b8] mb-1">Height (m)</label>
            <input
              type="number" step="0.1"
              className="w-full bg-[#0b1220] border border-[#24324b] rounded px-3 py-1.5 text-sm text-[#f8fafc] focus:outline-none focus:border-[#06B6D4]"
              value={batchHeight}
              onChange={e => setBatchHeight(parseFloat(e.target.value) || 3.0)}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#94a3b8] mb-1">IFC Material / Classification</label>
            <select
              className="w-full bg-[#0b1220] border border-[#24324b] rounded px-3 py-1.5 text-sm text-[#f8fafc] focus:outline-none focus:border-[#06B6D4]"
              value={batchMaterial}
              onChange={e => setBatchMaterial(e.target.value)}
            >
              <option value="Concrete (IfcWallStandardCase)">Concrete (IfcWallStandardCase)</option>
              <option value="Masonry Brick (IfcWallStandardCase)">Masonry Brick (IfcWallStandardCase)</option>
              <option value="Timber Stud (IfcWall)">Timber Stud (IfcWall)</option>
              <option value="Glass Partition (IfcCurtainWall)">Glass Partition (IfcCurtainWall)</option>
            </select>
          </div>
          <div className="col-span-2 flex items-center gap-2.5 pt-1">
            <input
              type="checkbox" id="batchStrc"
              checked={batchStructural}
              onChange={e => setBatchStructural(e.target.checked)}
              className="rounded bg-[#0b1220] border-[#24324b] text-[#06B6D4]"
            />
            <label htmlFor="batchStrc" className="text-sm text-[#f8fafc] cursor-pointer">Load-bearing Structural Wall Construction</label>
          </div>
        </div>

        <button
          onClick={() => {
            state.updateCadWallsProps(cadWallIds, {
              thickness: batchThickness,
              height: batchHeight,
              structural: batchStructural,
              material: batchMaterial
            });
          }}
          className="w-full py-2.5 px-4 rounded-lg font-bold bg-[#06B6D4] hover:bg-[#7dd3fc] text-[#0b1220] transition shadow-lg shadow-[#06B6D4]/20 flex items-center justify-center gap-2"
        >
          Apply Group Edits to {cadWallIds.length} Highlighted Walls
        </button>
      </div>
    );
  }

  // Single Wall Properties
  if (cadWallIds.length === 1) {
    const wall = state.cadDoc.walls.find(w => w.id === cadWallIds[0]);
    if (!wall) return null;
    const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    const hostedOps = state.cadDoc.openings.filter(o => o.wallId === wall.id);

    return (
      <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-[#24324b] mb-4">
          <h3 className="font-bold text-[#f8fafc]">{wall.name} (Wall)</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-[#1a365d] text-[#7dd3fc] font-mono">{len.toFixed(2)}m long</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-[#94a3b8] mb-1">Thickness (m)</label>
            <input
              type="number" step="0.05"
              className="w-full bg-[#0b1220] border border-[#24324b] rounded px-2.5 py-1 text-sm text-[#f8fafc]"
              defaultValue={wall.thickness}
              onChange={e => state.updateCadWallProps(wall.id, { thickness: parseFloat(e.target.value) || 0.2 })}
            />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox" id="sStrc"
              defaultChecked={wall.structural}
              onChange={e => state.updateCadWallProps(wall.id, { structural: e.target.checked })}
              className="rounded bg-[#0b1220] border-[#24324b] text-[#06B6D4]"
            />
            <label htmlFor="sStrc" className="text-sm text-[#e2e8f0]">Structural</label>
          </div>
        </div>

        {/* Hosted Openings */}
        <div className="border-t border-[#24324b] pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#94a3b8]">Hosted Openings ({hostedOps.length})</span>
            <div className="flex gap-2">
              <button onClick={() => state.addCadOpening(wall.id, 'door', len / 2)} className="px-2 py-0.5 text-xs bg-[#22c55e] text-[#0b1220] font-bold rounded">+ Door</button>
              <button onClick={() => state.addCadOpening(wall.id, 'window', len / 2)} className="px-2 py-0.5 text-xs bg-[#06B6D4] text-[#0b1220] font-bold rounded">+ Window</button>
            </div>
          </div>
          {hostedOps.length === 0 ? (
            <p className="text-xs text-[#94a3b8] italic">No doors or windows on this wall.</p>
          ) : (
            <div className="space-y-1.5">
              {hostedOps.map(op => (
                <div key={op.id} className="flex items-center justify-between bg-[#0b1220] px-2.5 py-1.5 rounded text-xs border border-[#24324b]">
                  <span className="font-medium text-[#f8fafc]">{op.name} ({op.kind})</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => state.updateCadOpening(op.id, { kind: op.kind === 'door' ? 'window' : 'door' })} className="text-[#7dd3fc] hover:underline">Swap</button>
                    <button onClick={() => state.deleteCadOpening(op.id)} className="text-[#ef4444] hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Single Opening — Parametric BIM Family Editor (Stage 28)
  if (cadOpeningIds.length === 1) {
    const op = state.cadDoc.openings.find(o => o.id === cadOpeningIds[0]);
    if (!op) return null;
    const props = op.metadata?.properties || {};

    return (
      <div className="bg-[#111c31] border border-[#06B6D4] rounded-xl p-4 text-[#e2e8f0] shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-[#24324b] mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${op.kind === 'door' ? 'bg-[#22c55e]' : 'bg-[#06B6D4]'}`}></span>
            <h3 className="font-bold text-[#f8fafc] text-base">{op.name}</h3>
          </div>
          <div className="flex gap-1.5">
            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-[#1a365d] text-[#7dd3fc]">Stage 28</span>
            <button onClick={() => state.deleteCadOpening(op.id)} className="text-xs px-2 py-0.5 bg-[#ef4444]/20 text-[#fca5a5] font-bold rounded hover:bg-[#ef4444] hover:text-[#f8fafc] transition">Delete</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 bg-[#0b1220] p-3 rounded-lg border border-[#24324b]">
          <div>
            <label className="block text-xs text-[#94a3b8] mb-1">Rough Opening Width (m)</label>
            <input
              type="number" step="0.05"
              className="w-full bg-[#111c31] border border-[#24324b] rounded px-2.5 py-1 text-xs text-[#f8fafc]"
              defaultValue={op.width}
              onChange={e => state.updateCadOpening(op.id, { width: parseFloat(e.target.value) || 0.9 })}
            />
          </div>
          <div>
            <label className="block text-xs text-[#94a3b8] mb-1">Classification Kind</label>
            <select
              className="w-full bg-[#111c31] border border-[#24324b] rounded px-2.5 py-1 text-xs text-[#f8fafc]"
              defaultValue={op.kind}
              onChange={e => state.updateCadOpening(op.id, { kind: e.target.value as any })}
            >
              <option value="door">Door (IfcDoor)</option>
              <option value="window">Window (IfcWindow)</option>
            </select>
          </div>
        </div>

        <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4a574] mb-3">Parametric BIM Family Customization</h4>
        
        {op.kind === 'door' ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1">Frame Width (m)</label>
              <input
                type="number" step="0.01"
                className="w-full bg-[#0b1220] border border-[#24324b] rounded px-2.5 py-1 text-xs text-[#f8fafc]"
                defaultValue={props.frameWidth ?? 0.05}
                onChange={e => state.updateCadOpeningFamily(op.id, { frameWidth: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1">Hardware Handle Style</label>
              <select
                className="w-full bg-[#0b1220] border border-[#24324b] rounded px-2.5 py-1 text-xs text-[#f8fafc]"
                value={props.hardwareStyle ?? 'lever_modern'}
                onChange={e => state.updateCadOpeningFamily(op.id, { hardwareStyle: e.target.value })}
              >
                <option value="lever_modern">Modern Lever (+$45)</option>
                <option value="panic_bar">Commercial Panic Bar (+$180)</option>
                <option value="knob_classic">Classic Brass Knob</option>
                <option value="none">Flush Push Plate</option>
              </select>
            </div>
            <div className="col-span-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#94a3b8]">Glazed Panel Glazing Ratio</span>
                <span className="font-mono text-[#06B6D4] font-bold">{Math.round((parseFloat(props.glazingRatio ?? '0') * 100))}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.1"
                className="w-full accent-[#06B6D4] bg-[#0b1220]"
                value={props.glazingRatio ?? 0}
                onChange={e => state.updateCadOpeningFamily(op.id, { glazingRatio: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-[#94a3b8] mb-1">Leaf Finish Color</label>
              <select
                className="w-full bg-[#0b1220] border border-[#24324b] rounded px-2.5 py-1 text-xs text-[#f8fafc]"
                value={props.finishColor ?? 'Timber Walnut'}
                onChange={e => state.updateCadOpeningFamily(op.id, { finishColor: e.target.value })}
              >
                <option value="Timber Walnut">Timber Walnut Veneer</option>
                <option value="Matt Black">Matt Black Commercial</option>
                <option value="Brushed Steel">Brushed Stainless Steel</option>
                <option value="White Enamel">Gloss White Enamel</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1">Vertical Mullions</label>
              <select
                className="w-full bg-[#0b1220] border border-[#24324b] rounded px-2.5 py-1 text-xs text-[#f8fafc]"
                value={props.mullionCount ?? '0'}
                onChange={e => state.updateCadOpeningFamily(op.id, { mullionCount: e.target.value })}
              >
                <option value="0">Unsubdivided Fixed</option>
                <option value="1">1 Central Mullion</option>
                <option value="2">2 Subdivided Mullions (+$60)</option>
                <option value="3">3 Commercial Mullions (+$60)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1">Glazing Acoustic Specification</label>
              <select
                className="w-full bg-[#0b1220] border border-[#24324b] rounded px-2.5 py-1 text-xs text-[#f8fafc]"
                value={props.glazingType ?? 'Clear Double Glazed'}
                onChange={e => state.updateCadOpeningFamily(op.id, { glazingType: e.target.value })}
              >
                <option value="Clear Double Glazed">Clear Double Glazed</option>
                <option value="Tinted Low-E">Tinted Low-E Solar (+$80)</option>
                <option value="Acoustic Laminated">Acoustic Laminated (+$140)</option>
                <option value="Frosted Privacy">Frosted Privacy Glass</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1">Operation Mode</label>
              <select
                className="w-full bg-[#0b1220] border border-[#24324b] rounded px-2.5 py-1 text-xs text-[#f8fafc]"
                value={props.operation ?? 'casement'}
                onChange={e => state.updateCadOpeningFamily(op.id, { operation: e.target.value })}
              >
                <option value="casement">Side Casement</option>
                <option value="awning">Top Awning</option>
                <option value="sliding">Horizontal Sliding</option>
                <option value="fixed">Fixed Sealed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1">Frame Finish</label>
              <select
                className="w-full bg-[#0b1220] border border-[#24324b] rounded px-2.5 py-1 text-xs text-[#f8fafc]"
                value={props.finishColor ?? 'Matt Black'}
                onChange={e => state.updateCadOpeningFamily(op.id, { finishColor: e.target.value })}
              >
                <option value="Matt Black">Matt Black Powdercoat</option>
                <option value="Anodized Silver">Anodized Silver</option>
                <option value="White Powdercoat">White Powdercoat</option>
              </select>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#94a3b8] text-sm">
      Multiple elements selected ({selectedIds.length}). Highlight walls to perform batch Stage 26 property updates.
    </div>
  );
}
