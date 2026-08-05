// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react'
import { ConstructionSequenceView } from '@/components/bim/ConstructionSequenceView'
import type { PlanModel } from '@/domain/plan'

const plan: PlanModel = {
  id: 'p1',
  designOptionId: 'd1',
  width: 10,
  height: 8,
  wallThickness: 0.22,
  scaleLabel: '1:100',
  rooms: [
    { id: 'r1', name: 'Living', x: 0, y: 0, width: 6, height: 4 },
    { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 4, height: 4 },
    { id: 'r3', name: 'Bed 1', x: 0, y: 4, width: 6, height: 4 },
  ],
  walls: [],
  openings: [],
}

describe('ConstructionSequenceView', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders an empty state without a plan', () => {
    render(<ConstructionSequenceView activePlan={null} />)
    expect(screen.getByText('4D Construction Sequencing')).toBeTruthy()
    expect(screen.getByText(/Generate a design option first/)).toBeTruthy()
  })

  it('renders the timeline header, play button and 5 phases', () => {
    render(<ConstructionSequenceView activePlan={plan} />)
    expect(screen.getByText(/Day 0 of 49/)).toBeTruthy()
    expect(screen.getByText('Play')).toBeTruthy()
    const rows = document.querySelectorAll('[data-phase]')
    expect(rows).toHaveLength(5)
  })

  it('shows all phases as Pending at day 0 and renders only the iso base', () => {
    render(<ConstructionSequenceView activePlan={plan} />)
    const pending = document.querySelectorAll('[data-stage="pending"]')
    expect(pending).toHaveLength(5)
    const layers = document.querySelectorAll('[data-layer^="iso-layer"]')
    expect(layers).toHaveLength(0)
    expect(document.querySelectorAll('[data-layer="iso-base"]')).toHaveLength(3)
  })

  it('scrubbing into the substrates phase marks rough-in complete', () => {
    render(<ConstructionSequenceView activePlan={plan} />)
    const slider = screen.getByRole('slider', { name: 'Construction timeline' })
    fireEvent.change(slider, { target: { value: '18' } })
    const roughIn = screen.getByText('Rough-in & Infrastructure').closest('[data-phase]') as HTMLElement
    expect(roughIn.getAttribute('data-stage')).toBe('completed')
    const substrates = screen.getByText('Substrates & Enclosures').closest('[data-phase]') as HTMLElement
    expect(substrates.getAttribute('data-stage')).toBe('in-progress')
    expect(screen.getByText(/Day 18 of 49/)).toBeTruthy()
  })

  it('renders an isometric layer group for an in-progress phase', () => {
    render(<ConstructionSequenceView activePlan={plan} />)
    const slider = screen.getByRole('slider', { name: 'Construction timeline' })
    fireEvent.change(slider, { target: { value: '18' } })
    const layer = document.querySelector('[data-layer="iso-layer-rough-in"]') as HTMLElement
    expect(layer).not.toBeNull()
    expect(layer.getAttribute('data-stage')).toBe('completed')
    expect(layer.querySelectorAll('polygon')).toHaveLength(3)
    const active = document.querySelector('[data-layer="iso-layer-substrates"]') as HTMLElement
    expect(active.getAttribute('data-stage')).toBe('in-progress')
  })

  it('shows materials arriving for the active phase', () => {
    render(<ConstructionSequenceView activePlan={plan} />)
    const slider = screen.getByRole('slider', { name: 'Construction timeline' })
    fireEvent.change(slider, { target: { value: '7' } })
    expect(screen.getByText('Materials on site')).toBeTruthy()
    const materials = document.querySelectorAll('[data-material]')
    expect(materials.length).toBeGreaterThan(0)
  })

  it('play advances the timeline and resets back to day 0', () => {
    vi.useFakeTimers()
    render(<ConstructionSequenceView activePlan={plan} />)
    fireEvent.click(screen.getByText('Play'))
    expect(screen.getByText('Pause')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(240)
    })
    expect(screen.queryByText(/Day 0 of 49/)).toBeNull()
    fireEvent.click(screen.getByText('Pause'))
    fireEvent.click(screen.getByText('Reset'))
    expect(screen.getByText(/Day 0 of 49/)).toBeTruthy()
  })

  it('renders all five layers when scrubbed to the final day', () => {
    render(<ConstructionSequenceView activePlan={plan} />)
    const slider = screen.getByRole('slider', { name: 'Construction timeline' })
    fireEvent.change(slider, { target: { value: '49' } })
    const layers = document.querySelectorAll('[data-layer^="iso-layer"]')
    expect(layers).toHaveLength(5)
    expect(screen.getByText(/Day 49 of 49/)).toBeTruthy()
  })
})
