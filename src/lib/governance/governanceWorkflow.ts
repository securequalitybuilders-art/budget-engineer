export type SignoffRole = 'owner' | 'reviewer' | 'viewer'

export type WorkflowState = 'draft' | 'in-review' | 'changes-requested' | 'approved'

export interface SignoffGate {
  id: string
  label: string
  description: string
  required: boolean
  passed: boolean
}

export interface GovernanceState {
  workflowState: WorkflowState
  role: SignoffRole
  submittedAt: string | null
  reviewedAt: string | null
  approvedBy: string | null
  comment: string
}

export interface SignoffCheckInput {
  hasPlan: boolean
  hasDesign: boolean
  hasComplianceScore: boolean
  complianceScore: number
  criticalIssues: number
  reviewDecision: 'PASS' | 'CONDITIONAL PASS' | 'REVISE' | null
  hasStructural: boolean
  hasMep: boolean
}

const GATE_DEFS: Omit<SignoffGate, 'passed'>[] = [
  { id: 'plan', label: 'Active Plan', description: 'A valid floor plan must exist', required: true },
  { id: 'design', label: 'Design Selected', description: 'A design option must be selected', required: true },
  { id: 'compliance', label: 'Code Compliance', description: 'Jurisdiction compliance checks must pass (score ≥ 50)', required: true },
  { id: 'critical', label: 'No Critical Issues', description: 'Code review must have zero critical issues', required: true },
  { id: 'decision', label: 'Review Decision', description: 'Code review must not return REVISE', required: true },
  { id: 'structural', label: 'Structural Pre-Design', description: 'Member candidates generated', required: false },
  { id: 'mep', label: 'MEP Pre-Design', description: 'Fixture/circuit/unit candidates generated', required: false },
]

export function getGateDefs(): typeof GATE_DEFS {
  return GATE_DEFS
}

export function evaluateGates(input: SignoffCheckInput): SignoffGate[] {
  return GATE_DEFS.map((g) => {
    let passed = false
    switch (g.id) {
      case 'plan': passed = input.hasPlan; break
      case 'design': passed = input.hasDesign; break
      case 'compliance': passed = input.hasComplianceScore && input.complianceScore >= 50; break
      case 'critical': passed = input.criticalIssues === 0; break
      case 'decision': passed = input.reviewDecision !== 'REVISE'; break
      case 'structural': passed = input.hasStructural; break
      case 'mep': passed = input.hasMep; break
    }
    return { ...g, passed }
  })
}

export function createInitialGovernance(): GovernanceState {
  return {
    workflowState: 'draft',
    role: 'owner',
    submittedAt: null,
    reviewedAt: null,
    approvedBy: null,
    comment: '',
  }
}

export function canSubmit(gates: SignoffGate[], state: GovernanceState): boolean {
  if (state.workflowState !== 'draft' && state.workflowState !== 'changes-requested') return false
  const requiredGates = gates.filter((g) => g.required)
  return requiredGates.every((g) => g.passed)
}

export function canApprove(state: GovernanceState, role: SignoffRole): boolean {
  return state.workflowState === 'in-review' && role === 'reviewer'
}

export function canRequestChanges(state: GovernanceState, role: SignoffRole): boolean {
  return state.workflowState === 'in-review' && (role === 'reviewer' || role === 'owner')
}

export function canReset(state: GovernanceState, role: SignoffRole): boolean {
  return (state.workflowState === 'changes-requested' || state.workflowState === 'approved') && role === 'owner'
}

export function transitionState(
  state: GovernanceState,
  action: 'submit' | 'approve' | 'request-changes' | 'reset',
): GovernanceState {
  const now = new Date().toISOString()
  switch (action) {
    case 'submit':
      return { ...state, workflowState: 'in-review', submittedAt: now, reviewedAt: null, approvedBy: null }
    case 'approve':
      return { ...state, workflowState: 'approved', reviewedAt: now, approvedBy: 'Reviewer' }
    case 'request-changes':
      return { ...state, workflowState: 'changes-requested', reviewedAt: now, approvedBy: null }
    case 'reset':
      return { ...state, workflowState: 'draft', submittedAt: null, reviewedAt: null, approvedBy: null, comment: '' }
    default:
      return state
  }
}
