import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/db/db'

describe('projectPersistenceService (Dexie smoke)', () => {
  beforeAll(async () => {
    await db.open()
  })

  afterAll(async () => {
    db.close()
  })

  it('db is open and has expected tables', () => {
    expect(db.isOpen()).toBe(true)
    const tableNames = db.tables.map((t) => t.name)
    expect(tableNames).toContain('projects')
    expect(tableNames).toContain('designs')
    expect(tableNames).toContain('boqs')
    expect(tableNames).toContain('transactions')
    expect(tableNames).toContain('bimModels')
  })

  it('can write and read a design', async () => {
    const design = {
      id: 'test-design-1',
      projectId: 'test-project-1',
      name: 'Test Design',
      optionIndex: 0,
      parameters: { areaM2: 150, floors: 1 },
      elements: [],
      generatedAt: new Date().toISOString(),
    }
    await db.designs.put(design)
    const loaded = await db.designs.get('test-design-1')
    expect(loaded).not.toBeUndefined()
    expect(loaded!.name).toBe('Test Design')
  })

  it('can write and read a transaction', async () => {
    const tx = {
      id: 'test-tx-1',
      projectId: 'test-project-1',
      actor: 'SYSTEM' as const,
      action: 'CREATE' as const,
      entityType: 'design' as const,
      entityId: 'test-design-1',
      after: { source: 'test' },
      reason: 'smoke test',
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(tx)
    const loaded = await db.transactions.get('test-tx-1')
    expect(loaded).not.toBeUndefined()
    expect(loaded!.reason).toBe('smoke test')
  })

  it('can query designs by projectId', async () => {
    const designs = await db.designs.where({ projectId: 'test-project-1' }).toArray()
    expect(designs.length).toBeGreaterThanOrEqual(1)
  })

  it('can count boqs', async () => {
    const count = await db.boqs.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
