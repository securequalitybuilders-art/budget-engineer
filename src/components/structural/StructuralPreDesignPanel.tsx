import { useMemo } from 'react'
import { computeStructuralPreDesign } from '@/engine/structural/structuralPreDesignEngine'
import type { BuildingGraph } from '@/domain/building'

interface StructuralPreDesignPanelProps {
  graph: BuildingGraph | null
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-center justify-between rounded border border-stone-700/60 bg-stone-900/60 px-2.5 py-1.5">
      <span className="text-[11px] text-stone-400">{label}</span>
      <span className="text-xs font-medium text-stone-200">
        {value}{unit ? <span className="ml-0.5 text-[10px] text-stone-400">{unit}</span> : null}
      </span>
    </div>
  )
}

function SectionCard({ title, children, estimate }: { title: string; children: React.ReactNode; estimate?: boolean }) {
  return (
    <div className="mb-2 rounded-lg border border-stone-700/60 bg-stone-950/80 p-2.5">
      <h4 className="mb-1.5 text-xs font-semibold text-cyan-300">
        {title}
        {estimate ? <span className="ml-2 text-[10px] font-normal text-amber-500">Pre-design</span> : null}
      </h4>
      {children}
    </div>
  )
}

function AssumptionTag({ tag }: { tag: string }) {
  return (
    <div className="mt-1 flex items-start gap-1.5 rounded bg-amber-950/40 px-2 py-1">
      <span className="mt-px text-[10px] text-amber-500">⚠</span>
      <p className="text-[10px] leading-tight text-amber-300/80">{tag}</p>
    </div>
  )
}

