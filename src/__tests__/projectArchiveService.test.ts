import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/db/db'
import { archiveProject, restoreProject } from '@/services/projectArchiveService'

describe('projectArchiveService', () => {
  beforeAll(async () => {
    await db.open()
  })

  afterAll(async () => {
    db.close()
  })

  it('archiveProject sets isArchived to true', async () => {
    const project = {
      id: 'test-arch-1',
      slug: 'test-arch-1',
      name: 'To Archive',
      ownerId: 'user-1',
      profile: 'first-time' as const,
      region: 'zimbabwe' as const,
      currency: 'USD' as const,
      status: 'design' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    }
    await db.projects.put(project)

    await archiveProject('test-arch-1')

    const updated = await db.projects.get('test-arch-1')
    expect(updated?.isArchived).toBe(true)

    await db.projects.delete('test-arch-1')
  })

  it('restoreProject sets isArchived to false', async () => {
    const project = {
      id: 'test-rest-1',
      slug: 'test-rest-1',
      name: 'To Restore',
      ownerId: 'user-1',
      profile: 'first-time' as const,
      region: 'zimbabwe' as const,
      currency: 'USD' as const,
      status: 'design' as const,
      isArchived: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    }
    await db.projects.put(project)

    await restoreProject('test-rest-1')

    const updated = await db.projects.get('test-rest-1')
    expect(updated?.isArchived).toBe(false)

    await db.projects.delete('test-rest-1')
  })

  it('does not throw when archiving a missing project', async () => {
    await expect(archiveProject('nonexistent')).resolves.toBeUndefined()
  })

  it('does not throw when restoring a missing project', async () => {
    await expect(restoreProject('nonexistent')).resolves.toBeUndefined()
  })

  it('does nothing when projectId is empty', async () => {
    await expect(archiveProject('')).resolves.toBeUndefined()
    await expect(restoreProject('')).resolves.toBeUndefined()
  })

  it('creates a transaction log entry on archive', async () => {
    const project = {
      id: 'test-arch-tx',
      slug: 'test-arch-tx',
      name: 'Archive TX',
      ownerId: 'user-1',
      profile: 'first-time' as const,
      region: 'zimbabwe' as const,
      currency: 'USD' as const,
      status: 'design' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    }
    await db.projects.put(project)

    await archiveProject('test-arch-tx')

    const txs = await db.transactions.where({ projectId: 'test-arch-tx' }).toArray()
    expect(txs.length).toBeGreaterThanOrEqual(1)
    const archiveTx = txs.find((t) => t.reason === 'Project archived')
    expect(archiveTx).toBeDefined()
    expect(archiveTx!.action).toBe('UPDATE')

    await db.projects.delete('test-arch-tx')
    await db.transactions.where({ projectId: 'test-arch-tx' }).delete()
  })

  it('creates a transaction log entry on restore', async () => {
    const project = {
      id: 'test-rest-tx',
      slug: 'test-rest-tx',
      name: 'Restore TX',
      ownerId: 'user-1',
      profile: 'first-time' as const,
      region: 'zimbabwe' as const,
      currency: 'USD' as const,
      status: 'design' as const,
      isArchived: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    }
    await db.projects.put(project)

    await restoreProject('test-rest-tx')

    const txs = await db.transactions.where({ projectId: 'test-rest-tx' }).toArray()
    expect(txs.length).toBeGreaterThanOrEqual(1)
    const restoreTx = txs.find((t) => t.reason === 'Project restored')
    expect(restoreTx).toBeDefined()
    expect(restoreTx!.action).toBe('UPDATE')

    await db.projects.delete('test-rest-tx')
    await db.transactions.where({ projectId: 'test-rest-tx' }).delete()
  })
})
