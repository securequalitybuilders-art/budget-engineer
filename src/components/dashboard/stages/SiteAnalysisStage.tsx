import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Globe } from 'lucide-react'
import { motion } from 'framer-motion'
import { loadSiteContext } from '@/lib/site/siteContextReader'
import { SiteAnalysisPanel } from '@/components/analysis/SiteAnalysisPanel'
import { HeliodonView } from '@/components/analysis/HeliodonView'

interface SiteAnalysisStageProps {
  selectedDesign?: unknown
  activePlan?: unknown
}

export function SiteAnalysisStage({ selectedDesign, activePlan }: SiteAnalysisStageProps) {
  const { id: projectId } = useParams<{ id: string }>()

  const site = useMemo(() => {
    if (!projectId) return null
    try {
      return loadSiteContext(projectId)
    } catch {
      return null
    }
  }, [projectId])

  if (!site) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center"
        >
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-lg">
            <Globe size={40} className="text-[var(--brand-accent)]" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Site Analysis</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            No site data available. Define site parameters in the Brief stage first.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 gap-4 overflow-y-auto p-4">
      <div className="w-96 shrink-0">
        <SiteAnalysisPanel site={site} />
      </div>
      <div className="flex-1">
        <HeliodonView
          lat={site.lat}
          lng={site.lng}
          buildingFloors={2}
          className="h-full min-h-[400px]"
        />
      </div>
    </div>
  )
}
