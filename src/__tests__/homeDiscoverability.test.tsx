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

describe('Home page Trust Staircase sections', () => {
  it('shows the cinematic pipeline banner with seven-stage callout', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(await screen.findByText('Seven stages, one project')).toBeTruthy()
    expect(screen.getByText(/every step in your browser/i)).toBeTruthy()
  })

  it('shows all five horror-story cards with their fixes', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(await screen.findByText('The stories behind the numbers')).toBeTruthy()
    expect(screen.getByText(/Bricks ordered by/)).toBeTruthy()
    expect(screen.getByText(/foundation contract with no BOQ/)).toBeTruthy()
    expect(screen.getByText(/Paid before the milestone/)).toBeTruthy()
    expect(screen.getByText(/currency moved 26%/i)).toBeTruthy()
    expect(screen.getByText(/unregistered plan set/i)).toBeTruthy()
    expect(screen.getAllByText(/Budget Engineer fix:/).length).toBe(5)
  })

  it('shows the three risk-removal pillars', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(await screen.findByText('How we remove the risk')).toBeTruthy()
    expect(screen.getByText('Design with a budget')).toBeTruthy()
    expect(screen.getByText('Build with verified payments')).toBeTruthy()
    expect(screen.getByText('Close with lessons learned')).toBeTruthy()
  })

  it('shows social proof quotes and the stat strip', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(await screen.findByText('Built alongside real builds')).toBeTruthy()
    expect(screen.getByText('First-time builder')).toBeTruthy()
    expect(screen.getAllByText('Contractor').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('NGO programme officer')).toBeTruthy()
    expect(screen.getByText('cost items in the rate catalogue')).toBeTruthy()
    expect(screen.getByText('paid AI APIs required')).toBeTruthy()
  })

  it('shows three plans with the Guardian Border Beam Fortress highlighted', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(await screen.findByText('Simple, honest plans')).toBeTruthy()
    expect(screen.getByText('Free')).toBeTruthy()
    expect(screen.getByText('Red Pen')).toBeTruthy()
    expect(screen.getByText('Guardian')).toBeTruthy()
    expect(screen.getByText('Most trusted')).toBeTruthy()
    const guardianCard = screen.getByText('Most trusted').closest('.border-beam')
    expect(guardianCard).toBeTruthy()
  })

  it('renders the FAQ as an openable accordion', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(await screen.findByText('Straight answers')).toBeTruthy()
    expect(screen.getByText('Is my data private?')).toBeTruthy()
    const details = screen.getByText('Is my data private?').closest('details')
    expect(details).toBeTruthy()
    expect(details!.hasAttribute('open')).toBe(false)
    expect(screen.getAllByText('Is my data private?').length).toBe(1)
  })
})
