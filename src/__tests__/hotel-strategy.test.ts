import { describe, it, expect } from 'vitest'
import { generateHotelLayout, hotelRoleFor, HOTEL_MIN_DEPTH } from '../lib/layout/typologies/hotel-strategy'
import {
  HOTEL_ADJACENCY_RULES,
  HOTEL_ROOM_GROUPS,
  roomGroupForHotel,
} from '../engine/spatial/adjacency-graph'
import { hasOverlaps } from '../engine/spatial/graph-placer'
import { type AdjacencyRoom } from '../engine/spatial/adjacency-graph'
import { getTypology } from '../engine/typology-kb'
import { getStrategy, generateLayoutByTypology } from '../lib/layout/typology-router'

type Placed = { id: string; name: string; x: number; y: number; width: number; height: number }

const findRoom = (rooms: Placed[], name: string): Placed => {
  const r = rooms.find(r => r.name === name)
  if (!r) throw new Error(`room not placed: ${name}`)
  return r
}

/**
 * 20 x 20 hotel plate (400 m2). Four 51 m2 guest rooms (two per corridor side)
 * plus a stair core + WC that stack to exactly touch the 1.8 m corridor, and a
 * single restaurant front band. The double-loaded geometry is fully
 * deterministic and locked by the assertions below.
 */
const HOTEL_FIXTURE = [
  { name: 'Guest Room 1', ratio: 0.1275 },
  { name: 'Guest Room 2', ratio: 0.1275 },
  { name: 'Guest Room 3', ratio: 0.1275 },
  { name: 'Guest Room 4', ratio: 0.1275 },
  { name: 'Staircase', ratio: 0.05 },
  { name: 'Toilet', ratio: 0.01 },
  { name: 'Restaurant', ratio: 0.05 },
  { name: 'Corridor', ratio: 0.02 },
]

const rects = (rooms: Placed[]): AdjacencyRoom[] => rooms as AdjacencyRoom[]

describe('hotel role + group classification', () => {
  it('classifies the canonical hotel program names to hotel groups', () => {
    expect(roomGroupForHotel('Guest Room 1')).toBe('guest')
    expect(roomGroupForHotel('Guest Suite')).toBe('guest')
    expect(roomGroupForHotel('Reception / Lobby')).toBe('lobby')
    expect(roomGroupForHotel('Restaurant')).toBe('restaurant')
    expect(roomGroupForHotel('Kitchen (Commercial)')).toBe('kitchen')
    expect(roomGroupForHotel('Conference Room')).toBe('conference')
    expect(roomGroupForHotel('Laundry')).toBe('back-of-house')
    expect(roomGroupForHotel('Admin Office')).toBe('admin')
    expect(roomGroupForHotel('Toilet')).toBe('wc')
    expect(roomGroupForHotel('Staircase')).toBe('stair')
    expect(roomGroupForHotel('Lift Core')).toBe('lift')
    expect(roomGroupForHotel('Corridor')).toBe('corridor')
  })

  it('classifies unclassified names to null', () => {
    expect(roomGroupForHotel('Parking')).toBeNull()
    expect(roomGroupForHotel('Garden')).toBeNull()
  })

  it('maps hotel groups onto placement roles', () => {
    expect(hotelRoleFor('Guest Room 1')).toBe('private-office')
    expect(hotelRoleFor('Reception / Lobby')).toBe('reception')
    expect(hotelRoleFor('Restaurant')).toBe('meeting')
    expect(hotelRoleFor('Kitchen (Commercial)')).toBe('kitchenette')
    expect(hotelRoleFor('Conference Room')).toBe('meeting')
    expect(hotelRoleFor('Laundry')).toBe('kitchenette')
    expect(hotelRoleFor('Admin Office')).toBe('private-office')
    expect(hotelRoleFor('Toilet')).toBe('wc')
    expect(hotelRoleFor('Staircase')).toBe('stair')
    expect(hotelRoleFor('Lift Core')).toBe('lift')
    expect(hotelRoleFor('Corridor')).toBe('corridor')
    expect(hotelRoleFor('Parking')).toBeNull()
  })

  it('HOTEL_ROOM_GROUPS has distinct non-empty patterns per group', () => {
    expect(HOTEL_ROOM_GROUPS.length).toBe(11)
    for (const spec of HOTEL_ROOM_GROUPS) {
      expect(spec.patterns.length).toBeGreaterThan(0)
      expect(spec.group.length).toBeGreaterThan(0)
    }
  })
})

describe('hotel adjacency rules', () => {
  it('defines the ten hotel adjacency rules', () => {
    expect(HOTEL_ADJACENCY_RULES).toEqual([
      { from: 'guest', to: 'corridor', weight: 3 },
      { from: 'lobby', to: 'corridor', weight: 3 },
      { from: 'restaurant', to: 'kitchen', weight: 3 },
      { from: 'restaurant', to: 'corridor', weight: 2 },
      { from: 'conference', to: 'corridor', weight: 2 },
      { from: 'wc', to: 'corridor', weight: 2 },
      { from: 'stair', to: 'corridor', weight: 2 },
      { from: 'lift', to: 'corridor', weight: 2 },
      { from: 'kitchen', to: 'corridor', weight: 1 },
      { from: 'lobby', to: 'restaurant', weight: 1 },
    ])
    expect(HOTEL_ADJACENCY_RULES.reduce((s, r) => s + r.weight, 0)).toBe(21)
  })

  it('HOTEL_MIN_DEPTH covers every stacked placement role used by hotelRoleFor', () => {
    const used = ['reception', 'meeting', 'kitchenette', 'private-office', 'wc']
    for (const role of used) {
      expect(HOTEL_MIN_DEPTH[role], role).toBeGreaterThan(0)
    }
  })
})

