import { useMemo, useState } from 'react'
import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'
import { PlanCanvas } from '@/components/cad/PlanCanvas'
import { ElevationView } from '@/components/drawings/ElevationView'
import { SectionView } from '@/components/drawings/SectionView'
import { SitePlanView } from '@/components/drawings/SitePlanView'
import { FoundationPlanView } from '@/components/drawings/FoundationPlanView'
import { RoofPlanView } from '@/components/drawings/RoofPlanView'
import { CeilingPlanView } from '@/components/drawings/CeilingPlanView'
import { ElectricalPlanView } from '@/components/drawings/ElectricalPlanView'
import { PlumbingPlanView } from '@/components/drawings/PlumbingPlanView'
import { HvacPlanView } from '@/components/drawings/HvacPlanView'
import { PresentationSheetView } from '@/components/drawings/PresentationSheetView'
import {
  computeFrontElevation,
  computeSideElevation,
  computeSection,
} from '@/adapters/planToElevations'
import {
  DEFAULT_STOREY_HEIGHT,
  ROOF_PITCH_HEIGHT,
} from '@/adapters/planTo3d'

type DrawingTab = 'plan' | 'site-plan' | 'foundation' | 'roof' | 'ceiling' | 'electrical' | 'plumbing' | 'hvac' | 'front' | 'side' | 'section' | 'presentation'

const TABS: { id: DrawingTab; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'site-plan', label: 'Site Plan' },
  { id: 'foundation', label: 'Foundation' },
  { id: 'roof', label: 'Roof Plan' },
  { id: 'ceiling', label: 'Ceiling (RCP)' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'plumbing', label: 'Plumbing' },
  { id: 'hvac', label: 'HVAC' },
  { id: 'front', label: 'Front Elevation' },
  { id: 'side', label: 'Side Elevation' },
  { id: 'section', label: 'Section A-A' },
  { id: 'presentation', label: 'Presentation Sheet' },
]

interface DrawingsPanelProps {
  activePlan: PlanModel | null
  design: DesignOption | null
  floors: number
  storeyHeight?: number
  pitchHeight?: number
}

export function DrawingsPanel({ activePlan, design, floors, storeyHeight = DEFAULT_STOREY_HEIGHT, pitchHeight = ROOF_PITCH_HEIGHT }: DrawingsPanelProps) {
  const [activeTab, setActiveTab] = useState<DrawingTab>('front')

  const frontDrawing = useMemo(() => {
    try { return computeFrontElevation(activePlan!, floors, storeyHeight, pitchHeight) } catch { return null }
  }, [activePlan, floors, storeyHeight, pitchHeight])

  const sideDrawing = useMemo(() => {
    try { return computeSideElevation(activePlan!, floors, storeyHeight, pitchHeight) } catch { return null }
  }, [activePlan, floors, storeyHeight, pitchHeight])

  const sectionDrawing = useMemo(() => {
    try { return computeSection(activePlan!, floors, storeyHeight, pitchHeight) } catch { return null }
  }, [activePlan, floors, storeyHeight, pitchHeight])

  if (!activePlan || floors < 1) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-12">
        <p className="text-sm text-stone-400">
          No active design — generate a design first to view drawings.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1 rounded-lg border border-stone-700/60 bg-stone-900/80 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-cyan-600/20 text-cyan-300'
                : 'text-stone-400 hover:bg-stone-800 hover:text-stone-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'plan' && (
        <div className="rounded-lg border border-stone-700/60 bg-stone-950/80 p-1">
          <PlanCanvas projectId={null} design={design} persistedPlan={activePlan} />
        </div>
      )}
      {activeTab === 'site-plan' && (
        <SitePlanView activePlan={activePlan} design={design} floors={floors} />
      )}
      {activeTab === 'foundation' && (
        <FoundationPlanView activePlan={activePlan} floors={floors} />
      )}
      {activeTab === 'roof' && (
        <RoofPlanView activePlan={activePlan} />
      )}
      {activeTab === 'ceiling' && (
        <CeilingPlanView activePlan={activePlan} />
      )}
      {activeTab === 'electrical' && (
        <ElectricalPlanView activePlan={activePlan} />
      )}
      {activeTab === 'plumbing' && (
        <PlumbingPlanView activePlan={activePlan} />
      )}
      {activeTab === 'hvac' && (
        <HvacPlanView activePlan={activePlan} />
      )}
      {activeTab === 'front' && (
        <ElevationView
          drawing={frontDrawing}
          activePlan={activePlan}
          floors={floors}
          storeyHeight={storeyHeight}
          pitchHeight={pitchHeight}
          title="FRONT ELEVATION"
        />
      )}
      {activeTab === 'side' && (
        <ElevationView
          drawing={sideDrawing}
          activePlan={activePlan}
          floors={floors}
          storeyHeight={storeyHeight}
          pitchHeight={pitchHeight}
          title="SIDE ELEVATION"
        />
      )}
      {activeTab === 'section' && (
        <SectionView
          drawing={sectionDrawing}
          activePlan={activePlan}
          floors={floors}
          storeyHeight={storeyHeight}
          pitchHeight={pitchHeight}
        />
      )}
      {activeTab === 'presentation' && (
        <PresentationSheetView
          activePlan={activePlan}
          design={design}
          floors={floors}
          storeyHeight={storeyHeight}
          pitchHeight={pitchHeight}
        />
      )}

      <p className="text-[10px] text-stone-400 leading-relaxed">
        Elevations and section derived from the same PlanModel geometry as 2D/3D.
        {activePlan.wallThickness > 0 && ` Wall thickness ${activePlan.wallThickness.toFixed(2)} m.`}
        Storey height {storeyHeight.toFixed(1)} m. Roof pitch height {pitchHeight.toFixed(1)} m.
      </p>
    </div>
  )
}
