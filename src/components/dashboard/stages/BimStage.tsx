import { useState, useEffect, useCallback, useRef } from 'react'
import { GlbViewer } from '@/components/bim/GlbViewer'
import { GlbSiteViewer } from '@/components/bim/GlbSiteViewer'
import { DrawingsPanel } from '@/components/drawings/DrawingsPanel'
import { Button } from '@/components/ui/Button'
import { Box, LayoutGrid, Boxes, Globe, Wrench, Layers, LayoutPanelTop, Palette, Plug, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { useGlbExport } from '@/hooks/useGlbExport'
import { loadSiteContext } from '@/lib/site/siteContextReader'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import { useDrawingRegisterStore } from '@/stores/drawingRegisterStore'
import { ConstructionPhaseView } from '@/components/construction/ConstructionPhaseView'
import { ROUGH_IN_PHASE, SUBSTRATES_PHASE, MILLWORK_PHASE, FINISHES_PHASE, APPLIANCES_PHASE } from '@/engine/construction/constructionPhases'

type BimView = 'model' | 'site' | 'drawings' | '4d-sequence' | 'construction'

/** Construction sub-tab within BIM */
type ConstructionPhaseTab = 'rough-in' | 'substrates' | 'millwork' | 'finishes' | 'appliances'

const CONSTRUCTION_TABS: { key: ConstructionPhaseTab; label: string; icon: typeof Wrench }[] = [
  { key: 'rough-in', label: 'Rough-in', icon: Wrench },
  { key: 'substrates', label: 'Substrates', icon: Layers },
  { key: 'millwork', label: 'Millwork', icon: LayoutPanelTop },
  { key: 'finishes', label: 'Finishes', icon: Palette },
  { key: 'appliances', label: 'Appliances', icon: Plug },
]

const PHASE_MAP = {
  'rough-in': ROUGH_IN_PHASE,
  'substrates': SUBSTRATES_PHASE,
  'millwork': MILLWORK_PHASE,
  'finishes': FINISHES_PHASE,
  'appliances': APPLIANCES_PHASE,
} as const

interface BimStageProps {
  activePlan: PlanModel | null
  selectedDesign: DesignOption | null
}

export function BimStage({ activePlan, selectedDesign }: BimStageProps) {
  const [view, setView] = useState<BimView>('model')
  const [constructionTab, setConstructionTab] = useState<ConstructionPhaseTab>('rough-in')
  const { glbUrl, isExporting, error: exportError, generate, download } = useGlbExport()
  const registerSheets = useDrawingRegisterStore((s) => s.sheets)
  const initializeRegister = useDrawingRegisterStore((s) => s.initialize)
  const [glbReady, setGlbReady] = useState(false)
  const [glbFailed, setGlbFailed] = useState(false)

  const projectId = selectedDesign?.id

  const siteContext = projectId ? loadSiteContext(projectId) : null

  useEffect(() => {
    if (selectedDesign && selectedDesign.floors > 0 && registerSheets.length === 0) {
      initializeRegister({ floorCount: selectedDesign.floors })
    }
  }, [selectedDesign, registerSheets.length, initializeRegister])

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    if (activePlan && selectedDesign && !glbReady && !glbFailed && !isExporting) {
      generate(activePlan, selectedDesign).then((url) => {
        if (mountedRef.current) {
          if (url) { setGlbReady(true) } else { setGlbFailed(true) }
        }
      })
    }
    return () => { mountedRef.current = false }
  }, [activePlan, selectedDesign, glbReady, glbFailed, isExporting, generate])

  const handleRegenerate = useCallback(() => {
    setGlbReady(false)
    setGlbFailed(false)
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
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-4 py-2 overflow-x-auto">
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

        <div className="mx-1 h-5 w-px bg-stone-700/60 shrink-0" />

        <Button
          variant={view === '4d-sequence' ? 'brand' : 'ghost'}
          size="sm"
          onClick={() => setView('4d-sequence')}
        >
          <Clock size={14} className="mr-1" /> 4D Sequencing
        </Button>
        <Button
          variant={view === 'construction' ? 'brand' : 'ghost'}
          size="sm"
          onClick={() => setView('construction')}
        >
          <Wrench size={14} className="mr-1" /> Construction
        </Button>
      </div>

      <div className="flex flex-1 gap-2 overflow-hidden p-2">
        <div className="flex flex-1 flex-col gap-2 overflow-auto">
          {view === 'model' && (
            <div className="flex-1">
              <ErrorBoundary>
                <div className="mb-2 flex items-center gap-2">
                  {glbFailed && (
                    <span className="text-[11px] text-red-400">Generation failed. Ensure the plan has walls and try again.</span>
                  )}
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

          {/* 4D Construction Sequencing */}
          {view === '4d-sequence' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-stone-900/50 rounded-lg border border-stone-800 p-8">
              <Clock size={48} className="text-cyan-500/60" />
              <h3 className="text-lg font-semibold text-stone-200">4D Construction Sequencing</h3>
              <p className="text-sm text-stone-400 max-w-lg text-center">
                Visualise the build timeline overlaid on the 3D model. Each construction phase (foundation → superstructure → roof → services → finishes)
                is animated in order, showing materials arriving on-site and being installed.
              </p>
              <div className="text-xs text-stone-400 bg-stone-800/60 px-3 py-1.5 rounded">
                Coming soon — connects to Execution Monitor milestones
              </div>
            </div>
          )}

          {/* Layered Construction Assembly — 5 sub-tabs */}
          {view === 'construction' && (
            <div className="flex flex-col h-full gap-2">
              {/* Construction phase sub-tabs */}
              <div className="flex items-center gap-1 border-b border-stone-800 pb-2">
                {CONSTRUCTION_TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = constructionTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setConstructionTab(tab.key)}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                      }`}
                    >
                      <Icon size={12} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {/* Active phase content */}
              <div className="flex-1 overflow-auto">
                <ConstructionPhaseView phase={PHASE_MAP[constructionTab]} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
