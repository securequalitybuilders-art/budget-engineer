import { useState } from 'react';
import {
  BAR_DIAMETERS, BAR_SPACINGS, rebarKgPerM2, rebarTonnage, describeSpec,
  BarDiameter, BarSpacing, MeshLayers, RebarSpec, DEFAULT_REBAR_SPEC,
} from '@/lib/structural/rebar-spec';

const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface RebarSpecPanelProps {
  slabArea?: number;
  spec?: RebarSpec;
  onChange?: (spec: RebarSpec) => void;
}

export function RebarSpecPanel({ slabArea = 0, spec: extSpec, onChange }: RebarSpecPanelProps) {
  const [intSpec, setIntSpec] = useState<RebarSpec>(extSpec ?? DEFAULT_REBAR_SPEC);
  const spec = extSpec ?? intSpec;

  const update = (patch: Partial<RebarSpec>) => {
    const next = { ...spec, ...patch };
    setIntSpec(next);
    onChange?.(next);
  };

  const kgPerM2 = rebarKgPerM2(spec);
  const tonnes = rebarTonnage(slabArea, spec);
  const cost = tonnes * 1200;

  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-4">
      <h3 className="font-semibold text-stone-100">Rebar Spec Override</h3>
      <p className="mb-3 text-xs text-stone-400">Parametric slab reinforcement schedule</p>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-400">Bar Ø</label>
          <select value={spec.diameter} onChange={(e) => update({ diameter: Number(e.target.value) as BarDiameter })}
            className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200">
            {BAR_DIAMETERS.map((d) => <option key={d} value={d}>Y{d}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-400">Spacing</label>
          <select value={spec.spacing} onChange={(e) => update({ spacing: Number(e.target.value) as BarSpacing })}
            className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200">
            {BAR_SPACINGS.map((s) => <option key={s} value={s}>{s} c/c</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-400">Layers</label>
          <select value={spec.layers} onChange={(e) => update({ layers: Number(e.target.value) as MeshLayers })}
            className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200">
            <option value={1}>Single</option>
            <option value={2}>Double</option>
          </select>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <div className="rounded bg-stone-800 p-3">
          <div className="text-xs text-stone-400">Mesh density</div>
          <div className="text-lg font-bold text-cyan-400">{kgPerM2.toFixed(1)} <span className="text-sm">kg/m²</span></div>
        </div>
        <div className="rounded bg-stone-800 p-3">
          <div className="text-xs text-stone-400">Tonnage ({slabArea.toFixed(0)} m²)</div>
          <div className="text-lg font-bold text-stone-100">{tonnes.toFixed(2)} <span className="text-sm">t</span></div>
        </div>
        <div className="rounded bg-stone-800 p-3">
          <div className="text-xs text-stone-400">Rebar cost @ $1200/t</div>
          <div className="text-lg font-bold text-emerald-400">{fmt(cost)}</div>
        </div>
      </div>

      <p className="text-xs text-stone-500">
        Spec: <b className="text-stone-200">{describeSpec(spec)}</b>. Steel mass is derived from
        bar cross-section × density (7850 kg/m³), two-way mesh, recalculated into the BOQ
        Reinforcement line on every change.
      </p>
    </div>
  );
}
