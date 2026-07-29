// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

import { DesignStage } from '@/components/dashboard/stages/DesignStage'

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    currentBrief: { rawText: 'test', parsed: null },
    transactions: [],
  }),
}))

vi.mock('@/stores/disciplineStore', () => {
  const useDisciplineStore = vi.fn()
  useDisciplineStore.mockImplementation((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      currentDiscipline: 'ARCH' as const,
      visibleDisciplines: ['ARCH', 'STR'],
      setCurrentDiscipline: vi.fn(),
      toggleDisciplineVisibility: vi.fn(),
    }
    return selector ? selector(state) : state
  })
  return { useDisciplineStore }
})

vi.mock('@/stores/componentSelectionStore', () => ({
  useComponentSelectionStore: () => ({
    selectedDoorSpec: null,
    selectedWindowSpec: null,
    setSelectedDoorSpec: vi.fn(),
    setSelectedWindowSpec: vi.fn(),
    clearSelection: vi.fn(),
    lastPlaced: null,
    setLastPlaced: vi.fn(),
  }),
}))

afterEach(() => cleanup())

describe('DesignStage', () => {
  const baseProps = {
    projectId: null as string | null,
    selectedDesign: null as import('@/domain/boq').DesignOption | null,
    activePlan: null as import('@/domain/plan').PlanModel | null,
    handleSavePlan: vi.fn(),
    cadSyncSource: 'generated-design' as string,
    lastSavedAt: null as string | null,
    isManualSaving: false,
    statusMessage: null as string | null,
    statusType: null as 'success' | 'error' | 'info' | null,
    onManualSavePlan: vi.fn(),
    onRestoreSavedPlan: vi.fn(),
    onResetToGeneratedPlan: vi.fn(),
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
    expect(screen.getByText('2D / 3D Design Canvas')).toBeTruthy()
  })

  it('shows toolbar when design is selected', () => {
    const mockDesign = { id: 'opt-1', name: 'Test Design', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] }
    render(<DesignStage {...baseProps} projectId="proj-1" selectedDesign={mockDesign} />)
    expect(screen.getByLabelText('2D Plan View')).toBeTruthy()
    expect(screen.getByLabelText('3D BIM View')).toBeTruthy()
    expect(screen.getByLabelText('Elevations and Sections')).toBeTruthy()
  })

  it('renders canvas when no design selected but backdrop image is present', () => {
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
    expect(screen.getByText('2D CAD Canvas')).toBeTruthy()
    expect(screen.getByLabelText('Tracing canvas')).toBeTruthy()
    expect(screen.queryByText('2D / 3D Design Canvas')).toBeNull()
  })
})
