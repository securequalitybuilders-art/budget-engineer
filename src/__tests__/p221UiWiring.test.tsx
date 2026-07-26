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

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    currentProjectId: 'p1',
    projects: [{ id: 'p1', name: 'Test Project' }],
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

// Mock all new stores to return empty data for test isolation
vi.mock('@/stores/assuranceStore', () => ({
  useAssuranceStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      intakes: [],
      feasibilityAssessments: [],
      riskGates: [],
      riskRegister: [],
      solvencyChecks: [],
      isLoading: false,
      loadForProject: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/stores/deliveryStore', () => ({
  useDeliveryStore: () => ({
    currentDelivery: null,
    isLoading: false,
    loadForProject: vi.fn(),
  }),
}))

vi.mock('@/stores/procurementStore', () => ({
  useProcurementStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      requests: [],
      quotes: [],
      purchaseOrders: [],
      deliveryRecords: [],
      isLoading: false,
      loadForProject: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/stores/handoverStore', () => ({
  useHandoverStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      completionStages: [],
      snagLists: [],
      handoverPackages: [],
      assetRegister: [],
      warrantyRecords: [],
      oAndMRecords: [],
      isLoading: false,
      loadForProject: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/stores/projectControlsStore', () => ({
  useProjectControlsStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      baselines: [],
      snapshots: [],
      isLoading: false,
      loadForProject: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

// ── AssuranceStudio ──

describe('AssuranceStudio', () => {
  it('shows "No project selected" when no project ID', async () => {
    const { AssuranceStudio } = await import('@/pages/studio/AssuranceStudio')
    renderWithRoute(AssuranceStudio, '/studio/:id?', '/studio/')
    expect(screen.getByText('No project selected')).toBeTruthy()
  })

  it('renders the Assurance Studio title with project ID', async () => {
    const { AssuranceStudio } = await import('@/pages/studio/AssuranceStudio')
    renderWithRoute(AssuranceStudio, '/project/:id/studio/assurance', '/project/p1/studio/assurance')
    const titles = screen.getAllByText('Assurance Studio')
    expect(titles.length).toBeGreaterThan(0)
  })
})

// ── DeliveryStudio ──

describe('DeliveryStudio', () => {
  it('shows "No project selected" when no project ID', async () => {
    const { DeliveryStudio } = await import('@/pages/studio/DeliveryStudio')
    renderWithRoute(DeliveryStudio, '/studio/:id?', '/studio/')
    expect(screen.getByText('No project selected')).toBeTruthy()
  })

  it('renders the Delivery Studio title with project ID', async () => {
    const { DeliveryStudio } = await import('@/pages/studio/DeliveryStudio')
    renderWithRoute(DeliveryStudio, '/project/:id/studio/delivery', '/project/p1/studio/delivery')
    const titles = screen.getAllByText('Delivery Studio')
    expect(titles.length).toBeGreaterThan(0)
  })
})

// ── HandoverStudio ──

describe('HandoverStudio', () => {
  it('shows "No project selected" when no project ID', async () => {
    const { HandoverStudio } = await import('@/pages/studio/HandoverStudio')
    renderWithRoute(HandoverStudio, '/studio/:id?', '/studio/')
    expect(screen.getByText('No project selected')).toBeTruthy()
  })

  it('renders the Handover Studio title with project ID', async () => {
    const { HandoverStudio } = await import('@/pages/studio/HandoverStudio')
    renderWithRoute(HandoverStudio, '/project/:id/studio/handover', '/project/p1/studio/handover')
    const titles = screen.getAllByText('Handover Studio')
    expect(titles.length).toBeGreaterThan(0)
  })
})

// ── ProcurementStudio ──

describe('ProcurementStudio', () => {
  it('shows "No project selected" when no project ID', async () => {
    const { ProcurementStudio } = await import('@/pages/studio/ProcurementStudio')
    renderWithRoute(ProcurementStudio, '/studio/:id?', '/studio/')
    expect(screen.getByText('No project selected')).toBeTruthy()
  })

  it('renders the Procurement title with project ID', async () => {
    const { ProcurementStudio } = await import('@/pages/studio/ProcurementStudio')
    renderWithRoute(ProcurementStudio, '/project/:id/studio/procurement', '/project/p1/studio/procurement')
    expect(screen.getAllByText('Procurement').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('heading', { name: 'Procurement' })).toBeTruthy()
  })
})

// ── ProjectControlsStudio ──

describe('ProjectControlsStudio', () => {
  it('shows "No project selected" when no project ID', async () => {
    const { ProjectControlsStudio } = await import('@/pages/studio/ProjectControlsStudio')
    renderWithRoute(ProjectControlsStudio, '/studio/:id?', '/studio/')
    expect(screen.getByText('No project selected')).toBeTruthy()
  })

  it('renders the Project Controls title with project ID', async () => {
    const { ProjectControlsStudio } = await import('@/pages/studio/ProjectControlsStudio')
    renderWithRoute(ProjectControlsStudio, '/project/:id/studio/project-controls', '/project/p1/studio/project-controls')
    const titles = screen.getAllByText('Project Controls')
    expect(titles.length).toBeGreaterThan(0)
  })
})

// ── Sidebar links ──

describe('Sidebar P22.1 studio links', () => {
  it('shows Assurance link when project exists', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Assurance')).toBeTruthy()
  })

  it('shows Delivery link when project exists', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Delivery')).toBeTruthy()
  })

  it('shows Handover link when project exists', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Handover')).toBeTruthy()
  })

  it('shows Procurement link when project exists', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Procurement')).toBeTruthy()
  })

  it('shows Project Controls link when project exists', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <Sidebar />
      </MemoryRouter>
    )
    const links = screen.getAllByText('Project Controls')
    expect(links.length).toBeGreaterThanOrEqual(1)
  })

  it('studio links point to correct P22.1 routes', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <Sidebar />
      </MemoryRouter>
    )
    const assuranceLink = screen.getByText('Assurance').closest('a')
    expect(assuranceLink?.getAttribute('href')).toBe('/project/p1/studio/assurance')
    const deliveryLink = screen.getByText('Delivery').closest('a')
    expect(deliveryLink?.getAttribute('href')).toBe('/project/p1/studio/delivery')
    const handoverLink = screen.getByText('Handover').closest('a')
    expect(handoverLink?.getAttribute('href')).toBe('/project/p1/studio/handover')
    const procurementLink = screen.getByText('Procurement').closest('a')
    expect(procurementLink?.getAttribute('href')).toBe('/project/p1/studio/procurement')
    const pcLinks = screen.getAllByText('Project Controls')
    const pcAnchor = Array.from(pcLinks).find((el) => el.closest('a'))
    expect(pcAnchor?.closest('a')?.getAttribute('href')).toBe('/project/p1/studio/project-controls')
  })
})

