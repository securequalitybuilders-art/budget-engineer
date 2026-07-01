import { describe, it, expect } from 'vitest'
import { buildBoqFromDesignOption, buildExportCsv, buildExportHtml, getCostPerM2 } from '@/adapters/designToBoq'
import type { DesignOption } from '@/domain/boq'

function makeDesign(overrides: Partial<DesignOption> = {}): DesignOption {
  return {
    id: 'test-1',
    name: overrides.name ?? 'Standard House',
    grossFloorArea: overrides.grossFloorArea ?? 150,
    floors: overrides.floors ?? 1,
    elements: overrides.elements ?? [],
  }
}

describe('designToBoq', () => {
  it('null design returns null', () => {
    expect(buildBoqFromDesignOption(null)).toBeNull()
  })

  it('Zimbabwe BOQ has grand total > 0 and USD', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const boq = buildBoqFromDesignOption(design, 'zimbabwe')
    expect(boq).not.toBeNull()
    expect(boq!.summary.grandTotal).toBeGreaterThan(0)
    expect(boq!.currency).toBe('USD')
    expect(boq!.items.length).toBeGreaterThan(0)
  })

  it('South Africa BOQ has ZAR currency', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const boq = buildBoqFromDesignOption(design, 'southafrica')
    expect(boq).not.toBeNull()
    expect(boq!.currency).toBe('ZAR')
    expect(boq!.summary.grandTotal).toBeGreaterThan(0)
  })

  it('Kenya BOQ has KES currency', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const boq = buildBoqFromDesignOption(design, 'kenya')
    expect(boq).not.toBeNull()
    expect(boq!.currency).toBe('KES')
    expect(boq!.summary.grandTotal).toBeGreaterThan(0)
  })

  it('Global BOQ has USD currency', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const boq = buildBoqFromDesignOption(design, 'global')
    expect(boq).not.toBeNull()
    expect(boq!.currency).toBe('USD')
    expect(boq!.summary.grandTotal).toBeGreaterThan(0)
  })

  it('region switch changes totals', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const zw = buildBoqFromDesignOption(design, 'zimbabwe')!
    const sa = buildBoqFromDesignOption(design, 'southafrica')!
    expect(zw.summary.grandTotal).not.toBe(sa.summary.grandTotal)
  })

  it('returns assumptions array', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const boq = buildBoqFromDesignOption(design, 'zimbabwe')
    expect(boq!.assumptions).toBeDefined()
    expect(boq!.assumptions.length).toBeGreaterThan(0)
  })

  it('no NaN in any numeric field', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const boq = buildBoqFromDesignOption(design, 'zimbabwe')!
    const nums = [
      boq.summary.subtotal, boq.summary.contingency, boq.summary.professionalFees,
      boq.summary.vat, boq.summary.grandTotal,
      ...boq.items.flatMap((item) => [item.quantity, item.rate, item.total]),
    ]
    for (const n of nums) {
      expect(Number.isNaN(n)).toBe(false)
    }
  })

  it('CSV export includes region and currency', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const boq = buildBoqFromDesignOption(design, 'zimbabwe')!
    const csv = buildExportCsv(boq, 'Zimbabwe (CWICR)')
    expect(csv).toContain('Zimbabwe')
    expect(csv).toContain('USD')
    expect(csv).toContain('Grand Total')
  })

  it('HTML export includes region and assumptions table', () => {
    const design = makeDesign({ name: 'Test House', grossFloorArea: 150 })
    const boq = buildBoqFromDesignOption(design, 'zimbabwe')!
    const html = buildExportHtml('Test House', boq, 150, 1, 'Zimbabwe (CWICR)', boq.assumptions)
    expect(html).toContain('Zimbabwe')
    expect(html).toContain('Rate Assumptions')
    expect(html).toContain('Test House')
  })

  it('getCostPerM2 returns positive value', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const boq = buildBoqFromDesignOption(design, 'zimbabwe')!
    const cpm = getCostPerM2(boq, 150)
    expect(cpm).toBeGreaterThan(0)
  })
})
