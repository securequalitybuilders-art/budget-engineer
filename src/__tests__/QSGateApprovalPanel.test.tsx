// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { QsGateApprovalPanel } from '@/components/QSGateApprovalPanel'
import { createInitialState, type AgentState, type Interrupt } from '@/engine/agents'

const { resumeAgent } = vi.hoisted(() => ({
  resumeAgent: vi.fn(),
}))
vi.mock('@/engine/agents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine/agents')>()
  return { ...actual, resumeAgent }
})

const interrupt: Interrupt = {
  reason: 'structural-deviation',
  message: 'Estimate deviates 12.40% from the historical baseline for this region.',
  payload: {
    estimateCents: 55000000,
    baselineCents: 48900000,
    deviationPct: 12.4,
    thresholdPct: 10,
  },
}

function interruptedState(): AgentState {
  return {
    ...createInitialState({ runId: 'run-gate-1', query: 'brick party wall estimate' }),
    node: 'hitl',
    status: 'awaiting-input',
    deviationPct: 12.4,
    stepCount: 4,
    toolCalls: [
      {
        id: 't1',
        tool: 'calculate_brick_quantity',
        node: 'calculator',
        args: { length_m: 6, height_m: 3, wall_thickness_mm: 230 },
        result: '4,140 bricks (SAZ 7 MPa)',
        ok: true,
        createdAt: '2026-08-11T00:00:00.000Z',
      },
    ],
    retrievedDocs: [
      {
        chunkId: 'by-laws-1977:sec-2-4-c0',
        docId: 'by-laws-1977',
        sectionId: 'sec-2-4',
        heading: '2 Means of Escape',
        text: 'A party wall between attached dwellings shall have a fire resistance of at least 60 minutes.',
        score: 0.91,
        chapter: '2',
        docTitle: 'Model Building By-Laws 1977',
      },
    ],
  }
}

describe('QsGateApprovalPanel', () => {
  afterEach(() => {
    cleanup()
    resumeAgent.mockReset()
  })

  it('renders a placeholder when there is no pending gate', () => {
    render(<QsGateApprovalPanel state={null} />)
    expect(screen.getByText(/No pending QS gate/)).toBeTruthy()
    expect(screen.queryByTestId('qs-gate-panel')).toBeNull()
  })

  it('renders the reason, message and formatted payload pills', () => {
    render(<QsGateApprovalPanel state={interruptedState()} interrupt={interrupt} />)
    expect(screen.getByText(/Structural deviation/)).toBeTruthy()
    expect(screen.getByTestId('qs-gate-message').textContent).toContain('12.40%')
    const pills = screen.getAllByTestId('qs-gate-payload')
    expect(pills).toHaveLength(4)
    expect(pills[0].textContent).toContain('$550,000')
    expect(pills[2].textContent).toContain('12.40%')
    expect(pills[3].textContent).toContain('10.00%')
  })

  it('shows the structural anomaly deviation', () => {
    render(<QsGateApprovalPanel state={interruptedState()} interrupt={interrupt} />)
    const deviating = screen.getAllByText(/deviates/)
    expect(deviating.length).toBeGreaterThanOrEqual(1)
    expect(deviating.some((el) => el.textContent?.includes('12.40%'))).toBe(true)
  })

  it('lists referenced By-Laws clauses from retrieved docs', () => {
    render(<QsGateApprovalPanel state={interruptedState()} interrupt={interrupt} />)
    expect(screen.getByText('Referenced By-Laws clause (1)')).toBeTruthy()
    expect(screen.getByText(/2 Means of Escape/)).toBeTruthy()
    expect(screen.getByText(/sec-2-4/)).toBeTruthy()
  })

  it('shows calculator inputs and the committed ledger + site photo context', () => {
    render(
      <QsGateApprovalPanel
        state={interruptedState()}
        interrupt={interrupt}
        ledgerTotalCents={125000000}
        sitePhotoCount={7}
      />,
    )
    expect(screen.getByText(/calculate_brick_quantity/)).toBeTruthy()
    expect(screen.getByText('$1,250,000')).toBeTruthy()
    expect(screen.getByText(/7 photos captured offline/)).toBeTruthy()
  })

  it('approves: resumes the run and reports the decision + note', async () => {
    const next = { ...interruptedState(), node: 'done' as const, status: 'completed' as const }
    resumeAgent.mockResolvedValue({ state: next })
    const onResolved = vi.fn()
    render(
      <QsGateApprovalPanel state={interruptedState()} interrupt={interrupt} onResolved={onResolved} />,
    )
    fireEvent.change(screen.getByTestId('qs-gate-note'), {
      target: { value: 'Approved within regional tolerance.' },
    })
    fireEvent.click(screen.getByTestId('qs-gate-approve'))
    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1))
    expect(resumeAgent).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'run-gate-1' }),
      'APPROVED',
      'Approved within regional tolerance.',
    )
    expect(onResolved.mock.calls[0][0]).toMatchObject({
      decision: 'APPROVED',
      note: 'Approved within regional tolerance.',
      state: next,
    })
  })

  it('rejects: resumes the run as REJECTED', async () => {
    resumeAgent.mockResolvedValue({ state: { ...interruptedState(), status: 'failed' } })
    const onResolved = vi.fn()
    render(
      <QsGateApprovalPanel state={interruptedState()} interrupt={interrupt} onResolved={onResolved} />,
    )
    fireEvent.click(screen.getByTestId('qs-gate-reject'))
    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1))
    expect(resumeAgent).toHaveBeenCalledWith(expect.anything(), 'REJECTED', undefined)
    expect(onResolved.mock.calls[0][0].decision).toBe('REJECTED')
  })

  it('disables the action buttons when the run is not awaiting input', () => {
    const state = { ...interruptedState(), status: 'completed' as const, node: 'done' as const }
    render(<QsGateApprovalPanel state={state} interrupt={interrupt} />)
    expect(screen.getByText(/not waiting on a gate/i)).toBeTruthy()
    expect((screen.getByTestId('qs-gate-approve') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByTestId('qs-gate-reject') as HTMLButtonElement).disabled).toBe(true)
  })

  it('surfaces a resume error', async () => {
    resumeAgent.mockRejectedValue(new Error('No checkpoint found'))
    render(<QsGateApprovalPanel state={interruptedState()} interrupt={interrupt} />)
    fireEvent.click(screen.getByTestId('qs-gate-approve'))
    await waitFor(() => expect(screen.getByText('No checkpoint found')).toBeTruthy())
  })

  it('dismiss calls onReset when provided', () => {
    const onReset = vi.fn()
    render(
      <QsGateApprovalPanel
        state={interruptedState()}
        interrupt={interrupt}
        onReset={onReset}
      />,
    )
    fireEvent.click(screen.getByTestId('qs-gate-reset'))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
