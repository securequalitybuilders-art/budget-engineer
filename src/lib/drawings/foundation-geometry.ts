/**
 * Foundation Geometry Helper
 *
 * Provides merged closed-polygon footing geometry for strip and pad footings,
 * with proper intersection/junction handling at wall corners and T-junctions.
 *
 * P13.2 — Foundation Geometry Refinement
 */
import type { Vec2, CadWall } from '@/domain/ws6-types';
import { SCALE } from './disciplines/svg-shared';

export interface FootingJunction {
  point: Vec2;
  connectedWalls: string[];
}

export interface FootingPolygon {
  points: string; // SVG points attribute
  wallIds: string[];
  kind: 'strip' | 'pad' | 'strip-pad';
}

/**
 * Computes the 4-corner polygon for a single strip footing segment.
 * Unlike renderWallAsPolygon in svg-shared, this returns the full geometry
 * as a Vec2[] for intersection processing.
 */
export function stripFootingPolygon(
  start: Vec2,
  end: Vec2,
  wallThickness: number,
  footingOverhang: number,
): Vec2[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return [];
  const perpX = -dy / len;
  const perpY = dx / len;
  const halfT = (wallThickness * SCALE) / 2 + footingOverhang * SCALE;

  const sx = start.x * SCALE;
  const sy = start.y * SCALE;
  const ex = end.x * SCALE;
  const ey = end.y * SCALE;

  return [
    { x: sx + perpX * halfT, y: sy + perpY * halfT },
    { x: ex + perpX * halfT, y: ey + perpY * halfT },
    { x: ex - perpX * halfT, y: ey - perpY * halfT },
    { x: sx - perpX * halfT, y: sy - perpY * halfT },
  ];
}

/**
 * Detect wall junctions (intersections between walls).
 * Returns a set of junction points where two or more walls meet.
 */
export function detectJunctions(walls: CadWall[]): FootingJunction[] {
  const junctions: Map<string, FootingJunction> = new Map();
  const eps = 0.05;

  for (const w of walls) {
    const ends = [w.start, w.end];
    for (const end of ends) {
      const key = `${end.x.toFixed(3)},${end.y.toFixed(3)}`;
      const existing = junctions.get(key);
      if (existing) {
        if (!existing.connectedWalls.includes(w.id)) {
          existing.connectedWalls.push(w.id);
        }
      } else {
        junctions.set(key, {
          point: end,
          connectedWalls: [w.id],
        });
      }
    }
  }

  // Also detect T-junctions where a wall endpoint lies on another wall
  for (const w of walls) {
    for (const other of walls) {
      if (w.id === other.id) continue;
      const wLen = Math.hypot(other.end.x - other.start.x, other.end.y - other.start.y);
      if (wLen < 0.01) continue;
      for (const pt of [w.start, w.end]) {
        const t = ((pt.x - other.start.x) * (other.end.x - other.start.x) +
                    (pt.y - other.start.y) * (other.end.y - other.start.y)) / (wLen * wLen);
        if (t < eps || t > 1 - eps) continue; // Endpoint already caught
        const projX = other.start.x + t * (other.end.x - other.start.x);
        const projY = other.start.y + t * (other.end.y - other.start.y);
        if (Math.abs(pt.x - projX) < eps && Math.abs(pt.y - projY) < eps) {
          const key = `${pt.x.toFixed(3)},${pt.y.toFixed(3)}`;
          if (!junctions.has(key)) {
            junctions.set(key, {
              point: pt,
              connectedWalls: [w.id, other.id],
            });
          }
        }
      }
    }
  }

  return Array.from(junctions.values());
}

/**
 * Build merged SVG polygon points for all strip footings under structural walls,
 * extended at junctions to create clean overlapping geometry.
 * Returns SVG-ready polygon point strings.
 */
export function buildMergedFootingPolygons(
  structuralWalls: CadWall[],
  footingOverhang = 0.25,
): FootingPolygon[] {
  if (structuralWalls.length === 0) return [];

  const junctions = detectJunctions(structuralWalls);
  const polygons: FootingPolygon[] = [];

  for (const w of structuralWalls) {
    const wp = stripFootingPolygon(w.start, w.end, w.thickness, footingOverhang);
    if (wp.length !== 4) continue;

    // Extend polygon at junctions to create merged appearance
    const wallEps = footingOverhang * SCALE * 1.5;
    const startJunc = junctions.find(j =>
      Math.hypot(j.point.x - w.start.x, j.point.y - w.start.y) < 0.1 &&
      j.connectedWalls.length > 1,
    );
    const endJunc = junctions.find(j =>
      Math.hypot(j.point.x - w.end.x, j.point.y - w.end.y) < 0.1 &&
      j.connectedWalls.length > 1,
    );

    // Extend polygon past junctions by the overhang amount to merge cleanly
    if (startJunc) {
      const dx = w.end.x - w.start.x;
      const dy = w.end.y - w.start.y;
      const len = Math.hypot(dx, dy) || 1;
      wp[0] = { x: wp[0].x - (dx / len) * wallEps, y: wp[0].y - (dy / len) * wallEps };
      wp[3] = { x: wp[3].x - (dx / len) * wallEps, y: wp[3].y - (dy / len) * wallEps };
    }
    if (endJunc) {
      const dx = w.end.x - w.start.x;
      const dy = w.end.y - w.start.y;
      const len = Math.hypot(dx, dy) || 1;
      wp[1] = { x: wp[1].x + (dx / len) * wallEps, y: wp[1].y + (dy / len) * wallEps };
      wp[2] = { x: wp[2].x + (dx / len) * wallEps, y: wp[2].y + (dy / len) * wallEps };
    }

    const ptsStr = wp.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    polygons.push({
      points: ptsStr,
      wallIds: [w.id],
      kind: 'strip',
    });
  }

  return polygons;
}

/**
 * Compute SVG points for a pad footing, with optional integration to adjacent strip footings.
 */
export function padFootingPolygon(
  cx: number,
  cy: number,
  padWidth: number,
  padDepth: number,
): Vec2[] {
  const halfW = (padWidth * SCALE) / 2;
  const halfD = (padDepth * SCALE) / 2;
  return [
    { x: cx - halfW, y: cy - halfD },
    { x: cx + halfW, y: cy - halfD },
    { x: cx + halfW, y: cy + halfD },
    { x: cx - halfW, y: cy + halfD },
  ];
}

/**
 * Render a single foundation polygon with fill, hatch, and stroke.
 */
export function renderFootingPolygon(
  pts: string,
  fill: string,
  hatchId: string,
  strokeColor: string,
  strokeWidth: number,
  opacity = 0.6,
): string {
  return [
    `<polygon points="${pts}" fill="${fill}" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${opacity}" stroke-linejoin="round"/>`,
    `<polygon points="${pts}" fill="url(#${hatchId})" opacity="0.3"/>`,
  ].join('');
}
