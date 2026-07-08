// ============================================================================
// Stage 61 — Design fingerprint
// A stable, cheap content hash of the geometry + cost so the app can detect
// whether the design has changed since the last issued revision.
// ============================================================================

import { CadDocument, BOQ } from '../domain/types';

/** djb2 string hash → short hex. Deterministic, no deps. */
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  // unsigned 32-bit hex
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Fingerprint the parts of the design a revision should track: wall geometry,
 * openings, blocks, floors, material system, and the BOQ grand total.
 */
export function designFingerprint(cad: CadDocument, boq: BOQ | null): string {
  const walls = cad.walls
    .map((w) => `${w.id}:${w.start.x},${w.start.y}->${w.end.x},${w.end.y}|${w.thickness}|${w.height}|${w.metadata.material ?? ''}|${w.structural ? 1 : 0}`)
    .sort()
    .join(';');
  const openings = cad.openings
    .map((o) => `${o.id}:${o.wallId}|${o.kind}|${o.offset}|${o.width}`)
    .sort()
    .join(';');
  const blocks = cad.blocks
    .map((b) => `${b.id}:${b.kind}|${b.position.x},${b.position.y}|${b.width}x${b.depth}`)
    .sort()
    .join(';');
  const floors = cad.floors.map((f) => `${f.id}:${f.elevation}/${f.height}`).join(';');
  const cost = boq ? boq.summary.grandTotal.toFixed(2) + boq.currency : '';
  return hashStr([cad.materialSystem, floors, walls, openings, blocks, cost].join('#'));
}
