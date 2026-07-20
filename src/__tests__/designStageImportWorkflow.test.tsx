// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
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

vi.mock('@/stores/furnitureStore', () => ({
  useFurnitureStore: vi.fn(() => ({ activeDefId: null, setActiveDef: vi.fn() })),
}))

let DesignStage: React.ComponentType<any>

beforeAll(async () => {
  const mod = await import('@/components/dashboard/stages/DesignStage')
  DesignStage = mod.DesignStage
})

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
    render(
      <MemoryRouter>
        <DesignStage {...defaultProps} onOpenImportWorkflow={vi.fn()} />
      </MemoryRouter>
    )
    expect(await screen.findByText('Guided Import (AI detection)')).toBeTruthy()
  })

  it('shows "Quick Import" button in empty state', async () => {
    render(
      <MemoryRouter>
        <DesignStage {...defaultProps} />
      </MemoryRouter>
    )
    expect(await screen.findByText('Quick Import (DXF / image / PDF)')).toBeTruthy()
  })

  it('shows "Generate Design Options" button in empty state', async () => {
    render(
      <MemoryRouter>
        <DesignStage {...defaultProps} />
      </MemoryRouter>
    )
    expect(await screen.findByText('Generate Design Options')).toBeTruthy()
  })

  it('calls onOpenImportWorkflow when Guided Import button is clicked', async () => {
    const onOpenImportWorkflow = vi.fn()
    render(
      <MemoryRouter>
        <DesignStage {...defaultProps} onOpenImportWorkflow={onOpenImportWorkflow} />
      </MemoryRouter>
    )
    const button = await screen.findByText('Guided Import (AI detection)')
    fireEvent.click(button)
    expect(onOpenImportWorkflow).toHaveBeenCalledOnce()
  })

  it('does NOT show Guided Import button when onOpenImportWorkflow is undefined', async () => {
    render(
      <MemoryRouter>
        <DesignStage {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.queryByText('Guided Import (AI detection)')).toBeFalsy()
  })
})
