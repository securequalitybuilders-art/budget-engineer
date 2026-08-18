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
  encodeNodeSemantics,
  estimateDesignPopulation,
  allocateNodes,
  hasOverlap,
  isContained,
  propagateFireRatings,
  stampDiagramSemantics,
  type TopologicalEdge,
  type SpatialNode,
  type PlacedRect,
} from '../engine/spatial/topological-graph'
import { evaluateFcbd } from '../engine/spatial/fcbd'
import {
  getReferenceProgram,
  getReferenceAdjacency,
  listReferenceTypologyIds,
  listAllReferencePrograms,
} from '../engine/spatial/spatialDatasets'
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

// ─── Semantic encoding ───────────────────────────────────────────────

describe('encodeNodeSemantics', () => {
  it('assigns occupancyClass to habitable rooms', () => {
    const nodes = expandProgram([
      { name: 'Living Room', count: 1, areaM2: 20 },
      { name: 'Bedroom', count: 1, areaM2: 12 },
    ])
    const encoded = encodeNodeSemantics(nodes)
    expect(encoded[0].occupancyClass).toBe('B2')
    expect(encoded[1].occupancyClass).toBe('B2')
  })

  it('does NOT assign occupancyClass to circulation/stair', () => {
    const nodes = expandProgram([
      { name: 'Corridor', count: 1, areaM2: 5 },
      { name: 'Staircase', count: 1, areaM2: 4 },
    ])
    const encoded = encodeNodeSemantics(nodes)
    expect(encoded[0].occupancyClass).toBeUndefined()
    expect(encoded[1].occupancyClass).toBeUndefined()
  })

  it('computes designPopulation for office', () => {
    const nodes: SpatialNode[] = [{ id: 'op-0', name: 'Open Plan Office', areaM2: 100, group: 'open-plan' }]
    const encoded = encodeNodeSemantics(nodes)
    expect(encoded[0].designPopulation).toBe(10) // 100 * 0.1 = 10
  })

  it('marks habitable rooms as mandatory', () => {
    const nodes = expandProgram([{ name: 'Living Room', count: 1, areaM2: 20 }])
    const encoded = encodeNodeSemantics(nodes)
    expect(encoded[0].mandatory).toBe(true)
  })

  it('marks daylight-required rooms as having daylight', () => {
    const nodes = expandProgram([{ name: 'Bedroom', count: 1, areaM2: 12 }])
    const encoded = encodeNodeSemantics(nodes)
    expect(encoded[0].daylightRequirement).toBe(true)
  })

  it('does NOT mark stair as daylight-required', () => {
    const nodes = expandProgram([{ name: 'Staircase', count: 1, areaM2: 4 }])
    const encoded = encodeNodeSemantics(nodes)
    expect(encoded[0].daylightRequirement).toBe(false)
  })
})

describe('estimateDesignPopulation', () => {
  it('returns 0 for undefined occupancy class', () => {
    expect(estimateDesignPopulation(50, undefined)).toBe(0)
  })

  it('returns correct density for E1 (office)', () => {
    expect(estimateDesignPopulation(100, 'E1')).toBe(10)
  })

  it('returns at least 1 for very small rooms', () => {
    expect(estimateDesignPopulation(0.5, 'B2')).toBe(1)
  })
})

// ─── Dual-encoder allocator ──────────────────────────────────────────

describe('hasOverlap / isContained', () => {
  it('detects strict AABB overlap', () => {
    const a: PlacedRect = { id: 'a', x: 0, y: 0, w: 5, h: 5 }
    const b: PlacedRect = { id: 'b', x: 3, y: 3, w: 5, h: 5 }
    expect(hasOverlap(a, b)).toBe(true)
  })

  it('does NOT flag touching edges as overlap', () => {
    const a: PlacedRect = { id: 'a', x: 0, y: 0, w: 5, h: 5 }
    const b: PlacedRect = { id: 'b', x: 5, y: 0, w: 5, h: 5 }
    expect(hasOverlap(a, b)).toBe(false)
  })

  it('isContained when inside', () => {
    const inner: PlacedRect = { id: 'i', x: 1, y: 1, w: 3, h: 3 }
    const env: PlacedRect = { id: 'env', x: 0, y: 0, w: 10, h: 10 }
    expect(isContained(inner, env)).toBe(true)
  })

  it('isContained when edges touch', () => {
    const inner: PlacedRect = { id: 'i', x: 0, y: 0, w: 10, h: 10 }
    const env: PlacedRect = { id: 'env', x: 0, y: 0, w: 10, h: 10 }
    expect(isContained(inner, env)).toBe(true)
  })
})

