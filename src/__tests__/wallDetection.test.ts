import { describe, it, expect } from 'vitest'
import {
  mergeCollinearSegments,
  snapToAxis,
  pixelsToMetresSegment,
  segmentsToPlan,
  computeConfidence,
} from '@/lib/import/wallDetection'
import type { DetectedSegment } from '@/lib/import/wallDetection'

describe('mergeCollinearSegments', () => {
  it('merges two overlapping colinear horizontal segments into one', () => {
    const segments: DetectedSegment[] = [
      { x1: 0, y1: 10, x2: 50, y2: 10 },
      { x1: 30, y1: 10, x2: 80, y2: 10 },
    ]
    const result = mergeCollinearSegments(segments, 5, 5)
    expect(result).toHaveLength(1)
    const s = result[0]
    expect(s.x1).toBeCloseTo(0)
    expect(s.x2).toBeCloseTo(80)
    expect(s.y1).toBeCloseTo(10)
    expect(s.y2).toBeCloseTo(10)
  })

  it('merges two overlapping colinear vertical segments into one', () => {
    const segments: DetectedSegment[] = [
      { x1: 20, y1: 0, x2: 20, y2: 40 },
      { x1: 20, y1: 30, x2: 20, y2: 70 },
    ]
    const result = mergeCollinearSegments(segments, 5, 5)
    expect(result).toHaveLength(1)
    expect(result[0].y1).toBeCloseTo(0)
    expect(result[0].y2).toBeCloseTo(70)
    expect(result[0].x1).toBeCloseTo(20)
  })

  it('leaves separate non-colinear segments distinct', () => {
    const segments: DetectedSegment[] = [
      { x1: 0, y1: 0, x2: 50, y2: 0 },
      { x1: 0, y1: 10, x2: 50, y2: 10 },
    ]
    const result = mergeCollinearSegments(segments, 5, 5)
    expect(result).toHaveLength(2)
  })

  it('handles empty array', () => {
    expect(mergeCollinearSegments([])).toEqual([])
  })

  it('does not merge perpendicular segments', () => {
    const segments: DetectedSegment[] = [
      { x1: 0, y1: 0, x2: 50, y2: 0 },
      { x1: 25, y1: 0, x2: 25, y2: 50 },
    ]
    const result = mergeCollinearSegments(segments, 5, 5)
    expect(result).toHaveLength(2)
  })
})

describe('snapToAxis', () => {
  it('snaps a near-horizontal segment to horizontal', () => {
    const seg: DetectedSegment = { x1: 10, y1: 20, x2: 100, y2: 20.5 }
    const result = snapToAxis(seg, 8)
    expect(result.y1).toBeCloseTo(20.25)
    expect(result.y2).toBeCloseTo(20.25)
    expect(result.x1).toBeLessThan(result.x2)
  })

  it('snaps a near-vertical segment to vertical', () => {
    const seg: DetectedSegment = { x1: 50, y1: 10, x2: 50.3, y2: 100 }
    const result = snapToAxis(seg, 8)
    expect(result.x1).toBeCloseTo(50.15)
    expect(result.x2).toBeCloseTo(50.15)
    expect(result.y1).toBeLessThan(result.y2)
  })

  it('leaves a 30-degree diagonal unchanged', () => {
    const seg: DetectedSegment = { x1: 0, y1: 0, x2: 86.6, y2: 50 }
    const result = snapToAxis(seg, 8)
    expect(result.x1).toBeCloseTo(seg.x1)
    expect(result.y1).toBeCloseTo(seg.y1)
    expect(result.x2).toBeCloseTo(seg.x2)
    expect(result.y2).toBeCloseTo(seg.y2)
  })
})

describe('pixelsToMetresSegment', () => {
  it('converts using pxPerMetre', () => {
    const seg: DetectedSegment = { x1: 0, y1: 0, x2: 100, y2: 50 }
    const result = pixelsToMetresSegment(seg, 20)
    expect(result.x2).toBeCloseTo(5)
    expect(result.y2).toBeCloseTo(2.5)
  })

  it('throws when pxPerMetre is zero', () => {
    expect(() => pixelsToMetresSegment({ x1: 0, y1: 0, x2: 10, y2: 10 }, 0)).toThrow()
  })

  it('throws when pxPerMetre is negative', () => {
    expect(() => pixelsToMetresSegment({ x1: 0, y1: 0, x2: 10, y2: 10 }, -1)).toThrow()
  })
})

describe('segmentsToPlan', () => {
  it('builds a PlanModel with walls and a bounding room', () => {
    const walls: DetectedSegment[] = [
      { x1: 0, y1: 0, x2: 10, y2: 0 },
      { x1: 10, y1: 0, x2: 10, y2: 8 },
      { x1: 10, y1: 8, x2: 0, y2: 8 },
      { x1: 0, y1: 8, x2: 0, y2: 0 },
    ]
    const plan = segmentsToPlan(walls, 20)
    expect(plan).not.toBeNull()
    expect(plan!.walls.length).toBe(4)
    expect(plan!.walls.every((w) => w.thickness === 0.23)).toBe(true)
    expect(plan!.rooms.length).toBeGreaterThanOrEqual(1)
    expect(plan!.width).toBeGreaterThan(0)
    expect(plan!.height).toBeGreaterThan(0)
  })

  it('returns null for empty input', () => {
    expect(segmentsToPlan([], 20)).toBeNull()
  })

  it('does not throw for any input', () => {
    expect(() => segmentsToPlan([], 20)).not.toThrow()
    expect(() => segmentsToPlan([{ x1: 0, y1: 0, x2: 0, y2: 0 }], 20)).not.toThrow()
  })
})

describe('computeConfidence', () => {
  it('returns high for dense lines', () => {
    expect(computeConfidence(1000, 100, 100)).toBe('high')
  })

  it('returns medium for moderate lines', () => {
    expect(computeConfidence(10, 100, 100)).toBe('medium')
  })

  it('returns low for sparse lines', () => {
    expect(computeConfidence(1, 100, 100)).toBe('low')
  })
})
