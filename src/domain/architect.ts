export interface Architect {
  registrationNumber: string
  name: string
  firm: string
  jurisdiction: string
  accreditations: string[]
}

export interface PlanValidation {
  planId: string
  architectRegistrationNumber: string
  architectName: string
  validatedAt: string
  reference: string
}

export interface P4pGateDecision {
  allowed: boolean
  regulation: string
  reason: string
}
