// Checkpointing for the agent orchestrator.
//
// LangGraph persists graph state to Postgres; here the local-first analogue
// is Dexie (IndexedDB). Each graph step writes a checkpoint so an interrupted
// run can be resumed or audited.

import { db } from '@/db/db'
import type { AgentState } from './types'

export interface AgentCheckpointRow {
  id: string
  runId: string
  step: number
  node: string
  state: AgentState
  status: string
  createdAt: string
}

export interface AgentRunRow {
  id: string
  projectId?: string
  query: string
  jurisdiction: string
  status: string
  node: string
  decision?: string | null
  createdAt: string
  updatedAt: string
}

export async function saveAgentRun(row: Omit<AgentRunRow, 'createdAt' | 'updatedAt'> & { id: string }): Promise<void> {
  const now = new Date().toISOString()
  await db.agentRuns.put({ ...row, createdAt: now, updatedAt: now })
}

export async function updateAgentRun(
  id: string,
  patch: Partial<Pick<AgentRunRow, 'status' | 'node' | 'decision'>>,
): Promise<void> {
  const now = new Date().toISOString()
  const existing = await db.agentRuns.get(id)
  await db.agentRuns.put({ ...(existing ?? ({ id } as AgentRunRow)), ...patch, id, updatedAt: now })
}

export async function saveCheckpoint(state: AgentState): Promise<void> {
  await db.agentCheckpoints.put({
    id: `${state.runId}:${state.stepCount}`,
    runId: state.runId,
    step: state.stepCount,
    node: state.node,
    state,
    status: state.status,
    createdAt: new Date().toISOString(),
  })
}

export async function loadLatestCheckpoint(runId: string): Promise<AgentState | null> {
  const rows = await db.agentCheckpoints.where('runId').equals(runId).reverse().sortBy('step')
  return rows[0]?.state ?? null
}

export async function listCheckpoints(runId: string): Promise<AgentCheckpointRow[]> {
  return db.agentCheckpoints.where('runId').equals(runId).sortBy('step')
}

export async function getAgentRun(id: string): Promise<AgentRunRow | undefined> {
  return db.agentRuns.get(id)
}

export async function listAgentRuns(projectId?: string): Promise<AgentRunRow[]> {
  const all = await db.agentRuns.toArray()
  return all
    .filter((r) => (projectId ? r.projectId === projectId : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
