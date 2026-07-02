import { describe, it, expect } from 'vitest'
import { extractCadDocumentQuantities } from '@/adapters/cadQuantitiesAdapter'
import type { CadDocument } from '@/domain/cad'

function makeSampleCad(): CadDocument {
  return {
    id: 'cad-test-1',
    projectId: 'proj-1',
    designId: 'design-1',
    activeFloorId: 'f1',
    activeTool: 'select',
    floors: [{ id: 'f1', name: 'Ground Floor', elevation: 0, bim: { classification: 'Ground Floor' } }],
    layers: [],
    walls: [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, structuralRole: 'external', layerId: 'walls', bim: { classification: 'external wall' } },
      { id: 'w2', floorId: 'f1', start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, thickness: 0.23, structuralRole: 'external', layerId: 'walls', bim: { classification: 'external wall' } },
      { id: 'w3', floorId: 'f1', start: { x: 10, y: 8 }, end: { x: 0, y: 8 }, thickness: 0.23, structuralRole: 'external', layerId: 'walls', bim: { classification: 'external wall' } },
      { id: 'w4', floorId: 'f1', start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, thickness: 0.23, structuralRole: 'external', layerId: 'walls', bim: { classification: 'external wall' } },
      { id: 'w5', floorId: 'f1', start: { x: 5, y: 0 }, end: { x: 5, y: 8 }, thickness: 0.15, structuralRole: 'internal', layerId: 'walls', bim: { classification: 'internal partition' } },
    ],
    openings: [
      { id: 'o1', floorId: 'f1', wallId: 'w1', kind: 'door', offsetRatio: 0.4, width: 1, headHeight: 2.1, layerId: 'openings', bim: { classification: 'door' } },
      { id: 'o2', floorId: 'f1', wallId: 'w2', kind: 'window', offsetRatio: 0.5, width: 1.2, headHeight: 1.5, layerId: 'openings', bim: { classification: 'window' } },
      { id: 'o3', floorId: 'f1', wallId: 'w3', kind: 'window', offsetRatio: 0.3, width: 1.2, headHeight: 1.5, layerId: 'openings', bim: { classification: 'window' } },
    ],
    annotations: [],
    blocks: [],
  }
}

describe('cadQuantitiesAdapter', () => {
  it('null CAD returns warnings and zeros', () => {
    const qty = extractCadDocumentQuantities(null)
    expect(qty.warnings).toContain('No CadDocument provided')
    expect(qty.externalWallLength).toBe(0)
    expect(qty.doorCount).toBe(0)
    expect(qty.windowCount).toBe(0)
  })

  it('sample CAD returns positive wall lengths', () => {
    const cad = makeSampleCad()
    const qty = extractCadDocumentQuantities(cad)
    expect(qty.externalWallLength).toBeGreaterThan(0)
    expect(qty.internalWallLength).toBeGreaterThan(0)
  })

  it('external and internal wall lengths computed correctly', () => {
    const cad = makeSampleCad()
    const qty = extractCadDocumentQuantities(cad)
    // Perimeter: 10+8+10+8 = 36m external
    expect(qty.externalWallLength).toBeCloseTo(36, 0)
    // Internal: 8m
    expect(qty.internalWallLength).toBeCloseTo(8, 0)
  })

  it('wall area computed with default height 3m', () => {
    const cad = makeSampleCad()
    const qty = extractCadDocumentQuantities(cad)
    expect(qty.externalWallArea).toBeCloseTo(36 * 3, 0)
    expect(qty.internalWallArea).toBeCloseTo(8 * 3, 0)
  })

  it('door and window counts correct', () => {
    const cad = makeSampleCad()
    const qty = extractCadDocumentQuantities(cad)
    expect(qty.doorCount).toBe(1)
    expect(qty.windowCount).toBe(2)
  })

  it('opening area computed from door and window dimensions', () => {
    const cad = makeSampleCad()
    const qty = extractCadDocumentQuantities(cad)
    // door: 1 * 2.1 = 2.1, windows: 1.2 * 1.5 * 2 = 3.6, total: 5.7
    expect(qty.openingArea).toBeCloseTo(5.7, 1)
  })

  it('floor count matches floors array', () => {
    const cad = makeSampleCad()
    const qty = extractCadDocumentQuantities(cad)
    expect(qty.floors).toBe(1)
  })

  it('no wall cad returns warning', () => {
    const cad: CadDocument = {
      ...makeSampleCad(),
      walls: [],
    }
    const qty = extractCadDocumentQuantities(cad)
    expect(qty.warnings).toContain('CadDocument has no walls; quantities may be zero')
    expect(qty.externalWallLength).toBe(0)
  })

  it('invalid numbers are clamped', () => {
    const cad: CadDocument = {
      ...makeSampleCad(),
      walls: [
        { id: 'nan-wall', floorId: 'f1', start: { x: NaN, y: 0 }, end: { x: 10, y: 0 }, thickness: -5, structuralRole: 'external', layerId: 'walls', bim: { classification: 'external wall' } },
      ],
    }
    const qty = extractCadDocumentQuantities(cad)
    expect(Number.isNaN(qty.externalWallLength)).toBe(false)
    expect(qty.externalWallLength).toBe(0)
  })

  it('no NaN values in any fields', () => {
    const cad = makeSampleCad()
    const qty = extractCadDocumentQuantities(cad)
    const nums = [
      qty.floors, qty.externalWallLength, qty.internalWallLength,
      qty.externalWallArea, qty.internalWallArea,
      qty.doorCount, qty.windowCount, qty.openingArea,
    ]
    for (const n of nums) {
      expect(Number.isNaN(n)).toBe(false)
    }
  })
})
