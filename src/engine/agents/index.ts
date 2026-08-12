// KPI2 + KPI3 — deterministic agent orchestrator entry points.
//
// `runBudgetAgent` is the recommended facade: it runs the graph, checkpoints
// every step to Dexie, emits a KPI3 trace, and persists both the run and the
// trace locally. It also streams progress as `AgentStreamEvent`s via the
// optional `onEvent` callback — the local-first analogue of a streaming
// LLM/agent API route (no backend, no websocket).

import type { AgentContext, AgentInitialInput, AgentState, AgentStreamEvent, Interrupt } from './types'
import { createInitialState } from './types'
import { runAgent, resumeAgent } from './graph'
import { saveAgentRun, updateAgentRun, saveCheckpoint } from './checkpoint'
import { threadCheckpointer } from './checkpointer'
import { createTracer, persistTrace, type Trace } from '@/engine/rag/tracing'
import { logAgentNode, logThoughtTrajectory, logToolCall } from '@/lib/observability/telemetry'

export * from './types'
export * from './tools'
export * from './graph'
export * from './checkpoint'
export * from './stateMachine'
export * from './checkpointer'
export * from './stream'

export interface BudgetAgentInput extends Omit<AgentInitialInput, 'runId' | 'query'> {
  runId?: string
  query: string
  context?: Partial<AgentContext>
  persist?: boolean
  onEvent?: (event: AgentStreamEvent) => void | Promise<void>
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
  const onEvent = input.onEvent
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
    projectId: input.projectId,
    onSpan: (span) => {
      tracer.spans.push(span)
      input.context?.onSpan?.(span)
    },
    onToolCall: (call) => {
      void onEvent?.({
        type: 'tool',
        tool: call.tool,
        node: call.node,
        ok: call.ok,
        result: call.result,
      })
      void logToolCall({
        tool: call.tool,
        node: call.node,
        ok: call.ok,
        error: call.ok ? undefined : `tool ${call.tool} failed`,
        latencyMs: 0,
        runId,
        projectId: input.projectId,
      }).catch(() => {})
      input.context?.onToolCall?.(call)
    },
  }

  const state = createInitialState({
    runId,
    query: input.query,
    jurisdiction: input.jurisdiction,
    projectId: input.projectId,
    history: input.history,
    boq: input.boq,
    costBaseline: input.costBaseline,
    wipaaEntry: input.wipaaEntry,
    changeOrder: input.changeOrder,
    escrowBalance: input.escrowBalance,
    verificationPhotos: input.verificationPhotos,
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

  const trajectory: string[] = []
  const run = await runAgent(state, ctx, {
    onNodeStart: (node, stepCount) => {
      trajectory.push(node)
      void logAgentNode({ node, status: 'start', runId, projectId: input.projectId }).catch(() => {})
      void onEvent?.({ type: 'node-start', node, stepCount })
    },
    onStep: (step) => {
      void logAgentNode({ node: step.from, status: 'end', runId, projectId: input.projectId }).catch(() => {})
      void onEvent?.({ type: 'node-end', node: step.from, stepCount: step.stepCount })
      if (input.persist !== false) {
        return threadCheckpointer.save(step.state, step.node)
      }
    },
  })
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

  if (run.interrupt) {
    void onEvent?.({ type: 'interrupt', interrupt: run.interrupt })
  }
  void onEvent?.({ type: 'done', state: final })

  void logThoughtTrajectory({
    query: input.query,
    trajectory,
    decision: final.decision ?? undefined,
    interrupted: run.interrupted,
    durationMs: 0,
    runId,
    projectId: input.projectId,
  }).catch(() => {})

  return { runId, state: final, interrupted: run.interrupted, interrupt: run.interrupt, trace }
}

export interface ResumeBudgetAgentResult {
  runId: string
  state: AgentState
}

/** Resume a HITL-interrupted run and persist the resolved state + run record.
 *  Local-first analogue of resuming a paused LangGraph thread. */
export async function resumeBudgetAgent(
  state: AgentState,
  decision: 'APPROVED' | 'REJECTED',
  note?: string,
  opts: { persist?: boolean } = {},
): Promise<ResumeBudgetAgentResult> {
  const runId = state.runId
  const resumed = await resumeAgent(state, decision, note)
  if (opts.persist !== false) {
    await saveCheckpoint(resumed.state)
    await updateAgentRun(runId, {
      status: resumed.state.status,
      node: resumed.state.node,
      decision: resumed.state.decision,
    })
  }
  return { runId, state: resumed.state }
}
