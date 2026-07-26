import type {
  CompletionStage,
  CompletionCondition,
  CompletionCertificate,
  SnagList,
  SnagListItem,
  HandoverPackage,
  HandoverContent,
  AssetRegisterItem,
  WarrantyRecord,
  WarrantyClaim,
  OAndMRecord,
  CompletionStageStatus,
  HandoverPackageStatus,
} from '@/domain/handover'

export function createCompletionStage(input: {
  projectId: string
  stage: CompletionStage['stage']
  targetDate: string
}): CompletionStage {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    stage: input.stage,
    status: 'not-started',
    targetDate: input.targetDate,
    conditions: [],
    certificates: [],
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function addCompletionCondition(
  stage: CompletionStage,
  condition: Omit<CompletionCondition, 'id' | 'completionStageId'>
): CompletionStage {
  const newCondition: CompletionCondition = {
    ...condition,
    id: crypto.randomUUID(),
    completionStageId: stage.id,
  }
  return {
    ...stage,
    conditions: [...stage.conditions, newCondition],
    updatedAt: new Date().toISOString(),
  }
}

export function satisfyCompletionCondition(
  stage: CompletionStage,
  conditionId: string,
  evidenceRef: string,
  verifiedBy: string
): CompletionStage {
  return {
    ...stage,
    conditions: stage.conditions.map((c) =>
      c.id === conditionId
        ? { ...c, met: true, evidenceRef, verifiedBy, verifiedAt: new Date().toISOString() }
        : c
    ),
    updatedAt: new Date().toISOString(),
  }
}

export function issueCompletionCertificate(
  stage: CompletionStage,
  certificate: Omit<CompletionCertificate, 'id' | 'completionStageId'>
): CompletionStage {
  const newCertificate: CompletionCertificate = {
    ...certificate,
    id: crypto.randomUUID(),
    completionStageId: stage.id,
  }
  return {
    ...stage,
    certificates: [...stage.certificates, newCertificate],
    updatedAt: new Date().toISOString(),
  }
}

export function checkCompletionReadiness(stage: CompletionStage): { ready: boolean; missing: string[] } {
  const missing = stage.conditions.filter((c) => !c.met).map((c) => c.description)
  return {
    ready: missing.length === 0,
    missing,
  }
}

export function achieveCompletionStage(stage: CompletionStage): CompletionStage {
  return {
    ...stage,
    status: 'achieved',
    achievedDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createSnagList(input: {
  projectId: string
  name: string
}): SnagList {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    name: input.name,
    snagItems: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function addSnagListItem(
  snagList: SnagList,
  item: Omit<SnagListItem, 'id' | 'snagListId'>
): SnagList {
  const newItem: SnagListItem = {
    ...item,
    id: crypto.randomUUID(),
    snagListId: snagList.id,
  }
  return {
    ...snagList,
    snagItems: [...snagList.snagItems, newItem],
    updatedAt: new Date().toISOString(),
  }
}

export function createHandoverPackage(input: {
  projectId: string
  name: string
  recipient: string
  recipientType: HandoverPackage['recipientType']
}): HandoverPackage {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    name: input.name,
    status: 'draft',
    recipient: input.recipient,
    recipientType: input.recipientType,
    contents: [],
    certificateRefs: [],
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function addHandoverContent(
  pkg: HandoverPackage,
  content: Omit<HandoverContent, 'id'>
): HandoverPackage {
  return {
    ...pkg,
    contents: [...pkg.contents, { ...content, id: crypto.randomUUID() }],
    updatedAt: new Date().toISOString(),
  }
}

export function issueHandoverPackage(pkg: HandoverPackage, issuedBy: string): HandoverPackage {
  return {
    ...pkg,
    status: 'issued',
    issuedDate: new Date().toISOString(),
    issuedBy,
    updatedAt: new Date().toISOString(),
  }
}

export function acknowledgeHandoverPackage(pkg: HandoverPackage, acknowledgedBy: string): HandoverPackage {
  return {
    ...pkg,
    status: 'acknowledged',
    acknowledgedBy,
    acknowledgedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createAssetRegisterItem(input: {
  projectId: string
  assetTag: string
  name: string
  description: string
  category: AssetRegisterItem['category']
  subCategory: string
  location: string
  manufacturer: string
  model: string
  serialNumber: string
  installationDate: string
  warrantyExpiry: string
  expectedLifeYears: number
  replacementCostCents: number
  maintenanceIntervalDays: number
}): AssetRegisterItem {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    assetTag: input.assetTag,
    name: input.name,
    description: input.description,
    category: input.category,
    subCategory: input.subCategory,
    location: input.location,
    manufacturer: input.manufacturer,
    model: input.model,
    serialNumber: input.serialNumber,
    installationDate: input.installationDate,
    warrantyExpiry: input.warrantyExpiry,
    expectedLifeYears: input.expectedLifeYears,
    replacementCostCents: input.replacementCostCents,
    maintenanceIntervalDays: input.maintenanceIntervalDays,
    status: 'active',
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createWarrantyRecord(input: {
  projectId: string
  warrantyType: WarrantyRecord['warrantyType']
  provider: string
  providerType: WarrantyRecord['providerType']
  reference: string
  description: string
  startDate: string
  expiryDate: string
  coverageDetails: string
  exclusions: string[]
  claimProcess: string
}): WarrantyRecord {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    warrantyType: input.warrantyType,
    provider: input.provider,
    providerType: input.providerType,
    reference: input.reference,
    description: input.description,
    startDate: input.startDate,
    expiryDate: input.expiryDate,
    coverageDetails: input.coverageDetails,
    exclusions: input.exclusions,
    claimProcess: input.claimProcess,
    linkedAssetIds: [],
    status: 'active',
    claimHistory: [],
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function submitWarrantyClaim(warranty: WarrantyRecord, claim: Omit<WarrantyClaim, 'id' | 'warrantyRecordId'>): WarrantyRecord {
  const newClaim: WarrantyClaim = {
    ...claim,
    id: crypto.randomUUID(),
    warrantyRecordId: warranty.id,
  }
  return {
    ...warranty,
    status: 'claimed',
    claimHistory: [...warranty.claimHistory, newClaim],
    updatedAt: new Date().toISOString(),
  }
}

export function createOAndMRecord(input: {
  projectId: string
  title: string
  documentType: OAndMRecord['documentType']
  system: string
  description: string
  fileRef: string
  revision: string
  issueDate: string
}): OAndMRecord {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    title: input.title,
    documentType: input.documentType,
    system: input.system,
    description: input.description,
    fileRef: input.fileRef,
    revision: input.revision,
    issueDate: input.issueDate,
    linkedAssetIds: [],
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function advanceCompletionStageStatus(current: CompletionStageStatus): CompletionStageStatus {
  const sequence: CompletionStageStatus[] = ['not-started', 'in-progress', 'achieved']
  const idx = sequence.indexOf(current)
  if (idx >= 0 && idx < sequence.length - 1) return sequence[idx + 1]
  return current
}

export function advanceHandoverPackageStatus(current: HandoverPackageStatus): HandoverPackageStatus {
  const sequence: HandoverPackageStatus[] = ['draft', 'in-preparation', 'completed', 'issued', 'acknowledged']
  const idx = sequence.indexOf(current)
  if (idx >= 0 && idx < sequence.length - 1) return sequence[idx + 1]
  return current
}

export function calculateSnagCompletion(snagList: SnagList): number {
  if (snagList.snagItems.length === 0) return 100
  const resolved = snagList.snagItems.filter((s) => s.status === 'resolved' || s.status === 'verified').length
  return Math.round((resolved / snagList.snagItems.length) * 100)
}
