// Graph runner for the agent orchestrator.
//
// Node pipeline (LangGraph-style, deterministic):
//   researcher -> calculator -> validator -> supervisor -> hitl | done
//
// - researcher gathers code evidence from the RAG index
// - calculator runs quantity/cost maths via scoped calculator tools
// - validator checks the SI 56/2025 architect gate
// - supervisor computes a GO / NO-GO vs a historical baseline
// - hitl is a hard interrupt for high-value or structural-deviation decisions
//   (resumed via `resumeAgent`)

import type { AgentContext, AgentNode, AgentMessage, AgentState, Interrupt } from './types'
import type { SearchResult } from '@/engine/rag/types'
import { findTool, validateToolArgs } from './tools'
import { deterministicRewrite } from '@/engine/rag/queryRewrite'

export const DEFAULT_VALUE_INTERRUPT_THRESHOLD_CENTS = 5_000_000 // $50,000 (spec: > $5,000 in construction units x 100)
export const DEFAULT_DEVIATION_THRESHOLD_PCT = 10

export interface NodeResult {
  state: AgentState
  next: AgentNode
  interrupt?: Interrupt
}

export interface StepResult {
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

export async function callTool(state: AgentState, ctx: AgentContext, toolId: string, args: Record<string, unknown>): Promise<{ state: AgentState; result: string }> {
  const tool = findTool(toolId)
  if (!tool) {
    const s = recordToolCall(state, toolId, args, `Unknown tool "${toolId}"`, false)
    return { state: s, result: `Unknown tool "${toolId}"` }
  }
  if (!tool.nodes.includes(state.node)) {
    const s = recordToolCall(state, toolId, args, `Tool "${toolId}" is not scoped to node "${state.node}"`, false)
    return { state: s, result: `Tool "${toolId}" is not scoped to node "${state.node}"` }
  }
  const errors = validateToolArgs(tool, args)
  if (errors.length > 0) {
    const s = recordToolCall(state, toolId, args, `Invalid args: ${errors.join('; ')}`, false)
    return { state: s, result: `Invalid args: ${errors.join('; ')}` }
  }
  try {
    const close = span(ctx, `tool:${toolId}`, { node: state.node })
    const result = await tool.run(args, ctx)
    close()
    const s = recordToolCall(state, toolId, args, result, true)
    return { state: s, result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const s = recordToolCall(state, toolId, args, msg, false)
    return { state: s, result: msg }
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

// ---------------------------------------------------------------------------
// Node handlers
// ---------------------------------------------------------------------------

async function nodeResearcher(state: AgentState, ctx: AgentContext): Promise<NodeResult> {
  const close = span(ctx, 'node:researcher', { query: state.rewrittenQuery ?? state.query })
  const search = await callTool(state, ctx, 'search-codes', { query: state.rewrittenQuery ?? state.query, k: 5 })
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
    next: 'calculator',
  }
}

async function nodeCalculator(state: AgentState, ctx: AgentContext): Promise<NodeResult> {
  const close = span(ctx, 'node:calculator', {})
  const calls = [...state.toolCalls]
  const withCalls = { ...state, toolCalls: calls }
  close()
  return { state: withCalls, next: 'validator' }
}

async function nodeValidator(state: AgentState, ctx: AgentContext): Promise<NodeResult> {
  const close = span(ctx, 'node:validator', {})
  if (!ctx.planId && !ctx.architectRegistrationNumber) {
    close()
    const msg = '[validator] no plan/architect supplied — skipping SI 56 gate (non-Zimbabwe or unvalidated path)'
    return {
      state: { ...state, messages: [...state.messages, { role: 'assistant', content: msg, node: 'validator', createdAt: new Date().toISOString() }] },
      next: 'supervisor',
    }
  }
  const result = await callTool(state, ctx, 'validate-plan-si56', {
    planId: ctx.planId ?? 'plan',
    architectRegistrationNumber: ctx.architectRegistrationNumber ?? '',
    contractValueCents: ctx.contractValueCents ?? 0,
  })
  const kv = parseKeyValue(result.result)
  const state2 = {
    ...result.state,
    validation: kv.validation ? ({ reference: kv.validation } as never) : state.validation,
    gate: kv.allowed ? { allowed: kv.allowed === 'true', reason: kv.reason ?? '', regulation: 'SI 56/2025' } : state.gate,
  }
  close()
  return { state: state2, next: 'supervisor' }
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
      state: { ...state, decision: 'PENDING', status: 'awaiting-input' },
      next: 'hitl',
      interrupt: {
        reason: 'high-value',
        message: `Contract value ${value} cents exceeds the ${threshold} cents human-approval threshold.`,
        payload: { valueCents: value, thresholdCents: threshold },
      },
    }
  }

  if (ctx.historicalBaseline?.avgCostCents !== undefined) {
    const result = await callTool(state, ctx, 'gono-go-decision', {
      estimateCents: estimate ?? ctx.contractValueCents ?? 0,
      baselineCents: ctx.historicalBaseline.avgCostCents,
      deviationThresholdPct: ctx.deviationThresholdPct ?? DEFAULT_DEVIATION_THRESHOLD_PCT,
    })
    const kv = parseKeyValue(result.result)
    const deviationPct = kv.deviationPct ? Number(kv.deviationPct) : null
    const recommendation = kv.recommendation
    const state2 = { ...result.state, deviationPct }

    // HITL: structural deviation interrupt.
    if (recommendation === 'NO-GO' && deviationPct !== null) {
      close()
      return {
        state: { ...state2, decision: 'PENDING', status: 'awaiting-input' },
        next: 'hitl',
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
        messages: [...state2.messages, { role: 'assistant', content: `[supervisor] ${decision} (deviation ${deviationPct === null ? 'n/a' : deviationPct.toFixed(2) + '%'})`, node: 'supervisor', createdAt: new Date().toISOString() }],
      },
      next: 'done',
    }
  }

  const decision = 'GO'
  close()
  return {
    state: {
      ...state,
      decision,
      status: 'completed',
      messages: [...state.messages, { role: 'assistant', content: '[supervisor] GO (no baseline to compare — proceeding)', node: 'supervisor', createdAt: new Date().toISOString() }],
    },
    next: 'done',
  }
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export function rewriteEntry(state: AgentState): AgentState {
  // Deterministic local rewrite stage — always available, no network.
  const rewritten = deterministicRewrite(state.query, { jurisdiction: state.jurisdiction })
  return {
    ...state,
    rewrittenQuery: rewritten.rewritten,
    messages: [...state.messages, { role: 'assistant', content: `[rewrite] "${state.query}" -> "${rewritten.rewritten}"`, node: 'researcher', createdAt: new Date().toISOString() }],
  }
}

export async function runNode(state: AgentState, ctx: AgentContext): Promise<StepResult> {
  let s = state
  if (state.stepCount === 0) s = rewriteEntry(state)
  s = { ...s, stepCount: s.stepCount + 1, updatedAt: new Date().toISOString() }

  let result: NodeResult
  switch (s.node) {
    case 'researcher':
      result = await nodeResearcher(s, ctx)
      break
    case 'calculator':
      result = await nodeCalculator(s, ctx)
      break
    case 'validator':
      result = await nodeValidator(s, ctx)
      break
    case 'supervisor':
      result = await nodeSupervisor(s, ctx)
      break
    default:
      throw new Error(`Cannot step node "${s.node}"`)
  }

  const interrupted = !!result.interrupt
  const done = !interrupted && (result.next === 'done' || result.state.status === 'completed' || result.state.status === 'failed')
  return {
    state: { ...result.state, node: interrupted ? 'hitl' : result.next, updatedAt: new Date().toISOString() },
    interrupted,
    interrupt: result.interrupt,
    done,
  }
}

export async function runAgent(
  initialState: AgentState,
  ctx: AgentContext,
  opts: { maxSteps?: number } = {},
): Promise<{ state: AgentState; interrupted: boolean; interrupt?: Interrupt }> {
  const maxSteps = opts.maxSteps ?? 20
  let s = initialState
  for (let i = 0; i < maxSteps; i++) {
    const step = await runNode(s, ctx)
    s = step.state
    if (step.interrupted) return { state: s, interrupted: true, interrupt: step.interrupt }
    if (step.done) return { state: s, interrupted: false }
  }
  return {
    state: { ...s, status: 'failed', error: `Exceeded ${maxSteps} step limit` },
    interrupted: false,
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
    messages,
    updatedAt: new Date().toISOString(),
  }
  return { state: state2 }
}

export const GRAPH_NODES: AgentNode[] = ['researcher', 'calculator', 'validator', 'supervisor', 'hitl', 'done']
export const HITL_THRESHOLDS = { DEFAULT_VALUE_INTERRUPT_THRESHOLD_CENTS, DEFAULT_DEVIATION_THRESHOLD_PCT }
