// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { PwaInstallPrompt } from '@/components/layout/PwaInstallPrompt'
import { MobileStageRail } from '@/components/layout/MobileStageRail'
import { useDisciplineStore } from '@/stores/disciplineStore'
import { useUIStore } from '@/stores/uiStore'
import { getStagesForDiscipline } from '@/lib/studio/stageRegistry'
import type { BeforeInstallPromptEvent } from '@/types/pwa'

function makePromptEvent(outcome: 'accepted' | 'dismissed'): BeforeInstallPromptEvent {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn(async () => undefined),
    userChoice: Promise.resolve({ outcome }),
  }) as unknown as BeforeInstallPromptEvent
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  useUIStore.setState({ activeStageId: undefined, selectedDesignId: null })
  useDisciplineStore.setState({ currentDiscipline: 'ARCH' })
})

describe('PwaInstallPrompt', () => {
  it('renders nothing until beforeinstallprompt fires', () => {
    const { container } = render(<PwaInstallPrompt />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the install banner when beforeinstallprompt fires', () => {
    render(<PwaInstallPrompt />)
    act(() => {
      window.dispatchEvent(makePromptEvent('accepted'))
    })
    expect(screen.getByRole('region', { name: /install app/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^install$/i })).toBeTruthy()
  })

  it('calls prompt() and hides after the user accepts', async () => {
    render(<PwaInstallPrompt />)
    const event = makePromptEvent('accepted')
    act(() => {
      window.dispatchEvent(event)
    })
    const installButton = screen.getByRole('button', { name: /^install$/i })
    await act(async () => {
      fireEvent.click(installButton)
      await Promise.resolve()
    })
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('region', { name: /install app/i })).toBeNull()
  })

  it('hides the banner when dismissed and persists the dismissal', () => {
    const { rerender } = render(<PwaInstallPrompt />)
    act(() => {
      window.dispatchEvent(makePromptEvent('accepted'))
    })
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss install prompt' }))
    expect(screen.queryByRole('region', { name: /install app/i })).toBeNull()
    expect(localStorage.getItem('be.pwa-install-dismissed')).toBe('1')

    rerender(<PwaInstallPrompt />)
    act(() => {
      window.dispatchEvent(makePromptEvent('accepted'))
    })
    expect(screen.queryByRole('region', { name: /install app/i })).toBeNull()
  })

  it('hides the banner once the app is installed', () => {
    render(<PwaInstallPrompt />)
    act(() => {
      window.dispatchEvent(makePromptEvent('accepted'))
    })
    expect(screen.getByRole('region', { name: /install app/i })).toBeTruthy()

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(screen.queryByRole('region', { name: /install app/i })).toBeNull()
  })
})

describe('MobileStageRail', () => {
  it('renders touch-friendly stage chips for the current discipline', () => {
    render(<MobileStageRail />)
    const expected = getStagesForDiscipline('ARCH').map((s) => s.shortLabel)
    for (const label of expected) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
    const nav = screen.getByRole('navigation', { name: 'Stage navigation (mobile)' })
    expect(nav.className).toContain('lg:hidden')
  })

  it('marks the active stage and navigates on tap', () => {
    useUIStore.setState({ activeStageId: 'concept' })
    render(<MobileStageRail />)
    const active = screen.getByRole('button', { name: 'Concept' })
    expect(active.getAttribute('aria-current')).toBe('step')
    fireEvent.click(active)
    expect(useUIStore.getState().activeStageId).toBe('concept')
  })

  it('locks stages that require a selected design option', () => {
    render(<MobileStageRail />)
    const designButton = screen.getByRole('button', { name: 'Design' })
    expect(designButton.hasAttribute('disabled')).toBe(true)
    expect(designButton.getAttribute('title')).toBe('Select a design option first')
  })
})
