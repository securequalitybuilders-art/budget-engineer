import { useMemo, useState } from 'react'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import type { BOQ } from '@/lib/boq/boq-types'
import { assembleAnalysis, emptyAnalysis, type AnalysisResult } from '@/engine/calculators/analysisAssembly'
import type { RoomAreaInput } from '@/engine/calculators/areaSchedule'
import { runCompliance, summarizeCompliance } from '@/engine/compliance'

interface AnalysisPanelProps {
  plan: PlanModel | null
  design: DesignOption | null
  boq: BOQ | null
  buildingType: string
  jurisdiction?: string
}

function ValueCard({ label, value, unit, ok, warn }: { label: string; value: string; unit?: string; ok?: boolean; warn?: boolean }) {
  const color = ok === true ? 'text-emerald-400' : ok === false ? 'text-red-400' : warn ? 'text-amber-400' : 'text-stone-200'
  return (
    <div className="flex items-center justify-between rounded border border-stone-700/60 bg-stone-900/60 px-2.5 py-1.5">
      <span className="text-[11px] text-stone-400">{label}</span>
      <span className={`text-xs font-medium ${color}`}>{value}{unit ? <span className="ml-0.5 text-[10px] text-stone-400">{unit}</span> : null}</span>
    </div>
  )
}

function SectionCard({ title, children, estimate }: { title: string; children: React.ReactNode; estimate?: boolean }) {
  return (
    <div className="mb-2 rounded-lg border border-stone-700/60 bg-stone-950/80 p-2.5">
      <h4 className="mb-1.5 text-xs font-semibold text-cyan-300">{title}</h4>
      <div className="space-y-1">{children}</div>
      {estimate && <p className="mt-1 text-[9px] italic text-amber-500/70">Preliminary estimate — consult a professional</p>}
    </div>
  )
}

function RoomAreaTable({ rooms }: { rooms: RoomAreaInput[] }) {
  if (rooms.length === 0) return <p className="text-[10px] text-stone-400">No rooms</p>
  const sorted = [...rooms].sort((a, b) => b.area - a.area)
  return (
    <div className="max-h-28 overflow-y-auto">
      {sorted.map((r, i) => (
        <div key={i} className="flex items-center justify-between py-0.5">
          <span className="text-[10px] text-stone-400">{r.name || r.type || 'Room ' + (i + 1)}</span>
          <span className="text-[10px] text-stone-300">{r.area.toFixed(1)} m²</span>
        </div>
      ))}
    </div>
  )
}

function EmptyAnalysisState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-sm text-stone-400">Generate a design to see analysis</p>
    </div>
  )
}

