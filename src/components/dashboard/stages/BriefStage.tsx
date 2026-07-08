import { useRef, useCallback } from 'react'
import { AiBriefPanel } from '@/components/ai/AiBriefPanel'
import { Button } from '@/components/ui/Button'
import { Upload } from 'lucide-react'
import type { ParseResult } from '@/lib/ai/ai-provider'
import type { DesignOption } from '@/domain/boq'
import type { FloorPlan } from '@/engine/tier3/layoutEngine'

interface BriefStageProps {
  onParsed: (result: ParseResult) => void
  onDesignOptionsGenerated: (options: DesignOption[]) => void
  onTier3Plans: (plans: FloorPlan[]) => void
  onBuildingTypeChange: (bt: string) => void
  visibleDesignOptions: DesignOption[]
  selectedDesignId: string | null
  setSelectedDesignId: (id: string | null) => void
  selectedDesign: DesignOption | null
  onImportFile?: (file: File) => void
}

export function BriefStage({
  onParsed,
  onDesignOptionsGenerated,
  onTier3Plans,
  onBuildingTypeChange,
  visibleDesignOptions,
  selectedDesignId,
  setSelectedDesignId,
  onImportFile,
}: BriefStageProps) {
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleImportChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImportFile) return
    onImportFile(file)
    if (e.target) e.target.value = ''
  }, [onImportFile])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <AiBriefPanel
          onParsed={onParsed}
          onDesignOptionsGenerated={onDesignOptionsGenerated}
          onTier3Plans={onTier3Plans}
          onBuildingTypeChange={onBuildingTypeChange}
        />
        <div className="shrink-0">
          <Button variant="secondary" size="sm" className="gap-2" onClick={() => importInputRef.current?.click()}>
            <Upload size={14} />
            Import (DXF / image / PDF)
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".dxf,image/*,application/pdf"
            onChange={handleImportChange}
            className="hidden"
            aria-label="Select a DXF, image, or PDF file to import"
          />
          <p className="mt-1 text-right text-[10px] text-stone-400">Supported: DXF, images. For AutoCAD/ArchiCAD, export to DXF first.</p>
        </div>
      </div>

      {visibleDesignOptions.length > 0 && (
        <div className="rounded-2xl border-2 border-cyan-500/25 bg-slate-900/80 p-5 shadow-lg shadow-cyan-500/5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
              <span className="text-xs text-emerald-400">✓</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Designs generated</h3>
              <p className="text-xs text-stone-400">{visibleDesignOptions.length} option{visibleDesignOptions.length > 1 ? 's' : ''} available</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDesignOptions.map((option) => {
              const isSelected = selectedDesignId === option.id
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedDesignId(option.id)}
                  className={`flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    isSelected
                      ? 'border-cyan-400/60 bg-cyan-500/15 shadow-md shadow-cyan-500/15'
                      : 'border-slate-700/60 bg-slate-800/80 hover:border-cyan-500/40 hover:bg-cyan-500/5'
                  }`}
                >
                  <span className={`text-sm font-bold ${isSelected ? 'text-cyan-200' : 'text-slate-200'}`}>
                    {option.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {option.grossFloorArea.toFixed(0)} m² · {option.floors} floor{option.floors > 1 ? 's' : ''}
                  </span>
                  <span className={`mt-2 self-start rounded-md px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {isSelected ? 'Selected' : 'Select'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
