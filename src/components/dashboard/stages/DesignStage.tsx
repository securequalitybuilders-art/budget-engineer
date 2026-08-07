import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { PlanCanvas } from '@/components/cad/PlanCanvas'
import { Button } from '@/components/ui/Button'
import { Box, Wand2, Upload, PenTool, Building2, MapPinned } from 'lucide-react'
import { useFurnitureStore } from '@/stores/furnitureStore'
import { motion } from 'framer-motion'
import type { PlanModel } from '@/domain/plan'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import type { DesignOption } from '@/domain/boq'
import type { BackdropState } from '@/lib/import/backdropUtils'
import { ElevationView } from '@/components/drawings/ElevationView'
import { resolveFrontElevation, resolveRearElevation, resolveLeftElevation, resolveSideElevation } from '@/lib/drawings/elevationResolver'
import { DEFAULT_STOREY_HEIGHT, ROOF_PITCH_HEIGHT } from '@/adapters/planTo3d'
import { SiteAnalysisStage } from '@/components/dashboard/stages/SiteAnalysisStage'
import { cn } from '@/lib/utils'

type DesignView = 'plan' | 'elevations' | 'site'
type ElevationFace = 'front' | 'rear' | 'left' | 'right'

const ELEVATION_FACES: { id: ElevationFace; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'rear', label: 'Rear' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
]

export interface DesignStageProps {
  projectId: string | null
  selectedDesign: DesignOption | null
  activePlan: PlanModel | null
  handleSavePlan: (projectId: string, designId: string, plan: PlanModel) => Promise<void>
  handleGenerate: () => Promise<void>
  isGenerating: boolean
  backdrop: BackdropState | null
  onBackdropUpdate: (update: Partial<BackdropState>) => void
  onBackdropSetScale: (knownWidth: number, knownHeight: number) => void
  onBackdropClear: () => void
  onImportFile: (file: File) => void
  onDesignCreated: (projectId: string, plan: PlanModel) => void
  onOpenImportWorkflow?: () => void
}

