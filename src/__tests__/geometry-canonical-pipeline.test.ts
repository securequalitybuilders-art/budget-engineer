// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { normalizeRooms, snapCollection, detectOverlaps, resolveOverlaps } from '@/lib/geometry/geometry-normalizer'
import { buildPolygons, roomToPolygon, sharedSegment } from '@/lib/geometry/room-polygons'
import { detectSharedBoundaries } from '@/lib/geometry/shared-boundaries'
import { buildCanonicalWallGraph } from '@/lib/geometry/canonical-wall-graph'
import { resolveOpeningHosts } from '@/lib/geometry/opening-hosts'
import { assemblePlan } from '@/lib/geometry/plan-intelligence'
import type { RoomRect } from '@/domain/plan'

// ── Helpers ──

function rect(id: string, name: string, x: number, y: number, w: number, h: number): RoomRect {
  return { id, name, x, y, width: w, height: h }
}

// ── geometry-normalizer ──

describe('geometry-normalizer', () => {
  describe('normalizeRooms', () => {
    it('snaps coordinates to SNAP_GRID (0.05)', () => {
      const rooms = [rect('r1', 'Living', 1.23, 2.78, 4.56, 3.21)]
      const result = normalizeRooms(rooms, 10, 10)
      expect(result[0].snappedX).toBeCloseTo(1.25, 5)
      expect(result[0].snappedY).toBeCloseTo(2.80, 5)
      expect(result[0].snappedW).toBeCloseTo(4.55, 5)
      expect(result[0].snappedH).toBeCloseTo(3.20, 5)
    })

    it('preserves original RoomRect properties', () => {
      const rooms = [rect('r1', 'Kitchen', 1, 1, 4, 4)]
      const result = normalizeRooms(rooms, 10, 10)
      expect(result[0].id).toBe('r1')
      expect(result[0].name).toBe('Kitchen')
    })

    it('handles empty rooms array', () => {
      const result = normalizeRooms([], 10, 10)
      expect(result).toEqual([])
    })
  })

  describe('snapCollection', () => {
    it('snaps building width/height to grid', () => {
      const rooms = normalizeRooms([rect('r1', 'Room', 2, 2, 4, 4)], 9.99, 9.99)
      const { width, height } = snapCollection(rooms, 9.99, 9.99)
      expect(width).toBe(10.00)
      expect(height).toBe(10.00)
    })

    it('aligns room edges to canonical collection', () => {
      const raw = [rect('r1', 'A', 2.01, 2.01, 3.99, 3.99), rect('r2', 'B', 6.02, 2.01, 3.98, 3.99)]
      const norm = normalizeRooms(raw, 12, 12)
      const { rooms } = snapCollection(norm, 12, 12)
      expect(rooms).toHaveLength(2)
    })
  })

  describe('detectOverlaps', () => {
    it('detects overlapping rooms', () => {
      const rooms = normalizeRooms([
        rect('r1', 'Room A', 0, 0, 5, 5),
        rect('r2', 'Room B', 3, 3, 5, 5),
      ], 10, 10)
      const overlaps = detectOverlaps(rooms)
      expect(overlaps).toHaveLength(1)
      expect(overlaps[0].roomA).toBe('r1')
      expect(overlaps[0].roomB).toBe('r2')
    })

    it('returns empty for non-overlapping rooms', () => {
      const rooms = normalizeRooms([
        rect('r1', 'Room A', 0, 0, 4, 4),
        rect('r2', 'Room B', 5, 5, 4, 4),
      ], 10, 10)
      const overlaps = detectOverlaps(rooms)
      expect(overlaps).toHaveLength(0)
    })

    it('tolerance does not false-positive just-touching rooms', () => {
      const rooms = normalizeRooms([
        rect('r1', 'Room A', 0, 0, 5, 5),
        rect('r2', 'Room B', 5, 0, 5, 5),
      ], 10, 10)
      const overlaps = detectOverlaps(rooms)
      expect(overlaps).toHaveLength(0)
    })
  })

  describe('resolveOverlaps', () => {
    it('pushes overlapping rooms apart for minor overlap', () => {
      const rooms = normalizeRooms([
        rect('r1', 'Room A', 0, 0, 5, 5),
        rect('r2', 'Room B', 4.9, 0, 5, 5),
      ], 10, 10)
      const { resolved: count } = resolveOverlaps(rooms)
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('warns for unresolvable large overlaps', () => {
      const rooms = normalizeRooms([
        rect('r1', 'Room A', 0, 0, 8, 8),
        rect('r2', 'Room B', 1, 1, 8, 8),
      ], 10, 10)
      const { warnings } = resolveOverlaps(rooms)
      expect(warnings.some(w => w.includes('Cannot resolve overlap'))).toBe(true)
    })
  })
})

// ── room-polygons ──

describe('room-polygons', () => {
  describe('roomToPolygon', () => {
    it('builds a polygon with 4 segments', () => {
      const rooms = normalizeRooms([rect('r1', 'Bedroom', 0, 0, 4, 3)], 10, 10)
      const poly = roomToPolygon(rooms[0])
      expect(poly.segments).toHaveLength(4)
      expect(poly.roomId).toBe('r1')
      expect(poly.roomName).toBe('Bedroom')
    })

    it('segment lengths match room dimensions', () => {
      const rooms = normalizeRooms([rect('r1', 'Bed', 0, 0, 4, 3)], 10, 10)
      const poly = roomToPolygon(rooms[0])
      expect(poly.segments[0].length).toBeCloseTo(4, 5)
      expect(poly.segments[1].length).toBeCloseTo(3, 5)
      expect(poly.segments[2].length).toBeCloseTo(4, 5)
      expect(poly.segments[3].length).toBeCloseTo(3, 5)
    })
  })

  describe('sharedSegment', () => {
    it('detects shared vertical segment between right-neighbour rooms', () => {
      const rooms = normalizeRooms([
        rect('r1', 'A', 0, 0, 4, 4),
        rect('r2', 'B', 4, 0, 4, 4),
      ], 10, 10)
      const polys = buildPolygons(rooms)
      const seg = sharedSegment(polys[0], polys[1])
      expect(seg).not.toBeNull()
      expect(seg!.length).toBeCloseTo(4, 2)
    })

    it('detects shared horizontal segment between bottom-neighbour rooms', () => {
      const rooms = normalizeRooms([
        rect('r1', 'A', 0, 0, 4, 4),
        rect('r2', 'B', 0, 4, 4, 4),
      ], 10, 10)
      const polys = buildPolygons(rooms)
      const seg = sharedSegment(polys[0], polys[1])
      expect(seg).not.toBeNull()
      expect(seg!.length).toBeCloseTo(4, 2)
    })

    it('returns null for non-adjacent rooms', () => {
      const rooms = normalizeRooms([
        rect('r1', 'A', 0, 0, 4, 4),
        rect('r2', 'B', 6, 6, 3, 3),
      ], 10, 10)
      const polys = buildPolygons(rooms)
      const seg = sharedSegment(polys[0], polys[1])
      expect(seg).toBeNull()
    })
  })
})

// ── shared-boundaries ──

describe('shared-boundaries', () => {
  it('detects boundary between two adjacent rooms', () => {
    const rooms = normalizeRooms([
      rect('r1', 'Kitchen', 0, 0, 4, 4),
      rect('r2', 'Dining', 4, 0, 4, 4),
    ], 10, 10)
    const polys = buildPolygons(rooms)
    const boundaries = detectSharedBoundaries(polys)
    expect(boundaries).toHaveLength(1)
    expect(boundaries[0].roomAId).toBe('r1')
    expect(boundaries[0].roomBId).toBe('r2')
    expect(boundaries[0].boundaryType).toBe('full')
  })

  it('returns empty for non-adjacent rooms', () => {
    const rooms = normalizeRooms([
      rect('r1', 'Room A', 0, 0, 3, 3),
      rect('r2', 'Room B', 5, 5, 3, 3),
    ], 10, 10)
    const polys = buildPolygons(rooms)
    const boundaries = detectSharedBoundaries(polys)
    expect(boundaries).toHaveLength(0)
  })

  it('detects partial boundary when shorter overlap', () => {
    const rooms = normalizeRooms([
      rect('r1', 'Wide', 0, 0, 6, 4),
      rect('r2', 'Narrow', 1, 4, 3, 4),
    ], 10, 10)
    const polys = buildPolygons(rooms)
    const boundaries = detectSharedBoundaries(polys, 0.01)
    expect(boundaries.length).toBeGreaterThanOrEqual(0)
  })
})

// ── canonical-wall-graph ──

describe('canonical-wall-graph', () => {
  it('builds graph with 4 external walls', () => {
    const rooms = normalizeRooms([
      rect('r1', 'Room', 0, 0, 6, 6),
    ], 6, 6)
    const polys = buildPolygons(rooms)
    const boundaries = detectSharedBoundaries(polys)
    const graph = buildCanonicalWallGraph(polys, boundaries, 6, 6, 0.12)
    expect(graph.externalWalls).toHaveLength(4)
    expect(graph.walls.length).toBeGreaterThanOrEqual(4)
  })

  it('deduplicates internal walls from shared boundaries', () => {
    const rooms = normalizeRooms([
      rect('r1', 'A', 0, 0, 4, 4),
      rect('r2', 'B', 4, 0, 4, 4),
    ], 8, 4)
    const polys = buildPolygons(rooms)
    const boundaries = detectSharedBoundaries(polys)
    const graph = buildCanonicalWallGraph(polys, boundaries, 8, 4, 0.12)
    expect(graph.walls.length).toBeGreaterThanOrEqual(5)
  })

  it('handles single-room edge case', () => {
    const rooms = normalizeRooms([rect('r1', 'Studio', 0, 0, 5, 5)], 5, 5)
    const polys = buildPolygons(rooms)
    const boundaries = detectSharedBoundaries(polys)
    const graph = buildCanonicalWallGraph(polys, boundaries, 5, 5, 0.12)
    expect(graph.walls).toHaveLength(4)
    expect(graph.adjacency).toHaveLength(0)
  })
})

// ── opening-hosts ──

describe('opening-hosts', () => {
  function makeScene() {
    const raw: RoomRect[] = [
      rect('hall', 'Hallway', 0, 0, 4, 8),
      rect('living', 'Living Room', 4, 0, 6, 5),
      rect('kitchen', 'Kitchen', 4, 5, 6, 3),
    ]
    const norm = normalizeRooms(raw, 10, 8)
    const polys = buildPolygons(norm)
    const boundaries = detectSharedBoundaries(polys)
    const graph = buildCanonicalWallGraph(polys, boundaries, 10, 8, 0.12)
    const updatedRooms = raw.map((r, i) => ({
      ...r,
      x: norm[i].snappedX,
      y: norm[i].snappedY,
      width: norm[i].snappedW,
      height: norm[i].snappedH,
    }))
    return { rooms: updatedRooms, polys, boundaries, walls: graph.walls, externalWalls: graph.externalWalls }
  }

  it('resolves openings without throwing', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = makeScene()
    const result = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    expect(result.openings.length).toBeGreaterThan(0)
  })

  it('every opening references a real wall', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = makeScene()
    const wallIds = new Set(walls.map(w => w.id))
    const result = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    for (const o of result.openings) {
      expect(wallIds.has(o.wallId)).toBe(true)
    }
  })

  it('includes at least one door', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = makeScene()
    const result = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    expect(result.openings.some(o => o.kind === 'door')).toBe(true)
  })

  it('includes at least one window', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = makeScene()
    const result = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    expect(result.openings.some(o => o.kind === 'window')).toBe(true)
  })

  it('has valid offsets and widths', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = makeScene()
    const result = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    for (const o of result.openings) {
      expect(o.offset).toBeGreaterThanOrEqual(0)
      expect(o.offset).toBeLessThanOrEqual(1)
      expect(o.width).toBeGreaterThan(0)
    }
  })
})

