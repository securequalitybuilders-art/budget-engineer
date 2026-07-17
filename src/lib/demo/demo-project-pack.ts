import { db, seedRates } from '@/db/db'
import { uuid } from '@/lib/utils'
import type { Project, Brief, Design, BOQ, ProjectTransaction } from '@/types'
import type { PlanModel } from '@/domain/plan'
import type { CadDocument } from '@/domain/cad'

export const DEMO_PROJECT_NAME = 'Demo Residence'

export const DEMO_BRIEF_TEXT = [
  'I want to build a modern 3-bedroom family house. The house should have an open-plan living/dining/kitchen area, 3 bedrooms (master with en-suite), a family bathroom, guest toilet, and a covered patio.',
  'It should be a single-storey building with a floor area of roughly 120m². I prefer face brick exterior with plastered internal walls, aluminium windows, and a corrugated iron roof.',
  'The site is in Harare, Zimbabwe. The budget is around USD 45,000. I want the house to meet ZBC 1996 building standards.',
].join(' ')

const now = () => new Date().toISOString()

function makeProject(): Project {
  return {
    id: uuid(),
    slug: 'demo-residence',
    name: DEMO_PROJECT_NAME,
    ownerId: 'local-user',
    profile: 'first-time',
    region: 'zimbabwe',
    currency: 'USD',
    status: 'costing',
    createdAt: now(),
    updatedAt: now(),
    version: 4,
  }
}

function makeBrief(projectId: string): Brief {
  return {
    projectId,
    rawText: DEMO_BRIEF_TEXT,
    parsed: {
      buildingType: 'house',
      floors: 1,
      bedrooms: 3,
      areaM2: 120,
      budgetCents: 4_500_000,
      location: 'harare, zimbabwe',
      standards: ['ZBC 1996'],
    },
    aiReasoning: 'Parsed from demo brief: 3-bedroom family house, 120m², single-storey, Harare.',
  }
}

function makeDesigns(projectId: string): Design[] {
  const base = {
    projectId,
    buildingType: 'house',
    generatedAt: now(),
  }
  return [
    {
      ...base,
      id: uuid(),
      name: 'Standard Layout',
      optionIndex: 0,
      parameters: { width: 12, depth: 10, areaM2: 120, bedrooms: 3, floors: 1, roofPitch: 25 },
      elements: [
        { id: uuid(), category: 'wall', material: 'brick', dimensions: { length: 44, height: 3 }, quantity: { value: 132, unit: 'm2', formula: '44m × 3m' } },
        { id: uuid(), category: 'slab', material: 'concrete', dimensions: { width: 12, length: 10 } as any, quantity: { value: 120, unit: 'm2', formula: '12m × 10m' } },
        { id: uuid(), category: 'roof', material: 'corrugated iron', dimensions: { width: 14, length: 11, count: 1 }, quantity: { value: 154, unit: 'm2', formula: '14m × 11m' } },
        { id: uuid(), category: 'foundation', material: 'concrete', dimensions: { length: 44, width: 0.5 } as any, quantity: { value: 13.2, unit: 'm3', formula: '44m × 0.5m × 0.6m' } },
        { id: uuid(), category: 'opening', material: 'aluminium', dimensions: { count: 8, width: 1.2, height: 1.2 }, quantity: { value: 8, unit: 'each', formula: '8 windows' } },
        { id: uuid(), category: 'opening', material: 'timber', dimensions: { count: 5, width: 0.9, height: 2.1 }, quantity: { value: 5, unit: 'each', formula: '5 doors' } },
      ],
    },
    {
      ...base,
      id: uuid(),
      name: 'Compact Design',
      optionIndex: 1,
      parameters: { width: 10, depth: 10, areaM2: 100, bedrooms: 3, floors: 1, roofPitch: 25 },
      elements: [
        { id: uuid(), category: 'wall', material: 'brick', dimensions: { length: 40, height: 3 }, quantity: { value: 120, unit: 'm2', formula: '40m × 3m' } },
        { id: uuid(), category: 'slab', material: 'concrete', dimensions: { width: 10, length: 10 } as any, quantity: { value: 100, unit: 'm2', formula: '10m × 10m' } },
        { id: uuid(), category: 'roof', material: 'corrugated iron', dimensions: { width: 12, length: 11, count: 1 }, quantity: { value: 132, unit: 'm2', formula: '12m × 11m' } },
        { id: uuid(), category: 'foundation', material: 'concrete', dimensions: { length: 40, width: 0.5 } as any, quantity: { value: 12, unit: 'm3', formula: '40m × 0.5m × 0.6m' } },
        { id: uuid(), category: 'opening', material: 'aluminium', dimensions: { count: 6, width: 1.2, height: 1.2 }, quantity: { value: 6, unit: 'each', formula: '6 windows' } },
        { id: uuid(), category: 'opening', material: 'timber', dimensions: { count: 4, width: 0.9, height: 2.1 }, quantity: { value: 4, unit: 'each', formula: '4 doors' } },
      ],
    },
    {
      ...base,
      id: uuid(),
      name: 'Spacious Family Home',
      optionIndex: 2,
      parameters: { width: 14, depth: 10, areaM2: 140, bedrooms: 3, floors: 1, roofPitch: 30 },
      elements: [
        { id: uuid(), category: 'wall', material: 'brick', dimensions: { length: 48, height: 3 }, quantity: { value: 144, unit: 'm2', formula: '48m × 3m' } },
        { id: uuid(), category: 'slab', material: 'concrete', dimensions: { width: 14, length: 10 } as any, quantity: { value: 140, unit: 'm2', formula: '14m × 10m' } },
        { id: uuid(), category: 'roof', material: 'corrugated iron', dimensions: { width: 16, length: 11, count: 1 }, quantity: { value: 176, unit: 'm2', formula: '16m × 11m' } },
        { id: uuid(), category: 'foundation', material: 'concrete', dimensions: { length: 48, width: 0.5 } as any, quantity: { value: 14.4, unit: 'm3', formula: '48m × 0.5m × 0.6m' } },
        { id: uuid(), category: 'opening', material: 'aluminium', dimensions: { count: 10, width: 1.2, height: 1.2 }, quantity: { value: 10, unit: 'each', formula: '10 windows' } },
        { id: uuid(), category: 'opening', material: 'timber', dimensions: { count: 6, width: 0.9, height: 2.1 }, quantity: { value: 6, unit: 'each', formula: '6 doors' } },
      ],
    },
  ]
}

