import { describe, it, expect, vi } from 'vitest'
import {
  GRID,
  snap,
  hasOverlaps,
  placeAdjacencyLayout,
  type AdjacencyProgramRoom,
} from '../engine/spatial/graph-placer'
import {
  OFFICE_ADJACENCY_RULES,
  OFFICE_ROOM_GROUPS,
  normalizeRoomName,
  roomGroupFor,
  sharedBoundaryLength,
  rectsTouch,
  applicableRules,
  computeAdjacencyScore,
  type AdjacencyRoom,
} from '../engine/spatial/adjacency-graph'
import {
  CORE_MIN_DIMS,
  coreMinDimsFor,
  isCoreRoom,
  selectCoreType,
  coreColumnWidth,
  stackCoreRooms,
  buildOfficeCore,
  computeFloorPlate,
} from '../engine/spatial/core-planning'
import { getTypology } from '../engine/typology-kb'
import { getStrategy, generateLayoutByTypology } from '../lib/layout/typology-router'
import { generatePlanModel, generateVariedPlanModel } from '../engine/plan-generator'
import { ROOM_PROGRAMS } from '../engine/roomPrograms'
import type { DesignOption } from '../domain/boq'

type CoreTypeChoice = 'central' | 'side' | 'dual'

function officeProgram(area = 576): AdjacencyProgramRoom[] {
  return ROOM_PROGRAMS.office.map((p, i) => ({
    id: `o-${i}`,
    name: p.name,
    areaM2: Math.round(p.ratio * area * 100) / 100,
  }))
}

function placeOffice(coreType: CoreTypeChoice = 'central') {
  return placeAdjacencyLayout(officeProgram(), 24, 24, {
    corridorWidth: 1.8,
    coreType,
    grid: { spanX: 7.2, spanY: 7.2 },
    adjacencyRules: OFFICE_ADJACENCY_RULES,
  })
}

function roomById(rooms: AdjacencyRoom[], id: string): AdjacencyRoom {
  const r = rooms.find(x => x.id === id)
  if (!r) throw new Error(`missing room: ${id}`)
  return r
}

function makeDesignOption(overrides: Partial<DesignOption> = {}): DesignOption {
  return {
    id: 'opt-1',
    name: 'Test Design',
    grossFloorArea: 120,
    floors: 1,
    buildingType: 'house',
    elements: [],
    ...overrides,
  }
}

describe('graph-placer primitives', () => {
  it('uses a 0.05 placement grid', () => {
    expect(GRID).toBe(0.05)
  })

  it('snaps values to the 0.05 grid', () => {
    expect(snap(1.234)).toBeCloseTo(1.25, 2)
    expect(snap(0.02)).toBe(0)
    expect(snap(9.8743)).toBeCloseTo(9.85, 2)
    expect(snap(7.9)).toBeCloseTo(7.9, 2)
  })

  it('detects overlap only when both axes overlap beyond the grid tolerance', () => {
    const a: AdjacencyRoom = { id: 'a', name: 'A', x: 0, y: 0, width: 3, height: 3 }
    expect(hasOverlaps([a, { id: 'b', name: 'B', x: 3, y: 0, width: 3, height: 3 }])).toBe(false)
    expect(hasOverlaps([a, { id: 'b', name: 'B', x: 0.2, y: 0, width: 3, height: 3 }])).toBe(true)
    expect(hasOverlaps([a, { id: 'b', name: 'B', x: 2.96, y: 0, width: 3, height: 3 }])).toBe(false)
    expect(hasOverlaps([a, { id: 'b', name: 'B', x: 0, y: 2.98, width: 3, height: 3 }])).toBe(false)
  })
})

