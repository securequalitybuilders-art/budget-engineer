// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, cleanup, fireEvent, screen } from '@testing-library/react'

import { StageRail } from '@/components/dashboard/StageRail'
import { BriefStage } from '@/components/dashboard/stages/BriefStage'
import { ConceptStage } from '@/components/dashboard/stages/ConceptStage'
import { DesignStage } from '@/components/dashboard/stages/DesignStage'
import { EngineeringStage } from '@/components/dashboard/stages/EngineeringStage'
import { DocsBimStage } from '@/components/dashboard/stages/DocsBimStage'
import { CostDeliverStage } from '@/components/dashboard/stages/CostDeliverStage'
import { TransactionPanel } from '@/components/layout/TransactionPanel'
import { GovernancePanel } from '@/components/dashboard/GovernancePanel'
import { SnapshotHistoryPanel } from '@/components/dashboard/SnapshotHistoryPanel'
import { PropertiesPanel } from '@/components/layout/PropertiesPanel'
import { getStagesForDiscipline, type StageId } from '@/lib/studio/stageRegistry'

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    currentBrief: { rawText: 'test', parsed: null },
    transactions: [],
  }),
}))

vi.mock('@/stores/disciplineStore', () => {
  const useDisciplineStore = vi.fn()
  useDisciplineStore.mockImplementation((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      currentDiscipline: 'ARCH' as const,
      visibleDisciplines: ['ARCH', 'STR'],
      setCurrentDiscipline: vi.fn(),
      toggleDisciplineVisibility: vi.fn(),
    }
    return selector ? selector(state) : state
  })
  return { useDisciplineStore }
})

vi.mock('@/services/projectSnapshotService', () => ({
  loadProjectSnapshots: vi.fn(() => Promise.resolve([])),
  saveProjectSnapshot: vi.fn(() => Promise.resolve(null)),
  compareCurrentToSnapshot: vi.fn(() => ({ hasComparison: false, costDelta: 0, costDeltaPercent: 0, areaDelta: 0, floorDelta: 0, wallAreaDelta: 0, doorCountDelta: 0, windowCountDelta: 0, warnings: [] })),
}))

vi.mock('@/services/governanceWorkflowService', () => ({
  loadGovernanceWorkflow: vi.fn(() => Promise.resolve(null)),
  submitForReview: vi.fn(() => Promise.resolve(null)),
  approveProject: vi.fn(() => Promise.resolve(null)),
  requestChanges: vi.fn(() => Promise.resolve(null)),
  resetGovernance: vi.fn(() => Promise.resolve(null)),
  addGovernanceCommentAction: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/adapters/governanceAdapter', () => ({
  buildGovernanceSummary: vi.fn(() => ({
    status: 'draft',
    generatedAt: null,
    fingerprint: '',
    checklistItems: [],
    roleDescriptions: [],
    recentTransactions: [],
    recommendations: [],
    warnings: [],
  })),
}))

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => cleanup())

