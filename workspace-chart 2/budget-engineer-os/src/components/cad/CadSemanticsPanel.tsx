import type { CadDocument } from '../../domain/cad'
import { getFloorProjectionSummaries } from '../../lib/cadMultiFloor'

interface CadSemanticsPanelProps {
  doc: CadDocument | null
}

export function CadSemanticsPanel({ doc }: CadSemanticsPanelProps) {
  if (!doc) return null
  const summaries = getFloorProjectionSummaries(doc)

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">BIM + Floor Semantics</h2>
      <div className="mt-4 space-y-3">
        {summaries.map((summary) => (
          <div key={summary.floorId} className="rounded-2xl border border-white/10 bg-slate-900/40 p-3 text-sm text-white">
            <div className="font-medium">{summary.floorName}</div>
            <div className="mt-1 text-slate-300">Elevation: {summary.elevation}m · Walls: {summary.wallCount} · Openings: {summary.openingCount}</div>
          </div>
        ))}
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-3 text-sm text-slate-300">
          Active layers use professional DXF names such as A-WALL-FULL, A-DOOR-WIND, and A-ANNO-DIMS.
        </div>
      </div>
    </section>
  )
}