export function AnalysisPanel({ plan, design, boq, buildingType, jurisdiction: initialJurisdiction = 'zimbabwe' }: AnalysisPanelProps) {
  const [jurisdiction, setJurisdiction] = useState(initialJurisdiction)
  const jurisdictionLabel = { 'zimbabwe': 'ZBC', 'south-africa': 'SANS 10400', 'zambia': 'Public Health Act CAP 295', 'botswana': 'Building Control Regs' }
  const result = useMemo<AnalysisResult>(() => {
    try {
      if (!design && !plan) return emptyAnalysis()
      return assembleAnalysis({ plan, design, boq, buildingType })
    } catch {
      return emptyAnalysis()
    }
  }, [plan, design, boq, buildingType])

  const complianceReport = useMemo(() => {
    try {
      if (!design && !plan) return undefined
      return runCompliance(jurisdiction, { plan, design, analysis: result, buildingType })
    } catch {
      return undefined
    }
  }, [plan, design, result, buildingType, jurisdiction])

  const complianceSummary = useMemo(() => {
    if (!complianceReport || complianceReport.results.length === 0) return undefined
    return summarizeCompliance(complianceReport)
  }, [complianceReport])

  const { areaSchedule, envelope, daylight, egress, structural, energy, cost, roomDaylightFlags } = result

  const hasData = areaSchedule.roomCount > 0 || (design?.grossFloorArea ?? 0) > 0

  if (!hasData) {
    return <EmptyAnalysisState />
  }

  return (
    <div className="space-y-2">
      {/* Area Schedule */}
      <SectionCard title="Area Schedule">
        <ValueCard label="Gross floor area" value={areaSchedule.grossFloorArea.toFixed(1)} unit="m²" />
        <ValueCard label="Net usable area" value={areaSchedule.netUsableArea.toFixed(1)} unit="m²" />
        <ValueCard label="Circulation" value={areaSchedule.circulationPercent.toFixed(1)} unit="%" warn={areaSchedule.circulationPercent > 35} />
        <ValueCard label="Efficiency" value={(areaSchedule.efficiencyRatio * 100).toFixed(1)} unit="%" ok={areaSchedule.efficiencyRatio >= 0.65} warn={areaSchedule.efficiencyRatio < 0.5} />
        <ValueCard label="Rooms" value={String(areaSchedule.roomCount)} />
        {areaSchedule.areaPerRoom.length > 0 && <RoomAreaTable rooms={areaSchedule.areaPerRoom} />}
      </SectionCard>

      {/* Envelope U-values */}
      <SectionCard title="Envelope U-values" estimate>
        {envelope ? (
          <>
            <ValueCard label="Wall U-value" value={envelope.wall.uValue.toFixed(3)} unit="W/m²K" ok={envelope.wall.passes} />
            <ValueCard label="Roof U-value" value={envelope.roof.uValue.toFixed(3)} unit="W/m²K" ok={envelope.roof.passes} />
            <p className="mt-0.5 text-[9px] text-stone-400">Target: ≤{envelope.wall.targetUValue?.toFixed(2) ?? '—'} W/m²K</p>
          </>
        ) : (
          <p className="text-[10px] text-stone-400">Default assemblies used — update for accurate results</p>
        )}
      </SectionCard>

      {/* Daylight */}
      <SectionCard title="Daylight" estimate>
        {daylight ? (
          <>
            <ValueCard label="Avg daylight factor" value={daylight.averageDaylightFactor.toFixed(1)} unit="%" ok={daylight.passes} />
            <ValueCard label="Glazing/floor ratio" value={daylight.glazingToFloorRatio.toFixed(3)} />
            <ValueCard label="Rooms below 2% DF" value={String(roomDaylightFlags)} ok={roomDaylightFlags === 0} />
          </>
        ) : (
          <p className="text-[10px] text-stone-400">No room data for daylight analysis</p>
        )}
      </SectionCard>

      {/* Egress */}
      <SectionCard title="Egress & Occupancy" estimate>
        <ValueCard label="Occupant load" value={String(egress.occupantLoad)} unit="persons" />
        <ValueCard label="Required exits" value={String(egress.numberOfExits)} ok={egress.numberOfExits >= 1} />
        <ValueCard label="Exit width" value={egress.requiredExitWidthM.toFixed(2)} unit="m" />
        <ValueCard label="Travel distance" value={egress.maxTravelDistanceM + ' m'} ok={egress.travelDistanceOk} />
      </SectionCard>

      {/* Structural */}
      <SectionCard title="Structural Loads (PRELIMINARY)" estimate>
        <ValueCard label="Dead load" value={structural.deadLoadKnm2.toFixed(2)} unit="kN/m²" />
        <ValueCard label="Live load" value={structural.liveLoadKnm2.toFixed(2)} unit="kN/m²" />
        <ValueCard label="Total (kN/m²)" value={structural.totalLoadKnm2.toFixed(2)} unit="kN/m²" />
        <ValueCard label="Total (building)" value={structural.grandTotalKn.toFixed(0)} unit="kN" />
        {structural.tributaryLoadKn != null && (
          <ValueCard label="Tributary load" value={structural.tributaryLoadKn.toFixed(1)} unit="kN" />
        )}
      </SectionCard>

      {/* Energy */}
      <SectionCard title="Energy Demand" estimate>
        <ValueCard label="Heating" value={energy.annualHeatingDemandKwhM2.toFixed(1)} unit="kWh/m²/yr" />
        <ValueCard label="Cooling" value={energy.annualCoolingDemandKwhM2.toFixed(1)} unit="kWh/m²/yr" />
        <ValueCard label="Total annual" value={(energy.annualHeatingDemandKwh + energy.annualCoolingDemandKwh).toFixed(0)} unit="kWh" />
        <p className="mt-0.5 text-[9px] text-stone-400">Degree-day envelope estimate (HDD={energy.annualHeatingDemandKwh > 0 ? '~1,000' : '—'})</p>
      </SectionCard>

      {/* Cost */}
      <SectionCard title="Cost Summary">
        <ValueCard label="Cost per m²" value={cost.costPerM2.toFixed(2)} unit={cost.currency + '/m²'} />
        <ValueCard label="Subtotal" value={cost.subtotal.toFixed(2)} unit={cost.currency} />
        <ValueCard label="Grand Total" value={cost.grandTotal.toFixed(2)} unit={cost.currency} />
        {cost.boqReused && <p className="mt-0.5 text-[9px] text-emerald-500/70">via existing BOQ engine</p>}
      </SectionCard>

      {/* Compliance */}
      <div className="mb-2 rounded-lg border border-stone-700/60 bg-stone-950/80 p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-cyan-300">Compliance</h4>
          <label className="text-[10px] text-stone-400">
            Jurisdiction{' '}
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="ml-1 rounded border border-stone-700 bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-200"
              aria-label="Building jurisdiction"
            >
              <option value="zimbabwe">Zimbabwe (ZBC)</option>
              <option value="south-africa">South Africa (SANS 10400)</option>
              <option value="zambia">Zambia (Public Health Act CAP 295)</option>
              <option value="botswana">Botswana (Building Control Regs)</option>
            </select>
          </label>
        </div>
        <p className="mb-1 text-[8px] italic text-amber-500/60">Non-authoritative — verify all items with local authority.</p>
        {complianceSummary && complianceReport && (
          <>
            <div className="mb-1 flex gap-2 text-[10px]">
              <span className="text-stone-400">{(jurisdictionLabel as Record<string, string>)[complianceReport.jurisdiction] ?? complianceReport.jurisdiction} {complianceReport.score}/100</span>
              <span className="text-emerald-400">{complianceSummary.passCount} pass</span>
              <span className="text-amber-400">{complianceSummary.warnCount} warn</span>
              {complianceSummary.failCount > 0 && <span className="text-red-400">{complianceSummary.failCount} fail</span>}
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {complianceReport.results.map((r) => (
                <div key={r.ruleId} className="flex items-start gap-1.5 rounded border border-stone-700/40 bg-stone-900/60 p-1.5">
                  <span className={`mt-0.5 shrink-0 rounded-full px-1 py-0.5 text-[8px] font-bold uppercase ${
                    r.status === 'pass' ? 'bg-emerald-500/20 text-emerald-300' :
                    r.status === 'warn' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>{r.status}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-stone-200">{r.title}</p>
                    <p className="text-[8px] text-stone-400">Actual: {r.actual} | Required: {r.required}</p>
                    <p className="mt-0.5 text-[7px] italic text-stone-400">{r.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
