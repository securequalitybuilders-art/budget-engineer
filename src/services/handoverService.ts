import { db } from '@/db/db'
import type { CompletionStage, SnagList, HandoverPackage, AssetRegisterItem, WarrantyRecord, OAndMRecord } from '@/domain/handover'
import {
  createCompletionStage,
  addCompletionCondition,
  satisfyCompletionCondition,
  issueCompletionCertificate,
  achieveCompletionStage,
  createSnagList,
  addSnagListItem,
  createHandoverPackage,
  addHandoverContent,
  issueHandoverPackage,
  acknowledgeHandoverPackage,
  createAssetRegisterItem,
  createWarrantyRecord,
  submitWarrantyClaim,
  createOAndMRecord,
} from '@/engine/handover/handoverEngine'

export async function saveCompletionStage(stage: CompletionStage): Promise<void> {
  await db.completionStages.put(stage)
}

export async function getCompletionStages(projectId: string): Promise<CompletionStage[]> {
  return db.completionStages.where({ projectId }).toArray()
}

export async function createAndSaveCompletionStage(input: Parameters<typeof createCompletionStage>[0]): Promise<CompletionStage> {
  const stage = createCompletionStage(input)
  await db.completionStages.add(stage)
  return stage
}

export async function addConditionToStage(stageId: string, condition: { description: string; met?: boolean }): Promise<CompletionStage | null> {
  const stage = await db.completionStages.get(stageId)
  if (!stage) return null
  const updated = addCompletionCondition(stage, { ...condition, met: condition.met ?? false, evidenceRef: undefined, verifiedBy: undefined, verifiedAt: undefined })
  await db.completionStages.put(updated)
  return updated
}

export async function satisfyStageCondition(stageId: string, conditionId: string, evidenceRef: string, verifiedBy: string): Promise<CompletionStage | null> {
  const stage = await db.completionStages.get(stageId)
  if (!stage) return null
  const updated = satisfyCompletionCondition(stage, conditionId, evidenceRef, verifiedBy)
  await db.completionStages.put(updated)
  return updated
}

export async function issueStageCertificate(stageId: string, certificate: { certificateNumber: string; title: string; issuedBy: string }): Promise<CompletionStage | null> {
  const stage = await db.completionStages.get(stageId)
  if (!stage) return null
  const updated = issueCompletionCertificate(stage, {
    ...certificate,
    issuedDate: new Date().toISOString(),
    status: 'draft',
    documentRef: undefined,
    notes: '',
  })
  await db.completionStages.put(updated)
  return updated
}

export async function achieveStage(stageId: string): Promise<CompletionStage | null> {
  const stage = await db.completionStages.get(stageId)
  if (!stage) return null
  const updated = achieveCompletionStage(stage)
  await db.completionStages.put(updated)
  return updated
}

export async function saveSnagList(snagList: SnagList): Promise<void> {
  await db.snagLists.put(snagList)
}

export async function getSnagLists(projectId: string): Promise<SnagList[]> {
  return db.snagLists.where({ projectId }).toArray()
}

export async function createAndSaveSnagList(input: Parameters<typeof createSnagList>[0]): Promise<SnagList> {
  const snagList = createSnagList(input)
  await db.snagLists.add(snagList)
  return snagList
}

export async function addItemToSnagList(snagListId: string, item: Omit<import('@/domain/handover').SnagListItem, 'id' | 'snagListId'>): Promise<SnagList | null> {
  const snagList = await db.snagLists.get(snagListId)
  if (!snagList) return null
  const updated = addSnagListItem(snagList, item)
  await db.snagLists.put(updated)
  return updated
}

export async function saveHandoverPackage(pkg: HandoverPackage): Promise<void> {
  await db.handoverPackages.put(pkg)
}

export async function getHandoverPackages(projectId: string): Promise<HandoverPackage[]> {
  return db.handoverPackages.where({ projectId }).toArray()
}

export async function createAndSaveHandoverPackage(input: Parameters<typeof createHandoverPackage>[0]): Promise<HandoverPackage> {
  const pkg = createHandoverPackage(input)
  await db.handoverPackages.add(pkg)
  return pkg
}

export async function addContentToPackage(pkgId: string, content: Omit<import('@/domain/handover').HandoverContent, 'id'>): Promise<HandoverPackage | null> {
  const pkg = await db.handoverPackages.get(pkgId)
  if (!pkg) return null
  const updated = addHandoverContent(pkg, content)
  await db.handoverPackages.put(updated)
  return updated
}

export async function issuePackage(pkgId: string, issuedBy: string): Promise<HandoverPackage | null> {
  const pkg = await db.handoverPackages.get(pkgId)
  if (!pkg) return null
  const updated = issueHandoverPackage(pkg, issuedBy)
  await db.handoverPackages.put(updated)
  return updated
}

export async function acknowledgePackage(pkgId: string, acknowledgedBy: string): Promise<HandoverPackage | null> {
  const pkg = await db.handoverPackages.get(pkgId)
  if (!pkg) return null
  const updated = acknowledgeHandoverPackage(pkg, acknowledgedBy)
  await db.handoverPackages.put(updated)
  return updated
}

export async function saveAssetRegisterItem(item: AssetRegisterItem): Promise<void> {
  await db.assetRegister.put(item)
}

export async function getAssetRegister(projectId: string): Promise<AssetRegisterItem[]> {
  return db.assetRegister.where({ projectId }).toArray()
}

export async function createAndSaveAssetRegisterItem(input: Parameters<typeof createAssetRegisterItem>[0]): Promise<AssetRegisterItem> {
  const item = createAssetRegisterItem(input)
  await db.assetRegister.add(item)
  return item
}

export async function saveWarrantyRecord(warranty: WarrantyRecord): Promise<void> {
  await db.warrantyRecords.put(warranty)
}

export async function getWarrantyRecords(projectId: string): Promise<WarrantyRecord[]> {
  return db.warrantyRecords.where({ projectId }).toArray()
}

export async function createAndSaveWarrantyRecord(input: Parameters<typeof createWarrantyRecord>[0]): Promise<WarrantyRecord> {
  const warranty = createWarrantyRecord(input)
  await db.warrantyRecords.add(warranty)
  return warranty
}

export async function submitClaimOnWarranty(warrantyId: string, claim: Omit<import('@/domain/handover').WarrantyClaim, 'id' | 'warrantyRecordId'>): Promise<WarrantyRecord | null> {
  const warranty = await db.warrantyRecords.get(warrantyId)
  if (!warranty) return null
  const updated = submitWarrantyClaim(warranty, claim)
  await db.warrantyRecords.put(updated)
  return updated
}

export async function saveOAndMRecord(record: OAndMRecord): Promise<void> {
  await db.oAndMRecords.put(record)
}

export async function getOAndMRecords(projectId: string): Promise<OAndMRecord[]> {
  return db.oAndMRecords.where({ projectId }).toArray()
}

export async function createAndSaveOAndMRecord(input: Parameters<typeof createOAndMRecord>[0]): Promise<OAndMRecord> {
  const record = createOAndMRecord(input)
  await db.oAndMRecords.add(record)
  return record
}
