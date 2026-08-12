// Graph runner for the agent orchestrator.
//
// Node pipeline (LangGraph-style, deterministic, audit-aligned names):
//   queryRewriteNode -> researcherNode -> calculatorNode -> validatorNode
//   -> supervisorNode -> humanInLoopNode | doneNode
//
// - queryRewriteNode rewrites the user query (deterministic local rewrite)
// - researcherNode gathers code evidence from the RAG index (read-only tools)
// - calculatorNode runs quantity/cost maths via scoped calculator tools
// - validatorNode checks the SI 56/2025 architect gate; a failed gate routes
//   to the human-in-the-loop node via a conditional edge
// - supervisorNode computes a GO / NO-GO vs a historical baseline
// - humanInLoopNode is a hard interrupt for high-value / structural-deviation
//   / validation-required decisions (resumed via `resumeAgent`)
//
// Execution is delegated to the generic `createStateMachine` — the local-first
// analogue of LangGraph's StateGraph — with fixed + conditional edges,
// interruptBefore auto-pausing, and a retry-with-error policy.

import type { AgentContext, AgentNode, AgentMessage, AgentState, ApprovalGate, Interrupt } from './types'
import type { SearchResult } from '@/engine/rag/types'
import { findTool, validateToolArgs } from './tools'
import { deterministicRewrite } from '@/engine/rag/queryRewrite'
import { createStateMachine } from './stateMachine'
import { inferMeasurement } from './measurements'

export const DEFAULT_VALUE_INTERRUPT_THRESHOLD_CENTS = 5_000_000 // $50,000 (spec: > $5,000 in construction units x 100)
export const DEFAULT_DEVIATION_THRESHOLD_PCT = 10

// Audit-aligned node names (ANTIGRAVITY_MASTER_PROMPT §canonical graph).
export const NODE_QUERY_REWRITE = 'queryRewriteNode'
export const NODE_RESEARCHER = 'researcherNode'
export const NODE_CALCULATOR = 'calculatorNode'
export const NODE_VALIDATOR = 'validatorNode'
export const NODE_SUPERVISOR = 'supervisorNode'
export const NODE_HUMAN_IN_LOOP = 'humanInLoopNode'
export const NODE_DONE = 'doneNode'

export const NODE_AUDIT_NAMES: string[] = [
  NODE_QUERY_REWRITE,
  NODE_RESEARCHER,
  NODE_CALCULATOR,
  NODE_VALIDATOR,
  NODE_SUPERVISOR,
  NODE_HUMAN_IN_LOOP,
  NODE_DONE,
]

// Audit node name -> short graph node (used for state.node + GRAPH_NODES).
const AUDIT_TO_NODE: Record<string, AgentNode> = {
  [NODE_QUERY_REWRITE]: 'researcher',
  [NODE_RESEARCHER]: 'researcher',
  [NODE_CALCULATOR]: 'calculator',
  [NODE_VALIDATOR]: 'validator',
  [NODE_SUPERVISOR]: 'supervisor',
  [NODE_HUMAN_IN_LOOP]: 'hitl',
  [NODE_DONE]: 'done',
}

// Short graph node -> audit node name.
const NODE_AUDIT_MAP: Record<AgentNode, string> = {
  researcher: NODE_RESEARCHER,
  calculator: NODE_CALCULATOR,
  validator: NODE_VALIDATOR,
  supervisor: NODE_SUPERVISOR,
  hitl: NODE_HUMAN_IN_LOOP,
  done: NODE_DONE,
}

/** Audit node name -> short graph node (the names the UI / state use). */
export function auditToShort(audit: string): string {
  return AUDIT_TO_NODE[audit] ?? 'done'
}

export interface NodeResult {
  state: AgentState
  next?: string
  interrupt?: Interrupt
}

/** Single-step result of the orchestrator (kept internal — the generic machine
 *  exports its own `StepResult` through the barrel). */
