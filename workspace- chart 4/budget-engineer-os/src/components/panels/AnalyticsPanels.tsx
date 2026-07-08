import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { compareBoqShares, BoqShareShift } from '../../lib/boqShare';
import { loadProjectBoqCategoryTotals } from '../../lib/crossProjectBoq';
import { loadProjectPortfolioWithLive } from '../../lib/crossProjectPortfolio';

export function BoqDeltaChartPanel() {
  const state = useAppStore();
  const [lCats, setLCats] = useState<Record<string, number>>({});
  const [rCats, setRCats] = useState<Record<string, number>>({});

  useEffect(() => {
    void loadProjectBoqCategoryTotals(state.compareLeftProjectId).then(setLCats);
    void loadProjectBoqCategoryTotals(state.compareRightProjectId).then(setRCats);
  }, [state.compareLeftProjectId, state.compareRightProjectId, state.boq]);

  const cats = ['Walls', 'Slabs', 'Roof', 'Openings', 'Objects'];

  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4">
      <h3 className="font-bold text-[#f8fafc] pb-2 border-b border-[#24324b] mb-3">Cross-Project BOQ Delta Analysis</h3>
      <div className="space-y-2 text-xs">
        {cats.map(cat => {
          const lv = lCats[cat] || 0;
          const rv = rCats[cat] || 0;
          const diff = rv - lv;
          return (
            <div key={cat} className="bg-[#0b1220] p-2 rounded border border-[#24324b]">
              <div className="flex justify-between mb-1"><span className="font-semibold text-[#f8fafc]">{cat}</span><span className={`font-mono font-bold ${diff > 0 ? 'text-[#22c55e]' : diff < 0 ? 'text-[#ef4444]' : 'text-[#94a3b8]'}`}>{diff > 0 ? '+' : ''}${diff.toFixed(2)}</span></div>
              <div className="flex justify-between text-[10px] text-[#94a3b8]"><span>Left: ${lv.toFixed(0)}</span><span>Right: ${rv.toFixed(0)}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CrossProjectAnalyticsPanel() {
  const state = useAppStore();
  const [lItems, setLItems] = useState<any[]>([]);
  const [rItems, setRItems] = useState<any[]>([]);

  useEffect(() => {
    void loadProjectPortfolioWithLive(state.compareLeftProjectId, state.bimModel, state.boq).then(setLItems);
    void loadProjectPortfolioWithLive(state.compareRightProjectId, state.bimModel, state.boq).then(setRItems);
  }, [state.compareLeftProjectId, state.compareRightProjectId, state.snapshots, state.bimModel, state.boq]);

  const lAvg = lItems.length > 0 ? lItems.reduce((a,b)=>a+b.grandTotal,0)/lItems.length : 0;
  const rAvg = rItems.length > 0 ? rItems.reduce((a,b)=>a+b.grandTotal,0)/rItems.length : 0;

  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4 text-xs">
      <h3 className="font-bold text-[#f8fafc] pb-2 border-b border-[#24324b] mb-3">Scheme Portfolio Benchmarking</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0b1220] p-2.5 rounded border border-[#24324b]"><span className="text-[#94a3b8] block">Left Avg Total</span><span className="font-mono text-[#7dd3fc] font-bold text-sm">${lAvg.toFixed(2)}</span></div>
        <div className="bg-[#0b1220] p-2.5 rounded border border-[#24324b]"><span className="text-[#94a3b8] block">Right Avg Total</span><span className="font-mono text-[#d4a574] font-bold text-sm">${rAvg.toFixed(2)}</span></div>
      </div>
    </div>
  );
}

export function BoqShareComparePanel() {
  const state = useAppStore();
  const shifts = compareBoqShares(state.boq, state.boq); // Self vs working shift demo

  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4 text-xs">
      <h3 className="font-bold text-[#f8fafc] pb-2 border-b border-[#24324b] mb-3">Cost Composition % Shift Analysis</h3>
      <div className="space-y-2">
        {shifts.map(s => (
          <div key={s.category} className="bg-[#0b1220] p-2 rounded border border-[#24324b] flex items-center justify-between">
            <span className="font-medium text-[#f8fafc]">{s.category}</span>
            <div className="flex items-center gap-3 font-mono">
              <span className="text-[#94a3b8]">{s.leftShare.toFixed(1)}% → {s.rightShare.toFixed(1)}%</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.shift >= 0 ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/20 text-[#fca5a5]'}`}>
                {s.shift > 0 ? '+' : ''}{s.shift.toFixed(1)} pp
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
