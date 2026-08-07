import { describe, it, expect } from 'vitest'
import { scheduleOfValuesFromMilestones, scheduleOfValuesFromBoq, sovTotals, sovReleasedCents } from '@/engine/closeout/scheduleOfValues'
import { prepareFinalAccount, settleRetainage, createLienWaiver, acknowledgeLienWaiver, advanceLienWaiverStatus } from '@/engine/closeout/financialCloseout'
import { analyzeGainFade, gainFadeFromBoq } from '@/engine/closeout/gainFade'
import { seedHistoricalCosts, addHistoricalCostRecord, romEstimate, anonymizeHistoricalRecord } from '@/engine/closeout/historicalCost'
import { addLesson, summarizeLessons, lessonSeverityLabel } from '@/engine/closeout/lessonsLearned'
import {
  ARCHITECT_REGISTRY,
  lookupArchitect,
  lookupArchitectByName,
  validatePlanAgainstRegistry,
  gateP4pBid,
  planValidationStatus,
  SI_56_2025,
} from '@/engine/compliance/architectRegistry'
import type { Milestone } from '@/domain/milestone'
import type { BOQ } from '@/types'

function makeMilestone(overrides: Partial<Milestone>): Milestone {
  return {
    id: 'm1',
    projectId: 'p1',
    name: 'Foundations',
    description: '',
    plannedDate: '2026-01-01',
    plannedCostCents: 500_000,
    linkedBOQSectionIds: [],
    linkedScheduleLineIds: [],
    requiredArtifacts: [],
    requiredReviewChecks: [],
    proofArtifacts: [],
    reviewChecks: [],
    releaseConditions: [],
    releaseState: 'locked',
    releaseDecisions: [],
    weight: 1,
    order: 0,
    category: 'construction',
    isCritical: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    notes: '',
    ...overrides,
  }
}

const boq: BOQ = {
  id: 'b1',
  projectId: 'p1',
  designId: 'd1',
  sections: [
    { id: 's1', code: 'A', title: 'Substructure', items: [], subtotalCents: 400_000 },
    { id: 's2', code: 'B', title: 'Superstructure', items: [], subtotalCents: 600_000 },
  ],
  totalCents: 1_000_000,
  contingencyCents: 0,
  currency: 'USD',
  generatedAt: '2026-01-01T00:00:00.000Z',
  estimateDepth: 'detailed',
}

describe('scheduleOfValues', () => {
  it('builds SOV from milestones with weights and codes', () => {
    const sov = scheduleOfValuesFromMilestones('p1', [
      makeMilestone({ id: 'm1', name: 'Foundations', plannedCostCents: 300_000, order: 0 }),
      makeMilestone({ id: 'm2', name: 'Roof', plannedCostCents: 200_000, order: 1 }),
    ])
    expect(sov.lines).toHaveLength(2)
    expect(sov.lines[0].code).toBe('SOV-01')
    expect(sov.lines[0].description).toBe('Foundations')
    expect(sov.lines[0].amountCents).toBe(300_000)
    expect(sov.lines[0].weightPct).toBe(60)
    expect(sov.contractValueCents).toBe(500_000)
    expect(sov.lines[0].linkedMilestoneIds).toEqual(['m1'])
  })

  it('scales lines when contract value differs from milestone total', () => {
    const sov = scheduleOfValuesFromMilestones('p1', [
      makeMilestone({ id: 'm1', name: 'Foundations', plannedCostCents: 100_000, order: 0 }),
      makeMilestone({ id: 'm2', name: 'Roof', plannedCostCents: 100_000, order: 1 }),
    ], 300_000)
    expect(sov.contractValueCents).toBe(300_000)
    expect(sov.lines.reduce((s, l) => s + l.amountCents, 0)).toBe(300_000)
    expect(sov.lines[0].amountCents).toBe(150_000)
  })

  it('builds SOV from BOQ sections', () => {
    const sov = scheduleOfValuesFromBoq('p1', boq)
    expect(sov.lines).toHaveLength(2)
    expect(sov.lines[0].code).toBe('A')
    expect(sov.lines[0].linkedBOQSectionIds).toEqual(['s1'])
    expect(sov.contractValueCents).toBe(1_000_000)
  })

  it('sovTotals reports allocation gaps', () => {
    const sov = scheduleOfValuesFromMilestones('p1', [
      makeMilestone({ id: 'm1', name: 'A', plannedCostCents: 100_000, order: 0 }),
    ], 200_000)
    const totals = sovTotals(sov)
    expect(totals.allocatedCents).toBe(200_000)
    expect(totals.unallocatedCents).toBe(0)
    expect(totals.fullyAllocated).toBe(true)
  })

  it('sovReleasedCents sums released milestone lines only', () => {
    const sov = scheduleOfValuesFromMilestones('p1', [
      makeMilestone({ id: 'm1', name: 'A', plannedCostCents: 100_000, order: 0 }),
      makeMilestone({ id: 'm2', name: 'B', plannedCostCents: 50_000, order: 1 }),
    ])
    expect(sovReleasedCents(sov, ['m1'])).toBe(100_000)
  })
})

