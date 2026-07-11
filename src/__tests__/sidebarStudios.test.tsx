// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

afterEach(cleanup)

function renderInRouter(element: React.ReactNode, initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {element}
    </MemoryRouter>
  )
}

const mockProjectStore = () => ({
  sidebarOpen: true,
  projects: [{ id: 'p1', name: 'Test Project' }],
  currentProjectId: 'p1',
})

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: mockProjectStore,
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
  it('shows Interior Design link when project exists', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    renderInRouter(<Sidebar />, ['/project/p1'])
    expect(screen.getByText('Interior Design')).toBeTruthy()
  })

  it('shows Presentation Boards link when project exists', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    renderInRouter(<Sidebar />, ['/project/p1'])
    expect(screen.getByText('Presentation Boards')).toBeTruthy()
  })

  it('shows Site Analysis link when project exists', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    renderInRouter(<Sidebar />, ['/project/p1'])
    expect(screen.getByText('Site Analysis')).toBeTruthy()
  })

  it('shows Academy link even without a project', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    renderInRouter(<Sidebar />)
    expect(screen.getByText('Academy')).toBeTruthy()
  })

  it('studio links point to correct routes', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    renderInRouter(<Sidebar />, ['/project/p1'])
    const interiorLink = screen.getByText('Interior Design').closest('a')
    expect(interiorLink?.getAttribute('href')).toBe('/project/p1/studio/interior')
    const presLink = screen.getByText('Presentation Boards').closest('a')
    expect(presLink?.getAttribute('href')).toBe('/project/p1/studio/presentation')
    const siteLink = screen.getByText('Site Analysis').closest('a')
    expect(siteLink?.getAttribute('href')).toBe('/project/p1/studio/site-analysis')
  })
})

describe('DisciplineSwitcher in Sidebar', () => {
  it('renders DisciplineSwitcher component', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    renderInRouter(<Sidebar />, ['/project/p1'])
    const { DISCIPLINES } = await import('@/lib/studio/discipline')
    for (const d of DISCIPLINES) {
      if (d.id === 'ARCH') {
        expect(screen.getByText(d.shortLabel)).toBeTruthy()
      }
    }
  })
})
