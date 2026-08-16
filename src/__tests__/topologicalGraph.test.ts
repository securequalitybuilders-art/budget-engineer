import { describe, it, expect } from 'vitest'
import {
  classifySpatialRole,
  expandProgram,
  edgesFromRules,
  edgesToRules,
  bubbleFromProgram,
  diagramAdjacencyScore,
  genericGroupFor,
  GENERIC_ADJACENCY_RULES,
  GENERIC_ROOM_GROUPS,
  CORE_SPATIAL_GROUPS,
  type TopologicalEdge,
} from '../engine/spatial/topological-graph'
import { OFFICE_ADJACENCY_RULES, computeAdjacencyScore, type AdjacencyRoom } from '../engine/spatial/adjacency-graph'
import type { AdjacencyRule, ProgramItem } from '../engine/tier1-types'

describe('classifySpatialRole', () => {
  it('classifies core groups before the room-standards zone', () => {
    expect(classifySpatialRole('Staircase', 'stair')).toBe('core')
    expect(classifySpatialRole('Lift Core', 'lift')).toBe('core')
  })

  it('classifies by room-standards zone for habitable rooms', () => {
    expect(classifySpatialRole('Living Room')).toBe('public')
    expect(classifySpatialRole('Master Bedroom')).toBe('private')
    expect(classifySpatialRole('Kitchen')).toBe('service')
    expect(classifySpatialRole('Corridor')).toBe('circulation')
  })

  it('defaults to private for unknown rooms', () => {
    expect(classifySpatialRole('Undefined Space')).toBe('private')
    expect(classifySpatialRole('')).toBe('private')
  })
})

describe('genericGroupFor', () => {
  it('classifies canonical residential names to generic groups', () => {
    expect(genericGroupFor('Master Bedroom')).toBe('bedroom')
    expect(genericGroupFor('Living Room')).toBe('living')
    expect(genericGroupFor('Kitchen')).toBe('kitchen')
    expect(genericGroupFor('Bathroom 1')).toBe('wc')
    expect(genericGroupFor('Corridor')).toBe('corridor')
    expect(genericGroupFor('Staircase')).toBe('stair')
    expect(genericGroupFor('Lift Core')).toBe('lift')
  })

  it('longest-pattern-first wins for ambiguous names', () => {
    expect(genericGroupFor('Store Room')).toBe('store')
    expect(genericGroupFor('Private Office')).toBe('office')
    expect(genericGroupFor('Open Plan Office')).toBe('open-plan')
  })

  it('returns null for unclassifiable names', () => {
    expect(genericGroupFor('Undefined Space')).toBeNull()
    expect(genericGroupFor('')).toBeNull()
  })
})

describe('expandProgram', () => {
  it('expands a count > 1 item into numbered nodes', () => {
    const program: ProgramItem[] = [{ name: 'Bedroom', count: 2, areaM2: 12 }]
    const nodes = expandProgram(program)
    expect(nodes).toHaveLength(2)
    expect(nodes[0].name).toBe('Bedroom 1')
    expect(nodes[1].name).toBe('Bedroom 2')
    expect(nodes[0].group).toBe('bedroom')
    expect(nodes[0].role).toBe('private')
  })

  it('coerces count to at least 1 and floors area at 0.5', () => {
    const nodes = expandProgram([{ name: 'Kitchen', count: 0, areaM2: 0 }])
    expect(nodes).toHaveLength(1)
    expect(nodes[0].areaM2).toBeGreaterThanOrEqual(0.5)
  })

  it('assigns stable slug ids', () => {
    const nodes = expandProgram([{ name: 'Living Room', count: 1, areaM2: 20 }])
    expect(nodes[0].id).toMatch(/^living-room-\d+$/)
  })
})

describe('edgesFromRules', () => {
  const nodes = expandProgram([
    { name: 'Living Room', count: 1, areaM2: 20 },
    { name: 'Kitchen', count: 1, areaM2: 10 },
    { name: 'Corridor', count: 1, areaM2: 5 },
  ])

  it('creates node-pair edges between rooms in the rule groups', () => {
    const edges = edgesFromRules([{ from: 'living', to: 'kitchen', weight: 3 }], nodes)
    expect(edges).toHaveLength(1)
    expect(edges[0].from).toBe(nodes[0].id)
    expect(edges[0].to).toBe(nodes[1].id)
    expect(edges[0].weight).toBe(3)
    expect(edges[0].type).toBe('door')
  })

  it('does not create edges for rooms without a group', () => {
    const ungrouped = [{ id: 'x-0', name: 'Undefined Space', areaM2: 5 }]
    const edges = edgesFromRules([{ from: 'living', to: 'kitchen', weight: 3 }], ungrouped)
    expect(edges).toHaveLength(0)
  })

  it('propagates must flags', () => {
    const edges = edgesFromRules([{ from: 'living', to: 'kitchen', weight: 3, must: true }], nodes)
    expect(edges[0].must).toBe(true)
  })
})