describe('allocateNodes', () => {
  it('places all nodes inside the envelope with no overlaps', () => {
    const nodes: SpatialNode[] = [
      { id: 'living', name: 'Living Room', areaM2: 20, group: 'living' },
      { id: 'kitchen', name: 'Kitchen', areaM2: 10, group: 'kitchen' },
      { id: 'corridor', name: 'Corridor', areaM2: 5, group: 'corridor' },
    ]
    const edges: TopologicalEdge[] = [
      { from: 'living', to: 'kitchen', weight: 3 },
      { from: 'living', to: 'corridor', weight: 2 },
      { from: 'kitchen', to: 'corridor', weight: 1 },
    ]
    const result = allocateNodes(nodes, edges, { envelope: { width: 20, height: 20 } })
    expect(result.placed).toHaveLength(3)
    expect(result.overlapCount).toBe(0)
    expect(result.containedAll).toBe(true)
  })

  it('mandatory rooms place first', () => {
    const nodes: SpatialNode[] = [
      { id: 'bedroom', name: 'Bedroom', areaM2: 12, group: 'bedroom' },
      { id: 'corridor', name: 'Corridor', areaM2: 5, group: 'corridor' },
      { id: 'store', name: 'Store', areaM2: 3, group: 'store', mandatory: false },
    ]
    const result = allocateNodes(nodes, [], { envelope: { width: 15, height: 15 } })
    // Corridor is always mandatory; bedroom is habitable so also mandatory
    // Store is not mandatory so it places last
    expect(result.placed).toHaveLength(3)
    expect(result.overlapCount).toBe(0)
  })

  it('respects grid snap', () => {
    const nodes: SpatialNode[] = [
      { id: 'a', name: 'Room A', areaM2: 9, group: 'living' },
    ]
    const result = allocateNodes(nodes, [], { envelope: { width: 10, height: 10 }, gridSnap: 3.6 })
    expect(result.placed[0].x % 3.6).toBeCloseTo(0, 1)
    expect(result.placed[0].y % 3.6).toBeCloseTo(0, 1)
  })

  it('returns adjacency score', () => {
    const nodes: SpatialNode[] = [
      { id: 'living', name: 'Living Room', areaM2: 20, group: 'living' },
      { id: 'kitchen', name: 'Kitchen', areaM2: 10, group: 'kitchen' },
      { id: 'corridor', name: 'Corridor', areaM2: 5, group: 'corridor' },
    ]
    const edges: TopologicalEdge[] = [
      { from: 'living', to: 'kitchen', weight: 3, must: true },
      { from: 'living', to: 'corridor', weight: 2, must: true },
      { from: 'kitchen', to: 'corridor', weight: 1 },
    ]
    const result = allocateNodes(nodes, edges, { envelope: { width: 20, height: 20 } })
    expect(typeof result.adjacencyScore).toBe('number')
    expect(result.adjacencyScore).toBeGreaterThanOrEqual(0)
    expect(result.adjacencyScore).toBeLessThanOrEqual(1)
  })

  it('encodeNodeSemantics is applied when nodes lack occupancyClass', () => {
    const nodes: SpatialNode[] = [
      { id: 'bedroom', name: 'Bedroom', areaM2: 12, group: 'bedroom' },
    ]
    const result = allocateNodes(nodes, [], { envelope: { width: 10, height: 10 } })
    expect(result.placedNodes[0].occupancyClass).toBe('B2')
    expect(result.placedNodes[0].mandatory).toBe(true)
  })
})

// ─── Fire-rating propagation ─────────────────────────────────────────

