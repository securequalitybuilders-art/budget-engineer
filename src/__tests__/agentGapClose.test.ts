// Track B spec gap-close regression suite — deterministic agent orchestrator.
//
// Covers the six spec deltas this session closed against the existing
// local-first `src/engine/agents/` stack:
//   1. AgentState spec annotations (boq / costBaseline / wipaaEntry / changeOrder
//      / escrowBalance / verificationPhotos / next / errors / needsHuman /
//      approvalGate) + `AgentInitialInput`
//   2. calculator node activation via deterministic ZIQS SMM measurement
//      extraction (`measurements.ts`) feeding the strict write-tool schemas
//   3. exponential-backoff retry (`backoffDelayMs` + `retryDelayMs`)
//   4. thread-scoped resume via `runAgent({ startAt })` (skips completed nodes)
//   5. `LangChainAdapter`-style data-stream wire format (`stream.ts`)
//   6. `resumeBudgetAgent` facade persisting the resolved HITL state

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { runAgent, runBudgetAgent, resumeBudgetAgent } from '@/engine/agents'
import { createInitialState, type AgentStreamEvent } from '@/engine/agents/types'
import { backoffDelayMs, createStateMachine } from '@/engine/agents/stateMachine'
import { inferMeasurement } from '@/engine/agents/measurements'
import { agentEventsToDataStream, consumeDataStream, toDataStreamLines } from '@/engine/agents/stream'
import { isValidToolArgs } from '@/engine/tools/definitions'
import { buildDefaultRagIndex } from '@/engine/rag/codeCorpus'
import type { RagIndex } from '@/engine/rag/ragIndex'
import { db } from '@/db/db'

let ragIndex: RagIndex

beforeAll(() => {
  ragIndex = buildDefaultRagIndex()
})

beforeEach(async () => {
  await db.agentRuns.clear()
  await db.agentCheckpoints.clear()
  await db.traces.clear()
})

describe('1. AgentState spec annotations', () => {
  it('defaults needsHuman false + approvalGate none', () => {
    const s = createInitialState({ runId: 'r', query: 'wall 6m x 2.4m' })
    expect(s.needsHuman).toBe(false)
    expect(s.approvalGate).toBe('none')
    expect(s.next).toBeUndefined()
    expect(s.errors).toBeUndefined()
    expect(s.boq).toBeUndefined()
  })

  it('carries the Track B domain refs into the initial state', () => {
    const s = createInitialState({
      runId: 'r',
      query: 'price it',
      boq: { lineCount: 42, grandTotalCents: 1_000_000, sections: [{ id: 'A', totalCents: 500_000 }] },
      costBaseline: { avgCostCents: 800_000, region: 'Harare' },
      wipaaEntry: { monthKey: '2026-08', costPctComplete: 0.4, overUnderBilledCents: -5000, billingStatus: 'under-billed' },
      changeOrder: { number: 'CO-003', declaredImpactCents: 120_000, status: 'pending' },
      escrowBalance: { heldCents: 300_000, releasedCents: 100_000, milestoneCount: 4 },
      verificationPhotos: 7,
    })
    expect(s.boq?.lineCount).toBe(42)
    expect(s.costBaseline?.region).toBe('Harare')
    expect(s.wipaaEntry?.billingStatus).toBe('under-billed')
    expect(s.changeOrder?.number).toBe('CO-003')
    expect(s.escrowBalance?.milestoneCount).toBe(4)
    expect(s.verificationPhotos).toBe(7)
  })
})

