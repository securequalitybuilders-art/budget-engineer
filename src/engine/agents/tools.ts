// KPI2 agent tool registry — thin adapter over the unified strict tool layer.
//
// The deterministic orchestrator consumes the SAME tools as the LLM
// function-calling layer (`engine/tools/`): ids are the snake_case strict
// names, per-node scoping is derived from `AGENT_TOOL_SCOPES`, and every `run`
// delegates to `executeTool`. One schema, one executor, one scope contract for
// both paths.
//
// The legacy kebab-case ids (`search-codes`, `compute-tco`, …) and the old
// hand-rolled arg validator are gone — the graph and tests were migrated to
// the strict names.

import type { AgentNode, AgentContext } from './types'
import {
  TOOLS as STRICT_TOOLS,
  AGENT_TOOL_SCOPES,
  parseToolArgs,
  type AgentRole,
  type ToolName,
} from '@/engine/tools/definitions'
import { executeTool } from '@/engine/tools/executor'

export interface ToolDefinition {
  id: ToolName
  name: string
  description: string
  nodes: AgentNode[]
  run: (args: Record<string, unknown>, ctx: AgentContext) => Promise<string> | string
}

/** Map a strict agent role to the orchestrator node(s) that exercise it. */
const ROLE_TO_NODES: Record<AgentRole, AgentNode[]> = {
  researcher: ['researcher'],
  calculator: ['calculator'],
  validator: ['validator'],
  supervisor: ['supervisor'],
}

function nodesForTool(name: ToolName): AgentNode[] {
  const nodes: AgentNode[] = []
  for (const role of Object.keys(AGENT_TOOL_SCOPES) as AgentRole[]) {
    if (AGENT_TOOL_SCOPES[role].includes(name)) nodes.push(...ROLE_TO_NODES[role])
  }
  return nodes
}

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function formatResult(tool: ToolName, data: unknown): string {
  const obj = (data ?? {}) as Record<string, unknown>
  if (tool === 'search_codes') {
    const hits = (obj.hits ?? []) as Array<{
      chapter?: string | null
      heading?: string
      docId?: string
      docTitle?: string
      score?: number
      text?: string
    }>
    if (hits.length === 0) return 'No code sections matched.'
    return hits
      .map(
        (h, i) =>
          `${i + 1}. [${h.chapter ?? '?'}] ${h.heading ?? ''} (${h.docTitle ?? h.docId ?? ''}, score ${(h.score ?? 0).toFixed(3)})\n   ${(h.text ?? '').slice(0, 220)}`,
      )
      .join('\n')
  }
  if (tool === 'query_si56') {
    const gate = (obj.gate ?? {}) as Record<string, unknown>
    const validation = obj.validation as { reference?: string } | null | undefined
    const lines: string[] = []
    if (validation?.reference) lines.push(`validation=${validation.reference}`)
    lines.push(`allowed=${gate.allowed ?? false}`)
    if (gate.reason) lines.push(`reason=${gate.reason}`)
    return lines.join('\n')
  }
  if (tool === 'gono_go_decision') {
    return [
      `estimateCents=${obj.estimate_cents ?? ''}`,
      `baselineCents=${obj.baseline_cents ?? ''}`,
      `deviationPct=${obj.deviation_pct ?? ''}`,
      `thresholdPct=${obj.deviation_threshold_pct ?? ''}`,
      `recommendation=${obj.recommendation ?? ''}`,
    ].join('\n')
  }
  if (Array.isArray(data) || data === null || typeof data !== 'object') return stringifyValue(data)
  return Object.entries(obj)
    .map(([k, v]) => `${k}=${stringifyValue(v)}`)
    .join('\n')
}

export const TOOLS: ToolDefinition[] = STRICT_TOOLS.map((t) => ({
  id: t.name,
  name: t.name,
  description: t.description,
  nodes: nodesForTool(t.name),
  run: (args, ctx) => {
    const res = executeTool(t.name, args, { index: ctx.ragIndex })
    if (!res.ok) throw new Error(res.error)
    return formatResult(t.name, res.data)
  },
}))

export function toolsFor(node: AgentNode): ToolDefinition[] {
  return TOOLS.filter((t) => t.nodes.includes(node))
}

export function findTool(id: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.id === id)
}

export function validateToolArgs(tool: ToolDefinition, args: Record<string, unknown>): string[] {
  try {
    parseToolArgs(tool.id, args)
    return []
  } catch (e) {
    const zod = (e as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues
    if (zod) return zod.map((i) => `${i.path.join('.')}: ${i.message}`)
    return [(e as Error).message]
  }
}

// ————————————————————— unified contract re-exports —————————————————————
// The strict layer stays reachable through the agents barrel (index.ts does
// `export * from './tools'`) without colliding with the adapter's `TOOLS`.
export { STRICT_TOOLS }
export {
  READ_TOOLS,
  WRITE_TOOLS,
  DECISION_TOOLS,
  AGENT_TOOL_SCOPES,
  TOOL_SCHEMAS,
  canCallTool,
  assertAgentToolScope,
  toolsForRole,
  parseToolArgs,
  isValidToolArgs,
} from '@/engine/tools/definitions'
export type { ToolName, ToolKind, ToolCategory, AgentRole } from '@/engine/tools/definitions'
