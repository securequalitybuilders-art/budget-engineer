import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PlanCanvas } from '@/components/cad/PlanCanvas'
import { LazyBimModel3D } from '@/components/bim/LazyBimModel3D'
import { DrawingsPanel } from '@/components/drawings/DrawingsPanel'
import { BlockLibraryPanel } from '@/components/furniture/BlockLibraryPanel'
import { CadSyncControls } from '@/components/dashboard/CadSyncControls'
import { Button } from '@/components/ui/Button'
import { Box, Layers, Ruler, Wand2, Upload, LayoutGrid, Boxes, Sofa, Download, Table2 } from 'lucide-react'
import { useFurnitureStore } from '@/stores/furnitureStore'
import { motion } from 'framer-motion'
import { segmentsToPlan, detectWallsFromImage } from '@/lib/import/wallDetection'
import { convertPlanModelToCadDocument } from '@/adapters/planModelToCadAdapter'
import { generateDxf, downloadDxf } from '@/lib/export/dxfWriter'
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
  onDesignCreated: (projectId: string, plan: PlanModel) => void
  onOpenImportWorkflow?: () => void
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
  onDesignCreated,
  onOpenImportWorkflow,
}: DesignStageProps) {
  const [canvasView, setCanvasView] = useState<'plan' | 'bim' | 'drawings'>('plan')
  const [detecting, setDetecting] = useState(false)
  const [detectMessage, setDetectMessage] = useState<string | null>(null)
  const [detectError, setDetectError] = useState(false)
  const [showFurniturePanel, setShowFurniturePanel] = useState(false)
  const { id: projectIdParam } = useParams<{ id: string }>()
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

  const handleExportDxf = useCallback(() => {
    if (!activePlan) return
    const result = convertPlanModelToCadDocument({ plan: activePlan, designId: selectedDesign?.id })
    if (!result.cad) return
    const dxf = generateDxf(result.cad, { title: selectedDesign?.name ?? 'floor-plan' })
    const name = (selectedDesign?.name ?? 'floor-plan').toLowerCase().replace(/\s+/g, '-')
    downloadDxf(dxf, `${name}.dxf`)
  }, [activePlan, selectedDesign])

  const handleImportChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onImportFile(file)
    if (e.target) e.target.value = ''
  }, [onImportFile])

  const handleDetectWalls = useCallback(async () => {
    if (!backdrop?.imageDataUrl || !backdrop.pxPerMetre || !projectId) return
    setDetecting(true)
    setDetectMessage('Detecting walls...')
    setDetectError(false)
    try {
      const result = await detectWallsFromImage(backdrop.imageDataUrl, backdrop.pxPerMetre)
      if (result.walls.length > 0) {
        const plan = segmentsToPlan(result.walls, backdrop.pxPerMetre)
        if (plan) {
          plan.id = `detected-${Date.now()}`
          onDesignCreated(projectId, plan)
          setDetectMessage(`Auto-detected ${result.detectedLines} walls (confidence: ${result.confidence}) — review and correct.`)
        } else {
          setDetectMessage('No walls could be derived from detection.')
          setDetectError(true)
        }
      } else {
        setDetectMessage(result.message || 'No walls detected. Try adjusting image contrast or trace manually.')
        setDetectError(true)
      }
    } catch {
      setDetectMessage('Wall detection failed. Trace manually over the backdrop.')
      setDetectError(true)
    } finally {
      setDetecting(false)
    }
  }, [backdrop, projectId, onDesignCreated])

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
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">2D / 3D Design Canvas</h2>
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
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="absolute left-0 top-4 z-10 w-full overflow-x-auto px-4 scrollbar-none">
        <div className="inline-flex items-center gap-1 rounded-full glass px-2 py-1 whitespace-nowrap">
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

        {onOpenImportWorkflow && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-label="Guided import with AI wall detection"
            title="Guided import with AI wall detection"
            onClick={onOpenImportWorkflow}
          >
            <Wand2 size={16} />
          </Button>
        )}

        {backdrop?.imageDataUrl && backdrop.pxPerMetre !== null && (
          <>
            <span className="mx-1 h-5 w-px bg-white/10" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 rounded-full px-2 text-[11px] font-semibold"
              onClick={handleDetectWalls}
              disabled={detecting}
              aria-label="Auto-detect walls from backdrop image"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              {detecting ? 'Detecting...' : 'Detect walls'}
            </Button>
          </>
        )}

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

        <span className="mx-1 h-5 w-px bg-white/10" />

        {projectIdParam && (
          <Link
            to={`/project/${projectIdParam}/studio/interior`}
            className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            aria-label="Open Interior Studio"
            title="Open Interior Studio"
          >
            <Sofa size={14} />
            <span className="hidden sm:inline">Interior</span>
          </Link>
        )}

        <span className="mx-1 h-5 w-px bg-white/10" />

        <Button
          variant={showFurniturePanel ? 'default' : 'ghost'}
          size="sm"
          className="h-8 gap-1 rounded-full px-2 text-[11px] font-semibold"
          aria-label="Open Furniture & Block Library"
          title="Open Furniture & Block Library"
          onClick={() => setShowFurniturePanel((v) => !v)}
        >
          <Table2 size={14} />
          <span className="hidden sm:inline">Furniture</span>
        </Button>

        {activePlan && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 rounded-full px-2 text-[11px] font-semibold"
            aria-label="Export DXF"
            title="Export plan as DXF"
            onClick={handleExportDxf}
          >
            <Download size={14} />
            <span className="hidden sm:inline">DXF</span>
          </Button>
        )}
        </div>
      </div>

      {/* Detection status bar */}
      {detectMessage && (
        <div className={`absolute left-4 right-4 z-10 mt-2 rounded-lg px-3 py-1.5 text-[11px] ${
          detectError
            ? 'border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] text-[#ef4444]'
            : 'border border-[rgba(6,182,212,0.3)] bg-[rgba(6,182,212,0.1)] text-[#06B6D4]'
        }`}>
          {detectMessage}
        </div>
      )}

      {/* Canvas area */}
      <div className="flex flex-1 flex-row overflow-hidden">
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
            onDesignCreated={onDesignCreated}
            furnitureBlocks={furnitureBlocks}
            activeBlockDefId={activeBlockDefId}
            onPlaceBlock={placeBlock}
            onRemoveBlock={removeBlock}
            onRotateBlock={rotateBlock}
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

      {showFurniturePanel && (
        <BlockLibraryPanel onClose={() => setShowFurniturePanel(false)} />
      )}

      <input
        ref={importInputRef}
        type="file"
        accept=".dxf,image/*,application/pdf"
        onChange={handleImportChange}
        className="hidden"
        aria-label="Select a DXF, image, or PDF file to import"
      />
      </div>
    </div>
  )
}
