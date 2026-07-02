import { describe, it, expect } from 'vitest'
import { extractGeometryQuantities } from '@/adapters/geometryQuantitiesAdapter'
import type { DesignOption } from '@/domain/boq'

function makeDesign(overrides: Partial<DesignOption> = {}): DesignOption {
  return {
    id: 'test-1',
    name: overrides.name ?? 'Standard House',
    grossFloorArea: overrides.grossFloorArea ?? 150,
    floors: overrides.floors ?? 1,
    buildingType: 'house',
    elements: overrides.elements ?? [],
  }
}

describe('geometryQuantitiesAdapter', () => {
  it('null design returns safe zeros and warning', () => {
    const q = extractGeometryQuantities(null)
    expect(q.grossFloorArea).toBe(0)
    expect(q.externalWallLength).toBe(0)
    expect(q.doorCount).toBe(0)
    expect(q.windowCount).toBe(0)
    expect(q.roomCount).toBe(0)
    expect(q.warnings.length).toBeGreaterThan(0)
  })

  it('residential design has external wall length > 0', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const q = extractGeometryQuantities(design)
    expect(q.externalWallLength).toBeGreaterThan(0)
    expect(q.externalWallArea).toBeGreaterThan(0)
  })

  it('internal wall length > 0', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const q = extractGeometryQuantities(design)
    expect(q.internalWallLength).toBeGreaterThan(0)
    expect(q.partitionArea).toBeGreaterThan(0)
  })

  it('doorCount > 0 for residential', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const q = extractGeometryQuantities(design)
    expect(q.doorCount).toBeGreaterThan(0)
    expect(q.doorArea).toBeGreaterThan(0)
  })

  it('windowCount > 0 for residential', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const q = extractGeometryQuantities(design)
    expect(q.windowCount).toBeGreaterThan(0)
    expect(q.windowArea).toBeGreaterThan(0)
  })

  it('no NaN values in any numeric field', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const q = extractGeometryQuantities(design)
    const nums = [
      q.grossFloorArea, q.footprintArea, q.slabArea, q.roofArea,
      q.externalWallLength, q.internalWallLength, q.externalWallArea, q.internalWallArea, q.partitionArea,
      q.doorCount, q.windowCount, q.doorArea, q.windowArea, q.openingArea,
      q.roomCount, q.wetRoomCount, q.kitchenCount, q.bedroomCount, q.clinicRoomCount,
      q.finishFloorArea, q.serviceZoneArea,
    ]
    for (const n of nums) {
      expect(Number.isNaN(n)).toBe(false)
    }
  })

  it('clinic design has clinicRoomCount > 0', () => {
    const design = makeDesign({ name: 'Small rural clinic', grossFloorArea: 300 })
    const q = extractGeometryQuantities(design)
    expect(q.clinicRoomCount).toBeGreaterThan(0)
  })

  it('duplex has floors = 2 and higher quantities than single floor', () => {
    const single = makeDesign({ name: 'House', grossFloorArea: 120, floors: 1 })
    const duplex = makeDesign({ name: 'Duplex', grossFloorArea: 240, floors: 2 })
    const q1 = extractGeometryQuantities(single)
    const q2 = extractGeometryQuantities(duplex)
    expect(q2.floors).toBe(2)
    expect(q2.grossFloorArea).toBeGreaterThan(q1.grossFloorArea)
    expect(q2.roomCount).toBeGreaterThan(q1.roomCount)
  })

  it('finishFloorArea is positive and tracks room areas', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const q = extractGeometryQuantities(design)
    expect(q.finishFloorArea).toBeGreaterThan(0)
    expect(q.finishFloorArea).toBeGreaterThanOrEqual(q.grossFloorArea * 0.5)
  })

  it('wet rooms counted for residential bathrooms', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const q = extractGeometryQuantities(design)
    expect(q.wetRoomCount).toBeGreaterThan(0)
    expect(q.bedroomCount).toBeGreaterThan(0)
  })
})
