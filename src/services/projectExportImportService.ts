import { db } from '@/db/db'
import { uuid } from '@/lib/utils'

const CURRENT_VERSION = 2

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
}

async function fetchAllProjectData(projectId: string): Promise<ProjectExportPackage> {
  const [project, brief, designs, boqs, transactions, cadDocs, bimModels, governance, snapshots, planModels] =
    await Promise.all([
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
    ])
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
    snapshots: snapshots ?? [],
    planModels: planModels ?? [],
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
  return data
}

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
