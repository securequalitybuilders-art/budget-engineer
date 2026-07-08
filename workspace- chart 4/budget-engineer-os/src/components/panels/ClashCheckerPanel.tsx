import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { detectBimClashes, ClashReportSummary } from '../../lib/clashChecker';

export function ClashCheckerPanel() {
  const state = useAppStore();
  const cad = state.cadDoc;
  const [report, setReport] = useState<ClashReportSummary | null>(null);

  useEffect(() => {
    setReport(detectBimClashes(cad));
  }, [cad]);

  if (!report) return null;

  const hasClashes = report.clashes.length > 0;

  return (
    <div className={`bg-[#111c31] border rounded-xl p-4 text-[#e2e8f0] shadow-xl relative overflow-hidden mb-4 ${hasClashes ? 'border-[#ef4444]' : 'border-[#22c55e]'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#24324b] mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full animate-pulse shadow-lg ${hasClashes ? 'bg-[#ef4444] shadow-[#ef4444]/50' : 'bg-[#22c55e] shadow-[#22c55e]/50'}`}></span>
          <h3 className="font-bold text-[#f8fafc] text-base">BIM Clash & Spatial Interference Checker (Stage 34)</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${hasClashes ? 'bg-[#ef4444]/20 text-[#fca5a5]' : 'bg-[#22c55e]/20 text-[#22c55e]'}`}>
          {report.statusRating}
        </span>
      </div>

      <p className="text-xs text-[#94a3b8] mb-4">
        Automatically inspect geometric bounding envelopes to detect structural rebar collisions, opening overlap interferences, and MEP/fixture envelope clashes.
      </p>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Detected Clashes</span>
          <span className={`font-mono text-sm font-extrabold block mt-0.5 ${hasClashes ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>{report.clashes.length} Clashes</span>
        </div>
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Structural High Sev</span>
          <span className="font-mono text-sm font-extrabold text-[#f59e0b] block mt-0.5">{report.highSeverityCount} Critical</span>
        </div>
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Spatial Moderate Sev</span>
          <span className="font-mono text-sm font-extrabold text-[#7dd3fc] block mt-0.5">{report.moderateSeverityCount} Moderate</span>
        </div>
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Coordination Status</span>
          <span className="font-mono text-xs font-bold text-[#d4a574] block mt-1">{hasClashes ? 'Action Required' : 'Clash-Free ✓'}</span>
        </div>
      </div>

      {/* Trigger CTA */}
      {hasClashes && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/40 p-3 rounded-lg mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[#fca5a5] font-bold">Coordination clashes detected on active floor plan.</span>
          <button
            onClick={() => state.autoHealClashes()}
            className="py-2 px-5 rounded-lg font-extrabold bg-[#22c55e] hover:bg-[#16a34a] text-[#0b1220] transition shadow-md flex items-center gap-1.5 text-xs"
          >
            ✨ Auto-Heal All {report.clashes.length} Clashes
          </button>
        </div>
      )}

      {/* Clash List Table */}
      <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4a574] mb-2">Spatial Coordination Clash Matrix</h4>
      {report.clashes.length === 0 ? (
        <div className="bg-[#0b1220] p-4 rounded-lg border border-[#24324b] text-center text-xs text-[#22c55e] font-bold">
          ✨ Zero geometric clashes or spatial interferences detected across building model.
        </div>
      ) : (
        <div className="bg-[#0b1220] rounded-lg border border-[#24324b] overflow-hidden max-h-48 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#111c31] text-[#94a3b8] uppercase font-mono text-[10px] border-b border-[#24324b]">
              <tr>
                <th className="p-2">Severity</th>
                <th className="p-2">Element A</th>
                <th className="p-2">Element B</th>
                <th className="p-2">Description</th>
                <th className="p-2 text-right">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24324b]/60">
              {report.clashes.map(c => (
                <tr key={c.id} className="hover:bg-[#111c31]/50">
                  <td className="p-2"><span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ef4444]/20 text-[#fca5a5]">{c.severity}</span></td>
                  <td className="p-2 font-bold text-[#f8fafc]">{c.elementA}</td>
                  <td className="p-2 font-bold text-[#7dd3fc]">{c.elementB}</td>
                  <td className="p-2 text-[#e2e8f0]">{c.description}</td>
                  <td className="p-2 font-mono text-right text-[#94a3b8]">{c.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
