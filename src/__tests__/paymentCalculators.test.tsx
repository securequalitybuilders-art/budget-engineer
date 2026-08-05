// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import {
  calculateP4pCertificate,
  calculateWipaa,
  calculateWipSchedule,
  buildP4pCertificate,
  milestonesToP4pLineItems,
  escrowToWipaaInput,
  type P4pLineItem,
} from '@/engine/payment/paymentCalculators'
import { createMilestone } from '@/engine/milestone/milestoneEngine'
import type { EscrowAgreement } from '@/domain/marketplace'
import PaymentsPanel from '@/components/execution/PaymentsPanel'
import ExecutionPanel from '@/components/execution/ExecutionPanel'

afterEach(cleanup)

const TWO_PACKAGES: P4pLineItem[] = [
  { id: 'a', name: 'Rough-in', contractValue: 100_000, progressPct: 100 },
  { id: 'b', name: 'Substrates', contractValue: 50_000, progressPct: 50 },
]

describe('P4P calculateP4pCertificate', () => {
  it('computes earned value, 5% retention and net certificate value', () => {
    const cert = calculateP4pCertificate(TWO_PACKAGES)
    expect(cert.grossEarned).toBe(125_000)
    expect(cert.lineItems[0].earnedValue).toBe(100_000)
    expect(cert.lineItems[1].earnedValue).toBe(25_000)
    expect(cert.retentionAccumulated).toBe(6_250)
    expect(cert.retentionReleased).toBe(0)
    expect(cert.retentionWithheld).toBe(6_250)
    expect(cert.netCertificateValue).toBe(118_750)
    expect(cert.amountDue).toBe(118_750)
  })

  it('releases 50% of accumulated retention at practical completion', () => {
    const cert = calculateP4pCertificate(TWO_PACKAGES, { practicalCompletionReached: true })
    expect(cert.retentionReleased).toBe(3_125)
    expect(cert.retentionWithheld).toBe(3_125)
    expect(cert.netCertificateValue).toBe(121_875)
  })

  it('releases all retention once the defects liability period expires', () => {
    const cert = calculateP4pCertificate(TWO_PACKAGES, {
      practicalCompletionReached: true,
      defectsLiabilityComplete: true,
    })
    expect(cert.retentionReleased).toBe(6_250)
    expect(cert.retentionWithheld).toBe(0)
    expect(cert.netCertificateValue).toBe(125_000)
    expect(cert.amountDue).toBe(125_000)
  })

  it('subtracts previous payments and clamps the amount due at zero', () => {
    const cert = calculateP4pCertificate(TWO_PACKAGES, { previousPayments: 120_000 })
    expect(cert.netCertificateValue).toBe(118_750)
    expect(cert.amountDue).toBe(0)
  })

  it('clamps progress to the 0-100 range', () => {
    const cert = calculateP4pCertificate([
      { id: 'a', name: 'Over', contractValue: 100, progressPct: 150 },
      { id: 'b', name: 'Under', contractValue: 100, progressPct: -20 },
    ])
    expect(cert.lineItems[0].progressPct).toBe(100)
    expect(cert.lineItems[0].earnedValue).toBe(100)
    expect(cert.lineItems[1].progressPct).toBe(0)
    expect(cert.lineItems[1].earnedValue).toBe(0)
  })

  it('handles an empty line-item list', () => {
    const cert = calculateP4pCertificate([])
    expect(cert.grossEarned).toBe(0)
    expect(cert.retentionAccumulated).toBe(0)
    expect(cert.amountDue).toBe(0)
  })

  it('uses a configurable retention rate', () => {
    const cert = calculateP4pCertificate(TWO_PACKAGES, { retentionPct: 10 })
    expect(cert.retentionAccumulated).toBe(12_500)
    expect(cert.retentionWithheld).toBe(12_500)
  })
})

describe('WIPAA calculateWipaa', () => {
  it('recognises revenue by cost-to-cost completion and flags under-billing', () => {
    const result = calculateWipaa({
      contractValue: 100_000,
      costsIncurredToDate: 30_000,
      totalEstimatedCosts: 100_000,
      billedToDate: 20_000,
    })
    expect(result.costPctComplete).toBe(30)
    expect(result.revenueEarned).toBe(30_000)
    expect(result.grossProfitEarned).toBe(0)
    expect(result.overUnderBilled).toBe(10_000)
    expect(result.billingStatus).toBe('under-billed')
  })

  it('flags over-billing when billed exceeds earned revenue', () => {
    const result = calculateWipaa({
      contractValue: 100_000,
      costsIncurredToDate: 30_000,
      totalEstimatedCosts: 100_000,
      billedToDate: 45_000,
    })
    expect(result.overUnderBilled).toBe(-15_000)
    expect(result.billingStatus).toBe('over-billed')
  })

  it('flags on-track when billed matches earned revenue', () => {
    const result = calculateWipaa({
      contractValue: 100_000,
      costsIncurredToDate: 30_000,
      totalEstimatedCosts: 100_000,
      billedToDate: 30_000,
    })
    expect(result.billingStatus).toBe('on-track')
  })

  it('reports projected profit and remaining cost/revenue', () => {
    const result = calculateWipaa({
      contractValue: 100_000,
      costsIncurredToDate: 30_000,
      totalEstimatedCosts: 90_000,
      billedToDate: 25_000,
    })
    expect(result.projectedProfit).toBe(10_000)
    expect(result.projectedProfitPct).toBe(10)
    expect(result.remainingCosts).toBe(60_000)
    expect(result.remainingRevenue).toBe(66_666.67)
  })

  it('does not divide by zero when total estimated costs is zero', () => {
    const result = calculateWipaa({
      contractValue: 50_000,
      costsIncurredToDate: 10_000,
      totalEstimatedCosts: 0,
      billedToDate: 0,
    })
    expect(result.costPctComplete).toBe(0)
    expect(result.revenueEarned).toBe(0)
    expect(result.overUnderBilled).toBe(0)
    expect(result.billingStatus).toBe('on-track')
  })
})

