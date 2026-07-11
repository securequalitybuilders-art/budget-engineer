// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

afterEach(cleanup)

vi.mock('@/components/cad/PlanCanvas', () => ({
  PlanCanvas: () => <div data-testid="plan-canvas">PlanCanvas</div>,
}))

vi.mock('@/components/bim/LazyBimModel3D', () => ({
  LazyBimModel3D: () => <div data-testid="bim-model">BimModel3D</div>,
}))

vi.mock('@/components/drawings/DrawingsPanel', () => ({
  DrawingsPanel: () => <div data-testid="drawings-panel">DrawingsPanel</div>,
}))

const defaultProps = {
  projectId: 'p1',
  selectedDesign: null,
  activePlan: null,
  handleSavePlan: vi.fn(),
  cadSyncSource: 'generated',
  lastSavedAt: null,
  isManualSaving: false,
  statusMessage: null,
  statusType: null,
  onManualSavePlan: vi.fn(),
  onRestoreSavedPlan: vi.fn(),
  onResetToGeneratedPlan: vi.fn(),
  handleGenerate: vi.fn(),
  isGenerating: false,
  backdrop: null,
  onBackdropUpdate: vi.fn(),
  onBackdropSetScale: vi.fn(),
  onBackdropClear: vi.fn(),
  onImportFile: vi.fn(),
  onDesignCreated: vi.fn(),
}

describe('DesignStage import workflow buttons', () => {
  it('shows "Guided Import (AI detection)" button in empty state', async () => {
    const { DesignStage } = await import('@/components/dashboard/stages/DesignStage')
    render(
      <MemoryRouter>
        <DesignStage {...defaultProps} onOpenImportWorkflow={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByText('Guided Import (AI detection)')).toBeTruthy()
  })

  it('shows "Quick Import" button in empty state', async () => {
    const { DesignStage } = await import('@/components/dashboard/stages/DesignStage')
    render(
      <MemoryRouter>
        <DesignStage {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.getByText('Quick Import (DXF / image / PDF)')).toBeTruthy()
  })

  it('shows "Generate Design Options" button in empty state', async () => {
    const { DesignStage } = await import('@/components/dashboard/stages/DesignStage')
    render(
      <MemoryRouter>
        <DesignStage {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.getByText('Generate Design Options')).toBeTruthy()
  })

  it('calls onOpenImportWorkflow when Guided Import button is clicked', async () => {
    const onOpenImportWorkflow = vi.fn()
    const { DesignStage } = await import('@/components/dashboard/stages/DesignStage')
    render(
      <MemoryRouter>
        <DesignStage {...defaultProps} onOpenImportWorkflow={onOpenImportWorkflow} />
      </MemoryRouter>
    )
    const button = screen.getByText('Guided Import (AI detection)')
    fireEvent.click(button)
    expect(onOpenImportWorkflow).toHaveBeenCalledOnce()
  })

  it('does NOT show Guided Import button when onOpenImportWorkflow is undefined', async () => {
    const { DesignStage } = await import('@/components/dashboard/stages/DesignStage')
    render(
      <MemoryRouter>
        <DesignStage {...defaultProps} />
      </MemoryRouter>
    )
    const buttons = screen.queryAllByText('Guided Import (AI detection)')
    expect(buttons.length).toBe(0)
  })
})
