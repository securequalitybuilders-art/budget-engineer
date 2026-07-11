// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

afterEach(cleanup)

// ── Helpers ──
function renderWithRoute(Component: React.ComponentType, path: string, initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={path} element={<Component />} />
      </Routes>
    </MemoryRouter>
  )
}

// Mock stores used by InteriorStudio
vi.mock('@/stores/interiorStore', () => {
  const useInteriorStore = vi.fn()
  useInteriorStore.mockImplementation((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      project: null,
      materials: [],
      isLoading: false,
      selectedRoomId: null,
      selectedFixtureId: null,
      loadProject: vi.fn(),
    }
    return selector ? selector(state) : state
  })
  return { useInteriorStore }
})

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    currentProjectId: 'p1',
  }),
}))

// ── InteriorStudio ──

describe('InteriorStudio', () => {
  it('shows "No project selected" when URL param is missing', async () => {
    const { InteriorStudio } = await import('@/pages/studio/InteriorStudio')
    renderWithRoute(InteriorStudio, '/studio/:id?', '/studio/')
    expect(screen.getByText('No project selected.')).toBeTruthy()
  })

  it('shows "No project selected" when at root path without param', async () => {
    const { InteriorStudio } = await import('@/pages/studio/InteriorStudio')
    renderWithRoute(InteriorStudio, '/studio/:id?', '/studio/')
    expect(screen.getByText('No project selected.')).toBeTruthy()
  })
})

// ── PresentationStudio ──

describe('PresentationStudio', () => {
  it('shows "No project selected" when no project ID', async () => {
    const mod = await import('@/pages/studio/PresentationStudio')
    const Component = mod.default
    expect(Component).toBeDefined()
    renderWithRoute(Component!, '/studio/:id?', '/studio/')
    expect(screen.getByText('No project selected.')).toBeTruthy()
  })

  it('renders the presentation page title', async () => {
    const mod = await import('@/pages/studio/PresentationStudio')
    const Component = mod.default
    expect(Component).toBeDefined()
    renderWithRoute(Component!, '/project/:id/studio/presentation', '/project/p1/studio/presentation')
    expect(screen.getByText('Presentation Boards')).toBeTruthy()
  })
})

// ── SiteAnalysisStudio ──

describe('SiteAnalysisStudio', () => {
  it('shows "No project selected" when no project ID', async () => {
    const { SiteAnalysisStudio } = await import('@/pages/studio/SiteAnalysisStudio')
    renderWithRoute(SiteAnalysisStudio, '/studio/no-id', '/studio/no-id')
    expect(screen.getByText('No project selected')).toBeTruthy()
  })

  it('renders the component without crashing with project ID', async () => {
    const { SiteAnalysisStudio } = await import('@/pages/studio/SiteAnalysisStudio')
    renderWithRoute(SiteAnalysisStudio, '/project/:id/studio/site-analysis', '/project/p1/studio/site-analysis')
    const headings = screen.getAllByText('Site Analysis')
    expect(headings.length).toBeGreaterThan(0)
  })
})
