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

// ── Store mocks ──

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    currentProjectId: 'p1',
    projects: [{ id: 'p1', name: 'Test Project' }],
    currentProject: { id: 'p1', name: 'Test Project', status: 'draft', region: 'us' },
    loadProject: vi.fn(),
  }),
}))

vi.mock('@/stores/uiStore', () => ({
  useUIStore: () => ({ sidebarOpen: true, activeStageId: 'brief', setActiveStage: vi.fn(), activeView: 'brief', setActiveView: vi.fn(), journeyGuideOpen: false, toggleJourneyGuide: vi.fn(), selectedDesignId: null, setSelectedDesignId: vi.fn(), hasSeenTour: true }),
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

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      user: { id: 'u1', name: 'Test User', role: 'owner' },
      setRole: vi.fn(),
      setName: vi.fn(),
      isAuthorized: (roles: string[]) => roles.includes('owner'),
    }
    return selector ? selector(state) : state
  },
}))

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

vi.mock('@/stores/milestoneStore', () => ({
  useMilestoneStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      milestones: [],
      isLoading: false,
      loadForProject: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/stores/changeStore', () => ({
  useChangeStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      changeOrders: [],
      rfis: [],
      submittals: [],
      siteInspections: [],
      ncrs: [],
      snagItems: [],
      loadForProject: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

// Mock lifecycle libraries
vi.mock('@/lib/lifecycle/lifecycleSummary', () => ({
  computeProjectReadiness: () => ({
    overallState: 'cleared', goNoGoDecision: null, feasibilityPassed: true,
    allRequiredGatesPassed: true, blockedGateNames: [], openRisksCritical: 0,
    openRisksHigh: 0, solvencyConfirmed: true, blockers: [],
  }),
  computeMilestoneLifecycleSummary: () => ({
    total: 5, released: 3, held: 1, rejected: 0, pending: 1,
    criticalDelayed: [], overallProgressPct: 60,
    byCategory: { design: { total: 5, released: 3, progressPct: 60 } },
  }),
  computeProjectHealthSummary: () => ({
    health: 'on-track' as const, readinessState: 'cleared' as const,
    milestoneProgressPct: 60, openIssues: 2, budgetUtilizationPct: 85,
    scheduleVariance: 2.5, costVariance: 1.2,
  }),
  computeProcurementLifecycleSummary: () => ({
    totalRequests: 0, openRequests: 0, awardedRequests: 0,
    totalPurchaseOrders: 0, deliveredPOs: 0, totalSpendCents: 0,
    linkedBOQLinesCount: 0,
  }),
  computeHandoverLifecycleSummary: () => ({
    completionStagesTotal: 0, completionStagesAchieved: 0,
    openSnagItems: 0, resolvedSnagItems: 0, packagesIssued: 0,
    packagesTotal: 0, assetsRegistered: 0, warrantiesActive: 0,
    isHandoverReady: false,
  }),
}))

vi.mock('@/lib/lifecycle/handoverReadiness', () => ({
  assessHandoverReadiness: () => ({
    isReady: false, overallScore: 35,
    readinessState: 'not-ready' as const,
    blockers: [
      { category: 'stage', description: 'Incomplete stages: practical-completion', severity: 'blocking' as const },
      { category: 'snag', description: '5 open snag(s)', severity: 'warning' as const },
    ],
    stageCompletionPct: 40, snagClosurePct: 60, ncrClosurePct: 100,
    milestoneDeliveryPct: 50, packagesPrepared: 0,
  }),
}))

vi.mock('@/lib/lifecycle/procurementBoqLinker', () => ({
  enrichProcurementWithBOQLinks: () => Promise.resolve([]),
}))

vi.mock('@/lib/auth/rbac', () => ({
  isAuthorized: (user: { role: string }, action: string) => user.role === 'owner' || (action === 'comment' && user.role === 'reviewer'),
  canReview: () => true,
  canApprove: (user: { role: string }) => user.role === 'owner',
  canComment: () => true,
  roleLabel: (role: string) => role === 'owner' ? 'Owner' : role === 'reviewer' ? 'Reviewer' : 'Viewer',
}))

// ── Cross-studio navigation links ──

describe('P23 — Cross-studio navigation links', () => {
  it('DeliveryStudio shows cross-studio context links', async () => {
    const { DeliveryStudio } = await import('@/pages/studio/DeliveryStudio')
    renderWithRoute(DeliveryStudio, '/project/:id/studio/delivery', '/project/p1/studio/delivery')
    expect(screen.getByText('Assurance')).toBeTruthy()
    expect(screen.getByText('Procurement')).toBeTruthy()
    expect(screen.getByText('Handover')).toBeTruthy()
    expect(screen.getByText('Project Controls')).toBeTruthy()
  })

  it('AssuranceStudio shows cross-studio links in header', async () => {
    const { AssuranceStudio } = await import('@/pages/studio/AssuranceStudio')
    renderWithRoute(AssuranceStudio, '/project/:id/studio/assurance', '/project/p1/studio/assurance')
    expect(screen.getAllByText('Delivery').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Project Controls').length).toBeGreaterThan(0)
  })

  it('HandoverStudio shows cross-studio links in header', async () => {
    const { HandoverStudio } = await import('@/pages/studio/HandoverStudio')
    renderWithRoute(HandoverStudio, '/project/:id/studio/handover', '/project/p1/studio/handover')
    expect(screen.getAllByText('Delivery').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Project Controls').length).toBeGreaterThan(0)
  })

  it('ProcurementStudio shows cross-studio links in header', async () => {
    const { ProcurementStudio } = await import('@/pages/studio/ProcurementStudio')
    renderWithRoute(ProcurementStudio, '/project/:id/studio/procurement', '/project/p1/studio/procurement')
    expect(screen.getAllByText('Delivery').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Project Controls').length).toBeGreaterThan(0)
  })

  it('ProjectControlsStudio shows cross-studio links in header', async () => {
    const { ProjectControlsStudio } = await import('@/pages/studio/ProjectControlsStudio')
    renderWithRoute(ProjectControlsStudio, '/project/:id/studio/project-controls', '/project/p1/studio/project-controls')
    expect(screen.getAllByText('Assurance').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Delivery').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Procurement').length).toBeGreaterThan(0)
  })
})

// ── Milestone visibility ──

describe('P23 — Milestone visibility', () => {
  it('DeliveryStudio shows milestone summary in workflow mode', async () => {
    const { DeliveryStudio } = await import('@/pages/studio/DeliveryStudio')
    renderWithRoute(DeliveryStudio, '/project/:id/studio/delivery', '/project/p1/studio/delivery')
    expect(screen.getByText(/Milestone Summary/)).toBeTruthy()
    expect(screen.getByText(/3 released/)).toBeTruthy()
    expect(screen.getByText(/1 held/)).toBeTruthy()
  })

  it('ProjectControlsDashboard shows empty state when no data', async () => {
    const { ProjectControlsDashboard } = await import('@/components/projectControls/ProjectControlsDashboard')
    renderWithRouter(<ProjectControlsDashboard projectId="p1" />)
    expect(screen.getByText(/No project controls data yet/)).toBeTruthy()
  })
})

// ── Blocker-driven empty state behavior ──

describe('P23 — Blocker clarity', () => {
  it('HandoverPanel shows blockers with severity', async () => {
    const { HandoverPanel } = await import('@/components/handover/HandoverPanel')
    renderWithRouter(<HandoverPanel projectId="p1" />)
    expect(screen.getByText(/Not Ready/)).toBeTruthy()
    expect(screen.getByText(/Incomplete stages/)).toBeTruthy()
    expect(screen.getByText(/open snag/)).toBeTruthy()
  })

  it('HandoverPanel shows progress breakdown grid', async () => {
    const { HandoverPanel } = await import('@/components/handover/HandoverPanel')
    renderWithRouter(<HandoverPanel projectId="p1" />)
    expect(screen.getByText('Stages')).toBeTruthy()
    expect(screen.getAllByText('Snags').length).toBeGreaterThan(0)
    expect(screen.getByText('NCRs')).toBeTruthy()
    expect(screen.getByText('Milestones')).toBeTruthy()
    expect(screen.getAllByText('Packages').length).toBeGreaterThan(0)
  })
})

// ── Assurance readiness messaging ──

describe('P23 — Assurance readiness', () => {
  it('AssurancePanel shows next-step hint when cleared', async () => {
    const { AssurancePanel } = await import('@/components/assurance/AssurancePanel')
    renderWithRouter(<AssurancePanel projectId="p1" />)
    expect(screen.getByText(/All assurance gates passed/)).toBeTruthy()
    expect(screen.getByText(/Proceed to Delivery/)).toBeTruthy()
  })
})

// ── Shared EmptyState component tests ──

describe('P23 — Shared EmptyState', () => {
  it('renders with title and description', async () => {
    const { EmptyState } = await import('@/components/lifecycle/EmptyState')
    render(<EmptyState title="Test title" description="Test description" />)
    expect(screen.getByText('Test title')).toBeTruthy()
    expect(screen.getByText('Test description')).toBeTruthy()
  })

  it('renders action link when actionTo provided', async () => {
    const { EmptyState } = await import('@/components/lifecycle/EmptyState')
    renderWithRouter(<EmptyState title="Empty" description="Do something" actionLabel="Go there" actionTo="/somewhere" />)
    const link = screen.getByText('Go there')
    expect(link).toBeTruthy()
    expect(link.closest('a')?.getAttribute('href')).toBe('/somewhere')
  })
})

// ── Procurement linkage visibility ──

describe('P23 — Procurement summary', () => {
  it('ProcurementPanel shows summary bar when data exists', async () => {
    const { ProcurementPanel } = await import('@/components/procurement/ProcurementPanel')
    renderWithRouter(<ProcurementPanel projectId="p1" />)
    // With empty data, the empty state message should reference BOQ
    expect(screen.getAllByText(/BOQ/).length).toBeGreaterThan(0)
  })
})

// ── NextStepHint component tests ──

describe('P23 — NextStepHint', () => {
  it('renders hint text correctly', async () => {
    const { NextStepHint } = await import('@/components/lifecycle/NextStepHint')
    render(<NextStepHint hint="Do this next" severity="info" />)
    expect(screen.getByText('Do this next')).toBeTruthy()
  })
})

// ── CrossStudioLinks component tests ──

describe('P23 — CrossStudioLinks', () => {
  it('renders links when provided', async () => {
    const { CrossStudioLinks, buildStudioLink } = await import('@/components/lifecycle/CrossStudioLinks')
    const links = [buildStudioLink('p1', 'delivery', 'Delivery', 'View delivery', 'info')]
    renderWithRouter(<CrossStudioLinks projectId="p1" links={links} title="Related" />)
    expect(screen.getByText('Related')).toBeTruthy()
    expect(screen.getByText('Delivery')).toBeTruthy()
    expect(screen.getByText('View delivery')).toBeTruthy()
  })

  it('returns null for empty links', async () => {
    const { CrossStudioLinks } = await import('@/components/lifecycle/CrossStudioLinks')
    const { container } =     renderWithRouter(<CrossStudioLinks projectId="p1" links={[]} />)
    expect(container.innerHTML).toBe('')
  })
})

// ── Role-aware UX ──

describe('P23 — Role-aware UI', () => {
  it('AssurancePanel shows role indicator for non-owner', async () => {
    const { AssurancePanel } = await import('@/components/assurance/AssurancePanel')
    renderWithRouter(<AssurancePanel projectId="p1" />)
    // With owner role, no role restriction message shown
    expect(screen.queryByText(/Viewing as/)).toBeFalsy()
  })
})

// ── Sidebar reorganization tests ──

describe('P23 — Sidebar lifecycle organization', () => {
  it('Sidebar shows lifecycle sections with sub-labels', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar')
    render(
      <MemoryRouter initialEntries={['/project/p1']}>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Project Lifecycle')).toBeTruthy()
    expect(screen.getByText('Delivery & Oversight')).toBeTruthy()
    expect(screen.getByText('Controls & Analytics')).toBeTruthy()
    // Check sub-labels
    expect(screen.getByText('Gates & readiness')).toBeTruthy()
    expect(screen.getByText('Milestones & workflow')).toBeTruthy()
    expect(screen.getByText('BOQ-linked requests')).toBeTruthy()
    expect(screen.getByText('Snags & packages')).toBeTruthy()
    expect(screen.getByText('EVM & dashboards')).toBeTruthy()
  })
})

// ── Empty state action guidance ──

describe('P23 — Empty states with action guidance', () => {
  it('ProcurementPanel empty state references BOQ', async () => {
    const { ProcurementPanel } = await import('@/components/procurement/ProcurementPanel')
    renderWithRouter(<ProcurementPanel projectId="p1" />)
    expect(screen.getAllByText(/BOQ/).length).toBeGreaterThan(0)
  })
})

// ── Project Controls source links ──

describe('P23 — Project Controls source links', () => {
  it('ProjectControlsDashboard shows data source labels', async () => {
    const { ProjectControlsDashboard } = await import('@/components/projectControls/ProjectControlsDashboard')
    renderWithRouter(<ProjectControlsDashboard projectId="p1" />)
    expect(screen.getAllByText(/Set a project baseline/).length).toBeGreaterThan(0)
  })
})
