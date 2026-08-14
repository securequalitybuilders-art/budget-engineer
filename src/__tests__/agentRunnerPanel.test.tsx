// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { BudgetAgentResult, AgentStreamEvent } from '@/engine/agents'
import type { AgentRunRow } from '@/engine/agents/checkpoint'
import { AgentRunnerPanel } from '@/components/agent/AgentRunnerPanel'
import { ProjectLifecycleDashboard } from '@/components/lifecycle/ProjectLifecycleDashboard'

const PID = 'p-agent-panel'

const { runBudgetAgent, resumeAgent, listAgentRuns, buildDefaultRagIndex } = vi.hoisted(() => ({
  runBudgetAgent: vi.fn(),
  resumeAgent: vi.fn(),
  listAgentRuns: vi.fn(),
  buildDefaultRagIndex: vi.fn(() => ({ kind: 'rag-index' })),
}))

vi.mock('@/engine/agents', () => ({ runBudgetAgent, resumeAgent }))
vi.mock('@/engine/agents/graph', () => ({
  GRAPH_NODES: ['researcher', 'calculator', 'validator', 'supervisor', 'hitl', 'done'],
}))
vi.mock('@/engine/agents/checkpoint', () => ({ listAgentRuns }))
vi.mock('@/engine/rag/codeCorpus', () => ({ buildDefaultRagIndex }))

const runRow: AgentRunRow = {
  id: 'agent-run-1',
  projectId: PID,
  query: 'party wall fire resistance',
  jurisdiction: 'zimbabwe',
  status: 'completed',
  node: 'done',
  decision: 'GO',
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:01:00.000Z',
}

function completedResult(query: string): BudgetAgentResult {
  return {
    runId: 'agent-test-1',
    interrupted: false,
    interrupt: undefined,
    trace: {
      id: 'trace-1',
      source: 'agent',
      runId: 'agent-test-1',
      query,
      spans: [{ name: 'retrieval', startedAtMs: 0, durationMs: 12 }],
      totalMs: 12,
      createdAt: '2026-08-09T00:00:00.000Z',
    },
    state: {
      runId: 'agent-test-1',
      query,
      rewrittenQuery: 'party wall fire resistance requirements',
      jurisdiction: 'zimbabwe',
      projectId: PID,
      node: 'done',
      status: 'completed',
      messages: [],
      toolCalls: [
        { id: 't1', tool: 'calculate-bricks', node: 'calculator', args: {}, result: '293 bricks (SAZ 7MPa)', ok: true, createdAt: '2026-08-09T00:00:00.000Z' },
      ],
      retrievedDocs: [
        { chunkId: 'by-laws-1977:sec-2-4-c0', docId: 'by-laws-1977', sectionId: 'sec-2-4', heading: '2 Means of Escape', text: 'A party wall between attached dwellings shall have a fire resistance of at least 60 minutes.', score: 0.91, chapter: '2', docTitle: 'Model Building By-Laws 1977' },
      ],
      calculations: [],
      validation: null,
      gate: null,
      decision: 'GO',
      deviationPct: null,
      interrupts: [],
      history: [],
      spans: [],
      stepCount: 4,
      createdAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
    },
  }
}

beforeEach(() => {
  runBudgetAgent.mockReset()
  resumeAgent.mockReset()
  listAgentRuns.mockReset()
  listAgentRuns.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
})

