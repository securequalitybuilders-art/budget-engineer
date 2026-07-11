// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'

afterEach(cleanup)

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

describe('DXF export via DrawingsPanel', () => {
  const minimalPlan = { id: 'plan1', width: 10, height: 10 } as unknown as PlanModel
  const minimalDesign = { id: 'd1', name: 'Test' } as unknown as DesignOption

  it('renders DXF button in DrawingsPanel when activePlan exists', async () => {
    const { DrawingsPanel } = await import('@/components/drawings/DrawingsPanel')
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <DrawingsPanel
          activePlan={minimalPlan}
          design={minimalDesign}
          floors={1}
        />
      </MemoryRouter>
    )
    const exportBtn = screen.getByText('DXF')
    expect(exportBtn).toBeTruthy()
  })

  it('does NOT render DXF button when no activePlan', async () => {
    const { DrawingsPanel } = await import('@/components/drawings/DrawingsPanel')
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <DrawingsPanel
          activePlan={null}
          design={null}
          floors={1}
        />
      </MemoryRouter>
    )
    expect(screen.queryByText('DXF')).toBeNull()
  })
})

describe('DXF export via DesignStage', () => {
  it('renders DXF button in DesignStage toolbar when activePlan exists', async () => {
    const { DesignStage } = await import('@/components/dashboard/stages/DesignStage')
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
    const dxfBtn = screen.getByLabelText('Export DXF')
    expect(dxfBtn).toBeTruthy()
  })
})
