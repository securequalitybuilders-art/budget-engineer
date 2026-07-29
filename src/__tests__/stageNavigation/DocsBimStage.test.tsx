// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { DocsBimStage } from '@/components/dashboard/stages/DocsBimStage'

describe('DocsBimStage', () => {
  it('shows empty state when no design/plan', () => {
    render(<DocsBimStage activePlan={null} selectedDesign={null} />)
    expect(screen.getByText('Drawings & BIM')).toBeTruthy()
  })

  it('shows view toggle when plan exists', () => {
    const mockPlan = {
      id: 'plan-1', designOptionId: 'opt-1', width: 20, height: 15,
      wallThickness: 0.23, rooms: [], walls: [], openings: [], scaleLabel: '1:100',
    } as import('@/domain/plan').PlanModel
    const mockDesign = { id: 'opt-1', name: 'Test', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] }
    render(<DocsBimStage activePlan={mockPlan} selectedDesign={mockDesign} />)
    expect(screen.getByText('Drawings')).toBeTruthy()
    expect(screen.getByText('3D Model')).toBeTruthy()
  })
})
