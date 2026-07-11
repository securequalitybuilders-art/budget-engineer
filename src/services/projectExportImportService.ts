import { db } from '@/db/db'

const CURRENT_VERSION = 1

export interface ProjectExportPackage {
  version: number
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
