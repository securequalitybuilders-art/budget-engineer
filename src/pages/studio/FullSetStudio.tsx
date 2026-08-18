// ── Full Set Studio ─────────────────────────────────────────
// City council submission drawing set studio page.
// Loads plan, generates full 19-drawing set with RAG citations
// and IFC annotations, renders FullSetPanel.

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, Layers, Download, RefreshCw } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { loadPlanModel } from '@/services/cadPersistenceService'
import { generateFullSet } from '@/engine/architecture/fullSetGenerator'
import { buildDefaultRagIndex } from '@/engine/rag/codeCorpus'
import { FullSetPanel } from '@/components/architecture/FullSetPanel'
import type { FullSetResult } from '@/engine/architecture/fullSetGenerator'
import type { PlanModel } from '@/domain/plan'
import type { RagIndex } from '@/engine/rag/ragIndex'

export function FullSetStudio() {
  const { id: projectId } = useParams<{ id: string }>()
  const selectedDesignId = useUIStore((s) => s.selectedDesignId)

  const [plan, setPlan] = useState<PlanModel | null>(null)
  const [result, setResult] = useState<FullSetResult | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Load plan model */
  useEffect(() => {
    if (!projectId || !selectedDesignId) return
    let cancelled = false
    loadPlanModel(projectId, selectedDesignId).then((p) => {
      if (!cancelled) setPlan(p)
    }).catch(() => {
      if (!cancelled) setError('Could not load plan model')
    })
    return () => { cancelled = true }
  }, [projectId, selectedDesignId])

  /* Generate full set */
  const handleGenerate = useCallback(async () => {
    if (!plan) return
    setGenerating(true)
    setError(null)
    try {
      const ragIndex: RagIndex = buildDefaultRagIndex()
      const fullSet = await generateFullSet({
        plan,
        buildingType: 'house',
        projectName: 'Full Set Submission',
        jurisdiction: 'zimbabwe',
        ragIndex,
        floors: plan.height > plan.width ? 2 : 1,
      })
      setResult(fullSet)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }, [plan])

  /* Download all SVGs as individual files */
  const handleDownloadSvgs = useCallback(() => {
    if (!result) return
    for (const d of result.drawings) {
      const blob = new Blob([d.svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${d.sadcCode}-${d.id}.svg`
      a.click()
      URL.revokeObjectURL(url)
    }
  }, [result])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3">
        <a
          href={`/project/${projectId}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
        >
          <ArrowLeft size={14} />
        </a>
        <Layers size={16} className="text-[var(--brand-accent)]" />
        <div className="flex-1">
          <h1 className="text-xs font-semibold text-[var(--text-primary)]">Full Set — City Council Submission</h1>
          <p className="text-[9px] text-[var(--text-muted)]">19 SADC drawings · RAG citations · IFC annotations · pen plotter paths</p>
        </div>
        <div className="flex gap-2">
          {result && (
            <button
              onClick={handleDownloadSvgs}
              className="flex items-center gap-1.5 rounded border border-[var(--border-default)] px-2 py-1 text-[9px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            >
              <Download size={10} /> SVGs
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={!plan || generating}
            className="flex items-center gap-1.5 rounded bg-[var(--brand-primary)] px-3 py-1 text-[9px] font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw size={10} className={generating ? 'animate-spin' : ''} />
            {result ? 'Regenerate' : 'Generate Full Set'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl space-y-4 p-4">
        {!plan && !error && (
          <div className="flex h-40 items-center justify-center text-sm text-[var(--text-muted)]">
            Loading plan model…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-900/10 p-3 text-[10px] text-red-400">
            {error}
          </div>
        )}

        {!result && !generating && plan && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8">
            <Layers size={32} className="text-[var(--brand-accent)] opacity-40" />
            <p className="text-[11px] text-[var(--text-muted)]">
              Generate the complete 19-drawing city council submission package.
            </p>
            <p className="text-[9px] text-[var(--text-muted)]">
              Plan: {plan.width.toFixed(1)}×{plan.height.toFixed(1)}m · {plan.rooms.length} rooms · {plan.walls.length} walls
            </p>
          </div>
        )}

        {generating && (
          <div className="flex h-40 items-center justify-center gap-3">
            <RefreshCw size={16} className="animate-spin text-[var(--brand-accent)]" />
            <span className="text-sm text-[var(--text-muted)]">
              Generating 19 drawings, RAG citations, IFC annotations, and plotter paths…
            </span>
          </div>
        )}

        {result && (
          <FullSetPanel result={result} />
        )}
      </div>
    </div>
  )
}
