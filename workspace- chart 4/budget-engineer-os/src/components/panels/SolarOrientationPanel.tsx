import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { computeSolarAnalysis, SolarAnalysisSummary } from '../../lib/solarAnalyzer';

export function SolarOrientationPanel() {
  const cad = useAppStore(state => state.cadDoc);
  const [data, setData] = useState<SolarAnalysisSummary | null>(null);

  useEffect(() => {
    setData(computeSolarAnalysis(cad));
  }, [cad]);

  if (!data) return null;

  return (
    <div className="bg-[#111c31] border border-[#f59e0b] rounded-xl p-4 text-[#e2e8f0] shadow-xl relative overflow-hidden mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#24324b] mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#f59e0b] animate-pulse shadow-lg shadow-[#f59e0b]/50"></span>
          <h3 className="font-bold text-[#f8fafc] text-base">Solar Orientation & SHGC Heat Gain Analyzer</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded font-bold bg-[#451a03] text-[#f59e0b] border border-[#f59e0b]/40">Stage 32</span>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Glazed Envelope</span>
          <span className="font-mono text-sm font-extrabold text-[#7dd3fc] block mt-0.5">{data.totalWindowArea.toFixed(1)} m2</span>
        </div>
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Window-to-Wall Ratio</span>
          <span className="font-mono text-sm font-extrabold text-[#f8fafc] block mt-0.5">{data.overallWwrPct.toFixed(1)}%</span>
        </div>
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Peak Cooling Load</span>
          <span className="font-mono text-sm font-extrabold text-[#f59e0b] block mt-0.5">{data.totalPeakCoolingLoadKw.toFixed(2)} kW</span>
        </div>
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Efficiency Rating</span>
          <span className={`font-mono text-xs font-bold block mt-1 ${data.efficiencyRating === 'Optimized' ? 'text-[#22c55e]' : data.efficiencyRating === 'Standard' ? 'text-[#7dd3fc]' : 'text-[#ef4444]'}`}>
            {data.efficiencyRating}
          </span>
        </div>
      </div>

      {/* Cardinal Grid */}
      <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4a574] mb-2">Cardinal Facade Azimuth Takeoff</h4>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
        {data.cardinalMetrics.map(c => {
          const isHigh = c.peakCoolingLoadKw > 1.0;
          return (
            <div key={c.orientation} className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b] text-xs space-y-1">
              <div className="flex justify-between font-bold text-[#f8fafc]">
                <span>{c.orientation} Facade</span>
                <span className="font-mono text-[#d4a574]">{c.peakIrradianceWm2} W/m2</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#94a3b8]">
                <span>Wall: {c.wallArea.toFixed(0)}m2</span>
                <span>Win: {c.windowArea.toFixed(1)}m2</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#1e293b]">
                <span className="text-[10px] text-[#94a3b8]">Cooling kW</span>
                <span className={`font-mono font-bold ${isHigh ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>{c.peakCoolingLoadKw.toFixed(2)} kW</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      <div className="bg-[#0b1220] p-3 rounded-lg border-l-4 border-[#06B6D4] text-xs text-[#e2e8f0]">
        <strong className="text-[#7dd3fc] block mb-1">Thermal Envelope Recommendation:</strong>
        {data.recommendations.join(' ')}
      </div>
    </div>
  );
}