describe('2. ZIQS SMM measurement extraction -> strict tool schemas', () => {
  it('extracts a brick take-off and produces schema-valid args', () => {
    const ref = inferMeasurement('wall 6m x 2.4m, single skin')
    expect(ref?.tool).toBe('calculate_brick_quantity')
    expect(isValidToolArgs(ref!.tool, ref!.args)).toBe(true)
    expect(ref?.args).toMatchObject({ length_m: 6, height_m: 2.4, thickness_units: 1, bond_type: 'stretcher', wastage_pct: 5 })
  })

  it('extracts a concrete volume (default 0.15m slab) with valid args', () => {
    const ref = inferMeasurement('concrete slab 4m x 3m')
    expect(ref?.tool).toBe('calculate_concrete_volume')
    expect(isValidToolArgs(ref!.tool, ref!.args)).toBe(true)
    expect(ref?.args).toMatchObject({ length_m: 4, width_m: 3, depth_m: 0.15 })
  })

  it('extracts TCO from a unit price with valid args', () => {
    const ref = inferMeasurement('tco of a generator costing $8000')
    expect(ref?.tool).toBe('calculate_tco')
    expect(isValidToolArgs(ref!.tool, ref!.args)).toBe(true)
    expect(ref?.args).toMatchObject({ price_cents: 800_000, quantity: 1, freight_cents: 0 })
  })

  it('extracts a P4P certificate from the contract value', () => {
    const ref = inferMeasurement('interim payment certificate p4p for $12000')
    expect(ref?.tool).toBe('p4p_calculator')
    expect(isValidToolArgs(ref!.tool, ref!.args)).toBe(true)
    expect(ref?.args).toMatchObject({ direct_costs: 1_200_000, overhead_pct: 0 })
  })

  it('extracts a WIPAA run from certified vs cash-requested, honoring the month', () => {
    const ref = inferMeasurement('wipaa for 2024-03: work certified $50000, cash requested $45000')
    expect(ref?.tool).toBe('wipaa_calculator')
    expect(isValidToolArgs(ref!.tool, ref!.args)).toBe(true)
    expect(ref?.args).toMatchObject({ project_id: 'project', month: '2024-03', work_certified: 5_000_000, cash_requested: 4_500_000 })
  })

  it('returns null (no fabricated take-off) when the query has no measurement', () => {
    expect(inferMeasurement('hello world')).toBeNull()
    expect(inferMeasurement('')).toBeNull()
  })
})

describe('3. Exponential-backoff retry policy', () => {
  it('doubles per attempt from the base delay', () => {
    expect(backoffDelayMs(0, 5)).toBe(5)
    expect(backoffDelayMs(1, 5)).toBe(10)
    expect(backoffDelayMs(2, 5)).toBe(20)
    expect(backoffDelayMs(3, 5)).toBe(40)
  })

  it('caps at the max delay and is a no-op for a zero base', () => {
    expect(backoffDelayMs(10, 5)).toBe(1000)
    expect(backoffDelayMs(10, 5, 250)).toBe(250)
    expect(backoffDelayMs(1, 0)).toBe(0)
    expect(backoffDelayMs(1, -5)).toBe(0)
  })
})

describe('4. Calculator node activation via runBudgetAgent', () => {
  it('runs a real brick take-off and records the calculation value', async () => {
    const { state } = await runBudgetAgent({
      query: 'wall 6m x 2.4m — how many bricks?',
      context: { ragIndex },
    })
    expect(state.status).toBe('completed')
    expect(state.decision).toBe('GO')
    expect(state.calculations).toHaveLength(1)
    expect(state.calculations[0].tool).toBe('calculate_brick_quantity')
    expect(state.calculations[0].value).toBeGreaterThan(0)
    const brickCall = state.toolCalls.find((c) => c.tool === 'calculate_brick_quantity')
    expect(brickCall?.ok).toBe(true)
  })

  it('runs a concrete volume take-off from a slab query', async () => {
    const { state } = await runBudgetAgent({
      query: 'concrete slab 4m x 3m',
      context: { ragIndex },
    })
    expect(state.calculations[0].tool).toBe('calculate_concrete_volume')
    expect(state.calculations[0].value).toBeCloseTo(1.8, 5)
  })

  it('skips the take-off for a non-measurable query (no fabrication)', async () => {
    const { state } = await runBudgetAgent({
      query: 'minimum ceiling height of a habitable room',
      context: { ragIndex },
    })
    expect(state.calculations).toHaveLength(0)
    expect(state.toolCalls.some((c) => c.ok === false && c.tool.startsWith('calculate_'))).toBe(false)
    expect(state.status).toBe('completed')
  })
})

describe('5. High-value HITL gate annotations + resumeBudgetAgent', () => {
  it('pauses with needsHuman/approvalGate/next stamped, then resumes to done', async () => {
    const run = await runBudgetAgent({
      query: 'estimate the total build',
      context: { ragIndex, contractValueCents: 10_000_000 },
    })
    expect(run.interrupted).toBe(true)
    expect(run.state.needsHuman).toBe(true)
    expect(run.state.approvalGate).toBe('high-value')
    expect(run.state.next).toBe('humanInLoopNode')
    expect(run.state.status).toBe('awaiting-input')

    const resumed = await resumeBudgetAgent(run.state, 'APPROVED', 'signing off the budget')
    expect(resumed.state.status).toBe('completed')
    expect(resumed.state.decision).toBe('APPROVED')
    expect(resumed.state.needsHuman).toBe(false)
    expect(resumed.state.approvalGate).toBe('none')
    expect(resumed.state.next).toBe('doneNode')
  })

  it('flags a failed SI 56 gate as an si56 approval gate', async () => {
    const run = await runBudgetAgent({
      query: 'validate the structural plan for the clubhouse',
      context: { ragIndex, planId: 'plan-X', architectRegistrationNumber: 'ACZ-00000-NOT-REG' },
    })
    expect(run.interrupted).toBe(true)
    expect(run.state.needsHuman).toBe(true)
    expect(run.state.approvalGate).toBe('si56')
    expect(run.state.gate?.allowed).toBe(false)
  })
})

