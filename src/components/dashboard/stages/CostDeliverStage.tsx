import { BoqExportPanel } from '@/components/dashboard/BoqExportPanel'
import { Box } from 'lucide-react'
import { motion } from 'framer-motion'
import type { DesignOption } from '@/domain/boq'
import type { BoqResult } from '@/adapters/designToBoq'
import type { PlanModel } from '@/domain/plan'

interface CostDeliverStageProps {
  selectedDesign: DesignOption | null
  boq: BoqResult | null
  onExport: (type: 'csv' | 'html' | 'print') => void
  activePlan: PlanModel | null
  buildingType: string
}

export function CostDeliverStage({
  selectedDesign,
  boq,
  onExport,
  activePlan,
  buildingType,
}: CostDeliverStageProps) {
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
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Cost & Deliver</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            Select a design option in the Concept stage first. BOQ and export options appear once a design is chosen.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-y-auto p-4">
      <BoqExportPanel
        selectedDesign={selectedDesign}
        boq={boq}
        onExport={onExport}
        activePlan={activePlan}
        buildingType={buildingType}
      />
    </div>
  )
}
