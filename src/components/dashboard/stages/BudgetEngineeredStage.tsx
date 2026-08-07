import { FileSpreadsheet } from 'lucide-react'
import { motion } from 'framer-motion'
import { PresentationSheetView } from '@/components/drawings/PresentationSheetView'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'

interface BudgetEngineeredStageProps {
  activePlan: PlanModel | null
  selectedDesign: DesignOption | null
  buildingType?: string
  projectRegion?: string
}

export function BudgetEngineeredStage({ activePlan, selectedDesign, buildingType, projectRegion }: BudgetEngineeredStageProps) {
  if (!selectedDesign || !activePlan) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center"
        >
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-lg">
            <FileSpreadsheet size={40} className="text-[var(--brand-accent)]" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Budget Engineered</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            Presentation sheet and export reports.
          </p>
          {projectRegion && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">Region: {projectRegion}</p>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border-default)] px-4 py-2">
        <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">Budget Engineered</h2>
        <p className="text-xs text-[var(--text-muted)]">Presentation sheet and export reports</p>
        {buildingType && (
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
            {buildingType}
            {projectRegion ? ` · ${projectRegion}` : ''}
          </p>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <PresentationSheetView
          activePlan={activePlan}
          design={selectedDesign}
          floors={selectedDesign.floors ?? 1}
          storeyHeight={3}
          pitchHeight={1.5}
        />
      </div>
    </div>
  )
}