interface StepResult {
  state: AgentState
  interrupted: boolean
  interrupt?: Interrupt
  done: boolean
}

function span(ctx: AgentContext, name: string, metadata?: Record<string, unknown>): () => void {
  const startedAtMs = Date.now()
  return () => {
    ctx.onSpan?.({ name, startedAtMs, durationMs: Date.now() - startedAtMs, metadata })
  }
}

function recordToolCall(
  state: AgentState,
  toolId: string,
  args: Record<string, unknown>,
  result: string,
  ok: boolean,
): AgentState {
  return {
    ...state,
    toolCalls: [
      ...state.toolCalls,
      {
        id: `${state.runId}-${state.stepCount}-${toolId}`,
        tool: toolId,
        node: state.node,
        args,
        result,
        ok,
        createdAt: new Date().toISOString(),
      },
    ],
    messages: [
      ...state.messages,
      { role: 'assistant', content: `[${state.node}] ran ${toolId}: ${result.slice(0, 300)}`, node: state.node, toolCallId: toolId, createdAt: new Date().toISOString() },
    ],
  }
}

/** Finalise a tool call: stream it via `ctx.onToolCall` and return the pair. */
function finalizeCall(ctx: AgentContext, state: AgentState, result: string): { state: AgentState; result: string } {
  const call = state.toolCalls[state.toolCalls.length - 1]
  void ctx.onToolCall?.(call)
  return { state, result }
}

export async function callTool(state: AgentState, ctx: AgentContext, toolId: string, args: Record<string, unknown>): Promise<{ state: AgentState; result: string }> {
  const tool = findTool(toolId)
  if (!tool) {
    return finalizeCall(ctx, recordToolCall(state, toolId, args, `Unknown tool "${toolId}"`, false), `Unknown tool "${toolId}"`)
  }
  if (!tool.nodes.includes(state.node)) {
    const result = `Tool "${toolId}" is not scoped to node "${state.node}"`
    return finalizeCall(ctx, recordToolCall(state, toolId, args, result, false), result)
  }
  const errors = validateToolArgs(tool, args)
  if (errors.length > 0) {
    const result = `Invalid args: ${errors.join('; ')}`
    return finalizeCall(ctx, recordToolCall(state, toolId, args, result, false), result)
  }
  try {
    const close = span(ctx, `tool:${toolId}`, { node: state.node })
    const result = await tool.run(args, ctx)
    close()
    return finalizeCall(ctx, recordToolCall(state, toolId, args, result, true), result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return finalizeCall(ctx, recordToolCall(state, toolId, args, msg, false), msg)
  }
}

function parseKeyValue(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9]*)=(.+)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

// Headline figures a calculator tool returns as `key=value` lines (in the
// executor's generic format). Each tool's single most useful number.
const VALUE_KEYS = ['quantity', 'volume_m3', 'total_cost_cents', 'total', 'over_under_billed']

function measurementValue(result: string): number | undefined {
  for (const key of VALUE_KEYS) {
    const m = result.match(new RegExp(`^${key}=(-?\\d+(?:\\.\\d+)?)$`, 'm'))
    if (m) return Number(m[1])
  }
  return undefined
}

/** Approval gate that paused a run, derived from the interrupt + gate state. */
function gateFor(state: AgentState, interrupted: boolean, interrupt?: Interrupt): ApprovalGate {
  if (!interrupted) return 'none'
  if (state.gate && !state.gate.allowed) return 'si56'
  if (interrupt?.reason === 'high-value') return 'high-value'
  if (interrupt?.reason === 'structural-deviation') return 'structural-deviation'
  return 'validation-required'
}

/** Resolve a `startAt` value — accepts audit names or short graph node names. */
function resolveStartNode(auditOrShort: string): string {
  if (NODE_AUDIT_NAMES.includes(auditOrShort)) return auditOrShort
  const short = auditOrShort as AgentNode
  if (NODE_AUDIT_MAP[short]) return NODE_AUDIT_MAP[short]
  throw new Error(`Unknown start node "${auditOrShort}"`)
}

