// P49 Façade Opening Quality — targeted regression tests for opening-hosts.ts improvements
// Validates: entrance centering, multi-window placement, room-type-aware sizing, standard widths
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { normalizeRooms } from '@/lib/geometry/geometry-normalizer'
import { buildPolygons } from '@/lib/geometry/room-polygons'
import { detectSharedBoundaries } from '@/lib/geometry/shared-boundaries'
import { buildCanonicalWallGraph } from '@/lib/geometry/canonical-wall-graph'
import { resolveOpeningHosts } from '@/lib/geometry/opening-hosts'
import type { RoomRect } from '@/domain/plan'

function rect(id: string, name: string, x: number, y: number, w: number, h: number): RoomRect {
  return { id, name, x, y, width: w, height: h }
}

function buildScene(raw: RoomRect[]) {
  const width = Math.max(...raw.map(r => r.x + r.width))
  const height = Math.max(...raw.map(r => r.y + r.height))
  const norm = normalizeRooms(raw, width, height)
  const polys = buildPolygons(norm)
  const boundaries = detectSharedBoundaries(polys)
  const graph = buildCanonicalWallGraph(polys, boundaries, width, height, 0.12)
  const rooms = raw.map((r, i) => ({
    ...r,
    x: norm[i].snappedX,
    y: norm[i].snappedY,
    width: norm[i].snappedW,
    height: norm[i].snappedH,
  }))
  return { rooms, polys, boundaries, walls: graph.walls, externalWalls: graph.externalWalls }
}

function isFrontWallInScene(w: { start: { x: number; y: number }; end: { x: number; y: number } }): boolean {
  return Math.abs(w.start.y) < 0.01 && Math.abs(w.end.y) < 0.01
}

function wallLen(w: { start: { x: number; y: number }; end: { x: number; y: number } }): number {
  return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y)
}

describe('P49 — entrance centering', () => {
  it('places entrance door on the public room front wall', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = buildScene([
      rect('living', 'Living Room', 0, 0, 6, 5),
      rect('kitchen', 'Kitchen', 0, 5, 6, 3),
      rect('hall', 'Hallway', 6, 0, 2, 8),
    ])
    const { openings } = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    const entrance = openings.find(o => o.kind === 'door' && o.width === 1.2)
    expect(entrance).toBeDefined()
    const entranceWall = walls.find(w => w.id === entrance!.wallId)
    expect(entranceWall).toBeDefined()
    expect(isFrontWallInScene(entranceWall!)).toBe(true)
  })

  it('entrance door offset corresponds to living room center', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = buildScene([
      rect('living', 'Living Room', 0, 0, 6, 5),
      rect('kitchen', 'Kitchen', 0, 5, 6, 3),
      rect('hall', 'Hallway', 6, 0, 2, 8),
    ])
    const { openings } = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    const entrance = openings.find(o => o.kind === 'door' && o.width === 1.2)
    expect(entrance).toBeDefined()
    const living = rooms.find(r => r.name === 'Living Room')!
    const livingCenterX = living.x + living.width / 2
    const entranceWall = walls.find(w => w.id === entrance!.wallId)!
    const expectedOffset = (livingCenterX - entranceWall.start.x) / wallLen(entranceWall)
    const clamped = Math.min(0.75, Math.max(0.25, expectedOffset))
    expect(Math.abs(entrance!.offset - clamped)).toBeLessThan(0.02)
  })

  it('falls back to spine centered offset when no public room found', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = buildScene([
      rect('h', 'Hallway', 0, 0, 4, 8),
      rect('b1', 'Bedroom 1', 4, 0, 4, 4),
      rect('b2', 'Bedroom 2', 4, 4, 4, 4),
    ])
    const { openings } = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    const entrance = openings.find(o => o.kind === 'door' && o.width === 1.2)
    expect(entrance).toBeDefined()
    expect(entrance!.offset).toBe(0.42)
  })
})

describe('P49 — multi-window placement', () => {
  function countFrontWindowsForRoom(rooms: RoomRect[], openings: { kind: string; wallId: string; offset: number; width: number }[], walls: { id: string; start: { x: number; y: number }; end: { x: number; y: number } }[], roomName: string): number {
    return openings.filter(o => {
      if (o.kind !== 'window') return false
      const wall = walls.find(w => w.id === o.wallId)
      if (!wall || !isFrontWallInScene(wall)) return false
      const room = rooms.find(r => r.name === roomName)
      if (!room) return false
      const pos = wall.start.x + o.offset * wallLen(wall)
      return pos >= room.x - 0.1 && pos < room.x + room.width
    }).length
  }

  it('large front public room (≥4m wide) gets 2 windows', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = buildScene([
      rect('living', 'Living Room', 0, 0, 6, 5),
      rect('kitchen', 'Kitchen', 0, 5, 6, 3),
      rect('hall', 'Hallway', 6, 0, 2, 8),
    ])
    const { openings } = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    expect(countFrontWindowsForRoom(rooms, openings, walls, 'Living Room')).toBe(2)
  })

  it('small front public room (<4m wide) gets single window', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = buildScene([
      rect('living', 'Living Room', 0, 0, 3.5, 5),
      rect('kitchen', 'Kitchen', 3.5, 0, 3.5, 5),
      rect('hall', 'Hallway', 0, 5, 7, 3),
    ])
    const { openings } = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    expect(countFrontWindowsForRoom(rooms, openings, walls, 'Living Room')).toBe(1)
  })

  it('side/rear private room gets at least one window', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = buildScene([
      rect('living', 'Living Room', 0, 0, 6, 5),
      rect('bed', 'Bedroom 1', 0, 5, 6, 3),
      rect('hall', 'Hallway', 6, 0, 3, 8),
    ])
    const { openings } = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    const bedWindows = openings.filter(o => {
      if (o.kind !== 'window') return false
      const wall = walls.find(w => w.id === o.wallId)
      if (!wall) return false
      const bed = rooms.find(r => r.name === 'Bedroom 1')
      if (!bed) return false
      const isVert = Math.abs(wall.start.x - wall.end.x) < 0.05
      if (isVert) return wall.start.x >= bed.x - 0.1 && wall.start.x <= bed.x + bed.width
      return wall.start.y >= bed.y - 0.1 && wall.start.y <= bed.y + bed.height
    })
    expect(bedWindows.length).toBeGreaterThan(0)
  })
})

