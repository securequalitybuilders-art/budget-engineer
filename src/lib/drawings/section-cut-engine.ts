import type { CadDocument, Vec2, SectionCutPlane, FloorBuildUp, SectionConfig, RoofType, RoofBuildUp } from '@/domain/ws6-types';

const PLANE_THRESHOLD = 0.6;

const planeOf = (axis: 'AA' | 'BB') => (p: Vec2) => axis === 'AA' ? p.y : p.x;

export function resolveSectionCutPlane(cad: CadDocument, config?: SectionConfig): SectionCutPlane {
  if (config?.autoSelectBest) {
    const candidates = candidateSectionCuts(cad, config.axis);
    if (candidates.length === 0) {
      return fallbackCut(cad, config.axis);
    }
    const scored = scoreCandidates(cad, candidates);
    scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return buildCutPlane(cad, config.axis, scored[0].position);
  }

  const axis = config?.axis ?? 'AA';
  const planeF = planeOf(axis);
  const allPts = cad.walls.flatMap(w => [w.start, w.end]);
  const planes = allPts.map(planeF);
  const minPlane = Math.min(...planes, 0);
  const maxPlane = Math.max(...planes, 1);
  const cutPos = config?.position ?? (minPlane + maxPlane) / 2;
  return buildCutPlane(cad, axis, cutPos);
}

export function candidateSectionCuts(cad: CadDocument, axis: 'AA' | 'BB'): { position: number; source: string }[] {
  const planeF = planeOf(axis);
  const candidates: { position: number; source: string }[] = [];

  const positions = new Set<number>();

  for (const w of cad.walls) {
    const p = (planeF(w.start) + planeF(w.end)) / 2;
    const key = Math.round(p * 10);
    if (!positions.has(key)) {
      positions.add(key);
      candidates.push({ position: p, source: `wall-${w.id}` });
    }
  }

  for (const b of cad.blocks) {
    if (b.kind === 'stair' || b.kind === 'core') {
      const p = (planeF(b.position) + (b.end ? planeF(b.end) : planeF(b.position))) / 2;
      const key = Math.round(p * 10);
      if (!positions.has(key)) {
        positions.add(key);
        candidates.push({ position: p, source: `block-${b.kind}` });
      }
    }
  }

  // Add openings (doors/windows) as candidates — sections cutting through openings
  // produce more meaningful architectural sections
  for (const o of cad.openings) {
    const host = cad.walls.find(w => w.id === o.wallId);
    if (host) {
      const p = (planeF(host.start) + planeF(host.end)) / 2;
      const key = Math.round(p * 10);
      if (!positions.has(key)) {
        positions.add(key);
        candidates.push({ position: p, source: `opening-${o.kind}` });
      }
    }
  }

  const allPts = cad.walls.flatMap(w => [w.start, w.end]);
  const planes = allPts.map(planeF);
  const mid = (Math.min(...planes, 0) + Math.max(...planes, 1)) / 2;
  const midKey = Math.round(mid * 10);
  if (!positions.has(midKey)) {
    candidates.push({ position: mid, source: 'midpoint' });
  }

  return candidates;
}

