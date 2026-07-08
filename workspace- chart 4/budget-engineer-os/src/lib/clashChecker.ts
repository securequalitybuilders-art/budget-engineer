import { CadDocument } from '../domain/cad';

export interface BimClashItem {
  id: string;
  severity: 'High (Structural)' | 'Moderate (Spatial)' | 'Warning';
  elementA: string;
  elementB: string;
  description: string;
  location: string;
  actionCode: string;
}

export interface ClashReportSummary {
  clashes: BimClashItem[];
  highSeverityCount: number;
  moderateSeverityCount: number;
  statusRating: 'Coordination Clash-Free Standard' | 'Moderate Interference' | 'Critical Structural Clash';
}

export function detectBimClashes(cad: CadDocument): ClashReportSummary {
  const clashes: BimClashItem[] = [];

  for (const f of cad.floors) {
    const fWalls = cad.walls.filter(w => w.floorId === f.id);
    const fOps = cad.openings.filter(o => o.floorId === f.id);
    const fBlocks = cad.blocks.filter(b => b.floorId === f.id);

    // Rule 1: Opening near structural wall corner (< 20 cm)
    for (const o of fOps) {
      const w = fWalls.find(wa => wa.id === o.wallId);
      if (!w || !w.structural) continue;
      const len = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) || 1;
      const dStart = o.offset;
      const dEnd = len - o.offset;
      if (dStart < 0.20 || dEnd < 0.20) {
        clashes.push({
          id: `clash-strc-${o.id}`,
          severity: 'High (Structural)',
          elementA: `${o.name} (${o.id})`,
          elementB: `${w.name} Corner (${w.id})`,
          description: `Opening rough opening collides with structural rebar zone at wall node (< 20cm).`,
          location: `${f.name} @ ${o.offset.toFixed(2)}m`,
          actionCode: 'SHIFT_OPENING_SPAN'
        });
      }
    }

    // Rule 2: Openings collision on same wall
    for (let i = 0; i < fOps.length; i++) {
      for (let j = i + 1; j < fOps.length; j++) {
        const o1 = fOps[i];
        const o2 = fOps[j];
        if (o1.wallId !== o2.wallId) continue;
        const dist = Math.abs(o1.offset - o2.offset);
        const minClear = (o1.width + o2.width) / 2;
        if (dist < minClear) {
          clashes.push({
            id: `clash-open-${o1.id}-${o2.id}`,
            severity: 'High (Structural)',
            elementA: `${o1.name}`,
            elementB: `${o2.name}`,
            description: `Openings rough openings overlap and collide on host wall.`,
            location: `${f.name} Wall ${o1.wallId}`,
            actionCode: 'SEPARATE_OPENINGS'
          });
        }
      }
    }

    // Rule 3: Object AABB overlaps wall strip
    for (const b of fBlocks) {
      if (b.kind === 'column') continue;
      const bx1 = b.position.x, bx2 = b.position.x + b.width;
      const by1 = b.position.y, by2 = b.position.y + b.depth;

      for (const w of fWalls) {
        const wx1 = Math.min(w.start.x, w.end.x) - w.thickness/2;
        const wx2 = Math.max(w.start.x, w.end.x) + w.thickness/2;
        const wy1 = Math.min(w.start.y, w.end.y) - w.thickness/2;
        const wy2 = Math.max(w.start.y, w.end.y) + w.thickness/2;

        if (bx1 < wx2 && bx2 > wx1 && by1 < wy2 && by2 > wy1) {
          clashes.push({
            id: `clash-spat-${b.id}-${w.id}`,
            severity: 'Moderate (Spatial)',
            elementA: `${b.name} (${b.id})`,
            elementB: `${w.name} (${w.id})`,
            description: `Object bounding envelope collides with partition wall construction strip.`,
            location: `${f.name} (${b.position.x}, ${b.position.y})`,
            actionCode: 'RELOCATE_OBJECT'
          });
        }
      }
    }
  }

  const highCount = clashes.filter(c => c.severity.includes('High')).length;
  const modCount = clashes.filter(c => c.severity.includes('Moderate')).length;
  let status: ClashReportSummary['statusRating'] = 'Coordination Clash-Free Standard';
  if (highCount > 0) status = 'Critical Structural Clash';
  else if (modCount > 0) status = 'Moderate Interference';

  return {
    clashes,
    highSeverityCount: highCount,
    moderateSeverityCount: modCount,
    statusRating: status
  };
}
