import { describe, it, expect } from 'vitest'
import { generateClinicLayout, clinicRoleFor, CLINIC_MIN_DEPTH } from '../lib/layout/typologies/clinic-strategy'
import {
  CLINIC_ADJACENCY_RULES,
  CLINIC_ROOM_GROUPS,
  roomGroupForClinic,
} from '../engine/spatial/adjacency-graph'
import { hasOverlaps } from '../engine/spatial/graph-placer'
import { type AdjacencyRoom } from '../engine/spatial/adjacency-graph'
import { getTypology } from '../engine/typology-kb'
import { getStrategy, generateLayoutByTypology } from '../lib/layout/typology-router'
import { ROOM_PROGRAMS } from '../engine/roomPrograms'

type Placed = { id: string; name: string; x: number; y: number; width: number; height: number }

const findRoom = (rooms: Placed[], name: string): Placed => {
  const r = rooms.find(r => r.name === name)
  if (!r) throw new Error(`room not placed: ${name}`)
  return r
}

/**
 * 20 x 20 clinic plate (400 m2). Ratios deliberately match the strategy's
 * front-band layout (reception + pharmacy) so the geometry is fully
 * deterministic and locked by the assertions below.
 */
const CLINIC_FIXTURE = [
  { name: 'Reception / Waiting', ratio: 0.05 },
  { name: 'Consultation Room 1', ratio: 0.03 },
  { name: 'Consultation Room 2', ratio: 0.03 },
  { name: 'Consultation Room 3', ratio: 0.03 },
  { name: 'Treatment Room', ratio: 0.0375 },
  { name: 'Pharmacy / Dispensary', ratio: 0.025 },
  { name: 'Staff Room', ratio: 0.025 },
  { name: 'Toilet (Public)', ratio: 0.01 },
  { name: 'Toilet (Public)', ratio: 0.01 },
  { name: 'Store', ratio: 0.015 },
  { name: 'Corridor', ratio: 0.02 },
]

const rects = (rooms: Placed[]): AdjacencyRoom[] => rooms as AdjacencyRoom[]

describe('clinic role + group classification', () => {
  it('classifies the canonical clinic program names to clinic groups', () => {
    expect(roomGroupForClinic('Reception / Waiting')).toBe('reception')
    expect(roomGroupForClinic('Consultation Room 1')).toBe('consultation')
    expect(roomGroupForClinic('Treatment Room')).toBe('treatment')
    expect(roomGroupForClinic('Pharmacy / Dispensary')).toBe('pharmacy')
    expect(roomGroupForClinic('Nurse Station')).toBe('nurse')
    expect(roomGroupForClinic('Staff Room')).toBe('staff')
    expect(roomGroupForClinic('Store')).toBe('store')
    expect(roomGroupForClinic('Toilet (Public)')).toBe('wc')
    expect(roomGroupForClinic('Circulation')).toBe('corridor')
  })

  it('every ROOM_PROGRAMS.clinic name except the intentional Office maps to a clinic group', () => {
    for (const room of ROOM_PROGRAMS.clinic) {
      if (room.name === 'Office') continue
      expect(roomGroupForClinic(room.name), room.name).not.toBeNull()
    }
    expect(roomGroupForClinic('Office')).toBeNull()
  })

  it('maps clinic groups onto placement roles', () => {
    expect(clinicRoleFor('Reception / Waiting')).toBe('reception')
    expect(clinicRoleFor('Consultation Room 1')).toBe('private-office')
    expect(clinicRoleFor('Treatment Room')).toBe('meeting')
    expect(clinicRoleFor('Pharmacy / Dispensary')).toBe('pharmacy')
    expect(clinicRoleFor('Nurse Station')).toBe('kitchenette')
    expect(clinicRoleFor('Staff Room')).toBe('kitchenette')
    expect(clinicRoleFor('Store')).toBe('kitchenette')
    expect(clinicRoleFor('Toilet (Public)')).toBe('wc')
    expect(clinicRoleFor('Corridor')).toBe('corridor')
  })

  it('classifies unclassified names to null', () => {
    expect(clinicRoleFor('Office')).toBeNull()
    expect(roomGroupForClinic('Boardroom')).toBeNull()
  })

  it('CLINIC_ROOM_GROUPS has distinct non-empty patterns per group', () => {
    expect(CLINIC_ROOM_GROUPS.length).toBe(13)
    for (const spec of CLINIC_ROOM_GROUPS) {
      expect(spec.patterns.length).toBeGreaterThan(0)
      expect(spec.group.length).toBeGreaterThan(0)
    }
  })
})

