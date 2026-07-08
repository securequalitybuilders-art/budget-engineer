import { useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { sizeFootings, SOIL_TYPES, SoilClass } from '../../lib/footingSizer';
import { LOAD_COMBINATIONS } from '../../lib/loadEngine';

const SOILS: SoilClass[] = ['soft', 'medium', 'firm', 'rock'];

export function FootingSizingPanel() {
  const bim = useAppStore((s) => s.bim);
  const loadCombo = useAppStore((s) => s.loadCombo);
  const soil = useAppStore((s) => s.soil);
  const setSoil = useAppStore((s) => s.setSoil);

  const schedule = useMemo(
    () => (bim ? sizeFootings(bim, loadCombo, soil) : null),
    [bim, loadCombo, soil],
  );
  if (!schedule) return null;

  const f0 = schedule.footings[0];
  const overUtilised = f0 && f0.utilisation > 1;

  return (
    <div className="panel">
      <h3>Stage 45 · Footing Sizing from Design Load</h3>
      <p className="sub">Pad footings sized from {LOAD_COMBINATIONS[loadCombo].label}</p>

      <label className="field">Soil bearing capacity</label>
      <select value={soil} onChange={(e) => setSoil(e.target.value as SoilClass)}>
        {SOILS.map((s) => (
          <option key={s} value={s}>{SOIL_TYPES[s].label} — {SOIL_TYPES[s].bearingKpa} kPa</option>
        ))}
      </select>

      <div className="kpi" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginTop: 14 }}>
        <div className="card">
          <div className="label">Columns / pads</div>
          <div className="value">{schedule.columnCount}</div>
        </div>
        <div className="card">
          <div className="label">Load / pad</div>
          <div className="value cyan">{schedule.perColumnLoadKn} kN</div>
        </div>
        <div className="card">
          <div className="label">Pad size</div>
          <div className="value">{f0 ? `${f0.sideM}×${f0.sideM} m` : '—'}</div>
        </div>
        <div className="card">
          <div className="label">Total concrete</div>
          <div className="value green">{schedule.totalVolumeM3} m³</div>
        </div>
      </div>

      <table style={{ marginTop: 14 }}>
        <thead>
          <tr>
            <th>Pad</th>
            <th className="num">Load (kN)</th>
            <th className="num">Req. area (m²)</th>
            <th className="num">Size (m)</th>
            <th className="num">Thk (m)</th>
            <th className="num">Util.</th>
          </tr>
        </thead>
        <tbody>
          {schedule.footings.slice(0, 4).map((f) => (
            <tr key={f.index}>
              <td>F{f.index}</td>
              <td className="num">{f.loadKn}</td>
              <td className="num">{f.requiredAreaM2}</td>
              <td className="num">{f.sideM}×{f.sideM}</td>
              <td className="num">{f.thicknessM}</td>
              <td className="num" style={{ color: f.utilisation > 1 ? '#ef4444' : '#22c55e' }}>
                {(f.utilisation * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {overUtilised && (
        <p className="note" style={{ marginTop: 8, color: '#fca5a5' }}>
          ⚠ Bearing pressure exceeds soil capacity at the minimum pad size — choose firmer soil
          or a deeper foundation system.
        </p>
      )}

      <p className="note" style={{ marginTop: 10 }}>
        Required area = N* / q<sub>allow</sub>; side rounded up to a 50 mm module (min 600 mm),
        thickness ≈ side / 3 (min 300 mm). Early-stage sizing for budgeting — not a stamped
        foundation design.
      </p>
    </div>
  );
}
