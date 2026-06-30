// Source: WS5 (store/appStore.ts — generateStructuralColumns, generateStructuralBeams, generateFoundationFootings)
// Purpose: Pure algorithms for auto-placing structural columns, beams, and footings
// Status: Staged for future integration — not wired into any store or UI
// How to wire: Call with wall/block arrays, map returned positions to canonical CadBlockInstance objects

import type { SimpleWall, ColumnPlacement, BeamConnection, FootingPlacement, StructuralMaterial } from './structural-types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pointKey(x: number, y: number): string {
  return `${round2(x)},${round2(y)}`;
}

/**
 * Compute column positions from structural wall endpoints.
 * Returns deduplicated node points where columns should be placed.
 */
export function computeColumnPositions(
  walls: SimpleWall[],
  existingPositions: { x: number; y: number }[] = [],
  material: StructuralMaterial = 'concrete',
  tol = 0.1
): ColumnPlacement[] {
  const nodes: { x: number; y: number }[] = [];
  for (const w of walls) {
    if (!w.structural) continue;
    for (const p of [w.start, w.end]) {
      if (!nodes.some(n => Math.hypot(n.x - p.x, n.y - p.y) < tol)) {
        nodes.push(p);
      }
    }
  }
  const existing = new Set(existingPositions.map(p => pointKey(p.x, p.y)));
  const placements: ColumnPlacement[] = [];
  for (const n of nodes) {
    if (!existing.has(pointKey(n.x, n.y))) {
      placements.push({ position: { x: round2(n.x), y: round2(n.y) }, material });
    }
  }
  return placements;
}

/**
 * Compute beam connections between columns that are not already on a wall alignment.
 * Returns start/end pairs for beam placement.
 */
export function computeBeamConnections(
  columns: { position: { x: number; y: number } }[],
  walls: SimpleWall[],
  material: StructuralMaterial = 'concrete'
): BeamConnection[] {
  const connections: BeamConnection[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const a = columns[i].position;
      const b = columns[j].position;

      const onWall = walls.some(w => {
        const t1 = (a.x - w.start.x) * (w.end.x - w.start.x) + (a.y - w.start.y) * (w.end.y - w.start.y);
        const t2 = (b.x - w.start.x) * (w.end.x - w.start.x) + (b.y - w.start.y) * (w.end.y - w.start.y);
        const len2 = (w.end.x - w.start.x) ** 2 + (w.end.y - w.start.y) ** 2;
        if (len2 < 1e-6) return false;
        const u1 = t1 / len2;
        const u2 = t2 / len2;
        return u1 >= -0.01 && u1 <= 1.01 && u2 >= -0.01 && u2 <= 1.01;
      });

      if (!onWall) {
        const key = `${pointKey(a.x, a.y)}->${pointKey(b.x, b.y)}`;
        if (!seen.has(key)) {
          seen.add(key);
          connections.push({
            start: { x: round2(a.x), y: round2(a.y) },
            end: { x: round2(b.x), y: round2(b.y) },
            material
          });
        }
      }
    }
  }

  return connections;
}

/**
 * Compute footing placements under columns.
 */
export function computeFootingPlacements(
  columns: { position: { x: number; y: number } }[],
  existingFootingPositions: { x: number; y: number }[] = [],
  material: StructuralMaterial = 'concrete'
): FootingPlacement[] {
  const existing = new Set(existingFootingPositions.map(p => pointKey(p.x, p.y)));
  const placements: FootingPlacement[] = [];

  for (const col of columns) {
    const key = pointKey(col.position.x, col.position.y);
    if (!existing.has(key)) {
      placements.push({
        position: { x: round2(col.position.x), y: round2(col.position.y) },
        width: 1.0,
        depth: 0.4,
        material
      });
    }
  }

  return placements;
}
