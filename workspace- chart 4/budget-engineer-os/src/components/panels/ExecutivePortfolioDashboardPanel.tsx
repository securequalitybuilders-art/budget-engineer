import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { loadExecutivePortfolioMetrics, ExecutivePortfolioSummary } from '../../lib/executivePortfolio';

export function ExecutivePortfolioDashboardPanel() {
  const state = useAppStore();
  const [data, setData] = useState<ExecutivePortfolioSummary | null>(null);

  useEffect(() => {
    void loadExecutivePortfolioMetrics(state.projects).then(setData);
  }, [state.projects, state.boq, state.activeProjectId]);

  if (!data || data.schemes.length === 0) {
    return (
      <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#94a3b8] text-xs text-center">
        Loading Multi-Project Executive Portfolio Benchmarking...
      </div>
    );
  }

  const maxTotal = Math.max(1, ...data.schemes.map(s => s.grandTotal));
  const totalSpend = Object.values(data.categoryDistribution).reduce((a, b) => a + b, 0) || 1;
  const cats = ['Walls', 'Slabs', 'Roof', 'Openings', 'Objects'];

  return (
    <div className="bg-[#111c31] border border-[#06B6D4] rounded-xl p-4 text-[#e2e8f0] shadow-xl relative overflow-hidden mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#24324b] mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] animate-ping"></span>
          <h3 className="font-bold text-[#f8fafc] text-base">Executive Multi-Project Portfolio Benchmarking</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded font-bold bg-[#1a365d] text-[#7dd3fc] border border-[#06B6D4]/40">Stage 29</span>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Total Portfolio Valuation</span>
          <span className="font-mono text-sm font-extrabold text-[#22c55e] block mt-0.5">${data.totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Average Scheme Cost</span>
          <span className="font-mono text-sm font-extrabold text-[#7dd3fc] block mt-0.5">${data.avgSchemeCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Active vs Archived Schemes</span>
          <span className="font-mono text-sm font-extrabold text-[#f8fafc] block mt-0.5">{data.activeCount} Active / {data.archivedCount} Arch</span>
        </div>
        <div className="bg-[#0b1220] p-2.5 rounded-lg border border-[#24324b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Efficiency Takeoff Standard</span>
          <span className="font-mono text-xs font-bold text-[#d4a574] block mt-1">Affordable Standard</span>
        </div>
      </div>

      {/* Scheme Benchmarking Bar Chart Grid */}
      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#24324b] mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4a574] mb-3">Scheme Valuation Distribution Benchmarking</h4>
        <div className="space-y-2.5">
          {data.schemes.map(s => {
            const isActive = state.activeProjectId === s.id;
            const widthPct = Math.max(5, (s.grandTotal / maxTotal) * 100);

            return (
              <div key={s.id} className="space-y-1 cursor-pointer group" onClick={() => state.switchProject(s.id)}>
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-semibold transition group-hover:text-[#06B6D4] flex items-center gap-1.5 ${isActive ? 'text-[#06B6D4] font-bold' : s.isArchived ? 'text-[#94a3b8] line-through' : 'text-[#f8fafc]'}`}>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]"></span>}
                    {s.name} {s.isArchived ? '(Archived)' : ''}
                  </span>
                  <span className="font-mono font-bold text-[#7dd3fc]">${s.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-[#111c31] h-2 rounded-full overflow-hidden border border-[#24324b]/60">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-[#1a365d] to-[#06B6D4]' : s.isArchived ? 'bg-[#24324b]' : 'bg-[#1a365d]'}`}
                    style={{ width: `${widthPct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Procurement Cost Breakdown Stacked Share */}
      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#24324b]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4a574] mb-2">Enterprise Procurement Cost Composition</h4>
        <div className="flex h-2.5 w-full rounded-full overflow-hidden border border-[#24324b] mb-3">
          {cats.map((cat, i) => {
            const val = data.categoryDistribution[cat] || 0;
            const pct = (val / totalSpend) * 100;
            const cols = ['bg-[#1a365d]', 'bg-[#d4a574]', 'bg-[#06B6D4]', 'bg-[#8B5CF6]', 'bg-[#22c55e]'];
            return <div key={cat} className={`${cols[i % cols.length]} h-full`} style={{ width: `${pct}%` }} title={`${cat}: ${pct.toFixed(1)}%`}></div>;
          })}
        </div>
        <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
          {cats.map((cat, i) => {
            const val = data.categoryDistribution[cat] || 0;
            const pct = (val / totalSpend) * 100;
            const textCols = ['text-[#7dd3fc]', 'text-[#d4a574]', 'text-[#06B6D4]', 'text-[#8B5CF6]', 'text-[#22c55e]'];
            return (
              <div key={cat} className="truncate">
                <span className={`font-bold block ${textCols[i % textCols.length]}`}>{cat}</span>
                <span className="font-mono text-[#94a3b8]">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
