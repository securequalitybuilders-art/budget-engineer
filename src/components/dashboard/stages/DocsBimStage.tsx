import { useState } from 'react'
import { DrawingsPanel } from '@/components/drawings/DrawingsPanel'
import { LazyBimModel3D } from '@/components/bim/LazyBimModel3D'
import { Button } from '@/components/ui/Button'
import { Box, LayoutGrid, Boxes } from 'lucide-react'
import { motion } from 'framer-motion'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'

interface DocsBimStageProps {
  activePlan: PlanModel | null
  selectedDesign: DesignOption | null
}

export function DocsBimStage({ activePlan, selectedDesign }: DocsBimStageProps) {
  const [view, setView] = useState<'drawings' | 'bim'>('drawings')

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
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Drawings & BIM</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            Select a design option in the Concept stage first. Drawings and 3D model are generated from your design.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-stone-700/60 px-4 py-2">
        <Button
          variant={view === 'drawings' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 gap-1 rounded-full px-3 text-[11px] font-semibold"
          onClick={() => setView('drawings')}
        >
          <LayoutGrid size={14} />
          Drawings
        </Button>
        <Button
          variant={view === 'bim' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 gap-1 rounded-full px-3 text-[11px] font-semibold"
          onClick={() => setView('bim')}
        >
          <Boxes size={14} />
          3D Model
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {view === 'drawings' ? (
          <DrawingsPanel
            activePlan={activePlan}
            design={selectedDesign}
            floors={selectedDesign?.floors ?? 1}
          />
        ) : (
          <>
            <LazyBimModel3D plan={activePlan} design={selectedDesign} height={600} />
            {activePlan && (
              <p className="mt-2 max-w-md text-[10px] text-stone-400 leading-relaxed">
                3D BIM model — walls, slabs, storeys, doors, windows and roof generated from your floor plan.
                Storey height 3.0&nbsp;m, wall thickness {(activePlan.wallThickness || 0.23).toFixed(2)}&nbsp;m.
                Model downloadable as .glb for use in Blender, Windows 3D Viewer, and other 3D tools.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