// stageRegistry tests moved to StageRail section
// ── STAGE RAIL ──
describe('StageRail', () => {
  const archStages = getStagesForDiscipline('ARCH')

  it('renders all ARCH stages and 4 project tools', () => {
    render(<StageRail activeStageId={'brief' as StageId} onStageChange={vi.fn()} activeTool={null} onToolChange={vi.fn()} />)
    for (const stage of archStages) {
      expect(screen.getByText(stage.label)).toBeTruthy()
    }
    expect(screen.getByText('History')).toBeTruthy()
    expect(screen.getByText('Governance')).toBeTruthy()
    expect(screen.getByText('Snapshots')).toBeTruthy()
    expect(screen.getByText('Properties')).toBeTruthy()
  })

  it('has role="navigation" and aria-label', () => {
    render(<StageRail activeStageId={'brief' as StageId} onStageChange={vi.fn()} />)
    const nav = screen.getByRole('navigation')
    expect(nav).toBeTruthy()
    expect(nav.getAttribute('aria-label')).toBe('Dashboard navigation')
  })

  it('shows Workflow and Project Tools section headings', () => {
    render(<StageRail activeStageId={'brief' as StageId} onStageChange={vi.fn()} />)
    expect(screen.getByText('Workflow')).toBeTruthy()
    expect(screen.getByText('Project Tools')).toBeTruthy()
  })

  it('applies aria-current="step" to the active stage button', () => {
    render(<StageRail activeStageId={'design' as StageId} onStageChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    const activeButton = buttons.find((b) => b.getAttribute('aria-current') === 'step')
    expect(activeButton).toBeTruthy()
    expect(activeButton?.textContent).toContain('Design')
  })

  it('applies aria-current="page" to the active tool button', () => {
    render(<StageRail activeStageId={'brief' as StageId} onStageChange={vi.fn()} activeTool="history" onToolChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    const activeToolBtn = buttons.find((b) => b.getAttribute('aria-current') === 'page')
    expect(activeToolBtn).toBeTruthy()
    expect(activeToolBtn?.textContent).toContain('History')
  })

  it('calls onStageChange with StageId when clicking a stage', () => {
    const onStageChange = vi.fn()
    render(<StageRail activeStageId={'brief' as StageId} onStageChange={onStageChange} />)
    const conceptButton = screen.getByText('Concept').closest('button')
    expect(conceptButton).toBeTruthy()
    fireEvent.click(conceptButton!)
    expect(onStageChange).toHaveBeenCalledWith('concept')
  })

  it('calls onToolChange when clicking a tool', () => {
    const onToolChange = vi.fn()
    render(<StageRail activeStageId={'brief' as StageId} onStageChange={vi.fn()} activeTool={null} onToolChange={onToolChange} />)
    const historyButton = screen.getByText('History').closest('button')
    expect(historyButton).toBeTruthy()
    fireEvent.click(historyButton!)
    expect(onToolChange).toHaveBeenCalledWith('history')
  })

  it('shows blocked status for stages that are blocked', () => {
    const stageStatus: Partial<Record<StageId, 'done' | 'active' | 'upcoming' | 'blocked'>> = {
      brief: 'active', concept: 'blocked', 'site-analysis': 'blocked',
      design: 'blocked', engineering: 'blocked', 'docs-bim': 'blocked', 'cost-deliver': 'blocked',
    }
    render(<StageRail activeStageId={'brief' as StageId} onStageChange={vi.fn()} stageStatus={stageStatus} />)
    for (const stage of archStages) {
      expect(screen.getByText(stage.label)).toBeTruthy()
    }
  })
})

// ── PROJECT TOOLS (rendered in main area) ──
describe('Project Tools panels', () => {
  it('TransactionPanel renders with variant="full"', () => {
    const { container } = render(<TransactionPanel variant="full" />)
    expect(container.textContent).toBeTruthy()
  })

  it('GovernancePanel renders with variant="full"', () => {
    const { container } = render(
      <GovernancePanel variant="full" selectedDesign={null} projectId={null} />
    )
    expect(container.textContent).toBeTruthy()
  })

  it('SnapshotHistoryPanel renders with variant="full"', () => {
    const { container } = render(
      <SnapshotHistoryPanel variant="full" projectId="test" selectedDesign={null} currentBoq={null} />
    )
    expect(container.textContent).toBeTruthy()
  })

  it('PropertiesPanel renders with variant="full"', () => {
    const { container } = render(<PropertiesPanel variant="full" />)
    expect(container.textContent).toBeTruthy()
  })
})

// ── BRIEF STAGE ──
describe('BriefStage', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <BriefStage
        onParsed={vi.fn()}
        onDesignOptionsGenerated={vi.fn()}
        onTier3Plans={vi.fn()}
        onBuildingTypeChange={vi.fn()}
        visibleDesignOptions={[]}
        selectedDesignId={null}
        setSelectedDesignId={vi.fn()}
        selectedDesign={null}
      />
    )
    expect(container.textContent).toBeTruthy()
  })

  it('shows design option cards when visibleDesignOptions has items', () => {
    const mockOptions = [
      { id: 'opt-1', name: 'Option A', grossFloorArea: 120, floors: 1, buildingType: 'house', elements: [{ id: 'e1', type: 'wall', category: 'Wall', name: 'Wall', unit: 'm', quantity: 50 }] },
      { id: 'opt-2', name: 'Option B', grossFloorArea: 150, floors: 2, buildingType: 'house', elements: [] },
    ]
    render(
      <BriefStage
        onParsed={vi.fn()}
        onDesignOptionsGenerated={vi.fn()}
        onTier3Plans={vi.fn()}
        onBuildingTypeChange={vi.fn()}
        visibleDesignOptions={mockOptions}
        selectedDesignId={null}
        setSelectedDesignId={vi.fn()}
        selectedDesign={null}
      />
    )
    expect(screen.getByText('Designs generated')).toBeTruthy()
    expect(screen.getByText('Option A')).toBeTruthy()
    expect(screen.getByText('Option B')).toBeTruthy()
  })
})

// ── CONCEPT STAGE ──
describe('ConceptStage', () => {

  it('shows empty state when no design options', () => {
    render(
      <ConceptStage
        visibleDesignOptions={[]}
        selectedDesignId={null}
        setSelectedDesignId={vi.fn()}
        selectedDesign={null}
        handleGenerate={vi.fn()}
        isGenerating={false}
      />
    )
    expect(screen.getByText('Design Options')).toBeTruthy()
    expect(screen.getByText('Generate Design Options')).toBeTruthy()
  })

  it('shows design option cards when options exist', () => {
    const mockOptions = [
      { id: 'opt-1', name: 'Test Design', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] },
    ]
    render(
      <ConceptStage
        visibleDesignOptions={mockOptions}
        selectedDesignId={null}
        setSelectedDesignId={vi.fn()}
        selectedDesign={null}
        handleGenerate={vi.fn()}
        isGenerating={false}
      />
    )
    expect(screen.getByText('Choose your design')).toBeTruthy()
    expect(screen.getAllByText('Test Design').length).toBeGreaterThanOrEqual(1)
  })
})

