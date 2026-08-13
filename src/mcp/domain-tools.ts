import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnterpriseIndex } from '@/engine/rag/corpus/loader-enterprise'
import { hybridSearch } from '@/engine/rag/hybrid'
import { analyzeCompliance } from '@/engine/rag/analysis'
import type { RagIndex } from '@/engine/rag/ragIndex'

export interface ProjectMeta {
  id?: string
  name?: string
  buildingType?: string
  region?: string
  status?: string
}

export interface BeProjectPackage {
  version?: number
  format?: string
  exportedAt?: string
  project?: ProjectMeta | null
  designs?: unknown[]
  boqs?: unknown[]
  milestones?: unknown[]
  escrows?: unknown[]
  transactions?: unknown[]
  cadDocs?: unknown[]
  bimModels?: unknown[]
  governance?: unknown | null
  snapshots?: unknown[]
  planModels?: unknown[]
  dispatchOrders?: unknown[]
  dispatchHolds?: unknown[]
  sovs?: unknown[]
  finalAccounts?: unknown[]
  lienWaivers?: unknown[]
  gainFades?: unknown[]
  historicalCosts?: unknown[]
  lessons?: unknown[]
  planValidations?: unknown[]
  agentRuns?: unknown[]
  agentCheckpoints?: unknown[]
  traces?: unknown[]
  ledgerEntries?: unknown[]
  changeLensAnalyses?: unknown[]
  wipaaSnapshots?: unknown[]
  sitePhotos?: unknown[]
}

export interface ProjectListing {
  file: string
  id?: string
  name?: string
  exportedAt?: string
  version?: number
}

export interface MilestoneRow {
  id?: string
  name?: string
  releaseState?: string
  category?: string
  plannedCostCents?: number
  actualCostCents?: number
  plannedDate?: string
}

export interface EscrowRow {
  id?: string
  providerId?: string
  status?: string
  totalAmount?: number
  currency?: string
  milestones?: unknown[]
}

export interface BoqRow {
  id?: string
  designOptionId?: string
  currency?: string
  lineItems?: unknown[]
  totals?: { subtotalCents?: number; contingencyCents?: number; professionalFeesCents?: number; vatCents?: number; grandTotalCents?: number }
}

export const DEFAULT_EXPORT_DIR = process.env.BE_EXPORT_DIR ?? './exports'

export function resolveExportDir(dir?: string): string {
  return dir ?? DEFAULT_EXPORT_DIR
}

export function listProjects(dir?: string): ProjectListing[] {
  const resolved = resolveExportDir(dir)
  if (!existsSync(resolved)) return []
  const listings: ProjectListing[] = []
  for (const file of readdirSync(resolved).filter((f) => f.endsWith('.beproj'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(resolved, file), 'utf8')) as BeProjectPackage
      listings.push({
        file,
        id: pkg.project?.id,
        name: pkg.project?.name,
        exportedAt: pkg.exportedAt,
        version: pkg.version,
      })
    } catch {
      listings.push({ file, version: -1 })
    }
  }
  return listings.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
}

export function loadProject(projectId: string, dir?: string): BeProjectPackage | null {
  const resolved = resolveExportDir(dir)
  if (!existsSync(resolved)) return null
  for (const file of readdirSync(resolved).filter((f) => f.endsWith('.beproj'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(resolved, file), 'utf8')) as BeProjectPackage
      if (pkg.project?.id === projectId) return pkg
    } catch {
      /* skip corrupt file */
    }
  }
  return null
}

function asRows<T>(rows: unknown[] | undefined): T[] {
  return (rows ?? []) as T[]
}

export function projectSummary(pkg: BeProjectPackage) {
  const milestones = asRows<MilestoneRow>(pkg.milestones)
  const escrows = asRows<EscrowRow>(pkg.escrows)
  const boqs = asRows<BoqRow>(pkg.boqs)
  return {
    project: pkg.project ?? null,
    exportedAt: pkg.exportedAt ?? null,
    version: pkg.version ?? null,
    counts: {
      designs: pkg.designs?.length ?? 0,
      boqs: boqs.length,
      milestones: milestones.length,
      escrows: escrows.length,
      transactions: pkg.transactions?.length ?? 0,
      cadDocs: pkg.cadDocs?.length ?? 0,
      bimModels: pkg.bimModels?.length ?? 0,
      planModels: pkg.planModels?.length ?? 0,
      dispatchOrders: pkg.dispatchOrders?.length ?? 0,
      dispatchHolds: pkg.dispatchHolds?.length ?? 0,
      sovs: pkg.sovs?.length ?? 0,
      finalAccounts: pkg.finalAccounts?.length ?? 0,
      lienWaivers: pkg.lienWaivers?.length ?? 0,
      gainFades: pkg.gainFades?.length ?? 0,
      historicalCosts: pkg.historicalCosts?.length ?? 0,
      lessons: pkg.lessons?.length ?? 0,
      planValidations: pkg.planValidations?.length ?? 0,
      agentRuns: pkg.agentRuns?.length ?? 0,
      traces: pkg.traces?.length ?? 0,
      ledgerEntries: pkg.ledgerEntries?.length ?? 0,
      changeLensAnalyses: pkg.changeLensAnalyses?.length ?? 0,
      wipaaSnapshots: pkg.wipaaSnapshots?.length ?? 0,
      sitePhotos: pkg.sitePhotos?.length ?? 0,
    },
  }
}