describe('propagateFireRatings', () => {
  it('maximises fire rating from both endpoints', () => {
    const nodes: SpatialNode[] = [
      { id: 'office', name: 'Office', areaM2: 20, group: 'open-plan', occupancyClass: 'E1' },  // 60 min
      { id: 'corridor', name: 'Corridor', areaM2: 5, group: 'corridor' },  // no class
    ]
    const edges: TopologicalEdge[] = [{ from: 'office', to: 'corridor', weight: 2 }]
    const result = propagateFireRatings(nodes, edges)
    expect(result[0].fireRating).toBe(60)
  })

  it('takes max when both have fire ratings', () => {
    const nodes: SpatialNode[] = [
      { id: 'a', name: 'Room A', areaM2: 10, group: 'living', occupancyClass: 'A1' },  // 120 min
      { id: 'b', name: 'Room B', areaM2: 10, group: 'office', occupancyClass: 'E1' },  // 60 min
    ]
    const edges: TopologicalEdge[] = [{ from: 'a', to: 'b', weight: 2 }]
    const result = propagateFireRatings(nodes, edges)
    expect(result[0].fireRating).toBe(120) // max(A1=120, E1=60)
  })

  it('preserves existing fireRating', () => {
    const nodes: SpatialNode[] = [
      { id: 'a', name: 'Room A', areaM2: 10, group: 'living', occupancyClass: 'E1' },
    ]
    const edges: TopologicalEdge[] = [{ from: 'a', to: 'b', weight: 2, fireRating: 90 }]
    const result = propagateFireRatings(nodes, edges)
    expect(result[0].fireRating).toBe(90)
  })
})

// ─── Stamp diagram semantics ─────────────────────────────────────────

describe('stampDiagramSemantics', () => {
  it('returns a new diagram with occupancyClass on nodes', () => {
    const diagram = bubbleFromProgram([
      { name: 'Living Room', count: 1, areaM2: 20 },
      { name: 'Corridor', count: 1, areaM2: 5 },
    ])
    const stamped = stampDiagramSemantics(diagram)
    // Living Room gets B2
    const living = stamped.nodes.find(n => n.name === 'Living Room')
    expect(living?.occupancyClass).toBe('B2')
    expect(living?.mandatory).toBe(true)
    // Corridor has no occupancy class
    const corr = stamped.nodes.find(n => n.name === 'Corridor')
    expect(corr?.occupancyClass).toBeUndefined()
  })

  it('does not mutate the original diagram', () => {
    const diagram = bubbleFromProgram([{ name: 'Bedroom', count: 1, areaM2: 12 }])
    const stamped = stampDiagramSemantics(diagram)
    expect(stamped).not.toBe(diagram)
    expect(stamped.nodes[0].occupancyClass).toBe('B2')
    expect(diagram.nodes[0].occupancyClass).toBeUndefined()
  })
})

// ─── FCBD framework ──────────────────────────────────────────────────

