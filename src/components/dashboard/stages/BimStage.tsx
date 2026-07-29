import { useState, useEffect, useCallback } from 'react'
import { GlbViewer } from '@/components/bim/GlbViewer'
import { GlbSiteViewer } from '@/components/bim/GlbSiteViewer'
import { DrawingsPanel } from '@/components/drawings/DrawingsPanel'
import { Button } from '@/components/ui/Button'
import { Box, LayoutGrid, Boxes, Globe } from 'lucide-react'
import { motion } from 'framer-motion'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { useGlbExport } from '@/hooks/useGlbExport'
import { loadSiteContext } from '@/lib/site/siteContextReader'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import { useDrawingRegisterStore } from '@/stores/drawingRegisterStore'

type BimView = 'model' | 'site' | 'drawings'

interface BimStageProps {
  activePlan: PlanModel | null
  selectedDesign: DesignOption | null
}

export function BimStage({ activePlan, selectedDesign }: BimStageProps) {
  const [view, setView] = useState<BimView>('model')
  const { glbUrl, isExporting, error: exportError, generate, download } = useGlbExport()
  const registerSheets = useDrawingRegisterStore((s) => s.sheets)
  const initializeRegister = useDrawingRegisterStore((s) => s.initialize)
  const [glbReady, setGlbReady] = useState(false)

  const projectId = selectedDesign?.id

  const siteContext = projectId ? loadSiteContext(projectId) : null

  useEffect(() => {
    if (selectedDesign && selectedDesign.floors > 0 && registerSheets.length === 0) {
      initializeRegister({ floorCount: selectedDesign.floors })
    }
  }, [selectedDesign, registerSheets.length, initializeRegister])

  useEffect(() => {
    if (activePlan && selectedDesign && !glbReady && !isExporting) {
      generate(activePlan, selectedDesign).then((url) => {
        if (url) setGlbReady(true)
      })
    }
  }, [activePlan, selectedDesign, glbReady, isExporting, generate])

  const handleRegenerate = useCallback(() => {
    setGlbReady(false)
    if (activePlan && selectedDesign) {
      generate(activePlan, selectedDesign).then((url) => {
        if (url) setGlbReady(true)
      })
    }
  }, [activePlan, selectedDesign, generate])

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
          variant={view === 'site' ? 'brand' : 'ghost'}
          size="sm"
          onClick={() => setView('site')}
        >
          <Globe size={14} className="mr-1" /> Site
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
            <div className="flex-1">
              <ErrorBoundary>
                <div className="mb-2 flex items-center gap-2">
                  <button
                    onClick={handleRegenerate}
                    disabled={isExporting}
                    className="rounded-md bg-stone-900/80 px-2.5 py-1 text-[11px] font-medium text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200 disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                  <span className="text-[10px] text-stone-400">
                    Powered by <a href="https://gltf-viewer.donmccurdy.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">glTF Viewer</a>
                  </span>
                </div>
                <GlbViewer
                  glbUrl={glbUrl}
                  height="100%"
                  onExportClick={() => download(activePlan, selectedDesign)}
                  isExporting={isExporting}
                  exportError={exportError}
                />
              </ErrorBoundary>
            </div>
          )}
          {view === 'site' && (
            <div className="flex-1">
              <ErrorBoundary>
                <GlbSiteViewer
                  glbUrl={glbUrl}
                  site={siteContext}
                  height="100%"
                  onExportClick={() => download(activePlan, selectedDesign)}
                  isExporting={isExporting}
                  exportError={exportError}
                />
              </ErrorBoundary>
            </div>
          )}
          {view === 'drawings' && (
            <ErrorBoundary>
              <DrawingsPanel activePlan={activePlan} design={selectedDesign} floors={selectedDesign?.floors ?? 1} />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  )
}
