// ── Plotter Studio ────────────────────────────────────────────
// SVG preview, HPGL/DXF output, pen-change count, estimated time.

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pen, Download, FileText, Clock, Hash, Printer, Layers } from 'lucide-react'
import { StudioLoading } from '@/components/ui/StudioLoading'
import { loadPlanModel } from '@/services/cadPersistenceService'
import { useUIStore } from '@/stores/uiStore'
import type { PlanModel } from '@/domain/plan'
import type { PaperSize } from '@/lib/plotter/types'
import { planToPlotterPaths, totalPathLength, pathLayerSummary, pathsBoundingBox } from '@/lib/plotter/planToPaths'
import { planToHpgl, pensForSheet, type DrawingSheetType } from '@/lib/plotter/plotterPipeline'
import { generateDxf, countDxfEntities, dxfLayerNames } from '@/lib/plotter/dxfGenerator'
import { requiredPens } from '@/lib/plotter/penAssignment'
import { PAPER_DIMENSIONS } from '@/lib/plotter/types'
import { PlotterSimulator } from '@/lib/plotter/plotterSimulator'
import { optimizePlotterPaths } from '@/lib/plotter/pathOptimizer'

export function PlotterStudio() {
  const { id: projectId } = useParams<{ id: string }>()
  const selectedDesignId = useUIStore((s) => s.selectedDesignId)

  const [plan, setPlan] = useState<PlanModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [paperSize, setPaperSize] = useState<PaperSize>('A1')
  const [sheetType, setSheetType] = useState<DrawingSheetType>('floor-plan')
  const [activeTab, setActiveTab] = useState<'svg' | 'hpgl' | 'dxf' | 'sim'>('svg')

  useEffect(() => {
    if (!projectId || !selectedDesignId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    loadPlanModel(projectId, selectedDesignId).then((p) => {
      if (!cancelled) { setPlan(p); setLoading(false) }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [projectId, selectedDesignId])

  // ── Derived data ────────────────────────────────────────────

  const plotterPaths = useMemo(() => {
    if (!plan) return []
    return planToPlotterPaths(plan)
  }, [plan])

  const pipeline = useMemo(() => {
    if (!plan) return null
    return planToHpgl(plan, { paperSize })
  }, [plan, paperSize])

  const dxf = useMemo(() => {
    if (plotterPaths.length === 0) return ''
    return generateDxf(plotterPaths, { projectName: plan?.scaleLabel ?? 'Budget Engineer' })
  }, [plotterPaths, plan])

  const pathStats = useMemo(() => {
    if (plotterPaths.length === 0) return null
    return {
      totalLength: totalPathLength(plotterPaths),
      layers: pathLayerSummary(plotterPaths),
      bbox: pathsBoundingBox(plotterPaths),
      pathCount: plotterPaths.length,
    }
  }, [plotterPaths])

  const penInfo = useMemo(() => {
    const pens = requiredPens(plotterPaths.map((p) => p.layer))
    return {
      pens,
      count: pens.length,
      sheetPens: pensForSheet(sheetType),
    }
  }, [plotterPaths, sheetType])

  const dxfInfo = useMemo(() => {
    if (!dxf) return null
    return { ...countDxfEntities(dxf), layers: dxfLayerNames(dxf) }
  }, [dxf])

  const optimized = useMemo(() => {
    const flatSegments = plotterPaths.flatMap(p => p.segments)
    if (flatSegments.length === 0) return null
    return optimizePlotterPaths(flatSegments)
  }, [plotterPaths])

  // ── Download helpers ────────────────────────────────────────

  const download = useCallback((content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const downloadHpgl = useCallback(() => {
    if (pipeline) download(pipeline.hpglString, 'drawing.hpgl', 'application/vnd.hp-hpgl')
  }, [pipeline, download])

  const downloadDxf = useCallback(() => {
    if (dxf) download(dxf, 'drawing.dxf', 'application/dxf')
  }, [dxf, download])

  const downloadSvg = useCallback(() => {
    if (!plan) return
    const svgParts: string[] = ['<svg xmlns="http://www.w3.org/2000/svg">']
    for (const p of plotterPaths) {
      for (const seg of p.segments) {
        if (seg.points.length < 2) continue
        const d = seg.points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')
        svgParts.push(`<path d="${d}" fill="none" stroke="black" stroke-width="1"/>`)
      }
    }
    svgParts.push('</svg>')
    download(svgParts.join('\n'), 'drawing.svg', 'image/svg+xml')
  }, [plan, plotterPaths, download])

  // ── Loading / empty states ──────────────────────────────────

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">No project selected</h2>
          <Link to="/" className="text-sm text-[var(--brand-accent)] underline">Back to home</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <StudioLoading />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        <StudioHeader projectId={projectId} />
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
          <Pen size={32} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
          <p className="text-sm text-[var(--text-muted)]">
            No plan model available. Generate a design first, then return to this studio.
          </p>
          <Link to={`/project/${projectId}`} className="mt-3 inline-block text-sm text-[var(--brand-accent)] hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────

  const paperDims = PAPER_DIMENSIONS[paperSize]
  const tabList = ['svg', 'hpgl', 'dxf', 'sim'] as const

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6" data-testid="plotter-studio">
      <StudioHeader projectId={projectId} />

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
          Paper
          <select
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value as PaperSize)}
            className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-[10px] text-[var(--text-primary)]"
            data-testid="paper-select"
          >
            {(['A0', 'A1', 'A2', 'A3', 'A4'] as PaperSize[]).map((s) => (
              <option key={s} value={s}>{s} ({PAPER_DIMENSIONS[s].widthMm}×{PAPER_DIMENSIONS[s].heightMm}mm)</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
          Sheet
          <select
            value={sheetType}
            onChange={(e) => setSheetType(e.target.value as DrawingSheetType)}
            className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-[10px] text-[var(--text-primary)]"
            data-testid="sheet-select"
          >
            {(['floor-plan', 'site-plan', 'front-elevation', 'section'] as DrawingSheetType[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard icon={<Hash size={14} />} label="Paths" value={String(pathStats?.pathCount ?? 0)} color="text-cyan-400" />
        <StatCard icon={<Layers size={14} />} label="Layers" value={String(Object.keys(pathStats?.layers ?? {}).length)} color="text-cyan-400" />
        <StatCard icon={<Pen size={14} />} label="Pens" value={`${penInfo.count} slot(s)`} color="text-cyan-400" detail={`Sheet needs ${penInfo.sheetPens.join(', ')}`} />
        <StatCard icon={<Printer size={14} />} label="Pen lifts" value={String(pipeline?.stats.totalPenLifts ?? 0)} color="text-cyan-400" />
        <StatCard icon={<Clock size={14} />} label="Est. time" value={`${(pipeline?.stats.estimatedTimeMinutes ?? 0).toFixed(1)} min`} color="text-cyan-400" />
        <StatCard
          icon={<FileText size={14} />}
          label="DXF entities"
          value={dxfInfo ? `${dxfInfo.polylines + dxfInfo.lines}` : '—'}
          color="text-cyan-400"
          detail={dxfInfo ? `${dxfInfo.layers.length} layer(s)` : undefined}
        />
      </div>

      {/* Paper dimensions */}
      <div className="text-[9px] text-[var(--text-tertiary)]">
        {paperSize}: {paperDims.widthMm}×{paperDims.heightMm}mm landscape · bounding box {pathStats?.bbox.width.toFixed(0)}×{pathStats?.bbox.height.toFixed(0)}mm
      </div>

      {/* Download buttons */}
      <div className="flex gap-2">
        <button onClick={downloadHpgl} disabled={!pipeline} className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-accent)] px-3 py-1.5 text-[10px] font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40">
          <Download size={12} /> HPGL
        </button>
        <button onClick={downloadDxf} disabled={!dxf} className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-tertiary)] px-3 py-1.5 text-[10px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40">
          <Download size={12} /> DXF
        </button>
        <button onClick={downloadSvg} className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-tertiary)] px-3 py-1.5 text-[10px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]">
          <Download size={12} /> SVG
        </button>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 border-b border-[var(--border-default)]">
        {tabList.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-[var(--brand-accent)] text-[var(--brand-accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            data-testid={`tab-${tab}`}
          >
            {tab === 'sim' ? 'Simulator' : tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Output panel */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        {activeTab === 'svg' && (
          <div className="max-h-[500px] overflow-auto" data-testid="svg-preview">
            {plotterPaths.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No geometry to preview</p>
            ) : (
              <svg
                viewBox={`0 0 ${pathStats?.bbox.width ?? 100} ${pathStats?.bbox.height ?? 100}`}
                className="h-full w-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                {plotterPaths.map((p) =>
                  p.segments.map((seg, si) => {
                    if (seg.points.length < 2) return null
                    const d = seg.points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')
                    return <path key={`${p.index}-${si}`} d={d} fill="none" stroke="black" strokeWidth="0.5" />
                  }),
                )}
              </svg>
            )}
          </div>
        )}

        {activeTab === 'hpgl' && (
          <pre className="max-h-[500px] overflow-auto font-mono text-[9px] leading-relaxed text-[var(--text-secondary)]" data-testid="hpgl-output">
            {pipeline?.hpglString ?? 'No HPGL output'}
          </pre>
        )}

        {activeTab === 'dxf' && (
          <pre className="max-h-[500px] overflow-auto font-mono text-[9px] leading-relaxed text-[var(--text-secondary)]" data-testid="dxf-output">
            {dxf || 'No DXF output'}
          </pre>
        )}

        {activeTab === 'sim' && (
          <div data-testid="sim-output">
            {optimized && optimized.groups.length > 0 ? (
              <PlotterSimulator
                groups={optimized.groups}
                stats={optimized.stats}
                paperWidth={paperDims.widthMm}
                paperHeight={paperDims.heightMm}
              />
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No geometry to simulate</p>
            )}
          </div>
        )}
      </div>

      {/* Layer breakdown */}
      {pathStats && Object.keys(pathStats.layers).length > 0 && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h3 className="mb-2 text-[10px] font-semibold text-[var(--text-primary)]">Layer Breakdown</h3>
          <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
            {Object.entries(pathStats.layers).sort((a, b) => b[1] - a[1]).map(([layer, count]) => (
              <div key={layer} className="flex items-center justify-between rounded bg-[var(--bg-tertiary)] px-2 py-1">
                <span className="text-[9px] text-[var(--text-secondary)]">{layer}</span>
                <span className="text-[9px] font-medium text-cyan-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function StudioHeader({ projectId }: { projectId: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        to={`/project/${projectId}`}
        className="touch-target flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        aria-label="Back to dashboard"
      >
        <ArrowLeft size={18} />
      </Link>
      <div>
        <div className="flex items-center gap-2">
          <Pen size={20} className="text-[var(--brand-accent)]" />
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Plotter Studio</h1>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Pen plotter pipeline — SVG preview, optimized HPGL output, DXF export for AutoCAD/BricsCAD.
        </p>
      </div>
    </div>
  )
}

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