describe('evaluateFcbd', () => {
  it('passes for a valid contained non-overlapping layout', () => {
    const diagram = bubbleFromProgram([
      { name: 'Living Room', count: 1, areaM2: 20 },
      { name: 'Kitchen', count: 1, areaM2: 10 },
      { name: 'Corridor', count: 1, areaM2: 5 },
    ], { adjacencyRules: [{ from: 'living', to: 'kitchen', weight: 3, must: true }] })

    const placed: PlacedRect[] = [
      { id: diagram.nodes[0].id, x: 0, y: 0, w: 5, h: 4 },
      { id: diagram.nodes[1].id, x: 5, y: 0, w: 3, h: 4 },
      { id: diagram.nodes[2].id, x: 0, y: 4, w: 8, h: 1.8 },
    ]
    const result = evaluateFcbd({ diagram, placed, envelope: { width: 20, height: 20 } })
    expect(result.passed).toBe(true)
    expect(result.violations.filter(v => v.severity === 'error')).toHaveLength(0)
  })

  it('fails when rooms overlap', () => {
    const diagram = bubbleFromProgram([
      { name: 'Living Room', count: 1, areaM2: 20 },
      { name: 'Bedroom', count: 1, areaM2: 12 },
    ])
    const placed: PlacedRect[] = [
      { id: diagram.nodes[0].id, x: 0, y: 0, w: 5, h: 4 },
      { id: diagram.nodes[1].id, x: 3, y: 2, w: 4, h: 3 },
    ]
    const result = evaluateFcbd({ diagram, placed, envelope: { width: 20, height: 20 } })
    expect(result.passed).toBe(false)
    expect(result.violations.some(v => v.rule === 'fcbd-no-overlap')).toBe(true)
  })

  it('fails when rooms are outside the envelope', () => {
    const diagram = bubbleFromProgram([
      { name: 'Living Room', count: 1, areaM2: 20 },
    ])
    const placed: PlacedRect[] = [
      { id: diagram.nodes[0].id, x: 15, y: 15, w: 5, h: 4 },
    ]
    const result = evaluateFcbd({ diagram, placed, envelope: { width: 10, height: 10 } })
    expect(result.passed).toBe(false)
    expect(result.violations.some(v => v.rule === 'fcbd-containment')).toBe(true)
  })

  it('flags mandatory adjacency failures', () => {
    const diagram = bubbleFromProgram([
      { name: 'Living Room', count: 1, areaM2: 20 },
      { name: 'Kitchen', count: 1, areaM2: 10 },
      { name: 'Corridor', count: 1, areaM2: 5 },
    ], { adjacencyRules: [{ from: 'living', to: 'kitchen', weight: 3, must: true }] })

    // Place living and kitchen far apart
    const placed: PlacedRect[] = [
      { id: diagram.nodes[0].id, x: 0, y: 0, w: 5, h: 4 },
      { id: diagram.nodes[1].id, x: 50, y: 50, w: 3, h: 4 },
      { id: diagram.nodes[2].id, x: 0, y: 5, w: 5, h: 1.8 },
    ]
    const result = evaluateFcbd({ diagram, placed, envelope: { width: 100, height: 100 } })
    expect(result.violations.some(v => v.rule === 'fcbd-mandatory-adjacency')).toBe(true)
  })

  it('reports score as ratio of passed checks', () => {
    const diagram = bubbleFromProgram([
      { name: 'Living Room', count: 1, areaM2: 20 },
      { name: 'Corridor', count: 1, areaM2: 5 },
    ])
    const placed: PlacedRect[] = [
      { id: diagram.nodes[0].id, x: 0, y: 0, w: 5, h: 4 },
      { id: diagram.nodes[1].id, x: 0, y: 4, w: 5, h: 1.8 },
    ]
    const result = evaluateFcbd({ diagram, placed, envelope: { width: 20, height: 20 } })
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })
})

// ─── Spatial datasets ────────────────────────────────────────────────

describe('spatialDatasets', () => {
  const ALL_16_IDS = [
    'house-residential',
    'townhouse',
    'apartment-multi',
    'duplex',
    'office-commercial',
    'clinic-health',
    'hotel-fullservice',
    'restaurant',
    'retail-shop',
    'school-classroom',
    'community-hall',
    'market',
    'warehouse-industrial',
    'petrol-station',
    'church-worship',
    'mixed-use',
  ]

  it('has reference programs for all 16 KB typologies', () => {
    const ids = listReferenceTypologyIds()
    for (const id of ALL_16_IDS) {
      expect(ids).toContain(id)
    }
  })

  it('has exactly 16 reference programs', () => {
    expect(listAllReferencePrograms().length).toBe(16)
  })

  it('every KB typology ID has adjacency rules', () => {
    for (const id of ALL_16_IDS) {
      const adj = getReferenceAdjacency(id)
      expect(adj).toBeDefined()
      expect(adj!.rules.length).toBeGreaterThan(0)
    }
  })

  it('getReferenceProgram returns correct structure', () => {
    const house = getReferenceProgram('house-residential')
    expect(house).toBeDefined()
    expect(house!.program.length).toBeGreaterThan(0)
    expect(house!.occupancyClass).toBe('B2')
    expect(house!.efficiency).toBeGreaterThan(0)
    expect(house!.efficiency).toBeLessThanOrEqual(1)
    expect(house!.structuralGridM).toBeGreaterThan(0)
    expect(house!.source).toContain('RPLAN')
  })

  it('getReferenceAdjacency returns rules with from/to groups', () => {
    const adj = getReferenceAdjacency('office-commercial')
    expect(adj).toBeDefined()
    expect(adj!.rules.length).toBeGreaterThan(0)
    for (const rule of adj!.rules) {
      expect(typeof rule.from).toBe('string')
      expect(typeof rule.to).toBe('string')
      expect(rule.weight).toBeGreaterThan(0)
    }
  })

  it('listAllReferencePrograms returns all registered programs', () => {
    const all = listAllReferencePrograms()
    expect(all.length).toBe(16)
  })

  it('all reference programs have positive area per room', () => {
    for (const ref of listAllReferencePrograms()) {
      for (const item of ref.program) {
        expect(item.areaM2).toBeGreaterThan(0)
      }
    }
  })
})
