import { db } from '@/db/db'
import { uuid } from '@/lib/utils'

const CURRENT_VERSION = 3

export interface ProjectExportPackage {
  version: number
  format: string
  exportedAt: string
  project: unknown
  brief: unknown | null
  designs: unknown[]
  boqs: unknown[]
  transactions: unknown[]
  cadDocs: unknown[]
  bimModels: unknown[]
  governance: unknown | null
  snapshots: unknown[]
  planModels: unknown[]

  // P22 lifecycle tables
  projectIntakes: unknown[]
  feasibilityAssessments: unknown[]
  riskGates: unknown[]
  riskRegister: unknown[]
  solvencyChecks: unknown[]
  milestones: unknown[]
  contractorProfiles: unknown[]
  subcontractorProfiles: unknown[]
  supplierProfiles: unknown[]
  consultantProfiles: unknown[]
  procurementRequests: unknown[]
  supplierQuotes: unknown[]
  purchaseOrders: unknown[]
  deliveryRecords: unknown[]
  changeOrders: unknown[]
  rfis: unknown[]
  submittals: unknown[]
  siteInspections: unknown[]
  ncrs: unknown[]
  snagItems: unknown[]
  completionStages: unknown[]
  snagLists: unknown[]
  handoverPackages: unknown[]
  assetRegister: unknown[]
  warrantyRecords: unknown[]
  oAndMRecords: unknown[]
  projectControlsBaselines: unknown[]
  projectControlsSnapshots: unknown[]
}

