// ── planToPaths.test.ts ────────────────────────────────────────
// Tests for PlanModel → PlotterPath[] conversion.

import { describe, it, expect } from 'vitest'
import {
  planToPlotterPaths,
  totalPathLength,
  pathLayerSummary,
  pathsBoundingBox,
} from '@/lib/plotter/planToPaths'
import type { PlanModel } from '@/domain/plan'

// ── Fixture ────────────────────────────────────────────────────

function makePlan(overrides: Partial<PlanModel> = {}): PlanModel {
  return {
    id: 'plan-1',
    designOptionId: 'design-1',
    width: 12,
    height: 8,
    wallThickness: 0.23,
    rooms: [
      { id: 'living', name: 'Living Room', x: 0, y: 0, width: 6, height: 4 },
      { id: 'kitchen', name: 'Kitchen', x: 6, y: 0, width: 4, height: 4 },
    ],
    walls: [
      {
        id: 'wall-ext-1',
        start: { x: 0, y: 0 },
        end: { x: 12, y: 0 },
        type: 'external',
        thickness: 0.23,
      },
      {
        id: 'wall-int-1',
        start: { x: 6, y: 0 },
        end: { x: 6, y: 4 },
        type: 'internal',
        thickness: 0.115,
      },
    ],
    openings: [
      { id: 'door-1', wallId: 'wall-ext-1', kind: 'door', offset: 0.25, width: 0.9 },
      { id: 'window-1', wallId: 'wall-ext-1', kind: 'window', offset: 0.667, width: 1.2 },
    ],
    scaleLabel: '1:100',
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────

describe('planToPlotterPaths', () => {
  it('returns one path per wall', () => {
    const plan = makePlan()
    const paths = planToPlotterPaths(plan)
    const wallPaths = paths.filter((p) => p.layer.startsWith('A-WALL'))
    expect(wallPaths.length).toBe(2)
  })

  it('maps external walls to A-WALL-FULL', () => {
    const plan = makePlan()
    const paths = planToPlotterPaths(plan)
    const full = paths.filter((p) => p.layer === 'A-WALL-FULL')
    expect(full.length).toBe(1)
  })

  it('maps internal walls to A-WALL-PART', () => {
    const plan = makePlan()
    const paths = planToPlotterPaths(plan)
    const part = paths.filter((p) => p.layer === 'A-WALL-PART')
    expect(part.length).toBe(1)
  })

  it('converts rooms to closed polylines on A-ANNO-TEXT', () => {
    const plan = makePlan()
    const paths = planToPlotterPaths(plan)
    const roomPaths = paths.filter((p) => p.layer === 'A-ANNO-TEXT')
    expect(roomPaths.length).toBe(2)
    // Closed polyline: first === last
    const pts = roomPaths[0].segments[0].points
    expect(pts[0]).toEqual(pts[pts.length - 1])
  })

  it('converts doors to A-DOOR paths', () => {
    const plan = makePlan()
    const paths = planToPlotterPaths(plan)
    const doors = paths.filter((p) => p.layer === 'A-DOOR')
    expect(doors.length).toBe(1)
    // Door rectangle width = 0.9m * 1000 = 900mm
    const pts = doors[0].segments[0].points
    expect(pts[1].x - pts[0].x).toBe(900)
  })

  it('converts windows to A-GLAZ paths', () => {
    const plan = makePlan()
    const paths = planToPlotterPaths(plan)
    const glaz = paths.filter((p) => p.layer === 'A-GLAZ')
    expect(glaz.length).toBe(1)
    // Window width = 1.2m * 1000 = 1200mm
    const pts = glaz[0].segments[0].points
    expect(pts[1].x - pts[0].x).toBeCloseTo(1200, 0)
  })

  it('scales coordinates from metres to millimetres', () => {
    const plan = makePlan({
      walls: [{
        id: 'w1', start: { x: 0, y: 0 }, end: { x: 5, y: 0 },
        type: 'external', thickness: 0.23,
      }],
    })
    const paths = planToPlotterPaths(plan)
    const pts = paths[0].segments[0].points
    expect(pts[0]).toEqual({ x: 0, y: 0 })
    expect(pts[1]).toEqual({ x: 5000, y: 0 })
  })

  it('skips rooms when includeRooms=false', () => {
    const plan = makePlan()
    const paths = planToPlotterPaths(plan, { includeRooms: false })
    const rooms = paths.filter((p) => p.layer === 'A-ANNO-TEXT')
    expect(rooms.length).toBe(0)
  })

  it('skips openings when includeOpenings=false', () => {
    const plan = makePlan()
    const paths = planToPlotterPaths(plan, { includeOpenings: false })
    const openings = paths.filter((p) => p.layer === 'A-DOOR' || p.layer === 'A-GLAZ')
    expect(openings.length).toBe(0)
  })

  it('returns empty array for a plan with no walls', () => {
    const plan = makePlan({ walls: [], rooms: [], openings: [] })
    const paths = planToPlotterPaths(plan)
    expect(paths.length).toBe(0)
  })

  it('skips openings with zero width', () => {
    const plan = makePlan({
      openings: [{ id: 'od', wallId: 'wall-ext-1', kind: 'door', offset: 0.5, width: 0 }],
    })
    const paths = planToPlotterPaths(plan)
    const doors = paths.filter((p) => p.layer === 'A-DOOR')
    expect(doors.length).toBe(0)
  })

  it('handles plan with no openings array', () => {
    const plan = makePlan()
    delete (plan as { openings?: unknown }).openings
    const paths = planToPlotterPaths(plan)
    expect(paths.length).toBeGreaterThan(0)
  })

  it('increments path index sequentially', () => {
    const plan = makePlan()
    const paths = planToPlotterPaths(plan)
    paths.forEach((p, i) => expect(p.index).toBe(i))
  })

  it('computes path length from point distances', () => {
    const plan = makePlan({
      walls: [{
        id: 'w1', start: { x: 0, y: 0 }, end: { x: 3, y: 4 },
        type: 'external', thickness: 0.23,
      }],
    })
    const paths = planToPlotterPaths(plan)
    // 3m→3000, 4m→4000 → distance 5000
    expect(paths[0].length).toBe(5000)
  })
})

describe('totalPathLength', () => {
  it('sums all path lengths', () => {
    const plan = makePlan()
    const paths = planToPlotterPaths(plan)
    const total = totalPathLength(paths)
    expect(total).toBeGreaterThan(0)
  })

  it('returns 0 for empty paths', () => {
    expect(totalPathLength([])).toBe(0)
  })
})

describe('pathLayerSummary', () => {
  it('counts paths per layer', () => {
    const plan = makePlan()
    const paths = planToPlotterPaths(plan)
    const summary = pathLayerSummary(paths)
    expect(summary['A-WALL-FULL']).toBe(1)
    expect(summary['A-WALL-PART']).toBe(1)
    expect(summary['A-ANNO-TEXT']).toBe(2)
    expect(summary['A-DOOR']).toBe(1)
    expect(summary['A-GLAZ']).toBe(1)
  })

  it('returns empty object for no paths', () => {
    expect(pathLayerSummary([])).toEqual({})
  })
})

describe('pathsBoundingBox', () => {
  it('returns correct bounding box for walls', () => {
    const plan = makePlan({
      rooms: [],
      openings: [],
      walls: [{
        id: 'w1', start: { x: 2, y: 3 }, end: { x: 8, y: 7 },
        type: 'external', thickness: 0.23,
      }],
    })
    const paths = planToPlotterPaths(plan)
    const bb = pathsBoundingBox(paths)
    expect(bb.minX).toBe(2000)
    expect(bb.minY).toBe(3000)
    expect(bb.maxX).toBe(8000)
    expect(bb.maxY).toBe(7000)
    expect(bb.width).toBe(6000)
    expect(bb.height).toBe(4000)
  })

  it('returns zeroed box for empty paths', () => {
    const bb = pathsBoundingBox([])
    expect(bb.width).toBe(0)
    expect(bb.height).toBe(0)
  })
})
