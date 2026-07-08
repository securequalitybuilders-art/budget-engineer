import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { computeMepTakeoff, MepTakeoffSummary } from '../../lib/mepTakeoff';

export function MepTakeoffPanel() {
  const state = useAppStore();
  const bim = state.bimModel;
  const [data, setData] = useState<MepTakeoffSummary | null>(null);

  useEffect(() => {
    setData(computeMepTakeoff(bim));
  }, [bim]);

  if (!data) return null;

  const isEnabled = state.cadDoc.mepEnabled === true;

  return (
    <div className="bg-[#111c31] border border-[#06B6D4] rounded-xl p-4 text-[#e2e8f0] shadow-xl relative overflow-hidden mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#24324b] mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#06B6D4] animate-ping shadow-lg shadow-[#06B6D4]/50"></span>
          <h3 className="font-bold text-[#f8fafc] text-base">Automated MEP Services Points Takeoff (Stage 33)</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded font-bold bg-[#1a365d] text-[#7dd3fc] border border-[#06B6D4]/40">Stage 33</span>
      </div>

      <p className="text-xs text-[#94a3b8] mb-4">
        Derive mechanical, electrical, and plumbing fixture quantities automatically from spatial room schedules and Dzenhare CWICR density standards.
      </p>

      {/* Trigger CTA */}
      {!isEnabled && (
        <div className="bg-[#0b1220] p-3 rounded-lg border border-[#06B6D4]/50 mb-4 text-center">
          <p className="text-xs text-[#7dd3fc] font-bold mb-2">MEP services line items are inactive in the primary BOQ schedule.</p>
          <button
            onClick={() => state.calculateMepTakeoff()}
            className="py-2 px-6 rounded-lg font-extrabold bg-[#06B6D4] hover:bg-[#7dd3fc] text-[#0b1220] transition shadow-lg flex items-center justify-center gap-2 mx-auto"
          >
            ⚡ Auto-Calculate MEP Schedule & Append to BOQ
          </button>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Power Outlets</span>
          <span className="font-mono text-sm font-extrabold text-[#06B6D4] block mt-0.5">{data.totalElecPoints} each (@ $65)</span>
        </div>
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">LED Lighting</span>
          <span className="font-mono text-sm font-extrabold text-[#7dd3fc] block mt-0.5">{data.totalLightPoints} each</span>
        </div>
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Plumbing Fixtures</span>
          <span className="font-mono text-sm font-extrabold text-[#22c55e] block mt-0.5">{data.totalPlumbPoints} each (@ $180)</span>
        </div>
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">MEP Valuation</span>
          <span className="font-mono text-sm font-extrabold text-[#d4a574] block mt-0.5">${data.totalMepCostUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Schedule Table */}
      <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4a574] mb-2">Spatial Services Distribution Takeoff Schedule</h4>
      <div className="bg-[#0b1220] rounded-lg border border-[#24324b] overflow-hidden mb-4 max-h-48 overflow-y-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#111c31] text-[#94a3b8] uppercase font-mono text-[10px] border-b border-[#24324b]">
            <tr>
              <th className="p-2">Spatial Zone</th>
              <th className="p-2">Program Type</th>
              <th className="p-2 text-right">Area</th>
              <th className="p-2 text-center">Elec</th>
              <th className="p-2 text-center">Light</th>
              <th className="p-2 text-center">Plumb</th>
              <th className="p-2 text-right">Valuation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#24324b]/60">
            {data.spaceSchedules.map(s => (
              <tr key={s.zoneId} className="hover:bg-[#111c31]/50">
                <td className="p-2 font-bold text-[#f8fafc]">{s.spaceName}</td>
                <td className="p-2 text-[#7dd3fc]">{s.program}</td>
                <td className="p-2 font-mono text-right text-[#94a3b8]">{s.area.toFixed(1)} m2</td>
                <td className="p-2 font-mono text-center font-bold text-[#06B6D4]">{s.elecPoints}</td>
                <td className="p-2 font-mono text-center text-[#e2e8f0]">{s.lightPoints}</td>
                <td className="p-2 font-mono text-center font-bold text-[#22c55e]">{s.plumbPoints}</td>
                <td className="p-2 font-mono text-right font-bold text-[#d4a574]">${s.estimatedCostUsd.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Advice */}
      <div className="bg-[#0b1220] p-3 rounded-lg border-l-4 border-[#22c55e] text-xs text-[#e2e8f0]">
        <strong className="text-[#22c55e] block mb-1">MEP Engineering Standard:</strong>
        {isEnabled ? 'MEP services line items are fully bound and active in the BOQ accounting takeoff.' : 'Click the button above to bind MEP points into the enterprise cost schedule.'}
      </div>
    </div>
  );
}