describe('financialCloseout', () => {
  const base = {
    projectId: 'p1',
    contractValueCents: 1_000_000,
    approvedVariationsCents: 50_000,
    paymentsToDateCents: 700_000,
    retentionHeldCents: 100_000,
    retentionReleasePct: 50,
    defectsLiabilityExpired: false,
  }

  it('computes balance due with partial retention release', () => {
    const result = prepareFinalAccount(base)
    expect(result.grossValueCents).toBe(1_050_000)
    expect(result.retentionReleasableCents).toBe(50_000)
    expect(result.retentionWithheldCents).toBe(50_000)
    expect(result.balanceDueCents).toBe(300_000)
    expect(result.status).toBe('balance-due')
  })

  it('releases full retention when defects liability expires', () => {
    const result = prepareFinalAccount({ ...base, defectsLiabilityExpired: true })
    expect(result.retentionReleasableCents).toBe(100_000)
    expect(result.retentionWithheldCents).toBe(0)
  })

  it('flags overpaid when payments exceed gross value', () => {
    const result = prepareFinalAccount({ ...base, paymentsToDateCents: 1_100_000 })
    expect(result.status).toBe('overpaid')
  })

  it('settles exactly at gross value', () => {
    const result = prepareFinalAccount({ ...base, paymentsToDateCents: 1_000_000 })
    expect(result.status).toBe('settled')
  })

  it('settleRetainage caps release at releasable amount', () => {
    const account = prepareFinalAccount(base)
    const s = settleRetainage(account, 30_000)
    expect(s.retainedReleaseCents).toBe(30_000)
    expect(s.outstandingCents).toBe(270_000)
  })

  it('lien waiver lifecycle issued → acknowledged → recorded', () => {
    let waiver = createLienWaiver('p1', 'GC', 'final', 300_000)
    expect(waiver.status).toBe('issued')
    waiver = acknowledgeLienWaiver(waiver, 'Owner')
    expect(waiver.status).toBe('acknowledged')
    expect(waiver.acknowledgedBy).toBe('Owner')
    waiver = advanceLienWaiverStatus(waiver, 'recorded')
    expect(waiver.status).toBe('recorded')
  })
})

describe('gainFade', () => {
  it('classifies gains and fades per line and overall', () => {
    const result = analyzeGainFade('p1', [
      { code: 'A', description: 'Foundations', bidCents: 400_000 },
      { code: 'B', description: 'Roof', bidCents: 600_000 },
    ], [
      { code: 'A', actualCents: 350_000 },
      { code: 'B', actualCents: 700_000 },
    ])
    expect(result.lines[0].verdict).toBe('gain')
    expect(result.lines[1].verdict).toBe('fade')
    expect(result.varianceCents).toBe(50_000)
    expect(result.variancePct).toBe(5)
    expect(result.gains).toBe(1)
    expect(result.fades).toBe(1)
    expect(result.verdict).toBe('fade')
  })

  it('neutral when actuals equal bids', () => {
    const result = analyzeGainFade('p1', [
      { code: 'A', description: 'Foundations', bidCents: 400_000 },
    ], [{ code: 'A', actualCents: 400_000 }])
    expect(result.lines[0].verdict).toBe('neutral')
    expect(result.verdict).toBe('neutral')
  })

  it('gainFadeFromBoq maps record of actuals', () => {
    const result = gainFadeFromBoq('p1', [
      { code: 'A', description: 'Foundations', bidCents: 400_000 },
    ], { A: 300_000 })
    expect(result.lines[0].verdict).toBe('gain')
  })
})

