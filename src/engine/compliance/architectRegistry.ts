import type { Architect, P4pGateDecision, PlanValidation } from '@/domain/architect'

export const SI_56_2025 = 'SI 56/2025'

export const ARCHITECT_REGISTRY: Architect[] = [
  {
    registrationNumber: 'ACZ-00142',
    name: 'Tendai Moyo',
    firm: 'Moyo & Associates',
    jurisdiction: 'Zimbabwe (ACZ)',
    accreditations: [SI_56_2025, 'ACZ Registered'],
  },
  {
    registrationNumber: 'ACZ-00817',
    name: 'Chiedza Ncube',
    firm: 'Studio Chiedza',
    jurisdiction: 'Zimbabwe (ACZ)',
    accreditations: [SI_56_2025, 'ACZ Registered'],
  },
  {
    registrationNumber: 'ACZ-01103',
    name: 'Farai Chirwa',
    firm: 'Chirwa Design Group',
    jurisdiction: 'Zimbabwe (ACZ)',
    accreditations: [SI_56_2025, 'ACZ Registered'],
  },
  {
    registrationNumber: 'ACZ-01566',
    name: 'Rutendo Dube',
    firm: 'Dube Architects',
    jurisdiction: 'Zimbabwe (ACZ)',
    accreditations: [SI_56_2025, 'ACZ Registered'],
  },
]

export function lookupArchitect(registrationNumber: string): Architect | null {
  const normalized = registrationNumber.trim().toUpperCase()
  return ARCHITECT_REGISTRY.find((a) => a.registrationNumber === normalized) ?? null
}

export function lookupArchitectByName(name: string): Architect | null {
  const normalized = name.trim().toLowerCase()
  return ARCHITECT_REGISTRY.find((a) => a.name.toLowerCase() === normalized) ?? null
}

export function validatePlanAgainstRegistry(
  planId: string,
  architect: Architect,
): PlanValidation | null {
  if (!architect.accreditations.includes(SI_56_2025)) return null
  return {
    planId,
    architectRegistrationNumber: architect.registrationNumber,
    architectName: architect.name,
    validatedAt: new Date().toISOString(),
    reference: `${SI_56_2025}-ACZ-${architect.registrationNumber}`,
  }
}

export function gateP4pBid(input: {
  validation: PlanValidation | null
  contractValueCents: number
  regulation?: string
}): P4pGateDecision {
  const regulation = input.regulation ?? SI_56_2025
  if (!input.validation) {
    return {
      allowed: false,
      regulation,
      reason:
        'Plan is not validated against the ACZ Architect Registry. ' +
        `${regulation} requires drawings to be prepared or validated by a registered architect before any P4P bid is issued.`,
    }
  }
  if (input.contractValueCents < 0) {
    return { allowed: false, regulation, reason: 'Contract value must not be negative.' }
  }
  return {
    allowed: true,
    regulation,
    reason: `Plan validated by ${input.validation.architectName} (${input.validation.architectRegistrationNumber}) on ${input.validation.validatedAt.slice(0, 10)}.`,
  }
}

export function planValidationStatus(validations: PlanValidation[], planId: string): PlanValidation | null {
  return validations.find((v) => v.planId === planId) ?? null
}
