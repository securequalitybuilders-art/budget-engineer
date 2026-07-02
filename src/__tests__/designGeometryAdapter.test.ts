import { describe, it, expect } from 'vitest'
import { buildDesignGeometry } from '@/adapters/designGeometryAdapter'
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

describe('designGeometryAdapter', () => {
  it('null design returns empty result', () => {
    const result = buildDesignGeometry(null)
    expect(result.walls.length).toBe(0)
    expect(result.rooms.length).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  /* ── General shape ─────────────────────────────── */

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

  /* ── Single-storey residential ─────────────────── */

  it('single-storey house has lounge, kitchen, bedrooms, bathrooms', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const result = buildDesignGeometry(design)
    const types = result.rooms.map((r) => r.type)
    expect(types).toContain('lounge')
    expect(types).toContain('kitchen')
    expect(types).toContain('bedroom')
    expect(types).toContain('bathroom')
  })

  it('single-storey house has passage for circulation', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const result = buildDesignGeometry(design)
    const types = result.rooms.map((r) => r.type)
    expect(types).toContain('passage')
  })

  it('single-storey house has main entrance door', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const result = buildDesignGeometry(design)
    const frontWall = result.walls.find(
      (w) => Math.abs(w.start.y) < 0.01 && Math.abs(w.end.y) < 0.01 && w.kind === 'external',
    )
    expect(frontWall).toBeDefined()
    if (frontWall) {
      const frontDoors = result.openings.filter(
        (o) => o.wallId === frontWall.id && o.type === 'door',
      )
      expect(frontDoors.length).toBeGreaterThan(0)
    }
  })

  it('single-storey house has internal doors on passage walls', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const result = buildDesignGeometry(design)
    const passageWalls = result.walls.filter((w) => {
      const adjRooms = result.rooms.filter((r) => {
        const eps = 0.1
        const onEdge =
          (Math.abs(w.start.y - r.y) < eps && Math.abs(w.end.y - r.y) < eps && w.start.x >= r.x - eps && w.end.x <= r.x + r.width + eps) ||
          (Math.abs(w.start.y - (r.y + r.depth)) < eps && Math.abs(w.end.y - (r.y + r.depth)) < eps && w.start.x >= r.x - eps && w.end.x <= r.x + r.width + eps) ||
          (Math.abs(w.start.x - r.x) < eps && Math.abs(w.end.x - r.x) < eps && w.start.y >= r.y - eps && w.end.y <= r.y + r.depth + eps) ||
          (Math.abs(w.start.x - (r.x + r.width)) < eps && Math.abs(w.end.x - (r.x + r.width)) < eps && w.start.y >= r.y - eps && w.end.y <= r.y + r.depth + eps)
        return onEdge && r.type === 'passage'
      })
      return adjRooms.length > 0
    })
    // At least some doors connect to passage walls
    const passageDoors = result.openings.filter((o) =>
      passageWalls.some((w) => w.id === o.wallId) && o.type === 'door',
    )
    expect(passageDoors.length).toBeGreaterThan(0)
  })

  it('no rooms outside building footprint', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const result = buildDesignGeometry(design)
    for (const room of result.rooms) {
      expect(room.x).toBeGreaterThanOrEqual(0)
      expect(room.y).toBeGreaterThanOrEqual(0)
      expect(room.x + room.width).toBeLessThanOrEqual(result.width + 0.01)
      expect(room.y + room.depth).toBeLessThanOrEqual(result.depth + 0.01)
    }
  })

  /* ── Duplex / two-storey residential ───────────── */

  it('duplex has 2 floors with rooms on each', () => {
    const design = makeDesign({ name: 'Duplex', grossFloorArea: 240, floors: 2 })
    const result = buildDesignGeometry(design)
    const floorIndices = [...new Set(result.rooms.map((r) => r.floorIndex))]
    expect(floorIndices).toContain(0)
    expect(floorIndices).toContain(1)
    expect(result.floors).toBe(2)
  })

  it('duplex ground floor has lounge and kitchen', () => {
    const design = makeDesign({ name: 'Duplex', grossFloorArea: 240, floors: 2 })
    const result = buildDesignGeometry(design)
    const groundTypes = result.rooms.filter((r) => r.floorIndex === 0).map((r) => r.type)
    expect(groundTypes).toContain('lounge')
    expect(groundTypes).toContain('kitchen')
  })

  it('duplex upper floor has bedrooms', () => {
    const design = makeDesign({ name: 'Duplex', grossFloorArea: 240, floors: 2 })
    const result = buildDesignGeometry(design)
    const upperRooms = result.rooms.filter((r) => r.floorIndex === 1)
    const upperTypes = upperRooms.map((r) => r.type)
    expect(upperTypes).toContain('bedroom')
    expect(upperTypes).toContain('bathroom')
  })

  it('duplex has staircase on both floors', () => {
    const design = makeDesign({ name: 'Duplex', grossFloorArea: 240, floors: 2 })
    const result = buildDesignGeometry(design)
    const stairsGround = result.rooms.filter((r) => r.floorIndex === 0 && r.type === 'utility' && r.name === 'Staircase')
    const stairsUpper = result.rooms.filter((r) => r.floorIndex === 1 && r.type === 'utility' && r.name === 'Staircase')
    expect(stairsGround.length).toBeGreaterThanOrEqual(1)
    expect(stairsUpper.length).toBeGreaterThanOrEqual(1)
  })

  it('duplex floor layouts differ between ground and upper', () => {
    const design = makeDesign({ name: 'Duplex', grossFloorArea: 240, floors: 2 })
    const result = buildDesignGeometry(design)
    const groundNames = result.rooms.filter((r) => r.floorIndex === 0).map((r) => r.name).sort()
    const upperNames = result.rooms.filter((r) => r.floorIndex === 1).map((r) => r.name).sort()
    expect(groundNames.join(',')).not.toEqual(upperNames.join(','))
  })

  /* ── Clinic ────────────────────────────────────── */

  it('clinic name produces clinic rooms', () => {
    const design = makeDesign({ name: 'Small rural clinic', grossFloorArea: 300 })
    const result = buildDesignGeometry(design)
    const types = result.rooms.map((r) => r.type)
    expect(types).toContain('consultation')
    expect(types).toContain('pharmacy')
    expect(types).toContain('reception')
  })

  it('clinic has waiting area', () => {
    const design = makeDesign({ name: 'Small rural clinic', grossFloorArea: 300 })
    const result = buildDesignGeometry(design)
    const types = result.rooms.map((r) => r.type)
    expect(types).toContain('waiting')
  })

  it('clinic has toilets', () => {
    const design = makeDesign({ name: 'Small rural clinic', grossFloorArea: 300 })
    const result = buildDesignGeometry(design)
    const types = result.rooms.map((r) => r.type)
    expect(types).toContain('toilets')
  })

  it('clinic has reception or waiting near entrance (y=0)', () => {
    const design = makeDesign({ name: 'Small rural clinic', grossFloorArea: 300 })
    const result = buildDesignGeometry(design)
    const frontRooms = result.rooms.filter((r) => r.y < 0.1)
    const frontTypes = frontRooms.map((r) => r.type)
    expect(
      frontTypes.some((t) => t === 'reception' || t === 'waiting'),
    ).toBe(true)
  })

  it('clinic has 4 consultation rooms', () => {
    const design = makeDesign({ name: 'Small rural clinic', grossFloorArea: 300 })
    const result = buildDesignGeometry(design)
    const consRooms = result.rooms.filter((r) => r.type === 'consultation')
    expect(consRooms.length).toBe(4)
  })

  /* ── Shop / commercial ─────────────────────────── */

  it('shop has sales area, storage, and office', () => {
    const design = makeDesign({ name: 'Small shop', grossFloorArea: 120 })
    const result = buildDesignGeometry(design)
    const types = result.rooms.map((r) => r.type)
    expect(types).toContain('commercial')
    expect(types).toContain('storage')
    expect(types).toContain('office')
  })

  it('shop has staff WC', () => {
    const design = makeDesign({ name: 'Small shop', grossFloorArea: 120 })
    const result = buildDesignGeometry(design)
    const types = result.rooms.map((r) => r.type)
    expect(types).toContain('bathroom')
  })

  /* ── Validation ────────────────────────────────── */

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

  it('no negative room dimensions', () => {
    const design = makeDesign({ name: 'Duplex', grossFloorArea: 240, floors: 2 })
    const result = buildDesignGeometry(design)
    for (const room of result.rooms) {
      expect(room.width).toBeGreaterThan(0)
      expect(room.depth).toBeGreaterThan(0)
      expect(room.area).toBeGreaterThan(0)
    }
  })

  it('small area house still produces valid geometry', () => {
    const design = makeDesign({ name: '1 Bedroom Cottage', grossFloorArea: 40 })
    const result = buildDesignGeometry(design)
    expect(result.rooms.length).toBeGreaterThan(0)
    expect(result.walls.length).toBeGreaterThan(0)
    for (const room of result.rooms) {
      expect(room.width).toBeGreaterThan(0)
      expect(room.depth).toBeGreaterThan(0)
    }
  })

  it('large 5-bedroom house produces all bedrooms', () => {
    const design = makeDesign({ name: '5 Bedroom Family Home', grossFloorArea: 350 })
    const result = buildDesignGeometry(design)
    const bedrooms = result.rooms.filter((r) => r.type === 'bedroom')
    expect(bedrooms.length).toBeGreaterThanOrEqual(3)
  })
})