describe('AgentRunnerPanel', () => {
  it('renders the pipeline legend, query input and run button', () => {
    render(<AgentRunnerPanel projectId={PID} />)
    for (const node of ['researcher', 'calculator', 'validator', 'supervisor', 'hitl', 'done']) {
      expect(screen.getByTestId(`node-chip-${node}`)).toBeTruthy()
    }
    expect(screen.getByTestId('agent-query')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Run agent/ })).toBeTruthy()
    expect(screen.getByText('No agent runs yet — run one above.')).toBeTruthy()
  })

  it('fills the query from a preset chip', () => {
    render(<AgentRunnerPanel projectId={PID} />)
    fireEvent.click(screen.getByText('minimum ceiling height'))
    expect((screen.getByTestId('agent-query') as HTMLTextAreaElement).value).toBe('minimum ceiling height')
  })

  it('runs the agent and renders the completed result', async () => {
    runBudgetAgent.mockResolvedValue(completedResult('party wall fire resistance'))
    render(<AgentRunnerPanel projectId={PID} />)
    fireEvent.change(screen.getByTestId('agent-query'), { target: { value: 'party wall fire resistance' } })
    fireEvent.click(screen.getByRole('button', { name: /Run agent/ }))
    await screen.findByTestId('agent-result')
    expect(runBudgetAgent).toHaveBeenCalledWith(expect.objectContaining({
      query: 'party wall fire resistance',
      jurisdiction: 'zimbabwe',
      projectId: PID,
      context: expect.objectContaining({ ragIndex: { kind: 'rag-index' } }),
    }))
    expect(screen.getByTestId('agent-status').textContent).toBe('completed')
    expect(screen.getByTestId('agent-decision').textContent).toBe('GO')
    expect(screen.getByText(/rewrite: “party wall fire resistance requirements”/)).toBeTruthy()
    expect(screen.getByText(/293 bricks/)).toBeTruthy()
    expect(screen.getByText(/60 minutes/)).toBeTruthy()
    expect(screen.getByText('retrieval')).toBeTruthy()
    expect(screen.getAllByTestId('tool-call').length).toBe(1)
    expect(screen.getByText(/run agent-test-1/)).toBeTruthy()
  })

  it('renders the metrics card with performance + cited grounding', async () => {
    runBudgetAgent.mockResolvedValue(completedResult('party wall fire resistance'))
    render(<AgentRunnerPanel projectId={PID} />)
    fireEvent.change(screen.getByTestId('agent-query'), { target: { value: 'party wall fire resistance' } })
    fireEvent.click(screen.getByRole('button', { name: /Run agent/ }))
    await screen.findByTestId('agent-metrics')
    const card = screen.getByTestId('agent-metrics')
    expect(card.textContent).toContain('Steps')
    expect(card.textContent).toContain('4')
    expect(card.textContent).toContain('12ms spans')
    expect(card.textContent).toContain('Tool calls')
    expect(card.textContent).toContain('1')
    expect(card.textContent).toContain('ok')
    expect(card.textContent).toContain('0 fail')
    expect(card.textContent).toContain('Evidence')
    expect(card.textContent).toContain('1 sections')
    expect(card.textContent).toContain('1 source')
    expect(card.textContent).toContain('Decision')
    expect(card.textContent).toContain('GO')
  })

  it('shows an interrupt with Approve/Reject and resumes on APPROVED', async () => {
    const interrupted = completedResult('proposed 2-storey block')
    interrupted.interrupt = { reason: 'high-value', message: 'Contract value $120,000 exceeds the $50,000 high-value threshold.' }
    interrupted.interrupted = true
    interrupted.state.node = 'hitl'
    interrupted.state.status = 'awaiting-input'
    interrupted.state.decision = 'PENDING'
    runBudgetAgent.mockResolvedValue(interrupted)

    const finalState = { ...interrupted.state, node: 'done', status: 'completed', decision: 'APPROVED' as const }
    resumeAgent.mockResolvedValue({ state: finalState, interrupted: false, interrupt: undefined })

    render(<AgentRunnerPanel projectId={PID} />)
    fireEvent.change(screen.getByTestId('agent-query'), { target: { value: 'proposed 2-storey block' } })
    fireEvent.click(screen.getByRole('button', { name: /Run agent/ }))
    await screen.findByTestId('agent-interrupt')
    expect(screen.getByText(/human-in-the-loop/i)).toBeTruthy()
    expect(screen.getByText(/Contract value \$120,000/)).toBeTruthy()

    fireEvent.click(screen.getByTestId('agent-approve'))
    await waitFor(() => expect(resumeAgent).toHaveBeenCalledWith(interrupted.state, 'APPROVED'))
    await waitFor(() => expect(screen.getByTestId('agent-status').textContent).toBe('completed'))
    expect(screen.getByTestId('agent-decision').textContent).toBe('APPROVED')
    expect(screen.queryByTestId('agent-interrupt')).toBeNull()
  })

  it('surfaces a run error', async () => {
    runBudgetAgent.mockRejectedValue(new Error('boom'))
    render(<AgentRunnerPanel projectId={PID} />)
    fireEvent.change(screen.getByTestId('agent-query'), { target: { value: 'something' } })
    fireEvent.click(screen.getByRole('button', { name: /Run agent/ }))
    expect(await screen.findByText('boom')).toBeTruthy()
  })

  it('lists recent runs from the checkpoint store', async () => {
    listAgentRuns.mockResolvedValue([runRow])
    render(<AgentRunnerPanel projectId={PID} />)
    expect(await screen.findByTestId('agent-run-row')).toBeTruthy()
    const row = screen.getByTestId('agent-run-row')
    expect(row.textContent).toContain('party wall fire resistance')
    expect(row.textContent).toContain('completed')
  })

  it('streams live progress while the agent runs', async () => {
    let captured: ((e: AgentStreamEvent) => void) | undefined
    runBudgetAgent.mockImplementation((input: { onEvent?: (e: AgentStreamEvent) => void }) => {
      captured = input.onEvent
      return Promise.resolve(completedResult('party wall fire resistance'))
    })
    render(<AgentRunnerPanel projectId={PID} />)
    fireEvent.change(screen.getByTestId('agent-query'), { target: { value: 'party wall fire resistance' } })
    fireEvent.click(screen.getByRole('button', { name: /Run agent/ }))

    act(() => {
      captured?.({ type: 'node-start', node: 'researcher', stepCount: 1 })
      captured?.({ type: 'node-start', node: 'calculator', stepCount: 2 })
      captured?.({ type: 'tool', tool: 'calculate_brick_quantity', node: 'calculator', ok: true, result: '293 bricks (SAZ 7MPa)' })
    })
    expect(screen.getByTestId('live-panel')).toBeTruthy()
    expect(screen.getByTestId('live-active-node').textContent).toContain('calculator')
    expect(screen.getAllByTestId('live-event').length).toBe(3)
    expect(screen.getByText(/293 bricks/)).toBeTruthy()

    await screen.findByTestId('agent-result')
    expect(screen.queryByTestId('live-panel')).toBeNull()
  })

  it('passes context fields through to the engine', async () => {
    runBudgetAgent.mockResolvedValue(completedResult('q'))
    render(<AgentRunnerPanel projectId={PID} />)
    fireEvent.change(screen.getByTestId('agent-query'), { target: { value: 'q' } })
    fireEvent.change(screen.getByTestId('ctx-contract'), { target: { value: '50000' } })
    fireEvent.change(screen.getByTestId('ctx-plan'), { target: { value: 'plan-9' } })
    fireEvent.change(screen.getByTestId('ctx-architect'), { target: { value: 'ACZ-0001' } })
    fireEvent.change(screen.getByTestId('ctx-baseline'), { target: { value: '45000' } })
    fireEvent.click(screen.getByRole('button', { name: /Run agent/ }))
    await screen.findByTestId('agent-result')
    expect(runBudgetAgent).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({
        contractValueCents: 5_000_000,
        planId: 'plan-9',
        architectRegistrationNumber: 'ACZ-0001',
        historicalBaseline: { avgCostCents: 4_500_000 },
      }),
    }))
  })
})

describe('ProjectLifecycleDashboard Agent card', () => {
  it('shows a dash card with a link to the agent studio when there are no runs', async () => {
    listAgentRuns.mockResolvedValue([])
    render(
      <MemoryRouter>
        <ProjectLifecycleDashboard projectId={PID} />
      </MemoryRouter>
    )
    expect(screen.getByText('Agent')).toBeTruthy()
    expect(await screen.findByText('Run the agent')).toBeTruthy()
    const link = screen.getByRole('link', { name: /Agent/ })
    expect(link.getAttribute('href')).toBe(`/project/${PID}/studio/agent`)
  })

  it('shows the latest run status on the card', async () => {
    listAgentRuns.mockResolvedValue([runRow])
    render(
      <MemoryRouter>
        <ProjectLifecycleDashboard projectId={PID} />
      </MemoryRouter>
    )
    expect(screen.getByText('Agent')).toBeTruthy()
    expect(await screen.findByText('completed')).toBeTruthy()
    expect(screen.getByText(/party wall fire resistance/)).toBeTruthy()
    cleanup()
  })
})
