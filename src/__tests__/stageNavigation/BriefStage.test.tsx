// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { BriefStage } from '@/components/dashboard/stages/BriefStage'

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

describe('BriefStage', () => {
  const baseProps = {
    onParsed: vi.fn(),
    onDesignOptionsGenerated: vi.fn(),
    onTier3Plans: vi.fn(),
    onBuildingTypeChange: vi.fn(),
    visibleDesignOptions: [] as import('@/domain/boq').DesignOption[],
    selectedDesignId: null as string | null,
    setSelectedDesignId: vi.fn(),
    selectedDesign: null as import('@/domain/boq').DesignOption | null,
  }

  it('renders without crashing', () => {
    const { container } = render(<BriefStage {...baseProps} />)
    expect(container.textContent).toBeTruthy()
  })

  it('shows design option cards when visibleDesignOptions has items', () => {
    const mockOptions = [
      { id: 'opt-1', name: 'Option A', grossFloorArea: 120, floors: 1, buildingType: 'house', elements: [{ id: 'e1', type: 'wall', category: 'Wall', name: 'Wall', unit: 'm', quantity: 50 }] },
      { id: 'opt-2', name: 'Option B', grossFloorArea: 150, floors: 2, buildingType: 'house', elements: [] },
    ]
    render(<BriefStage {...baseProps} visibleDesignOptions={mockOptions} />)
    expect(screen.getByText('Designs generated')).toBeTruthy()
    expect(screen.getByText('Option A')).toBeTruthy()
    expect(screen.getByText('Option B')).toBeTruthy()
  })
})
