// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/db'
import { loadDemoProject, demoProjectExists, DEMO_BRIEF_TEXT, DEMO_PROJECT_NAME } from '@/lib/demo/demo-project-pack'

async function clearAllTables() {
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
  await db.rates.clear()
}

beforeAll(async () => {
  await db.open()
})

afterAll(() => {
  db.close()
})

beforeEach(async () => {
  await clearAllTables()
})

describe('DemoProjectPack', () => {
  it('loadDemoProject creates a project with the expected name', async () => {
    const projectId = await loadDemoProject()
    const project = await db.projects.get(projectId)
    expect(project).toBeDefined()
    expect(project!.name).toBe(DEMO_PROJECT_NAME)
  })

  it('loadDemoProject creates exactly one project', async () => {
    await loadDemoProject()
    const all = await db.projects.toArray()
    expect(all).toHaveLength(1)
  })

  it('loadDemoProject creates a brief for the project', async () => {
    const projectId = await loadDemoProject()
    const brief = await db.briefs.get(projectId)
    expect(brief).toBeDefined()
    expect(brief!.rawText).toBe(DEMO_BRIEF_TEXT)
  })

  it('loadDemoProject creates 3 design options', async () => {
    const projectId = await loadDemoProject()
    const designs = await db.designs.where({ projectId }).toArray()
    const sorted = designs.sort((a, b) => a.optionIndex - b.optionIndex)
    expect(sorted).toHaveLength(3)
    expect(sorted[0].name).toBe('Standard Layout')
    expect(sorted[1].name).toBe('Compact Design')
    expect(sorted[2].name).toBe('Spacious Family Home')
  })

  it('loadDemoProject creates a plan model for the first design', async () => {
    const projectId = await loadDemoProject()
    const designs = await db.designs.where({ projectId }).toArray()
    const sorted = designs.sort((a, b) => a.optionIndex - b.optionIndex)
    const plan = await db.planModels.get(`plan-${projectId}-${sorted[0].id}`)
    expect(plan).toBeDefined()
    expect(plan!.rooms).toHaveLength(9)
    expect(plan!.walls).toHaveLength(11)
    expect(plan!.openings).toHaveLength(10)
  })

  it('loadDemoProject creates a BOQ with cost items', async () => {
    const projectId = await loadDemoProject()
    const boqs = await db.boqs.where({ projectId }).toArray()
    expect(boqs).toHaveLength(1)
    expect(boqs[0].sections.length).toBeGreaterThan(0)
    expect(boqs[0].totalCents).toBeGreaterThan(0)
  })

  it('loadDemoProject creates a CAD document', async () => {
    const projectId = await loadDemoProject()
    const docs = await db.cadDocs.where({ projectId }).toArray()
    expect(docs).toHaveLength(1)
    expect(docs[0].walls.length).toBe(11)
    expect(docs[0].openings.length).toBe(10)
  })

  it('loadDemoProject creates transactions', async () => {
    const projectId = await loadDemoProject()
    const all = await db.transactions.toArray()
    const txs = all.filter((t) => t.projectId === projectId)
    expect(txs.length).toBeGreaterThanOrEqual(4)
  })

  it('demoProjectExists returns true after loading', async () => {
    await loadDemoProject()
    const exists = await demoProjectExists()
    expect(exists).toBe(true)
  })

  it('demoProjectExists returns false before loading', async () => {
    const exists = await demoProjectExists()
    expect(exists).toBe(false)
  })

  it('loadDemoProject can be called multiple times', async () => {
    const id1 = await loadDemoProject()
    const id2 = await loadDemoProject()
    expect(id1).not.toBe(id2)
    const all = await db.projects.toArray()
    expect(all).toHaveLength(2)
  })

  it('seeds rates if not already present', async () => {
    await loadDemoProject()
    const rates = await db.rates.toArray()
    expect(rates.length).toBeGreaterThan(0)
  })

  it('plan model has realistic dimensions', async () => {
    const projectId = await loadDemoProject()
    const designs = await db.designs.where({ projectId }).toArray()
    const sorted = designs.sort((a, b) => a.optionIndex - b.optionIndex)
    const plan = await db.planModels.get(`plan-${projectId}-${sorted[0].id}`)
    expect(plan).toBeDefined()
    expect(plan!.width).toBe(12)
    expect(plan!.height).toBe(10)
    expect(plan!.wallThickness).toBe(0.23)
  })

  it('plan model includes all expected rooms', async () => {
    const projectId = await loadDemoProject()
    const designs = await db.designs.where({ projectId }).toArray()
    const sorted = designs.sort((a, b) => a.optionIndex - b.optionIndex)
    const plan = await db.planModels.get(`plan-${projectId}-${sorted[0].id}`)
    expect(plan).toBeDefined()
    const roomNames = plan!.rooms.map((r) => r.name)
    expect(roomNames).toContain('Living / Dining')
    expect(roomNames).toContain('Master Bedroom')
    expect(roomNames).toContain('Kitchen')
    expect(roomNames).toContain('Covered Patio')
  })

  it('project status is costing (fully progressed)', async () => {
    const projectId = await loadDemoProject()
    const project = await db.projects.get(projectId)
    expect(project!.status).toBe('costing')
  })

  it('BOQ has realistic total cost', async () => {
    const projectId = await loadDemoProject()
    const boqs = await db.boqs.where({ projectId }).toArray()
    expect(boqs[0].totalCents).toBeGreaterThan(3_000_000)
    expect(boqs[0].totalCents).toBeLessThan(5_000_000)
  })
})
