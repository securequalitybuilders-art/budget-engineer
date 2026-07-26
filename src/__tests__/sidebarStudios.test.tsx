// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { DISCIPLINES } from '@/lib/studio/discipline'

afterEach(cleanup)

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    sidebarOpen: true,
    projects: [{ id: 'p1', name: 'Test Project' }],
    currentProjectId: 'p1',
  }),
}))

vi.mock('@/stores/uiStore', () => ({
  useUIStore: () => ({
    sidebarOpen: true,
  }),
}))

vi.mock('@/stores/disciplineStore', () => {
  const useDisciplineStore = vi.fn()
  useDisciplineStore.mockImplementation((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      currentDiscipline: 'ARCH' as const,
      visibleDisciplines: ['ARCH', 'STR'] as string[],
      setCurrentDiscipline: vi.fn(),
      toggleDisciplineVisibility: vi.fn(),
    }
    return selector ? selector(state) : state
  })
  return { useDisciplineStore }
})

describe('Sidebar studio links', () => {
  it('shows all studio links and Academy when project exists', () => {
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Interior Design')).toBeTruthy()
    expect(screen.getByText('Presentation Boards')).toBeTruthy()
    expect(screen.getByText('Site Analysis')).toBeTruthy()
    expect(screen.getByText('Academy')).toBeTruthy()
  })

  it('studio links point to correct routes', () => {
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <Sidebar />
      </MemoryRouter>
    )
    const interiorLink = screen.getByText('Interior Design').closest('a')
    expect(interiorLink?.getAttribute('href')).toBe('/project/p1/studio/interior')
    const presLink = screen.getByText('Presentation Boards').closest('a')
    expect(presLink?.getAttribute('href')).toBe('/project/p1/studio/presentation')
    const siteLink = screen.getByText('Site Analysis').closest('a')
    expect(siteLink?.getAttribute('href')).toBe('/project/p1/studio/site-analysis')
  })
})

describe('DisciplineSwitcher in Sidebar', () => {
  it('renders DisciplineSwitcher component', () => {
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <Sidebar />
      </MemoryRouter>
    )
    for (const d of DISCIPLINES) {
      if (d.id === 'ARCH') {
        expect(screen.getByText(d.shortLabel)).toBeTruthy()
      }
    }
  })
})
