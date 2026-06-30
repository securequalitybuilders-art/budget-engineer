import { useMemo, useState } from 'react';
import { BimModel } from '@/domain/ws6-types';
import { computeLoads, LOAD_COMBINATIONS, LoadCombo } from '@/lib/structural/load-engine';

const COMBOS: LoadCombo[] = ['service', 'ultimate'];
const kn = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' kN';

interface LoadAnalysisPanelProps {
  bim?: BimModel | null;
}

export function LoadAnalysisPanel({ bim }: LoadAnalysisPanelProps) {
  const [loadCombo, setLoadCombo] = useState<LoadCombo>('ultimate');

  const result = useMemo(() => (bim ? computeLoads(bim, loadCombo) : null), [bim, loadCombo]);
  if (!result) return null;

  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-4">
      <h3 className="font-semibold text-stone-100">Structural Load Analysis</h3>
      <p className="mb-3 text-xs text-stone-400">Limit-state load combinations · dead (G) + live (Q)</p>

      <div className="mb-3 flex gap-2">
        {COMBOS.map((c) => (
          <button
            key={c}
            onClick={() => setLoadCombo(c)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              loadCombo === c
                ? 'bg-cyan-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {LOAD_COMBINATIONS[c].label}
          </button>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-4 gap-3">
        <div className="rounded bg-stone-800 p-3">
          <div className="text-xs text-stone-400">Dead load G</div>
          <div className="text-lg font-bold text-stone-100">{kn(result.totalDeadKn)}</div>
        </div>
        <div className="rounded bg-stone-800 p-3">
          <div className="text-xs text-stone-400">Live load Q</div>
          <div className="text-lg font-bold text-stone-100">{kn(result.totalLiveKn)}</div>
        </div>
        <div className="rounded bg-stone-800 p-3">
          <div className="text-xs text-stone-400">Design load</div>
          <div className="text-lg font-bold text-cyan-400">{kn(result.totalDesignKn)}</div>
        </div>
        <div className="rounded bg-stone-800 p-3">
          <div className="text-xs text-stone-400">To footings</div>
          <div className="text-lg font-bold text-emerald-400">{kn(result.foundationDesignKn)}</div>
        </div>
      </div>

      <table className="mb-2 w-full text-xs">
        <thead>
          <tr className="text-stone-400">
            <th className="pb-1 text-left font-medium">Element</th>
            <th className="pb-1 text-right font-medium">G (kN)</th>
            <th className="pb-1 text-right font-medium">Q (kN)</th>
            <th className="pb-1 text-right font-medium">Design (kN)</th>
          </tr>
        </thead>
        <tbody>
          {result.elements
            .slice()
            .sort((a, b) => b.designKn - a.designKn)
            .slice(0, 6)
            .map((e) => (
              <tr key={e.id} className="border-t border-stone-700/50 text-stone-300">
                <td className="py-1">{e.name} <span className="rounded-full bg-cyan-900/60 px-2 py-0.5 text-xs text-cyan-300">{e.type}</span></td>
                <td className="py-1 text-right">{e.deadKn.toFixed(1)}</td>
                <td className="py-1 text-right">{e.liveKn.toFixed(1)}</td>
                <td className="py-1 text-right">{e.designKn.toFixed(1)}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <p className="text-xs text-stone-500">
        Combination: <b className="text-stone-200">{result.factors.label}</b>. Slab dead = 4.8 kN/m²,
        roof dead = 1.2 kN/m², floor live = 1.5 kN/m², roof live = 0.6 kN/m², scaled by material
        self-weight. Early-stage estimates for budgeting and footing sizing — not a substitute for a
        full structural design.
      </p>
    </div>
  );
}
