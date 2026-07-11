// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
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
    expect(screen.getByText('Premium Studio Modules')).toBeTruthy()
  })

  it('shows Interior Design card', async () => {
    const { Home } = await import('@/pages/Home')
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText('Interior Design')).toBeTruthy()
  })

  it('shows Site Analysis card', async () => {
    const { Home } = await import('@/pages/Home')
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText('Site Analysis')).toBeTruthy()
  })

  it('shows Presentation Boards card', async () => {
    const { Home } = await import('@/pages/Home')
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText('Presentation Boards')).toBeTruthy()
  })

  it('shows Academy card', async () => {
    const { Home } = await import('@/pages/Home')
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText('Academy')).toBeTruthy()
  })

  it('Interior Design card links to the interior studio route', async () => {
    const { Home } = await import('@/pages/Home')
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const card = screen.getByText('Interior Design').closest('a')
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
    const card = screen.getByText('Academy').closest('a')
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
    const btn = screen.getByText('Start New Project').closest('a')
    expect(btn?.getAttribute('href')).toBe('/new')
  })
})