describe('adjacency-graph helpers', () => {
  it('normalizes room names to lowercase, space-separated tokens', () => {
    expect(normalizeRoomName('  Open_Plan  Office ')).toBe('open plan office')
    expect(normalizeRoomName('Private Office 1')).toBe('private office 1')
  })

  it('maps room names to office groups via longest-pattern-first matching', () => {
    expect(roomGroupFor('Open Plan Office')).toBe('open-plan')
    expect(roomGroupFor('Private Office 1')).toBe('private-office')
    expect(roomGroupFor('Meeting Room')).toBe('meeting')
    expect(roomGroupFor('Kitchenette')).toBe('kitchenette')
    expect(roomGroupFor('WC')).toBe('wc')
    expect(roomGroupFor('Reception')).toBe('reception')
    expect(roomGroupFor('Circulation')).toBe('corridor')
    expect(roomGroupFor('Staircase')).toBe('stair')
    expect(roomGroupFor('Lift')).toBe('lift')
    expect(roomGroupFor('Server Room')).toBe('server')
    expect(roomGroupFor('Bathroom')).toBeNull()
  })

  it('defines office room groups as group/pattern pairs', () => {
    expect(OFFICE_ROOM_GROUPS.length).toBeGreaterThan(0)
    for (const g of OFFICE_ROOM_GROUPS) {
      expect(typeof g.group).toBe('string')
      expect(Array.isArray(g.patterns)).toBe(true)
      expect(g.patterns.length).toBeGreaterThan(0)
    }
  })

  it('measures the shared boundary length of two rects', () => {
    expect(
      sharedBoundaryLength(
        { id: 'a', name: 'A', x: 0, y: 0, width: 12, height: 3 },
        { id: 'b', name: 'B', x: 0, y: 3, width: 12, height: 3 },
      ),
    ).toBe(12)
    expect(
      sharedBoundaryLength(
        { id: 'a', name: 'A', x: 0, y: 0, width: 12, height: 3 },
        { id: 'b', name: 'B', x: 0, y: 5, width: 12, height: 3 },
      ),
    ).toBe(0)
  })

  it('reports edge touching above the minimum overlap (0.5m default)', () => {
    expect(
      rectsTouch(
        { id: 'a', name: 'A', x: 0, y: 0, width: 12, height: 3 },
        { id: 'b', name: 'B', x: 0, y: 3, width: 12, height: 3 },
      ),
    ).toBe(true)
    expect(
      rectsTouch(
        { id: 'a', name: 'A', x: 0, y: 0, width: 12, height: 3 },
        { id: 'b', name: 'B', x: 13, y: 0, width: 12, height: 3 },
      ),
    ).toBe(false)
    expect(
      rectsTouch(
        { id: 'a', name: 'A', x: 0, y: 0, width: 12, height: 3 },
        { id: 'b', name: 'B', x: 11.8, y: 3, width: 12, height: 3 },
      ),
    ).toBe(false)
  })

  it('declares the 10 office adjacency rules with expected weights', () => {
    expect(OFFICE_ADJACENCY_RULES).toHaveLength(10)
    expect(OFFICE_ADJACENCY_RULES).toEqual(
      expect.arrayContaining([
        { from: 'reception', to: 'corridor', weight: 3 },
        { from: 'open-plan', to: 'meeting', weight: 3 },
        { from: 'private-office', to: 'corridor', weight: 3 },
        { from: 'open-plan', to: 'corridor', weight: 2 },
        { from: 'kitchenette', to: 'open-plan', weight: 2 },
        { from: 'wc', to: 'corridor', weight: 2 },
        { from: 'stair', to: 'corridor', weight: 2 },
        { from: 'reception', to: 'open-plan', weight: 1 },
      ]),
    )
  })

  it('filters rules to groups actually present in the room set', () => {
    const present = new Set(['open-plan', 'private-office', 'meeting', 'kitchenette', 'wc', 'reception', 'corridor', 'stair', 'lift'])
    const applicable = applicableRules(OFFICE_ADJACENCY_RULES, present)
    expect(applicable).toHaveLength(9)
    expect(applicable.some(r => r.from === 'server' || r.to === 'server')).toBe(false)
  })
})

describe('computeAdjacencyScore', () => {
  const corridor: AdjacencyRoom = { id: 'c', name: 'Circulation', x: 0, y: 0, width: 12, height: 3 }
  const reception: AdjacencyRoom = { id: 'r', name: 'Reception', x: 0, y: 3, width: 12, height: 3 }
  const openPlan = (y: number): AdjacencyRoom => ({ id: 'o', name: 'Open Plan Office', x: 0, y, width: 12, height: 3 })

  it('scores a fully adjacent two-room set 1.0', () => {
    const s = computeAdjacencyScore(OFFICE_ADJACENCY_RULES, [corridor, reception])
    expect(s.totalWeight).toBe(3)
    expect(s.satisfiedWeight).toBe(3)
    expect(s.score).toBe(1)
    expect(s.satisfied).toHaveLength(1)
    expect(s.violated).toHaveLength(0)
  })

  it('scores partial adjacency proportionally and lists violations', () => {
    const s = computeAdjacencyScore(OFFICE_ADJACENCY_RULES, [corridor, reception, openPlan(6)])
    expect(s.totalWeight).toBe(6)
    expect(s.satisfiedWeight).toBe(4)
    expect(s.score).toBeCloseTo(4 / 6, 5)
    expect(s.satisfied).toHaveLength(2)
    expect(s.violated).toHaveLength(1)
    expect(s.violated).toEqual(expect.arrayContaining([{ from: 'open-plan', to: 'corridor', weight: 2 }]))
    expect(s.edges.find(e => e.from === 'open-plan' && e.to === 'corridor')?.satisfied).toBe(false)
  })

  it('drops to 0.5 when the reception band loses contact with the open plan', () => {
    const s = computeAdjacencyScore(OFFICE_ADJACENCY_RULES, [corridor, reception, openPlan(7)])
    expect(s.totalWeight).toBe(6)
    expect(s.satisfiedWeight).toBe(3)
    expect(s.score).toBe(0.5)
    expect(s.satisfied).toHaveLength(1)
    expect(s.violated).toHaveLength(2)
  })
})

