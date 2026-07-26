export type ProjectIntakeStatus = 'new' | 'feasibility' | 'cleared' | 'rejected' | 'on-hold'

export type FeasibilityResult = 'pass' | 'conditional' | 'fail'

export type GoNoGoDecision = 'go' | 'no-go' | 'defer'

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low'

export type RiskStatus = 'open' | 'mitigated' | 'closed' | 'accepted'

export type GateType = 'title' | 'legal' | 'site' | 'funding' | 'zoning' | 'environmental' | 'compliance' | 'procurement'

export type GateStatus = 'not-started' | 'in-progress' | 'passed' | 'failed' | 'waived'

export interface ProjectIntake {
  id: string
  projectId: string
  status: ProjectIntakeStatus
  source: string
  clientName: string
  clientType: 'individual' | 'company' | 'institution' | 'government'
  projectName: string
  projectDescription: string
  estimatedValueCents: number
  estimatedDurationDays: number
  location: string
  siteAddress?: string
  createdAt: string
  updatedAt: string
  submittedBy: string
  reviewedBy?: string
  reviewedAt?: string
  decision?: GoNoGoDecision
  decisionReason?: string
}

export interface FeasibilityAssessment {
  id: string
  projectId: string
  assessmentDate: string
  assessor: string
  overallResult: FeasibilityResult
  budgetFeasibility: FeasibilityResult
  timelineFeasibility: FeasibilityResult
  technicalFeasibility: FeasibilityResult
  resourceFeasibility: FeasibilityResult
  budgetScore: number
  timelineScore: number
  technicalScore: number
  resourceScore: number
  overallScore: number
  notes: string
  risks: string[]
  recommendations: string[]
}

export interface RiskGate {
  id: string
  projectId: string
  gateType: GateType
  name: string
  status: GateStatus
  required: boolean
  order: number
  description: string
  criteria: string[]
  evidenceRefs: string[]
  checkedBy: string
  checkedAt?: string
  approvedBy?: string
  approvedAt?: string
  notes: string
}

export interface RiskRegisterEntry {
  id: string
  projectId: string
  category: 'technical' | 'financial' | 'legal' | 'site' | 'procurement' | 'safety' | 'environmental' | 'political'
  description: string
  severity: RiskSeverity
  likelihood: number
  impact: number
  riskScore: number
  status: RiskStatus
  owner: string
  mitigation: string
  contingency: string
  createdAt: string
  updatedAt: string
  closedAt?: string
}

export interface SolvencyCheck {
  id: string
  projectId: string
  entityType: 'client' | 'contractor' | 'supplier'
  entityId: string
  entityName: string
  checkDate: string
  creditScore: number
  bankConfirmationRef?: string
  financialStatementsReviewed: boolean
  litigationHistory: string[]
  outstandingJudgments: string[]
  isSolvent: boolean
  notes: string
  checkedBy: string
}
