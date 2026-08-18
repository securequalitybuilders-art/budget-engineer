import { describe, it, expect } from 'vitest'
import {
  snapGrid,
  signedArea,
  realizeGeometric,
} from '../engine/architecture/geometricRealization'

/* ------------------------------------------------------------------ */
/*  snapGrid                                                           */
/* ------------------------------------------------------------------ */

describe('snapGrid', () => {
  it('snaps to nearest grid increment', () => {
    expect(snapGrid(1.23, 0.05)).toBe(1.25)
    expect(snapGrid(1.22, 0.05)).toBe(1.2)
  })
  it('snaps zero correctly', () => {
    expect(snapGrid(0, 0.05)).toBe(0)
  })
  it('handles negative values', () => {
    expect(snapGrid(-1.23, 0.05)).toBe(-1.25)
  })
  it('handles whole-metre snap', () => {
    expect(snapGrid(3.7, 1)).toBe(4)
    expect(snapGrid(3.2, 1)).toBe(3)
  })
})

/* ------------------------------------------------------------------ */
/*  signedArea                                                         */
/* ------------------------------------------------------------------ */

describe('signedArea', () => {
  it('positive for counter-clockwise rectangle', () => {
    const ccw = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 4 },
      { x: 0, y: 4 },
      { x: 0, y: 0 },
    ]
    expect(signedArea(ccw)).toBe(20)
  })
  it('negative for clockwise rectangle', () => {
    const cw = [
      { x: 0, y: 0 },
      { x: 0, y: 4 },
      { x: 5, y: 4 },
      { x: 5, y: 0 },
      { x: 0, y: 0 },
    ]
    expect(signedArea(cw)).toBe(-20)
  })
  it('returns 0 for a degenerate loop', () => {
    const pts = [
      { x: 1, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 1 },
    ]
    expect(signedArea(pts)).toBe(0)
  })
})

/* ------------------------------------------------------------------ */
/*  realizeGeometric — polygon loops                                   */
/* ------------------------------------------------------------------ */

describe('realizeGeometric', () => {
  const twoRoomPlan = {
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 5, height: 4 },
      { id: 'r2', name: 'Kitchen', x: 5, y: 0, width: 3, height: 4 },
    ],
  }

  it('returns polygon loops for every room', () => {
    const result = realizeGeometric(twoRoomPlan)
    expect(result.loops.length).toBe(2)
    expect(result.loops[0].roomId).toBe('r1')
    expect(result.loops[1].roomId).toBe('r2')
  })

  it('each loop is a closed ring (first === last vertex)', () => {
    const result = realizeGeometric(twoRoomPlan)
    for (const loop of result.loops) {
      const first = loop.vertices[0]
      const last = loop.vertices[loop.vertices.length - 1]
      expect(first.x).toBe(last.x)
      expect(first.y).toBe(last.y)
    }
  })

  it('loops have exactly 5 vertices (4 corners + close)', () => {
    const result = realizeGeometric(twoRoomPlan)
    for (const loop of result.loops) {
      expect(loop.vertices.length).toBe(5)
    }
  })

  it('all edges are axis-aligned (horizontal or vertical)', () => {
    const result = realizeGeometric(twoRoomPlan)
    for (const loop of result.loops) {
      for (let i = 0; i < loop.vertices.length - 1; i++) {
        const a = loop.vertices[i]
        const b = loop.vertices[i + 1]
        const isHorizontal = Math.abs(a.y - b.y) < 0.001
        const isVertical = Math.abs(a.x - b.x) < 0.001
        expect(isHorizontal || isVertical).toBe(true)
      }
    }
  })

  it('area matches room dimensions', () => {
    const result = realizeGeometric(twoRoomPlan)
    expect(result.loops[0].area).toBeCloseTo(20, 1)
    expect(result.loops[1].area).toBeCloseTo(12, 1)
  })

  it('snaps room corners to grid (default 0.05m)', () => {
    const plan = {
      rooms: [{ id: 'r1', name: 'Room', x: 0.03, y: 0.07, width: 4.97, height: 3.93 }],
    }
    const result = realizeGeometric(plan)
    const loop = result.loops[0]
    // Corners should be on 0.05 grid
    expect(loop.vertices[0].x % 0.05).toBeCloseTo(0, 4)
    expect(loop.vertices[0].y % 0.05).toBeCloseTo(0, 4)
  })

  it('respects custom grid snap', () => {
    const plan = {
      rooms: [{ id: 'r1', name: 'Room', x: 0, y: 0, width: 5, height: 4 }],
    }
    const result = realizeGeometric(plan, { gridSnap: 0.1 })
    for (const loop of result.loops) {
      expect(loop.vertices[0].x % 0.1).toBeCloseTo(0, 4)
    }
  })

  it('stats has correct roomCount', () => {
    const result = realizeGeometric(twoRoomPlan)
    expect(result.stats.roomCount).toBe(2)
  })

  it('stats.totalArea is sum of loop areas', () => {
    const result = realizeGeometric(twoRoomPlan)
    const sum = result.loops.reduce((s, l) => s + l.area, 0)
    expect(result.stats.totalArea).toBeCloseTo(sum, 1)
  })
})