async function fetchAllProjectData(projectId: string): Promise<ProjectExportPackage> {
  const [project, brief, designs, boqs, transactions, cadDocs, bimModels, governance, versionSnapshots, planModels,
    projectIntakes, feasibilityAssessments, riskGates, riskRegister, solvencyChecks,
    milestones, contractorProfiles, subcontractorProfiles, supplierProfiles, consultantProfiles,
    procurementRequests, supplierQuotes, purchaseOrders, deliveryRecords,
    changeOrders, rfis, submittals, siteInspections, ncrs, snagItems,
    completionStages, snagLists, handoverPackages, assetRegister, warrantyRecords, oAndMRecords,
    projectControlsBaselines, projectControlsSnapshots] = await Promise.all([
    db.projects.get(projectId),
    db.briefs.get(projectId),
    db.designs.where({ projectId }).toArray(),
    db.boqs.where({ projectId }).toArray(),
    db.transactions.where({ projectId }).toArray(),
    db.cadDocs.where({ projectId }).toArray(),
    db.bimModels.where({ projectId }).toArray(),
    db.governance.get(projectId),
    db.snapshots.where({ projectId }).toArray(),
    db.planModels.where({ projectId }).toArray(),
    db.projectIntakes.where({ projectId }).toArray(),
    db.feasibilityAssessments.where({ projectId }).toArray(),
    db.riskGates.where({ projectId }).toArray(),
    db.riskRegister.where({ projectId }).toArray(),
    db.solvencyChecks.where({ projectId }).toArray(),
    db.milestones.where({ projectId }).toArray(),
    db.contractorProfiles.where({ projectId: projectId }).toArray() as Promise<unknown[]>,
    db.subcontractorProfiles.where({ projectId: projectId }).toArray() as Promise<unknown[]>,
    db.supplierProfiles.where({ projectId: projectId }).toArray() as Promise<unknown[]>,
    db.consultantProfiles.where({ projectId: projectId }).toArray() as Promise<unknown[]>,
    db.procurementRequests.where({ projectId }).toArray() as Promise<Array<{ id: string }>>,
    db.supplierQuotes.toArray() as Promise<unknown[]>,
    db.purchaseOrders.where({ projectId }).toArray() as Promise<Array<{ id: string }>>,
    db.deliveryRecords.toArray() as Promise<unknown[]>,
    db.changeOrders.where({ projectId }).toArray(),
    db.rfis.where({ projectId }).toArray(),
    db.submittals.where({ projectId }).toArray(),
    db.siteInspections.where({ projectId }).toArray(),
    db.ncrs.where({ projectId }).toArray(),
    db.snagItems.where({ projectId }).toArray(),
    db.completionStages.where({ projectId }).toArray(),
    db.snagLists.where({ projectId }).toArray(),
    db.handoverPackages.where({ projectId }).toArray(),
    db.assetRegister.where({ projectId }).toArray(),
    db.warrantyRecords.where({ projectId }).toArray(),
    db.oAndMRecords.where({ projectId }).toArray(),
    db.projectControlsBaselines.where({ projectId }).toArray(),
    db.projectControlsSnapshots.where({ projectId }).toArray(),
  ])

  const procurementReqIds = new Set(procurementRequests.map((r) => r.id))
  const poIds = new Set(purchaseOrders.map((po) => po.id))
  const scopedSupplierQuotes = (supplierQuotes as Array<Record<string, unknown>>).filter((q) => procurementReqIds.has(q.procurementRequestId as string))
  const scopedDeliveryRecords = (deliveryRecords as Array<Record<string, unknown>>).filter((d) => poIds.has(d.purchaseOrderId as string))

  return {
    version: CURRENT_VERSION,
    format: 'budget-engineer-project',
    exportedAt: new Date().toISOString(),
    project: project ?? null,
    brief: brief ?? null,
    designs: designs ?? [],
    boqs: boqs ?? [],
    transactions: transactions ?? [],
    cadDocs: cadDocs ?? [],
    bimModels: bimModels ?? [],
    governance: governance ?? null,
    snapshots: versionSnapshots ?? [],
    planModels: planModels ?? [],
    projectIntakes: projectIntakes ?? [],
    feasibilityAssessments: feasibilityAssessments ?? [],
    riskGates: riskGates ?? [],
    riskRegister: riskRegister ?? [],
    solvencyChecks: solvencyChecks ?? [],
    milestones: milestones ?? [],
    contractorProfiles: contractorProfiles ?? [],
    subcontractorProfiles: subcontractorProfiles ?? [],
    supplierProfiles: supplierProfiles ?? [],
    consultantProfiles: consultantProfiles ?? [],
    procurementRequests: procurementRequests ?? [],
    supplierQuotes: scopedSupplierQuotes,
    purchaseOrders: purchaseOrders ?? [],
    deliveryRecords: scopedDeliveryRecords,
    changeOrders: changeOrders ?? [],
    rfis: rfis ?? [],
    submittals: submittals ?? [],
    siteInspections: siteInspections ?? [],
    ncrs: ncrs ?? [],
    snagItems: snagItems ?? [],
    completionStages: completionStages ?? [],
    snagLists: snagLists ?? [],
    handoverPackages: handoverPackages ?? [],
    assetRegister: assetRegister ?? [],
    warrantyRecords: warrantyRecords ?? [],
    oAndMRecords: oAndMRecords ?? [],
    projectControlsBaselines: projectControlsBaselines ?? [],
    projectControlsSnapshots: projectControlsSnapshots ?? [],
  }
}

export async function exportProjectPackage(projectId: string): Promise<Blob | null> {
  if (!projectId) return null
  const data = await fetchAllProjectData(projectId)
  if (!data.project) return null
  const json = JSON.stringify(data, null, 2)
  return new Blob([json], { type: 'application/json' })
}

function migrateData(data: ProjectExportPackage): ProjectExportPackage {
  data.version = CURRENT_VERSION
  if (!data.projectIntakes) data.projectIntakes = []
  if (!data.feasibilityAssessments) data.feasibilityAssessments = []
  if (!data.riskGates) data.riskGates = []
  if (!data.riskRegister) data.riskRegister = []
  if (!data.solvencyChecks) data.solvencyChecks = []
  if (!data.milestones) data.milestones = []
  if (!data.procurementRequests) data.procurementRequests = []
  if (!data.supplierQuotes) data.supplierQuotes = []
  if (!data.purchaseOrders) data.purchaseOrders = []
  if (!data.deliveryRecords) data.deliveryRecords = []
  if (!data.changeOrders) data.changeOrders = []
  if (!data.rfis) data.rfis = []
  if (!data.submittals) data.submittals = []
  if (!data.siteInspections) data.siteInspections = []
  if (!data.ncrs) data.ncrs = []
  if (!data.snagItems) data.snagItems = []
  if (!data.completionStages) data.completionStages = []
  if (!data.snagLists) data.snagLists = []
  if (!data.handoverPackages) data.handoverPackages = []
  if (!data.assetRegister) data.assetRegister = []
  if (!data.warrantyRecords) data.warrantyRecords = []
  if (!data.oAndMRecords) data.oAndMRecords = []
  if (!data.projectControlsBaselines) data.projectControlsBaselines = []
  if (!data.projectControlsSnapshots) data.projectControlsSnapshots = []
  return data
}

