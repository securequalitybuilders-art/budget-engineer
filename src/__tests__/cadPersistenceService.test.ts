import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/db/db'
import {
  savePlanModel,
  loadPlanModel,
  hasSavedPlan,
  deletePlanModel,
} from '@/services/cadPersistenceService'
import type { PlanModel } from '@/domain/plan'
import { createSamplePlanModel, createAlternatePlanModel } from './fixtures/cadFixtures'

describe('cadPersistenceService', () => {
  beforeAll(async () => {
    await db.open()
  })

  afterAll(async () => {
    db.close()
  })

  it('savePlanModel stores a PlanModel to IndexedDB', async () => {
    const plan = createSamplePlanModel()
    await savePlanModel('proj-save', 'design-save', plan)
    const stored = await db.planModels.get('plan-proj-save-design-save')
    expect(stored).toBeDefined()
    expect(stored!.id).toBe('plan-proj-save-design-save')
    expect(stored!.projectId).toBe('proj-save')
    expect(stored!.designId).toBe('design-save')
    expect(stored!.savedAt).toBeDefined()
    expect(stored!.width).toBe(plan.width)
    expect(stored!.height).toBe(plan.height)
    expect(stored!.rooms).toEqual(plan.rooms)
    expect(stored!.walls).toEqual(plan.walls)
    expect(stored!.openings).toEqual(plan.openings)
    expect(stored!.scaleLabel).toBe(plan.scaleLabel)
  })

  it('savePlanModel overwrites existing record for same key', async () => {
    const plan1 = createSamplePlanModel({ wallThickness: 0.23 })
    const plan2 = createSamplePlanModel({ wallThickness: 0.30 })
    await savePlanModel('proj-overwrite', 'design-overwrite', plan1)
    await savePlanModel('proj-overwrite', 'design-overwrite', plan2)
    const stored = await db.planModels.get('plan-proj-overwrite-design-overwrite')
    expect(stored!.wallThickness).toBe(0.30)
  })

  it('loadPlanModel returns saved PlanModel without extra fields', async () => {
    const plan = createSamplePlanModel()
    await savePlanModel('proj-load', 'design-load', plan)
    const loaded = await loadPlanModel('proj-load', 'design-load')
    expect(loaded).not.toBeNull()
    expect(loaded!.designOptionId).toBe(plan.designOptionId)
    expect(loaded!.width).toBe(plan.width)
    expect(loaded!.height).toBe(plan.height)
    expect(loaded!.wallThickness).toBe(plan.wallThickness)
    expect(loaded!.walls).toEqual(plan.walls)
    expect(loaded!.rooms).toEqual(plan.rooms)
    expect(loaded!.openings).toEqual(plan.openings)
    expect(loaded!.scaleLabel).toBe(plan.scaleLabel)
    expect('projectId' in loaded!).toBe(false)
    expect('designId' in loaded!).toBe(false)
    expect('savedAt' in loaded!).toBe(false)
  })

  it('loadPlanModel returns null when no persisted CAD exists', async () => {
    const loaded = await loadPlanModel('proj-nonexistent', 'design-nonexistent')
    expect(loaded).toBeNull()
  })

  it('loadPlanModel returns null for empty projectId', async () => {
    const loaded = await loadPlanModel('', 'design-any')
    expect(loaded).toBeNull()
  })

  it('loadPlanModel returns null for empty designId', async () => {
    const loaded = await loadPlanModel('proj-any', '')
    expect(loaded).toBeNull()
  })

  it('saves multiple designIds and loads the correct one', async () => {
    const planA = createSamplePlanModel({ id: 'plan-a', designOptionId: 'design-a' })
    const planB = createAlternatePlanModel({ id: 'plan-b', designOptionId: 'design-b' })
    await savePlanModel('proj-multi', 'design-a', planA)
    await savePlanModel('proj-multi', 'design-b', planB)

    const loadedA = await loadPlanModel('proj-multi', 'design-a')
    const loadedB = await loadPlanModel('proj-multi', 'design-b')
    expect(loadedA).not.toBeNull()
    expect(loadedB).not.toBeNull()
    expect(loadedA!.designOptionId).toBe('design-a')
    expect(loadedB!.designOptionId).toBe('design-b')
    expect(loadedA!.width).not.toBe(loadedB!.width)
    expect(loadedA!.height).not.toBe(loadedB!.height)
  })

  it('hasSavedPlan returns true when plan exists', async () => {
    await savePlanModel('proj-exists', 'design-exists', createSamplePlanModel())
    const exists = await hasSavedPlan('proj-exists', 'design-exists')
    expect(exists).toBe(true)
  })

  it('hasSavedPlan returns false when plan does not exist', async () => {
    const exists = await hasSavedPlan('proj-missing', 'design-missing')
    expect(exists).toBe(false)
  })

  it('hasSavedPlan returns false for empty projectId', async () => {
    const exists = await hasSavedPlan('', 'design-any')
    expect(exists).toBe(false)
  })

  it('deletePlanModel removes stored plan', async () => {
    await savePlanModel('proj-delete', 'design-delete', createSamplePlanModel())
    expect(await hasSavedPlan('proj-delete', 'design-delete')).toBe(true)
    await deletePlanModel('proj-delete', 'design-delete')
    expect(await hasSavedPlan('proj-delete', 'design-delete')).toBe(false)
  })

  it('deletePlanModel is safe for missing record', async () => {
    await expect(deletePlanModel('proj-missing', 'design-missing')).resolves.not.toThrow()
  })

  it('handles missing/invalid inputs safely', async () => {
    await expect(savePlanModel('', '', null as unknown as PlanModel)).resolves.not.toThrow()
    const loaded = await loadPlanModel('', '')
    expect(loaded).toBeNull()
    const exists = await hasSavedPlan('', '')
    expect(exists).toBe(false)
  })

  it('does not throw if IndexedDB table is empty', async () => {
    const loaded = await loadPlanModel('random-proj', 'random-design')
    expect(loaded).toBeNull()
    const exists = await hasSavedPlan('random-proj', 'random-design')
    expect(exists).toBe(false)
  })

  it('stored record includes savedAt timestamp', async () => {
    const plan = createSamplePlanModel()
    await savePlanModel('proj-ts', 'design-ts', plan)
    const stored = await db.planModels.get('plan-proj-ts-design-ts')
    expect(stored!.savedAt).toBeDefined()
    const parsed = new Date(stored!.savedAt)
    expect(parsed.getTime()).not.toBeNaN()
    expect(parsed.getFullYear()).toBeGreaterThanOrEqual(2026)
  })

  it('loadPlanModel returns a copy, not the stored reference', async () => {
    const plan = createSamplePlanModel()
    await savePlanModel('proj-ref', 'design-ref', plan)
    const loaded = await loadPlanModel('proj-ref', 'design-ref')
    expect(loaded).not.toBeNull()
    expect(loaded!.rooms[0].name).toBe('Living Room')
    loaded!.rooms[0].name = 'Modified'
    const loadedAgain = await loadPlanModel('proj-ref', 'design-ref')
    expect(loadedAgain!.rooms[0].name).toBe('Living Room')
  })
})
