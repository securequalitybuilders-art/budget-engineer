import { useParams, Link } from 'react-router-dom'
import { EngineeringStudioPanel } from '@/components/dashboard/EngineeringStudioPanel'
import { EngineeringAnalysisPanel } from '@/components/dashboard/EngineeringAnalysisPanel'
import { Box, Globe } from 'lucide-react'
import { motion } from 'framer-motion'
import type { DesignOption } from '@/domain/boq'
import type { BOQ } from '@/lib/boq/boq-types'
import type { PlanModel } from '@/domain/plan'

interface EngineeringStageProps {
  selectedDesign: DesignOption | null
  activePlan: PlanModel | null
  boq: BOQ | null
  onDesignOptionsGenerated?: (options: DesignOption[]) => void
  onParsed?: (result: any) => void
  onTier3Plans?: (plans: any[]) => void
  onBuildingTypeChange?: (bt: string) => void
}

export function EngineeringStage({
  selectedDesign,
  activePlan,
  boq,
  ...callbacks
}: EngineeringStageProps) {
  const { id: projectId } = useParams<{ id: string }>();
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
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Engineering & Compliance</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            Select a design option in the Concept stage first. Engineering checks run against your chosen design.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 gap-4 overflow-y-auto p-4">
      <div className="flex-1">
        <EngineeringStudioPanel
          selectedDesign={selectedDesign}
          activePlan={activePlan}
          boq={boq}
          projectId={projectId}
          {...callbacks}
        />
      </div>
      <div className="w-80 shrink-0">
        <div className="mb-3">
          <EngineeringAnalysisPanel selectedDesign={selectedDesign} />
        </div>
        {projectId && (
          <Link
            to={`/project/${projectId}/studio/site-analysis`}
            className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            <Globe size={16} />
            Open Site Analysis Studio
          </Link>
        )}
      </div>
    </div>
  )
}
