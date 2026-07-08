import { useAppStore } from '../../store/appStore';
import {
  BAR_DIAMETERS, BAR_SPACINGS, rebarKgPerM2, rebarTonnage, describeSpec,
  BarDiameter, BarSpacing, MeshLayers,
} from '../../lib/rebarSpec';

const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function RebarSpecPanel() {
  const spec = useAppStore((s) => s.rebarSpec);
  const setRebarSpec = useAppStore((s) => s.setRebarSpec);
  const bim = useAppStore((s) => s.bim);

  const slabArea = (bim?.elements ?? [])
    .filter((e) => e.type === 'slab')
    .reduce((s, e) => s + (e.area ?? 0), 0);

  const kgPerM2 = rebarKgPerM2(spec);
  const tonnes = rebarTonnage(slabArea, spec);
  const cost = tonnes * 1200;

  return (
    <div className="panel">
      <h3>Stage 42 · Rebar Spec Override</h3>
      <p className="sub">Parametric slab reinforcement schedule</p>

      <div className="grid cols-3" style={{ gap: 10 }}>
        <div>
          <label className="field">Bar Ø</label>
          <select value={spec.diameter} onChange={(e) => void setRebarSpec({ ...spec, diameter: Number(e.target.value) as BarDiameter })}>
            {BAR_DIAMETERS.map((d) => <option key={d} value={d}>Y{d}</option>)}
          </select>
        </div>
        <div>
          <label className="field">Spacing</label>
          <select value={spec.spacing} onChange={(e) => void setRebarSpec({ ...spec, spacing: Number(e.target.value) as BarSpacing })}>
            {BAR_SPACINGS.map((s) => <option key={s} value={s}>{s} c/c</option>)}
          </select>
        </div>
        <div>
          <label className="field">Layers</label>
          <select value={spec.layers} onChange={(e) => void setRebarSpec({ ...spec, layers: Number(e.target.value) as MeshLayers })}>
            <option value={1}>Single</option>
            <option value={2}>Double</option>
          </select>
        </div>
      </div>

      <div className="kpi" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 14 }}>
        <div className="card">
          <div className="label">Mesh density</div>
          <div className="value cyan">{kgPerM2.toFixed(1)} <span style={{ fontSize: 12 }}>kg/m²</span></div>
        </div>
        <div className="card">
          <div className="label">Tonnage ({slabArea.toFixed(0)} m²)</div>
          <div className="value">{tonnes.toFixed(2)} <span style={{ fontSize: 12 }}>t</span></div>
        </div>
        <div className="card">
          <div className="label">Rebar cost @ $1200/t</div>
          <div className="value green">{fmt(cost)}</div>
        </div>
      </div>

      <p className="note" style={{ marginTop: 10 }}>
        Spec: <b style={{ color: '#e2e8f0' }}>{describeSpec(spec)}</b>. Steel mass is derived from
        bar cross-section × density (7850 kg/m³), two-way mesh, recalculated into the BOQ
        Reinforcement line on every change.
      </p>
    </div>
  );
}