describe('edgesToRules', () => {
  it('collapses node-pair edges to group-level rules with max weight', () => {
    const nodes = expandProgram([
      { name: 'Living Room', count: 2, areaM2: 20 },
      { name: 'Kitchen', count: 1, areaM2: 10 },
    ])
    const edges: TopologicalEdge[] = [
      { from: nodes[0].id, to: nodes[2].id, weight: 2 },
      { from: nodes[1].id, to: nodes[2].id, weight: 3 },
    ]
    const rules = edgesToRules(edges, nodes)
    expect(rules).toHaveLength(1)
    expect(rules[0].from).toBe('living')
    expect(rules[0].to).toBe('kitchen')
    expect(rules[0].weight).toBe(3)
  })

  it('skips edges referencing ungrouped nodes', () => {
    const ungrouped = [{ id: 'x-0', name: 'Undefined Space', areaM2: 5, group: null }]
    const rules = edgesToRules([{ from: 'x-0', to: 'nope', weight: 1 }], ungrouped)
    expect(rules).toHaveLength(0)
  })
})

describe('bubbleFromProgram', () => {
  const program: ProgramItem[] = [
    { name: 'Living Room', count: 1, areaM2: 20 },
    { name: 'Kitchen', count: 1, areaM2: 10 },
    { name: 'Corridor', count: 1, areaM2: 5 },
  ]

  it('uses GENERIC_ADJACENCY_RULES by default', () => {
    const diagram = bubbleFromProgram(program)
    expect(diagram.edges.length).toBeGreaterThan(0)
    expect(diagram.programSummary).toEqual({ totalAreaM2: 35, roomCount: 3 })
    expect(diagram.typologyId).toBeUndefined()
  })

  it('uses custom adjacency rules when supplied', () => {
    const custom: AdjacencyRule[] = [{ from: 'living', to: 'kitchen', weight: 3 }]
    const diagram = bubbleFromProgram(program, { adjacencyRules: custom, typologyId: 'test-house' })
    expect(diagram.typologyId).toBe('test-house')
    expect(diagram.edges).toHaveLength(1)
    expect(diagram.edges[0].from).toBe(diagram.nodes[0].id)
    expect(diagram.edges[0].to).toBe(diagram.nodes[1].id)
  })

  it('produces no edges when the program has no classified groups', () => {
    const diagram = bubbleFromProgram([{ name: 'Undefined Space', count: 1, areaM2: 5 }])
    expect(diagram.edges).toHaveLength(0)
    expect(diagram.nodes).toHaveLength(1)
    expect(diagram.programSummary?.roomCount).toBe(1)
  })
})

describe('diagramAdjacencyScore', () => {
  it('scores a placed layout against the diagram rules', () => {
    const diagram = bubbleFromProgram([
      { name: 'Living Room', count: 1, areaM2: 20 },
      { name: 'Kitchen', count: 1, areaM2: 10 },
      { name: 'Corridor', count: 1, areaM2: 5 },
    ])
    const rooms: AdjacencyRoom[] = [
      { id: 'r0', name: 'Living Room', x: 0, y: 0, width: 4, height: 5 },
      { id: 'r1', name: 'Kitchen', x: 4, y: 0, width: 3, height: 5 },
      { id: 'r2', name: 'Corridor', x: 0, y: 5, width: 7, height: 1.8 },
    ]
    const score = diagramAdjacencyScore(diagram, rooms)
    expect(score).toHaveProperty('score')
    expect(typeof score.score).toBe('number')
    expect(score.edges.length).toBeGreaterThan(0)
  })

  it('supports custom touch and groupFor options', () => {
    const diagram = bubbleFromProgram([
      { name: 'Living Room', count: 1, areaM2: 20 },
      { name: 'Kitchen', count: 1, areaM2: 10 },
    ])
    const rooms: AdjacencyRoom[] = [
      { id: 'r0', name: 'Living Room', x: 0, y: 0, width: 4, height: 5 },
      { id: 'r1', name: 'Kitchen', x: 40, y: 0, width: 3, height: 5 },
    ]
    const score = diagramAdjacencyScore(diagram, rooms, {
      rules: OFFICE_ADJACENCY_RULES,
      groupFor: name => (name === 'Living Room' ? 'reception' : 'corridor'),
      touch: () => true,
    })
    expect(score.totalWeight).toBe(3)
    expect(score.satisfiedWeight).toBe(3)
    expect(score.score).toBe(1)
  })
})

describe('module invariants', () => {
  it('GENERIC_ADJACENCY_RULES references groups present in GENERIC_ROOM_GROUPS', () => {
    const groups = new Set(GENERIC_ROOM_GROUPS.map(g => g.group))
    for (const rule of GENERIC_ADJACENCY_RULES) {
      expect(groups.has(rule.from), rule.from).toBe(true)
      expect(groups.has(rule.to), rule.to).toBe(true)
    }
  })

  it('CORE_SPATIAL_GROUPS are generic groups', () => {
    const groups = new Set(GENERIC_ROOM_GROUPS.map(g => g.group))
    for (const g of CORE_SPATIAL_GROUPS) expect(groups.has(g), g).toBe(true)
  })

  it('diagramAdjacencyScore delegates to computeAdjacencyScore semantics', () => {
    const diagram = bubbleFromProgram([{ name: 'Living Room', count: 1, areaM2: 20 }])
    const rooms: AdjacencyRoom[] = [{ id: 'r0', name: 'Living Room', x: 0, y: 0, width: 4, height: 5 }]
    const expected = computeAdjacencyScore(GENERIC_ADJACENCY_RULES, rooms)
    const actual = diagramAdjacencyScore(diagram, rooms)
    expect(actual.totalWeight).toBe(expected.totalWeight)
    expect(actual.score).toBe(expected.score)
  })
})
