// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

import { DesignStage } from '@/components/dashboard/stages/DesignStage'

vi.mock('@/components/cad/PlanCanvas', () => ({
  PlanCanvas: () => <div data-testid="plan-canvas">2D CAD Canvas</div>,
}))

afterEach(() => cleanup())

describe('DesignStage', () => {
  const baseProps = {
    projectId: null as string | null,
    selectedDesign: null as import('@/domain/boq').DesignOption | null,
    activePlan: null as import('@/domain/plan').PlanModel | null,
    handleSavePlan: vi.fn(),
    handleGenerate: vi.fn(),
    isGenerating: false,
    backdrop: null as import('@/lib/import/backdropUtils').BackdropState | null,
    onBackdropUpdate: vi.fn(),
    onBackdropSetScale: vi.fn(),
    onBackdropClear: vi.fn(),
    onImportFile: vi.fn(),
    onDesignCreated: vi.fn(),
  }

  it('shows empty state when no design selected and no backdrop', () => {
    render(<DesignStage {...baseProps} />)
    expect(screen.getByText('2D CAD Canvas')).toBeTruthy()
    expect(screen.getByText('Generate Design Options')).toBeTruthy()
  })

  it('renders only the 2D CAD canvas when a design is selected (no extra toolbar buttons)', () => {
    const mockDesign = { id: 'opt-1', name: 'Test Design', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] }
    render(<DesignStage {...baseProps} projectId="proj-1" selectedDesign={mockDesign} />)
    expect(screen.getByTestId('plan-canvas')).toBeTruthy()
    expect(screen.queryByLabelText('2D Plan View')).toBeNull()
    expect(screen.queryByLabelText('3D BIM View')).toBeNull()
    expect(screen.queryByLabelText('Elevations and Sections')).toBeNull()
    expect(screen.queryByLabelText('Open Component Library')).toBeNull()
  })

  it('renders the canvas when no design selected but backdrop image is present', () => {
    render(
      <DesignStage
        {...baseProps}
        backdrop={{
          imageDataUrl: 'data:image/png;base64,fake',
          opacity: 0.3,
          visible: true,
          pxPerMetre: null,
          naturalWidth: 800,
          naturalHeight: 600,
        }}
      />
    )
    expect(screen.getByTestId('plan-canvas')).toBeTruthy()
    expect(screen.queryByText('Generate Design Options')).toBeNull()
  })
})
