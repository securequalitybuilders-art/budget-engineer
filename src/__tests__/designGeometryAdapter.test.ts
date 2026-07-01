import { describe, it, expect } from 'vitest'
import { buildDesignGeometry } from '@/adapters/designGeometryAdapter'
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

describe('designGeometryAdapter', () => {
  it('null design returns empty result', () => {
    const result = buildDesignGeometry(null)
    expect(result.walls.length).toBe(0)
    expect(result.rooms.length).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('150 m² house produces rooms, walls, openings', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const result = buildDesignGeometry(design)
    expect(result.rooms.length).toBeGreaterThan(0)
    expect(result.walls.length).toBeGreaterThan(0)
    expect(result.width).toBeGreaterThan(0)
    expect(result.depth).toBeGreaterThan(0)
  })

  it('has external and internal walls', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const result = buildDesignGeometry(design)
    const external = result.walls.filter((w) => w.kind === 'external')
    const internal = result.walls.filter((w) => w.kind === 'internal')
    expect(external.length).toBeGreaterThanOrEqual(4)
    expect(internal.length).toBeGreaterThan(0)
  })

  it('windows count > 0 for residential', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const result = buildDesignGeometry(design)
    const windows = result.openings.filter((o) => o.type === 'window')
    expect(windows.length).toBeGreaterThan(0)
  })

  it('doors count > 0 for residential', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const result = buildDesignGeometry(design)
    const doors = result.openings.filter((o) => o.type === 'door')
    expect(doors.length).toBeGreaterThan(0)
  })

  it('openings are clamped away from wall corners', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const result = buildDesignGeometry(design)
    for (const opening of result.openings) {
      const wall = result.walls.find((w) => w.id === opening.wallId)
      if (!wall) continue
      expect(opening.offset).toBeGreaterThanOrEqual(0.28)
    }
  })

  it('clinic name produces clinic rooms', () => {
    const design = makeDesign({ name: 'Small rural clinic', grossFloorArea: 300 })
    const result = buildDesignGeometry(design)
    const types = result.rooms.map((r) => r.type)
    expect(types).toContain('consultation')
    expect(types).toContain('pharmacy')
    expect(types).toContain('reception')
  })

  it('duplex has 2 floors with rooms on each', () => {
    const design = makeDesign({ name: 'Duplex', grossFloorArea: 240, floors: 2 })
    const result = buildDesignGeometry(design)
    const floorIndices = [...new Set(result.rooms.map((r) => r.floorIndex))]
    expect(floorIndices).toContain(0)
    expect(floorIndices).toContain(1)
    expect(result.floors).toBe(2)
  })

  it('no NaN values in any numeric field', () => {
    const design = makeDesign({ grossFloorArea: 150 })
    const result = buildDesignGeometry(design)
    const allNums = [
      result.width, result.depth, result.floors,
      ...result.rooms.flatMap((r) => [r.x, r.y, r.width, r.depth, r.area]),
      ...result.walls.flatMap((w) => [w.start.x, w.start.y, w.end.x, w.end.y, w.thickness, w.height]),
      ...result.openings.flatMap((o) => [o.width, o.height, o.offset]),
    ]
    for (const n of allNums) {
      expect(Number.isNaN(n)).toBe(false)
    }
  })
})
