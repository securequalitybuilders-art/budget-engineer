import { describe, it, expect } from 'vitest'
import { designOptionToBimModel } from '@/adapters/designToBim'
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

describe('designToBim', () => {
  it('null design returns null', () => {
    expect(designOptionToBimModel(null)).toBeNull()
  })

  it('zero area design returns null', () => {
    const design = makeDesign({ grossFloorArea: 0 })
    expect(designOptionToBimModel(design)).toBeNull()
  })

  it('creates BimModel with walls and slabs', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const bim = designOptionToBimModel(design)
    expect(bim).not.toBeNull()
    expect(bim!.id).toBeTruthy()
    expect(bim!.elements.length).toBeGreaterThan(0)

    const walls = bim!.elements.filter((e) => e.type === 'wall')
    const slabs = bim!.elements.filter((e) => e.type === 'slab')
    expect(walls.length).toBeGreaterThan(0)
    expect(slabs.length).toBeGreaterThan(0)
  })

  it('includes slab elements for each floor', () => {
    const design = makeDesign({ grossFloorArea: 150, floors: 2 })
    const bim = designOptionToBimModel(design)
    const slabs = bim!.elements.filter((e) => e.type === 'slab')
    // Each floor gets a slab, including the roof-level floor
    expect(slabs.length).toBe(design.floors)
    // At least one slab should reference the roof slab type (IfcRoof) for the top floor
    const roofIfcSlabs = slabs.filter((s) => s.ifcClass === 'IfcRoof')
    expect(roofIfcSlabs.length).toBe(1)
  })

  it('includes opening elements for doors/windows', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const bim = designOptionToBimModel(design)
    const openings = bim!.elements.filter((e) => e.type === 'opening')
    expect(openings.length).toBeGreaterThan(0)
  })

  it('includes room zone elements', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const bim = designOptionToBimModel(design)
    const zones = bim!.elements.filter((e) => e.type === 'roomZone')
    expect(zones.length).toBeGreaterThan(0)
  })

  it('multi-floor design has correct floor count', () => {
    const design = makeDesign({ grossFloorArea: 240, floors: 2 })
    const bim = designOptionToBimModel(design)
    expect(bim!.floors.length).toBe(2)
  })

  it('no NaN in numeric fields', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const bim = designOptionToBimModel(design)!
    const allNums = [
      ...bim.elements.flatMap((e) => {
        if (e.type === 'wall') {
          const w = e as unknown as { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number }; thickness: number; height: number }
          return [w.start.x, w.start.y, w.start.z, w.end.x, w.end.y, w.end.z, w.thickness, w.height]
        }
        if (e.type === 'slab' || e.type === 'roof') {
          const s = e as unknown as { origin: { x: number; y: number; z: number }; width: number; depth: number; thickness: number }
          return [s.origin.x, s.origin.y, s.origin.z, s.width, s.depth, s.thickness]
        }
        return []
      }),
    ]
    for (const n of allNums) {
      expect(Number.isNaN(n)).toBe(false)
    }
  })
})