describe('core-planning', () => {
  it('declares core minimum dimensions keyed by minWidth/minDepth', () => {
    expect(CORE_MIN_DIMS.Staircase).toEqual({ minWidth: 3.0, minDepth: 5.5 })
    expect(CORE_MIN_DIMS.Lift).toEqual({ minWidth: 2.2, minDepth: 2.4 })
    expect(CORE_MIN_DIMS.ServerRoom ?? CORE_MIN_DIMS['Server Room']).toEqual({ minWidth: 2.0, minDepth: 3.0 })
    expect(CORE_MIN_DIMS.Kitchenette).toEqual({ minWidth: 2.0, minDepth: 2.5 })
    expect(CORE_MIN_DIMS.WC ?? CORE_MIN_DIMS.Toilet).toEqual({ minWidth: 2.0, minDepth: 2.0 })
  })

  it('resolves core minimum dimensions by room name with a 2.0x2.0 fallback', () => {
    expect(coreMinDimsFor('Staircase')).toEqual({ minWidth: 3.0, minDepth: 5.5 })
    expect(coreMinDimsFor('Unknown Room')).toEqual({ minWidth: 2.0, minDepth: 2.0 })
  })

  it('classifies core rooms including kitchenette', () => {
    const room = (name: string): AdjacencyRoom => ({ id: name, name, x: 0, y: 0, width: 1, height: 1 })
    expect(isCoreRoom(room('Staircase'))).toBe(true)
    expect(isCoreRoom(room('Lift'))).toBe(true)
    expect(isCoreRoom(room('WC'))).toBe(true)
    expect(isCoreRoom(room('Kitchenette'))).toBe(true)
    expect(isCoreRoom(room('Open Plan Office'))).toBe(false)
    expect(isCoreRoom(room('Bathroom'))).toBe(false)
  })

  it('selects a core type from the plate proportions (preferred wins)', () => {
    expect(selectCoreType(24, 24)).toBe('central')
    expect(selectCoreType(60, 24)).toBe('dual')
    expect(selectCoreType(40, 24)).toBe('side')
    expect(selectCoreType(30, 24)).toBe('central')
    expect(selectCoreType(36, 24)).toBe('side')
    expect(selectCoreType(20, 30)).toBe('central')
    expect(selectCoreType(60, 24, 'central')).toBe('central')
  })

  it('derives the core column width from the widest core room minimum', () => {
    const wc: AdjacencyRoom = { id: 'wc', name: 'WC', x: 0, y: 0, width: 3.5, height: 9.85 }
    const stair: AdjacencyRoom = { id: 'stair', name: 'Staircase', x: 0, y: 0, width: 3.5, height: 5.5 }
    const lift: AdjacencyRoom = { id: 'lift', name: 'Lift', x: 0, y: 0, width: 3.5, height: 2.4 }
    expect(coreColumnWidth([wc])).toBe(2.0)
    expect(coreColumnWidth([stair])).toBe(3.0)
    expect(coreColumnWidth([stair, wc])).toBe(3.0)
    expect(coreColumnWidth([lift, wc])).toBe(2.2)
  })

  it('stacks core rooms vertically inside a core column', () => {
    const wc: AdjacencyRoom = { id: 'wc', name: 'WC', x: 0, y: 0, width: 3.5, height: 9.85 }
    const p = stackCoreRooms([wc], 0, 0, 3.5, 24)
    expect(p.block).toEqual({ roomIds: ['wc'], x: 0, y: 0, width: 3.5, height: 9.85 })
    expect(p.rooms[0]).toMatchObject({ x: 0, y: 0, width: 3.5, height: 9.85 })
  })

  it('builds a side core layout with a single stack block', () => {
    const coreRooms: AdjacencyRoom[] = [
      { id: 'a', name: 'Staircase', x: 0, y: 0, width: 3, height: 6 },
      { id: 'b', name: 'WC', x: 0, y: 0, width: 3, height: 4 },
    ]
    const corridor = { x: 3, y: 0, width: 2, height: 10 }
    const result = buildOfficeCore(coreRooms, 'side', corridor, 2, 10)
    expect(result.coreLayout.coreType).toBe('side')
    expect(result.coreLayout.blocks).toHaveLength(1)
    expect(result.coreLayout.blocks[0]).toEqual({ roomIds: ['a', 'b'], x: 0, y: 0, width: 3, height: 10 })
    expect(result.coreLayout.x).toBe(0)
    expect(result.rooms).toEqual([
      { id: 'a', name: 'Staircase', x: 0, y: 0, width: 3, height: 6 },
      { id: 'b', name: 'WC', x: 0, y: 6, width: 3, height: 4 },
    ])
  })

  it('computes floor plate metrics from the corridor, core blocks and program rooms', () => {
    const programRooms: AdjacencyRoom[] = [
      { id: 'open-plan', name: 'Open Plan Office', x: 5.3, y: 11.4, width: 18.7, height: 9.6 },
      { id: 'meeting', name: 'Meeting Room', x: 5.3, y: 7.9, width: 9.35, height: 3.5 },
    ]
    const corridorRoom: AdjacencyRoom = { id: 'corridor', name: 'Circulation', x: 3.5, y: 0, width: 1.8, height: 21 }
    const fp = computeFloorPlate(24, 24, programRooms, corridorRoom, [{ roomIds: [], x: 0, y: 0, width: 3.5, height: 9.85 }], { spanX: 7.2, spanY: 7.2 })
    expect(fp.totalAreaM2).toBe(576)
    expect(fp.programAreaM2).toBeCloseTo(212.245, 3)
    expect(fp.coreAreaM2).toBeCloseTo(34.475, 2)
    expect(fp.circulationAreaM2).toBeCloseTo(37.8, 2)
    expect(fp.efficiency).toBeCloseTo(0.87, 2)
    expect(fp.columns).toBe(3)
    expect(fp.rows).toBe(3)
    expect(fp.grid).toEqual({ spanX: 7.2, spanY: 7.2 })
  })
})

