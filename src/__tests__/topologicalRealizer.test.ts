import { describe, expect, it } from 'vitest'
import {
  diagramToRooms,
  diagramToRules,
  placeBubbleDiagram,
  realizeBubbleDiagram,
  realizeBubbleDiagramToFloorLayout,
  stackBubbleLayout,
} from '../engine/spatial/topological-realizer'
import { bubbleFromProgram } from '../engine/spatial/topological-graph'
import { OFFICE_ADJACENCY_RULES } from '../engine/spatial/adjacency-graph'
import type { BubbleDiagram } from '../engine/spatial/topological-graph'
import type { ProgramItem } from '../engine/tier1-types'

const officeProgram: ProgramItem[] = [
  { name: 'Open Plan', count: 1, areaM2: 60 },
  { name: 'Conference Room', count: 1, areaM2: 30 },
  { name: 'Reception', count: 1, areaM2: 15 },
  { name: 'Corridor', count: 1, areaM2: 10 },
  { name: 'WC', count: 1, areaM2: 6 },
  { name: 'Staircase', count: 1, areaM2: 8 },
]

const houseProgram: ProgramItem[] = [
  { name: 'Living Room', count: 1, areaM2: 18 },
  { name: 'Kitchen', count: 1, areaM2: 9 },
  { name: 'Dining Room', count: 1, areaM2: 12 },
  { name: 'Bedroom', count: 2, areaM2: 11 },
  { name: 'Bathroom', count: 1, areaM2: 5 },
  { name: 'Corridor', count: 1, areaM2: 9 },
]

const houseBubble: BubbleDiagram = bubbleFromProgram(houseProgram, { typologyId: 'house-residential' })

const officeBubble: BubbleDiagram = bubbleFromProgram(officeProgram, {
  typologyId: 'office-commercial',
  adjacencyRules: OFFICE_ADJACENCY_RULES,
})

describe('diagramToRooms', () => {
  it('maps every node onto a placer program room', () => {
    const rooms = diagramToRooms(houseBubble)
    expect(rooms).toHaveLength(houseBubble.nodes.length)
    expect(rooms[0]).toEqual({ id: houseBubble.nodes[0].id, name: houseBubble.nodes[0].name, areaM2: houseBubble.nodes[0].areaM2 })
  })
})

describe('diagramToRules', () => {
  it('collapses node-pair edges into group-level adjacency rules', () => {
    const rules = diagramToRules(houseBubble)
    const bedroomCorridor = rules.find(r => r.from === 'bedroom' && r.to === 'corridor')
    expect(bedroomCorridor).toBeTruthy()
    expect(bedroomCorridor!.weight).toBe(3)
    const kitchenDining = rules.find(r => r.from === 'kitchen' && r.to === 'dining')
    expect(kitchenDining).toBeTruthy()
    expect(kitchenDining!.weight).toBe(3)
  })
})

describe('placeBubbleDiagram', () => {
  it('places placer-compatible groups via the adjacency path', () => {
    const placed = placeBubbleDiagram(officeBubble, 20, 12)
    expect(placed.method).toBe('adjacency')
    expect(placed.valid).toBe(true)
    expect(placed.rooms).toHaveLength(officeBubble.nodes.length)
    for (const node of officeBubble.nodes) {
      expect(placed.rooms.some(r => r.id === node.id)).toBe(true)
    }
    expect(placed.score).toBeGreaterThanOrEqual(0)
    expect(placed.warnings).toEqual([])
  })

  it('reports rooms whose groups the placer does not handle as invalid', () => {
    const placed = placeBubbleDiagram(houseBubble, 12, 12)
    expect(placed.valid).toBe(false)
    expect(placed.warnings.some(w => w.startsWith('Room not placed'))).toBe(true)
  })

  it('honours diagram node groups over re-classification', () => {
    const custom: BubbleDiagram = {
      nodes: officeBubble.nodes.map(node => ({ ...node, group: 'open-plan' })),
      edges: [],
      typologyId: 'office-commercial',
    }
    const placed = placeBubbleDiagram(custom, 20, 12)
    expect(placed.method).toBe('adjacency')
  })
})