export function milestoneSummary(pkg: BeProjectPackage) {
  const milestones = asRows<MilestoneRow>(pkg.milestones)
  const byState = new Map<string, number>()
  const byCategory = new Map<string, number>()
  let totalPlannedCents = 0
  let totalActualCents = 0
  for (const m of milestones) {
    byState.set(m.releaseState ?? 'unknown', (byState.get(m.releaseState ?? 'unknown') ?? 0) + 1)
    byCategory.set(m.category ?? 'uncategorised', (byCategory.get(m.category ?? 'uncategorised') ?? 0) + 1)
    totalPlannedCents += m.plannedCostCents ?? 0
    totalActualCents += m.actualCostCents ?? 0
  }
  return {
    total: milestones.length,
    byReleaseState: Object.fromEntries([...byState].sort()),
    byCategory: Object.fromEntries([...byCategory].sort()),
    totalPlannedCents,
    totalActualCents,
    releasedCount: byState.get('released') ?? 0,
    pendingCount: (byState.get('pending-review') ?? 0) + (byState.get('locked') ?? 0),
  }
}

export function escrowSummary(pkg: BeProjectPackage) {
  const escrows = asRows<EscrowRow>(pkg.escrows)
  const byStatus = new Map<string, number>()
  let totalAmount = 0
  let heldAmount = 0
  let releasedAmount = 0
  for (const e of escrows) {
    byStatus.set(e.status ?? 'unknown', (byStatus.get(e.status ?? 'unknown') ?? 0) + 1)
    totalAmount += e.totalAmount ?? 0
    if (e.status === 'locked' || e.status === 'disputed') heldAmount += e.totalAmount ?? 0
    if (e.status === 'released' || e.status === 'refunded') releasedAmount += e.totalAmount ?? 0
  }
  const milestoneStates = new Map<string, number>()
  let milestoneCount = 0
  for (const e of escrows) {
    for (const m of (e.milestones ?? []) as Array<{ status?: string }>) {
      milestoneStates.set(m.status ?? 'unknown', (milestoneStates.get(m.status ?? 'unknown') ?? 0) + 1)
      milestoneCount += 1
    }
  }
  return {
    total: escrows.length,
    byStatus: Object.fromEntries([...byStatus].sort()),
    totalAmount,
    heldAmount,
    releasedAmount,
    milestoneCount,
    milestoneByStatus: Object.fromEntries([...milestoneStates].sort()),
  }
}

export function boqSummary(pkg: BeProjectPackage) {
  const boqs = asRows<BoqRow>(pkg.boqs)
  return boqs.map((b) => {
    const lines = (b.lineItems ?? []) as Array<{ id?: string; category?: string; description?: string; quantity?: number; unit?: string; unitRateCents?: number; totalCents?: number }>
    const byCategory = new Map<string, number>()
    let lineCents = 0
    for (const l of lines) {
      byCategory.set(l.category ?? 'uncategorised', (byCategory.get(l.category ?? 'uncategorised') ?? 0) + 1)
      lineCents += l.totalCents ?? 0
    }
    return {
      id: b.id ?? null,
      designOptionId: b.designOptionId ?? null,
      currency: b.currency ?? 'USD',
      lineItemCount: lines.length,
      lineItemsTotalCents: lineCents,
      totals: b.totals ?? null,
      lineItemsByCategory: Object.fromEntries([...byCategory].sort()),
    }
  })
}

export interface SearchCodesOptions {
  query: string
  k?: number
  minScore?: number
  /** Pre-built index to search; defaults to the full on-disk corpus. */
  index?: RagIndex
}

export async function searchCodes({ query, k = 5, minScore = 0.01, index }: SearchCodesOptions) {
  const rag = index ?? (await loadEnterpriseIndex())
    const results = hybridSearch(rag, query, { k, minScore })
  return results.map((r) => ({
    docId: r.docId,
    sectionId: r.sectionId,
    text: r.text,
    score: r.score,
    chapter: r.chapter ?? null,
  }))
}

export interface ComplianceOptions {
  query: string
  jurisdiction?: 'zimbabwe' | 'south-africa'
  /** Pre-built index to search; defaults to the full on-disk corpus. */
  index?: RagIndex
}

export async function runComplianceAnalysis({ query, jurisdiction = 'zimbabwe', index }: ComplianceOptions) {
  const rag = index ?? (await loadEnterpriseIndex())
    const report = await analyzeCompliance(rag, {
    query,
    jurisdiction,
    engine: 'local-rules',
  })
  return report
}
