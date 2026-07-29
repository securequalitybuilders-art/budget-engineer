// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { EngineeringStage } from '@/components/dashboard/stages/EngineeringStage'

describe('EngineeringStage', () => {
  it('shows empty state when no design selected', () => {
    render(
      <EngineeringStage
        selectedDesign={null}
        activePlan={null}
        boq={null}
        onDesignOptionsGenerated={vi.fn()}
        onParsed={vi.fn()}
        onTier3Plans={vi.fn()}
        onBuildingTypeChange={vi.fn()}
      />
    )
    expect(screen.getByText('Engineering & Compliance')).toBeTruthy()
  })

  it('renders EngineeringStudioPanel when design is selected', () => {
    const mockDesign = { id: 'opt-1', name: 'Test', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] }
    render(
      <EngineeringStage
        selectedDesign={mockDesign}
        activePlan={null}
        boq={null}
        onDesignOptionsGenerated={vi.fn()}
        onParsed={vi.fn()}
        onTier3Plans={vi.fn()}
        onBuildingTypeChange={vi.fn()}
      />
    )
    expect(screen.getByText('Engineering Studio')).toBeTruthy()
  })
})
