import { db } from '@/db/db'
import type { ChangeOrder, RFI, Submittal, SiteInspection, NCR, SnagItem } from '@/domain/change'
import {
  createChangeOrder,
  createRFI,
  respondToRFI,
  createSubmittal,
  reviewSubmittal,
  createSiteInspection,
  completeInspection,
  createNCR,
  resolveNCR,
  verifyNCR,
  createSnagItem,
  resolveSnag,
} from '@/engine/change/changeEngine'

export async function saveChangeOrder(co: ChangeOrder): Promise<void> {
  await db.changeOrders.put(co)
}

export async function getChangeOrders(projectId: string): Promise<ChangeOrder[]> {
  return db.changeOrders.where({ projectId }).toArray()
}

export async function createAndSaveChangeOrder(input: Parameters<typeof createChangeOrder>[0]): Promise<ChangeOrder> {
  const co = createChangeOrder(input)
  await db.changeOrders.add(co)
  return co
}

export async function saveRFI(rfi: RFI): Promise<void> {
  await db.rfis.put(rfi)
}

export async function getRFIs(projectId: string): Promise<RFI[]> {
  return db.rfis.where({ projectId }).toArray()
}

export async function createAndSaveRFI(input: Parameters<typeof createRFI>[0]): Promise<RFI> {
  const rfi = createRFI(input)
  await db.rfis.add(rfi)
  return rfi
}

export async function respondAndSaveRFI(rfiId: string, response: string, respondedBy: string): Promise<RFI | null> {
  const rfi = await db.rfis.get(rfiId)
  if (!rfi) return null
  const updated = respondToRFI(rfi, response, respondedBy)
  await db.rfis.put(updated)
  return updated
}

export async function saveSubmittal(sub: Submittal): Promise<void> {
  await db.submittals.put(sub)
}

export async function getSubmittals(projectId: string): Promise<Submittal[]> {
  return db.submittals.where({ projectId }).toArray()
}

export async function createAndSaveSubmittal(input: Parameters<typeof createSubmittal>[0]): Promise<Submittal> {
  const sub = createSubmittal(input)
  await db.submittals.add(sub)
  return sub
}

export async function reviewAndSaveSubmittal(submittalId: string, decision: Submittal['status'], notes: string, reviewer: string): Promise<Submittal | null> {
  const sub = await db.submittals.get(submittalId)
  if (!sub) return null
  const updated = reviewSubmittal(sub, decision, notes, reviewer)
  await db.submittals.put(updated)
  return updated
}

export async function saveSiteInspection(inspection: SiteInspection): Promise<void> {
  await db.siteInspections.put(inspection)
}

export async function getSiteInspections(projectId: string): Promise<SiteInspection[]> {
  return db.siteInspections.where({ projectId }).toArray()
}

export async function createAndSaveSiteInspection(input: Parameters<typeof createSiteInspection>[0]): Promise<SiteInspection> {
  const inspection = createSiteInspection(input)
  await db.siteInspections.add(inspection)
  return inspection
}

export async function completeAndSaveInspection(
  inspectionId: string,
  findings: string,
  result: SiteInspection['overallResult'],
  ncrIds: string[],
  photoRefs: string[],
  followUpRequired: boolean
): Promise<SiteInspection | null> {
  const inspection = await db.siteInspections.get(inspectionId)
  if (!inspection) return null
  const updated = completeInspection(inspection, findings, result, ncrIds, photoRefs, followUpRequired)
  await db.siteInspections.put(updated)
  return updated
}

export async function saveNCR(ncr: NCR): Promise<void> {
  await db.ncrs.put(ncr)
}

export async function getNCRs(projectId: string): Promise<NCR[]> {
  return db.ncrs.where({ projectId }).toArray()
}

export async function createAndSaveNCR(input: Parameters<typeof createNCR>[0]): Promise<NCR> {
  const ncr = createNCR(input)
  await db.ncrs.add(ncr)
  return ncr
}

export async function resolveAndSaveNCR(ncrId: string, rootCause: string, correctiveAction: string, preventiveAction: string, resolvedBy: string): Promise<NCR | null> {
  const ncr = await db.ncrs.get(ncrId)
  if (!ncr) return null
  const updated = resolveNCR(ncr, rootCause, correctiveAction, preventiveAction, resolvedBy)
  await db.ncrs.put(updated)
  return updated
}

export async function verifyAndSaveNCR(ncrId: string, verifiedBy: string): Promise<NCR | null> {
  const ncr = await db.ncrs.get(ncrId)
  if (!ncr) return null
  const updated = verifyNCR(ncr, verifiedBy)
  await db.ncrs.put(updated)
  return updated
}

export async function saveSnagItem(snag: SnagItem): Promise<void> {
  await db.snagItems.put(snag)
}

export async function getSnagItems(projectId: string): Promise<SnagItem[]> {
  return db.snagItems.where({ projectId }).toArray()
}

export async function createAndSaveSnagItem(input: Parameters<typeof createSnagItem>[0]): Promise<SnagItem> {
  const snag = createSnagItem(input)
  await db.snagItems.add(snag)
  return snag
}

export async function resolveAndSaveSnagItem(snagId: string, resolvedBy: string, photoRefs?: string[]): Promise<SnagItem | null> {
  const snag = await db.snagItems.get(snagId)
  if (!snag) return null
  const updated = resolveSnag(snag, resolvedBy, photoRefs)
  await db.snagItems.put(updated)
  return updated
}
