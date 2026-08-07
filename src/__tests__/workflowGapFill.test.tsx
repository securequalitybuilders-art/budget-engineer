// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeAll, afterEach, beforeEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'
import type { SiteContext } from '@/domain/site'
import type { DrawingsPanelProps } from '@/components/drawings/DrawingsPanel'
import type { DesignStageProps } from '@/components/dashboard/stages/DesignStage'
import { deriveSiteDimensions } from '@/lib/site/siteContextReader'
import { useDrawingRegisterStore } from '@/stores/drawingRegisterStore'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  useDrawingRegisterStore.setState({ sheets: [], activeSheetId: null })
})

// ── Shared mocks ──
vi.mock('@/components/cad/PlanCanvas', () => ({
  PlanCanvas: () => <div data-testid="plan-canvas">PlanCanvas</div>,
}))

vi.mock('@/components/drawings/ElevationView', () => ({
  ElevationView: ({ title }: { title?: string }) => <div data-testid="elevation-view">{title ?? 'ElevationView'}</div>,
}))

vi.mock('@/components/drawings/SvgElevationView', () => ({
  SvgElevationView: ({ title }: { title?: string }) => <div data-testid="svg-elevation-view">{title ?? 'SvgElevationView'}</div>,
}))

vi.mock('@/components/drawings/ElevationDiagnostics', () => ({
  ElevationDiagnostics: () => null,
}))

vi.mock('@/components/drawings/SectionView', () => ({
  SectionView: () => <div data-testid="section-view">SectionView</div>,
}))

vi.mock('@/components/drawings/SitePlanView', () => ({
  SitePlanView: () => <div data-testid="site-plan-view">SitePlanView</div>,
}))

vi.mock('@/components/drawings/FoundationPlanView', () => ({
  FoundationPlanView: () => <div data-testid="foundation-view">FoundationPlanView</div>,
}))

vi.mock('@/components/drawings/RoofPlanView', () => ({
  RoofPlanView: () => <div data-testid="roof-view">RoofPlanView</div>,
}))

vi.mock('@/components/drawings/CeilingPlanView', () => ({
  CeilingPlanView: () => <div data-testid="ceiling-view">CeilingPlanView</div>,
}))

vi.mock('@/components/drawings/ElectricalPlanView', () => ({
  ElectricalPlanView: () => <div data-testid="electrical-view">ElectricalPlanView</div>,
}))

vi.mock('@/components/drawings/PlumbingPlanView', () => ({
  PlumbingPlanView: () => <div data-testid="plumbing-view">PlumbingPlanView</div>,
}))

vi.mock('@/components/drawings/HvacPlanView', () => ({
  HvacPlanView: () => <div data-testid="hvac-view">HvacPlanView</div>,
}))

vi.mock('@/components/drawings/PresentationSheetView', () => ({
  PresentationSheetView: () => <div data-testid="presentation-sheet">PresentationSheetView</div>,
}))

vi.mock('@/components/drawings/DrawingRegisterPanel', () => ({
  DrawingRegisterPanel: () => <div data-testid="drawing-register">DrawingRegisterPanel</div>,
}))

vi.mock('@/lib/export/dxfWriter', () => ({
  generateDxf: vi.fn(() => 'mock-dxf'),
  downloadDxf: vi.fn(),
}))

vi.mock('@/components/dashboard/stages/SiteAnalysisStage', () => ({
  SiteAnalysisStage: () => <div data-testid="site-analysis-stage">SiteAnalysisStage</div>,
}))

vi.mock('@/components/cad/MiniFloorPlanPreview', () => ({
  MiniFloorPlanPreview: () => <div data-testid="mini-floor-plan">MiniFloorPlanPreview</div>,
}))

vi.mock('@/components/cad/PlanComparison', () => ({
  PlanComparison: () => <div data-testid="plan-comparison">PlanComparison</div>,
}))

vi.mock('@/engine/plan-generator', () => ({
  generatePlanModel: (design: DesignOption) => ({ id: `plan-${design.id}`, width: 10, height: 10, rooms: [], walls: [] }) as unknown as PlanModel,
}))