/* ------------------------------------------------------------------ */
/*  realizeGeometric — shared-edge alignment                           */
/* ------------------------------------------------------------------ */

describe('shared-edge alignment', () => {
  it('aligns adjacent rooms so shared edge has exact coordinates', () => {
    const plan = {
      rooms: [
        { id: 'r1', name: 'A', x: 0, y: 0, width: 5, height: 4 },
        { id: 'r2', name: 'B', x: 5.01, y: 0, width: 3, height: 4 },
      ],
    }
    const result = realizeGeometric(plan, { adjacencyTol: 0.1 })
    // Room A right edge should equal Room B left edge
    const aRight = result.loops[0].vertices[1].x // top-right
    const bLeft = result.loops[1].vertices[0].x // bottom-left
    expect(aRight).toBe(bLeft)
  })

  it('counts shared edges correctly', () => {
    const plan = {
      rooms: [
        { id: 'r1', name: 'A', x: 0, y: 0, width: 5, height: 4 },
        { id: 'r2', name: 'B', x: 5, y: 0, width: 3, height: 4 },
      ],
    }
    const result = realizeGeometric(plan)
    expect(result.stats.sharedEdges).toBe(1)
  })
})

/* ------------------------------------------------------------------ */
/*  realizeGeometric — door coordinates                                */
/* ------------------------------------------------------------------ */

describe('door coordinates', () => {
  it('computes door centres from wall opening offsets', () => {
    const plan = {
      rooms: [
        { id: 'r1', name: 'A', x: 0, y: 0, width: 5, height: 4 },
        { id: 'r2', name: 'B', x: 5, y: 0, width: 3, height: 4 },
      ],
      walls: [
        {
          id: 'w1',
          start: { x: 5, y: 0 },
          end: { x: 5, y: 4 },
          thickness: 0.115,
          type: 'internal' as const,
        },
      ],
      openings: [
        { id: 'd1', wallId: 'w1', offset: 0.5, width: 0.9, kind: 'door' as const },
      ],
    }
    const result = realizeGeometric(plan)
    expect(result.doors.length).toBe(1)
    expect(result.doors[0].point.x).toBe(5)
    expect(result.doors[0].point.y).toBe(2)
    expect(result.doors[0].width).toBe(0.9)
    expect(result.stats.doorCount).toBe(1)
  })

  it('computes normal angle perpendicular to wall', () => {
    const plan = {
      rooms: [{ id: 'r1', name: 'A', x: 0, y: 0, width: 5, height: 4 }],
      walls: [
        {
          id: 'w1',
          start: { x: 0, y: 0 },
          end: { x: 5, y: 0 },
          thickness: 0.23,
          type: 'external' as const,
        },
      ],
      openings: [
        { id: 'd1', wallId: 'w1', offset: 0.5, width: 0.9, kind: 'door' as const },
      ],
    }
    const result = realizeGeometric(plan)
    // Horizontal wall → normal is π/2 (pointing up)
    expect(result.doors[0].normalAngle).toBeCloseTo(Math.PI / 2, 3)
  })

  it('skips window openings', () => {
    const plan = {
      rooms: [{ id: 'r1', name: 'A', x: 0, y: 0, width: 5, height: 4 }],
      walls: [
        {
          id: 'w1',
          start: { x: 0, y: 0 },
          end: { x: 5, y: 0 },
          thickness: 0.23,
          type: 'external' as const,
        },
      ],
      openings: [
        { id: 'win1', wallId: 'w1', offset: 0.5, width: 1.2, kind: 'window' as const },
      ],
    }
    const result = realizeGeometric(plan)
    expect(result.doors.length).toBe(0)
  })

  it('handles plan without walls or openings', () => {
    const result = realizeGeometric({
      rooms: [{ id: 'r1', name: 'A', x: 0, y: 0, width: 5, height: 4 }],
    })
    expect(result.doors.length).toBe(0)
    expect(result.stats.doorCount).toBe(0)
  })
})

/* ------------------------------------------------------------------ */
/*  RealizedPlan type shape                                            */
/* ------------------------------------------------------------------ */

describe('RealizedPlan shape', () => {
  it('has expected top-level fields', () => {
    const result = realizeGeometric({
      rooms: [{ id: 'r1', name: 'A', x: 0, y: 0, width: 5, height: 4 }],
    })
    expect(result).toHaveProperty('loops')
    expect(result).toHaveProperty('doors')
    expect(result).toHaveProperty('stats')
    expect(result.stats).toHaveProperty('totalArea')
    expect(result.stats).toHaveProperty('roomCount')
    expect(result.stats).toHaveProperty('doorCount')
    expect(result.stats).toHaveProperty('sharedEdges')
  })

  it('PolygonLoop has expected fields', () => {
    const result = realizeGeometric({
      rooms: [{ id: 'r1', name: 'A', x: 0, y: 0, width: 5, height: 4 }],
    })
    const loop = result.loops[0]
    expect(loop).toHaveProperty('vertices')
    expect(loop).toHaveProperty('roomId')
    expect(loop).toHaveProperty('name')
    expect(loop).toHaveProperty('area')
  })
})
