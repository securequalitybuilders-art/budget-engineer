import type { DesignOption } from '../../domain/boq'
import type { PlanModel } from '../../domain/plan'
import { generatePlanModel } from '../../engine/plan-generator'
import { footprintArea, grossInternalArea, planPerimeter, wallMetrics } from '../../lib/geometry/plan-geometry'

interface PlanLegendProps {
  design: DesignOption | null
  plan?: PlanModel | null
}

export function PlanLegend({ design, plan }: PlanLegendProps) {
  const model: PlanModel | null = plan ?? (design ? generatePlanModel(design) : null)
  const metrics = model ? wallMetrics(model) : null

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">Plan Metadata</h2>
      {!design || !model || !metrics ? (
        <p className="mt-3 text-sm text-slate-300">Select a design option to inspect the generated plan metrics.</p>
      ) : (
        <div className="mt-4 grid gap-3 text-sm text-slate-300">
          <Meta label="Design Option" value={design.name} />
          <Meta label="Gross Floor Area" value={`${design.grossFloorArea} m²`} />
          <Meta label="Footprint" value={`${model.width.toFixed(1)}m × ${model.height.toFixed(1)}m`} />
          <Meta label="Footprint Area" value={`${footprintArea(model).toFixed(1)} m²`} />
          <Meta label="Internal Area" value={`${grossInternalArea(model).toFixed(1)} m²`} />
          <Meta label="Perimeter" value={`${planPerimeter(model).toFixed(1)} m`} />
          <Meta label="Rooms / Zones" value={`${model.rooms.length}`} />
          <Meta label="Wall Segments" value={`${metrics.wallCount}`} />
          <Meta label="External Wall Length" value={`${metrics.externalLength.toFixed(1)} m`} />
          <Meta label="Internal Wall Length" value={`${metrics.internalLength.toFixed(1)} m`} />
          <Meta label="Openings" value={`${model.openings.length}`} />
          <Meta label="Scale" value={model.scaleLabel} />
        </div>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 font-medium text-white">{value}</div>
    </div>
  )
}
