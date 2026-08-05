import { useRef, useCallback, useEffect } from 'react'
import { PlanCanvas } from '@/components/cad/PlanCanvas'
import { Button } from '@/components/ui/Button'
import { Box, Wand2, Upload } from 'lucide-react'
import { useFurnitureStore } from '@/stores/furnitureStore'
import { motion } from 'framer-motion'
import type { PlanModel } from '@/domain/plan'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import type { DesignOption } from '@/domain/boq'
import type { BackdropState } from '@/lib/import/backdropUtils'

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
    </div>
  )
}
