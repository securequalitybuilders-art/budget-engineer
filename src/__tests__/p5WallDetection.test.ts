import { describe, it, expect } from 'vitest';
import {
  mergeOverlappingSegments,
  mergeCollinearSegments,
  snapToAxis,
  segmentsToPlan,
  computeConfidence,
} from '@/lib/import/wallDetection';
import type { DetectedSegment } from '@/lib/import/wallDetection';

describe('mergeOverlappingSegments', () => {
  it('merges two overlapping collinear segments', () => {
    const segs: DetectedSegment[] = [
      { x1: 0, y1: 0, x2: 50, y2: 0 },
      { x1: 20, y1: 0, x2: 70, y2: 0 },
    ];
    const r = mergeOverlappingSegments(segs);
    expect(r.length).toBe(1);
    expect(r[0].x1).toBe(0);
    expect(r[0].x2).toBe(70);
  });

  it('does not merge non-overlapping parallel segments', () => {
    const segs: DetectedSegment[] = [
      { x1: 0, y1: 0, x2: 50, y2: 0 },
      { x1: 60, y1: 0, x2: 100, y2: 0 },
    ];
    const r = mergeOverlappingSegments(segs, 0.6);
    expect(r.length).toBe(2);
  });

  it('does not merge perpendicular segments', () => {
    const segs: DetectedSegment[] = [
      { x1: 0, y1: 0, x2: 50, y2: 0 },
      { x1: 25, y1: 0, x2: 25, y2: 50 },
    ];
    const r = mergeOverlappingSegments(segs);
    expect(r.length).toBe(2);
  });

  it('handles empty array', () => {
    expect(mergeOverlappingSegments([])).toEqual([]);
  });

  it('handles single segment', () => {
    const segs: DetectedSegment[] = [{ x1: 0, y1: 0, x2: 100, y2: 0 }];
    const r = mergeOverlappingSegments(segs);
    expect(r.length).toBe(1);
  });

  it('merges vertical overlapping segments with sufficient overlap', () => {
    const segs: DetectedSegment[] = [
      { x1: 10, y1: 0, x2: 10, y2: 50 },
      { x1: 10, y1: 10, x2: 10, y2: 60 },
    ];
    const r = mergeOverlappingSegments(segs);
    expect(r.length).toBe(1);
    expect(r[0].y1).toBe(0);
    expect(r[0].y2).toBe(60);
  });

  it('preserves confidence from highest segment', () => {
    const segs: DetectedSegment[] = [
      { x1: 0, y1: 0, x2: 50, y2: 0, importConfidence: 0.5 },
      { x1: 20, y1: 0, x2: 70, y2: 0, importConfidence: 0.9 },
    ];
    const r = mergeOverlappingSegments(segs);
    expect(r[0].importConfidence).toBe(0.9);
  });
});

describe('segmentsToPlan edge cases', () => {
  it('identifies boundary walls as external, interior walls as internal', () => {
    const walls: DetectedSegment[] = [
      { x1: 0, y1: 1, x2: 10, y2: 1 },
      { x1: 0, y1: 9, x2: 10, y2: 9 },
      { x1: 10, y1: 1, x2: 10, y2: 9 },
      { x1: 3, y1: 2, x2: 3, y2: 8 },
    ];
    const plan = segmentsToPlan(walls, 20);
    expect(plan).not.toBeNull();
    const external = plan!.walls.filter(w => w.type === 'external');
    const internal = plan!.walls.filter(w => w.type === 'internal');
    expect(external.length).toBe(3);
    expect(internal.length).toBe(1);
  });

  it('accepts custom wall thickness', () => {
    const walls: DetectedSegment[] = [{ x1: 0, y1: 0, x2: 10, y2: 0 }];
    const plan = segmentsToPlan(walls, 20, { wallThickness: 0.3 });
    expect(plan!.wallThickness).toBe(0.3);
  });
});

describe('mergeCollinearSegments edge cases', () => {
  it('merges three collinear segments', () => {
    const segs: DetectedSegment[] = [
      { x1: 0, y1: 5, x2: 30, y2: 5 },
      { x1: 25, y1: 5, x2: 60, y2: 5 },
      { x1: 55, y1: 5, x2: 90, y2: 5 },
    ];
    const r = mergeCollinearSegments(segs, 5, 5);
    expect(r.length).toBe(1);
    expect(r[0].x1).toBeCloseTo(0);
    expect(r[0].x2).toBeCloseTo(90);
  });

  it('handles segments with gap within tolerance', () => {
    const segs: DetectedSegment[] = [
      { x1: 0, y1: 5, x2: 40, y2: 5 },
      { x1: 43, y1: 5, x2: 80, y2: 5 },
    ];
    const r = mergeCollinearSegments(segs, 5, 5);
    expect(r.length).toBe(1);
  });

  it('does not merge segments with gap beyond tolerance', () => {
    const segs: DetectedSegment[] = [
      { x1: 0, y1: 5, x2: 40, y2: 5 },
      { x1: 60, y1: 5, x2: 100, y2: 5 },
    ];
    const r = mergeCollinearSegments(segs, 5, 5);
    expect(r.length).toBe(2);
  });
});

describe('snapToAxis edge cases', () => {
  it('handles perfectly horizontal segment', () => {
    const r = snapToAxis({ x1: 0, y1: 10, x2: 100, y2: 10 }, 8);
    expect(r.y1).toBe(10);
    expect(r.y2).toBe(10);
  });

  it('handles perfectly vertical segment', () => {
    const r = snapToAxis({ x1: 50, y1: 0, x2: 50, y2: 100 }, 8);
    expect(r.x1).toBe(50);
    expect(r.x2).toBe(50);
  });

  it('handles reverse orientation (x2 < x1)', () => {
    const r = snapToAxis({ x1: 100, y1: 10, x2: 0, y2: 10.3 }, 8);
    expect(r.x1).toBe(0);
    expect(r.x2).toBe(100);
  });
});

describe('computeConfidence edge cases', () => {
  it('returns low for zero lines', () => {
    expect(computeConfidence(0, 100, 100)).toBe('low');
  });

  it('returns high for very large image with many lines', () => {
    expect(computeConfidence(50000, 1000, 1000)).toBe('high');
  });
});