const LIFECYCLE_TABLES = [
  'projectIntakes', 'feasibilityAssessments', 'riskGates', 'riskRegister', 'solvencyChecks',
  'milestones',
  'procurementRequests', 'supplierQuotes', 'purchaseOrders', 'deliveryRecords',
  'changeOrders', 'rfis', 'submittals', 'siteInspections', 'ncrs', 'snagItems',
  'completionStages', 'snagLists', 'handoverPackages', 'assetRegister', 'warrantyRecords', 'oAndMRecords',
  'projectControlsBaselines', 'projectControlsSnapshots',
] as const

export async function importProjectPackage(blob: Blob): Promise<string | null> {
  const text = await blob.text()
  let data: ProjectExportPackage
  try {
    data = JSON.parse(text) as ProjectExportPackage
  } catch {
    return null
  }
  if (!data.project || !data.version) return null
  const pkg = data.project as { id: string; name: string }
  if (!pkg.id || !pkg.name) return null

  data = migrateData(data)

  await db.transaction('rw', [
    db.projects, db.briefs, db.designs, db.boqs, db.transactions,
    db.cadDocs, db.bimModels, db.governance, db.snapshots, db.planModels,
    db.projectIntakes, db.feasibilityAssessments, db.riskGates, db.riskRegister, db.solvencyChecks,
    db.milestones,
    db.procurementRequests, db.supplierQuotes, db.purchaseOrders, db.deliveryRecords,
    db.changeOrders, db.rfis, db.submittals, db.siteInspections, db.ncrs, db.snagItems,
    db.completionStages, db.snagLists, db.handoverPackages, db.assetRegister, db.warrantyRecords, db.oAndMRecords,
    db.projectControlsBaselines, db.projectControlsSnapshots,
  ], async () => {
    await db.projects.put(data.project as never)
    if (data.brief) await db.briefs.put(data.brief as never)
    if (data.designs.length > 0) await db.designs.bulkPut(data.designs as never[])
    if (data.boqs.length > 0) await db.boqs.bulkPut(data.boqs as never[])
    if (data.transactions.length > 0) await db.transactions.bulkPut(data.transactions as never[])
    if (data.cadDocs.length > 0) await db.cadDocs.bulkPut(data.cadDocs as never[])
    if (data.bimModels.length > 0) await db.bimModels.bulkPut(data.bimModels as never[])
    if (data.governance) await db.governance.put(data.governance as never)
    if (data.snapshots.length > 0) await db.snapshots.bulkPut(data.snapshots as never[])
    if (data.planModels.length > 0) await db.planModels.bulkPut(data.planModels as never[])

    for (const tableName of LIFECYCLE_TABLES) {
      const records = data[tableName] as unknown[]
      if (records.length > 0) {
        const table = db.table(tableName)
        await table.bulkPut(records as never[])
      }
    }
  })

  return pkg.id
}

