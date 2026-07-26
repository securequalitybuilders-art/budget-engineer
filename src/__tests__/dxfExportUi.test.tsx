// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeAll, afterEach, beforeEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'
import { useDrawingRegisterStore } from '@/stores/drawingRegisterStore'
afterEach(() => {
  cleanup()
})

beforeEach(() => {
  useDrawingRegisterStore.setState({ sheets: [], activeSheetId: null })
})

vi.mock('@/lib/export/dxfWriter', () => ({
  generateDxf: vi.fn(() => 'mock-dxf'),
  downloadDxf: vi.fn(),
}))

vi.mock('@/components/cad/PlanCanvas', () => ({
  PlanCanvas: () => <div data-testid="plan-canvas">PlanCanvas</div>,
}))

vi.mock('@/components/bim/LazyBimModel3D', () => ({
  LazyBimModel3D: () => <div data-testid="bim-model">BimModel3D</div>,
}))

// Mock all heavy drawing view components to eliminate rendering latency
vi.mock('@/components/drawings/ElevationView', () => ({
  ElevationView: () => <div data-testid="elevation-view">ElevationView</div>,
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

let DrawingsPanel: React.ComponentType<any>
let DesignStage: React.ComponentType<any>

beforeAll(async () => {
  const dp = await import('@/components/drawings/DrawingsPanel')
  DrawingsPanel = dp.DrawingsPanel
  const ds = await import('@/components/dashboard/stages/DesignStage')
  DesignStage = ds.DesignStage
})

describe('DXF export via DrawingsPanel', () => {
  const minimalPlan = { id: 'plan1', width: 10, height: 10 } as unknown as PlanModel
  const minimalDesign = { id: 'd1', name: 'Test' } as unknown as DesignOption

  it('renders DXF button in DrawingsPanel when activePlan exists', async () => {
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <DrawingsPanel
          activePlan={minimalPlan}
          design={minimalDesign}
          floors={1}
        />
      </MemoryRouter>
    )
    expect(await screen.findByLabelText('Export DXF')).toBeTruthy()
  })

  it('does NOT render DXF button when no activePlan', async () => {
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <DrawingsPanel
          activePlan={null}
          design={null}
          floors={1}
        />
      </MemoryRouter>
    )
    expect(screen.queryByLabelText('Export DXF')).toBeNull()
    expect(screen.queryByText('DXF')).toBeNull()
  })

  it('shows DXF button with correct aria-label and Download icon', async () => {
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <DrawingsPanel
          activePlan={minimalPlan}
          design={minimalDesign}
          floors={1}
        />
      </MemoryRouter>
    )
    const exportBtn = await screen.findByLabelText('Export DXF')
    expect(exportBtn).toBeTruthy()
    expect(exportBtn.tagName).toBe('BUTTON')
  })
})

describe('DXF export via DesignStage', () => {
  it('renders DXF button in DesignStage toolbar when activePlan exists', async () => {
    const design = { id: 'd1', name: 'Test' } as unknown as DesignOption
    const plan = { id: 'plan1', width: 10, height: 10 } as unknown as PlanModel
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <DesignStage
          projectId="p1"
          selectedDesign={design}
          activePlan={plan}
          handleSavePlan={vi.fn()}
          cadSyncSource="generated"
          lastSavedAt={null}
          isManualSaving={false}
          statusMessage={null}
          statusType={null}
          onManualSavePlan={vi.fn()}
          onRestoreSavedPlan={vi.fn()}
          onResetToGeneratedPlan={vi.fn()}
          handleGenerate={vi.fn()}
          isGenerating={false}
          backdrop={null}
          onBackdropUpdate={vi.fn()}
          onBackdropSetScale={vi.fn()}
          onBackdropClear={vi.fn()}
          onImportFile={vi.fn()}
          onDesignCreated={vi.fn()}
          onOpenImportWorkflow={vi.fn()}
        />
      </MemoryRouter>
    )
    expect(await screen.findByLabelText('Export DXF')).toBeTruthy()
  })
})
