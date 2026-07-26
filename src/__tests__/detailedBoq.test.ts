import { describe, it, expect } from 'vitest'
import { generateDetailedBoq, buildDetailedBoqCsv, type DetailedBoqConfig } from '@/lib/boq/detailedBoq'
import type { DesignOption } from '@/domain/boq'

function makeDesign(overrides: Partial<DesignOption> = {}): DesignOption {
  return {
    id: 'detailed-test-1',
    name: overrides.name ?? 'Test House',
    grossFloorArea: overrides.grossFloorArea ?? 150,
    floors: overrides.floors ?? 1,
    buildingType: 'house',
    elements: overrides.elements ?? [],
  }
}

function baseConfig(overrides: Partial<DetailedBoqConfig> = {}): DetailedBoqConfig {
  return {
    region: 'zimbabwe',
    roofType: 'concrete-slab',
    depth: 'trade-detailed',
    areaM2: 150,
    floorCount: 1,
    ...overrides,
  }
}

describe('generateDetailedBoq', () => {
  it('returns null-like items for zero-area design', () => {
    const design = makeDesign({ grossFloorArea: 0, elements: [] })
    const result = generateDetailedBoq(design, baseConfig({ areaM2: 0 }))
    expect(result.boq.items.length).toBeGreaterThan(0)
    expect(result.boq.summary.subtotal).toBeGreaterThan(0)
    expect(result.boq.summary.grandTotal).toBeGreaterThan(result.boq.summary.subtotal)
  })

  it('generates items with consistent categories', () => {
    const design = makeDesign()
    const result = generateDetailedBoq(design, baseConfig())
    const categories = new Set(result.boq.items.map((i) => i.category))
    expect(categories.has('Preliminaries')).toBe(true)
    expect(categories.has('Substructure')).toBe(true)
    expect(categories.has('Superstructure')).toBe(true)
    expect(categories.has('Roofing')).toBe(true)
    expect(categories.has('Openings')).toBe(true)
    expect(categories.has('Finishes')).toBe(true)
    expect(categories.has('Plumbing')).toBe(true)
    expect(categories.has('Electrical')).toBe(true)
    expect(categories.has('Mechanical')).toBe(true)
    expect(categories.has('External Works')).toBe(true)
  })

  it('shell depth produces fewer items than trade-detailed', () => {
    const design = makeDesign()
    const shell = generateDetailedBoq(design, baseConfig({ depth: 'shell' }))
    const detailed = generateDetailedBoq(design, baseConfig({ depth: 'trade-detailed' }))
    expect(shell.boq.items.length).toBeLessThan(detailed.boq.items.length)
  })

  it('shell-with-allowances depth adds finishes allowance', () => {
    const design = makeDesign()
    const result = generateDetailedBoq(design, baseConfig({ depth: 'shell-with-allowances' }))
    expect(result.boq.items.some((i) => i.description.includes('finishes'))).toBe(true)
    expect(result.boq.items.some((i) => i.category === 'Finishes')).toBe(true)
  })

  it('trade-detailed adds plumbing items', () => {
    const design = makeDesign()
    const result = generateDetailedBoq(design, baseConfig({ depth: 'trade-detailed' }))
    const plumbing = result.boq.items.filter((i) => i.category === 'Plumbing')
    expect(plumbing.length).toBeGreaterThan(0)
    expect(plumbing.every((p) => p.quantityRef === 'plumbing')).toBe(true)
  })

  it('trade-detailed adds electrical items', () => {
    const design = makeDesign()
    const result = generateDetailedBoq(design, baseConfig({ depth: 'trade-detailed' }))
    const electrical = result.boq.items.filter((i) => i.category === 'Electrical')
    expect(electrical.length).toBeGreaterThan(0)
    expect(electrical.every((e) => e.quantityRef === 'electrical')).toBe(true)
  })

  it('trade-detailed adds HVAC items', () => {
    const design = makeDesign()
    const result = generateDetailedBoq(design, baseConfig({ depth: 'trade-detailed' }))
    const hvac = result.boq.items.filter((i) => i.category === 'Mechanical')
    expect(hvac.length).toBeGreaterThan(0)
  })

  it('cgi-truss roof type produces different roofing items than concrete-slab', () => {
    const design = makeDesign()
    const concrete = generateDetailedBoq(design, baseConfig({ roofType: 'concrete-slab', depth: 'trade-detailed' }))
    const cgi = generateDetailedBoq(design, baseConfig({ roofType: 'cgi-truss', depth: 'trade-detailed' }))
    const concreteDescs = concrete.boq.items.filter((i) => i.category === 'Roofing').map((i) => i.description)
    const cgiDescs = cgi.boq.items.filter((i) => i.category === 'Roofing').map((i) => i.description)
    expect(concreteDescs.some((d) => d.includes('Concrete roof'))).toBe(true)
    expect(cgiDescs.some((d) => d.includes('CGI'))).toBe(true)
  })

  it('different regions produce different rates', () => {
    const design = makeDesign()
    const zw = generateDetailedBoq(design, baseConfig({ region: 'zimbabwe' }))
    const sa = generateDetailedBoq(design, baseConfig({ region: 'southafrica' }))
    expect(zw.boq.currency).not.toBe(sa.boq.currency)
  })

  it('summary includes contingency, fees and vat', () => {
    const design = makeDesign()
    const result = generateDetailedBoq(design, baseConfig())
    const s = result.boq.summary
    expect(s.contingency).toBeGreaterThan(0)
    expect(s.professionalFees).toBeGreaterThan(0)
    expect(s.vat).toBeGreaterThan(0)
    expect(s.grandTotal).toBeCloseTo(s.subtotal + s.contingency + s.professionalFees + s.vat, 2)
  })

  it('no NaN values in any item totals', () => {
    const design = makeDesign()
    const result = generateDetailedBoq(design, baseConfig())
    for (const item of result.boq.items) {
      expect(Number.isNaN(item.quantity)).toBe(false)
      expect(Number.isNaN(item.rate)).toBe(false)
      expect(Number.isNaN(item.total)).toBe(false)
    }
    expect(Number.isNaN(result.boq.summary.subtotal)).toBe(false)
    expect(Number.isNaN(result.boq.summary.grandTotal)).toBe(false)
  })

  it('all items have positive totals', () => {
    const design = makeDesign()
    const result = generateDetailedBoq(design, baseConfig())
    for (const item of result.boq.items) {
      expect(item.total).toBeGreaterThan(0)
    }
  })

  it('returns depth matching config', () => {
    const design = makeDesign()
    expect(generateDetailedBoq(design, baseConfig({ depth: 'shell' })).depth).toBe('shell')
    expect(generateDetailedBoq(design, baseConfig({ depth: 'shell-with-allowances' })).depth).toBe('shell-with-allowances')
    expect(generateDetailedBoq(design, baseConfig({ depth: 'trade-detailed' })).depth).toBe('detailed')
  })

  it('generates rate assumptions for every item', () => {
    const design = makeDesign()
    const result = generateDetailedBoq(design, baseConfig())
    expect(result.assumptions.length).toBe(result.boq.items.length)
    for (const a of result.assumptions) {
      expect(a.rate).toBeGreaterThan(0)
      expect(a.currency).toBeTruthy()
    }
  })

  it('returns quantities from geometry extraction', () => {
    const design = makeDesign()
    const result = generateDetailedBoq(design, baseConfig())
    expect(result.quantities.grossFloorArea).toBe(150)
  })
})

describe('buildDetailedBoqCsv', () => {
  it('returns a CSV string with headers', () => {
    const design = makeDesign()
    const result = generateDetailedBoq(design, baseConfig())
    const csv = buildDetailedBoqCsv(result.boq, 'USD')
    expect(csv).toContain('Category')
    expect(csv).toContain('Description')
    expect(csv).toContain('Quantity')
  })

  it('includes subtotal, contingency, fees, vat, grand total rows', () => {
    const design = makeDesign()
    const result = generateDetailedBoq(design, baseConfig())
    const csv = buildDetailedBoqCsv(result.boq, 'USD')
    expect(csv).toContain('Subtotal')
    expect(csv).toContain('Contingency')
    expect(csv).toContain('Professional Fees')
    expect(csv).toContain('VAT')
    expect(csv).toContain('Grand Total')
  })

  it('handles special characters in descriptions', () => {
    const design = makeDesign()
    const result = generateDetailedBoq(design, baseConfig())
    const csv = buildDetailedBoqCsv(result.boq, 'USD')
    expect(csv).not.toThrow
  })
})