describe('historicalCost', () => {
  it('seeds a regional benchmark pool', () => {
    expect(seedHistoricalCosts().length).toBeGreaterThan(5)
  })

  it('addHistoricalCostRecord computes cost per m2', () => {
    const records = addHistoricalCostRecord([], {
      projectId: 'p1',
      description: 'House',
      category: 'construction',
      region: 'Zimbabwe',
      areaM2: 100,
      totalCostCents: 20_000_000,
      completedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(records[0].costPerM2Cents).toBe(200_000)
  })

  it('romEstimate returns best and range scaled to area', () => {
    const records = seedHistoricalCosts()
    const estimate = romEstimate(records, { description: 'House', areaM2: 100, region: 'Zimbabwe' })
    expect(estimate).not.toBeNull()
    if (estimate) {
      expect(estimate.bestCents).toBe(estimate.bestPerM2Cents * 100)
      expect(estimate.rangeLowCents).toBeLessThan(estimate.bestCents)
      expect(estimate.rangeHighCents).toBeGreaterThan(estimate.bestCents)
    }
  })

  it('romEstimate falls back from category to region pool', () => {
    const records = seedHistoricalCosts()
    const estimate = romEstimate(records, { description: 'House', areaM2: 50, region: 'Zimbabwe', category: 'not-a-real-category' })
    expect(estimate?.matchedRecords).toBeGreaterThan(0)
  })

  it('romEstimate returns null for zero area or empty pool', () => {
    expect(romEstimate(seedHistoricalCosts(), { description: 'x', areaM2: 0, region: 'Zimbabwe' })).toBeNull()
    expect(romEstimate([], { description: 'x', areaM2: 100, region: 'Mars' })).toBeNull()
  })

  it('anonymizeHistoricalRecord drops projectId', () => {
    const anon = anonymizeHistoricalRecord(seedHistoricalCosts()[0])
    expect(anon).not.toHaveProperty('projectId')
  })
})

describe('lessonsLearned', () => {
  it('addLesson appends with id and createdAt', () => {
    const lessons = addLesson([], {
      projectId: 'p1',
      category: 'cost',
      title: 'Underbid rebar',
      description: 'Rebar prices spiked.',
      recommendation: 'Index rebar to market.',
      severity: 'high',
    })
    expect(lessons).toHaveLength(1)
    expect(lessons[0].id).toBeTruthy()
  })

  it('summarizeLessons tallies categories and high severity', () => {
    const lessons = addLesson(addLesson([], {
      projectId: 'p1', category: 'cost', title: 'A', description: '', recommendation: '', severity: 'high',
    }), {
      projectId: 'p1', category: 'cost', title: 'B', description: '', recommendation: '', severity: 'low',
    })
    const summary = summarizeLessons(lessons)
    expect(summary.total).toBe(2)
    expect(summary.highSeverity).toBe(1)
    expect(summary.topCategories[0]).toBe('cost')
  })

  it('lessonSeverityLabel capitalizes', () => {
    expect(lessonSeverityLabel('high')).toBe('High')
  })
})

describe('architectRegistry (SI 56/2025)', () => {
  it('exposes registered ACZ architects', () => {
    expect(ARCHITECT_REGISTRY.length).toBeGreaterThan(3)
    expect(ARCHITECT_REGISTRY.every((a) => a.accreditations.includes(SI_56_2025))).toBe(true)
  })

  it('lookupArchitect resolves by registration number case-insensitively', () => {
    expect(lookupArchitect('acz-00142')?.name).toBe('Tendai Moyo')
    expect(lookupArchitect('ACZ-99999')).toBeNull()
  })

  it('lookupArchitectByName resolves by name', () => {
    expect(lookupArchitectByName('Rutendo Dube')?.registrationNumber).toBe('ACZ-01566')
  })

  it('validatePlanAgainstRegistry returns null for non-accredited architects', () => {
    const validation = validatePlanAgainstRegistry('plan-1', { ...ARCHITECT_REGISTRY[0], accreditations: [] })
    expect(validation).toBeNull()
  })

  it('gateP4pBid blocks bids without a validated plan', () => {
    const gate = gateP4pBid({ validation: null, contractValueCents: 1_000_000 })
    expect(gate.allowed).toBe(false)
    expect(gate.regulation).toBe(SI_56_2025)
    expect(gate.reason).toContain('ACZ Architect Registry')
  })

  it('gateP4pBid allows bids with a validated plan', () => {
    const validation = validatePlanAgainstRegistry('plan-1', ARCHITECT_REGISTRY[0])
    const gate = gateP4pBid({ validation, contractValueCents: 1_000_000 })
    expect(gate.allowed).toBe(true)
  })

  it('planValidationStatus finds latest validation for a plan', () => {
    const validation = validatePlanAgainstRegistry('plan-1', ARCHITECT_REGISTRY[1])
    expect(validation).not.toBeNull()
    if (validation) {
      expect(planValidationStatus([validation], 'plan-1')?.architectRegistrationNumber).toBe('ACZ-00817')
      expect(planValidationStatus([validation], 'plan-2')).toBeNull()
    }
  })
})