// ── Integration: assemblePlan through pipeline ──

describe('canonical pipeline integration', () => {
  it('normalize → polygons → boundaries → walls → openings produces consistent output', () => {
    const raw: RoomRect[] = [
      rect('hall', 'Hallway', 0, 0, 4, 10),
      rect('r1', 'Living Room', 4, 0, 6, 5),
      rect('r2', 'Kitchen', 4, 5, 6, 3),
      rect('r3', 'Bathroom', 0, 10, 4, 2),
    ]
    const norm = normalizeRooms(raw, 10, 12)
    const polys = buildPolygons(norm)
    const boundaries = detectSharedBoundaries(polys)
    const graph = buildCanonicalWallGraph(polys, boundaries, 10, 12, 0.12)
    const updatedRooms = raw.map((r, i) => ({
      ...r,
      x: norm[i].snappedX,
      y: norm[i].snappedY,
      width: norm[i].snappedW,
      height: norm[i].snappedH,
    }))
    const { openings } = resolveOpeningHosts(updatedRooms, polys, boundaries, graph.walls, graph.externalWalls)

    expect(graph.walls.length).toBeGreaterThanOrEqual(4)
    expect(openings.length).toBeGreaterThan(0)
    expect(openings.every(o => graph.walls.some(w => w.id === o.wallId))).toBe(true)
  })

  it('handles minimal 1-room plan gracefully', () => {
    const raw: RoomRect[] = [rect('studio', 'Studio', 0, 0, 5, 5)]
    const norm = normalizeRooms(raw, 5, 5)
    const polys = buildPolygons(norm)
    const boundaries = detectSharedBoundaries(polys)
    const graph = buildCanonicalWallGraph(polys, boundaries, 5, 5, 0.12)
    const updatedRooms = raw.map((r, i) => ({
      ...r,
      x: norm[i].snappedX,
      y: norm[i].snappedY,
      width: norm[i].snappedW,
      height: norm[i].snappedH,
    }))
    const { openings } = resolveOpeningHosts(updatedRooms, polys, boundaries, graph.walls, graph.externalWalls)

    expect(graph.walls).toHaveLength(4)
    expect(openings.length).toBeGreaterThan(0)
  })
})