// ── AssurancePanel tabs ──

describe('AssurancePanel', () => {
  it('renders all assurance tab buttons', async () => {
    const { AssurancePanel } = await import('@/components/assurance/AssurancePanel')
    renderWithRouter(<AssurancePanel projectId="p1" />)
    expect(screen.getByText('Feasibility')).toBeTruthy()
    expect(screen.getByText('Risk Gates')).toBeTruthy()
    expect(screen.getByText('Risk Register')).toBeTruthy()
    expect(screen.getByText('Solvency')).toBeTruthy()
  })
})

// ── ProcurementPanel tabs ──

describe('ProcurementPanel', () => {
  it('renders all procurement tab buttons', async () => {
    const { ProcurementPanel } = await import('@/components/procurement/ProcurementPanel')
    renderWithRouter(<ProcurementPanel projectId="p1" />)
    expect(screen.getByText('Requests')).toBeTruthy()
    expect(screen.getByText('Purchase Orders')).toBeTruthy()
    expect(screen.getByText('Deliveries')).toBeTruthy()
  })
})

// ── HandoverPanel tabs ──

describe('HandoverPanel', () => {
  it('renders all handover tab buttons', async () => {
    const { HandoverPanel } = await import('@/components/handover/HandoverPanel')
    renderWithRouter(<HandoverPanel projectId="p1" />)
    expect(screen.getByText('Completion')).toBeTruthy()
    expect(screen.getAllByText('Snags').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Packages').length).toBeGreaterThan(0)
    expect(screen.getByText('Assets')).toBeTruthy()
    expect(screen.getByText('Warranties')).toBeTruthy()
  })
})

// ── ProjectControlsDashboard ──

describe('ProjectControlsDashboard', () => {
  it('renders overview and alerts tab buttons', async () => {
    const { ProjectControlsDashboard } = await import('@/components/projectControls/ProjectControlsDashboard')
    renderWithRouter(<ProjectControlsDashboard projectId="p1" />)
    expect(screen.getByText('Overview')).toBeTruthy()
    expect(screen.getByText(/^Alerts/)).toBeTruthy()
  })
})