export function DesignStage({
  projectId,
  selectedDesign,
  activePlan,
  handleSavePlan,
  handleGenerate,
  isGenerating,
  backdrop,
  onBackdropUpdate,
  onBackdropSetScale,
  onBackdropClear,
  onImportFile,
  onDesignCreated,
  onOpenImportWorkflow,
}: DesignStageProps) {
  const importInputRef = useRef<HTMLInputElement>(null)
  const furnitureBlocks = useFurnitureStore((s) => s.blocks)
  const [view, setView] = useState<DesignView>('plan')
  const [elevationFace, setElevationFace] = useState<ElevationFace>('front')

  const storeyHeight = DEFAULT_STOREY_HEIGHT
  const pitchHeight = ROOF_PITCH_HEIGHT
  const floors = selectedDesign?.floors ?? 1

  const elevationDrawing = useMemo(() => {
    if (!activePlan) return null
    switch (elevationFace) {
      case 'rear': return resolveRearElevation(activePlan, floors, storeyHeight, pitchHeight)
      case 'left': return resolveLeftElevation(activePlan, floors, storeyHeight, pitchHeight)
      case 'right': return resolveSideElevation(activePlan, floors, storeyHeight, pitchHeight, selectedDesign?.buildingType)
      case 'front':
      default: return resolveFrontElevation(activePlan, floors, storeyHeight, pitchHeight, selectedDesign?.buildingType)
    }
  }, [activePlan, floors, storeyHeight, pitchHeight, elevationFace, selectedDesign?.buildingType])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        const st = useFurnitureStore.getState()
        if (st.activeDefId) st.setActiveDef(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const activeBlockDefId = useFurnitureStore((s) => s.activeDefId)
  const placeBlock = useFurnitureStore((s) => s.placeBlock)
  const removeBlock = useFurnitureStore((s) => s.removeBlock)
  const rotateBlock = useFurnitureStore((s) => s.rotateBlock)

  const handleImportChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onImportFile(file)
    if (e.target) e.target.value = ''
  }, [onImportFile])

  if (!selectedDesign && !backdrop?.imageDataUrl) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center"
        >
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-lg">
            <Box size={40} className="text-[var(--brand-accent)]" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">2D CAD Canvas</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            Select a design option in the Concept stage first, or import an image as a tracing backdrop.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button className="gap-2" onClick={handleGenerate} disabled={isGenerating}>
              <Wand2 size={16} />
              Generate Design Options
            </Button>
            <Button variant="secondary" className="gap-2" onClick={() => importInputRef.current?.click()}>
              <Upload size={16} />
              Quick Import (DXF / image / PDF)
            </Button>
            {onOpenImportWorkflow && (
              <Button variant="secondary" className="gap-2" onClick={onOpenImportWorkflow}>
                <Wand2 size={16} />
                Guided Import (AI detection)
              </Button>
            )}
            <p className="mt-1 text-[10px] text-stone-400">{'Supported: DXF, images. For AutoCAD/ArchiCAD, export to DXF first.'}</p>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept=".dxf,image/*,application/pdf"
            onChange={handleImportChange}
            className="hidden"
            aria-label="Select a DXF, image, or PDF file to import"
          />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden p-4">
      <div className="mb-3 flex flex-wrap items-center gap-1 rounded-lg border border-stone-700/60 bg-stone-900/80 p-1">
        <button
          onClick={() => setView('plan')}
          className={cn(
            'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors',
            view === 'plan' ? 'bg-cyan-600/20 text-cyan-300' : 'text-stone-400 hover:bg-stone-800 hover:text-stone-300',
          )}
        >
          <PenTool size={13} />
          Edit 2D Plan
        </button>
        <button
          onClick={() => setView('elevations')}
          className={cn(
            'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors',
            view === 'elevations' ? 'bg-cyan-600/20 text-cyan-300' : 'text-stone-400 hover:bg-stone-800 hover:text-stone-300',
          )}
        >
          <Building2 size={13} />
          Elevations
        </button>
        <button
          onClick={() => setView('site')}
          className={cn(
            'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors',
            view === 'site' ? 'bg-cyan-600/20 text-cyan-300' : 'text-stone-400 hover:bg-stone-800 hover:text-stone-300',
          )}
        >
          <MapPinned size={13} />
          Site Analysis
        </button>
      </div>

      {view === 'plan' && (
        <ErrorBoundary>
          <PlanCanvas
            projectId={projectId}
            design={selectedDesign}
            persistedPlan={activePlan}
            onSavePlan={handleSavePlan}
            backdrop={backdrop}
            onBackdropUpdate={onBackdropUpdate}
            onBackdropSetScale={onBackdropSetScale}
            onBackdropClear={onBackdropClear}
            onDesignCreated={onDesignCreated}
            furnitureBlocks={furnitureBlocks}
            activeBlockDefId={activeBlockDefId}
            onPlaceBlock={placeBlock}
            onRemoveBlock={removeBlock}
            onRotateBlock={rotateBlock}
          />
        </ErrorBoundary>
      )}

      {view === 'elevations' && (
        <div className="flex flex-1 flex-col gap-3 overflow-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Face</span>
            {ELEVATION_FACES.map((face) => (
              <button
                key={face.id}
                onClick={() => setElevationFace(face.id)}
                className={cn(
                  'rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
                  elevationFace === face.id
                    ? 'bg-cyan-600/20 text-cyan-300'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-stone-300',
                )}
              >
                {face.label}
              </button>
            ))}
          </div>
          <ElevationView
            drawing={elevationDrawing}
            activePlan={activePlan}
            floors={floors}
            storeyHeight={storeyHeight}
            pitchHeight={pitchHeight}
            title={`${elevationFace.toUpperCase()} ELEVATION`}
          />
        </div>
      )}

      {view === 'site' && (
        <ErrorBoundary>
          <SiteAnalysisStage selectedDesign={selectedDesign} activePlan={activePlan} />
        </ErrorBoundary>
      )}
    </div>
  )
}
