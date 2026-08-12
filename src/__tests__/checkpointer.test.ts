import { describe, it, expect, beforeEach } from 'vitest'
import {
  DexieCheckpointer,
  threadCheckpointer,
  saveThreadCheckpoint,
  loadLatestThreadCheckpoint,
  listThreadCheckpoints,
  deleteThreadCheckpoints,
} from '@/engine/agents/checkpointer'
import { createInitialState, type AgentState } from '@/engine/agents/types'
import { db } from '@/db/db'

function stateAt(runId: string, stepCount: number, node: AgentState['node'] = 'researcher'): AgentState {
  return { ...createInitialState({ runId, query: 'minimum ceiling height' }), stepCount, node }
}

describe('DexieCheckpointer', () => {
  beforeEach(async () => {
    await db.agentCheckpoints.clear()
  })

  it('saves rows keyed runId:step with node + status stamped', async () => {
    const cp = new DexieCheckpointer()
    await cp.save(stateAt('r1', 2, 'calculator'))
    const rows = await db.agentCheckpoints.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('r1:2')
    expect(rows[0].runId).toBe('r1')
    expect(rows[0].step).toBe(2)
    expect(rows[0].node).toBe('calculator')
    expect(rows[0].status).toBe('running')
    expect(rows[0].state.stepCount).toBe(2)
  })

  it('loadLatest returns the highest persisted step (ordering regression)', async () => {
    const cp = new DexieCheckpointer()
    await cp.save(stateAt('r1', 1))
    await cp.save(stateAt('r1', 3))
    await cp.save(stateAt('r1', 2))
    const latest = await cp.loadLatest('r1')
    expect(latest?.stepCount).toBe(3)
    expect(latest?.node).toBe('researcher')
  })

  it('loadLatest returns null when a thread has no checkpoints', async () => {
    const cp = new DexieCheckpointer()
    expect(await cp.loadLatest('ghost')).toBeNull()
  })

  it('list returns all checkpoints ascending by step', async () => {
    const cp = new DexieCheckpointer()
    await cp.save(stateAt('r1', 2, 'calculator'))
    await cp.save(stateAt('r1', 1, 'researcher'))
    const rows = await cp.list('r1')
    expect(rows.map((r) => r.step)).toEqual([1, 2])
    expect(rows[0].node).toBe('researcher')
  })

  it('delete removes only the requested thread', async () => {
    const cp = new DexieCheckpointer()
    await cp.save(stateAt('r1', 1))
    await cp.save(stateAt('r2', 1))
    await cp.delete('r1')
    expect(await cp.loadLatest('r1')).toBeNull()
    expect(await cp.loadLatest('r2')).not.toBeNull()
  })

  it('replay is an alias for loadLatest', async () => {
    const cp = new DexieCheckpointer()
    await cp.save(stateAt('r1', 4))
    expect((await cp.replay('r1'))?.stepCount).toBe(4)
  })

  it('module helpers save/load/list/delete round-trip', async () => {
    await saveThreadCheckpoint(stateAt('r9', 1))
    const latest = await loadLatestThreadCheckpoint('r9')
    expect(latest?.stepCount).toBe(1)
    expect((await listThreadCheckpoints('r9')).length).toBe(1)
    await deleteThreadCheckpoints('r9')
    expect(await loadLatestThreadCheckpoint('r9')).toBeNull()
  })

  it('the default threadCheckpointer writes to the shared table', async () => {
    await threadCheckpointer.save(stateAt('r5', 7))
    const rows = await db.agentCheckpoints.where('runId').equals('r5').toArray()
    expect(rows[0].id).toBe('r5:7')
  })
})
