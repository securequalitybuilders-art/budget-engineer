import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { buildIfcStep } from '../../lib/ifc/ifcExport';

export function IfcInteropPanel() {
  const state = useAppStore();
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  function exportIfc() {
    const data = buildIfcStep(state.cadDoc);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dzenhare-model.ifc';
    a.click(); URL.revokeObjectURL(url);
    setStatus('Exported IFC4 STEP model successfully.');
  }

  function handleImport() {
    if (!importText.trim()) return;
    const res = state.importCadFromIfc(importText);
    setStatus(res.message);
    if (res.ok) setImportText('');
  }

  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-[#24324b] mb-3">
        <h3 className="font-bold text-[#f8fafc] flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]"></span>
          IFC4 Interoperability (STEP / ISO-10303-21)
        </h3>
        <button onClick={exportIfc} className="px-3 py-1 bg-[#8B5CF6] hover:bg-[#a78bfa] text-[#f8fafc] font-bold rounded text-xs transition shadow">Export .IFC</button>
      </div>

      <div>
        <label className="block text-xs text-[#94a3b8] mb-1">Import IFC Text (Lossless Dzenhare_CAD SPP round-trip)</label>
        <textarea
          className="w-full h-20 bg-[#0b1220] border border-[#24324b] rounded p-2 text-xs font-mono text-[#e2e8f0] focus:outline-none focus:border-[#8B5CF6] mb-2"
          placeholder="Paste ISO-10303-21 IFC text here..."
          value={importText}
          onChange={e => setImportText(e.target.value)}
        />
        <button onClick={handleImport} className="w-full py-1.5 bg-[#1a365d] hover:bg-[#24324b] text-[#7dd3fc] font-semibold text-xs rounded transition">Import IFC Scheme</button>
      </div>

      {status && <p className="text-xs text-[#22c55e] mt-2 font-medium">{status}</p>}
    </div>
  );
}