describe('WIPAA calculateWipSchedule', () => {
  it('computes per-contract rows plus totals', () => {
    const { rows, totals } = calculateWipSchedule([
      { id: 'c1', name: 'House A', contractValue: 100_000, costsIncurredToDate: 60_000, totalEstimatedCosts: 100_000, billedToDate: 50_000 },
      { id: 'c2', name: 'House B', contractValue: 50_000, costsIncurredToDate: 10_000, totalEstimatedCosts: 50_000, billedToDate: 12_000 },
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0].costPctComplete).toBe(60)
    expect(rows[0].overUnderBilled).toBe(10_000)
    expect(rows[0].billingStatus).toBe('under-billed')
    expect(rows[1].overUnderBilled).toBe(-2_000)
    expect(rows[1].billingStatus).toBe('over-billed')
    expect(totals.contractValue).toBe(150_000)
    expect(totals.revenueEarned).toBe(70_000)
    expect(totals.overUnderBilled).toBe(8_000)
  })
})

describe('P4P/WIPAA adapters', () => {
  it('derives P4P line items from milestone progress', () => {
    const done = createMilestone({
      projectId: 'p1', name: 'Phase 1', description: '', plannedDate: '2026-01-01',
      plannedCostCents: 40_000_00, weight: 1, order: 0, category: 'construction', isCritical: true,
    })
    const stalled = createMilestone({
      projectId: 'p1', name: 'Phase 2', description: '', plannedDate: '2026-01-01',
      plannedCostCents: 20_000_00, weight: 1, order: 1, category: 'construction', isCritical: false,
    })
    stalled.requiredArtifacts = ['photo']
    const items = milestonesToP4pLineItems([done, stalled])
    expect(items[0].contractValue).toBe(40_000)
    expect(items[0].progressPct).toBe(100)
    expect(items[1].contractValue).toBe(20_000)
    expect(items[1].progressPct).toBe(70)
  })

  it('builds a full certificate directly from milestones', () => {
    const milestones = [
      createMilestone({
        projectId: 'p1', name: 'A', description: '', plannedDate: '2026-01-01',
        plannedCostCents: 60_000_00, weight: 1, order: 0, category: 'construction', isCritical: true,
      }),
      createMilestone({
        projectId: 'p1', name: 'B', description: '', plannedDate: '2026-01-01',
        plannedCostCents: 40_000_00, weight: 1, order: 1, category: 'construction', isCritical: false,
      }),
    ]
    milestones[1].requiredArtifacts = ['photo']
    const cert = buildP4pCertificate(milestones, { previousPayments: 30_000 })
    expect(cert.grossEarned).toBe(88_000)
    expect(cert.lineItems[0].name).toBe('A')
    expect(cert.lineItems[1].progressPct).toBe(70)
    expect(cert.amountDue).toBe(cert.netCertificateValue - 30_000)
  })

  it('maps escrow state to a WIPAA input', () => {
    const escrow: EscrowAgreement = {
      id: 'esc-1', projectId: 'p1', providerId: 'p', clientId: 'c',
      totalAmount: 200_000, currency: 'USD', terms: '', status: 'locked',
      createdAt: '2026-01-01', updatedAt: '2026-01-01',
      milestones: [
        { id: 'm1', escrowId: 'esc-1', title: 'M1', description: '', amount: 50_000, dueDate: '2026-02-01', status: 'released', verificationProof: [] },
        { id: 'm2', escrowId: 'esc-1', title: 'M2', description: '', amount: 150_000, dueDate: '2026-03-01', status: 'pending', verificationProof: [] },
      ],
    }
    const input = escrowToWipaaInput(escrow, { costsIncurredToDate: 80_000 })
    expect(input.contractValue).toBe(200_000)
    expect(input.billedToDate).toBe(50_000)
    expect(input.totalEstimatedCosts).toBe(200_000)
    expect(input.costsIncurredToDate).toBe(80_000)
  })
})

describe('PaymentsPanel', () => {
  it('renders the P4P certificate and WIPAA sections', () => {
    const milestone = createMilestone({
      projectId: 'p1', name: 'Rough-in & Infrastructure', description: '', plannedDate: '2026-01-01',
      plannedCostCents: 100_000_00, weight: 1, order: 0, category: 'construction', isCritical: true,
    })
    render(<PaymentsPanel milestones={[milestone]} contractValue={100_000} billedToDate={0} />)
    expect(screen.getByText('P4P — Payment for Progress')).toBeTruthy()
    expect(screen.getByText('Rough-in & Infrastructure')).toBeTruthy()
    expect(screen.getByText('WIPAA — Work-in-Progress Accounting Adjustment')).toBeTruthy()
    expect(screen.getByText('On track — billed matches earned revenue')).toBeTruthy()
  })
})

describe('ExecutionPanel payments tab', () => {
  it('opens the Payments tab showing the P4P certificate', async () => {
    render(<ExecutionPanel projectId="proj-pay" budgetCents={100_000_00} />)
    const paymentsButton = await screen.findByRole('button', { name: 'Payments' })
    fireEvent.click(paymentsButton)
    await waitFor(() => {
      expect(screen.getByText('P4P — Payment for Progress')).toBeTruthy()
    })
    expect(screen.getByText('Rough-in & Infrastructure')).toBeTruthy()
  })
})