export function scoreCandidates(cad: CadDocument, candidates: { position: number; source: string }[]): { position: number; source: string; score: number }[] {
  const planeF = planeOf('AA');

  const entranceWallIds = new Set(cad.openings.filter(o =>
    o.kind === 'door' && (o.name?.toLowerCase().includes('front') || o.name?.toLowerCase().includes('main') || o.name?.toLowerCase().includes('entrance'))
  ).map(o => o.wallId));

  return candidates.map(c => {
    let score = 0;

    const wallsAtCut = cad.walls.filter(w => {
      const wp = (planeF(w.start) + planeF(w.end)) / 2;
      return Math.abs(wp - c.position) < PLANE_THRESHOLD;
    });
    score += Math.min(wallsAtCut.length, 6) * 3;
    score += wallsAtCut.filter(w => w.structural).length * 2;

    if (cad.roomProgramme) {
      const intersected = new Set<string>();
      const allPlanes = cad.walls.flatMap(w => [planeF(w.start), planeF(w.end)]);
      const minP = Math.min(...allPlanes, 0);
      const maxP = Math.max(...allPlanes, 1);
      const roomIds = Object.keys(cad.roomProgramme);
      const step = roomIds.length > 1 ? (maxP - minP) / (roomIds.length + 1) : 0;
      roomIds.forEach((id, i) => {
        const rc = minP + step * (i + 1);
        if (Math.abs(rc - c.position) < PLANE_THRESHOLD * 1.5) {
          intersected.add(cad.roomProgramme![id]);
        }
      });
      score += intersected.size * 4;
      score += intersected.size * 2;
    }

    const stairsNear = cad.blocks.filter(b => {
      if (b.kind !== 'stair') return false;
      const bp = (planeF(b.position) + (b.end ? planeF(b.end) : planeF(b.position))) / 2;
      return Math.abs(bp - c.position) < PLANE_THRESHOLD;
    });
    score += stairsNear.length * 5;

    const coresNear = cad.blocks.filter(b => {
      if (b.kind !== 'core') return false;
      const bp = (planeF(b.position) + (b.end ? planeF(b.end) : planeF(b.position))) / 2;
      return Math.abs(bp - c.position) < PLANE_THRESHOLD;
    });
    score += coresNear.length * 4;

    for (const wId of entranceWallIds) {
      const w = cad.walls.find(wl => wl.id === wId);
      if (w) {
        const wp = (planeF(w.start) + planeF(w.end)) / 2;
        if (Math.abs(wp - c.position) < PLANE_THRESHOLD) {
          score += 3;
        }
      }
    }

    return { ...c, score };
  });
}

export function getRoofType(cad: CadDocument): RoofType {
  if (cad.blocks.some(b => b.kind === 'core' || b.kind === 'beam')) return 'flat-parapet';
  const progVals = cad.roomProgramme ? Object.values(cad.roomProgramme) : [];
  const progSet = new Set(progVals.map(r => r.toLowerCase()));
  if (progSet.has('warehouse') || progSet.has('workshop')) return 'slab-edge';
  if (progSet.has('apartment') || progSet.has('office')) return 'flat-parapet';
  return 'pitched-truss';
}

export function getRoofBuildUp(cad: CadDocument, roofType?: RoofType): RoofBuildUp {
  const rt = roofType ?? getRoofType(cad);
  return {
    roofType: rt,
    hasInsulation: true,
    hasMembrane: rt !== 'pitched-truss',
    fasciaDepthMm: rt === 'pitched-truss' ? 150 : 200,
    eavesDepthMm: rt === 'pitched-truss' ? 300 : 0,
    parapetHeightMm: rt === 'flat-parapet' ? 600 : 0,
    trussSpacingMm: rt === 'pitched-truss' ? 600 : 0,
    ceilingLiningMm: 12.5,
  };
}

export function getFoundationSpec(cad: CadDocument): { width: number; depth: number; blinding: number } {
  const storeys = cad.floors.length;
  const width = storeys <= 2 ? 0.6 : storeys <= 4 ? 0.75 : 0.9;
  const depth = storeys <= 2 ? 0.25 : storeys <= 4 ? 0.3 : 0.35;
  return { width, depth, blinding: 0.05 };
}

export function getFloorBuildUp(floorIdx: number): FloorBuildUp {
  if (floorIdx === 0) {
    return {
      slabThickness: 0.2,
      screedThickness: 0.075,
      finishThickness: 0.025,
      hasHardcore: true,
      hasInsulation: true,
      hasDpm: true,
      slabType: 'ground-bearing',
      footingWidth: 0.6,
      footingDepth: 0.25,
      blindingThickness: 0.05,
    };
  }
  return {
    slabThickness: 0.2,
    screedThickness: 0.075,
    finishThickness: 0.025,
    hasHardcore: false,
    hasInsulation: false,
    hasDpm: false,
    slabType: 'suspended',
  };
}

