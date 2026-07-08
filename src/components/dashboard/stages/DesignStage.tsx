import { useState, useRef, useCallback } from 'react'
import { PlanCanvas } from '@/components/cad/PlanCanvas'
import { LazyBimModel3D } from '@/components/bim/LazyBimModel3D'
import { DrawingsPanel } from '@/components/drawings/DrawingsPanel'
import { CadSyncControls } from '@/components/dashboard/CadSyncControls'
import { Button } from '@/components/ui/Button'
import { Box, Layers, Ruler, Wand2, Upload, LayoutGrid, Boxes } from 'lucide-react'
import { motion } from 'framer-motion'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import type { BackdropState } from '@/lib/import/backdropUtils'

interface DesignStageProps {
  projectId: string | null
  selectedDesign: DesignOption | null
  activePlan: PlanModel | null
  handleSavePlan: (projectId: string, designId: string, plan: PlanModel) => Promise<void>
  cadSyncSource: string
  lastSavedAt: string | null
  isManualSaving: boolean
  statusMessage: string | null
  statusType: 'success' | 'error' | 'info' | null
  onManualSavePlan: () => Promise<void>
  onRestoreSavedPlan: () => Promise<void>
  onResetToGeneratedPlan: () => void
  handleGenerate: () => Promise<void>
  isGenerating: boolean
  backdrop: BackdropState | null
  onBackdropUpdate: (update: Partial<BackdropState>) => void
  onBackdropSetScale: (knownWidth: number, knownHeight: number) => void
  onBackdropClear: () => void
  onImportFile: (file: File) => void
}

export function DesignStage({
  projectId,
  selectedDesign,
  activePlan,
  handleSavePlan,
  cadSyncSource,
  lastSavedAt,
  isManualSaving,
  statusMessage,
  statusType,
  onManualSavePlan,
  onRestoreSavedPlan,
  onResetToGeneratedPlan,
  handleGenerate,
  isGenerating,
  backdrop,
  onBackdropUpdate,
  onBackdropSetScale,
  onBackdropClear,
  onImportFile,
}: DesignStageProps) {
  const [canvasView, setCanvasView] = useState<'plan' | 'bim' | 'drawings'>('plan')
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleImportChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onImportFile(file)
    if (e.target) e.target.value = ''
  }, [onImportFile])

  if (!selectedDesign) {
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
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">2D / 3D Design Canvas</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            Select a design option in the Concept stage first. Once selected, 2D plans and 3D views appear here.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button className="gap-2" onClick={handleGenerate} disabled={isGenerating}>
              <Wand2 size={16} />
              Generate Design Options
            </Button>
            <Button variant="secondary" className="gap-2" onClick={() => importInputRef.current?.click()}>
              <Upload size={16} />
              Import (DXF / image / PDF)
            </Button>
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
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-full glass px-2 py-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[var(--brand-accent)]" aria-label="Select">
          <Box size={16} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Wall tool">
          <Layers size={16} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Measure">
          <Ruler size={16} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="AI design">
          <Wand2 size={16} />
        </Button>

        <span className="mx-1 h-5 w-px bg-white/10" />

        <CadSyncControls
          sourceLabel={
            cadSyncSource === 'persisted-cad' ? 'Edited CAD' :
            cadSyncSource === 'fallback-generated' ? 'Fallback' :
            'Generated'
          }
          lastSavedAt={lastSavedAt}
          isSaving={isManualSaving}
          disabled={!projectId || !selectedDesign?.id}
          statusMessage={statusMessage}
          statusType={statusType}
          onSave={onManualSavePlan}
          onRestore={onRestoreSavedPlan}
          onReset={onResetToGeneratedPlan}
        />

        <span className="mx-1 h-5 w-px bg-white/10" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          aria-label="Import DXF, image, or PDF"
          title="Import DXF, image, or PDF"
          onClick={() => importInputRef.current?.click()}
        >
          <Upload size={16} />
        </Button>

        <span className="mx-1 h-5 w-px bg-white/10" />

        <Button
          variant={canvasView === 'plan' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 gap-1 rounded-full px-2 text-[11px] font-semibold"
          aria-label="2D Plan View"
          title="View 2D floor plan"
          onClick={() => setCanvasView('plan')}
        >
          <LayoutGrid size={14} />
          <span className="hidden sm:inline">2D</span>
        </Button>
        <Button
          variant={canvasView === 'drawings' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 gap-1 rounded-full px-2 text-[11px] font-semibold"
          aria-label="Elevations and Sections"
          title="View elevations and section drawings"
          onClick={() => setCanvasView('drawings')}
        >
          <LayoutGrid size={14} />
          <span className="hidden sm:inline">Drawings</span>
        </Button>
        <Button
          variant={canvasView === 'bim' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 gap-1 rounded-full px-2 text-[11px] font-semibold"
          aria-label="3D BIM View"
          title="View 3D BIM model"
          onClick={() => setCanvasView('bim')}
        >
          <Boxes size={14} />
          <span className="hidden sm:inline">3D</span>
        </Button>
      </div>

      {/* Canvas area */}
      <div className="flex flex-1 flex-col overflow-auto p-4 pt-20">
        {canvasView === 'plan' ? (
          <PlanCanvas
            projectId={projectId}
            design={selectedDesign}
            persistedPlan={activePlan}
            onSavePlan={handleSavePlan}
            backdrop={backdrop}
            onBackdropUpdate={onBackdropUpdate}
            onBackdropSetScale={onBackdropSetScale}
            onBackdropClear={onBackdropClear}
          />
        ) : canvasView === 'bim' ? (
          <>
            <LazyBimModel3D plan={activePlan} design={selectedDesign} height={480} />
            {activePlan && (
              <p className="mt-2 max-w-md text-[10px] text-stone-400 leading-relaxed">
                3D BIM model — walls, slabs, storeys, doors, windows and roof generated from your floor plan.
                Storey height 3.0&nbsp;m, wall thickness {(activePlan.wallThickness || 0.23).toFixed(2)}&nbsp;m.
                Model downloadable as .glb for use in Blender, Windows 3D Viewer, and other 3D tools.
              </p>
            )}
          </>
        ) : (
          activePlan && (
            <DrawingsPanel
              activePlan={activePlan}
              design={selectedDesign}
              floors={selectedDesign?.floors ?? 1}
            />
          )
        )}
        <p className="mt-4 max-w-xs text-[10px] text-stone-400">
          Mobile: review, estimates, exports supported. For best CAD editing, use a tablet or desktop.
        </p>
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
  )
}
