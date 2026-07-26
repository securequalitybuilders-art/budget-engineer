import type { CadPoint, CadWall } from '../../domain/cad';

export interface IntersectionResult {
  point: CadPoint;
  parallel: boolean;
}

export function computeLineIntersection(
  p1: CadPoint, p2: CadPoint,
  p3: CadPoint, p4: CadPoint
): IntersectionResult {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < 1e-6) {
    return { point: { x: 0, y: 0 }, parallel: true };
  }
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  const x = parseFloat((p1.x + t * (p2.x - p1.x)).toFixed(4));
  const y = parseFloat((p1.y + t * (p2.y - p1.y)).toFixed(4));
  return { point: { x, y }, parallel: false };
}

export function solveWallCorner(wallA: CadWall, wallB: CadWall): { nextA: CadWall; nextB: CadWall; point: CadPoint } | null {
  const res = computeLineIntersection(wallA.start, wallA.end, wallB.start, wallB.end);
  if (res.parallel) return null;

  const pt = res.point;
  const dStartA = Math.hypot(wallA.start.x - pt.x, wallA.start.y - pt.y);
  const dEndA = Math.hypot(wallA.end.x - pt.x, wallA.end.y - pt.y);
  const nextA = {
    ...wallA,
    start: dStartA < dEndA ? pt : wallA.start,
    end: dStartA < dEndA ? wallA.end : pt
  };

  const dStartB = Math.hypot(wallB.start.x - pt.x, wallB.start.y - pt.y);
  const dEndB = Math.hypot(wallB.end.x - pt.x, wallB.end.y - pt.y);
  const nextB = {
    ...wallB,
    start: dStartB < dEndB ? pt : wallB.start,
    end: dStartB < dEndB ? wallB.end : pt
  };

  return { nextA, nextB, point: pt };
}
