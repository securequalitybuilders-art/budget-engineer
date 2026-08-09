import { useRef, useEffect, useCallback, useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { PlanCanvas } from '@/components/cad/PlanCanvas'
import { MiniFloorPlanPreview } from '@/components/cad/MiniFloorPlanPreview'
import { PlanComparison } from '@/components/cad/PlanComparison'
import { Button } from '@/components/ui/Button'
import { LayoutGrid, Wand2, Loader2, Upload, PenTool, Eye, Brain, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { generatePlanModel } from '@/engine/plan-generator'
import { PipelineResultsPanel } from '@/components/dashboard/PipelineResultsPanel'
import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'
import type { PipelineResult } from '@/engine/pipeline/generativeDesignPipeline'

interface ConceptStageProps {
  visibleDesignOptions: DesignOption[]
  selectedDesignId: string | null
  setSelectedDesignId: (id: string | null) => void
  selectedDesign: DesignOption | null
  handleGenerate: () => Promise<void>
  isGenerating: boolean
  generationStatus?: string | null
  onDxfImported?: (plan: PlanModel) => void
  onImportFile?: (file: File) => void
  activePlan?: PlanModel | null
  projectId?: string | null
  isPipelineRunning?: boolean
  onRunPipeline?: () => void
  pipelineStatus?: string | null
  pipelineResult?: PipelineResult | null
}

export function ConceptStage({
  visibleDesignOptions,
  selectedDesignId,
  setSelectedDesignId,
  selectedDesign,
  handleGenerate,
  isGenerating,
  generationStatus,
  onDxfImported,
  onImportFile,
  activePlan,
  projectId,
  onRunPipeline,
  isPipelineRunning,
  pipelineStatus,
  pipelineResult,
}: ConceptStageProps) {
  const importInputRef = useRef<HTMLInputElement>(null)
  const [showCanvas, setShowCanvas] = useState(false)
  const [showPipelineResults, setShowPipelineResults] = useState(false)

  const handleImportChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (onImportFile) {
      onImportFile(file)
    } else if (file.name.toLowerCase().endsWith('.dxf') && onDxfImported) {
      try {
        const text = await file.text()
        const { parseDxfToPlan } = await import('@/lib/import/dxf-importer')
        const plan = parseDxfToPlan(text)
        if (plan) {
          onDxfImported(plan)
        } else {
          alert('Could not read this DXF file. The file may be empty, invalid, or use unsupported entities.')
        }
      } catch {
        alert('Could not read this DXF file. The file may be empty, invalid, or use unsupported entities.')
      }
    }
    if (e.target) e.target.value = ''
  }, [onImportFile, onDxfImported])

  const currentBrief = useProjectStore((s) => s.currentBrief)
  const designOptionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (visibleDesignOptions.length > 0 && designOptionsRef.current) {
      designOptionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [visibleDesignOptions.length])

  if (visibleDesignOptions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center"
        >
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-lg">
            <LayoutGrid size={40} className="text-[var(--brand-accent)]" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Design Options</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            Go to the Brief stage to describe your project first. Once you generate design options, they appear here.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button className="gap-2" onClick={handleGenerate} disabled={isGenerating || !currentBrief}>
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {isGenerating ? (generationStatus || 'Generating designs...') : 'Generate Design Options'}
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={onRunPipeline}
              disabled={isPipelineRunning || !currentBrief}
            >
              {isPipelineRunning ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
              {isPipelineRunning ? (pipelineStatus || 'Running pipeline...') : 'Run AI Pipeline'}
            </Button>
            {isGenerating && generationStatus && (
              <p className="text-[11px] text-cyan-300">{generationStatus}</p>
            )}
            {isPipelineRunning && (
              <p className="text-[11px] text-cyan-300">{pipelineStatus}</p>
            )}
            <Button variant="secondary" className="gap-2" onClick={() => importInputRef.current?.click()}>
              <Upload size={16} />
              Import (DXF / image / PDF)
            </Button>
            <p className="mt-1 text-[10px] text-stone-400">Supported: DXF, images. For AutoCAD/ArchiCAD, export to DXF first.</p>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept=".dxf,image/*,application/pdf"
            onChange={handleImportChange}
            className="hidden"
            aria-label="Select a DXF, image, or PDF file to import"
          />
          <p className="mt-6 max-w-xs text-[10px] text-stone-400">
            Mobile: review, estimates, exports supported. For best CAD editing, use a tablet or desktop.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {/* Compact design selector */}
      <div ref={designOptionsRef} className="rounded-2xl border border-stone-700/40 bg-stone-900/60 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Your designs</h2>
            <p className="text-xs text-slate-400">
              Pick a design to edit — full concept previews live in the Brief stage.
            </p>
          </div>
          <span className="rounded-md bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
            {visibleDesignOptions.length} option{visibleDesignOptions.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {visibleDesignOptions.map((option) => {
            const isSelected = selectedDesignId === option.id
            const isPipelineDesign = option.id.startsWith('pipeline-')
            let previewPlan: PlanModel | null = null
            try { previewPlan = generatePlanModel(option) } catch { /* skip */ }
            return (
              <button
                key={option.id}
                onClick={() => { setSelectedDesignId(option.id); setShowCanvas(true) }}
                className={cn(
                  'flex w-44 shrink-0 flex-col gap-1.5 rounded-xl border-2 p-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98]',
                  isSelected
                    ? 'border-cyan-400/60 bg-cyan-500/15 shadow-md shadow-cyan-500/15'
                    : 'border-slate-700/60 bg-slate-800/80 hover:border-cyan-500/40 hover:bg-cyan-500/5'
                )}
              >
                {previewPlan && (
                  <div className="overflow-hidden rounded-lg">
                    <MiniFloorPlanPreview plan={previewPlan} width={160} height={106} />
                  </div>
                )}
                <span className={cn('truncate text-xs font-bold', isSelected ? 'text-cyan-200' : 'text-slate-200')}>
                  {option.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {option.grossFloorArea.toFixed(0)} m² · {option.floors} floor{option.floors > 1 ? 's' : ''}
                </span>
                <span className={cn(
                  'self-start rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                  isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/10 text-amber-400'
                )}>
                  {isSelected ? 'Selected' : 'Select'}
                </span>
                {isPipelineDesign && (
                  <span className="inline-flex items-center gap-1 self-start rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-400">
                    <Brain size={10} />
                    AI
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Editing toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-700/40 bg-stone-900/60 px-4 py-3">
        <Button
          variant={selectedDesignId ? 'brand' : 'secondary'}
          className="gap-2"
          onClick={() => setShowCanvas(v => !v)}
          disabled={!selectedDesignId}
        >
          {showCanvas ? <Eye size={16} /> : <PenTool size={16} />}
          {showCanvas ? 'Hide Editor' : 'Edit in Canvas'}
        </Button>
        <Button
          variant="secondary"
          className="gap-2"
          onClick={handleGenerate}
          disabled={isGenerating || !currentBrief}
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          {isGenerating ? (generationStatus || 'Regenerating...') : 'Regenerate options'}
        </Button>
        <Button
          variant="secondary"
          className="gap-2"
          onClick={onRunPipeline}
          disabled={isPipelineRunning || !currentBrief}
        >
          {isPipelineRunning ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
          {isPipelineRunning ? (pipelineStatus || 'Running pipeline...') : 'Run AI Pipeline'}
        </Button>
        {selectedDesignId && selectedDesignId.startsWith('pipeline-') && pipelineResult && (
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => setShowPipelineResults(true)}
          >
            <BarChart3 size={14} />
            View Results
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" className="gap-2" onClick={() => importInputRef.current?.click()}>
            <Upload size={16} />
            Import
          </Button>
        </div>
      </div>

      {/* Canvas editor */}
      {selectedDesignId && showCanvas && (
        <div className="rounded-xl border border-stone-700/40 bg-stone-900/60 p-3">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-400">Design Editor</h3>
          <PlanCanvas
            projectId={projectId ?? null}
            design={selectedDesign}
            persistedPlan={activePlan ?? null}
          />
        </div>
      )}

      <PlanComparison designs={visibleDesignOptions} selectedDesignId={selectedDesign?.id} />

      <PipelineResultsPanel result={pipelineResult ?? null} isOpen={showPipelineResults} onClose={() => setShowPipelineResults(false)} />
    </div>
  )
}
