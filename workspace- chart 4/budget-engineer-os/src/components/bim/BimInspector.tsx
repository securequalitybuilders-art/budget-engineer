import React from 'react';
import { useAppStore } from '../../store/appStore';

export function BimInspector() {
  const state = useAppStore();
  const selIds = state.selectedElementIds;
  if (selIds.length === 0) return null;

  const elems = state.bimModel.elements.filter(e => selIds.includes(e.id));
  if (elems.length === 0) return null;

  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mt-4">
      <h3 className="font-bold text-[#f8fafc] pb-2 border-b border-[#24324b] mb-3">BIM Traceability Inspector ({elems.length} selected)</h3>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {elems.map(el => (
          <div key={el.id} className="bg-[#0b1220] p-2 rounded text-xs border border-[#24324b] flex justify-between">
            <div>
              <span className="font-bold text-[#7dd3fc] block">{el.name} ({el.type})</span>
              <span className="text-[#94a3b8]">{el.metadata.ifcClass} · {el.area.toFixed(2)} m2</span>
            </div>
            <span className="font-mono text-[#d4a574]">ID: {el.cadId}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