export function getFloorBuildUpWithFooting(floorIdx: number, totalFloors: number): FloorBuildUp {
  const base = getFloorBuildUp(floorIdx);
  if (floorIdx === 0) {
    const width = totalFloors <= 2 ? 0.6 : totalFloors <= 4 ? 0.75 : 0.9;
    const depth = totalFloors <= 2 ? 0.25 : totalFloors <= 4 ? 0.3 : 0.35;
    return { ...base, footingWidth: width, footingDepth: depth, blindingThickness: 0.05 };
  }
  return base;
}

export function inferRoomsAtCut(cad: CadDocument, cutPos: number, axis: 'AA' | 'BB'): Map<string, string> {
  const planeF = planeOf(axis);
  const result = new Map<string, string>();

  if (!cad.roomProgramme) return result;

  const allPlanes = cad.walls.flatMap(w => [planeF(w.start), planeF(w.end)]);
  const minP = Math.min(...allPlanes, 0);
  const maxP = Math.max(...allPlanes, 1);
  const roomIds = Object.keys(cad.roomProgramme);
  const step = roomIds.length > 1 ? (maxP - minP) / (roomIds.length + 1) : 0;

  roomIds.forEach((id, i) => {
    const rc = minP + step * (i + 1);
    if (Math.abs(rc - cutPos) < PLANE_THRESHOLD * 1.5) {
      result.set(id, cad.roomProgramme![id]);
    }
  });

  return result;
}

function buildCutPlane(cad: CadDocument, axis: 'AA' | 'BB', cutPos: number): SectionCutPlane {
  const planeF = planeOf(axis);
  const wallsCut: string[] = [];
  const wallsBeyond: string[] = [];
  const stairsCut: string[] = [];
  const serviceCoresCut: string[] = [];

  for (const w of cad.walls) {
    const wPlane = (planeF(w.start) + planeF(w.end)) / 2;
    if (Math.abs(wPlane - cutPos) < PLANE_THRESHOLD) {
      wallsCut.push(w.id);
    } else {
      wallsBeyond.push(w.id);
    }
  }

  const roomMap = inferRoomsAtCut(cad, cutPos, axis);
  const roomsCut = [...new Set(roomMap.values())];

  for (const block of cad.blocks) {
    const blkPlane = (planeF(block.position) + (block.end ? planeF(block.end) : planeF(block.position))) / 2;
    if (Math.abs(blkPlane - cutPos) < PLANE_THRESHOLD) {
      if (block.kind === 'stair') stairsCut.push(block.id);
      if (block.kind === 'core') serviceCoresCut.push(block.id);
    }
  }

  const structCount = wallsCut.filter(wId => cad.walls.find(w => w.id === wId)?.structural).length;
  const totalWallCount = wallsCut.length;

  return {
    axis,
    position: cutPos,
    roomsCut,
    wallsCut,
    wallsBeyond,
    stairsCut,
    serviceCoresCut,
    wallTypeSummary: `${structCount} structural, ${totalWallCount - structCount} partition`,
    cutDescription: roomsCut.length > 0 ? `Cutting: ${roomsCut.slice(0, 4).join(', ')}${roomsCut.length > 4 ? '...' : ''}` : undefined,
  };
}

function fallbackCut(cad: CadDocument, axis: 'AA' | 'BB'): SectionCutPlane {
  const planeF = planeOf(axis);
  const allPts = cad.walls.flatMap(w => [w.start, w.end]);
  const planes = allPts.map(planeF);
  const cutPos = (Math.min(...planes, 0) + Math.max(...planes, 1)) / 2;
  return buildCutPlane(cad, axis, cutPos);
}

