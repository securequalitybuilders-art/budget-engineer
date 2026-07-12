import { useMemo, useState, useCallback, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'
import type { CanopyParams } from '@/engine/canopy/canopyGeometry'
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
import { DrawingRegisterPanel } from '@/components/drawings/DrawingRegisterPanel'
import {
  computeFrontElevation,
  computeSideElevation,
  computeSection,
} from '@/adapters/planToElevations'
import {
  DEFAULT_STOREY_HEIGHT,
  ROOF_PITCH_HEIGHT,
} from '@/adapters/planTo3d'
import { Button } from '@/components/ui/Button'
import { Monitor, Download, ListOrdered } from 'lucide-react'
import { convertPlanModelToCadDocument } from '@/adapters/planModelToCadAdapter'
import { generateDxf, downloadDxf } from '@/lib/export/dxfWriter'
import { useDrawingRegisterStore } from '@/stores/drawingRegisterStore'

type DrawingTab = 'plan' | 'site-plan' | 'foundation' | 'roof' | 'ceiling' | 'electrical' | 'plumbing' | 'hvac' | 'front' | 'side' | 'section' | 'presentation' | 'register'

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
  { id: 'register', label: 'Register' },
] as { id: DrawingTab; label: string }[]

interface DrawingsPanelProps {
  activePlan: PlanModel | null
  design: DesignOption | null
  floors: number
  storeyHeight?: number
  pitchHeight?: number
}

export function DrawingsPanel({ activePlan, design, floors, storeyHeight = DEFAULT_STOREY_HEIGHT, pitchHeight = ROOF_PITCH_HEIGHT }: DrawingsPanelProps) {
  const { id: projectId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<DrawingTab>('front')
  const registerSheets = useDrawingRegisterStore((s) => s.sheets)
  const activeSheetId = useDrawingRegisterStore((s) => s.activeSheetId)
  const initializeRegister = useDrawingRegisterStore((s) => s.initialize)
  const setActiveSheet = useDrawingRegisterStore((s) => s.setActiveSheet)
  const markGenerated = useDrawingRegisterStore((s) => s.markGenerated)

  useEffect(() => {
    if (design && floors > 0) {
      initializeRegister({ floorCount: floors })
    }
  }, [design, floors, initializeRegister])

  const handleSelectSheet = useCallback((sheetId: string, viewId: DrawingTab | null, _floorIndex?: number) => {
    setActiveSheet(sheetId)
    if (viewId && viewId !== 'register') {
      setActiveTab(viewId)
    }
  }, [setActiveSheet, setActiveTab])

  useEffect(() => {
    if (activeTab !== 'register') {
      markGenerated(activeTab)
    }
  }, [activeTab, markGenerated])

  const handleExportDxf = useCallback(() => {
    if (!activePlan) return
    const result = convertPlanModelToCadDocument({ plan: activePlan, designId: design?.id })
    if (!result.cad) return
    const dxf = generateDxf(result.cad, { title: design?.name ?? 'floor-plan' })
    const name = (design?.name ?? 'floor-plan').toLowerCase().replace(/\s+/g, '-')
    downloadDxf(dxf, `${name}.dxf`)
  }, [activePlan, design])

  // ── Roof type state for Section drawing ──
  const [sectionRoofType, setSectionRoofType] = useState<'gable' | 'canopy'>('gable')

  const defaultSectionCanopy: CanopyParams = useMemo(() => ({
    spanX: activePlan ? Math.max(5, activePlan.width * 1.2) : 12,
    spanZ: activePlan ? Math.max(5, activePlan.height * 1.2) : 10,
    rise: 2,
    cellDensity: 20,
    seed: 42,
    heightAboveBuilding: floors * storeyHeight,
  }), [activePlan, floors, storeyHeight])

  const [sectionCanopyParams, setSectionCanopyParams] = useState<CanopyParams>(defaultSectionCanopy)

  const updateSectionCanopy = useCallback((patch: Partial<CanopyParams>) => {
    setSectionCanopyParams(p => ({ ...p, ...patch }))
  }, [])

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
        <div className="flex flex-col gap-2">
          {/* Roof type toggle for section */}
          <div className="flex items-center gap-3 rounded-lg border border-stone-700/60 bg-stone-900/50 px-3 py-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Section roof</span>
            <button
              onClick={() => setSectionRoofType('gable')}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                sectionRoofType === 'gable'
                  ? 'bg-cyan-600/20 text-cyan-300'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-300'
              }`}
            >
              Gable
            </button>
            <button
              onClick={() => setSectionRoofType('canopy')}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                sectionRoofType === 'canopy'
                  ? 'bg-violet-600/20 text-violet-300'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-300'
              }`}
            >
              Canopy
            </button>
            {sectionRoofType === 'canopy' && (
              <span className="ml-auto flex gap-3 text-[10px] text-stone-400">
                <label>Rise: {sectionCanopyParams.rise.toFixed(1)}m
                  <input
                    type="range" min={0} max={5} step={0.1}
                    value={sectionCanopyParams.rise}
                    onChange={e => updateSectionCanopy({ rise: parseFloat(e.target.value) })}
                    className="ml-1 w-16 align-middle"
                  />
                </label>
                <label>Range: {sectionCanopyParams.spanX.toFixed(1)}m
                  <input
                    type="range" min={3} max={30} step={0.5}
                    value={sectionCanopyParams.spanX}
                    onChange={e => updateSectionCanopy({ spanX: parseFloat(e.target.value) })}
                    className="ml-1 w-16 align-middle"
                  />
                </label>
              </span>
            )}
          </div>
          <SectionView
            drawing={sectionDrawing}
            activePlan={activePlan}
            floors={floors}
            storeyHeight={storeyHeight}
            pitchHeight={pitchHeight}
            roofType={sectionRoofType}
            canopyParams={sectionRoofType === 'canopy' ? sectionCanopyParams : null}
          />
        </div>
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
      {activeTab === 'register' && (
        <DrawingRegisterPanel
          sheets={registerSheets}
          activeSheetId={activeSheetId}
          onSelectSheet={handleSelectSheet}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/50 px-3 py-2">
        {projectId && (
          <Link
            to={`/project/${projectId}/studio/presentation`}
            className="inline-flex items-center gap-2 rounded-md bg-violet-600/20 px-3 py-1.5 text-[11px] font-medium text-violet-300 transition-colors hover:bg-violet-600/30"
          >
            <Monitor size={14} />
            Open Presentation Studio
          </Link>
        )}
        <div className="ml-auto flex gap-2">
          {activePlan && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 rounded-md px-2 text-[11px] font-medium"
              onClick={handleExportDxf}
              aria-label="Export DXF"
            >
              <Download size={12} />
              DXF
            </Button>
          )}
        </div>
      </div>

      <p className="text-[10px] text-stone-400 leading-relaxed">
        Elevations and section derived from the same PlanModel geometry as 2D/3D.
        {activePlan.wallThickness > 0 && ` Wall thickness ${activePlan.wallThickness.toFixed(2)} m.`}
        Storey height {storeyHeight.toFixed(1)} m. Roof pitch height {pitchHeight.toFixed(1)} m.
      </p>
    </div>
  )
}