describe('placeAdjacencyLayout - central core', () => {
  const result = placeOffice('central')

  it('produces a valid 9-room layout scoring 1.0', () => {
    expect(result.valid).toBe(true)
    expect(result.rooms).toHaveLength(9)
    expect(result.score).toBe(1)
    expect(result.rooms.some(r => r.id === 'o-2')).toBe(false)
  })

  it('lays the core as a single top block spanning the plate width', () => {
    expect(result.coreLayout.coreType).toBe('central')
    expect(result.coreLayout.blocks).toHaveLength(1)
    const block = result.coreLayout.blocks[0]
    expect(block.x).toBe(0)
    expect(block.y).toBe(0)
    expect(block.width).toBe(24)
    expect(block.height).toBeCloseTo(9.85, 2)
    expect(block.roomIds).toHaveLength(3)
    expect(block.roomIds).toEqual(expect.arrayContaining(['o-5', 'o-8', 'o-9']))
  })

  it('positions the core rooms at the top of the plate', () => {
    const wc = roomById(result.rooms, 'o-5')
    expect(wc.x).toBe(0)
    expect(wc.y).toBe(0)
    expect(wc.width).toBe(3.5)
    expect(wc.height).toBeCloseTo(9.85, 2)

    const stair = roomById(result.rooms, 'o-8')
    expect(stair.x).toBe(5.3)
    expect(stair.y).toBe(0)
    expect(stair.width).toBe(18.7)
    expect(stair.height).toBe(5.5)

    const lift = roomById(result.rooms, 'o-9')
    expect(lift.x).toBe(5.3)
    expect(lift.y).toBe(5.5)
    expect(lift.width).toBe(18.7)
    expect(lift.height).toBeCloseTo(2.4, 2)
  })

  it('places the support band and the private office below the core', () => {
    const meeting = roomById(result.rooms, 'o-3')
    expect(meeting.x).toBe(5.3)
    expect(meeting.y).toBe(7.9)
    expect(meeting.width).toBe(9.35)
    expect(meeting.height).toBe(3.5)

    const kitchenette = roomById(result.rooms, 'o-4')
    expect(kitchenette.x).toBeCloseTo(14.65, 2)
    expect(kitchenette.y).toBe(7.9)
    expect(kitchenette.width).toBe(9.35)
    expect(kitchenette.height).toBe(3.5)

    const openPlan = roomById(result.rooms, 'o-0')
    expect(openPlan.x).toBe(5.3)
    expect(openPlan.y).toBe(11.4)
    expect(openPlan.width).toBe(18.7)
    expect(openPlan.height).toBeCloseTo(9.6, 2)

    const privateOffice = roomById(result.rooms, 'o-1')
    expect(privateOffice.x).toBe(0)
    expect(privateOffice.y).toBeCloseTo(9.87, 1)
    expect(privateOffice.width).toBe(3.5)
    expect(privateOffice.height).toBeCloseTo(11.15, 1)
  })

  it('places the reception band and the corridor spine', () => {
    const reception = roomById(result.rooms, 'o-6')
    expect(reception.x).toBe(0)
    expect(reception.y).toBe(21)
    expect(reception.width).toBe(24)
    expect(reception.height).toBe(3)

    const corridor = roomById(result.rooms, 'o-7')
    expect(corridor.x).toBe(3.5)
    expect(corridor.y).toBe(0)
    expect(corridor.width).toBe(1.8)
    expect(corridor.height).toBe(21)
  })

  it('reports floor plate metrics for the central layout', () => {
    const fp = result.floorPlate
    expect(fp.totalAreaM2).toBe(576)
    expect(fp.coreAreaM2).toBeCloseTo(236.4, 2)
    expect(fp.circulationAreaM2).toBeCloseTo(37.8, 2)
    expect(fp.efficiency).toBeCloseTo(0.524, 3)
    expect(fp.columns).toBe(3)
    expect(fp.rows).toBe(3)
    expect(fp.grid).toEqual({ spanX: 7.2, spanY: 7.2 })
  })

  it('reports a fully-satisfied adjacency graph (9/9 rules, 20/20 weight)', () => {
    expect(result.adjacency.score).toBe(1)
    expect(result.adjacency.satisfiedWeight).toBe(20)
    expect(result.adjacency.totalWeight).toBe(20)
    expect(result.adjacency.rules).toHaveLength(9)
    expect(result.adjacency.satisfied).toHaveLength(9)
    expect(result.adjacency.violated).toHaveLength(0)
    expect(result.adjacency.edges).toHaveLength(9)
  })
})

