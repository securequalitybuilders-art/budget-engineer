import { useMemo, useState } from 'react';
import { BimModel } from '@/domain/ws6-types';
import { sizeFootings, SOIL_TYPES, SoilClass } from '@/lib/structural/footing-sizer';
import { LOAD_COMBINATIONS, LoadCombo } from '@/lib/structural/load-engine';

const SOILS: SoilClass[] = ['soft', 'medium', 'firm', 'rock'];

interface FootingSizingPanelProps {
  bim?: BimModel | null;
}

const COMBOS: LoadCombo[] = ['service', 'ultimate'];

export function FootingSizingPanel({ bim }: FootingSizingPanelProps) {
  const [loadCombo, setLoadCombo] = useState<LoadCombo>('ultimate');
  const [soil, setSoil] = useState<SoilClass>('medium');

  const schedule = useMemo(
    () => (bim ? sizeFootings(bim, loadCombo, soil) : null),
    [bim, loadCombo, soil],
  );
  if (!schedule) return null;

  const f0 = schedule.footings[0];

  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-4">
      <h3 className="font-semibold text-stone-100">Footing Sizing from Design Load</h3>
      <p className="mb-3 text-xs text-stone-400">Pad footings sized from {LOAD_COMBINATIONS[loadCombo].label}</p>

      <div className="mb-3 flex gap-2">
        {COMBOS.map((c) => (
          <button
            key={c}
            onClick={() => setLoadCombo(c)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              loadCombo === c
                ? 'bg-cyan-700 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {LOAD_COMBINATIONS[c].label}
          </button>
        ))}
      </div>

      <label htmlFor="soil-capacity" className="mb-1 block text-xs font-medium text-stone-400">Soil bearing capacity</label>
      <select id="soil-capacity" value={soil} onChange={(e) => setSoil(e.target.value as SoilClass)}
        className="mb-3 w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200">
        {SOILS.map((s) => (
          <option key={s} value={s}>{SOIL_TYPES[s].label} — {SOIL_TYPES[s].bearingKpa} kPa</option>
        ))}
      </select>

      <div className="mb-3 grid grid-cols-4 gap-3">
        <div className="rounded bg-stone-800 p-3">
          <div className="text-xs text-stone-400">Columns / pads</div>
          <div className="text-lg font-bold text-stone-100">{schedule.columnCount}</div>
        </div>
        <div className="rounded bg-stone-800 p-3">
          <div className="text-xs text-stone-400">Load / pad</div>
          <div className="text-lg font-bold text-cyan-400">{schedule.perColumnLoadKn} kN</div>
        </div>
        <div className="rounded bg-stone-800 p-3">
          <div className="text-xs text-stone-400">Pad size</div>
          <div className="text-lg font-bold text-stone-100">{f0 ? `${f0.sideM}×${f0.sideM} m` : '—'}</div>
        </div>
        <div className="rounded bg-stone-800 p-3">
          <div className="text-xs text-stone-400">Total concrete</div>
          <div className="text-lg font-bold text-emerald-400">{schedule.totalVolumeM3} m³</div>
        </div>
      </div>

      <table className="mb-2 w-full text-xs">
        <thead>
          <tr className="text-stone-400">
            <th className="pb-1 text-left font-medium">Pad</th>
            <th className="pb-1 text-right font-medium">Load (kN)</th>
            <th className="pb-1 text-right font-medium">Req. area (m²)</th>
            <th className="pb-1 text-right font-medium">Size (m)</th>
            <th className="pb-1 text-right font-medium">Thk (m)</th>
            <th className="pb-1 text-right font-medium">Util.</th>
          </tr>
        </thead>
        <tbody>
          {schedule.footings.slice(0, 4).map((f) => (
            <tr key={f.index} className="border-t border-stone-700/50 text-stone-300">
              <td className="py-1">F{f.index}</td>
              <td className="py-1 text-right">{f.loadKn}</td>
              <td className="py-1 text-right">{f.requiredAreaM2}</td>
              <td className="py-1 text-right">{f.sideM}×{f.sideM}</td>
              <td className="py-1 text-right">{f.thicknessM}</td>
              <td className={`py-1 text-right ${f.utilisation > 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                {(f.utilisation * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 text-xs text-stone-400">
        Required area = N* / q<sub>allow</sub>; side rounded up to a 50 mm module (min 600 mm),
        thickness ≈ side / 3 (min 300 mm). Early-stage sizing for budgeting — not a stamped
        foundation design.
      </p>
    </div>
  );
}
