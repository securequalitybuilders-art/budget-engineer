import { db } from '@/db/db'
import type { ProjectIntake, FeasibilityAssessment, RiskGate, RiskRegisterEntry, SolvencyCheck, GoNoGoDecision, GateStatus } from '@/domain/assurance'
import { createProjectIntake, assessFeasibility, assessGoNoGo, createRiskGate, evaluateGate, createRiskRegisterEntry, createSolvencyCheck } from '@/engine/assurance/assuranceEngine'

export async function saveProjectIntake(intake: ProjectIntake): Promise<void> {
  await db.projectIntakes.put(intake)
}

export async function getProjectIntake(projectId: string): Promise<ProjectIntake | undefined> {
  return db.projectIntakes.where({ projectId }).first()
}

export async function createAndSaveProjectIntake(input: Parameters<typeof createProjectIntake>[0]): Promise<ProjectIntake> {
  const intake = createProjectIntake(input)
  await db.projectIntakes.add(intake)
  return intake
}

export async function saveFeasibilityAssessment(assessment: FeasibilityAssessment): Promise<void> {
  await db.feasibilityAssessments.put(assessment)
}

export async function getFeasibilityAssessment(projectId: string): Promise<FeasibilityAssessment | undefined> {
  return db.feasibilityAssessments.where({ projectId }).first()
}

export async function assessAndSaveFeasibility(
  projectId: string,
  assessor: string,
  params: Parameters<typeof assessFeasibility>[0]
): Promise<FeasibilityAssessment> {
  const result = assessFeasibility(params)
  const assessment: FeasibilityAssessment = {
    ...result,
    id: crypto.randomUUID(),
    projectId,
    assessmentDate: new Date().toISOString(),
    assessor,
    notes: '',
    risks: [],
    recommendations: [],
  }
  await db.feasibilityAssessments.add(assessment)
  return assessment
}

export async function updateProjectIntakeDecision(projectId: string, decision: GoNoGoDecision, reason: string, reviewedBy: string): Promise<void> {
  const intake = await getProjectIntake(projectId)
  if (!intake) return
  await db.projectIntakes.update(intake.id, {
    decision,
    decisionReason: reason,
    reviewedBy,
    reviewedAt: new Date().toISOString(),
    status: decision === 'go' ? 'cleared' : decision === 'no-go' ? 'rejected' : 'feasibility',
    updatedAt: new Date().toISOString(),
  })
}

export async function saveRiskGate(gate: RiskGate): Promise<void> {
  await db.riskGates.put(gate)
}

export async function getRiskGates(projectId: string): Promise<RiskGate[]> {
  return db.riskGates.where({ projectId }).toArray()
}

export async function createAndSaveRiskGate(input: Parameters<typeof createRiskGate>[0]): Promise<RiskGate> {
  const gate = createRiskGate(input)
  await db.riskGates.add(gate)
  return gate
}

export async function evaluateAndSaveGate(gateId: string, criteriaMet: boolean[], evidenceRefs: string[]): Promise<GateStatus | null> {
  const gate = await db.riskGates.get(gateId)
  if (!gate) return null
  const status = evaluateGate(gate, criteriaMet, evidenceRefs)
  await db.riskGates.update(gateId, { status, evidenceRefs, checkedAt: new Date().toISOString() })
  return status
}

export async function saveRiskRegisterEntry(entry: RiskRegisterEntry): Promise<void> {
  await db.riskRegister.put(entry)
}

export async function getRiskRegister(projectId: string): Promise<RiskRegisterEntry[]> {
  return db.riskRegister.where({ projectId }).toArray()
}

export async function createAndSaveRiskRegisterEntry(input: Parameters<typeof createRiskRegisterEntry>[0]): Promise<RiskRegisterEntry> {
  const entry = createRiskRegisterEntry(input)
  await db.riskRegister.add(entry)
  return entry
}

export async function saveSolvencyCheck(check: SolvencyCheck): Promise<void> {
  await db.solvencyChecks.put(check)
}

export async function getSolvencyChecks(projectId: string): Promise<SolvencyCheck[]> {
  return db.solvencyChecks.where({ projectId }).toArray()
}

export async function createAndSaveSolvencyCheck(input: Parameters<typeof createSolvencyCheck>[0]): Promise<SolvencyCheck> {
  const check = createSolvencyCheck(input)
  await db.solvencyChecks.add(check)
  return check
}

export async function runGoNoGo(projectId: string): Promise<GoNoGoDecision | null> {
  const feasibility = await getFeasibilityAssessment(projectId)
  const gates = await getRiskGates(projectId)
  if (!feasibility) return null
  return assessGoNoGo(feasibility, gates)
}
