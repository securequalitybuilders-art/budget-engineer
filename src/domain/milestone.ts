export type ReleaseState = 'locked' | 'pending-review' | 'released' | 'held' | 'rejected'

export type ProofArtifactType = 'photo' | 'note' | 'document' | 'inspection-report' | 'certificate' | 'video' | 'other'

export type ReviewDecision = 'pass' | 'conditional-pass' | 'fail' | 're-submit'

export interface ProofArtifact {
  id: string
  milestoneId: string
  type: ProofArtifactType
  title: string
  description: string
  fileRef?: string
  capturedAt: string
  capturedBy: string
  geotag?: {
    lat: number
    lng: number
  }
  metadata?: Record<string, string | number | boolean>
  createdAt: string
}

export interface ReviewCheck {
  id: string
  milestoneId: string
  checkType: string
  description: string
  required: boolean
  assignedTo: string
  decision?: ReviewDecision
  decisionReason?: string
  decidedAt?: string
  linkedIssueId?: string
}

export interface ReleaseCondition {
  id: string
  milestoneId: string
  condition: string
  met: boolean
  evidenceRef?: string
  verifiedBy?: string
  verifiedAt?: string
}

export interface ReleaseDecision {
  id: string
  milestoneId: string
  decision: ReviewDecision
  decidedBy: string
  decidedAt: string
  reason: string
  conditions: string[]
  linkedDefectIds: string[]
  linkedChangeOrderIds: string[]
}

export interface Milestone {
  id: string
  projectId: string
  name: string
  description: string
  plannedDate: string
  actualDate?: string
  plannedCostCents: number
  actualCostCents?: number
  linkedBOQSectionIds: string[]
  linkedScheduleLineIds: string[]
  requiredArtifacts: ProofArtifactType[]
  requiredReviewChecks: string[]
  proofArtifacts: ProofArtifact[]
  reviewChecks: ReviewCheck[]
  releaseConditions: ReleaseCondition[]
  releaseState: ReleaseState
  releaseDecisions: ReleaseDecision[]
  weight: number
  order: number
  category: 'design' | 'procurement' | 'construction' | 'commissioning' | 'handover'
  isCritical: boolean
  createdAt: string
  updatedAt: string
  completedAt?: string
  delayDays?: number
  delayReason?: string
  notes: string
}
