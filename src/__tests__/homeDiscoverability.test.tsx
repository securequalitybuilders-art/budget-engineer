// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
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

let Home: React.ComponentType<Record<string, unknown>>

beforeAll(async () => {
  const mod = await import('@/pages/Home');
  Home = mod.Home;
})

describe('Home page Premium Studio cards', () => {
  it('shows Premium Studio Modules section heading', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(await screen.findByText('Premium Studio Modules')).toBeTruthy()
  })

  it('shows Interior Design card', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(await screen.findByText('Interior Design')).toBeTruthy()
  })

  it('shows Site Analysis card', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(await screen.findByText('Site Analysis')).toBeTruthy()
  })

  it('shows Presentation Boards card', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(await screen.findByText('Presentation Boards')).toBeTruthy()
  })

  it('shows Academy card', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(await screen.findByText('Academy')).toBeTruthy()
  })

  it('Interior Design card links to the interior studio route', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const card = (await screen.findByText('Interior Design')).closest('a')
    expect(card).toBeTruthy()
    expect(card!.getAttribute('href')).toContain('/studio/interior')
  })

  it('Academy card links to /academy', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const card = (await screen.findByText('Academy')).closest('a')
    expect(card).toBeTruthy()
    expect(card!.getAttribute('href')).toBe('/academy')
  })

  it('Start New Project button links to /new', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    const btn = (await screen.findByText('Start New Project')).closest('a')
    expect(btn?.getAttribute('href')).toBe('/new')
  })
})
