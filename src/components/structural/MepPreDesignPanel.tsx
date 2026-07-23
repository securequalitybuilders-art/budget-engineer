import { useMemo } from 'react'
import { computeMepPreDesign } from '@/engine/mep/mepPreDesignEngine'
import type { BuildingGraph } from '@/domain/building'

interface MepPreDesignPanelProps {
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

function SummaryCard({ count, label }: { count: number; label: string }) {
  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-3 text-center">
      <p className="text-2xl font-bold text-cyan-300">{count}</p>
      <p className="text-xs text-stone-400">{label}</p>
    </div>
  )
}

export function MepPreDesignPanel({ graph }: MepPreDesignPanelProps) {
  const output = useMemo(() => {
    if (!graph) return null
    try {
      return computeMepPreDesign(graph)
    } catch {
      return null
    }
  }, [graph])

  if (!graph) {
    return (
      <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-6 text-center">
        <p className="text-sm text-stone-400">No design selected. Generate a design first to see MEP pre-design.</p>
      </div>
    )
  }

  if (!output) {
    return (
      <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-6 text-center">
        <p className="text-sm text-red-400">Could not compute MEP pre-design. Check that the design has valid geometry.</p>
      </div>
    )
  }

  const fixtureEntries = Object.entries(output.boq.fixtureCounts)
  const pointEntries = Object.entries(output.boq.pointCounts)

  return (
    <div className="space-y-3">
      {/* Review banner */}
      <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-2.5">
        <div className="flex items-start gap-2">
          <span className="mt-px text-sm text-amber-500">⚠</span>
          <div>
            <p className="text-xs font-medium text-amber-400">Pre-Design Only — Engineer Review Required</p>
            <p className="mt-0.5 text-[10px] leading-tight text-amber-300/60">
              All MEP layouts shown are schematic and derived from room-type inference rules.
              A qualified engineer must verify all fixture counts, circuit loads, HVAC sizing,
              and shaft coordination before construction.
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <SummaryCard count={output.plumbing.fixtures.length} label="Plumbing Fixtures" />
        <SummaryCard count={output.electrical.points.length} label="Electrical Points" />
        <SummaryCard count={output.hvac.units.length} label="HVAC Units" />
      </div>

      {/* Plumbing */}
      <SectionCard title={`Plumbing (${output.plumbing.fixtures.length} fixtures, ${output.plumbing.zones.length} zones)`} estimate>
        {output.plumbing.zones.length === 0 ? (
          <p className="text-[11px] text-stone-500">No wet rooms detected.</p>
        ) : (
          <div className="space-y-1.5">
            {output.plumbing.zones.map((z) => (
              <div key={z.id} className="rounded border border-stone-700/40 bg-stone-900/40 px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-300">{z.label}</span>
                  <span className="text-[10px] text-cyan-300/80">{z.waterDemandLmin} L/min</span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {z.fixtures.map((f) => (
                    <span key={f.id} className="rounded bg-stone-800/60 px-1.5 py-0.5 text-[9px] text-stone-400">
                      {f.type}{f.stacked ? ' ↕' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {output.plumbing.stacks.length > 0 && (
              <div className="text-[10px] text-stone-500">
                {output.plumbing.stacks.length} waste stack{output.plumbing.stacks.length !== 1 ? 's' : ''} · {output.plumbing.stacks.reduce((s, st) => s + st.levelsServed.length, 0)} levels served
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Electrical */}
      <SectionCard title={`Electrical (${output.electrical.points.length} points, ${output.electrical.circuits.length} circuits)`} estimate>
        <div className="space-y-1">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="text-left text-stone-500">
                  <th className="px-1.5 py-1 font-medium">Circuit</th>
                  <th className="px-1.5 py-1 font-medium">Type</th>
                  <th className="px-1.5 py-1 text-right font-medium">Points</th>
                  <th className="px-1.5 py-1 text-right font-medium">Watts</th>
                  <th className="px-1.5 py-1 text-right font-medium">Load A</th>
                  <th className="px-1.5 py-1 text-right font-medium">Breaker</th>
                </tr>
              </thead>
              <tbody>
                {output.electrical.circuits.map((c) => (
                  <tr key={c.id} className="border-t border-stone-700/40 text-stone-300">
                    <td className="px-1.5 py-1 font-medium">{c.name}</td>
                    <td className="px-1.5 py-1 text-stone-400">{c.type}</td>
                    <td className="px-1.5 py-1 text-right">{c.points.length}</td>
                    <td className="px-1.5 py-1 text-right">{c.totalWattage}</td>
                    <td className="px-1.5 py-1 text-right">{c.estimatedLoadA}</td>
                    <td className="px-1.5 py-1 text-right">{c.breakerA}A</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 text-[10px] text-stone-400">
            <span>DB: {output.electrical.db.totalLoadKva} kVA</span>
            <span>Main breaker: {output.electrical.db.mainBreakerA}A</span>
            <span>{output.electrical.db.spareWays} spare way{output.electrical.db.spareWays !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </SectionCard>

      {/* HVAC */}
      <SectionCard title={`HVAC (${output.hvac.units.length} units)`} estimate>
        {output.hvac.units.length === 0 ? (
          <p className="text-[11px] text-stone-500">No habitable or wet rooms detected for HVAC.</p>
        ) : (
          <div className="space-y-1">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="text-left text-stone-500">
                    <th className="px-1.5 py-1 font-medium">Unit</th>
                    <th className="px-1.5 py-1 font-medium">Type</th>
                    <th className="px-1.5 py-1 text-right font-medium">Area m²</th>
                    <th className="px-1.5 py-1 text-right font-medium">kW</th>
                    <th className="px-1.5 py-1 text-center font-medium">Supply</th>
                    <th className="px-1.5 py-1 text-center font-medium">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {output.hvac.units.map((u) => (
                    <tr key={u.id} className="border-t border-stone-700/40 text-stone-300">
                      <td className="px-1.5 py-1 font-medium">{u.id}</td>
                      <td className="px-1.5 py-1 text-stone-400">{u.type}</td>
                      <td className="px-1.5 py-1 text-right">{u.servedAreaM2}</td>
                      <td className="px-1.5 py-1 text-right">{u.capacityKw}</td>
                      <td className="px-1.5 py-1 text-center">{u.supplyAir ? '✓' : '-'}</td>
                      <td className="px-1.5 py-1 text-center">{u.returnAir ? '✓' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {output.hvac.shafts.length > 0 && (
              <div className="text-[10px] text-stone-500">
                {output.hvac.shafts.length} shaft{output.hvac.shafts.length !== 1 ? 's' : ''}: {output.hvac.shafts.map((s) => s.label).join(', ')}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* MEP BOQ */}
      <SectionCard title="MEP BOQ" estimate>
        <div className="space-y-1">
          {fixtureEntries.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-stone-400">Plumbing fixtures</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-stone-300">
                {fixtureEntries.map(([t, c]) => (
                  <span key={t}>{t}: {c}</span>
                ))}
              </div>
            </div>
          )}
          {pointEntries.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-stone-400">Electrical points</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-stone-300">
                {pointEntries.map(([t, c]) => (
                  <span key={t}>{t}: {c}</span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 text-[10px] text-stone-400">
            <span>HVAC units: {output.boq.hvacUnits}</span>
            <span>Shaft services: {output.boq.shaftServices}</span>
          </div>
          <StatCard label="Estimated Cost" value={`$${(output.boq.estimatedCostCents / 100).toLocaleString()}`} />
        </div>
        {output.boq.notes.map((note, i) => (
          <p key={i} className="mt-1 text-[10px] text-stone-500">{note}</p>
        ))}
      </SectionCard>

      {/* Drawings */}
      <SectionCard title="MEP Drawings">
        <div className="space-y-2">
          {output.drawings.plumbingSvg && (
            <div>
              <h5 className="mb-1 text-[10px] font-medium text-stone-400">Plumbing Schematic</h5>
              <div dangerouslySetInnerHTML={{ __html: output.drawings.plumbingSvg }} className="rounded border border-stone-700/40 bg-white/5" />
            </div>
          )}
          {output.drawings.electricalSvg && (
            <div>
              <h5 className="mb-1 text-[10px] font-medium text-stone-400">Electrical Schematic</h5>
              <div dangerouslySetInnerHTML={{ __html: output.drawings.electricalSvg }} className="rounded border border-stone-700/40 bg-white/5" />
            </div>
          )}
          {output.drawings.hvacSvg && (
            <div>
              <h5 className="mb-1 text-[10px] font-medium text-stone-400">HVAC Schematic</h5>
              <div dangerouslySetInnerHTML={{ __html: output.drawings.hvacSvg }} className="rounded border border-stone-700/40 bg-white/5" />
            </div>
          )}
          {output.drawings.shaftCoordinationSvg && (
            <div>
              <h5 className="mb-1 text-[10px] font-medium text-stone-400">Shaft Coordination</h5>
              <div dangerouslySetInnerHTML={{ __html: output.drawings.shaftCoordinationSvg }} className="rounded border border-stone-700/40 bg-white/5" />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Review label */}
      <div className="rounded-lg border border-amber-700/50 bg-amber-950/20 p-2">
        <p className="text-[10px] font-medium text-amber-400">{output.reviewLabel}</p>
      </div>
    </div>
  )
}
