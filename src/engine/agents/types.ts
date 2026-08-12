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

/** Which gate paused the run (Track B spec: `approvalGate` annotation). */
export type ApprovalGate = 'high-value' | 'structural-deviation' | 'validation-required' | 'si56' | 'none'

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

// ————— Track B spec domain refs (loaded into the state as annotations) —————

export interface BoqRef {
  lineCount: number
  grandTotalCents: number
  sections: Array<{ id: string; totalCents: number }>
}

export interface CostBaselineRef {
  avgCostCents?: number
  region?: string
  perM2Cents?: number
}

export interface WipaaRef {
  monthKey: string
  costPctComplete: number
  overUnderBilledCents: number
  billingStatus: 'on-track' | 'under-billed' | 'over-billed'
}

export interface ChangeOrderRef {
  number: string
  declaredImpactCents: number
  status: 'pending' | 'approved' | 'rejected'
}

export interface EscrowRef {
  heldCents: number
  releasedCents: number
  milestoneCount: number
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
  // ————— Track B spec fields (all optional — backward compatible) —————
  boq?: BoqRef
  costBaseline?: CostBaselineRef
  wipaaEntry?: WipaaRef
  changeOrder?: ChangeOrderRef
  escrowBalance?: EscrowRef
  verificationPhotos?: number
  /** Audit node the run will route to next (LangGraph `next` annotation). */
  next?: string
  /** Accumulated retry / step errors fed back for self-correction. */
  errors?: string[]
  needsHuman?: boolean
  approvalGate?: ApprovalGate
}

/** Progressive events emitted during a run (local-first streaming). */
export type AgentStreamEvent =
  | { type: 'node-start'; node: string; stepCount: number }
  | { type: 'node-end'; node: string; stepCount: number }
  | { type: 'tool'; tool: string; node: string; ok: boolean; result: string }
  | { type: 'interrupt'; interrupt: Interrupt }
  | { type: 'done'; state: AgentState }

export interface Interrupt {
  reason: 'high-value' | 'structural-deviation' | 'low-confidence' | 'validation-required'
  message: string
  payload?: Record<string, unknown>
}

export interface AgentContext {
  ragIndex?: import('@/engine/rag/ragIndex').RagIndex
  contractValueCents?: number
  projectId?: string
  planId?: string
  architectRegistrationNumber?: string
  historicalBaseline?: {
    avgCostCents?: number
    region?: string
  }
  deviationThresholdPct?: number
  valueInterruptThresholdCents?: number
  onSpan?: (span: AgentTraceSpan) => void
  /** Streams each completed tool call (result + ok) to the caller. */
  onToolCall?: (call: ToolCallRecord) => void | Promise<void>
}

export interface AgentInitialInput {
  runId: string
  query: string
  jurisdiction?: string
  projectId?: string
  history?: HistoryTurn[]
  boq?: BoqRef
  costBaseline?: CostBaselineRef
  wipaaEntry?: WipaaRef
  changeOrder?: ChangeOrderRef
  escrowBalance?: EscrowRef
  verificationPhotos?: number
}

export function createInitialState(input: AgentInitialInput): AgentState {
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
    boq: input.boq,
    costBaseline: input.costBaseline,
    wipaaEntry: input.wipaaEntry,
    changeOrder: input.changeOrder,
    escrowBalance: input.escrowBalance,
    verificationPhotos: input.verificationPhotos,
    needsHuman: false,
    approvalGate: 'none',
  }
}
