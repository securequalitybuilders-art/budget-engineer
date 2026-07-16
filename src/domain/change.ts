export type ChangeOrderStatus = 'draft' | 'pending-review' | 'approved' | 'rejected' | 'implemented' | 'cancelled'

export type RFIStatus = 'open' | 'answered' | 'clarified' | 'closed' | 'escalated'

export type SubmittalStatus = 'draft' | 'submitted' | 'under-review' | 'approved' | 'approved-with-comments' | 'revise-resubmit' | 'rejected' | 'closed'

export type SiteInspectionStatus = 'scheduled' | 'in-progress' | 'completed' | 'overdue'

export type NCRSeverity = 'minor' | 'major' | 'critical'

export type NCRStatus = 'open' | 'in-progress' | 'resolved' | 'verified' | 'closed'

export type SnagPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface ChangeOrder {
  id: string
  projectId: string
  changeOrderNumber: string
  title: string
  description: string
  originator: string
  status: ChangeOrderStatus
  category: 'variation' | 'addition' | 'omission' | 'substitution' | 'design-change' | 'site-condition'
  reason: string
  costImpactCents: number
  timeImpactDays: number
  scopeChange: string
  linkedBOQLineIds: string[]
  linkedDrawingIds: string[]
  linkedMilestoneIds: string[]
  linkedChangeOrderIds: string[]
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  implementedBy?: string
  implementedAt?: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface RFI {
  id: string
  projectId: string
  rfiNumber: string
  title: string
  question: string
  status: RFIStatus
  originator: string
  originatorRole: string
  assignedTo: string
  discipline: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  response?: string
  respondedBy?: string
  respondedAt?: string
  linkedDrawingIds: string[]
  linkedSpecSectionIds: string[]
  linkedSubmittalIds: string[]
  linkedChangeOrderIds: string[]
  daysToRespond: number
  createdAt: string
  updatedAt: string
  closedAt?: string
}

export interface Submittal {
  id: string
  projectId: string
  submittalNumber: string
  title: string
  description: string
  status: SubmittalStatus
  category: 'shop-drawing' | 'material-sample' | 'product-data' | 'method-statement' | 'certificate' | 'test-report' | 'other'
  submittedBy: string
  submittedAt: string
  assignedReviewer: string
  revision: string
  reviewNotes?: string
  reviewerDecision?: string
  reviewedAt?: string
  linkedRFIIds: string[]
  linkedDrawingIds: string[]
  linkedSpecSectionIds: string[]
  resubmittedFromId?: string
  createdAt: string
  updatedAt: string
}

export interface SiteInspection {
  id: string
  projectId: string
  inspectionNumber: string
  title: string
  description: string
  status: SiteInspectionStatus
  inspectionType: 'general' | 'structural' | 'mep' | 'safety' | 'quality' | 'snagging' | 'handover'
  scheduledDate: string
  completedDate?: string
  inspector: string
  inspectionTeam: string[]
  location: string
  findings: string
  ncrIds: string[]
  photoRefs: string[]
  overallResult: 'pass' | 'conditional-pass' | 'fail'
  followUpRequired: boolean
  followUpDate?: string
  createdAt: string
  updatedAt: string
}

export interface NCR {
  id: string
  projectId: string
  ncrNumber: string
  title: string
  description: string
  severity: NCRSeverity
  status: NCRStatus
  originator: string
  originatorRole: string
  location: string
  category: 'material' | 'workmanship' | 'dimensional' | 'safety' | 'compliance' | 'other'
  linkedDrawingIds: string[]
  linkedSpecSectionIds: string[]
  linkedInspectionId?: string
  linkedChangeOrderId?: string
  rootCause?: string
  correctiveAction?: string
  preventiveAction?: string
  resolvedBy?: string
  resolvedAt?: string
  verifiedBy?: string
  verifiedAt?: string
  dueDate?: string
  photoRefs: string[]
  notes: string
  createdAt: string
  updatedAt: string
}

export interface SnagItem {
  id: string
  projectId: string
  snagNumber: string
  description: string
  priority: SnagPriority
  status: 'open' | 'in-progress' | 'resolved' | 'verified' | 'closed'
  category: 'finish' | 'fixture' | 'fitting' | 'service' | 'structural' | 'safety' | 'aesthetic' | 'commissioning'
  location: string
  originator: string
  assignedTo: string
  linkedNcrId?: string
  linkedInspectionId?: string
  photoRefs: string[]
  resolvedBy?: string
  resolvedAt?: string
  verifiedBy?: string
  verifiedAt?: string
  dueDate: string
  createdAt: string
  updatedAt: string
}
