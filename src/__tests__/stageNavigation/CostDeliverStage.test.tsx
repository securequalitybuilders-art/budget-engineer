// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { CostDeliverStage } from '@/components/dashboard/stages/CostDeliverStage'

describe('CostDeliverStage', () => {
  it('shows empty state when no design selected', () => {
    render(
      <CostDeliverStage
        selectedDesign={null}
        boq={null}
        onExport={vi.fn()}
        activePlan={null}
        buildingType="house"
      />
    )
    expect(screen.getByText('Cost & Deliver')).toBeTruthy()
  })
})
