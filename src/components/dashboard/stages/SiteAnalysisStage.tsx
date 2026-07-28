import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Globe, MapPin, Layers } from 'lucide-react'
import { motion } from 'framer-motion'
import { loadSiteContext } from '@/lib/site/siteContextReader'
import { createDefaultSiteContext } from '@/engine/analysis/siteAnalysisEngine'
import { SiteAnalysisPanel } from '@/components/analysis/SiteAnalysisPanel'
import { HeliodonView } from '@/components/analysis/HeliodonView'
import { SixDiagramView } from '@/components/analysis/SixDiagramView'

interface SiteAnalysisStageProps {
  selectedDesign?: unknown
  activePlan?: unknown
}

export function SiteAnalysisStage(_props: SiteAnalysisStageProps) {
  const { id: projectId } = useParams<{ id: string }>()
  const [siteKey, setSiteKey] = useState(0)
  const [showDiagrams, setShowDiagrams] = useState(false)

  const site = useMemo(() => {
    if (!projectId) return null
    try {
      return loadSiteContext(projectId)
    } catch {
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, siteKey])

  const handleQuickSetup = () => {
    if (!projectId) return
    try {
      const defaultSite = createDefaultSiteContext(projectId)
      localStorage.setItem(`site-analysis-${projectId}`, JSON.stringify(defaultSite))
      setSiteKey(k => k + 1)
    } catch { /* ignore */ }
  }

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
            No site data available. Define site parameters in the Brief stage first, or use Quick Setup.
          </p>
          <button
            onClick={handleQuickSetup}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
          >
            <MapPin size={16} />
            Quick Setup (Default Site)
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 gap-4 overflow-y-auto p-4">
      <div className="w-96 shrink-0">
        <SiteAnalysisPanel site={site} />
      </div>
      <div className="flex flex-1 flex-col gap-4">
        <HeliodonView
          lat={site.lat}
          lng={site.lng}
          buildingFloors={2}
          className="h-full min-h-[400px]"
        />
        <button
          onClick={() => setShowDiagrams(!showDiagrams)}
          className="flex items-center gap-2 self-start rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          <Layers size={14} />
          {showDiagrams ? 'Hide' : 'Show'} Analysis Diagrams
        </button>
        {showDiagrams && <SixDiagramView diagrams={[]} />}
      </div>
    </div>
  )
}
