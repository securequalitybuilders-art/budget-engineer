import { useState, useMemo } from 'react'
import type { StructuralMaterial } from '../../lib/structural/structural-types'
import { getMaterialRates, getIfcClass } from '../../lib/structural/material-rates'
import { computeRebarTonnes, estimateRebarCost } from '../../lib/structural/rebar-calculator'

interface MaterialSwitchPanelProps {
  slabAreaM2: number
}

const MATERIALS: StructuralMaterial[] = ['concrete', 'steel', 'timber']

const RATE_LABELS: Record<string, string> = {
  wall_m2: 'Wall ($/m²)',
  slab_m2: 'Slab ($/m²)',
  roof_m2: 'Roof ($/m²)',
  column_each: 'Column (each)',
  beam_m: 'Beam ($/m)',
  footing_m3: 'Footing ($/m³)',
  rebar_tonne: 'Rebar ($/t)',
}

export function MaterialSwitchPanel({ slabAreaM2 }: MaterialSwitchPanelProps) {
  const [material, setMaterial] = useState<StructuralMaterial>('concrete')
  const [slabArea, setSlabArea] = useState(slabAreaM2)

  const rates = useMemo(() => getMaterialRates(material), [material])

  const rebarTonnes = useMemo(() => computeRebarTonnes(slabArea), [slabArea])
  const rebarCost = useMemo(() => estimateRebarCost(rebarTonnes), [rebarTonnes])

  const totalCost = useMemo(() => {
    const structure = rates.column_each * 6 + rates.beam_m * 20 + Math.ceil(slabArea) * rates.slab_m2
    const foundation = rates.footing_m3 * 2.4
    const rebar = rates.rebar_tonne * rebarTonnes
    return structure + foundation + rebar
  }, [rates, slabArea, rebarTonnes])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {MATERIALS.map((m) => (
          <button
            key={m}
            onClick={() => setMaterial(m)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              material === m
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-stone-800 text-stone-400 border border-stone-700/60 hover:bg-stone-700'
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs text-stone-400">Slab Area (m²)</label>
        <input
          type="number"
          value={slabArea}
          onChange={(e) => setSlabArea(Math.max(0, Number(e.target.value)))}
          className="mt-1 w-full rounded border border-stone-700/60 bg-stone-900 px-2 py-1 text-sm text-stone-200"
        />
      </div>

      <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
          {material.charAt(0).toUpperCase() + material.slice(1)} — Rate Table
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {Object.entries(RATE_LABELS).map(([key, label]) => (
            <div key={key} className="flex justify-between text-stone-300">
              <span className="text-stone-400">{label}</span>
              <span>${(rates as unknown as Record<string, number>)[key]?.toFixed(2) ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-stone-700/60 bg-stone-800/80 p-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Cost Estimate</h4>
        <div className="space-y-1 text-xs text-stone-300">
          <div className="flex justify-between">
            <span>Rebar required</span>
            <span>{rebarTonnes.toFixed(2)} t</span>
          </div>
          <div className="flex justify-between">
            <span>Rebar cost</span>
            <span>${rebarCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-stone-700/60 pt-1 font-semibold">
            <span>Estimated structural total</span>
            <span>${totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-3">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">IFC Classification</h4>
        <div className="grid grid-cols-2 gap-1 text-xs text-stone-400">
          <div>Wall: <span className="text-stone-300">{getIfcClass(material, 'wall')}</span></div>
          <div>Beam: <span className="text-stone-300">{getIfcClass(material, 'beam')}</span></div>
          <div>Column: <span className="text-stone-300">{getIfcClass(material, 'column')}</span></div>
          <div>Footing: <span className="text-stone-300">{getIfcClass(material, 'footing')}</span></div>
        </div>
      </div>
    </div>
  )
}