describe('placeAdjacencyLayout - side core', () => {
  const result = placeOffice('side')

  it('produces a valid 8-room layout (no private offices)', () => {
    expect(result.valid).toBe(true)
    expect(result.rooms).toHaveLength(8)
    expect(result.rooms.some(r => r.id === 'o-1')).toBe(false)
    expect(result.rooms.some(r => r.id === 'o-2')).toBe(false)
  })

  it('stacks the core column at the top of the left edge', () => {
    expect(result.coreLayout.coreType).toBe('side')
    expect(result.coreLayout.blocks).toHaveLength(1)
    const block = result.coreLayout.blocks[0]
    expect(block.x).toBe(0)
    expect(block.y).toBe(0)
    expect(block.width).toBe(3.5)
    expect(block.height).toBeCloseTo(21, 2)
    expect(block.roomIds).toEqual(expect.arrayContaining(['o-5', 'o-8', 'o-9']))
  })

  it('positions the side core rooms', () => {
    const wc = roomById(result.rooms, 'o-5')
    expect(wc.x).toBe(0)
    expect(wc.y).toBe(0)
    expect(wc.width).toBe(3.5)
    expect(wc.height).toBeCloseTo(9.85, 2)

    const stair = roomById(result.rooms, 'o-8')
    expect(stair.x).toBe(0)
    expect(stair.y).toBeCloseTo(9.87, 1)
    expect(stair.width).toBe(3.5)
    expect(stair.height).toBe(8.25)

    const lift = roomById(result.rooms, 'o-9')
    expect(lift.x).toBe(0)
    expect(lift.y).toBeCloseTo(18.1, 1)
    expect(lift.width).toBe(3.5)
    expect(lift.height).toBeCloseTo(2.9, 2)
  })

  it('places the support band at the top of the right zone', () => {
    const meeting = roomById(result.rooms, 'o-3')
    expect(meeting.x).toBe(5.3)
    expect(meeting.y).toBe(0)
    expect(meeting.width).toBe(9.35)
    expect(meeting.height).toBe(3.5)

    const kitchenette = roomById(result.rooms, 'o-4')
    expect(kitchenette.x).toBeCloseTo(14.65, 2)
    expect(kitchenette.y).toBe(0)
    expect(kitchenette.width).toBe(9.35)
    expect(kitchenette.height).toBe(3.5)

    const openPlan = roomById(result.rooms, 'o-0')
    expect(openPlan.x).toBe(5.3)
    expect(openPlan.y).toBe(3.5)
    expect(openPlan.width).toBe(18.7)
    expect(openPlan.height).toBe(10.8)
  })

  it('places the reception band and the corridor spine', () => {
    const reception = roomById(result.rooms, 'o-6')
    expect(reception.x).toBe(0)
    expect(reception.y).toBe(21)
    expect(reception.width).toBe(24)
    expect(reception.height).toBe(3)

    const corridor = roomById(result.rooms, 'o-7')
    expect(corridor.x).toBe(3.5)
    expect(corridor.y).toBe(0)
    expect(corridor.width).toBe(1.8)
    expect(corridor.height).toBe(21)
  })

  it('reports the 16/17 adjacency score with the reception violation', () => {
    expect(result.adjacency.satisfiedWeight).toBe(16)
    expect(result.adjacency.totalWeight).toBe(17)
    expect(result.adjacency.score).toBeCloseTo(16 / 17, 5)
    expect(result.adjacency.satisfied).toHaveLength(7)
    expect(result.adjacency.violated).toHaveLength(1)
    expect(result.adjacency.violated[0]).toEqual({ from: 'reception', to: 'open-plan', weight: 1 })
  })

  it('reports floor plate metrics for the side layout', () => {
    const fp = result.floorPlate
    expect(fp.totalAreaM2).toBe(576)
    expect(fp.coreAreaM2).toBeCloseTo(73.51, 2)
    expect(fp.circulationAreaM2).toBeCloseTo(37.8, 2)
    expect(fp.efficiency).toBeCloseTo(0.807, 2)
  })
})

