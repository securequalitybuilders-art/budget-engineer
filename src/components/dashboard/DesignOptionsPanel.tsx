import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { MiniFloorPlanPreview } from '@/components/cad/MiniFloorPlanPreview'
import { PlanComparison } from '@/components/cad/PlanComparison'
import { Loader2, Wand2, LayoutGrid, Upload, ArrowRight } from 'lucide-react'
import { generatePlanModel } from '@/engine/plan-generator'
import { cn } from '@/lib/utils'
import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'

interface DesignOptionsPanelProps {
  visibleDesignOptions: DesignOption[]
  selectedDesignId: string | null
  setSelectedDesignId: (id: string | null) => void
  handleGenerate: () => Promise<void>
  isGenerating: boolean
  generationStatus?: string | null
  onImportFile?: (file: File) => void
  onOpenInConcept?: () => void
}

export function DesignOptionsPanel({
  visibleDesignOptions,
  selectedDesignId,
  setSelectedDesignId,
  handleGenerate,
  isGenerating,
  generationStatus,
  onImportFile,
  onOpenInConcept,
}: DesignOptionsPanelProps) {
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onImportFile) onImportFile(file)
    if (e.target) e.target.value = ''
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-white">Design Options</h2>
          <p className="text-xs text-slate-400">Compare every generated concept and pick one to refine.</p>
        </div>
        <span className="rounded-md bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
          {visibleDesignOptions.length} option{visibleDesignOptions.length > 1 ? 's' : ''}
        </span>
      </div>

      {visibleDesignOptions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-lg">
            <LayoutGrid size={40} className="text-[var(--brand-accent)]" />
          </div>
          <p className="max-w-md text-center text-sm text-slate-300">
            No design options yet. Describe your project in the Brief stage, then generate 3 site-aware concepts here.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button className="gap-2" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {isGenerating ? (generationStatus || 'Generating designs...') : 'Generate Design Options'}
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
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-stone-700/40 bg-stone-900/60 p-4">
            <div className="flex flex-wrap gap-3">
              {visibleDesignOptions.map((option) => {
                const isSelected = selectedDesignId === option.id
                let previewPlan: PlanModel | null = null
                try { previewPlan = generatePlanModel(option) } catch { /* skip */ }
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedDesignId(option.id)}
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
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                className="gap-2"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {isGenerating ? (generationStatus || 'Regenerating...') : 'Regenerate options'}
              </Button>
              {onOpenInConcept && (
                <Button
                  variant="brand"
                  className="gap-2"
                  onClick={onOpenInConcept}
                  disabled={!selectedDesignId}
                >
                  <ArrowRight size={16} />
                  Refine in Concept
                </Button>
              )}
              <div className="ml-auto">
                <Button variant="secondary" className="gap-2" onClick={() => importInputRef.current?.click()}>
                  <Upload size={16} />
                  Import
                </Button>
              </div>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept=".dxf,image/*,application/pdf"
              onChange={handleImportChange}
              className="hidden"
              aria-label="Select a DXF, image, or PDF file to import"
            />
          </div>

          <PlanComparison designs={visibleDesignOptions} selectedDesignId={selectedDesignId ?? undefined} />
        </>
      )}
    </div>
  )
}
