// KPI2 + KPI3 — deterministic agent orchestrator entry points.
//
// `runBudgetAgent` is the recommended facade: it runs the graph, checkpoints
// every step to Dexie, emits a KPI3 trace, and persists both the run and the
// trace locally.

import type { AgentContext, AgentState, Interrupt } from './types'
import { createInitialState } from './types'
import { runAgent } from './graph'
import { saveAgentRun, updateAgentRun, saveCheckpoint } from './checkpoint'
import { createTracer, persistTrace, type Trace } from '@/engine/rag/tracing'

export * from './types'
export * from './tools'
export * from './graph'
export * from './checkpoint'

export interface BudgetAgentInput {
  runId?: string
  query: string
  jurisdiction?: string
  projectId?: string
  history?: import('@/engine/rag/queryRewrite').HistoryTurn[]
  context?: Partial<AgentContext>
  persist?: boolean
}

export interface BudgetAgentResult {
  runId: string
  state: AgentState
  interrupted: boolean
  interrupt?: Interrupt
  trace: Trace
}

export async function runBudgetAgent(input: BudgetAgentInput): Promise<BudgetAgentResult> {
  const runId = input.runId ?? `agent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const tracer = createTracer({
    id: `trace-${runId}`,
    runId,
    projectId: input.projectId,
    source: 'agent',
    query: input.query,
    jurisdiction: input.jurisdiction ?? 'zimbabwe',
  })
  const ctx: AgentContext = {
    ...input.context,
    onSpan: (span) => {
      tracer.spans.push(span)
      input.context?.onSpan?.(span)
    },
  }

  const state = createInitialState({
    runId,
    query: input.query,
    jurisdiction: input.jurisdiction,
    projectId: input.projectId,
    history: input.history,
  })

  if (input.persist !== false) {
    await saveAgentRun({
      id: runId,
      projectId: input.projectId,
      query: input.query,
      jurisdiction: input.jurisdiction ?? 'zimbabwe',
      status: state.status,
      node: state.node,
    })
  }

  const run = await runAgent(state, ctx)
  const final = { ...run.state, spans: tracer.spans }

  if (input.persist !== false) {
    await saveCheckpoint(final)
    await updateAgentRun(runId, { status: final.status, node: final.node, decision: final.decision })
  }

  const trace: Trace = {
    ...tracer.snapshot(),
    runId,
    rewrittenQuery: final.rewrittenQuery,
    decision: final.decision,
    hitlInterrupts: run.interrupted && run.interrupt ? [run.interrupt.message] : final.interrupts,
    citedDocIds: final.retrievedDocs.map((d) => d.chunkId),
  }
  if (input.persist !== false) {
    await persistTrace(trace)
  }

  return { runId, state: final, interrupted: run.interrupted, interrupt: run.interrupt, trace }
}