describe('placeAdjacencyLayout - dual core', () => {
  const result = placeOffice('dual')

  it('produces a valid 9-room layout scoring 19/20', () => {
    expect(result.valid).toBe(true)
    expect(result.rooms).toHaveLength(9)
    expect(result.rooms.some(r => r.id === 'o-2')).toBe(false)
  })

  it('builds a single merged core block spanning the plate width', () => {
    expect(result.coreLayout.coreType).toBe('dual')
    expect(result.coreLayout.blocks).toHaveLength(1)
    const block = result.coreLayout.blocks[0]
    expect(block.x).toBe(0)
    expect(block.y).toBe(0)
    expect(block.width).toBe(24)
    expect(block.height).toBeCloseTo(13.18, 2)
    expect(block.roomIds).toEqual(expect.arrayContaining(['o-5', 'o-8', 'o-9']))
  })

  it('splits the core between the left stack and the right wc band', () => {
    const stair = roomById(result.rooms, 'o-8')
    expect(stair.x).toBe(0)
    expect(stair.y).toBe(0)
    expect(stair.width).toBe(3.5)
    expect(stair.height).toBe(8.25)

    const lift = roomById(result.rooms, 'o-9')
    expect(lift.x).toBe(0)
    expect(lift.y).toBeCloseTo(8.23, 1)
    expect(lift.width).toBe(3.5)
    expect(lift.height).toBe(4.95)

    const privateOffice = roomById(result.rooms, 'o-1')
    expect(privateOffice.x).toBe(0)
    expect(privateOffice.y).toBeCloseTo(13.17, 1)
    expect(privateOffice.width).toBe(3.5)

    const wc = roomById(result.rooms, 'o-5')
    expect(wc.x).toBe(5.3)
    expect(wc.y).toBe(0)
    expect(wc.width).toBe(18.7)
    expect(wc.height).toBe(2.0)
  })

  it('places the support band below the wc band', () => {
    const meeting = roomById(result.rooms, 'o-3')
    expect(meeting.x).toBe(5.3)
    expect(meeting.y).toBe(2.0)
    expect(meeting.width).toBe(9.35)
    expect(meeting.height).toBe(3.5)

    const kitchenette = roomById(result.rooms, 'o-4')
    expect(kitchenette.x).toBeCloseTo(14.65, 2)
    expect(kitchenette.y).toBe(2.0)
    expect(kitchenette.width).toBe(9.35)
    expect(kitchenette.height).toBe(3.5)

    const openPlan = roomById(result.rooms, 'o-0')
    expect(openPlan.x).toBe(5.3)
    expect(openPlan.y).toBe(5.5)
    expect(openPlan.width).toBe(18.7)
    expect(openPlan.height).toBe(10.8)
  })

  it('places the reception band and the corridor spine', () => {
    const reception = roomById(result.rooms, 'o-6')
    expect(reception.x).toBe(0)
    expect(reception.y).toBe(21)
    expect(reception.width).toBe(24)
    expect(reception.height).toBe(3)

    const corridor = roomById(result.rooms, 'o-7')
    expect(corridor.x).toBe(3.5)
    expect(corridor.y).toBe(0)
    expect(corridor.width).toBe(1.8)
    expect(corridor.height).toBe(21)
  })

  it('reports the 19/20 adjacency score with the reception violation', () => {
    expect(result.adjacency.satisfiedWeight).toBe(19)
    expect(result.adjacency.totalWeight).toBe(20)
    expect(result.adjacency.score).toBeCloseTo(19 / 20, 5)
    expect(result.adjacency.satisfied).toHaveLength(8)
    expect(result.adjacency.violated).toHaveLength(1)
    expect(result.adjacency.violated[0]).toEqual({ from: 'reception', to: 'open-plan', weight: 1 })
  })

  it('reports floor plate metrics for the dual layout', () => {
    const fp = result.floorPlate
    expect(fp.totalAreaM2).toBe(576)
    expect(fp.coreAreaM2).toBeCloseTo(316.29, 2)
    expect(fp.circulationAreaM2).toBeCloseTo(37.8, 2)
    expect(fp.efficiency).toBeCloseTo(0.385, 3)
  })
})