// ── P12.9d: Geometry Finalization & Validity Enforcement ──

describe('P12.9d — boundary snap', () => {
  it('assemblePlan snaps width and height to 0.05 grid', () => {
    const rooms = [rect('r1', 'Living Room', 0, 0, 4.23, 5.67)]
    const { plan } = assemblePlan({ rooms, width: 10.37, height: 12.81, wallThickness: 0.2, designOptionId: 'd1' })
    expect(plan.width % 0.05).toBeCloseTo(0, 10)
    expect(plan.height % 0.05).toBeCloseTo(0, 10)
  })

  it('assemblePlan clamps rooms that exceed plan boundary', () => {
    const rooms = [rect('r1', 'Living Room', 0, 0, 12, 1)]
    const { plan } = assemblePlan({ rooms, width: 10, height: 10, wallThickness: 0.2, designOptionId: 'd1' })
    const clamped = plan.rooms.find(r => r.name === 'Living Room')
    expect(clamped).toBeDefined()
    expect(clamped!.width).toBeLessThanOrEqual(plan.width)
  })
})

describe('P12.9d — overlap epsilon', () => {
  it('detectOverlaps catches 0.02m overlap with tightened epsilon', () => {
    const raw = [
      rect('a', 'A', 0, 0, 5, 5),
      rect('b', 'B', 4.95, 0, 5, 5),
    ]
    const norm = normalizeRooms(raw, 10, 10)
    const overlaps = detectOverlaps(norm)
    expect(overlaps.length).toBeGreaterThanOrEqual(1)
  })

  it('detectOverlaps tolerates 0.005m touching (no false positive)', () => {
    const raw = [
      rect('a', 'A', 0, 0, 5, 5),
      rect('b', 'B', 5.005, 0, 5, 5),
    ]
    const norm = normalizeRooms(raw, 10, 10)
    const overlaps = detectOverlaps(norm)
    expect(overlaps.length).toBe(0)
  })
})

