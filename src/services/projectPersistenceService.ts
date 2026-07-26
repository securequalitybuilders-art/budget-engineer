import { db } from '@/db/db'
import type { DesignOption } from '@/domain/boq'
import type { BimModel } from '@/domain/bim'
import type { BOQ as Ws3Boq } from '@/lib/boq/boq-types'
import type { Design, BOQ as StoreBoq, BOQSection, BOQItem, ProjectTransaction, TransactionAction, TransactionEntity } from '@/types'
import { uuid } from '@/lib/utils'

const SRC = { source: 'local-ai', sprint: '6', localOnly: true } as const

function safeAsync<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return fn() } catch { return Promise.resolve(fallback) }
}

function mapDesignOptionElementsToStore(els: DesignOption['elements']) {
  return els.map((el) => ({
    id: el.id,
    category: el.category as Design['elements'][number]['category'],
    material: 'concrete',
    dimensions: {} as Record<string, number>,
    quantity: { value: el.quantity, unit: 'each' as const, formula: `${el.quantity}` },
  }))
}

function mapStoreElementsToDesignOption(els: Design['elements']) {
  return els.map((el) => ({
    id: el.id,
    type: el.category,
    category: el.category,
    name: el.category,
    unit: el.quantity.unit,
    quantity: el.quantity.value,
  }))
}

function designOptionToStoreDesign(projectId: string, opt: DesignOption, index: number): Design {
  return {
    id: opt.id,
    projectId,
    name: opt.name,
    optionIndex: index,
    parameters: { areaM2: opt.grossFloorArea, floors: opt.floors },
    elements: mapDesignOptionElementsToStore(opt.elements),
    buildingType: opt.buildingType || 'house',
    generatedAt: new Date().toISOString(),
  }
}

export async function persistDesigns(projectId: string, options: DesignOption[]): Promise<void> {
  if (!projectId || options.length === 0) return
  await safeAsync(async () => {
    const designs = options.map((opt, i) => designOptionToStoreDesign(projectId, opt, i))
    for (const d of designs) {
      await db.designs.put(d)
    }
  }, undefined)
}

export async function loadPersistedDesignOptions(projectId: string): Promise<DesignOption[]> {
  if (!projectId) return []
  try {
    const designs = await db.designs.where({ projectId }).toArray()
    return designs.map((d) => ({
      id: d.id,
      name: d.name,
      grossFloorArea: d.parameters.areaM2 ?? 150,
      floors: d.parameters.floors ?? 1,
      buildingType: d.buildingType || 'house',
      elements: mapStoreElementsToDesignOption(d.elements),
    }))
  } catch {
    return []
  }
}

export async function persistBimModel(bim: BimModel): Promise<void> {
  if (!bim) return
  await safeAsync(async () => {
    await db.bimModels.put({ ...bim, projectId: bim.projectId || '' })
  }, undefined)
}

function ws3BoqToStoreBoq(ws3boq: Ws3Boq, projectId: string, designId: string): StoreBoq {
  const sectionMap = new Map<string, BOQItem[]>()
  for (const item of ws3boq.items) {
    const cat = item.category || 'General'
    if (!sectionMap.has(cat)) sectionMap.set(cat, [])
    sectionMap.get(cat)!.push({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      rateCents: Math.round((item.rate ?? 0) * 100),
      totalCents: Math.round((item.total ?? 0) * 100),
      elementIds: [],
      source: 'auto',
      aiConfidence: 85,
    })
  }
  const sections: BOQSection[] = []
  for (const [cat, items] of sectionMap) {
    sections.push({
      id: `section-${cat.toLowerCase().replace(/\s+/g, '-')}`,
      code: cat.toUpperCase().slice(0, 3),
      title: cat,
      items,
      subtotalCents: items.reduce((s, i) => s + i.totalCents, 0),
    })
  }
  return {
    id: ws3boq.id,
    projectId,
    designId,
    sections,
    totalCents: Math.round((ws3boq.summary?.grandTotal ?? 0) * 100),
    contingencyCents: Math.round((ws3boq.summary?.contingency ?? 0) * 100),
    currency: ws3boq.currency || 'USD',
    generatedAt: new Date().toISOString(),
  }
}

export async function persistBoq(projectId: string, designId: string, boq: Ws3Boq): Promise<void> {
  if (!projectId || !designId || !boq) return
  await safeAsync(async () => {
    const storeBoq = ws3BoqToStoreBoq(boq, projectId, designId)
    await db.boqs.put(storeBoq)
  }, undefined)
}

export async function logTransaction(
  projectId: string,
  action: TransactionAction,
  entityType: TransactionEntity,
  entityId: string,
  reason: string,
  metadata?: { after?: unknown },
): Promise<void> {
  if (!projectId) return
  await safeAsync(async () => {
    const tx: ProjectTransaction = {
      id: uuid(),
      projectId,
      actor: 'AI_AGENT',
      action,
      entityType,
      entityId,
      after: { ...SRC, ...(metadata?.after ?? {}) },
      reason,
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(tx)
  }, undefined)
}

export async function loadPersistedProjectWork(projectId: string): Promise<{
  designs: DesignOption[]
  bimModels: BimModel[]
  hasBoqs: boolean
}> {
  if (!projectId) return { designs: [], bimModels: [], hasBoqs: false }
  let designs: DesignOption[] = []
  let bims: BimModel[] = []
  let boqCount = 0
  try {
    designs = await loadPersistedDesignOptions(projectId)
    bims = await db.bimModels.where({ projectId }).toArray()
    boqCount = await db.boqs.where({ projectId }).count()
  } catch { /* ignore */ }
  return { designs, bimModels: bims, hasBoqs: boqCount > 0 }
}
