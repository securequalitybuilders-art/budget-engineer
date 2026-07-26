// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

afterEach(cleanup)

function renderWithRoute(Component: React.ComponentType, path: string, initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={path} element={<Component />} />
      </Routes>
    </MemoryRouter>
  )
}

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    sidebarOpen: true,
    projects: [{ id: 'p1', name: 'Test Project' }],
    currentProjectId: 'p1',
  }),
}))

vi.mock('@/stores/uiStore', () => ({
  useUIStore: () => ({ sidebarOpen: true }),
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