// ── Gap 1: deriveSiteDimensions (pure helper, no DOM needed) ──
describe('deriveSiteDimensions — site-aware pipeline', () => {
  it('falls back to 15m x 20m with no site context', () => {
    expect(deriveSiteDimensions(null)).toEqual({ siteWidthM: 15, siteDepthM: 20 })
  })

  it('falls back to 15m x 20m when plotBoundary is empty', () => {
    const site = { projectId: 'p1', plotBoundary: [] } as unknown as SiteContext
    expect(deriveSiteDimensions(site)).toEqual({ siteWidthM: 15, siteDepthM: 20 })
  })

  it('derives siteWidthM/siteDepthM from plotBoundary max extents', () => {
    const site = {
      projectId: 'p1',
      plotBoundary: [{ x: 0, y: 0 }, { x: 18, y: 0 }, { x: 18, y: 26 }, { x: 0, y: 26 }],
    } as unknown as SiteContext
    expect(deriveSiteDimensions(site)).toEqual({ siteWidthM: 18, siteDepthM: 26 })
  })

  it('ignores a zero-only boundary (falls back)', () => {
    const site = { projectId: 'p1', plotBoundary: [{ x: 0, y: 0 }, { x: 0, y: 0 }] } as unknown as SiteContext
    expect(deriveSiteDimensions(site)).toEqual({ siteWidthM: 15, siteDepthM: 20 })
  })
})

// ── Gap 2: DrawingsPanel rear/left elevation tabs ──
let DrawingsPanel: React.ComponentType<DrawingsPanelProps>

beforeAll(async () => {
  const dp = await import('@/components/drawings/DrawingsPanel')
  DrawingsPanel = dp.DrawingsPanel
})

const minimalPlan = { id: 'plan1', width: 10, height: 10 } as unknown as PlanModel
const minimalDesign = { id: 'd1', name: 'Test' } as unknown as DesignOption

describe('DrawingsPanel — all 4 elevation tabs', () => {
  it('renders Front/Rear/Left/Side elevation tabs', async () => {
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <DrawingsPanel activePlan={minimalPlan} design={minimalDesign} floors={1} />
      </MemoryRouter>
    )
    expect(await screen.findByText('Front Elevation')).toBeTruthy()
    expect(screen.getByText('Rear Elevation')).toBeTruthy()
    expect(screen.getByText('Left Elevation')).toBeTruthy()
    expect(screen.getByText('Side Elevation')).toBeTruthy()
  })

  it('switches to Rear Elevation content when the tab is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <DrawingsPanel activePlan={minimalPlan} design={minimalDesign} floors={1} />
      </MemoryRouter>
    )
    fireEvent.click(await screen.findByText('Rear Elevation'))
    expect(screen.getByText('REAR ELEVATION')).toBeTruthy()
  })

  it('switches to Left Elevation content when the tab is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <DrawingsPanel activePlan={minimalPlan} design={minimalDesign} floors={1} />
      </MemoryRouter>
    )
    fireEvent.click(await screen.findByText('Left Elevation'))
    expect(screen.getByText('LEFT ELEVATION')).toBeTruthy()
  })
})

// ── Gap 3: DesignStage elevation + site views ──
let DesignStage: React.ComponentType<DesignStageProps>

beforeAll(async () => {
  const ds = await import('@/components/dashboard/stages/DesignStage')
  DesignStage = ds.DesignStage
})

const designFixture: DesignOption = {
  id: 'des-1',
  name: 'House A',
  grossFloorArea: 120,
  floors: 1,
  buildingType: 'house',
  elements: [],
}

const designStageProps: DesignStageProps = {
  projectId: 'p1',
  selectedDesign: designFixture,
  activePlan: minimalPlan,
  handleSavePlan: vi.fn(),
  handleGenerate: vi.fn(),
  isGenerating: false,
  backdrop: null,
  onBackdropUpdate: vi.fn(),
  onBackdropSetScale: vi.fn(),
  onBackdropClear: vi.fn(),
  onImportFile: vi.fn(),
  onDesignCreated: vi.fn(),
}

describe('DesignStage — Edit 2D Plan / Elevations / Site Analysis views', () => {
  it('shows the plan view by default', async () => {
    render(<DesignStage {...designStageProps} />)
    expect(await screen.findByText('Edit 2D Plan')).toBeTruthy()
    expect(screen.getByTestId('plan-canvas')).toBeTruthy()
  })

  it('switches to Elevations view with a 4-face selector', async () => {
    render(<DesignStage {...designStageProps} />)
    fireEvent.click(await screen.findByText('Elevations'))
    expect(screen.getByText('Front')).toBeTruthy()
    expect(screen.getByText('Rear')).toBeTruthy()
    expect(screen.getByText('Left')).toBeTruthy()
    expect(screen.getByText('Right')).toBeTruthy()
    expect(screen.getByTestId('elevation-view')).toBeTruthy()
  })

  it('switches the elevation face', async () => {
    render(<DesignStage {...designStageProps} />)
    fireEvent.click(await screen.findByText('Elevations'))
    fireEvent.click(screen.getByText('Rear'))
    expect(screen.getByText('REAR ELEVATION')).toBeTruthy()
  })

  it('switches to Site Analysis view', async () => {
    render(<DesignStage {...designStageProps} />)
    fireEvent.click(await screen.findByText('Site Analysis'))
    expect(screen.getByTestId('site-analysis-stage')).toBeTruthy()
  })
})