describe('placeAdjacencyLayout options', () => {
  it('uses the central core type and the default 7.2m grid by default', () => {
    const result = placeAdjacencyLayout(officeProgram(), 24, 24)
    expect(result.coreLayout.coreType).toBe('central')
    expect(result.floorPlate.grid).toEqual({ spanX: 7.2, spanY: 7.2 })
    expect(result.floorPlate.columns).toBe(3)
    expect(result.floorPlate.rows).toBe(3)
  })

  it('derives the structural grid columns/rows from a custom grid', () => {
    const result = placeAdjacencyLayout(officeProgram(), 24, 24, { grid: { spanX: 6, spanY: 6 } })
    expect(result.floorPlate.grid).toEqual({ spanX: 6, spanY: 6 })
    expect(result.floorPlate.columns).toBe(4)
    expect(result.floorPlate.rows).toBe(4)
  })

  it('widens the corridor spine to a custom width', () => {
    const result = placeAdjacencyLayout(officeProgram(), 24, 24, { corridorWidth: 2.0 })
    const corridor = roomById(result.rooms, 'o-7')
    expect(corridor.x).toBe(3.5)
    expect(corridor.y).toBe(0)
    expect(corridor.width).toBe(2.0)
    expect(corridor.height).toBe(21)
    expect(result.floorPlate.circulationAreaM2).toBe(42)

    const openPlan = roomById(result.rooms, 'o-0')
    expect(openPlan.x).toBe(5.5)
    expect(openPlan.width).toBeCloseTo(18.5, 2)
  })

  it('honors custom adjacency rules in the scored graph', () => {
    const result = placeAdjacencyLayout(officeProgram(), 24, 24, {
      adjacencyRules: [{ from: 'reception', to: 'corridor', weight: 5 }],
    })
    expect(result.adjacency.rules).toHaveLength(1)
    expect(result.adjacency.rules[0]).toEqual({ from: 'reception', to: 'corridor', weight: 5 })
    expect(result.adjacency.totalWeight).toBe(5)
    expect(result.adjacency.satisfiedWeight).toBe(5)
    expect(result.adjacency.score).toBe(1)
  })
})

describe('typology KB office-commercial entry', () => {
  const kb = getTypology('office-commercial')

  it('exists with the office aliases', () => {
    expect(kb).not.toBeNull()
    expect(kb?.id).toBe('office-commercial')
    expect(kb?.displayName).toBe('Office / Commercial')
    expect(kb?.aliases).toEqual(expect.arrayContaining(['office', 'commercial', 'workspace']))
  })

  it('carries the SANS 10400-A and ZBC occupancy codes', () => {
    expect(kb?.sans10400Class).toContain('E1')
    expect(kb?.zbcClass).toContain('Commercial')
  })

  it('carries storey and span expectations', () => {
    expect(kb?.defaultStoreys).toBe(2)
    expect(kb?.maxStructuralSpan).toBe(8.0)
  })

  it('carries the site and structural envelope', () => {
    expect(kb?.site).toEqual({ minPlotM2: 500, maxCoveragePct: 60, far: 2.5 })
    expect(kb?.structure?.wallSystem).toContain('RC')
    expect(kb?.structure?.floorHeightM).toBe(3.5)
  })

  it('carries minimum room dimensions for the core office rooms', () => {
    expect(kb?.minRoomDimensions['Open-Plan Office']).toEqual({ minWidth: 6.0, minDepth: 8.0 })
    expect(kb?.minRoomDimensions['Private Office']).toEqual({ minWidth: 3.0, minDepth: 3.5 })
    expect(kb?.minRoomDimensions['Meeting Room']).toEqual({ minWidth: 4.0, minDepth: 4.5 })
  })

  it('carries the spatial graph fields the placer consumes', () => {
    expect(kb?.structuralGrid).toEqual({ spanX: 7.2, spanY: 7.2 })
    expect(kb?.coreType).toBe('central')
    expect(kb?.floorPlateEfficiency).toBe(0.78)
    expect(kb?.adjacencyRules).toEqual(OFFICE_ADJACENCY_RULES)
  })
})

