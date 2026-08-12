import { describe, it, expect } from 'vitest'
import { executeTool, DEFAULT_MARKET_RATES } from '@/engine/tools/executor'
import { createIndex, RagIndex } from '@/engine/rag/ragIndex'
import type { CodeDocument } from '@/engine/rag/types'

const ZIQS_FIXTURE: CodeDocument = {
  id: 'ziqs-smm',
  title: 'ZIQS Standard Method of Measurement (fixture)',
  code: 'ziqs/zimbabwe',
  jurisdiction: 'zimbabwe',
  sections: [
    {
      id: 'ziqs-smm:sec-3',
      heading: 'Excavation',
      level: 1,
      text: 'Excavation is measured as net volume (m³). Scaffolding is measured by area (m²) of the vertical face supported.',
    },
  ],
}

describe('tool executor — read tools', () => {
  it('query_blaws retrieves the By-Laws 1977 corpus', () => {
    const res = executeTool('query_blaws', { query: 'minimum ceiling height', chapter: '4' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { found: boolean; hits: { docId: string; chapter: string | null }[] }
    expect(data.found).toBe(true)
    expect(data.hits.length).toBeGreaterThan(0)
    expect(data.hits.every((h) => h.docId === 'by-laws-1977')).toBe(true)
    expect(data.hits[0].chapter).toBe('4')
  })

  it('query_blaws with chapter "all" skips the chapter filter', () => {
    const res = executeTool('query_blaws', { query: 'minimum ceiling height', chapter: 'all' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { hits: { chapter: string | null }[] }
    expect(data.hits.length).toBeGreaterThan(0)
  })

  it('query_saz retrieves the SAZ catalogue', () => {
    const res = executeTool('query_saz', { query: 'Zimbabwe standards for concrete masonry units and aggregates' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { found: boolean; hits: { docId: string }[] }
    expect(data.found).toBe(true)
    expect(data.hits.some((h) => h.docId === 'saz-catalogue')).toBe(true)
  })

  it('query_ziqs reports the not-embedded corpus honestly', () => {
    const res = executeTool('query_ziqs', { query: 'excavation net volume' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { found: boolean; note: string; canonicalRules: string[] }
    expect(data.found).toBe(false)
    expect(data.note).toContain('ziqs-smm')
    expect(data.canonicalRules.some((r) => r.includes('Excavation'))).toBe(true)
  })

  it('query_ziqs searches an injected ZIQS index', () => {
    const index = createIndex([ZIQS_FIXTURE])
    const res = executeTool('query_ziqs', { query: 'scaffolding area', section: 'all' }, { index })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { found: boolean; hits: { text: string }[] }
    expect(data.found).toBe(true)
    expect(data.hits.some((h) => h.text.includes('Scaffolding'))).toBe(true)
  })

  it('query_si56 approves a registered architect and gates unregistered plans', () => {
    const okRes = executeTool('query_si56', { planId: 'P-1', architectRegistrationNumber: 'ACZ-00142' })
    expect(okRes.ok).toBe(true)
    if (!okRes.ok) return
    const ok = okRes.data as { validation: { architectName: string } | null; gate: { allowed: boolean } }
    expect(ok.validation?.architectName).toBe('Tendai Moyo')
    expect(ok.gate.allowed).toBe(true)

    const blocked = executeTool('query_si56', { planId: 'P-2', architectRegistrationNumber: 'ACZ-99999' })
    expect(blocked.ok).toBe(true)
    if (!blocked.ok) return
    const gate = (blocked.data as { gate: { allowed: boolean } }).gate
    expect(gate.allowed).toBe(false)
  })

  it('query_market_index returns deterministic USD quotes', () => {
    const res = executeTool('query_market_index', { symbol: 'BRICK-SAZ7', currency: 'USD' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { currency: string; quotes: { symbol: string; currentCents: number }[] }
    expect(data.currency).toBe('USD')
    expect(data.quotes).toHaveLength(1)
    expect(data.quotes[0].symbol).toBe('BRICK-SAZ7')
    expect(data.quotes[0].currentCents).toBeGreaterThan(0)
  })

  it('query_market_index converts to ZWG', () => {
    const res = executeTool('query_market_index', { symbol: 'CEMENT', currency: 'ZWG' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { currency: string; fx: number }
    expect(data.currency).toBe('ZWG')
    expect(data.fx).toBe(26)
  })
})

describe('tool executor — write tools', () => {
  it('calculate_brick_quantity uses the brick engine and stays compliant', () => {
    const res = executeTool('calculate_brick_quantity', { length_m: 10, height_m: 2.4, thickness_units: 1, wastage_pct: 5 })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { quantity: number; wallThicknessMm: number; compliant: boolean; bond_type: string }
    expect(data.quantity).toBeGreaterThan(0)
    expect(data.wallThicknessMm).toBe(230)
    expect(data.compliant).toBe(true)
    expect(data.bond_type).toBe('stretcher')
  })

  it('calculate_concrete_volume routes to the concrete engine', () => {
    const res = executeTool('calculate_concrete_volume', { length_m: 5, width_m: 2, depth_m: 0.5 })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { volume_m3: number; cement_bags: number; mix_ratio: string }
    expect(data.volume_m3).toBeCloseTo(5)
    expect(data.cement_bags).toBeGreaterThan(0)
    expect(data.mix_ratio).toBe('1:2:4')
  })

  it('calculate_tco applies freight + defect risk', () => {
    const res = executeTool('calculate_tco', { price_cents: 10000, quantity: 2, freight_cents: 500, defect_probability_pct: 10 })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { price_cents: number; freight_cents: number; defect_cost_cents: number; total_cost_cents: number }
    expect(data.price_cents).toBe(20000)
    expect(data.freight_cents).toBe(500)
    expect(data.defect_cost_cents).toBe(4000)
    expect(data.total_cost_cents).toBe(24500)
  })

  it('p4p_calculator applies overhead and margin mark-up', () => {
    const res = executeTool('p4p_calculator', { direct_costs: 100000, overhead_pct: 10, desired_margin_pct: 5 })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { total: number }
    expect(data.total).toBe(115500)
  })

  it('wipaa_calculator flags over/under billing', () => {
    const over = executeTool('wipaa_calculator', { project_id: 'p1', month: '2026-08', work_certified: 120000, cash_requested: 100000 })
    expect(over.ok).toBe(true)
    if (over.ok) expect((over.data as { billing_status: string }).billing_status).toBe('over-billed')

    const under = executeTool('wipaa_calculator', { project_id: 'p1', month: '2026-08', work_certified: 80000, cash_requested: 100000 })
    expect(under.ok).toBe(true)
    if (under.ok) expect((under.data as { billing_status: string }).billing_status).toBe('under-billed')

    const onTrack = executeTool('wipaa_calculator', { project_id: 'p1', month: '2026-08', work_certified: 100000, cash_requested: 100000 })
    expect(onTrack.ok).toBe(true)
    if (onTrack.ok) expect((onTrack.data as { billing_status: string }).billing_status).toBe('on-track')
  })
})

describe('tool executor — guards and failures', () => {
  it('rejects out-of-scope agent calls as structured refusals', () => {
    const res = executeTool('query_blaws', { query: 'party wall' }, { role: 'calculator' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('not permitted')

    const res2 = executeTool('calculate_brick_quantity', { length_m: 5, height_m: 3 }, { role: 'researcher' })
    expect(res2.ok).toBe(false)
  })

  it('rejects invalid arguments without throwing', () => {
    const res = executeTool('calculate_concrete_volume', { length_m: -5, width_m: 2, depth_m: 0.5 })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('Invalid arguments')
  })

  it('rejects string-injection attempts', () => {
    const res = executeTool('calculate_brick_quantity', { length_m: '10', height_m: 3 })
    expect(res.ok).toBe(false)
  })

  it('rejects non-compliant brick specifications', () => {
    const res = executeTool('calculate_brick_quantity', { length_m: 10, height_m: 2.4, thickness_units: 0.5 })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { nonCompliant: boolean; error: string }
    expect(data.nonCompliant).toBe(true)
    expect(data.error).toContain('230mm')
  })

  it('defaults are present and rates table is well-formed', () => {
    expect(DEFAULT_MARKET_RATES.length).toBeGreaterThanOrEqual(3)
    expect(DEFAULT_MARKET_RATES.every((r) => r.baseRateCents > 0 && r.year > 2000)).toBe(true)
    expect(new RagIndex().size).toBe(0)
  })
})