export async function importProjectAsCopy(blob: Blob): Promise<string | null> {
  const text = await blob.text()
  let data: ProjectExportPackage
  try {
    data = JSON.parse(text) as ProjectExportPackage
  } catch {
    return null
  }
  if (!data.project || !data.version) return null
  const pkg = data.project as { name: string }
  if (!pkg.name) return null

  data = migrateData(data)

  const oldToNew = new Map<string, string>()

  function remap<T extends { id: string }>(item: T): T {
    const newId = uuid()
    oldToNew.set(item.id, newId)
    return { ...item, id: newId }
  }

  function remapId(id: string): string {
    return oldToNew.get(id) ?? id
  }

  const now = new Date().toISOString()
  const oldProject = data.project as Record<string, unknown>
  const newProjectId = uuid()
  const newProject = {
    ...oldProject,
    id: newProjectId,
    name: `${oldProject.name as string} (imported)`,
    createdAt: now,
    updatedAt: now,
    version: 1,
  }

  await db.transaction('rw', [
    db.projects, db.briefs, db.designs, db.boqs, db.transactions,
    db.cadDocs, db.bimModels, db.governance, db.snapshots, db.planModels,
    db.projectIntakes, db.feasibilityAssessments, db.riskGates, db.riskRegister, db.solvencyChecks,
    db.milestones,
    db.procurementRequests, db.supplierQuotes, db.purchaseOrders, db.deliveryRecords,
    db.changeOrders, db.rfis, db.submittals, db.siteInspections, db.ncrs, db.snagItems,
    db.completionStages, db.snagLists, db.handoverPackages, db.assetRegister, db.warrantyRecords, db.oAndMRecords,
    db.projectControlsBaselines, db.projectControlsSnapshots,
  ], async () => {
    await db.projects.put(newProject as never)

    if (data.brief) {
      const b = data.brief as Record<string, unknown>
      await db.briefs.put({ ...b, projectId: newProjectId } as never)
    }

    if (data.designs.length > 0) {
      const remappedDesigns = (data.designs as Array<Record<string, unknown>>).map((d) => ({
        ...d,
        id: remap({ id: d.id as string }).id,
        projectId: newProjectId,
      }))
      await db.designs.bulkAdd(remappedDesigns as never[])
    }

    if (data.boqs.length > 0) {
      const remappedBoqs = (data.boqs as Array<Record<string, unknown>>).map((b) => ({
        ...b,
        id: remap({ id: b.id as string }).id,
        projectId: newProjectId,
        designId: remapId(b.designId as string),
      }))
      await db.boqs.bulkAdd(remappedBoqs as never[])
    }

    if (data.planModels.length > 0) {
      const remappedPlans = (data.planModels as Array<Record<string, unknown>>).map((p) => ({
        ...p,
        id: remap({ id: p.id as string }).id,
        projectId: newProjectId,
        designId: remapId(p.designId as string),
      }))
      await db.planModels.bulkAdd(remappedPlans as never[])
    }

    if (data.cadDocs.length > 0) {
      const remappedCadDocs = (data.cadDocs as Array<Record<string, unknown>>).map((c) => ({
        ...c,
        id: remap({ id: c.id as string }).id,
        projectId: newProjectId,
      }))
      await db.cadDocs.bulkAdd(remappedCadDocs as never[])
    }

    if (data.bimModels.length > 0) {
      const remappedBimModels = (data.bimModels as Array<Record<string, unknown>>).map((b) => ({
        ...b,
        id: remap({ id: b.id as string }).id,
        projectId: newProjectId,
      }))
      await db.bimModels.bulkAdd(remappedBimModels as never[])
    }

    if (data.governance) {
      const g = data.governance as Record<string, unknown>
      await db.governance.put({ ...g, projectId: newProjectId } as never)
    }

    if (data.snapshots.length > 0) {
      const remappedSnapshots = (data.snapshots as Array<Record<string, unknown>>).map((s) => ({
        ...s,
        id: remap({ id: s.id as string }).id,
        projectId: newProjectId,
      }))
      await db.snapshots.bulkAdd(remappedSnapshots as never[])
    }

    if (data.transactions.length > 0) {
      const remappedTx = (data.transactions as Array<Record<string, unknown>>).map((t) => ({
        ...t,
        id: uuid(),
        projectId: newProjectId,
      }))
      await db.transactions.bulkAdd(remappedTx as never[])
    }

    // P22 lifecycle tables (copy with remapped projectId, no ID remapping needed for project-scoped entities)
    for (const tableName of LIFECYCLE_TABLES) {
      const records = data[tableName] as Array<Record<string, unknown>>
      if (records.length > 0) {
        const table = db.table(tableName)
        const remapped = records.map((r) => {
          const rec = { ...r, projectId: newProjectId } as Record<string, unknown>
          if (rec.id) rec.id = remapId(String(rec.id))
          return rec
        })
        await table.bulkAdd(remapped as never[])
      }
    }
  })

  return newProjectId
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function openProjectFilePicker(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.beproj,.zip'
    input.onchange = () => {
      const file = input.files?.[0] ?? null
      resolve(file)
    }
    input.click()
  })
}
