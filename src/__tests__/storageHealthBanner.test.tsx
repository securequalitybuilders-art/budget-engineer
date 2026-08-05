// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { StorageHealthBanner } from '@/components/layout/StorageHealthBanner'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('StorageHealthBanner', () => {
  it('renders nothing when storage usage is low', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: vi.fn(async () => ({ quota: 1e9, usage: 1e8 })) },
    })
    const { container } = render(<StorageHealthBanner />)
    await waitFor(() => expect(container.firstChild).toBeNull())
  })

  it('renders a warning banner near the limit', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: vi.fn(async () => ({ quota: 1e9, usage: 8.5e8 })) },
    })
    render(<StorageHealthBanner />)
    const banner = await screen.findByRole('region', { name: 'Storage warning' })
    expect(banner.textContent).toContain('Local storage getting low')
    expect(banner.textContent).toContain('85%')
  })

  it('renders a critical banner at the critical threshold', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: vi.fn(async () => ({ quota: 1e9, usage: 9.6e8 })) },
    })
    render(<StorageHealthBanner />)
    const banner = await screen.findByRole('region', { name: 'Storage warning' })
    expect(banner.textContent).toContain('Device storage nearly full')
    expect(banner.textContent).toContain('96%')
  })

  it('invokes the backup callback', async () => {
    const onBackup = vi.fn()
    vi.stubGlobal('navigator', {
      storage: { estimate: vi.fn(async () => ({ quota: 1e9, usage: 9.6e8 })) },
    })
    render(<StorageHealthBanner onBackup={onBackup} />)
    await screen.findByRole('button', { name: /back up/i })
    fireEvent.click(screen.getByRole('button', { name: /back up/i }))
    expect(onBackup).toHaveBeenCalledTimes(1)
  })

  it('dismisses and persists the dismissal', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: vi.fn(async () => ({ quota: 1e9, usage: 9.6e8 })) },
    })
    const { container, rerender } = render(<StorageHealthBanner />)
    await screen.findByRole('region', { name: 'Storage warning' })
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss storage warning' }))
    expect(container.firstChild).toBeNull()
    expect(localStorage.getItem('be.storage-warning-dismissed')).toBe('1')

    rerender(<StorageHealthBanner />)
    await waitFor(() => expect(container.firstChild).toBeNull())
  })
})
