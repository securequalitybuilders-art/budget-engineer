// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

afterEach(cleanup)

// ── Helpers ──
function renderInRouter(element: React.ReactNode, initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {element}
    </MemoryRouter>
  )
}

function renderWithRoute(Component: React.ComponentType, path: string, initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={path} element={<Component />} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Mock stores used by Sidebar and DesignStage ──
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

// ── Tests ──

describe('Sidebar studio links', () => {
  it('renders Interior Studio link when project exists', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    renderInRouter(<Sidebar />, ['/project/p1'])
    expect(screen.getByText('Interior Design')).toBeTruthy()
  })

  it('renders Presentation Boards link when project exists', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    renderInRouter(<Sidebar />, ['/project/p1'])
    expect(screen.getByText('Presentation Boards')).toBeTruthy()
  })

  it('renders Site Analysis link when project exists', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    renderInRouter(<Sidebar />, ['/project/p1'])
    expect(screen.getByText('Site Analysis')).toBeTruthy()
  })

  it('renders Academy link', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    renderInRouter(<Sidebar />)
    expect(screen.getByText('Academy')).toBeTruthy()
  })
})

describe('Site Analysis Studio page', () => {
  it('renders the component without crashing', async () => {
    const { SiteAnalysisStudio } = await import('@/pages/studio/SiteAnalysisStudio')
    renderWithRoute(SiteAnalysisStudio, '/project/:id/studio/site-analysis', '/project/p1/studio/site-analysis')
    const headings = screen.getAllByText('Site Analysis')
    expect(headings.length).toBeGreaterThan(0)
  })

  it('shows missing project fallback when no project id', async () => {
    const { SiteAnalysisStudio } = await import('@/pages/studio/SiteAnalysisStudio')
    renderWithRoute(SiteAnalysisStudio, '/studio/no-id', '/studio/no-id')
    expect(screen.getByText('No project selected')).toBeTruthy()
  })
})

describe('DXF export wiring', () => {
  it('imports generateDxf and downloadDxf without error', async () => {
    const { generateDxf } = await import('@/lib/export/dxfWriter')
    const { downloadDxf } = await import('@/lib/export/dxfWriter')
    expect(typeof generateDxf).toBe('function')
    expect(typeof downloadDxf).toBe('function')
  })
})
