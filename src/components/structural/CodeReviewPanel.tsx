import { useState, useMemo } from 'react'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import { runCompliance, summarizeCompliance, SUPPORTED_JURISDICTIONS } from '@/engine/compliance'
import type { ComplianceReport } from '@/engine/compliance/types'
import { runCodeReview } from '@/engine/compliance/codeReviewEngine'
import type { CodeCheck } from '@/engine/compliance/codeReviewEngine'

interface CodeReviewPanelProps {
  plan: PlanModel | null
  design: DesignOption | null
  buildingType: string
}

function StatusDot({ state }: { state: string }) {
  const colors: Record<string, string> = {
    pass: 'bg-emerald-500',
    warn: 'bg-amber-500',
    fail: 'bg-red-500',
    info: 'bg-stone-500',
  }
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[state] ?? 'bg-stone-500'}`} />
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-300',
    major: 'bg-amber-500/20 text-amber-300',
    minor: 'bg-blue-500/20 text-blue-300',
    info: 'bg-stone-500/20 text-stone-400',
  }
  return <span className={`rounded px-1 py-0.5 text-[8px] font-medium uppercase ${colors[severity] ?? 'bg-stone-500/20 text-stone-400'}`}>{severity}</span>
}

function DecisionBadge({ decision }: { decision: string }) {
  const colors: Record<string, string> = {
    PASS: 'bg-emerald-500/20 text-emerald-300 border-emerald-700/50',
    'CONDITIONAL PASS': 'bg-amber-500/20 text-amber-300 border-amber-700/50',
    REVISE: 'bg-red-500/20 text-red-300 border-red-700/50',
  }
  return (
    <span className={`rounded border px-2 py-0.5 text-[11px] font-bold uppercase ${colors[decision] ?? ''}`}>
      {decision}
    </span>
  )
}

export function CodeReviewPanel({ plan, design, buildingType }: CodeReviewPanelProps) {
  const [jurisdiction, setJurisdiction] = useState('zimbabwe')

  const complianceReport = useMemo<ComplianceReport | undefined>(() => {
    try {
      if (!design && !plan) return undefined
      return runCompliance(jurisdiction, { plan, design, analysis: null, buildingType })
    } catch {
      return undefined
    }
  }, [plan, design, buildingType, jurisdiction])

  const reviewResult = useMemo(() => {
    try {
      return runCodeReview({
        plan,
        design,
        buildingType,
        occupantLoad: undefined,
        numberOfExits: undefined,
        maxTravelDistanceM: undefined,
        grossFloorArea: design?.grossFloorArea,
      })
    } catch {
      return null
    }
  }, [plan, design, buildingType])

  const complianceSummary = useMemo(() => {
    if (!complianceReport || complianceReport.results.length === 0) return undefined
    return summarizeCompliance(complianceReport)
  }, [complianceReport])

  const allChecks = reviewResult?.checks ?? []

  // Group by category
  const categories = new Map<string, CodeCheck[]>()
  for (const check of allChecks) {
    const arr = categories.get(check.category) ?? []
    arr.push(check)
    categories.set(check.category, arr)
  }

  const categoryOrder = [
    'Room Minimums', 'Egress', 'Corridor Widths', 'Stair Geometry',
    'Accessibility', 'Daylight / Ventilation', 'Sanitary Counts',
    'Occupancy', 'Setbacks / Site Coverage', 'Fire Separation',
  ]

  return (
    <div className="space-y-3">
      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-2.5">
        <div className="flex items-start gap-2">
          <span className="mt-px text-sm text-amber-500">⚠</span>
          <div>
            <p className="text-xs font-medium text-amber-400">Code-Assisted Pre-Check — Not Certified Approval</p>
            <p className="mt-0.5 text-[10px] leading-tight text-amber-300/60">
              This is an automated pre-check based on simplified rules. Final compliance requires
              review and sign-off by a qualified professional and approval from the relevant local authority.
            </p>
          </div>
        </div>
      </div>

      {/* Jurisdiction selector */}
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-medium text-stone-400">Jurisdiction</label>
        <select
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value)}
          className="rounded border border-stone-700 bg-stone-800 px-2 py-1 text-[11px] text-stone-200"
        >
          {SUPPORTED_JURISDICTIONS.map((j) => (
            <option key={j.value} value={j.value}>{j.label}</option>
          ))}
        </select>
      </div>

      {/* Compliance summary from jurisdiction engine */}
      {complianceSummary && complianceReport && (
        <div className="rounded-lg border border-stone-700/60 bg-stone-950/80 p-2.5">
          <h4 className="mb-1.5 text-xs font-semibold text-cyan-300">Compliance — {complianceReport.jurisdiction}</h4>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-stone-400">Score: {complianceReport.score}/100</span>
            <span className="text-emerald-400">{complianceSummary.passCount} pass</span>
            <span className="text-amber-400">{complianceSummary.warnCount} warn</span>
            {complianceSummary.failCount > 0 && <span className="text-red-400">{complianceSummary.failCount} fail</span>}
          </div>
          <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto">
            {complianceReport.results.map((r) => (
              <div key={r.ruleId} className="flex items-start gap-1.5 rounded border border-stone-700/40 bg-stone-900/60 p-1.5">
                <span className={`mt-0.5 shrink-0 rounded-full px-1 py-0.5 text-[8px] font-bold uppercase ${
                  r.status === 'pass' ? 'bg-emerald-500/20 text-emerald-300' :
                  r.status === 'warn' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
                }`}>{r.status}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-stone-200">{r.title}</p>
                  <p className="text-[8px] text-stone-400">{r.required} — Actual: {r.actual}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expanded code review */}
      {reviewResult && (
        <div className="rounded-lg border border-stone-700/60 bg-stone-950/80 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-cyan-300">Expanded Code Review</h4>
            <DecisionBadge decision={reviewResult.decision} />
          </div>

          <div className="mb-1.5 flex flex-wrap gap-2 text-[10px]">
            <span className="text-stone-400">Score: {reviewResult.summary.score}/100</span>
            <span className="text-emerald-400">{reviewResult.summary.pass} pass</span>
            <span className="text-amber-400">{reviewResult.summary.warn} warn</span>
            {reviewResult.summary.fail > 0 && <span className="text-red-400">{reviewResult.summary.fail} fail</span>}
            <span className="text-stone-500">{reviewResult.summary.info} info</span>
          </div>

          <div className="space-y-2">
            {categoryOrder.map((cat) => {
              const catChecks = categories.get(cat)
              if (!catChecks || catChecks.length === 0) return null
              const catFail = catChecks.filter((c) => c.state === 'fail').length
              const catWarn = catChecks.filter((c) => c.state === 'warn').length
              return (
                <div key={cat} className="rounded border border-stone-700/40 bg-stone-900/40 p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <h5 className="text-[10px] font-medium text-stone-300">{cat}</h5>
                    <div className="flex gap-1.5 text-[8px]">
                      {catFail > 0 && <span className="text-red-400">{catFail} fail</span>}
                      {catWarn > 0 && <span className="text-amber-400">{catWarn} warn</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {catChecks.map((check) => (
                      <div key={check.id} className="flex items-start gap-1.5 rounded bg-stone-800/40 px-1.5 py-1">
                        <StatusDot state={check.state} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-medium text-stone-200">{check.title}</span>
                            <SeverityBadge severity={check.severity} />
                          </div>
                          <p className="text-[8px] text-stone-400">
                            <span className="text-stone-500">Req:</span> {check.requirement}
                            {' · '}
                            <span className="text-stone-500">Act:</span> {check.actual}
                          </p>
                          {check.location && (
                            <p className="text-[7px] text-stone-500">Location: {check.location}</p>
                          )}
                          <p className="mt-0.5 text-[7px] italic text-stone-400">{check.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Issue summary */}
      {reviewResult && (reviewResult.summary.fail > 0 || reviewResult.summary.critical > 0 || reviewResult.summary.major > 0) && (
        <div className="rounded-lg border border-red-700/40 bg-red-950/20 p-2.5">
          <h4 className="mb-1 text-xs font-semibold text-red-400">Issues Requiring Attention</h4>
          <div className="space-y-1">
            {allChecks
              .filter((c) => c.state === 'fail' || (c.state === 'warn' && c.severity === 'critical'))
              .map((check) => (
                <div key={check.id} className="flex items-start gap-1.5 text-[10px]">
                  <span className="mt-0.5 text-red-400">✗</span>
                  <div>
                    <span className="text-stone-300">{check.title}</span>
                    <span className="ml-1 text-stone-500">— {check.requirement} (actual: {check.actual})</span>
                    {check.location && <span className="ml-1 text-stone-600">@{check.location}</span>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