// ---------------------------------------------------------------------------
// Node handlers (audit-aligned names)
// ---------------------------------------------------------------------------

function rewriteState(state: AgentState): AgentState {
  const rewritten = deterministicRewrite(state.query, { jurisdiction: state.jurisdiction })
  return {
    ...state,
    rewrittenQuery: rewritten.rewritten,
    messages: [...state.messages, { role: 'assistant', content: `[rewrite] "${state.query}" -> "${rewritten.rewritten}"`, node: 'researcher', createdAt: new Date().toISOString() }],
  }
}

async function nodeQueryRewrite(state: AgentState, _ctx: AgentContext): Promise<NodeResult> {
  return { state: rewriteState(state), next: NODE_RESEARCHER }
}

async function nodeResearcher(state: AgentState, ctx: AgentContext): Promise<NodeResult> {
  const close = span(ctx, 'node:researcher', { query: state.rewrittenQuery ?? state.query })
  const search = await callTool(state, ctx, 'search_codes', { query: state.rewrittenQuery ?? state.query, k: 5 })
  const docs = search.state.toolCalls[search.state.toolCalls.length - 1]

  let retrieved: SearchResult[] = []
  if (docs?.ok) {
    // Re-run the search to capture structured results for the state.
    if (ctx.ragIndex) {
      retrieved = ctx.ragIndex.search(state.rewrittenQuery ?? state.query, { k: 5 })
    }
  }
  close()
  const messages: AgentMessage[] = [
    ...search.state.messages,
    { role: 'assistant', content: `[researcher] retrieved ${retrieved.length} candidate sections for "${state.rewrittenQuery ?? state.query}"`, node: 'researcher', createdAt: new Date().toISOString() },
  ]
  return {
    state: { ...search.state, messages, retrievedDocs: retrieved },
    next: NODE_CALCULATOR,
  }
}

async function nodeCalculator(state: AgentState, ctx: AgentContext): Promise<NodeResult> {
  const close = span(ctx, 'node:calculator', { query: state.query })

  // Deterministic ZIQS SMM measurement extraction: only run a scoped write
  // tool when the query carries the numbers it needs — never a fabricated
  // take-off. Reads the strict write-tool surface via the scoped `callTool`.
  const ref = inferMeasurement(state.query, ctx)
  if (!ref) {
    close()
    const msg = '[calculator] no measurable quantity found in the query — skipping take-off'
    return {
      state: { ...state, messages: [...state.messages, { role: 'assistant', content: msg, node: 'calculator', createdAt: new Date().toISOString() }] },
      next: NODE_VALIDATOR,
    }
  }

  const result = await callTool(state, ctx, ref.tool, ref.args)
  const value = measurementValue(result.result)
  const calculations = [
    ...result.state.calculations,
    { tool: ref.tool, summary: ref.summary, value },
  ]
  close()
  return {
    state: { ...result.state, calculations },
    next: NODE_VALIDATOR,
  }
}

async function nodeValidator(state: AgentState, ctx: AgentContext): Promise<NodeResult> {
  const close = span(ctx, 'node:validator', {})
  if (!ctx.planId && !ctx.architectRegistrationNumber) {
    close()
    const msg = '[validator] no plan/architect supplied — skipping SI 56 gate (non-Zimbabwe or unvalidated path)'
    return {
      state: { ...state, messages: [...state.messages, { role: 'assistant', content: msg, node: 'validator', createdAt: new Date().toISOString() }] },
    }
  }
  const result = await callTool(state, ctx, 'query_si56', {
    planId: ctx.planId ?? 'plan',
    architectRegistrationNumber: ctx.architectRegistrationNumber ?? '',
  })
  const kv = parseKeyValue(result.result)
  const state2 = {
    ...result.state,
    validation: kv.validation ? ({ reference: kv.validation } as never) : state.validation,
    gate: kv.allowed ? { allowed: kv.allowed === 'true', reason: kv.reason ?? '', regulation: 'SI 56/2025' } : state.gate,
  }
  close()
  // The conditional edge routes a failed gate to the human-in-the-loop node;
  // flag the pending state here so it is persisted before the interrupt.
  if (state2.gate && !state2.gate.allowed) {
    return {
      state: { ...state2, status: 'awaiting-input', decision: 'PENDING', needsHuman: true, approvalGate: 'si56', next: NODE_HUMAN_IN_LOOP },
    }
  }
  return { state: state2 }
}

