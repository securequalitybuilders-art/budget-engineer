import { useState, useEffect } from 'react'
import { LazyBimModel3D } from '@/components/bim/LazyBimModel3D'
import { LazyBimViewer } from '@/components/bim/LazyBimViewer'
import { FloorVisibilityPanel } from '@/components/bim/FloorVisibilityPanel'
import { BimInspector } from '@/components/bim/BimInspector'
import { BimLegend } from '@/components/bim/BimLegend'
import { DrawingsPanel } from '@/components/drawings/DrawingsPanel'
import { Button } from '@/components/ui/Button'
import { Box, LayoutGrid, Boxes, Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import { useDrawingRegisterStore } from '@/stores/drawingRegisterStore'

interface BimStageProps {
  activePlan: PlanModel | null
  selectedDesign: DesignOption | null
}

export function BimStage({ activePlan, selectedDesign }: BimStageProps) {
  const [view, setView] = useState<'model' | 'viewer' | 'drawings'>('model')
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null)
  const registerSheets = useDrawingRegisterStore((s) => s.sheets)
  const initializeRegister = useDrawingRegisterStore((s) => s.initialize)

  const floors = selectedDesign
    ? Array.from({ length: selectedDesign.floors }, (_, i) => ({
        id: `floor-${i + 1}`,
        name: `Floor ${i + 1}`,
      }))
    : []

  useEffect(() => {
    if (selectedDesign && selectedDesign.floors > 0 && registerSheets.length === 0) {
      initializeRegister({ floorCount: selectedDesign.floors })
    }
  }, [selectedDesign, registerSheets.length, initializeRegister])

  if (!selectedDesign || !activePlan) {
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
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">BIM</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            Select a design option in the Concept stage first. 3D model and drawings are generated from your design.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-4 py-2">
        <Button
          variant={view === 'model' ? 'brand' : 'ghost'}
          size="sm"
          onClick={() => setView('model')}
        >
          <Boxes size={14} className="mr-1" /> 3D Model
        </Button>
        <Button
          variant={view === 'viewer' ? 'brand' : 'ghost'}
          size="sm"
          onClick={() => setView('viewer')}
        >
          <Eye size={14} className="mr-1" /> Viewer
        </Button>
        <Button
          variant={view === 'drawings' ? 'brand' : 'ghost'}
          size="sm"
          onClick={() => setView('drawings')}
        >
          <LayoutGrid size={14} className="mr-1" /> Drawings
        </Button>
      </div>

      <div className="flex flex-1 gap-2 overflow-hidden p-2">
        <div className="flex flex-1 flex-col gap-2 overflow-auto">
          {view === 'model' && (
            <>
              <FloorVisibilityPanel floors={floors} activeFloorId={activeFloorId} onFloorChange={setActiveFloorId} />
              <div className="flex-1">
                <ErrorBoundary>
                  <LazyBimModel3D plan={activePlan} design={selectedDesign} />
                </ErrorBoundary>
              </div>
            </>
          )}
          {view === 'viewer' && (
            <div className="flex-1">
              <ErrorBoundary>
                <LazyBimViewer model={null} activeFloorId={activeFloorId} height={600} />
              </ErrorBoundary>
            </div>
          )}
          {view === 'drawings' && (
            <ErrorBoundary>
              <DrawingsPanel activePlan={activePlan} design={selectedDesign} floors={selectedDesign?.floors ?? 1} />
            </ErrorBoundary>
          )}
        </div>
        <div className="flex w-56 shrink-0 flex-col gap-2">
          <BimLegend />
          <BimInspector element={null} />
        </div>
      </div>
    </div>
  )
}
