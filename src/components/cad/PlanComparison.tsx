import type { DesignOption } from '../../domain/boq'
import { generatePlanModel } from '../../engine/plan-generator'
import { footprintArea, grossInternalArea } from '../../lib/geometry/plan-geometry'

interface PlanComparisonProps {
  designs: DesignOption[]
  selectedDesignId?: string
}

export function PlanComparison({ designs, selectedDesignId }: PlanComparisonProps) {
  if (designs.length === 0) return null

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">Plan Option Comparison</h2>
      <p className="mt-1 text-sm text-slate-300">Side-by-side quick metrics for generated design options.</p>
      <div className="mt-4 overflow-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              <th className="px-3 py-3">Option</th>
              <th className="px-3 py-3">Area</th>
              <th className="px-3 py-3">Footprint</th>
              <th className="px-3 py-3">Internal Area</th>
              <th className="px-3 py-3">Rooms</th>
            </tr>
          </thead>
          <tbody>
            {designs.map((design) => {
              const plan = generatePlanModel(design)
              const active = design.id === selectedDesignId
              return (
                <tr key={design.id} className={`border-b border-white/5 ${active ? 'bg-cyan-500/10' : ''}`}>
                  <td className="px-3 py-3 font-medium text-white">{design.name}</td>
                  <td className="px-3 py-3">{design.grossFloorArea} m²</td>
                  <td className="px-3 py-3">{footprintArea(plan).toFixed(1)} m²</td>
                  <td className="px-3 py-3">{grossInternalArea(plan).toFixed(1)} m²</td>
                  <td className="px-3 py-3">{plan.rooms.length}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