async function nodeSupervisor(state: AgentState, ctx: AgentContext): Promise<NodeResult> {
  const close = span(ctx, 'node:supervisor', {})

  // HITL: high-value interrupt — checked unconditionally, before any baseline.
  const estimate = state.calculations.find((c) => c.value !== undefined)?.value
  const value = estimate ?? ctx.contractValueCents ?? 0
  const threshold = ctx.valueInterruptThresholdCents ?? DEFAULT_VALUE_INTERRUPT_THRESHOLD_CENTS
  if (value >= threshold) {
    close()
    return {
      state: { ...state, decision: 'PENDING', status: 'awaiting-input', needsHuman: true, approvalGate: 'high-value', next: NODE_HUMAN_IN_LOOP },
      next: NODE_HUMAN_IN_LOOP,
      interrupt: {
        reason: 'high-value',
        message: `Contract value ${value} cents exceeds the ${threshold} cents human-approval threshold.`,
        payload: { valueCents: value, thresholdCents: threshold },
      },
    }
  }

  if (ctx.historicalBaseline?.avgCostCents !== undefined) {
    const result = await callTool(state, ctx, 'gono_go_decision', {
      estimate_cents: estimate ?? ctx.contractValueCents ?? 0,
      baseline_cents: ctx.historicalBaseline.avgCostCents,
      deviation_threshold_pct: ctx.deviationThresholdPct ?? DEFAULT_DEVIATION_THRESHOLD_PCT,
    })
    const kv = parseKeyValue(result.result)
    const deviationPct = kv.deviation_pct ? Number(kv.deviation_pct) : kv.deviationPct ? Number(kv.deviationPct) : null
    const recommendation = kv.recommendation
    const state2 = { ...result.state, deviationPct }

    // HITL: structural deviation interrupt.
    if (recommendation === 'NO-GO' && deviationPct !== null) {
      close()
      return {
        state: { ...state2, decision: 'PENDING', status: 'awaiting-input', needsHuman: true, approvalGate: 'structural-deviation', next: NODE_HUMAN_IN_LOOP },
        next: NODE_HUMAN_IN_LOOP,
        interrupt: {
          reason: 'structural-deviation',
          message: `Estimate deviates ${deviationPct.toFixed(2)}% from the historical baseline — exceeds the ${ctx.deviationThresholdPct ?? DEFAULT_DEVIATION_THRESHOLD_PCT}% tolerance.`,
          payload: { deviationPct, thresholdPct: ctx.deviationThresholdPct ?? DEFAULT_DEVIATION_THRESHOLD_PCT },
        },
      }
    }

    const decision: 'GO' | 'NO-GO' = recommendation === 'GO' ? 'GO' : 'NO-GO'
    close()
    return {
      state: {
        ...state2,
        decision,
        status: 'completed',
        needsHuman: false,
        approvalGate: 'none',
        next: NODE_DONE,
        messages: [...state2.messages, { role: 'assistant', content: `[supervisor] ${decision} (deviation ${deviationPct === null ? 'n/a' : deviationPct.toFixed(2) + '%'})`, node: 'supervisor', createdAt: new Date().toISOString() }],
      },
      next: NODE_DONE,
    }
  }

  const decision = 'GO'
  close()
  return {
    state: {
      ...state,
      decision,
      status: 'completed',
      needsHuman: false,
      approvalGate: 'none',
      next: NODE_DONE,
      messages: [...state.messages, { role: 'assistant', content: '[supervisor] GO (no baseline to compare — proceeding)', node: 'supervisor', createdAt: new Date().toISOString() }],
    },
    next: NODE_DONE,
  }
}