function makePlanModel(designId: string): PlanModel {
  return {
    id: uuid(),
    designOptionId: designId,
    width: 12,
    height: 10,
    wallThickness: 0.23,
    rooms: [
      { id: uuid(), name: 'Living / Dining', x: 0, y: 0, width: 6, height: 6 },
      { id: uuid(), name: 'Kitchen', x: 6, y: 0, width: 4, height: 6 },
      { id: uuid(), name: 'Master Bedroom', x: 0, y: 6, width: 5, height: 4 },
      { id: uuid(), name: 'En-suite', x: 0, y: 6, width: 2.5, height: 4 },
      { id: uuid(), name: 'Bedroom 2', x: 5, y: 6, width: 3.5, height: 4 },
      { id: uuid(), name: 'Bedroom 3', x: 8.5, y: 6, width: 3.5, height: 4 },
      { id: uuid(), name: 'Family Bathroom', x: 5, y: 6, width: 2.5, height: 4 },
      { id: uuid(), name: 'Guest Toilet', x: 5, y: 0, width: 2, height: 4 },
      { id: uuid(), name: 'Covered Patio', x: 6, y: 6, width: 6, height: 4 },
    ],
    walls: [
      { id: uuid(), start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, type: 'external' },
      { id: uuid(), start: { x: 12, y: 0 }, end: { x: 12, y: 10 }, thickness: 0.23, type: 'external' },
      { id: uuid(), start: { x: 12, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.23, type: 'external' },
      { id: uuid(), start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, thickness: 0.23, type: 'external' },
      { id: uuid(), start: { x: 6, y: 0 }, end: { x: 6, y: 6 }, thickness: 0.15, type: 'internal' },
      { id: uuid(), start: { x: 0, y: 6 }, end: { x: 12, y: 6 }, thickness: 0.15, type: 'internal' },
      { id: uuid(), start: { x: 5, y: 6 }, end: { x: 5, y: 10 }, thickness: 0.15, type: 'internal' },
      { id: uuid(), start: { x: 2.5, y: 6 }, end: { x: 2.5, y: 10 }, thickness: 0.15, type: 'internal' },
      { id: uuid(), start: { x: 8.5, y: 6 }, end: { x: 8.5, y: 10 }, thickness: 0.15, type: 'internal' },
      { id: uuid(), start: { x: 5, y: 0 }, end: { x: 5, y: 4 }, thickness: 0.15, type: 'internal' },
      { id: uuid(), start: { x: 7, y: 0 }, end: { x: 7, y: 4 }, thickness: 0.15, type: 'internal' },
    ],
    openings: [
      { id: uuid(), wallId: 'w-bottom', kind: 'door', offset: 0.5, width: 0.9 },
      { id: uuid(), wallId: 'w-bottom', kind: 'window', offset: 0.2, width: 1.2 },
      { id: uuid(), wallId: 'w-right', kind: 'window', offset: 0.3, width: 1.5 },
      { id: uuid(), wallId: 'w-right', kind: 'window', offset: 0.7, width: 1.2 },
      { id: uuid(), wallId: 'w-top', kind: 'window', offset: 0.25, width: 1.2 },
      { id: uuid(), wallId: 'w-top', kind: 'window', offset: 0.6, width: 1.2 },
      { id: uuid(), wallId: 'w-left', kind: 'window', offset: 0.4, width: 1.2 },
      { id: uuid(), wallId: 'internal-1', kind: 'door', offset: 0.5, width: 0.9 },
      { id: uuid(), wallId: 'internal-2', kind: 'door', offset: 0.3, width: 0.9 },
      { id: uuid(), wallId: 'internal-3', kind: 'door', offset: 0.5, width: 0.9 },
    ],
    scaleLabel: '1:100',
  }
}

function makeBOQ(projectId: string, designId: string): BOQ {
  const items = [
    { id: uuid(), description: 'Excavation for foundations', quantity: 15, unit: 'm3', rateCents: 2500, totalCents: 37500, elementIds: [], source: 'auto' as const, aiConfidence: 0.9 },
    { id: uuid(), description: 'Strip footing concrete (1:3:6 mix)', quantity: 13.2, unit: 'm3', rateCents: 8500, totalCents: 112200, elementIds: [], source: 'auto' as const, aiConfidence: 0.9 },
    { id: uuid(), description: 'Common clay brick walling (230mm)', quantity: 132, unit: 'm2', rateCents: 3500, totalCents: 462000, elementIds: [], source: 'auto' as const, aiConfidence: 0.85 },
    { id: uuid(), description: 'Reinforced concrete slab (150mm)', quantity: 120, unit: 'm2', rateCents: 8500, totalCents: 1020000, elementIds: [], source: 'auto' as const, aiConfidence: 0.85 },
    { id: uuid(), description: 'Corrugated iron roofing', quantity: 154, unit: 'm2', rateCents: 1200, totalCents: 184800, elementIds: [], source: 'auto' as const, aiConfidence: 0.9 },
    { id: uuid(), description: 'Timber roof trusses', quantity: 120, unit: 'm2', rateCents: 800, totalCents: 96000, elementIds: [], source: 'auto' as const, aiConfidence: 0.8 },
    { id: uuid(), description: 'Aluminium window frames + glass', quantity: 8, unit: 'each', rateCents: 15000, totalCents: 120000, elementIds: [], source: 'auto' as const, aiConfidence: 0.85 },
    { id: uuid(), description: 'Timber flush doors', quantity: 5, unit: 'each', rateCents: 12000, totalCents: 60000, elementIds: [], source: 'auto' as const, aiConfidence: 0.85 },
    { id: uuid(), description: 'Plastering internal walls', quantity: 264, unit: 'm2', rateCents: 800, totalCents: 211200, elementIds: [], source: 'auto' as const, aiConfidence: 0.8 },
    { id: uuid(), description: 'Floor screed + tiling', quantity: 100, unit: 'm2', rateCents: 2500, totalCents: 250000, elementIds: [], source: 'auto' as const, aiConfidence: 0.75 },
    { id: uuid(), description: 'Plumbing rough-in + fixtures', quantity: 1, unit: 'lump sum', rateCents: 250000, totalCents: 250000, elementIds: [], source: 'auto' as const, aiConfidence: 0.7 },
    { id: uuid(), description: 'Electrical rough-in + fittings', quantity: 1, unit: 'lump sum', rateCents: 200000, totalCents: 200000, elementIds: [], source: 'auto' as const, aiConfidence: 0.7 },
    { id: uuid(), description: 'Paint — internal walls', quantity: 264, unit: 'm2', rateCents: 500, totalCents: 132000, elementIds: [], source: 'auto' as const, aiConfidence: 0.8 },
    { id: uuid(), description: 'Ceiling — plasterboard', quantity: 120, unit: 'm2', rateCents: 1800, totalCents: 216000, elementIds: [], source: 'auto' as const, aiConfidence: 0.8 },
  ]
  const totalCents = items.reduce((s, i) => s + i.totalCents, 0)
  return {
    id: uuid(),
    projectId,
    designId,
    sections: [
      { id: uuid(), code: 'SUB', title: 'Substructure', items: items.slice(0, 2), subtotalCents: items.slice(0, 2).reduce((s, i) => s + i.totalCents, 0) },
      { id: uuid(), code: 'SUP', title: 'Superstructure', items: items.slice(2, 6), subtotalCents: items.slice(2, 6).reduce((s, i) => s + i.totalCents, 0) },
      { id: uuid(), code: 'FIN', title: 'Finishes', items: items.slice(6, 11), subtotalCents: items.slice(6, 11).reduce((s, i) => s + i.totalCents, 0) },
      { id: uuid(), code: 'MEP', title: 'MEP Services', items: items.slice(11, 14), subtotalCents: items.slice(11, 14).reduce((s, i) => s + i.totalCents, 0) },
    ],
    totalCents,
    contingencyCents: Math.round(totalCents * 0.1),
    currency: 'USD',
    generatedAt: now(),
    pricingRegion: 'zimbabwe',
    estimateDepth: 'detailed',
  }
}

function makeTransactions(projectId: string, designs: Design[], boq: BOQ): ProjectTransaction[] {
  const ts = now()
  return [
    { id: uuid(), projectId, actor: 'USER', action: 'CREATE', entityType: 'project', entityId: projectId, after: { name: DEMO_PROJECT_NAME }, reason: 'Demo project created', createdAt: ts },
    { id: uuid(), projectId, actor: 'USER', action: 'UPDATE', entityType: 'brief', entityId: projectId, after: { buildingType: 'house', floors: 1 }, reason: 'Demo brief loaded', createdAt: ts },
    { id: uuid(), projectId, actor: 'AI_AGENT', action: 'AI_GENERATE', entityType: 'design', entityId: projectId, after: { count: designs.length }, reason: 'Demo designs generated', createdAt: ts },
    { id: uuid(), projectId, actor: 'AI_AGENT', action: 'CREATE', entityType: 'boq', entityId: boq.id, after: { totalCents: boq.totalCents }, reason: 'Demo BOQ generated', createdAt: ts },
  ]
}

function makeCadDocument(projectId: string, plan: PlanModel): CadDocument {
  return {
    id: uuid(),
    projectId,
    designId: '',
    activeFloorId: 'ground',
    activeTool: 'select',
    floors: [{ id: 'ground', name: 'Ground Floor', elevation: 0, bim: { classification: 'floor' } }],
    layers: [],
    walls: plan.walls.map((w) => ({
      id: uuid(),
      floorId: 'ground',
      start: { x: w.start.x, y: w.start.y },
      end: { x: w.end.x, y: w.end.y },
      thickness: w.thickness,
      structuralRole: w.type,
      layerId: 'walls' as const,
      bim: { classification: 'wall', material: 'brick' },
    })),
    openings: plan.openings.map((o) => ({
      id: uuid(),
      wallId: 'w-ground',
      floorId: 'ground',
      kind: o.kind,
      offsetRatio: o.offset,
      width: o.width,
      sillHeight: o.kind === 'window' ? 0.9 : 0,
      headHeight: 2.1,
      layerId: 'openings' as const,
      bim: { classification: 'opening', typeName: o.kind },
    })),
    annotations: [],
    blocks: [],
    boundaries: [],
  }
}

export async function loadDemoProject(): Promise<string> {
  await seedRates()

  const project = makeProject()
  const brief = makeBrief(project.id)
  const designs = makeDesigns(project.id)
  const boq = makeBOQ(project.id, designs[0].id)
  const plan = makePlanModel(designs[0].id)
  const cad = makeCadDocument(project.id, plan)
  const transactions = makeTransactions(project.id, designs, boq)

  await db.projects.add(project)
  await db.briefs.put(brief)
  for (const d of designs) await db.designs.add(d)

  const planModelRecord = {
    ...plan,
    id: `plan-${project.id}-${designs[0].id}`,
    projectId: project.id,
    designId: designs[0].id,
    savedAt: now(),
  }
  await db.planModels.put(planModelRecord)
  await db.boqs.add(boq)
  await db.cadDocs.add(cad)
  for (const tx of transactions) await db.transactions.add(tx)

  return project.id
}

export async function demoProjectExists(): Promise<boolean> {
  const all = await db.projects.toArray()
  return all.some((p) => p.name === DEMO_PROJECT_NAME)
}
