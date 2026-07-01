import { useMemo } from 'react'
import type { DesignOption } from '@/domain/boq'
import { buildAnalysisFromDesignOption } from '@/adapters/designToAnalysis'
import { AlertTriangle, Sun, Zap, Shield, CheckCircle, Activity } from 'lucide-react'

interface Props {
  selectedDesign: DesignOption | null
}

function safeStr(v: number | undefined | null, decimals = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '0'
  return Number(v).toFixed(decimals)
}

function money(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '$0'
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function EngineeringAnalysisPanel({ selectedDesign }: Props) {
  const result = useMemo(() => buildAnalysisFromDesignOption(selectedDesign), [selectedDesign])

  if (!selectedDesign) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 border-l border-stone-700/60 bg-stone-950/80 p-4 text-center text-xs text-stone-500">
        <Activity size={18} className="text-stone-600" />
        <p>Describe your project in the AI Brief first. Once designs are ready, this panel checks for clashes, solar orientation, and services.</p>
      </div>
    )
  }

  const { clashes, solar, mep, warnings } = result

  const clashColor = clashes?.statusRating === 'Critical Structural Clash'
    ? 'text-red-400'
    : clashes?.statusRating === 'Moderate Interference'
    ? 'text-amber-400'
    : 'text-emerald-400'

  const solarColor = solar?.efficiencyRating === 'High Exposure Warning'
    ? 'text-red-400'
    : solar?.efficiencyRating === 'Standard'
    ? 'text-amber-400'
    : 'text-emerald-400'

  return (
    <div className="flex flex-col border-l border-stone-700/60 bg-stone-950/80">
      <div className="flex items-center gap-1 border-b border-stone-700/60 px-2 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Engineering Analysis</span>
      </div>

      <div className="overflow-y-auto p-3">
        {/* Design header */}
        <div className="mb-3 rounded-lg border border-stone-700/60 bg-stone-900/80 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Design</span>
            <span className="font-medium text-stone-200">{selectedDesign.name}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-stone-500">Area</span>
            <span className="text-stone-200">{safeStr(selectedDesign.grossFloorArea, 0)} m²</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-stone-500">Floors</span>
            <span className="text-stone-200">{selectedDesign.floors}</span>
          </div>
        </div>

        {/* Clash Detection Card */}
        <div className="mb-3 rounded-lg border border-stone-700/60 bg-stone-900/80 p-3 text-xs">
          <div className="mb-2 flex items-center gap-2">
            <Shield size={14} className="text-cyan-400" />
            <span className="font-semibold text-stone-200">Clash Detection</span>
          </div>
          {clashes ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Status</span>
                <span className={`font-medium ${clashColor}`}>{clashes.statusRating}</span>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-stone-400">{clashes.highSeverityCount} high</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-stone-400">{clashes.moderateSeverityCount} moderate</span>
                </div>
              </div>
              {clashes.clashes.length > 0 && (
                <div className="mt-1 max-h-20 overflow-y-auto space-y-1">
                  {clashes.clashes.slice(0, 3).map((c) => (
                    <div key={c.id} className="rounded bg-stone-800/60 px-2 py-1 text-stone-400">
                      <span className={`text-[10px] font-medium ${c.severity.includes('High') ? 'text-red-400' : 'text-amber-400'}`}>
                        {c.severity}
                      </span>
                      <span className="ml-1">— {c.description.slice(0, 50)}...</span>
                    </div>
                  ))}
                  {clashes.clashes.length > 3 && (
                    <p className="text-[10px] text-stone-500">+{clashes.clashes.length - 3} more</p>
                  )}
                </div>
              )}
              {clashes.clashes.length === 0 && (
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle size={12} />
                  <span>No clashes detected</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-stone-500">Unable to compute clash analysis.</p>
          )}
        </div>

        {/* Solar Analysis Card */}
        <div className="mb-3 rounded-lg border border-stone-700/60 bg-stone-900/80 p-3 text-xs">
          <div className="mb-2 flex items-center gap-2">
            <Sun size={14} className="text-cyan-400" />
            <span className="font-semibold text-stone-200">Solar Orientation</span>
          </div>
          {solar ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Rating</span>
                <span className={`font-medium ${solarColor}`}>{solar.efficiencyRating}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Peak cooling load</span>
                <span className="text-stone-200">{safeStr(solar.totalPeakCoolingLoadKw)} kW</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Glazing ratio</span>
                <span className="text-stone-200">{safeStr(solar.overallWwrPct)}%</span>
              </div>
              {/* Cardinal heat gain mini table */}
              <div className="mt-1 grid grid-cols-2 gap-1">
                {solar.cardinalMetrics.map((m) => (
                  <div key={m.orientation} className="rounded bg-stone-800/60 px-2 py-1">
                    <span className="text-stone-500">{m.orientation}</span>
                    <div className="text-stone-300">{safeStr(m.peakCoolingLoadKw, 1)} kW</div>
                  </div>
                ))}
              </div>
              <div className="mt-1">
                {solar.recommendations.length > 0 && (
                  <div className="flex items-start gap-1 text-stone-400">
                    <span className="mt-0.5 text-stone-500">•</span>
                    <span>{solar.recommendations[0]}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-stone-500">Unable to compute solar analysis.</p>
          )}
        </div>

        {/* MEP Takeoff Card */}
        <div className="mb-3 rounded-lg border border-stone-700/60 bg-stone-900/80 p-3 text-xs">
          <div className="mb-2 flex items-center gap-2">
            <Zap size={14} className="text-cyan-400" />
            <span className="font-semibold text-stone-200">MEP Takeoff</span>
          </div>
          {mep ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Score</span>
                <span className="font-medium text-stone-200">{mep.efficiencyScore}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Electrical points</span>
                <span className="text-stone-200">{mep.totalElecPoints}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Lighting points</span>
                <span className="text-stone-200">{mep.totalLightPoints}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Plumbing points</span>
                <span className="text-stone-200">{mep.totalPlumbPoints}</span>
              </div>
              <div className="flex items-center justify-between border-t border-stone-700/60 pt-1">
                <span className="text-stone-500">Est. services cost</span>
                <span className="font-mono font-semibold text-emerald-400">{money(mep.totalMepCostUsd)}</span>
              </div>
            </div>
          ) : (
            <p className="text-stone-500">Unable to compute MEP takeoff.</p>
          )}
        </div>

        {/* Recommendation cards */}
        <div className="space-y-1.5">
          <div className={`rounded-lg border px-3 py-2 text-[11px] ${
            clashes && clashes.highSeverityCount > 0
              ? 'border-red-800/50 bg-red-950/40 text-red-300'
              : 'border-emerald-800/30 bg-emerald-950/20 text-emerald-300'
          }`}>
            <div className="flex items-center gap-1.5">
              {clashes && clashes.highSeverityCount > 0 ? <AlertTriangle size={13} /> : <CheckCircle size={13} />}
              <span className="font-medium">
                {clashes && clashes.highSeverityCount > 0
                  ? 'Review high severity clashes'
                  : 'No high severity clashes'}
              </span>
            </div>
          </div>

          <div className={`rounded-lg border px-3 py-2 text-[11px] ${
            solar && solar.efficiencyRating === 'High Exposure Warning'
              ? 'border-red-800/50 bg-red-950/40 text-red-300'
              : solar && solar.efficiencyRating === 'Standard'
              ? 'border-amber-800/30 bg-amber-950/20 text-amber-300'
              : 'border-emerald-800/30 bg-emerald-950/20 text-emerald-300'
          }`}>
            <div className="flex items-center gap-1.5">
              <Sun size={13} />
              <span className="font-medium">
                {solar?.efficiencyRating === 'High Exposure Warning'
                  ? 'Solar performance needs shading'
                  : solar?.efficiencyRating === 'Standard'
                  ? 'Solar performance acceptable'
                  : 'Solar performance optimized'}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 px-3 py-2 text-[11px] text-stone-400">
            <div className="flex items-center gap-1.5">
              <Zap size={13} />
              <span className="font-medium text-stone-300">
                {mep && mep.totalMepCostUsd > 0
                  ? `MEP allowances: ${money(mep.totalMepCostUsd)}`
                  : 'MEP allowances included'}
              </span>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-800/30 bg-amber-950/20 p-2 text-[10px] text-amber-400">
            {warnings.map((w, i) => (
              <p key={i}>• {w}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
