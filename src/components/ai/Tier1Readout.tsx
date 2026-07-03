import { useState } from 'react'
import type { Tier1ParsedBrief } from '@/engine/tier1-types'

interface Tier1ReadoutProps {
  parsed: Tier1ParsedBrief | null
}

export function Tier1Readout({ parsed }: Tier1ReadoutProps) {
  const [expanded, setExpanded] = useState(false)

  if (!parsed) return null

  const { typology, typologyConfidence, climateZone, heritagePattern, qualityGate } = parsed
  const passed = qualityGate.passed
  const score = qualityGate.score

  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
  const scoreBg = passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'

  return (
    <div className={`mt-2 rounded-lg border ${scoreBg} p-2.5 text-[10px] transition-colors`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={expanded}
      >
        <span className="text-[9px] font-semibold uppercase tracking-wider text-cyan-400">
          Tier-1 Intelligence
        </span>
        <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-bold ${scoreColor}`}>
          {score}/100
        </span>
        <span className="text-stone-500">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 border-t border-stone-700/40 pt-2">
          {/* Typology */}
          <div className="flex justify-between">
            <span className="text-stone-500">Typology</span>
            <span className="text-stone-200 font-medium">
              {typology ? typology.displayName : 'Not detected'}
              {typology && (
                <span className="ml-1 text-[8px] text-stone-500">
                  ({Math.round(typologyConfidence * 100)}%)
                </span>
              )}
            </span>
          </div>

          {/* Climate zone */}
          <div className="flex justify-between">
            <span className="text-stone-500">Climate Zone</span>
            <span className="text-stone-200 font-medium">
              {climateZone ? climateZone.name : 'Not detected'}
            </span>
          </div>

          {/* Heritage pattern */}
          <div className="flex justify-between">
            <span className="text-stone-500">Heritage Pattern</span>
            <span className="text-stone-200 font-medium">
              {heritagePattern ? heritagePattern.name : 'None detected'}
            </span>
          </div>

          {/* Quality gate issues */}
          {qualityGate.issues.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-semibold text-stone-400 uppercase">Quality Checks</span>
              {qualityGate.issues.map((issue, i) => (
                <div key={i} className={`rounded px-1.5 py-0.5 text-[9px] ${
                  issue.severity === 'error'
                    ? 'bg-red-500/15 text-red-300'
                    : issue.severity === 'warning'
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-blue-500/10 text-blue-300'
                }`}>
                  {issue.message}
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {qualityGate.recommendations.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-[9px] font-semibold text-stone-400 uppercase">Recommendations</span>
              {qualityGate.recommendations.map((rec, i) => (
                <p key={i} className="text-[9px] text-stone-400">→ {rec}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
