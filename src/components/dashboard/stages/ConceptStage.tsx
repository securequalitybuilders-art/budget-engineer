import { useRef, useEffect, useCallback } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { PlanComparison } from '@/components/cad/PlanComparison'
import { Button } from '@/components/ui/Button'
import { LayoutGrid, Wand2, Loader2, Upload } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'

interface ConceptStageProps {
  visibleDesignOptions: DesignOption[]
  selectedDesignId: string | null
  setSelectedDesignId: (id: string | null) => void
  selectedDesign: DesignOption | null
  handleGenerate: () => Promise<void>
  isGenerating: boolean
  onDxfImported?: (plan: PlanModel) => void
  onImportFile?: (file: File) => void
}

export function ConceptStage({
  visibleDesignOptions,
  selectedDesignId,
  setSelectedDesignId,
  selectedDesign,
  handleGenerate,
  isGenerating,
  onDxfImported,
  onImportFile,
}: ConceptStageProps) {
  const importInputRef = useRef<HTMLInputElement>(null)

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

  const { currentBrief } = useProjectStore()
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
              {isGenerating ? 'Generating designs...' : 'Generate Design Options'}
            </Button>
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
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
      <div ref={designOptionsRef} className="rounded-2xl border-2 border-cyan-500/25 bg-slate-900/80 p-5 shadow-lg shadow-cyan-500/5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
            <LayoutGrid size={20} className="text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">Choose your design</h2>
            <p className="text-xs text-slate-400">
              {selectedDesignId
                ? 'Design selected — you can change anytime'
                : 'Select a design option to unlock the Design stage'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDesignOptions.map((option) => {
            const isSelected = selectedDesignId === option.id
            return (
              <button
                key={option.id}
                onClick={() => setSelectedDesignId(option.id)}
                className={cn(
                  'flex flex-col gap-1 rounded-xl border-2 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]',
                  isSelected
                    ? 'border-cyan-400/60 bg-cyan-500/15 shadow-md shadow-cyan-500/15'
                    : 'border-slate-700/60 bg-slate-800/80 hover:border-cyan-500/40 hover:bg-cyan-500/5'
                )}
              >
                <span className={cn('text-sm font-bold', isSelected ? 'text-cyan-200' : 'text-slate-200')}>
                  {option.name}
                </span>
                <span className="text-xs text-slate-400">
                  {option.grossFloorArea.toFixed(0)} m² · {option.floors} floor{option.floors > 1 ? 's' : ''}
                </span>
                <span className="mt-1 text-[10px] leading-relaxed text-slate-400">
                  {option.elements.length} element{option.elements.length > 1 ? 's' : ''}
                </span>
                <span
                  className={cn(
                    'mt-2 self-start rounded-md px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/10 text-amber-400'
                  )}
                >
                  {isSelected ? 'Selected' : 'Select this design'}
                </span>
              </button>
            )
          })}
        </div>

        {selectedDesignId ? (
          <div className="mt-5 flex flex-col items-start gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                <span className="text-[10px] text-emerald-400">✓</span>
              </div>
              <span className="text-sm text-cyan-200">
                <span className="font-semibold text-white">{selectedDesign?.name}</span> selected
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-center text-sm font-medium text-cyan-300">
            Select a design option to continue
          </div>
        )}

        <div className="mt-4 flex justify-center sm:justify-end">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={handleGenerate}
            disabled={isGenerating || !currentBrief}
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {isGenerating ? 'Generating...' : 'Regenerate options'}
          </Button>
        </div>
      </div>

      <PlanComparison designs={visibleDesignOptions} selectedDesignId={selectedDesign?.id} />
    </div>
  )
}