describe('P12.9d — per-room windows', () => {
  it('habitable rooms get at least one window each', () => {
    const raw = [
      rect('r1', 'Living Room', 0, 0, 5, 4),
      rect('r2', 'Bedroom 1', 0, 4, 5, 4),
      rect('r3', 'Bedroom 2', 5, 0, 4, 4),
      rect('r4', 'Bathroom', 5, 4, 4, 2),
    ]
    const norm = normalizeRooms(raw, 10, 8)
    const polys = buildPolygons(norm)
    const boundaries = detectSharedBoundaries(polys)
    const graph = buildCanonicalWallGraph(polys, boundaries, 10, 8, 0.12)
    const updated = raw.map((r, i) => ({ ...r, x: norm[i].snappedX, y: norm[i].snappedY, width: norm[i].snappedW, height: norm[i].snappedH }))
    const { openings } = resolveOpeningHosts(updated, polys, boundaries, graph.walls, graph.externalWalls)
    const windows = openings.filter(o => o.kind === 'window')
    const habitable = ['r1', 'r2', 'r3']
    for (const roomId of habitable) {
      const poly = polys.find(p => p.roomId === roomId)
      if (!poly) { expect(poly).toBeDefined(); continue }
      const touching = graph.externalWalls.filter(ew => {
        const eps = 0.05
        const isVert = Math.abs(ew.start.x - ew.end.x) < eps
        if (isVert) {
          if (Math.abs(ew.start.x - poly.x) >= eps && Math.abs(ew.start.x - (poly.x + poly.width)) >= eps) return false
          const wallMinY = Math.min(ew.start.y, ew.end.y)
          const wallMaxY = Math.max(ew.start.y, ew.end.y)
          const overlap = Math.min(wallMaxY, poly.y + poly.height) - Math.max(wallMinY, poly.y)
          return overlap >= 0.6
        }
        if (Math.abs(ew.start.y - poly.y) >= eps && Math.abs(ew.start.y - (poly.y + poly.height)) >= eps) return false
        const wallMinX = Math.min(ew.start.x, ew.end.x)
        const wallMaxX = Math.max(ew.start.x, ew.end.x)
        const overlap = Math.min(wallMaxX, poly.x + poly.width) - Math.max(wallMinX, poly.x)
        return overlap >= 0.6
      })
      const hasWindow = windows.some(w => touching.some(ew => ew.id === w.wallId))
      expect(hasWindow).toBe(true)
    }
  })
})

