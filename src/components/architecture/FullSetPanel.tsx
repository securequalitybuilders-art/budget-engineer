// ── Full Set Panel ──────────────────────────────────────────
// City council submission drawing set viewer + download hub.
// Shows all 19 SADC drawings, compliance citations, IFC annotations,
// area/door-window schedules, and plotter stats.

import { useMemo, useState } from 'react'
import {
  FileText, CheckCircle, AlertTriangle, XCircle,
  Building2, Clock, Pen, Layers, ChevronDown, ChevronRight,
} from 'lucide-react'
import type { FullSetResult, FullSetDrawing, ComplianceCitation, AreaScheduleEntry, DoorWindowEntry } from '@/engine/architecture/fullSetGenerator'

/* ──────────────────────────────────────────────────────────── */
/*  Types                                                        */
/* ──────────────────────────────────────────────────────────── */

interface FullSetPanelProps {
  result: FullSetResult
  className?: string
}

type TabId = 'drawings' | 'compliance' | 'schedules' | 'ifc' | 'plotter'

/* ──────────────────────────────────────────────────────────── */
/*  Main panel                                                    */
/* ──────────────────────────────────────────────────────────── */

export function FullSetPanel({ result, className }: FullSetPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('drawings')
  const [expandedDrawing, setExpandedDrawing] = useState<string | null>(null)

  const tabs: { id: TabId; label: string; count?: number }[] = useMemo(() => [
    { id: 'drawings', label: 'Drawings', count: result.drawings.length },
    { id: 'compliance', label: 'Compliance', count: result.complianceReport.results.length },
    { id: 'schedules', label: 'Schedules' },
    { id: 'ifc', label: 'IFC', count: result.ifcEntityCount },
    { id: 'plotter', label: 'Plotter' },
  ], [result])

  return (
    <div className={className} data-testid="full-set-panel">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={<FileText size={14} />}
          label="Drawings"
          value={String(result.drawings.length)}
          color="text-cyan-400"
        />
        <StatCard
          icon={<CheckCircle size={14} />}
          label="Compliance"
          value={`${result.complianceReport.score}%`}
          color={result.complianceReport.score >= 80 ? 'text-green-400' : 'text-amber-400'}
          detail={`${result.complianceReport.passedRules}/${result.complianceReport.totalRules} rules`}
        />
        <StatCard
          icon={<Building2 size={14} />}
          label="IFC entities"
          value={String(result.ifcEntityCount)}
          color="text-cyan-400"
        />
        <StatCard
          icon={<Pen size={14} />}
          label="Pen-up travel"
          value={`${result.totalPenUpMetres}m`}
          color="text-cyan-400"
          detail={`${result.totalPenLifts} lifts`}
        />
        <StatCard
          icon={<Clock size={14} />}
          label="Generated"
          value={`${result.generationTimeMs}ms`}
          color="text-cyan-400"
          detail={result.projectName}
        />
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 border-b border-[var(--border-default)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-[var(--brand-accent)] text-[var(--brand-accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}{tab.count != null ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        {activeTab === 'drawings' && (
          <DrawingsTab
            drawings={result.drawings}
            expanded={expandedDrawing}
            onToggle={setExpandedDrawing}
          />
        )}
        {activeTab === 'compliance' && <ComplianceTab result={result} />}
        {activeTab === 'schedules' && <SchedulesTab result={result} />}
        {activeTab === 'ifc' && <IfcTab drawings={result.drawings} />}
        {activeTab === 'plotter' && <PlotterTab result={result} />}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/*  Drawings tab                                                  */
/* ──────────────────────────────────────────────────────────── */

function DrawingsTab({ drawings, expanded, onToggle }: {
  drawings: FullSetDrawing[]
  expanded: string | null
  onToggle: (id: string | null) => void
}) {
  return (
    <div className="space-y-2" data-testid="drawings-tab">
      {drawings.map((d) => {
        const isOpen = expanded === d.id
        return (
          <div key={d.id} className="rounded-lg border border-[var(--border-default)]">
            <button
              onClick={() => onToggle(isOpen ? null : d.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left"
            >
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span className="text-[10px] font-mono text-cyan-400 w-10">{d.sadcCode}</span>
              <span className="text-[10px] font-medium text-[var(--text-primary)] flex-1">{d.title}</span>
              <span className="text-[9px] text-[var(--text-muted)]">{d.scale}</span>
              {d.isPlanView && <span className="text-[8px] text-cyan-400">plan</span>}
              {d.citations.length > 0 && (
                <span className="text-[8px] text-green-400">{d.citations.length} rule(s)</span>
              )}
              {d.ifcAnnotations.length > 0 && (
                <span className="text-[8px] text-[var(--brand-accent)]">{d.ifcAnnotations.length} IFC</span>
              )}
            </button>
            {isOpen && (
              <div className="border-t border-[var(--border-default)] px-3 py-3">
                {/* SVG preview */}
                <div
                  className="max-h-[400px] overflow-auto rounded bg-white p-2"
                  dangerouslySetInnerHTML={{ __html: d.svg }}
                />
                {/* Drawing info */}
                <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-[var(--text-muted)]">
                  <span>{d.dimensions.width}×{d.dimensions.height}px</span>
                  <span>{d.plotterPaths.length} path(s)</span>
                  {d.citations.length > 0 && <span className="text-green-400">{d.citations.length} citation(s)</span>}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/*  Compliance tab                                                */
/* ──────────────────────────────────────────────────────────── */

function ComplianceTab({ result }: { result: FullSetResult }) {
  const { complianceReport } = result
  const passCount = complianceReport.results.filter((r) => r.status === 'pass').length
  const warnCount = complianceReport.results.filter((r) => r.status === 'warn').length
  const failCount = complianceReport.results.filter((r) => r.status === 'fail').length

  return (
    <div className="space-y-3" data-testid="compliance-tab">
      {/* Summary bar */}
      <div className="flex items-center gap-3 text-[10px]">
        <span className="font-semibold text-[var(--text-primary)]">
          Score: {complianceReport.score}%
        </span>
        <span className="text-green-400">{passCount} passed</span>
        <span className="text-amber-400">{warnCount} warnings</span>
        <span className="text-red-400">{failCount} failed</span>
        <span className="text-[var(--text-muted)]">{complianceReport.totalRules} total</span>
      </div>

      {/* Rule list */}
      {complianceReport.results.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No compliance rules evaluated</p>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-auto">
          {complianceReport.results.map((rule, i) => (
            <div key={i} className="flex items-start gap-2 rounded bg-[var(--bg-tertiary)] px-3 py-2">
              <StatusIcon status={rule.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-medium text-cyan-400 shrink-0">{rule.ruleId}</span>
                  <span className="text-[9px] font-medium text-[var(--text-primary)] truncate">{rule.title}</span>
                </div>
                {rule.note && <p className="mt-0.5 text-[8px] text-[var(--text-muted)]">{rule.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RAG citations across all drawings */}
      <h3 className="text-[10px] font-semibold text-[var(--text-primary)] mt-4">
        RAG Citations ({result.drawings.reduce((s, d) => s + d.citations.length, 0)} total)
      </h3>
      <div className="space-y-1 max-h-[300px] overflow-auto">
        {result.drawings.flatMap((d) =>
          d.citations.map((c, ci) => (
            <CitationRow key={`${d.id}-${ci}`} citation={c} drawingCode={d.sadcCode} />
          ))
        )}
        {result.drawings.every((d) => d.citations.length === 0) && (
          <p className="text-sm text-[var(--text-muted)]">No RAG citations available</p>
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/*  Schedules tab                                                 */
/* ──────────────────────────────────────────────────────────── */

function SchedulesTab({ result }: { result: FullSetResult }) {
  return (
    <div className="space-y-4" data-testid="schedules-tab">
      {/* Area schedule */}
      <div>
        <h3 className="mb-2 text-[10px] font-semibold text-[var(--text-primary)]">
          Area Schedule ({result.areaSchedule.length} rooms)
        </h3>
        <div className="max-h-[250px] overflow-auto">
          <table className="w-full text-[9px]">
            <thead>
              <tr className="border-b border-[var(--border-default)] text-left text-[var(--text-muted)]">
                <th className="px-2 py-1">#</th>
                <th className="px-2 py-1">Room</th>
                <th className="px-2 py-1 text-right">Area (m²)</th>
                <th className="px-2 py-1">Zone</th>
                <th className="px-2 py-1 text-right">Min (m²)</th>
                <th className="px-2 py-1">OK</th>
              </tr>
            </thead>
            <tbody>
              {result.areaSchedule.map((e: AreaScheduleEntry, i: number) => (
                <tr key={i} className="border-b border-[var(--border-default)]">
                  <td className="px-2 py-1 text-[var(--text-muted)]">{e.roomNumber}</td>
                  <td className="px-2 py-1 text-[var(--text-primary)]">{e.roomName}</td>
                  <td className="px-2 py-1 text-right font-mono text-[var(--text-secondary)]">{e.areaM2.toFixed(1)}</td>
                  <td className="px-2 py-1 text-[var(--text-muted)]">{e.zone}</td>
                  <td className="px-2 py-1 text-right font-mono text-[var(--text-muted)]">{e.minRequiredM2.toFixed(1)}</td>
                  <td className="px-2 py-1">{e.compliant ? '✓' : '✗'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Door/window schedule */}
      <div>
        <h3 className="mb-2 text-[10px] font-semibold text-[var(--text-primary)]">
          Door & Window Schedule ({result.doorWindowSchedule.length} items)
        </h3>
        <div className="max-h-[250px] overflow-auto">
          <table className="w-full text-[9px]">
            <thead>
              <tr className="border-b border-[var(--border-default)] text-left text-[var(--text-muted)]">
                <th className="px-2 py-1">ID</th>
                <th className="px-2 py-1">Type</th>
                <th className="px-2 py-1 text-right">Width (mm)</th>
                <th className="px-2 py-1 text-right">Height (mm)</th>
                <th className="px-2 py-1">Location</th>
              </tr>
            </thead>
            <tbody>
              {result.doorWindowSchedule.map((e: DoorWindowEntry, i: number) => (
                <tr key={i} className="border-b border-[var(--border-default)]">
                  <td className="px-2 py-1 font-mono text-cyan-400">{e.id}</td>
                  <td className="px-2 py-1 text-[var(--text-primary)]">{e.type}</td>
                  <td className="px-2 py-1 text-right font-mono text-[var(--text-secondary)]">{e.widthMm}</td>
                  <td className="px-2 py-1 text-right font-mono text-[var(--text-secondary)]">{e.heightMm}</td>
                  <td className="px-2 py-1 text-[var(--text-muted)]">{e.room}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/*  IFC tab                                                       */
/* ──────────────────────────────────────────────────────────── */

function IfcTab({ drawings }: { drawings: FullSetDrawing[] }) {
  const allAnnotations = drawings.flatMap((d) =>
    d.ifcAnnotations.map((a) => ({ ...a, drawingCode: d.sadcCode, drawingTitle: d.title }))
  )

  const byEntity = useMemo(() => {
    const map = new Map<string, typeof allAnnotations>()
    for (const a of allAnnotations) {
      const list = map.get(a.entity) || []
      list.push(a)
      map.set(a.entity, list)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [allAnnotations])

  return (
    <div className="space-y-3" data-testid="ifc-tab">
      <p className="text-[10px] text-[var(--text-muted)]">
        {allAnnotations.length} IFC entity annotations across {drawings.length} drawings
      </p>
      {byEntity.map(([entity, annotations]) => (
        <div key={entity} className="rounded-lg border border-[var(--border-default)]">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[10px] font-mono font-semibold text-[var(--brand-accent)]">{entity}</span>
            <span className="text-[9px] text-[var(--text-muted)]">{annotations.length} instance(s)</span>
          </div>
          <div className="border-t border-[var(--border-default)] max-h-[200px] overflow-auto">
            {annotations.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border-default)] last:border-b-0">
                <span className="text-[8px] text-cyan-400 shrink-0">{a.drawingCode}</span>
                <span className="text-[9px] text-[var(--text-secondary)] truncate">{a.description}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {byEntity.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">No IFC annotations generated</p>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/*  Plotter tab                                                  */
/* ──────────────────────────────────────────────────────────── */

function PlotterTab({ result }: { result: FullSetResult }) {
  const layerCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of result.drawings) {
      for (const p of d.plotterPaths) {
        map.set(p.layer, (map.get(p.layer) || 0) + 1)
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [result])

  const totalPaths = result.drawings.reduce((s, d) => s + d.plotterPaths.length, 0)
  const totalSegments = result.drawings.reduce((s, d) =>
    s + d.plotterPaths.reduce((sp, p) => sp + p.segments.length, 0), 0)

  return (
    <div className="space-y-3" data-testid="plotter-tab">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Layers size={14} />} label="Total paths" value={String(totalPaths)} color="text-cyan-400" />
        <StatCard icon={<Pen size={14} />} label="Total segments" value={String(totalSegments)} color="text-cyan-400" />
        <StatCard
          icon={<Pen size={14} />}
          label="Pen-up travel"
          value={`${result.totalPenUpMetres}m`}
          color="text-cyan-400"
          detail={`${result.totalPenLifts} lifts`}
        />
      </div>

      <h3 className="text-[10px] font-semibold text-[var(--text-primary)]">Layer Breakdown</h3>
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
        {layerCounts.map(([layer, count]) => (
          <div key={layer} className="flex items-center justify-between rounded bg-[var(--bg-tertiary)] px-2 py-1">
            <span className="text-[9px] text-[var(--text-secondary)]">{layer}</span>
            <span className="text-[9px] font-medium text-cyan-400">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/*  Shared sub-components                                         */
/* ──────────────────────────────────────────────────────────── */

function StatCard({ icon, label, value, color, detail }: {
  icon: React.ReactNode; label: string; value: string; color: string; detail?: string
}) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <span className="text-[9px] font-medium text-[var(--text-muted)]">{label}</span>
      </div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      {detail && <div className="text-[8px] text-[var(--text-tertiary)] mt-0.5">{detail}</div>}
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'pass') return <CheckCircle size={12} className="mt-0.5 shrink-0 text-green-400" />
  if (status === 'warn') return <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-400" />
  return <XCircle size={12} className="mt-0.5 shrink-0 text-red-400" />
}

function CitationRow({ citation, drawingCode }: { citation: ComplianceCitation; drawingCode: string }) {
  return (
    <div className="flex items-start gap-2 rounded bg-[var(--bg-tertiary)] px-3 py-2">
      <StatusIcon status={citation.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-cyan-400 shrink-0">[{drawingCode}]</span>
          <span className="text-[9px] font-medium text-[var(--text-primary)]">{citation.citation}</span>
        </div>
        <p className="mt-0.5 text-[8px] text-[var(--text-muted)]">{citation.detail}</p>
      </div>
      <span className="text-[8px] text-[var(--text-tertiary)]">{citation.score.toFixed(2)}</span>
    </div>
  )
}
