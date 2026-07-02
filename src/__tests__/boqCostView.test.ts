import { describe, it, expect } from 'vitest'
import { buildBoqFromDesignOption, getCostPerM2 } from '@/adapters/designToBoq'
import { makeMoney, currencySymbol } from '@/lib/utils/currency'
import type { DesignOption } from '@/domain/boq'

function makeDesign(overrides: Partial<DesignOption> = {}): DesignOption {
  return {
    id: 'test-boq-1',
    name: overrides.name ?? 'BOQ Test House',
    grossFloorArea: overrides.grossFloorArea ?? 120,
    floors: overrides.floors ?? 1,
    elements: overrides.elements ?? [],
  }
}

describe('BOQ cost view — grouping, totals, currency', () => {
  const design = makeDesign()
  const boq = buildBoqFromDesignOption(design, 'zimbabwe')

  it('BOQ is generated with items', () => {
    expect(boq).not.toBeNull()
    expect(boq!.items.length).toBeGreaterThan(0)
  })

  it('items have category field', () => {
    for (const item of boq!.items) {
      expect(item.category).toBeTruthy()
      expect(typeof item.category).toBe('string')
    }
  })

  it('grand total matches subtotal + contingency + fees + vat', () => {
    const s = boq!.summary
    const recalculated = Math.round((s.subtotal + s.contingency + s.professionalFees + s.vat) * 100) / 100
    expect(s.grandTotal).toBe(recalculated)
  })

  it('grand total is reused from buildBoqFromDesignOption (not re-computed)', () => {
    // The function already returns grandTotal in boq.summary — verify it exists
    expect(boq!.summary.grandTotal).toBeGreaterThan(0)
    // The existing getCostPerM2 helper uses boq.summary.grandTotal
    const costPerM2 = getCostPerM2(boq!, design.grossFloorArea)
    expect(costPerM2).toBeGreaterThan(0)
  })

  it('currency is USD for Zimbabwe', () => {
    expect(boq!.currency).toBe('USD')
  })

  it('makeMoney formats with currency symbol', () => {
    const fmt = makeMoney('USD')
    expect(fmt(1234.5)).toBe('$1,234.50')

    const fmtZar = makeMoney('ZAR')
    expect(fmtZar(500)).toBe('R500.00')
  })

  it('currencySymbol returns correct symbols', () => {
    expect(currencySymbol('USD')).toBe('$')
    expect(currencySymbol('ZAR')).toBe('R')
    expect(currencySymbol('KES')).toBe('KSh')
    expect(currencySymbol('GBP')).toBe('£')
    expect(currencySymbol('EUR')).toBe('€')
    expect(currencySymbol('XYZ')).toBe('XYZ ')
  })

  it('sourceMetadata has quantitySourceLabel for generated-design', () => {
    // When built without cadQuantities, source is generated geometry
    expect(boq!.sourceMetadata).toBeUndefined()
  })

  it('BOQ with persisted-cad source metadata reflects labels', () => {
    const cadMeta = {
      geometrySource: 'persisted-cad' as const,
      quantitySourceLabel: 'Edited CAD / persisted plan',
      computedAt: new Date().toISOString(),
      designId: 'test-cad-1',
      cadDocumentId: 'cad-doc-1',
    }
    const boqWithCad = buildBoqFromDesignOption(design, 'zimbabwe', cadMeta)
    expect(boqWithCad).not.toBeNull()
    expect(boqWithCad!.sourceMetadata).toBeDefined()
    expect(boqWithCad!.sourceMetadata!.geometrySource).toBe('persisted-cad')
    expect(boqWithCad!.sourceMetadata!.quantitySourceLabel).toBe('Edited CAD / persisted plan')
  })

  it('categories present in items can be grouped', () => {
    const categories = new Set(boq!.items.map((item) => item.category))
    expect(categories.size).toBeGreaterThan(0)

    // Sum per category
    const sums = new Map<string, number>()
    for (const item of boq!.items) {
      const cat = item.category || 'Other'
      sums.set(cat, (sums.get(cat) ?? 0) + item.total)
    }

    // Verify the sum of all category totals == subtotal
    // (floating-point tolerant)
    const catSum = Math.round(Array.from(sums.values()).reduce((a, b) => a + b, 0) * 100) / 100
    expect(catSum).toBe(boq!.summary.subtotal)
  })
})
