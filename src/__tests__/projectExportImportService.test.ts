import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/db/db'
import { exportProjectPackage, importProjectPackage } from '@/services/projectExportImportService'

const TEST_PROJECT_ID = 'export-test-proj-1'

beforeAll(async () => {
  await db.open()
  await db.projects.clear()
  await db.briefs.clear()
  await db.designs.clear()
  await db.boqs.clear()
  await db.transactions.clear()
  await db.cadDocs.clear()
  await db.bimModels.clear()
  await db.governance.clear()
  await db.snapshots.clear()
  await db.planModels.clear()

  await db.projects.put({
    id: TEST_PROJECT_ID,
    slug: 'export-test-project',
    name: 'Export Test Project',
    ownerId: 'local-user',
    profile: 'first-time',
    region: 'zimbabwe',
    currency: 'USD',
    status: 'design',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  })
  await db.briefs.put({
    projectId: TEST_PROJECT_ID,
    rawText: 'A 3-bedroom house in Harare',
    parsed: { buildingType: 'house', floors: 1, location: 'harare', standards: ['ZBC 1996'] },
  })
  await db.designs.put({
    id: 'export-design-1',
    projectId: TEST_PROJECT_ID,
    name: 'Standard House',
    optionIndex: 0,
    parameters: { areaM2: 120, floors: 1 },
    elements: [],
    buildingType: 'house',
    generatedAt: new Date().toISOString(),
  })
})

afterAll(async () => {
  db.close()
})

describe('projectExportImportService', () => {
  it('exportProjectPackage returns a Blob for a valid project', async () => {
    const blob = await exportProjectPackage(TEST_PROJECT_ID)
    expect(blob).not.toBeNull()
    expect(blob!.type).toBe('application/json')
  })

  it('exportProjectPackage returns null for missing project', async () => {
    const blob = await exportProjectPackage('nonexistent')
    expect(blob).toBeNull()
  })

  it('importProjectPackage restores project data from exported blob', async () => {
    const blob = await exportProjectPackage(TEST_PROJECT_ID)
    expect(blob).not.toBeNull()

    await db.projects.clear()
    await db.briefs.clear()
    await db.designs.clear()

    const importedId = await importProjectPackage(blob!)
    expect(importedId).toBe(TEST_PROJECT_ID)

    const project = await db.projects.get(TEST_PROJECT_ID)
    expect(project).not.toBeUndefined()
    expect(project!.name).toBe('Export Test Project')

    const brief = await db.briefs.get(TEST_PROJECT_ID)
    expect(brief).not.toBeUndefined()
    expect(brief!.parsed.location).toBe('harare')

    const designs = await db.designs.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(designs.length).toBeGreaterThan(0)
  })

  it('importProjectPackage returns null for invalid data', async () => {
    const badBlob = new Blob(['not-json'], { type: 'application/json' })
    const result = await importProjectPackage(badBlob)
    expect(result).toBeNull()
  })

  it('importProjectPackage returns null for incomplete data', async () => {
    const badBlob = new Blob([JSON.stringify({ version: 1 })], { type: 'application/json' })
    const result = await importProjectPackage(badBlob)
    expect(result).toBeNull()
  })
})
