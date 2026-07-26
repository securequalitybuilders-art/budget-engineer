import type {
  ChangeOrder,
  RFI,
  Submittal,
  SiteInspection,
  NCR,
  SnagItem,
  ChangeOrderStatus,
  RFIStatus,
  SubmittalStatus,
  NCRStatus,
} from '@/domain/change'

export function createChangeOrder(input: {
  projectId: string
  changeOrderNumber: string
  title: string
  description: string
  originator: string
  category: ChangeOrder['category']
  reason: string
  costImpactCents: number
  timeImpactDays: number
  scopeChange: string
}): ChangeOrder {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    changeOrderNumber: input.changeOrderNumber,
    title: input.title,
    description: input.description,
    originator: input.originator,
    status: 'draft',
    category: input.category,
    reason: input.reason,
    costImpactCents: input.costImpactCents,
    timeImpactDays: input.timeImpactDays,
    scopeChange: input.scopeChange,
    linkedBOQLineIds: [],
    linkedDrawingIds: [],
    linkedMilestoneIds: [],
    linkedChangeOrderIds: [],
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createRFI(input: {
  projectId: string
  rfiNumber: string
  title: string
  question: string
  originator: string
  originatorRole: string
  assignedTo: string
  discipline: string
  priority: RFI['priority']
  daysToRespond: number
}): RFI {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    rfiNumber: input.rfiNumber,
    title: input.title,
    question: input.question,
    status: 'open',
    originator: input.originator,
    originatorRole: input.originatorRole,
    assignedTo: input.assignedTo,
    discipline: input.discipline,
    priority: input.priority,
    linkedDrawingIds: [],
    linkedSpecSectionIds: [],
    linkedSubmittalIds: [],
    linkedChangeOrderIds: [],
    daysToRespond: input.daysToRespond,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function respondToRFI(rfi: RFI, response: string, respondedBy: string): RFI {
  return {
    ...rfi,
    status: 'answered',
    response,
    respondedBy,
    respondedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createSubmittal(input: {
  projectId: string
  submittalNumber: string
  title: string
  description: string
  category: Submittal['category']
  submittedBy: string
  assignedReviewer: string
  revision: string
}): Submittal {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    submittalNumber: input.submittalNumber,
    title: input.title,
    description: input.description,
    status: 'draft',
    category: input.category,
    submittedBy: input.submittedBy,
    submittedAt: new Date().toISOString(),
    assignedReviewer: input.assignedReviewer,
    revision: input.revision,
    linkedRFIIds: [],
    linkedDrawingIds: [],
    linkedSpecSectionIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function reviewSubmittal(submittal: Submittal, decision: SubmittalStatus, notes: string, _reviewer: string): Submittal {
  const validDecisions: SubmittalStatus[] = ['approved', 'approved-with-comments', 'revise-resubmit', 'rejected']
  const status = validDecisions.includes(decision) ? decision : 'under-review'
  return {
    ...submittal,
    status,
    reviewNotes: notes,
    reviewerDecision: decision,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createSiteInspection(input: {
  projectId: string
  inspectionNumber: string
  title: string
  description: string
  inspectionType: SiteInspection['inspectionType']
  scheduledDate: string
  inspector: string
  inspectionTeam: string[]
  location: string
}): SiteInspection {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    inspectionNumber: input.inspectionNumber,
    title: input.title,
    description: input.description,
    status: 'scheduled',
    inspectionType: input.inspectionType,
    scheduledDate: input.scheduledDate,
    inspector: input.inspector,
    inspectionTeam: input.inspectionTeam,
    location: input.location,
    findings: '',
    ncrIds: [],
    photoRefs: [],
    overallResult: 'pass',
    followUpRequired: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function completeInspection(inspection: SiteInspection, findings: string, result: SiteInspection['overallResult'], ncrIds: string[], photoRefs: string[], followUpRequired: boolean): SiteInspection {
  return {
    ...inspection,
    status: 'completed',
    completedDate: new Date().toISOString(),
    findings,
    overallResult: result,
    ncrIds,
    photoRefs,
    followUpRequired,
    updatedAt: new Date().toISOString(),
  }
}

export function createNCR(input: {
  projectId: string
  ncrNumber: string
  title: string
  description: string
  severity: NCR['severity']
  originator: string
  originatorRole: string
  location: string
  category: NCR['category']
}): NCR {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    ncrNumber: input.ncrNumber,
    title: input.title,
    description: input.description,
    severity: input.severity,
    status: 'open',
    originator: input.originator,
    originatorRole: input.originatorRole,
    location: input.location,
    category: input.category,
    linkedDrawingIds: [],
    linkedSpecSectionIds: [],
    photoRefs: [],
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function resolveNCR(ncr: NCR, rootCause: string, correctiveAction: string, preventiveAction: string, resolvedBy: string): NCR {
  return {
    ...ncr,
    status: 'resolved',
    rootCause,
    correctiveAction,
    preventiveAction,
    resolvedBy,
    resolvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function verifyNCR(ncr: NCR, verifiedBy: string): NCR {
  return {
    ...ncr,
    status: 'verified',
    verifiedBy,
    verifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createSnagItem(input: {
  projectId: string
  snagNumber: string
  description: string
  priority: SnagItem['priority']
  category: SnagItem['category']
  location: string
  originator: string
  assignedTo: string
  dueDate: string
}): SnagItem {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    snagNumber: input.snagNumber,
    description: input.description,
    priority: input.priority,
    status: 'open',
    category: input.category,
    location: input.location,
    originator: input.originator,
    assignedTo: input.assignedTo,
    photoRefs: [],
    dueDate: input.dueDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function resolveSnag(snag: SnagItem, resolvedBy: string, photoRefs?: string[]): SnagItem {
  return {
    ...snag,
    status: 'resolved',
    resolvedBy,
    resolvedAt: new Date().toISOString(),
    photoRefs: photoRefs ?? snag.photoRefs,
    updatedAt: new Date().toISOString(),
  }
}

export function advanceChangeOrderStatus(current: ChangeOrderStatus): ChangeOrderStatus {
  const sequence: ChangeOrderStatus[] = ['draft', 'pending-review', 'approved', 'implemented']
  const idx = sequence.indexOf(current)
  if (idx >= 0 && idx < sequence.length - 1) return sequence[idx + 1]
  return current
}

export function advanceRFIStatus(current: RFIStatus): RFIStatus {
  const sequence: RFIStatus[] = ['open', 'answered', 'clarified', 'closed']
  const idx = sequence.indexOf(current)
  if (idx >= 0 && idx < sequence.length - 1) return sequence[idx + 1]
  return current
}

export function advanceNCRStatus(current: NCRStatus): NCRStatus {
  const sequence: NCRStatus[] = ['open', 'in-progress', 'resolved', 'verified', 'closed']
  const idx = sequence.indexOf(current)
  if (idx >= 0 && idx < sequence.length - 1) return sequence[idx + 1]
  return current
}
