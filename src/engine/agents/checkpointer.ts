// Thread-scoped checkpointer over Dexie.
//
// LangGraph checkpoints graph state per thread (Postgres); here the local-first
// analogue is IndexedDB via Dexie. A "thread" is an agent / pipeline run; its
// id doubles as the run id (`runId === threadId`), which is the Dexie index on
// `agentCheckpoints`. Every step writes a row keyed `{runId}:{step}` so an
// interrupted run can be resumed from its latest checkpoint or replayed.
//
// `loadLatestCheckpoint` ordering is fixed here too: Dexie `.reverse()` before
// `.sortBy()` is a no-op, so the earliest step used to come back as "latest".

import { db } from '@/db/db'
import type { AgentState } from './types'

export interface ThreadCheckpoint {
  id: string
  runId: string
  step: number
  node: string
  state: AgentState
  status: string
  createdAt: string
}

export class DexieCheckpointer {
  constructor(private readonly table = db.agentCheckpoints) {}

  async save(state: AgentState, node?: string): Promise<void> {
    const createdAt = new Date().toISOString()
    await this.table.put({
      id: `${state.runId}:${state.stepCount}`,
      runId: state.runId,
      step: state.stepCount,
      node: node ?? state.node,
      state,
      status: state.status,
      createdAt,
    })
  }

  /** Latest persisted state for a thread (== runId), or null. */
  async loadLatest(threadId: string): Promise<AgentState | null> {
    const rows = await this.table.where('runId').equals(threadId).sortBy('step')
    return rows[rows.length - 1]?.state ?? null
  }

  async list(threadId: string): Promise<ThreadCheckpoint[]> {
    return this.table.where('runId').equals(threadId).sortBy('step')
  }

  async delete(threadId: string): Promise<void> {
    await this.table.where('runId').equals(threadId).delete()
  }

  /** Replay a thread from its persisted checkpoints — returns the latest state
   *  ready to be handed back to the state machine for resume/continue. */
  async replay(threadId: string): Promise<AgentState | null> {
    return this.loadLatest(threadId)
  }
}

export const threadCheckpointer = new DexieCheckpointer()

export async function saveThreadCheckpoint(state: AgentState, node?: string): Promise<void> {
  await threadCheckpointer.save(state, node)
}

export async function loadLatestThreadCheckpoint(threadId: string): Promise<AgentState | null> {
  return threadCheckpointer.loadLatest(threadId)
}

export async function listThreadCheckpoints(threadId: string): Promise<ThreadCheckpoint[]> {
  return threadCheckpointer.list(threadId)
}

export async function deleteThreadCheckpoints(threadId: string): Promise<void> {
  await threadCheckpointer.delete(threadId)
}
