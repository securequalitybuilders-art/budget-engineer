export type CompletionStageStatus = 'not-started' | 'in-progress' | 'achieved' | 'deferred'

export type HandoverPackageStatus = 'draft' | 'in-preparation' | 'completed' | 'issued' | 'acknowledged'

export type WarrantyType = 'defects-liability' | 'structural' | 'equipment' | 'workmanship' | 'materials'

export interface CompletionStage {
  id: string
  projectId: string
  stage: 'practical-completion' | 'final-completion' | 'defects-liability' | 'handover'
  status: CompletionStageStatus
  targetDate: string
  achievedDate?: string
  conditions: CompletionCondition[]
  certificates: CompletionCertificate[]
  notes: string
  createdAt: string
  updatedAt: string
}

export interface CompletionCondition {
  id: string
  completionStageId: string
  description: string
  met: boolean
  evidenceRef?: string
  verifiedBy?: string
  verifiedAt?: string
}

export interface CompletionCertificate {
  id: string
  completionStageId: string
  certificateNumber: string
  title: string
  issuedDate: string
  issuedBy: string
  status: 'draft' | 'issued' | 'accepted'
  documentRef?: string
  notes: string
}

export interface SnagList {
  id: string
  projectId: string
  name: string
  snagItems: SnagListItem[]
  createdAt: string
  updatedAt: string
}

export interface SnagListItem {
  id: string
  snagListId: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in-progress' | 'resolved' | 'verified'
  category: string
  location: string
  assignedTo: string
  dueDate: string
  resolvedAt?: string
  verifiedBy?: string
  verifiedAt?: string
  photoRefs: string[]
  notes: string
}

export interface HandoverPackage {
  id: string
  projectId: string
  name: string
  status: HandoverPackageStatus
  recipient: string
  recipientType: 'client' | 'facility-manager' | 'tenant' | 'owner'
  contents: HandoverContent[]
  certificateRefs: string[]
  issuedDate?: string
  issuedBy?: string
  acknowledgedBy?: string
  acknowledgedAt?: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface HandoverContent {
  id: string
  type: 'as-built-drawing' | 'o-and-m-manual' | 'warranty-certificate' | 'test-certificate' | 'asset-register' | 'snag-list' | 'completion-certificate' | 'key-schedule' | 'spares-list' | 'training-record' | 'other'
  title: string
  description: string
  fileRef?: string
  revision: string
  status: 'pending' | 'included' | 'verified'
  notes: string
}

export interface AssetRegisterItem {
  id: string
  projectId: string
  assetTag: string
  name: string
  description: string
  category: 'building' | 'structural' | 'mep' | 'furniture' | 'equipment' | 'fixture' | 'landscaping' | 'infrastructure'
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
  lastMaintenanceDate?: string
  nextMaintenanceDate?: string
  oAndMRef?: string
  status: 'active' | 'decommissioned' | 'under-maintenance'
  notes: string
  createdAt: string
  updatedAt: string
}

export interface WarrantyRecord {
  id: string
  projectId: string
  warrantyType: WarrantyType
  provider: string
  providerType: 'contractor' | 'supplier' | 'manufacturer' | 'insurer'
  reference: string
  description: string
  startDate: string
  expiryDate: string
  coverageDetails: string
  exclusions: string[]
  claimProcess: string
  linkedAssetIds: string[]
  status: 'active' | 'expired' | 'claimed' | 'settled'
  claimHistory: WarrantyClaim[]
  notes: string
  createdAt: string
  updatedAt: string
}

export interface WarrantyClaim {
  id: string
  warrantyRecordId: string
  claimDate: string
  description: string
  status: 'submitted' | 'under-review' | 'approved' | 'rejected' | 'settled'
  resolution: string
  costCents: number
  settledAmountCents?: number
  settledDate?: string
  notes: string
}

export interface OAndMRecord {
  id: string
  projectId: string
  title: string
  documentType: 'manual' | 'schedule' | 'certificate' | 'drawing' | 'other'
  system: string
  description: string
  fileRef: string
  revision: string
  issueDate: string
  linkedAssetIds: string[]
  notes: string
  createdAt: string
  updatedAt: string
}