describe('P49 — room-type-aware window sizing', () => {
  it('public room front windows are wider than private room front windows', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = buildScene([
      rect('living', 'Living Room', 0, 0, 5, 5),
      rect('bed', 'Bedroom 1', 5, 0, 3, 5),
      rect('hall', 'Hallway', 0, 5, 8, 3),
    ])
    const { openings } = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    const living = rooms.find(r => r.name === 'Living Room')!
    const bed = rooms.find(r => r.name === 'Bedroom 1')!

    const livingWin = openings.filter(o => {
      if (o.kind !== 'window') return false
      const wall = walls.find(w => w.id === o.wallId)
      if (!wall || !isFrontWallInScene(wall)) return false
      const pos = wall.start.x + o.offset * wallLen(wall)
      return pos >= living.x - 0.1 && pos < living.x + living.width
    })
    const bedWin = openings.filter(o => {
      if (o.kind !== 'window') return false
      const wall = walls.find(w => w.id === o.wallId)
      if (!wall || !isFrontWallInScene(wall)) return false
      const pos = wall.start.x + o.offset * wallLen(wall)
      return pos >= bed.x - 0.1 && pos < bed.x + bed.width
    })

    expect(livingWin.length).toBeGreaterThan(0)
    expect(bedWin.length).toBeGreaterThan(0)
    const livingMax = Math.max(...livingWin.map(w => w.width))
    const bedMax = Math.max(...bedWin.map(w => w.width))
    expect(livingMax).toBeGreaterThan(bedMax)
  })

  it('public room front windows are at most 2.0m wide', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = buildScene([
      rect('living', 'Living Room', 0, 0, 6, 5),
      rect('kitchen', 'Kitchen', 0, 5, 6, 3),
      rect('hall', 'Hallway', 6, 0, 2, 8),
    ])
    const { openings } = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    const frontWindows = openings.filter(o => {
      if (o.kind !== 'window') return false
      const wall = walls.find(w => w.id === o.wallId)
      return wall && isFrontWallInScene(wall)
    })
    for (const fw of frontWindows) {
      expect(fw.width).toBeLessThanOrEqual(2.01)
    }
  })

  it('no window exceeds 55% of host wall length', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = buildScene([
      rect('living', 'Living Room', 0, 0, 6, 5),
      rect('kitchen', 'Kitchen', 0, 5, 6, 3),
      rect('hall', 'Hallway', 6, 0, 2, 8),
    ])
    const { openings } = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    for (const o of openings.filter(o => o.kind === 'window')) {
      const wall = walls.find(w => w.id === o.wallId)!
      const maxAllowed = wallLen(wall) * 0.55 + 0.01
      expect(o.width).toBeLessThanOrEqual(maxAllowed)
    }
  })
})

describe('P49 — entrance door standard width', () => {
  it('entrance door has width 1.2m', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = buildScene([
      rect('living', 'Living Room', 0, 0, 6, 5),
      rect('kitchen', 'Kitchen', 0, 5, 6, 3),
      rect('hall', 'Hallway', 6, 0, 2, 8),
    ])
    const { openings } = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    const entrance = openings.find(o => o.kind === 'door' && o.width === 1.2)
    expect(entrance).toBeDefined()
  })

  it('entrance door offset is clamped between 0.25 and 0.75', () => {
    const { rooms, polys, boundaries, walls, externalWalls } = buildScene([
      rect('living', 'Living Room', 0, 0, 6, 5),
      rect('kitchen', 'Kitchen', 0, 5, 6, 3),
      rect('hall', 'Hallway', 6, 0, 2, 8),
    ])
    const { openings } = resolveOpeningHosts(rooms, polys, boundaries, walls, externalWalls)
    const entrance = openings.find(o => o.kind === 'door' && o.width === 1.2)
    expect(entrance).toBeDefined()
    expect(entrance!.offset).toBeGreaterThanOrEqual(0.25)
    expect(entrance!.offset).toBeLessThanOrEqual(0.75)
  })
})
