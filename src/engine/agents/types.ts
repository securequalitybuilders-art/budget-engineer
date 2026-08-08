// KPI2 — Deterministic agent orchestrator.
//
// A LangGraph-style state machine with typed states, per-node tool scoping,
// Dexie checkpointing (local-first analogue of Postgres checkpointing), and
// human-in-the-loop interrupts for high-value or structurally-sensitive
// decisions.

import type { SearchResult } from '@/engine/rag/types'
import type { PlanValidation, P4pGateDecision } from '@/domain/architect'
import type { HistoryTurn } from '@/engine/rag/queryRewrite'

export type AgentNode = 'researcher' | 'calculator' | 'validator' | 'supervisor' | 'hitl' | 'done'
export type AgentStatus = 'running' | 'awaiting-input' | 'completed' | 'failed'
export type AgentDecision = 'GO' | 'NO-GO' | 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  node?: AgentNode
  toolCallId?: string
  createdAt: string
}

export interface ToolCallRecord {
  id: string
  tool: string
  node: AgentNode
  args: Record<string, unknown>
  result: string
  ok: boolean
  createdAt: string
}

export interface AgentTraceSpan {
  name: string
  startedAtMs: number
  durationMs: number
  metadata?: Record<string, unknown>
}

export interface AgentState {
  runId: string
  query: string
  rewrittenQuery?: string
  jurisdiction: string
  projectId?: string
  node: AgentNode
  status: AgentStatus
  messages: AgentMessage[]
  toolCalls: ToolCallRecord[]
  retrievedDocs: SearchResult[]
  calculations: Array<{ tool: string; summary: string; value?: number }>
  validation: PlanValidation | null
  gate: P4pGateDecision | null
  decision: AgentDecision | null
  deviationPct: number | null
  interrupts: string[]
  history: HistoryTurn[]
  spans: AgentTraceSpan[]
  error?: string
  stepCount: number
  createdAt: string
  updatedAt: string
}

export interface Interrupt {
  reason: 'high-value' | 'structural-deviation' | 'low-confidence' | 'validation-required'
  message: string
  payload?: Record<string, unknown>
}

export interface AgentContext {
  ragIndex?: import('@/engine/rag/ragIndex').RagIndex
  contractValueCents?: number
  planId?: string
  architectRegistrationNumber?: string
  historicalBaseline?: {
    avgCostCents?: number
    region?: string
  }
  deviationThresholdPct?: number
  valueInterruptThresholdCents?: number
  onSpan?: (span: AgentTraceSpan) => void
}

export function createInitialState(input: {
  runId: string
  query: string
  jurisdiction?: string
  projectId?: string
  history?: HistoryTurn[]
}): AgentState {
  const now = new Date().toISOString()
  return {
    runId: input.runId,
    query: input.query,
    jurisdiction: input.jurisdiction ?? 'zimbabwe',
    projectId: input.projectId,
    node: 'researcher',
    status: 'running',
    messages: [{ role: 'user', content: input.query, createdAt: now }],
    toolCalls: [],
    retrievedDocs: [],
    calculations: [],
    validation: null,
    gate: null,
    decision: null,
    deviationPct: null,
    interrupts: [],
    history: input.history ?? [],
    spans: [],
    stepCount: 0,
    createdAt: now,
    updatedAt: now,
  }
}
