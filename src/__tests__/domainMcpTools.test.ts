import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  boqSummary,
  escrowSummary,
  listProjects,
  loadProject,
  milestoneSummary,
  projectSummary,
  runComplianceAnalysis,
  searchCodes,
} from '@/mcp/domain-tools'
import type { BeProjectPackage } from '@/mcp/domain-tools'

let dir: string

const pkg: BeProjectPackage = {
  version: 4,
  format: 'budget-engineer-project',
  exportedAt: '2026-08-09T10:00:00.000Z',
  project: { id: 'proj-1', name: 'Mbudzi House', buildingType: 'house-residential', region: 'Harare', status: 'active' },
  designs: [{ id: 'd1' }, { id: 'd2' }],
  boqs: [
    {
      id: 'boq-1',
      designOptionId: 'd1',
      currency: 'USD',
      lineItems: [
        { id: 'l1', category: 'Substructure', description: 'Strip footing concrete', quantity: 10, unit: 'm3', unitRateCents: 250000, totalCents: 2500000 },
        { id: 'l2', category: 'Substructure', description: 'Blinding', quantity: 5, unit: 'm3', unitRateCents: 80000, totalCents: 400000 },
        { id: 'l3', category: 'Finishes', description: 'Floor screed', quantity: 40, unit: 'm2', unitRateCents: 15000, totalCents: 600000 },
      ],
      totals: { subtotalCents: 3500000, contingencyCents: 175000, professionalFeesCents: 245000, vatCents: 588000, grandTotalCents: 4508000 },
    },
  ],
  milestones: [
    { id: 'm1', name: 'Footings', releaseState: 'released', category: 'construction', plannedCostCents: 2000000, actualCostCents: 1950000, plannedDate: '2026-09-01' },
    { id: 'm2', name: 'Walls', releaseState: 'pending-review', category: 'construction', plannedCostCents: 3000000, plannedDate: '2026-10-01' },
    { id: 'm3', name: 'Roof', releaseState: 'locked', category: 'construction', plannedCostCents: 2500000, plannedDate: '2026-11-01' },
  ],
  escrows: [
    {
      id: 'esc-1',
      providerId: 'prov-1',
      status: 'locked',
      totalAmount: 75000,
      currency: 'USD',
      milestones: [
        { id: 'em1', status: 'released' },
        { id: 'em2', status: 'pending' },
        { id: 'em3', status: 'disputed' },
      ],
    },
  ],
  transactions: [{ id: 't1' }],
  planModels: [{ id: 'plan-1' }],
  dispatchOrders: [{ id: 'do1' }],
  dispatchHolds: [{ id: 'dh1' }],
  sovs: [{ id: 'sov1' }],
  finalAccounts: [{ id: 'fa1' }],
  lienWaivers: [{ id: 'lw1' }],
  gainFades: [{ id: 'gf1' }],
  historicalCosts: [{ id: 'hc1' }],
  lessons: [{ id: 'ls1' }],
  planValidations: [{ id: 'pv1' }],
  agentRuns: [{ id: 'ar1' }],
  traces: [{ id: 'tr1' }],
  ledgerEntries: [{ id: 'le1' }],
  changeLensAnalyses: [{ id: 'cl1' }],
  wipaaSnapshots: [{ id: 'ws1' }],
  sitePhotos: [{ id: 'sp1' }],
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'be-mcp-'))
  writeFileSync(join(dir, 'proj-1.beproj'), JSON.stringify(pkg))
  writeFileSync(join(dir, 'other.beproj'), JSON.stringify({ version: 4, project: { id: 'proj-2', name: 'Beta' }, exportedAt: '2026-08-09T11:00:00.000Z' }))
  writeFileSync(join(dir, 'corrupt.beproj'), '{{{ not json')
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('domain MCP tool core', () => {
  it('listProjects returns only .beproj files with metadata', () => {
    const projects = listProjects(dir)
    expect(projects).toHaveLength(3)
    const p1 = projects.find((p) => p.id === 'proj-1')
    expect(p1?.name).toBe('Mbudzi House')
    expect(p1?.version).toBe(4)
    expect(p1?.exportedAt).toContain('2026-08-09')
    expect(p1?.file).toBe('proj-1.beproj')
  })

  it('listProjects handles missing and corrupt dirs', () => {
    expect(listProjects(join(dir, 'does-not-exist'))).toEqual([])
    const corrupt = listProjects(dir).find((p) => p.version === -1)
    expect(corrupt?.file).toBe('corrupt.beproj')
    expect(corrupt?.id).toBeUndefined()
  })

  it('loadProject finds a package by project id', () => {
    const loaded = loadProject('proj-1', dir)
    expect(loaded?.project?.name).toBe('Mbudzi House')
    expect(loaded?.version).toBe(4)
  })

  it('loadProject returns null for unknown id', () => {
    expect(loadProject('missing', dir)).toBeNull()
  })

  it('loadProject ignores corrupt files and non-matching ids', () => {
    expect(loadProject('proj-2', dir)?.project?.id).toBe('proj-2')
  })

  it('projectSummary reports entity counts', () => {
    const s = projectSummary(pkg)
    expect(s.project?.name).toBe('Mbudzi House')
    expect(s.counts.designs).toBe(2)
    expect(s.counts.boqs).toBe(1)
    expect(s.counts.milestones).toBe(3)
    expect(s.counts.escrows).toBe(1)
    expect(s.counts.planModels).toBe(1)
    expect(s.counts.dispatchOrders).toBe(1)
    expect(s.counts.ledgerEntries).toBe(1)
    expect(s.counts.sitePhotos).toBe(1)
    expect(s.counts.traces).toBe(1)
  })

  it('milestoneSummary aggregates release states, categories and cost', () => {
    const s = milestoneSummary(pkg)
    expect(s.total).toBe(3)
    expect(s.releasedCount).toBe(1)
    expect(s.pendingCount).toBe(2)
    expect(s.byReleaseState).toEqual({ locked: 1, 'pending-review': 1, released: 1 })
    expect(s.byCategory).toEqual({ construction: 3 })
    expect(s.totalPlannedCents).toBe(7500000)
    expect(s.totalActualCents).toBe(1950000)
  })

  it('escrowSummary aggregates statuses, amounts and milestone states', () => {
    const s = escrowSummary(pkg)
    expect(s.total).toBe(1)
    expect(s.byStatus).toEqual({ locked: 1 })
    expect(s.totalAmount).toBe(75000)
    expect(s.heldAmount).toBe(75000)
    expect(s.releasedAmount).toBe(0)
    expect(s.milestoneCount).toBe(3)
    expect(s.milestoneByStatus).toEqual({ disputed: 1, pending: 1, released: 1 })
  })

  it('boqSummary reports per-BOQ line counts, category distribution and totals', () => {
    const s = boqSummary(pkg)
    expect(s).toHaveLength(1)
    const b = s[0]
    expect(b.lineItemCount).toBe(3)
    expect(b.lineItemsTotalCents).toBe(3500000)
    expect(b.lineItemsByCategory).toEqual({ Finishes: 1, Substructure: 2 })
    expect(b.totals?.grandTotalCents).toBe(4508000)
    expect(b.currency).toBe('USD')
  })

  it('empty package yields zeroed summaries', () => {
    const empty: BeProjectPackage = { project: null }
    expect(milestoneSummary(empty)).toMatchObject({ total: 0, totalPlannedCents: 0, releasedCount: 0 })
    expect(escrowSummary(empty)).toMatchObject({ total: 0, totalAmount: 0, milestoneCount: 0 })
    expect(boqSummary(empty)).toEqual([])
  })
})