describe('getStrategy', () => {
  it('routes office to the office strategy', () => {
    expect(getStrategy('office').id).toBe('office')
  })

  it('trims and lower-cases the building type', () => {
    expect(getStrategy(' Office ').id).toBe('office')
  })

  it('routes office-commercial to the office strategy (office precedes commercial)', () => {
    expect(getStrategy('office-commercial').id).toBe('office')
  })

  it('keeps an exact commercial match on the commercial strategy', () => {
    expect(getStrategy('commercial').id).toBe('commercial')
  })

  it('falls back to the house strategy for unknown types', () => {
    expect(getStrategy('unknown').id).toBe('house')
  })
})

describe('generateLayoutByTypology', () => {
  it('routes the office program through the adjacency placer', () => {
    const result = generateLayoutByTypology('office', ROOM_PROGRAMS.office, 24, 24)
    expect(result.valid).toBe(true)
    expect(result.rooms).toHaveLength(9)
    expect(result.structuralGrid).toEqual({ spanX: 7.2, spanY: 7.2 })
    expect(result.coreLayout?.coreType).toBe('central')
    expect(result.adjacencyGraph?.score).toBe(1)
    expect(result.floorPlateMetrics?.totalAreaM2).toBe(576)
    expect(result.floorPlateMetrics?.efficiency).toBeCloseTo(0.524, 3)
  })

  it('keeps the corridor room in the placed result', () => {
    const result = generateLayoutByTypology('office', ROOM_PROGRAMS.office, 24, 24)
    const corridor = result.rooms.find(r => r.name === 'Circulation')
    expect(corridor).toBeDefined()
    expect(corridor?.width).toBe(1.8)
  })

  it('produces identical layouts for the same seed (deterministic)', () => {
    const a = generateLayoutByTypology('office', ROOM_PROGRAMS.office, 24, 24, 7)
    const b = generateLayoutByTypology('office', ROOM_PROGRAMS.office, 24, 24, 7)
    expect(b.rooms).toEqual(a.rooms)
  })
})

describe('plan-generator integration', () => {
  it('stamps spatial extras on a single-storey office plan', () => {
    const plan = generatePlanModel(makeDesignOption({ buildingType: 'office', grossFloorArea: 576, floors: 1 }))
    expect(plan.rooms.length).toBeGreaterThan(0)
    expect(plan.structuralGrid).toEqual({ spanX: 7.2, spanY: 7.2 })
    expect(plan.coreLayout?.coreType).toBe('central')
    expect(plan.adjacencyGraph?.score).toBe(1)
    expect(plan.floorPlateMetrics?.totalAreaM2).toBeGreaterThan(500)
  })

  it('stamps spatial extras from the ground floor on a multi-storey office plan', () => {
    const plan = generatePlanModel(makeDesignOption({ buildingType: 'office', grossFloorArea: 576, floors: 3 }))
    expect(plan.rooms.length).toBeGreaterThan(0)
    expect(plan.structuralGrid).toEqual({ spanX: 7.2, spanY: 7.2 })
    expect(plan.coreLayout?.coreType).toBe('central')
  })

  it('stamps spatial extras on a varied office plan', () => {
    const plan = generateVariedPlanModel(makeDesignOption({ buildingType: 'office', grossFloorArea: 576, floors: 1 }), 42)
    expect(plan.rooms.length).toBeGreaterThan(0)
    expect(plan.structuralGrid).toEqual({ spanX: 7.2, spanY: 7.2 })
    expect(plan.adjacencyGraph?.score).toBe(1)
  })

  it('leaves spatial extras unset for the house typology', () => {
    const plan = generatePlanModel(makeDesignOption({ buildingType: 'house', grossFloorArea: 120, floors: 1 }))
    expect(plan.structuralGrid).toBeUndefined()
    expect(plan.coreLayout).toBeUndefined()
  })
})

describe('office strategy fallback', () => {
  it('falls back to the packed template layout when the graph placer is unavailable', async () => {
    const actual = await vi.importActual<typeof import('../engine/spatial/graph-placer')>('../engine/spatial/graph-placer')
    vi.doMock('../engine/spatial/graph-placer', () => ({
      ...actual,
      placeAdjacencyLayout: () => ({ valid: false }),
    }))
    vi.resetModules()
    const { generateOfficeLayout } = await import('../lib/layout/typologies/office-strategy')
    const result = generateOfficeLayout(ROOM_PROGRAMS.office, 24, 24, 0)
    expect(typeof result.valid).toBe('boolean')
    expect(result.rooms.length).toBeGreaterThan(0)
    expect(result.structuralGrid).toEqual({ spanX: 7.2, spanY: 7.2 })
    expect(result.coreLayout).toBeUndefined()
    expect(Array.isArray(result.warnings)).toBe(true)
  })
})