export function renderFloorBuildUpSvg(
  buildUp: FloorBuildUp,
  leftX: number,
  rightX: number,
  slabY: number,
  slabH: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const cutFill = printMode ? '#cbd5e1' : '#1e293b';
  const cutStroke = printMode ? '#0f172a' : '#334155';
  const projColor = printMode ? '#94a3b8' : '#475569';
  const concHatch = 'concrete-hatch';

  parts.push(`<rect x="${leftX.toFixed(1)}" y="${slabY.toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${slabH.toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="1.5"/>`);
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${slabY.toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${slabH.toFixed(1)}" fill="url(#${concHatch})" opacity="${printMode ? 0.25 : 0.4}"/>`);

  const screedH = buildUp.screedThickness * 28;
  const finishH = buildUp.finishThickness * 28;
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(slabY - screedH - finishH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${screedH.toFixed(1)}" fill="${cutFill}" stroke="${projColor}" stroke-width="0.75"/>`);
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(slabY - finishH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${finishH.toFixed(1)}" fill="${projColor}" stroke="none"/>`);

  if (buildUp.hasHardcore) {
    const hcY = slabY + slabH;
    const hcH = 0.15 * 28;
    parts.push(`<rect x="${leftX.toFixed(1)}" y="${hcY.toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${hcH.toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="1"/>`);
    parts.push(`<rect x="${leftX.toFixed(1)}" y="${hcY.toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${hcH.toFixed(1)}" fill="url(#hardcore-hatch)" opacity="${printMode ? 0.2 : 0.35}"/>`);
    if (buildUp.hasInsulation) {
      const insulH = 0.05 * 28;
      parts.push(`<rect x="${leftX.toFixed(1)}" y="${(hcY + hcH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${insulH.toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#334155'}" stroke="${projColor}" stroke-width="0.75"/>`);
      parts.push(`<rect x="${leftX.toFixed(1)}" y="${(hcY + hcH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${insulH.toFixed(1)}" fill="url(#insulation-hatch)" opacity="0.3"/>`);
    }
    if (buildUp.hasInsulation && buildUp.hasDpm) {
      const dpmY = hcY + hcH + (buildUp.hasInsulation ? 0.05 * 28 : 0);
      parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(dpmY + 2).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(dpmY + 2).toFixed(1)}" stroke="${projColor}" stroke-width="1.5" stroke-dasharray="4 2"/>`);
    }

    const label = buildUp.slabType === 'ground-bearing' ? 'SLAB-ON-GRADE' : 'SUSPENDED SLAB';
    parts.push(`<text x="${((leftX + rightX) / 2).toFixed(1)}" y="${(hcY + hcH + 18).toFixed(1)}" fill="${projColor}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${label} · 150mm HC + 50mm INS + DPM · 200mm RC · 75mm SCR + 25mm FIN</text>`);
  } else if (buildUp.slabType === 'suspended') {
    parts.push(`<text x="${((leftX + rightX) / 2).toFixed(1)}" y="${(slabY + slabH + 16).toFixed(1)}" fill="${projColor}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">SUSPENDED SLAB · 200mm RC · 75mm SCR + 25mm FIN</text>`);
  }

  return parts;
}

export function renderStairCutSvg(
  stairX1: number,
  stairX2: number,
  baseY: number,
  topY: number,
  treadCount: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const projColor = printMode ? '#94a3b8' : '#475569';
  const rise = 0.175;
  const go = 0.28;
  const scale = 28;

  parts.push(`<line x1="${stairX1.toFixed(1)}" y1="${baseY.toFixed(1)}" x2="${stairX2.toFixed(1)}" y2="${topY.toFixed(1)}" stroke="${projColor}" stroke-width="1.5"/>`);

  for (let i = 1; i <= treadCount; i++) {
    const t = i / treadCount;
    const tx = stairX1 + (stairX2 - stairX1) * t;
    const ty = baseY + (topY - baseY) * t;
    parts.push(`<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${(tx + go * scale * 0.3).toFixed(1)}" y2="${ty.toFixed(1)}" stroke="${projColor}" stroke-width="0.75"/>`);
    parts.push(`<line x1="${tx.toFixed(1)}" y1="${(ty - rise * scale).toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="${projColor}" stroke-width="0.5"/>`);
  }

  return parts;
}