describe('domain MCP RAG tools', () => {
  it('searchCodes returns top sections for the canonical ceiling-height query', async () => {
    const results = await searchCodes({ query: 'minimum ceiling height of a habitable room', k: 3 })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].sectionId).toBe('by-laws-1977:sec-4-1.3')
    expect(results[0].text.length).toBeGreaterThan(0)
  })

  it('searchCodes respects k and minScore bounds', async () => {
    const few = await searchCodes({ query: 'ceiling height', k: 1, minScore: 0 })
    expect(few).toHaveLength(1)
    const none = await searchCodes({ query: 'zzzqqq non-matching', k: 3, minScore: 0.5 })
    expect(none).toHaveLength(0)
  })

  it('runComplianceAnalysis runs local-rules without an LLM', async () => {
    const report = await runComplianceAnalysis({ query: 'minimum ceiling height of a habitable room', jurisdiction: 'zimbabwe' })
    expect(report.engineUsed).toBe('local-rules')
    expect(report.totalRules).toBeGreaterThan(0)
    expect(report.findings.some((f) => f.status === 'pass' || f.status === 'warn' || f.status === 'fail')).toBe(true)
  })

  it('RAG tools do not require an export dir', async () => {
    const results = await searchCodes({ query: 'fire resistance of external walls', k: 2 })
    expect(results.length).toBeGreaterThan(0)
  })
})
