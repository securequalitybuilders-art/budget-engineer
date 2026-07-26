// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent, screen } from '@testing-library/react'

import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { JOURNEY_STEPS } from '@/components/dashboard/journeySteps'

afterEach(() => cleanup())

function renderTour(overrides: Partial<{ open: boolean; onClose: () => void; onComplete: () => void }> = {}) {
  const onClose = overrides.onClose ?? vi.fn()
  const onComplete = overrides.onComplete ?? vi.fn()
  const utils = render(
    <OnboardingTour open={overrides.open ?? true} onClose={onClose} onComplete={onComplete} />
  )
  return { ...utils, onClose, onComplete }
}

describe('OnboardingTour', () => {
  it('renders the first slide with its title and description', () => {
    renderTour()
    expect(screen.getByText(JOURNEY_STEPS[0].label)).toBeTruthy()
    expect(screen.getByText(JOURNEY_STEPS[0].description)).toBeTruthy()
  })

  it('advances to the next slide on Next click', () => {
    renderTour()
    fireEvent.click(screen.getByLabelText('Next step'))
    expect(screen.getByText(JOURNEY_STEPS[1].label)).toBeTruthy()
  })

  it('goes back on Back click', () => {
    renderTour()
    fireEvent.click(screen.getByLabelText('Next step'))
    expect(screen.getByText(JOURNEY_STEPS[1].label)).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Previous step'))
    expect(screen.getByText(JOURNEY_STEPS[0].label)).toBeTruthy()
  })

  it('progress dots reflect current position', () => {
    renderTour()
    const bar = screen.getByRole('progressbar', { hidden: true })
    expect(bar.getAttribute('aria-valuenow')).toBe('1')
    fireEvent.click(screen.getByLabelText('Next step'))
    expect(bar.getAttribute('aria-valuenow')).toBe('2')
  })

  it('calls onComplete and closes on "Get started" (last slide)', () => {
    const onComplete = vi.fn()
    const onClose = vi.fn()
    render(
      <OnboardingTour open={true} onClose={onClose} onComplete={onComplete} />
    )
    // Navigate to last slide
    for (let i = 0; i < JOURNEY_STEPS.length - 1; i++) {
      fireEvent.click(screen.getByLabelText('Next step'))
    }
    fireEvent.click(screen.getByLabelText('Get started'))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on "Skip tour" and does not call onComplete', () => {
    const onComplete = vi.fn()
    const onClose = vi.fn()
    render(
      <OnboardingTour open={true} onClose={onClose} onComplete={onComplete} />
    )
    // "Skip tour" button visible when not on last slide — click the text button, not the X
    const skipButtons = screen.getAllByLabelText('Skip tour')
    const textSkip = skipButtons.find((b) => b.textContent === 'Skip tour')
    expect(textSkip).toBeTruthy()
    fireEvent.click(textSkip!)
    expect(onComplete).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Esc keydown and calls onClose', () => {
    const onClose = vi.fn()
    render(
      <OnboardingTour open={true} onClose={onClose} onComplete={vi.fn()} />
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has role="dialog" and aria-modal="true"', () => {
    renderTour()
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('does not render when open is false', () => {
    const { container } = render(
      <OnboardingTour open={false} onClose={vi.fn()} onComplete={vi.fn()} />
    )
    expect(container.textContent).toBe('')
  })

  it('closes on overlay backdrop click', () => {
    const onClose = vi.fn()
    render(
      <OnboardingTour open={true} onClose={onClose} onComplete={vi.fn()} />
    )
    const overlay = document.querySelector('.fixed.inset-0')
    expect(overlay).toBeTruthy()
    fireEvent.click(overlay!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('journeySteps module', () => {
  it('exports 6 steps with expected labels', () => {
    expect(JOURNEY_STEPS.length).toBe(6)
    expect(JOURNEY_STEPS[0].label).toBe('Describe your project')
    expect(JOURNEY_STEPS[1].label).toBe('Review design options')
    expect(JOURNEY_STEPS[2].label).toBe('View 2D floor plan')
    expect(JOURNEY_STEPS[3].label).toBe('View 3D BIM model')
    expect(JOURNEY_STEPS[4].label).toBe('Run engineering checks')
    expect(JOURNEY_STEPS[5].label).toBe('Get BOQ & export')
  })

  it('each step has id, description, and icon', () => {
    for (const s of JOURNEY_STEPS) {
      expect(typeof s.id).toBe('number')
      expect(typeof s.label).toBe('string')
      expect(typeof s.description).toBe('string')
      expect(s.icon).toBeDefined()
    }
  })
})