// ── DESIGN STAGE ──
describe('DesignStage', () => {
  const baseProps = {
    projectId: null as string | null,
    selectedDesign: null as import('@/domain/boq').DesignOption | null,
    activePlan: null as import('@/domain/plan').PlanModel | null,
    handleSavePlan: vi.fn(),
    cadSyncSource: 'generated-design' as string,
    lastSavedAt: null as string | null,
    isManualSaving: false,
    statusMessage: null as string | null,
    statusType: null as 'success' | 'error' | 'info' | null,
    onManualSavePlan: vi.fn(),
    onRestoreSavedPlan: vi.fn(),
    onResetToGeneratedPlan: vi.fn(),
    handleGenerate: vi.fn(),
    isGenerating: false,
    backdrop: null as import('@/lib/import/backdropUtils').BackdropState | null,
    onBackdropUpdate: vi.fn(),
    onBackdropSetScale: vi.fn(),
    onBackdropClear: vi.fn(),
    onImportFile: vi.fn(),
    onDesignCreated: vi.fn(),
  }

  it('shows empty state when no design selected and no backdrop', () => {
    render(<DesignStage {...baseProps} />)
    expect(screen.getByText('2D / 3D Design Canvas')).toBeTruthy()
  })

  it('shows toolbar when design is selected', () => {
    const mockDesign = { id: 'opt-1', name: 'Test Design', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] }
    render(<DesignStage {...baseProps} projectId="proj-1" selectedDesign={mockDesign} />)
    expect(screen.getByLabelText('2D Plan View')).toBeTruthy()
    expect(screen.getByLabelText('3D BIM View')).toBeTruthy()
    expect(screen.getByLabelText('Elevations and Sections')).toBeTruthy()
  })

  it('renders canvas when no design selected but backdrop image is present', () => {
    render(
      <DesignStage
        {...baseProps}
        backdrop={{
          imageDataUrl: 'data:image/png;base64,fake',
          opacity: 0.3,
          visible: true,
          pxPerMetre: null,
          naturalWidth: 800,
          naturalHeight: 600,
        }}
      />
    )
    expect(screen.getByText('2D CAD Canvas')).toBeTruthy()
    expect(screen.getByLabelText('Tracing canvas')).toBeTruthy()
    expect(screen.queryByText('2D / 3D Design Canvas')).toBeNull()
  })
})

// ── ENGINEERING STAGE ──
describe('EngineeringStage', () => {
  it('shows empty state when no design selected', () => {
    render(
      <EngineeringStage
        selectedDesign={null}
        activePlan={null}
        boq={null}
        onDesignOptionsGenerated={vi.fn()}
        onParsed={vi.fn()}
        onTier3Plans={vi.fn()}
        onBuildingTypeChange={vi.fn()}
      />
    )
    expect(screen.getByText('Engineering & Compliance')).toBeTruthy()
  })

  it('renders EngineeringStudioPanel when design is selected', () => {
    const mockDesign = { id: 'opt-1', name: 'Test', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] }
    render(
      <EngineeringStage
        selectedDesign={mockDesign}
        activePlan={null}
        boq={null}
        onDesignOptionsGenerated={vi.fn()}
        onParsed={vi.fn()}
        onTier3Plans={vi.fn()}
        onBuildingTypeChange={vi.fn()}
      />
    )
    expect(screen.getByText('Engineering Studio')).toBeTruthy()
  })
})

// ── DOCS & BIM STAGE ──
describe('DocsBimStage', () => {
  it('shows empty state when no design/plan', () => {
    render(<DocsBimStage activePlan={null} selectedDesign={null} />)
    expect(screen.getByText('Drawings & BIM')).toBeTruthy()
  })

  it('shows view toggle when plan exists', () => {
    const mockPlan = {
      id: 'plan-1', designOptionId: 'opt-1', width: 20, height: 15,
      wallThickness: 0.23, rooms: [], walls: [], openings: [], scaleLabel: '1:100',
    } as import('@/domain/plan').PlanModel
    const mockDesign = { id: 'opt-1', name: 'Test', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] }
    render(<DocsBimStage activePlan={mockPlan} selectedDesign={mockDesign} />)
    expect(screen.getByText('Drawings')).toBeTruthy()
    expect(screen.getByText('3D Model')).toBeTruthy()
  })
})

// ── COST & DELIVER STAGE ──
describe('CostDeliverStage', () => {
  it('shows empty state when no design selected', () => {
    render(
      <CostDeliverStage
        selectedDesign={null}
        boq={null}
        onExport={vi.fn()}
        activePlan={null}
        buildingType="house"
      />
    )
    expect(screen.getByText('Cost & Deliver')).toBeTruthy()
  })
})
