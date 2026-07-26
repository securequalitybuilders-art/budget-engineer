import type {
  ProjectIntake,
  FeasibilityAssessment,
  RiskGate,
  RiskRegisterEntry,
  SolvencyCheck,
  GoNoGoDecision,
  FeasibilityResult,
  GateStatus,
} from '@/domain/assurance'

export function createProjectIntake(input: {
  projectId: string
  source: string
  clientName: string
  clientType: ProjectIntake['clientType']
  projectName: string
  projectDescription: string
  estimatedValueCents: number
  estimatedDurationDays: number
  location: string
  submittedBy: string
}): ProjectIntake {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    status: 'new',
    source: input.source,
    clientName: input.clientName,
    clientType: input.clientType,
    projectName: input.projectName,
    projectDescription: input.projectDescription,
    estimatedValueCents: input.estimatedValueCents,
    estimatedDurationDays: input.estimatedDurationDays,
    location: input.location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submittedBy: input.submittedBy,
  }
}

export function assessFeasibility(params: {
  budgetCents: number
  availableBudgetCents: number
  timelineDays: number
  availableTimelineDays: number
  hasTechnicalCapacity: boolean
  hasResources: boolean
}): Omit<FeasibilityAssessment, 'id' | 'projectId' | 'assessmentDate' | 'assessor' | 'notes' | 'risks' | 'recommendations'> {
  const budgetRatio = params.availableBudgetCents > 0 ? params.budgetCents / params.availableBudgetCents : 1
  const timelineRatio = params.availableTimelineDays > 0 ? params.timelineDays / params.availableTimelineDays : 1

  const budgetScore = Math.max(0, Math.min(100, (1 - budgetRatio) * 100))
  const timelineScore = Math.max(0, Math.min(100, (1 - timelineRatio) * 100))
  const technicalScore = params.hasTechnicalCapacity ? 80 : 30
  const resourceScore = params.hasResources ? 80 : 30
  const overallScore = Math.round((budgetScore + timelineScore + technicalScore + resourceScore) / 4)

  function scoreToResult(score: number): FeasibilityResult {
    if (score >= 70) return 'pass'
    if (score >= 40) return 'conditional'
    return 'fail'
  }

  return {
    overallResult: scoreToResult(overallScore),
    budgetFeasibility: scoreToResult(budgetScore),
    timelineFeasibility: scoreToResult(timelineScore),
    technicalFeasibility: scoreToResult(technicalScore),
    resourceFeasibility: scoreToResult(resourceScore),
    budgetScore: Math.round(budgetScore),
    timelineScore: Math.round(timelineScore),
    technicalScore: Math.round(technicalScore),
    resourceScore: Math.round(resourceScore),
    overallScore,
  }
}

export function assessGoNoGo(feasibility: FeasibilityAssessment, gates: RiskGate[]): GoNoGoDecision {
  const failedRequiredGates = gates.filter((g) => g.required && g.status === 'failed')
  if (failedRequiredGates.length > 0) return 'no-go'

  if (feasibility.overallResult === 'fail') return 'no-go'
  if (feasibility.overallResult === 'conditional') return 'defer'
  return 'go'
}

export function createRiskGate(gate: {
  projectId: string
  gateType: RiskGate['gateType']
  name: string
  description: string
  criteria: string[]
  order: number
  required: boolean
  checkedBy: string
}): RiskGate {
  return {
    id: crypto.randomUUID(),
    projectId: gate.projectId,
    gateType: gate.gateType,
    name: gate.name,
    status: 'not-started',
    required: gate.required,
    order: gate.order,
    description: gate.description,
    criteria: gate.criteria,
    evidenceRefs: [],
    checkedBy: gate.checkedBy,
    notes: '',
  }
}

export function evaluateGate(_gate: RiskGate, criteriaMet: boolean[], evidenceRefs: string[]): GateStatus {
  const allMet = criteriaMet.every((m) => m)
  if (allMet && evidenceRefs.length > 0) return 'passed'
  if (criteriaMet.some((m) => m)) return 'in-progress'
  return 'failed'
}

export function createRiskRegisterEntry(entry: {
  projectId: string
  category: RiskRegisterEntry['category']
  description: string
  severity: RiskRegisterEntry['severity']
  likelihood: number
  impact: number
  owner: string
  mitigation: string
  contingency: string
}): RiskRegisterEntry {
  const riskScore = entry.likelihood * entry.impact
  return {
    id: crypto.randomUUID(),
    projectId: entry.projectId,
    category: entry.category,
    description: entry.description,
    severity: entry.severity,
    likelihood: entry.likelihood,
    impact: entry.impact,
    riskScore,
    status: 'open',
    owner: entry.owner,
    mitigation: entry.mitigation,
    contingency: entry.contingency,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function computeRiskScore(likelihood: number, impact: number): number {
  return likelihood * impact
}

export function createSolvencyCheck(input: {
  projectId: string
  entityType: SolvencyCheck['entityType']
  entityId: string
  entityName: string
  checkedBy: string
}): SolvencyCheck {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName,
    checkDate: new Date().toISOString(),
    creditScore: 0,
    financialStatementsReviewed: false,
    litigationHistory: [],
    outstandingJudgments: [],
    isSolvent: false,
    notes: '',
    checkedBy: input.checkedBy,
  }
}