describe('6. Data-stream wire format (LangChainAdapter analogue)', () => {
  const events: AgentStreamEvent[] = [
    { type: 'node-start', node: 'researcher', stepCount: 1 },
    { type: 'node-end', node: 'researcher', stepCount: 1 },
    { type: 'tool', tool: 'search_codes', node: 'researcher', ok: true, result: '1 hit' },
    { type: 'done', state: createInitialState({ runId: 'r', query: 'q' }) },
  ]

  it('encodes events as DPS lines ending in a finish frame', () => {
    const lines = toDataStreamLines(events)
    expect(lines[0]).toContain('[node-start] researcher')
    expect(lines[2]).toContain('search_codes')
    expect(lines[lines.length - 1].startsWith('e:')).toBe(true)
  })

  it('round-trips through consumeDataStream', () => {
    const text = agentEventsToDataStream(events)
    const parts = consumeDataStream(text)
    expect(parts[0].type).toBe('text')
    expect(parts[1].type).toBe('text')
    expect(parts[2]).toMatchObject({ type: 'tool', tool: 'search_codes', ok: true })
    expect(parts[parts.length - 1]).toMatchObject({ type: 'text', text: '[finish] stop' })
  })
})

describe('7. Thread-scoped resume via runAgent startAt', () => {
  it('skips already-completed nodes and resumes from the requested stage', async () => {
    const state = createInitialState({ runId: 'resume-t', query: 'wall 6m x 2.4m' })
    const visited: string[] = []
    const { state: final, interrupted } = await runAgent(state, { ragIndex }, {
      startAt: 'supervisor',
      onNodeStart: (node) => {
        visited.push(node)
      },
    })
    expect(interrupted).toBe(false)
    // The machine stops when routed to its `end` node — the done node never
    // actually executes, so only the supervisor runs.
    expect(visited).toEqual(['supervisor'])
    expect(visited).not.toContain('researcher')
    expect(visited).not.toContain('calculator')
    expect(visited).not.toContain('validator')
    expect(final.status).toBe('completed')
    expect(final.decision).toBe('GO')
    expect(final.next).toBe('doneNode')
  })

  it('rejects an unknown start node', async () => {
    const state = createInitialState({ runId: 'bad-start', query: 'q' })
    await expect(runAgent(state, {}, { startAt: 'doesNotExist' })).rejects.toThrow(/Unknown start node/)
  })
})

describe('8. Retry-with-error policy accumulates errors for auditability', () => {
  it('feeds the error back into the state on retry (same policy as graph.ts)', async () => {
    type S = { errors?: string[]; attempts: number }
    const machine = createStateMachine<S, unknown>({
      nodes: {
        flaky: {
          name: 'flaky',
          run: async (s) => {
            if ((s.errors?.length ?? 0) === 0) throw new Error('boom')
            return { state: s, next: 'done' }
          },
        },
        done: {
          name: 'done',
          run: async (s) => ({ state: s }),
        },
      },
      start: 'flaky',
      end: 'done',
      edges: { flaky: 'done' },
      maxRetries: 1,
      retryDelayMs: 5,
      retry: async (s, _c, node, error) => ({ ...s, attempts: (s.attempts ?? 0) + 1, errors: [...(s.errors ?? []), `${node}: ${error}`] }),
    })
    const run = await machine.run({ errors: [], attempts: 0 } as S, undefined)
    expect(run.state.errors).toEqual(['flaky: boom'])
    expect(run.state.attempts).toBe(1)
    expect(run.interrupted).toBe(false)
  })

  it('leaves errors undefined on a clean deterministic run (audit shape only)', async () => {
    const state = createInitialState({ runId: 'err-run', query: 'wall 6m x 2.4m' })
    const { state: final } = await runAgent(state, { ragIndex })
    expect(final.errors).toBeUndefined()
  })
})
