import { useRef, useCallback, useState } from 'react'
import { EnhancedBriefPanel, type BriefQuestionnaire } from '@/components/ai/EnhancedBriefPanel'
import { AiBriefPanel } from '@/components/ai/AiBriefPanel'
import { Button } from '@/components/ui/Button'
import { Upload, FileText, ClipboardList } from 'lucide-react'
import type { ParseResult } from '@/lib/ai/ai-provider'
import type { DesignOption } from '@/domain/boq'
import type { FloorPlan } from '@/engine/tier3/layoutEngine'

interface BriefStageProps {
  projectId?: string
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
  projectId,
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
  const [mode, setMode] = useState<'structured' | 'free-text'>('structured')

  const handleImportChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImportFile) return
    onImportFile(file)
    if (e.target) e.target.value = ''
  }, [onImportFile])

  const handleQuestionnaireGenerate = useCallback((q: BriefQuestionnaire) => {
    const text = [
      `${q.bedrooms} bedroom ${q.buildingType.replace('-', ' ')}`,
      `${q.bathrooms} bathrooms`,
      `${q.livingAreas} living areas`,
      q.kitchen ? 'with kitchen' : '',
      q.garage ? 'garage' : '',
      q.verandah ? 'verandah' : '',
      q.store ? 'store room' : '',
      `${q.siteWidth}×${q.siteDepth} m site`,
      `${q.floors} storey`,
      q.style,
      q.roof ? `${q.roof} roof` : '',
      q.solar ? 'solar ready' : '',
      q.rainwater ? 'rainwater harvesting' : '',
      q.borehole ? 'borehole' : '',
      `budget $${q.budgetUsd}`,
      q.notes || '',
    ].filter(Boolean).join(', ')

    onBuildingTypeChange(q.buildingType)

    const fakeResult: ParseResult = {
      briefText: text,
      buildingType: q.buildingType,
      floors: q.floors,
    }
    onParsed(fakeResult)

    const options: DesignOption[] = [
      {
        id: `opt-1-${Date.now()}`,
        name: `${q.style} ${q.buildingType.replace('-residential', '').replace('-', ' ')} — Option A`,
        grossFloorArea: q.siteWidth * q.siteDepth * 0.6,
        floors: q.floors,
        buildingType: q.buildingType,
        elements: [],
      },
      {
        id: `opt-2-${Date.now()}`,
        name: `${q.style} ${q.buildingType.replace('-residential', '').replace('-', ' ')} — Option B`,
        grossFloorArea: q.siteWidth * q.siteDepth * 0.55,
        floors: q.floors,
        buildingType: q.buildingType,
        elements: [],
      },
      {
        id: `opt-3-${Date.now()}`,
        name: `${q.style} ${q.buildingType.replace('-residential', '').replace('-', ' ')} — Option C`,
        grossFloorArea: q.siteWidth * q.siteDepth * 0.65,
        floors: q.floors,
        buildingType: q.buildingType,
        elements: [],
      },
    ]
    onDesignOptionsGenerated(options)
  }, [onParsed, onDesignOptionsGenerated, onBuildingTypeChange])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 overflow-y-auto">
      {/* Import bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-700/40 bg-stone-900/60 px-4 py-2">
        <p className="text-[10px] text-stone-400">Supported: DXF, images, PDF. For AutoCAD/ArchiCAD, export to DXF first.</p>
        <Button variant="secondary" size="sm" className="gap-2 shrink-0" onClick={() => importInputRef.current?.click()}>
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
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('structured')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === 'structured'
              ? 'bg-cyan-700 text-white'
              : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
          }`}
        >
          <ClipboardList size={14} />
          Structured Questionnaire
        </button>
        <button
          onClick={() => setMode('free-text')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === 'free-text'
              ? 'bg-cyan-700 text-white'
              : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
          }`}
        >
          <FileText size={14} />
          Free-Text Brief
        </button>
      </div>

      {mode === 'structured' ? (
        <EnhancedBriefPanel
          projectId={projectId}
          onGenerate={handleQuestionnaireGenerate}
        />
      ) : (
        <AiBriefPanel
          projectId={projectId}
          onParsed={onParsed}
          onDesignOptionsGenerated={onDesignOptionsGenerated}
          onTier3Plans={onTier3Plans}
          onBuildingTypeChange={onBuildingTypeChange}
        />
      )}

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
