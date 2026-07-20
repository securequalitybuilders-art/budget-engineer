// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

afterEach(cleanup)

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    projects: [{ id: 'p1', name: 'Test Project' }],
    isHydrated: true,
    createProject: vi.fn(),
  }),
}))

describe('Home page Premium Studio cards', () => {
  it('shows Premium Studio Modules section heading', async () => {
    const { Home } = await import('@/pages/Home')
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('Premium Studio Modules')).toBeTruthy(), { timeout: 5000 })
  })

  it('shows Interior Design card', async () => {
    const { Home } = await import('@/pages/Home')
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('Interior Design')).toBeTruthy(), { timeout: 5000 })
  })

  it('shows Site Analysis card', async () => {
    const { Home } = await import('@/pages/Home')
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('Site Analysis')).toBeTruthy(), { timeout: 5000 })
  })

  it('shows Presentation Boards card', async () => {
    const { Home } = await import('@/pages/Home')
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('Presentation Boards')).toBeTruthy(), { timeout: 5000 })
  })

  it('shows Academy card', async () => {
    const { Home } = await import('@/pages/Home')
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('Academy')).toBeTruthy(), { timeout: 5000 })
  })

  it('Interior Design card links to the interior studio route', async () => {
    const { Home } = await import('@/pages/Home')
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const card = await waitFor(() => screen.getByText('Interior Design').closest('a'), { timeout: 5000 })
    expect(card).toBeTruthy()
    expect(card!.getAttribute('href')).toContain('/studio/interior')
  })

  it('Academy card links to /academy', async () => {
    const { Home } = await import('@/pages/Home')
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const card = await waitFor(() => screen.getByText('Academy').closest('a'), { timeout: 5000 })
    expect(card).toBeTruthy()
    expect(card!.getAttribute('href')).toBe('/academy')
  })

  it('Start New Project button links to /new', async () => {
    const { Home } = await import('@/pages/Home')
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const btn = await waitFor(() => screen.getByText('Start New Project').closest('a'), { timeout: 5000 })
    expect(btn?.getAttribute('href')).toBe('/new')
  })
})