async function nodeHumanInLoop(state: AgentState, _ctx: AgentContext): Promise<NodeResult> {
  // Never executed in normal flow — entering this node always interrupts first
  // (interruptBefore / supervisor interrupt). Resumption is via `resumeAgent`.
  return { state, next: NODE_DONE }
}

async function nodeDone(state: AgentState, _ctx: AgentContext): Promise<NodeResult> {
  return { state, next: NODE_DONE }
}

// Retry-with-error policy: feed the error back as a system message so an
// LLM-backed node can self-correct before the machine gives up. Also
// accumulates the error so `state.errors` is auditable after the run.
async function retryWithError(state: AgentState, node: string, error: string): Promise<AgentState> {
  return {
    ...state,
    errors: [...(state.errors ?? []), `${node}: ${error}`],
    messages: [...state.messages, { role: 'system', content: `[retry] node "${node}" failed: ${error} — correct and continue.`, node: state.node, createdAt: new Date().toISOString() }],
  }
}

// Bump stepCount + updatedAt on node entry so tool-call ids stay unique and
// checkpoints are keyed per step. Also keep `state.node` (the short graph node)
// in sync with the audit node about to run — tool scoping and HITL resume both
// read it, and the deterministic handlers never mutate it themselves.
function bump(state: AgentState): AgentState {
  return { ...state, stepCount: state.stepCount + 1, updatedAt: new Date().toISOString() }
}

// ---------------------------------------------------------------------------
// State machine assembly
// ---------------------------------------------------------------------------

function machineNode(audit: string, handler: (s: AgentState, c: AgentContext) => Promise<NodeResult>) {
  return {
    name: audit,
    run: async (s: AgentState, c: AgentContext) => {
      const ready: AgentState = { ...bump(s), node: AUDIT_TO_NODE[audit] ?? s.node }
      return handler(ready, c)
    },
  }
}

const AGENT_MACHINE = createStateMachine<AgentState, AgentContext>({
  nodes: {
    [NODE_QUERY_REWRITE]: machineNode(NODE_QUERY_REWRITE, nodeQueryRewrite),
    [NODE_RESEARCHER]: machineNode(NODE_RESEARCHER, nodeResearcher),
    [NODE_CALCULATOR]: machineNode(NODE_CALCULATOR, nodeCalculator),
    [NODE_VALIDATOR]: machineNode(NODE_VALIDATOR, nodeValidator),
    [NODE_SUPERVISOR]: machineNode(NODE_SUPERVISOR, nodeSupervisor),
    [NODE_HUMAN_IN_LOOP]: machineNode(NODE_HUMAN_IN_LOOP, nodeHumanInLoop),
    [NODE_DONE]: machineNode(NODE_DONE, nodeDone),
  },
  start: NODE_QUERY_REWRITE,
  end: NODE_DONE,
  edges: {
    [NODE_QUERY_REWRITE]: NODE_RESEARCHER,
    [NODE_RESEARCHER]: NODE_CALCULATOR,
    [NODE_CALCULATOR]: NODE_VALIDATOR,
  },
  conditionalEdges: {
    // validatorNode -> humanInLoopNode when the SI 56 gate fails; otherwise
    // supervisor. (Supervisor's own branching is handled in-node because it
    // must attach the interrupt payload.)
    [NODE_VALIDATOR]: (state) => (state.gate && !state.gate.allowed ? NODE_HUMAN_IN_LOOP : NODE_SUPERVISOR),
  },
  interruptBefore: [NODE_HUMAN_IN_LOOP],
  maxSteps: 20,
  maxRetries: 1,
  retryDelayMs: 5,
  retry: (state, _ctx, node, error) => retryWithError(state, node, error),
})

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export function rewriteEntry(state: AgentState): AgentState {
  // Deterministic local rewrite stage — always available, no network.
  return rewriteState(state)
}