describe('clinic adjacency rules', () => {
  it('defines the six clinical adjacency rules', () => {
    expect(CLINIC_ADJACENCY_RULES).toEqual([
      { from: 'consultation', to: 'corridor', weight: 3 },
      { from: 'treatment', to: 'corridor', weight: 3 },
      { from: 'reception', to: 'corridor', weight: 2 },
      { from: 'pharmacy', to: 'reception', weight: 3 },
      { from: 'treatment', to: 'staff', weight: 2 },
      { from: 'wc', to: 'corridor', weight: 2 },
    ])
    expect(CLINIC_ADJACENCY_RULES.reduce((s, r) => s + r.weight, 0)).toBe(15)
  })

  it('CLINIC_MIN_DEPTH covers every placement role used by clinicRoleFor', () => {
    const used = ['reception', 'private-office', 'meeting', 'pharmacy', 'kitchenette', 'wc']
    for (const role of used) {
      expect(CLINIC_MIN_DEPTH[role], role).toBeGreaterThan(0)
    }
  })
})

describe('generateClinicLayout on a 20 x 20 plate', () => {
  it('places the full fixture program', () => {
    const result = generateClinicLayout(CLINIC_FIXTURE, 20, 20, 0)
    expect(result.valid).toBe(true)
    expect(result.rooms.length).toBe(11)
    expect(result.rooms.map(r => r.name).sort()).toEqual(
      [
        'Reception / Waiting',
        'Consultation Room 1',
        'Consultation Room 2',
        'Consultation Room 3',
        'Treatment Room',
        'Pharmacy / Dispensary',
        'Staff Room',
        'Toilet (Public)',
        'Toilet (Public)',
        'Store',
        'Corridor',
      ].sort(),
    )
  })

  it('locks the verified geometry', () => {
    const result = generateClinicLayout(CLINIC_FIXTURE, 20, 20, 0)
    expect(result.valid).toBe(true)

    expect(findRoom(result.rooms, 'Reception / Waiting')).toMatchObject({ x: 0, y: 15.5, width: 10, height: 4.5 })
    expect(findRoom(result.rooms, 'Pharmacy / Dispensary')).toMatchObject({ x: 10, y: 15.5, width: 10, height: 4.5 })
    expect(findRoom(result.rooms, 'Corridor')).toMatchObject({ x: 3.5, y: 0, width: 1.8, height: 15.5 })

    expect(findRoom(result.rooms, 'Treatment Room').x).toBeCloseTo(5.3, 2)
    expect(findRoom(result.rooms, 'Treatment Room').y).toBe(0)
    expect(findRoom(result.rooms, 'Treatment Room').width).toBeCloseTo(7.35, 2)
    expect(findRoom(result.rooms, 'Treatment Room').height).toBe(4.0)
    expect(findRoom(result.rooms, 'Staff Room').x).toBeCloseTo(12.65, 2)
    expect(findRoom(result.rooms, 'Staff Room').y).toBe(0)
    expect(findRoom(result.rooms, 'Staff Room').width).toBeCloseTo(7.35, 2)
    expect(findRoom(result.rooms, 'Staff Room').height).toBe(2.0)
    expect(findRoom(result.rooms, 'Store').x).toBeCloseTo(12.65, 2)
    expect(findRoom(result.rooms, 'Store').y).toBe(2)
    expect(findRoom(result.rooms, 'Store').width).toBeCloseTo(7.35, 2)
    expect(findRoom(result.rooms, 'Store').height).toBe(2.0)

    expect(findRoom(result.rooms, 'Consultation Room 1')).toMatchObject({ x: 0, y: 4, width: 3.5, height: 3.5 })
    expect(findRoom(result.rooms, 'Consultation Room 2')).toMatchObject({ x: 0, y: 7.5, width: 3.5, height: 3.5 })
    expect(findRoom(result.rooms, 'Consultation Room 3')).toMatchObject({ x: 0, y: 11, width: 3.5, height: 3.5 })
  })

  it('locks the two stacked public toilets at the top of the left column', () => {
    const result = generateClinicLayout(CLINIC_FIXTURE, 20, 20, 0)
    const toilets = result.rooms.filter(r => r.name === 'Toilet (Public)')
    expect(toilets.length).toBe(2)
    const ys = toilets.map(t => t.y).sort((a, b) => a - b)
    expect(ys).toEqual([0, 2])
    for (const t of toilets) {
      expect(t.x).toBe(0)
      expect(t.width).toBe(3.5)
      expect(t.height).toBe(2.0)
    }
  })

  it('builds the wc-only core block', () => {
    const result = generateClinicLayout(CLINIC_FIXTURE, 20, 20, 0)
    expect(result.coreLayout).toBeDefined()
    const core = result.coreLayout!
    expect(core.coreType).toBe('central')
    expect(core.blocks.length).toBe(1)
    const block = core.blocks[0]
    expect(block.x).toBe(0)
    expect(block.y).toBe(0)
    expect(block.width).toBe(3.5)
    expect(block.height).toBe(4.0)
    expect(block.roomIds.length).toBe(2)
  })

  it('achieves a perfect adjacency score with no overlaps', () => {
    const result = generateClinicLayout(CLINIC_FIXTURE, 20, 20, 0)
    expect(result.valid).toBe(true)
    expect(hasOverlaps(rects(result.rooms))).toBe(false)
    const graph = result.adjacencyGraph
    expect(graph).toBeDefined()
    expect(graph!.satisfiedWeight).toBe(15)
    expect(graph!.totalWeight).toBe(15)
    expect(graph!.score).toBe(1)
    expect(graph!.satisfied.length).toBe(6)
    expect(graph!.violated.length).toBe(0)
  })

  it('reports structural grid + positive floor plate efficiency', () => {
    const result = generateClinicLayout(CLINIC_FIXTURE, 20, 20, 0)
    expect(result.structuralGrid).toEqual({ spanX: 7.2, spanY: 7.2 })
    expect(result.floorPlateMetrics).toBeDefined()
    expect(result.floorPlateMetrics!.efficiency).toBeGreaterThan(0)
    expect(result.floorPlateMetrics!.coreAreaM2).toBeGreaterThan(0)
    expect(result.floorPlateMetrics!.circulationAreaM2).toBeGreaterThan(0)
  })

  it('places no room outside the 20 x 20 plate', () => {
    const result = generateClinicLayout(CLINIC_FIXTURE, 20, 20, 0)
    for (const r of result.rooms) {
      expect(r.x).toBeGreaterThanOrEqual(-0.001)
      expect(r.y).toBeGreaterThanOrEqual(-0.001)
      expect(r.x + r.width).toBeLessThanOrEqual(20.001)
      expect(r.y + r.height).toBeLessThanOrEqual(20.001)
    }
  })
})

describe('KB + router wiring', () => {
  it('clinic-health KB entry carries the clinic authority fields', () => {
    const kb = getTypology('clinic-health')
    expect(kb).toBeDefined()
    expect(kb!.adjacencyRules).toBe(CLINIC_ADJACENCY_RULES)
    expect(kb!.structuralGrid).toEqual({ spanX: 7.2, spanY: 7.2 })
    expect(kb!.coreType).toBe('central')
    expect(kb!.floorPlateEfficiency).toBe(0.72)
  })

  it('routes clinic-health to the clinic strategy', () => {
    expect(getStrategy('clinic-health').id).toBe('clinic')
    expect(getStrategy('clinic').id).toBe('clinic')
  })

  it('generates a valid layout through the router', () => {
    const result = generateLayoutByTypology('clinic-health', CLINIC_FIXTURE, 20, 20, 0)
    expect(result.valid).toBe(true)
    expect(result.rooms.length).toBe(11)
  })
})