// ── Gap 4: BudgetEngineeredStage honest scope ──
let BudgetEngineeredStage: React.ComponentType<{
  activePlan: PlanModel | null
  selectedDesign: DesignOption | null
  buildingType?: string
  projectRegion?: string
}>

beforeAll(async () => {
  const bes = await import('@/components/dashboard/stages/BudgetEngineeredStage')
  BudgetEngineeredStage = bes.BudgetEngineeredStage
})

describe('BudgetEngineeredStage — honest scope', () => {
  it('no longer claims a complete documentation set', () => {
    render(<BudgetEngineeredStage activePlan={null} selectedDesign={null} />)
    expect(screen.getByText('Presentation sheet and export reports.')).toBeTruthy()
    expect(screen.queryByText(/Complete documentation set/)).toBeNull()
  })

  it('shows region in the empty state', () => {
    render(<BudgetEngineeredStage activePlan={null} selectedDesign={null} projectRegion="Harare" />)
    expect(screen.getByText('Region: Harare')).toBeTruthy()
  })

  it('uses buildingType + projectRegion in the filled header', () => {
    render(
      <BudgetEngineeredStage
        activePlan={minimalPlan}
        selectedDesign={designFixture}
        buildingType="house"
        projectRegion="Bulawayo"
      />
    )
    expect(screen.getByText('house · Bulawayo')).toBeTruthy()
    expect(screen.getByTestId('presentation-sheet')).toBeTruthy()
  })
})

// ── Gap 5: Design Options project tool ──
let DesignOptionsPanel: React.ComponentType<{
  visibleDesignOptions: DesignOption[]
  selectedDesignId: string | null
  setSelectedDesignId: (id: string | null) => void
  handleGenerate: () => Promise<void>
  isGenerating: boolean
  generationStatus?: string | null
  onImportFile?: (file: File) => void
  onOpenInConcept?: () => void
}>

beforeAll(async () => {
  const dop = await import('@/components/dashboard/DesignOptionsPanel')
  DesignOptionsPanel = dop.DesignOptionsPanel
})

const twoOptions: DesignOption[] = [
  { ...designFixture, id: 'opt-1', name: 'Compact House' },
  { ...designFixture, id: 'opt-2', name: 'Spacious House' },
]

describe('DesignOptionsPanel — project tool', () => {
  it('shows empty state with Generate button when no options', async () => {
    render(<DesignOptionsPanel visibleDesignOptions={[]} selectedDesignId={null} setSelectedDesignId={vi.fn()} handleGenerate={vi.fn()} isGenerating={false} />)
    expect(await screen.findByText('Generate Design Options')).toBeTruthy()
  })

  it('lists option cards with previews and selects one', async () => {
    const setSelected = vi.fn()
    render(
      <DesignOptionsPanel
        visibleDesignOptions={twoOptions}
        selectedDesignId="opt-1"
        setSelectedDesignId={setSelected}
        handleGenerate={vi.fn()}
        isGenerating={false}
      />
    )
    expect(await screen.findByText('Compact House')).toBeTruthy()
    expect(screen.getByText('Spacious House')).toBeTruthy()
    expect(screen.getAllByTestId('mini-floor-plan').length).toBe(2)
    fireEvent.click(screen.getByText('Spacious House'))
    expect(setSelected).toHaveBeenCalledWith('opt-2')
  })

  it('calls regenerate and Refine in Concept CTA', async () => {
    const handleGenerate = vi.fn()
    const onOpenInConcept = vi.fn()
    render(
      <DesignOptionsPanel
        visibleDesignOptions={twoOptions}
        selectedDesignId="opt-1"
        setSelectedDesignId={vi.fn()}
        handleGenerate={handleGenerate}
        isGenerating={false}
        onOpenInConcept={onOpenInConcept}
      />
    )
    fireEvent.click(await screen.findByText('Regenerate options'))
    expect(handleGenerate).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('Refine in Concept'))
    expect(onOpenInConcept).toHaveBeenCalledOnce()
  })

  it('renders the comparison table alongside the cards', async () => {
    render(
      <DesignOptionsPanel
        visibleDesignOptions={twoOptions}
        selectedDesignId="opt-1"
        setSelectedDesignId={vi.fn()}
        handleGenerate={vi.fn()}
        isGenerating={false}
      />
    )
    expect(await screen.findByTestId('plan-comparison')).toBeTruthy()
  })
})
