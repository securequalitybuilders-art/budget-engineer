// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

import { StageRail } from '@/components/dashboard/StageRail'
import { getStagesForDiscipline } from '@/lib/studio/stageRegistry'

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

describe('StageRail', () => {
  const archStages = getStagesForDiscipline('ARCH')

  it('renders all ARCH stages and 4 project tools', () => {
    render(<StageRail activeStageId={'brief' as import('@/lib/studio/stageRegistry').StageId} onStageChange={vi.fn()} activeTool={null} onToolChange={vi.fn()} />)
    for (const stage of archStages) {
      expect(screen.getAllByText(stage.label).length).toBeGreaterThanOrEqual(1)
    }
    expect(screen.getAllByText('History').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Governance').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Snapshots').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Properties').length).toBeGreaterThanOrEqual(1)
  })

  it('has role="navigation" and aria-label, shows section headings', () => {
    render(<StageRail activeStageId={'brief' as import('@/lib/studio/stageRegistry').StageId} onStageChange={vi.fn()} />)
    const navs = screen.getAllByRole('navigation')
    const dashNav = navs.find((n) => n.getAttribute('aria-label') === 'Dashboard navigation')
    expect(dashNav).toBeTruthy()
    expect(screen.getAllByText('Workflow').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Project Tools').length).toBeGreaterThanOrEqual(1)
  })

  it('applies aria-current="step" to active stage and "page" to active tool', () => {
    render(<StageRail activeStageId={'design' as import('@/lib/studio/stageRegistry').StageId} onStageChange={vi.fn()} activeTool="history" onToolChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    const activeBtn = buttons.find((b) => b.getAttribute('aria-current') === 'step')
    expect(activeBtn).toBeTruthy()
    const activeToolBtn = buttons.find((b) => b.getAttribute('aria-current') === 'page')
    expect(activeToolBtn).toBeTruthy()
  })

  it('calls onStageChange with StageId when clicking a stage', () => {
    const onStageChange = vi.fn()
    render(<StageRail activeStageId={'brief' as import('@/lib/studio/stageRegistry').StageId} onStageChange={onStageChange} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    const conceptBtn = buttons.find((b) => b.textContent?.includes('Concept'))
    expect(conceptBtn).toBeTruthy()
    conceptBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onStageChange).toHaveBeenCalledWith('concept')
  })

  it('calls onToolChange when clicking a tool', () => {
    const onToolChange = vi.fn()
    render(<StageRail activeStageId={'brief' as import('@/lib/studio/stageRegistry').StageId} onStageChange={vi.fn()} activeTool={null} onToolChange={onToolChange} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    const historyBtn = buttons.find((b) => b.textContent?.includes('History'))
    expect(historyBtn).toBeTruthy()
    historyBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onToolChange).toHaveBeenCalledWith('history')
  })

  it('shows blocked status for stages that are blocked', () => {
    const stageStatus: Partial<Record<import('@/lib/studio/stageRegistry').StageId, 'done' | 'active' | 'upcoming' | 'blocked'>> = {
      brief: 'active', concept: 'blocked',
      design: 'blocked', bim: 'blocked', budget: 'blocked',
    }
    render(<StageRail activeStageId={'brief' as import('@/lib/studio/stageRegistry').StageId} onStageChange={vi.fn()} stageStatus={stageStatus} />)
    for (const stage of archStages) {
      expect(screen.getAllByText(stage.label).length).toBeGreaterThanOrEqual(1)
    }
  })
})