describe('stackBubbleLayout', () => {
  it('places every room as a full-width row with no overlaps', () => {
    const stacked = stackBubbleLayout(houseBubble, 12, 12)
    expect(stacked.method).toBe('stack')
    expect(stacked.valid).toBe(true)
    expect(stacked.rooms).toHaveLength(houseBubble.nodes.length)
    expect(stacked.warnings).toEqual([])
    for (const room of stacked.rooms) {
      expect(room.x).toBe(0)
      expect(room.width).toBe(12)
      expect(room.y + room.height).toBeLessThanOrEqual(12 + 0.001)
    }
  })

  it('sorts rows by descending area', () => {
    const stacked = stackBubbleLayout(houseBubble, 12, 12)
    const areas = stacked.rooms.map(r => r.width * r.height)
    for (let i = 1; i < areas.length; i++) expect(areas[i]).toBeLessThanOrEqual(areas[i - 1] + 0.001)
  })

  it('is deterministic across calls', () => {
    const a = stackBubbleLayout(houseBubble, 12, 12)
    const b = stackBubbleLayout(houseBubble, 12, 12)
    expect(a.rooms).toEqual(b.rooms)
  })

  it('drops rooms that do not fit and marks the layout invalid', () => {
    const stacked = stackBubbleLayout(houseBubble, 5, 4)
    expect(stacked.valid).toBe(false)
    expect(stacked.warnings.some(w => w.startsWith('Room not placed'))).toBe(true)
    expect(stacked.rooms.length).toBeLessThan(houseBubble.nodes.length)
  })
})

describe('realizeBubbleDiagram', () => {
  it('prefers the adjacency path when it places every node', () => {
    const realized = realizeBubbleDiagram(officeBubble, { width: 20, height: 12 })
    expect(realized.method).toBe('adjacency')
    expect(realized.valid).toBe(true)
  })

  it('falls back to the stack for generic diagrams', () => {
    const realized = realizeBubbleDiagram(houseBubble, { width: 12, height: 12 })
    expect(realized.method).toBe('stack')
    expect(realized.valid).toBe(true)
    expect(realized.rooms).toHaveLength(houseBubble.nodes.length)
  })

  it('carries the primary-path warnings into the fallback', () => {
    const realized = realizeBubbleDiagram(houseBubble, { width: 12, height: 12 })
    expect(realized.warnings.some(w => w.startsWith('Room not placed'))).toBe(true)
  })

  it('marks a too-small plate invalid with warnings', () => {
    const realized = realizeBubbleDiagram(houseBubble, { width: 5, height: 4 })
    expect(realized.valid).toBe(false)
    expect(realized.warnings.length).toBeGreaterThan(0)
  })
})

describe('realizeBubbleDiagramToFloorLayout', () => {
  it('produces a FloorLayoutResult with the realized rooms', () => {
    const grid = { spanX: 7.2, spanY: 7.2 }
    const result = realizeBubbleDiagramToFloorLayout(officeBubble, { width: 20, height: 12, grid })
    expect(result.valid).toBe(true)
    expect(result.rooms).toHaveLength(officeBubble.nodes.length)
    for (const room of result.rooms) {
      expect(typeof room.id).toBe('string')
      expect(typeof room.name).toBe('string')
      expect(typeof room.x).toBe('number')
      expect(typeof room.y).toBe('number')
      expect(typeof room.width).toBe('number')
      expect(typeof room.height).toBe('number')
    }
    expect(result.structuralGrid).toEqual(grid)
    expect(result.coreLayout).toBeTruthy()
    expect(result.floorPlateMetrics!.totalAreaM2).toBe(240)
    expect(result.adjacencyGraph!.score).toBeGreaterThanOrEqual(0)
  })

  it('emits the stack fallback warnings for generic diagrams', () => {
    const result = realizeBubbleDiagramToFloorLayout(houseBubble, { width: 12, height: 12 })
    expect(result.valid).toBe(true)
    expect(result.warnings).toContain('Room not placed: Kitchen')
  })
})