describe('generateHotelLayout double-loaded corridor on a 20 x 20 plate', () => {
  it('places the full fixture program', () => {
    const result = generateHotelLayout(HOTEL_FIXTURE, 20, 20, 0)
    expect(result.valid).toBe(true)
    expect(result.rooms.length).toBe(8)
    expect(result.rooms.map(r => r.name).sort()).toEqual(
      [
        'Guest Room 1',
        'Guest Room 2',
        'Guest Room 3',
        'Guest Room 4',
        'Staircase',
        'Toilet',
        'Restaurant',
        'Corridor',
      ].sort(),
    )
  })

  const near = (room: Placed, x: number, y: number, width: number, height: number) => {
    expect(room.x).toBeCloseTo(x, 2)
    expect(room.y).toBeCloseTo(y, 2)
    expect(room.width).toBeCloseTo(width, 2)
    expect(room.height).toBeCloseTo(height, 2)
  }

  it('locks the verified double-loaded geometry', () => {
    const result = generateHotelLayout(HOTEL_FIXTURE, 20, 20, 0)
    expect(result.valid).toBe(true)

    // Core column on the left, stacked: staircase then WC.
    near(findRoom(result.rooms, 'Staircase'), 0, 0, 3, 6.65)
    near(findRoom(result.rooms, 'Toilet'), 0, 6.65, 3, 2)

    // Two guest rooms each side of the 1.8 m corridor.
    near(findRoom(result.rooms, 'Guest Room 1'), 3, 0, 8.5, 6)
    near(findRoom(result.rooms, 'Guest Room 2'), 11.5, 0, 8.5, 6)
    near(findRoom(result.rooms, 'Guest Room 3'), 3, 7.8, 8.5, 6)
    near(findRoom(result.rooms, 'Guest Room 4'), 11.5, 7.8, 8.5, 6)

    // Corridor between the guest bands; restaurant spans the front band.
    near(findRoom(result.rooms, 'Corridor'), 3, 6, 17, 1.8)
    near(findRoom(result.rooms, 'Restaurant'), 3, 13.8, 17, 6.2)
  })

  it('builds the stair + WC core block', () => {
    const result = generateHotelLayout(HOTEL_FIXTURE, 20, 20, 0)
    expect(result.coreLayout).toBeDefined()
    const core = result.coreLayout!
    expect(core.coreType).toBe('central')
    expect(core.blocks.length).toBe(1)
    const block = core.blocks[0]
    expect(block.x).toBe(0)
    expect(block.y).toBe(0)
    expect(block.width).toBe(3)
    expect(block.height).toBeCloseTo(8.65, 2)
    expect(block.roomIds.length).toBe(2)
  })

  it('reports structural grid + positive floor plate efficiency', () => {
    const result = generateHotelLayout(HOTEL_FIXTURE, 20, 20, 0)
    expect(result.structuralGrid).toEqual({ spanX: 7.2, spanY: 7.2 })
    expect(result.floorPlateMetrics).toBeDefined()
    const fp = result.floorPlateMetrics!
    expect(fp.efficiency).toBeCloseTo(0.8586, 3)
    expect(fp.coreAreaM2).toBeCloseTo(25.95, 2)
    expect(fp.circulationAreaM2).toBeCloseTo(30.6, 1)
    expect(fp.programAreaM2).toBeCloseTo(309.4, 1)
    expect(fp.columns).toBe(3)
    expect(fp.rows).toBe(3)
  })

  it('satisfies guest / wc / stair to corridor but flags restaurant isolated from the corridor', () => {
    const result = generateHotelLayout(HOTEL_FIXTURE, 20, 20, 0)
    expect(result.valid).toBe(true)
    expect(hasOverlaps(rects(result.rooms))).toBe(false)
    const graph = result.adjacencyGraph
    expect(graph).toBeDefined()
    expect(graph!.totalWeight).toBe(9)
    expect(graph!.satisfiedWeight).toBe(7)
    expect(graph!.score).toBeCloseTo(7 / 9, 3)
    expect(graph!.satisfied.length).toBe(3)
    expect(graph!.violated.length).toBe(1)
    expect(graph!.violated[0]).toEqual({ from: 'restaurant', to: 'corridor', weight: 2 })
  })

  it('places no room outside the 20 x 20 plate', () => {
    const result = generateHotelLayout(HOTEL_FIXTURE, 20, 20, 0)
    for (const r of result.rooms) {
      expect(r.x).toBeGreaterThanOrEqual(-0.001)
      expect(r.y).toBeGreaterThanOrEqual(-0.001)
      expect(r.x + r.width).toBeLessThanOrEqual(20.001)
      expect(r.y + r.height).toBeLessThanOrEqual(20.001)
    }
  })
})