export async function runNode(state: AgentState, ctx: AgentContext): Promise<StepResult> {
  const audit = state.stepCount === 0 ? NODE_QUERY_REWRITE : NODE_AUDIT_MAP[state.node]
  const result = await AGENT_MACHINE.step(audit, state, ctx)
  const short = AUDIT_TO_NODE[result.node] ?? 'done'
  return {
    state: { ...result.state, node: result.interrupted ? 'hitl' : short, updatedAt: new Date().toISOString() },
    interrupted: result.interrupted,
    interrupt: result.interrupt,
    done: result.done,
  }
}

export async function runAgent(
  initialState: AgentState,
  ctx: AgentContext,
  opts: {
    maxSteps?: number
    /** Resume from a later node, skipping already-completed expensive stages
     *  (thread-scoped resume — audit name or short node name). */
    startAt?: string
    onNodeStart?: (node: string, stepCount: number) => void | Promise<void>
    onStep?: (step: { from: string; node: string; state: AgentState; stepCount: number }) => void | Promise<void>
  } = {},
): Promise<{ state: AgentState; interrupted: boolean; interrupt?: Interrupt }> {
  const maxSteps = opts.maxSteps ?? 20
  const startAt = opts.startAt ? resolveStartNode(opts.startAt) : undefined
  try {
    const run = await AGENT_MACHINE.run(initialState, ctx, {
      maxSteps,
      startAt,
      onNodeStart: (audit, stepCount) => opts.onNodeStart?.(auditToShort(audit), stepCount),
      // `node` (the destination of the step just taken) is passed through raw —
      // the checkpointer keys on the audit name. `from` (the node that just
      // ran) is mapped to its short name for streaming consumers.
      onStep: (step) =>
        opts.onStep?.({
          from: auditToShort(step.from),
          node: step.node,
          state: step.state,
          stepCount: step.stepCount,
        }),
    })
    const short = AUDIT_TO_NODE[run.node] ?? 'done'
    const interrupted = run.interrupted
    return {
      state: {
        ...run.state,
        node: interrupted ? 'hitl' : short,
        updatedAt: run.state.updatedAt,
        next: run.node,
        needsHuman: interrupted,
        approvalGate: gateFor(run.state, interrupted, run.interrupt),
      },
      interrupted,
      interrupt: run.interrupt,
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return {
      state: {
        ...initialState,
        status: 'failed',
        error,
        node: 'done',
        next: NODE_DONE,
        needsHuman: false,
        approvalGate: 'none',
        errors: [...(initialState.errors ?? []), error],
      },
      interrupted: false,
    }
  }
}

export async function resumeAgent(
  state: AgentState,
  decision: 'APPROVED' | 'REJECTED',
  note?: string,
): Promise<{ state: AgentState; interrupt?: Interrupt }> {
  if (state.node !== 'hitl') throw new Error(`Cannot resume node "${state.node}" — expected "hitl"`)
  const messages: AgentMessage[] = [
    ...state.messages,
    { role: 'system', content: `[hitl] ${decision}${note ? ` — ${note}` : ''}`, node: 'hitl', createdAt: new Date().toISOString() },
  ]
  const state2: AgentState = {
    ...state,
    status: decision === 'APPROVED' ? 'completed' : 'failed',
    decision: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
    node: 'done',
    next: NODE_DONE,
    needsHuman: false,
    approvalGate: 'none',
    messages,
    updatedAt: new Date().toISOString(),
  }
  return { state: state2 }
}

export const GRAPH_NODES: AgentNode[] = ['researcher', 'calculator', 'validator', 'supervisor', 'hitl', 'done']
export const HITL_THRESHOLDS = { DEFAULT_VALUE_INTERRUPT_THRESHOLD_CENTS, DEFAULT_DEVIATION_THRESHOLD_PCT }