export function StructuralPreDesignPanel({ graph }: StructuralPreDesignPanelProps) {
  const output = useMemo(() => {
    if (!graph) return null
    try {
      return computeStructuralPreDesign(graph)
    } catch {
      return null
    }
  }, [graph])

  if (!graph) {
    return (
      <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-6 text-center">
        <p className="text-sm text-stone-400">No design selected. Generate a design first to see structural pre-design.</p>
      </div>
    )
  }

  if (!output) {
    return (
      <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-6 text-center">
        <p className="text-sm text-red-400">Could not compute structural pre-design. Check that the design has valid geometry.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Review banner */}
      <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-2.5">
        <div className="flex items-start gap-2">
          <span className="mt-px text-sm text-amber-500">⚠</span>
          <div>
            <p className="text-xs font-medium text-amber-400">Pre-Design Only — Engineer Review Required</p>
            <p className="mt-0.5 text-[10px] leading-tight text-amber-300/60">
              All member sizes shown are candidates derived from simplified rules of thumb.
              A qualified structural engineer must verify all sizes, reinforcement, and geotechnical assumptions
              before construction.
            </p>
          </div>
        </div>
      </div>

      {/* Slab System */}
      <SectionCard title="Slab System" estimate>
        <div className="space-y-1">
          <StatCard label="System" value={output.slabSystem.system} />
          <StatCard label="Thickness" value={String(output.slabSystem.thicknessMm)} unit="mm" />
          <StatCard label="Max Span" value={String(output.slabSystem.spanM)} unit="m" />
          <StatCard label="Reinforcement" value={output.slabSystem.reinforcement} />
          <StatCard label="Self-weight" value={String(output.slabSystem.weightKpa)} unit="kPa" />
        </div>
        <AssumptionTag tag={output.slabSystem.assumptionTag} />
      </SectionCard>

      {/* Beam Candidates */}
      <SectionCard title={`Beam Candidates (${output.beams.length})`} estimate>
        {output.beams.length === 0 ? (
          <p className="text-[11px] text-stone-500">No beam candidates generated.</p>
        ) : (
          <div className="space-y-1">
            {output.beams.map((b) => (
              <div key={b.id} className="rounded border border-stone-700/40 bg-stone-900/40 px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-300">{b.id}</span>
                  <span className="text-[10px] text-stone-400">{b.material}</span>
                </div>
                <div className="mt-0.5 grid grid-cols-3 gap-2 text-[10px] text-stone-400">
                  <span>{b.widthMm}×{b.depthMm} mm</span>
                  <span>Span: {b.spanM} m</span>
                  <span>L/D: {(b.spanM * 1000 / b.depthMm).toFixed(1)}</span>
                </div>
                <AssumptionTag tag={b.assumptionTag} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Column Candidates */}
      <SectionCard title={`Column Candidates (${output.columns.length})`} estimate>
        {output.columns.length === 0 ? (
          <p className="text-[11px] text-stone-500">No column candidates generated.</p>
        ) : (
          <div className="space-y-1">
            {output.columns.map((c) => (
              <div key={c.id} className="rounded border border-stone-700/40 bg-stone-900/40 px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-300">{c.id}</span>
                  <span className="text-[10px] text-stone-400">{c.type} · {c.material}</span>
                </div>
                <div className="mt-0.5 grid grid-cols-3 gap-2 text-[10px] text-stone-400">
                  <span>{c.widthMm}×{c.depthMm} mm</span>
                  <span>H: {c.heightM} m</span>
                  <span>Load: {c.loadEstimateKn} kN</span>
                </div>
                <div className="text-[10px] text-stone-500">Reo: {c.reinforcement}</div>
                <AssumptionTag tag={c.assumptionTag} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Footing Candidates */}
      <SectionCard title={`Footing Candidates (${output.footings.length})`} estimate>
        {output.footings.length === 0 ? (
          <p className="text-[11px] text-stone-500">No footing candidates generated.</p>
        ) : (
          <div className="space-y-1">
            {output.footings.map((f) => (
              <div key={f.id} className="rounded border border-stone-700/40 bg-stone-900/40 px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-300">{f.id}</span>
                  <span className="text-[10px] text-stone-400">{f.type}</span>
                </div>
                <div className="mt-0.5 grid grid-cols-3 gap-2 text-[10px] text-stone-400">
                  <span>{f.widthM}×{f.depthM} m</span>
                  <span>T: {f.thicknessMm} mm</span>
                  <span>Load: {f.loadKn} kN</span>
                </div>
                <div className="text-[10px] text-stone-500">Bearing: {f.bearingKpa} kPa</div>
                <AssumptionTag tag={f.assumptionTag} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Structural BOQ */}
      <SectionCard title="Structural BOQ" estimate>
        <div className="space-y-1">
          <StatCard label="Concrete" value={String(output.boq.concreteM3)} unit="m³" />
          <StatCard label="Reinforcement" value={String(output.boq.reinforcementKg)} unit="kg" />
          <StatCard label="Formwork" value={String(output.boq.formworkM2)} unit="m²" />
        </div>
        {output.boq.notes.map((note, i) => (
          <p key={i} className="mt-1 text-[10px] text-stone-500">{note}</p>
        ))}
      </SectionCard>

      {/* Schedules */}
      {output.schedules.slabSchedule && (
        <SectionCard title="Schedules">
          <div className="space-y-2">
            <div>
              <h5 className="mb-1 text-[10px] font-medium text-stone-400">Slab Schedule</h5>
              <div dangerouslySetInnerHTML={{ __html: output.schedules.slabSchedule }} className="[&_table]:w-full [&_td]:text-[10px]" />
            </div>
            {output.beams.length > 0 && (
              <div>
                <h5 className="mb-1 text-[10px] font-medium text-stone-400">Beam Schedule</h5>
                <div dangerouslySetInnerHTML={{ __html: output.schedules.beamSchedule }} className="[&_table]:w-full [&_td]:text-[10px]" />
              </div>
            )}
            {output.columns.length > 0 && (
              <div>
                <h5 className="mb-1 text-[10px] font-medium text-stone-400">Column Schedule</h5>
                <div dangerouslySetInnerHTML={{ __html: output.schedules.columnSchedule }} className="[&_table]:w-full [&_td]:text-[10px]" />
              </div>
            )}
            {output.footings.length > 0 && (
              <div>
                <h5 className="mb-1 text-[10px] font-medium text-stone-400">Footing Schedule</h5>
                <div dangerouslySetInnerHTML={{ __html: output.schedules.footingSchedule }} className="[&_table]:w-full [&_td]:text-[10px]" />
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Drawings */}
      <SectionCard title="Drawings">
        <div className="space-y-2">
          {output.drawings.foundationSvg && (
            <div>
              <h5 className="mb-1 text-[10px] font-medium text-stone-400">Foundation Layout</h5>
              <div dangerouslySetInnerHTML={{ __html: output.drawings.foundationSvg }} className="rounded border border-stone-700/40 bg-white/5" />
            </div>
          )}
          {output.drawings.columnLayoutSvg && (
            <div>
              <h5 className="mb-1 text-[10px] font-medium text-stone-400">Column Layout</h5>
              <div dangerouslySetInnerHTML={{ __html: output.drawings.columnLayoutSvg }} className="rounded border border-stone-700/40 bg-white/5" />
            </div>
          )}
          {output.drawings.loadPathSvg && (
            <div>
              <h5 className="mb-1 text-[10px] font-medium text-stone-400">Load Path Diagram</h5>
              <div dangerouslySetInnerHTML={{ __html: output.drawings.loadPathSvg }} className="rounded border border-stone-700/40 bg-white/5" />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Review label */}
      <div className="rounded-lg border border-amber-700/50 bg-amber-950/20 p-2">
        <p className="text-[10px] font-medium text-amber-400">{output.reviewRequiredLabel}</p>
      </div>
    </div>
  )
}