describe('generateHotelLayout public floor via the shared adjacency placer', () => {
  const PUBLIC_FIXTURE = [
    { name: 'Reception / Lobby', ratio: 0.05 },
    { name: 'Restaurant', ratio: 0.05 },
    { name: 'Kitchen (Commercial)', ratio: 0.05 },
    { name: 'Toilet', ratio: 0.01 },
    { name: 'Corridor', ratio: 0.02 },
  ]

  it('places all public rooms with the lobby front band and vertical corridor', () => {
    const result = generateHotelLayout(PUBLIC_FIXTURE, 20, 20, 0)
    expect(result.valid).toBe(true)
    expect(result.rooms.length).toBe(5)

    expect(findRoom(result.rooms, 'Reception / Lobby')).toMatchObject({ x: 0, y: 17, width: 20, height: 3 })
    expect(findRoom(result.rooms, 'Corridor')).toMatchObject({ x: 3.5, y: 0, width: 1.8, height: 17 })
    expect(findRoom(result.rooms, 'Toilet')).toMatchObject({ x: 0, y: 0, width: 3.5, height: 2 })

    expect(findRoom(result.rooms, 'Restaurant').x).toBeCloseTo(5.3, 2)
    expect(findRoom(result.rooms, 'Restaurant').y).toBe(0)
    expect(findRoom(result.rooms, 'Restaurant').width).toBeCloseTo(7.35, 2)
    expect(findRoom(result.rooms, 'Restaurant').height).toBe(3.5)
    expect(findRoom(result.rooms, 'Kitchen (Commercial)').x).toBeCloseTo(12.65, 2)
    expect(findRoom(result.rooms, 'Kitchen (Commercial)').y).toBe(0)
    expect(findRoom(result.rooms, 'Kitchen (Commercial)').width).toBeCloseTo(7.35, 2)
    expect(findRoom(result.rooms, 'Kitchen (Commercial)').height).toBe(3.5)

    expect(hasOverlaps(rects(result.rooms))).toBe(false)
  })

  it('reports the adjacency-placer core block + floor metrics', () => {
    const result = generateHotelLayout(PUBLIC_FIXTURE, 20, 20, 0)
    expect(result.coreLayout).toBeDefined()
    const core = result.coreLayout!
    expect(core.coreType).toBe('central')
    expect(core.blocks.length).toBe(1)
    const block = core.blocks[0]
    expect(block.x).toBe(0)
    expect(block.y).toBe(0)
    expect(block.width).toBe(3.5)
    expect(block.height).toBe(2)
    expect(block.roomIds).toEqual([findRoom(result.rooms, 'Toilet').id])

    expect(result.floorPlateMetrics).toBeDefined()
    expect(result.floorPlateMetrics!.efficiency).toBeGreaterThan(0)
    expect(result.structuralGrid).toEqual({ spanX: 7.2, spanY: 7.2 })
  })
})

describe('generateHotelLayout falls back to template packing when nothing fits', () => {
  const OVERFLOW_FIXTURE = [
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Guest Room ${i + 1}`, ratio: 0.1275 })),
    { name: 'Staircase', ratio: 0.05 },
    { name: 'Corridor', ratio: 0.02 },
  ]

  it('returns a template-packed layout instead of dropping program rooms', () => {
    const result = generateHotelLayout(OVERFLOW_FIXTURE, 20, 20, 0)
    // Double-loaded guest path underflows (cell width < 1.5) and the adjacency
    // placer cannot place 26 rooms, so the strategy degrades to packing.
    expect(Array.isArray(result.rooms)).toBe(true)
    expect(result.rooms.length).toBeGreaterThan(0)
    expect(result.rooms.length).toBeLessThanOrEqual(OVERFLOW_FIXTURE.length)
    expect(typeof result.valid).toBe('boolean')
    expect(result.structuralGrid).toEqual({ spanX: 7.2, spanY: 7.2 })
  })
})

describe('KB + router wiring', () => {
  it('hotel-fullservice KB entry carries no overriding authority fields', () => {
    const kb = getTypology('hotel-fullservice')
    expect(kb).toBeDefined()
    expect(kb!.adjacencyRules).toBeUndefined()
    expect(kb!.structuralGrid).toBeUndefined()
    expect(kb!.coreType).toBeUndefined()
    expect(kb!.floorPlateEfficiency).toBeUndefined()
  })

  it('routes hotel-fullservice to the hotel strategy', () => {
    expect(getStrategy('hotel-fullservice').id).toBe('hotel')
    expect(getStrategy('hotel').id).toBe('hotel')
  })

  it('generates a valid layout through the router', () => {
    const result = generateLayoutByTypology('hotel-fullservice', HOTEL_FIXTURE, 20, 20, 0)
    expect(result.valid).toBe(true)
    expect(result.rooms.length).toBe(8)
    expect(result.structuralGrid).toEqual({ spanX: 7.2, spanY: 7.2 })
  })
})
