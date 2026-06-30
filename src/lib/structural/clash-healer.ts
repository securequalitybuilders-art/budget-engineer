// Source: WS5 (store/appStore.ts — autoHealClashes)
// Purpose: Repair spatial clashes by adjusting opening positions and moving overlapping blocks
// Status: Staged for future integration — not wired into any store or UI
// How to wire: Call with walls/openings/blocks arrays, returns modified arrays

import type { CadWall, CadOpening, CadBlockInstance } from '../../domain/cad';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function wallLen(w: { start: { x: number; y: number }; end: { x: number; y: number } }): number {
  return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) || 1;
}

/**
 * Heal clash issues in a CAD document.
 * - Rule 1: Openings too close to wall corners (< 30cm) are shifted toward center.
 * - Rule 2: Blocks overlapping walls are moved 1m away.
 *
 * @returns A new set of openings and blocks arrays with clashes resolved, or null if no changes.
 */
export function autoHealClashes(
  walls: CadWall[],
  openings: CadOpening[],
  blocks: CadBlockInstance[]
): { openings: CadOpening[]; blocks: CadBlockInstance[] } | null {
  let changed = false;

  const healedOpenings = openings.map(o => {
    const w = walls.find(w => w.id === o.wallId);
    if (!w) return o;
    const len = wallLen(w);
    const absOffset = o.offsetRatio * len;
    const margin = 0.3;

    if (absOffset < margin) {
      changed = true;
      return { ...o, offsetRatio: round2(margin / len) };
    }
    if (absOffset + o.width > len - margin) {
      changed = true;
      return { ...o, offsetRatio: round2((len - o.width - margin) / len) };
    }
    return o;
  });

  const healedBlocks = blocks.map(b => {
    const touching = walls.some(w => {
      const mid = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
      return Math.hypot(b.position.x - mid.x, b.position.y - mid.y) < 0.5;
    });
    if (touching) {
      changed = true;
      return {
        ...b,
        position: { x: round2(b.position.x + 1.0), y: round2(b.position.y + 1.0) }
      };
    }
    return b;
  });

  if (!changed) return null;

  return { openings: healedOpenings, blocks: healedBlocks };
}
