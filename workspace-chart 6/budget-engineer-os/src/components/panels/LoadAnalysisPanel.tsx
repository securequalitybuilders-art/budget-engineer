import { useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { computeLoads, LOAD_COMBINATIONS, LoadCombo } from '../../lib/loadEngine';

const COMBOS: LoadCombo[] = ['service', 'ultimate'];
const kn = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' kN';

export function LoadAnalysisPanel() {
  const bim = useAppStore((s) => s.bim);
  const loadCombo = useAppStore((s) => s.loadCombo);
  const setLoadCombo = useAppStore((s) => s.setLoadCombo);

  const result = useMemo(() => (bim ? computeLoads(bim, loadCombo) : null), [bim, loadCombo]);
  if (!result) return null;

  return (
    <div className="panel">
      <h3>Stage 43 · Structural Load Analysis</h3>
      <p className="sub">Limit-state load combinations · dead (G) + live (Q)</p>

      <div className="btn-row" style={{ marginBottom: 14 }}>
        {COMBOS.map((c) => (
          <button key={c} className={loadCombo === c ? 'active' : ''} onClick={() => setLoadCombo(c)}>
            {LOAD_COMBINATIONS[c].label}
          </button>
        ))}
      </div>

      <div className="kpi" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="card">
          <div className="label">Dead load G</div>
          <div className="value">{kn(result.totalDeadKn)}</div>
        </div>
        <div className="card">
          <div className="label">Live load Q</div>
          <div className="value">{kn(result.totalLiveKn)}</div>
        </div>
        <div className="card">
          <div className="label">Design load</div>
          <div className="value cyan">{kn(result.totalDesignKn)}</div>
        </div>
        <div className="card">
          <div className="label">To footings</div>
          <div className="value green">{kn(result.foundationDesignKn)}</div>
        </div>
      </div>

      <table style={{ marginTop: 14 }}>
        <thead>
          <tr>
            <th>Element</th>
            <th className="num">G (kN)</th>
            <th className="num">Q (kN)</th>
            <th className="num">Design (kN)</th>
          </tr>
        </thead>
        <tbody>
          {result.elements
            .slice()
            .sort((a, b) => b.designKn - a.designKn)
            .slice(0, 6)
            .map((e) => (
              <tr key={e.id}>
                <td>{e.name} <span className="tag">{e.type}</span></td>
                <td className="num">{e.deadKn.toFixed(1)}</td>
                <td className="num">{e.liveKn.toFixed(1)}</td>
                <td className="num">{e.designKn.toFixed(1)}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <p className="note" style={{ marginTop: 10 }}>
        Combination: <b style={{ color: '#e2e8f0' }}>{result.factors.label}</b>. Slab dead = 4.8 kN/m²,
        roof dead = 1.2 kN/m², floor live = 1.5 kN/m², roof live = 0.6 kN/m², scaled by material
        self-weight. Early-stage estimates for budgeting and footing sizing — not a substitute for a
        full structural design.
      </p>
    </div>
  );
}