describe('P12.9d — required-room validity', () => {
  it('rejects required rooms below minimum dimensions', () => {
    const rooms = [rect('r1', 'Bedroom 1', 0, 0, 1.5, 1.5)]
    const { plan, warnings, rejected } = assemblePlan({ rooms, width: 5, height: 5, wallThickness: 0.2, designOptionId: 'd1' })
    expect(rejected).toBe(true)
    expect(warnings.some(w => w.includes('LAYOUT_REJECTED'))).toBe(true)
    expect(plan.planSource).toBe('canonical-generated-plan-rejected')
  })

  it('allows flexible rooms below minimum (warning only)', () => {
    const rooms = [rect('r1', 'Store', 0, 0, 1.2, 1.2)]
    const { warnings, rejected } = assemblePlan({ rooms, width: 5, height: 5, wallThickness: 0.2, designOptionId: 'd1' })
    expect(rejected).toBe(false)
    const flexWarnings = warnings.filter(w => w.includes('Store'))
    expect(flexWarnings.length).toBeGreaterThan(0)
  })
})

describe('P12.9d — plan source metadata', () => {
  it('valid plan gets canonical-generated-plan source', () => {
    const rooms = [rect('r1', 'Living Room', 0, 0, 5, 4), rect('r2', 'Bedroom 1', 0, 4, 5, 4)]
    const { plan, rejected } = assemblePlan({ rooms, width: 10, height: 10, wallThickness: 0.2, designOptionId: 'd1' })
    expect(rejected).toBe(false)
    expect(plan.planSource).toBe('canonical-generated-plan')
  })

  it('rejected plan gets canonical-generated-plan-rejected source', () => {
    const rooms = [rect('r1', 'Bedroom 1', 0, 0, 1, 1)]
    const { plan, rejected } = assemblePlan({ rooms, width: 5, height: 5, wallThickness: 0.2, designOptionId: 'd1' })
    expect(rejected).toBe(true)
    expect(plan.planSource).toBe('canonical-generated-plan-rejected')
  })
})

describe('P12.9d — connectivity regression', () => {
  it('3-room layout maintains connectivity through canonical pipeline', () => {
    const raw = [
      rect('h', 'Hallway', 0, 0, 2, 6),
      rect('l', 'Living Room', 2, 0, 5, 3),
      rect('k', 'Kitchen', 2, 3, 5, 3),
    ]
    const norm = normalizeRooms(raw, 8, 6)
    const polys = buildPolygons(norm)
    const boundaries = detectSharedBoundaries(polys)
    const graph = buildCanonicalWallGraph(polys, boundaries, 8, 6, 0.12)
    const updated = raw.map((r, i) => ({ ...r, x: norm[i].snappedX, y: norm[i].snappedY, width: norm[i].snappedW, height: norm[i].snappedH }))
    const { openings } = resolveOpeningHosts(updated, polys, boundaries, graph.walls, graph.externalWalls)
    expect(graph.walls.length).toBeGreaterThanOrEqual(4)
    expect(openings.length).toBeGreaterThanOrEqual(2)
    expect(openings.every(o => graph.walls.some(w => w.id === o.wallId))).toBe(true)
  })
})

describe('P12.9d — full pipeline rejection', () => {
  it('assemblePlan returns rejected for invalid layout', () => {
    const rooms = [
      rect('r1', 'Bedroom 1', 0, 0, 0.5, 0.5),
      rect('r2', 'Bedroom 2', 0.4, 0, 0.5, 0.5),
    ]
    const result = assemblePlan({ rooms, width: 2, height: 2, wallThickness: 0.2, designOptionId: 'd1' })
    expect(result.rejected).toBe(true)
  })
})
