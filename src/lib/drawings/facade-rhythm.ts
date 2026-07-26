import { LW } from './lineweights';
import { deterministicBaySelector } from './deterministic-facade-variation';

export function renderColumnRhythm(
  leftX: number,
  rightX: number,
  groundY: number,
  roofY: number,
  columnSpacing: number | null,
  printMode: boolean,
): string[] {
  if (!columnSpacing || columnSpacing <= 0) return [];

  const parts: string[] = [];
  const width = rightX - leftX;
  const colWidth = 4;
  const colColor = printMode ? '#64748b' : '#475569';

  const totalBays = Math.max(1, Math.floor(width / (columnSpacing * 28)));
  const actualSpacing = width / totalBays;

  for (let i = 1; i < totalBays; i++) {
    const cx = leftX + i * actualSpacing;

    parts.push(`<rect x="${(cx - colWidth / 2).toFixed(1)}" y="${groundY.toFixed(1)}" width="${colWidth.toFixed(1)}" height="${(roofY - groundY).toFixed(1)}" fill="${printMode ? '#f1f5f9' : '#1e293b'}" stroke="${colColor}" stroke-width="${LW.PARTITION}" opacity="${printMode ? 0.3 : 0.25}"/>`);
    parts.push(`<rect x="${(cx - colWidth / 2).toFixed(1)}" y="${groundY.toFixed(1)}" width="${colWidth.toFixed(1)}" height="${(roofY - groundY).toFixed(1)}" fill="url(#concrete-hatch)" opacity="${printMode ? 0.08 : 0.12}"/>`);

    // Capital/pilaster top
    parts.push(`<rect x="${(cx - colWidth - 1).toFixed(1)}" y="${(groundY + 3).toFixed(1)}" width="${(colWidth * 2 + 2).toFixed(1)}" height="6" fill="none" stroke="${colColor}" stroke-width="${LW.HATCH}" opacity="${printMode ? 0.5 : 0.35}"/>`);
    parts.push(`<rect x="${(cx - colWidth - 2).toFixed(1)}" y="${(groundY + 9).toFixed(1)}" width="${(colWidth * 2 + 4).toFixed(1)}" height="2" fill="none" stroke="${colColor}" stroke-width="0.35" opacity="${printMode ? 0.4 : 0.25}"/>`);

    // Base
    parts.push(`<rect x="${(cx - colWidth - 1).toFixed(1)}" y="${(roofY - 6).toFixed(1)}" width="${(colWidth * 2 + 2).toFixed(1)}" height="6" fill="none" stroke="${colColor}" stroke-width="${LW.HATCH}" opacity="${printMode ? 0.5 : 0.35}"/>`);
    parts.push(`<rect x="${(cx - colWidth - 2).toFixed(1)}" y="${(roofY - 9).toFixed(1)}" width="${(colWidth * 2 + 4).toFixed(1)}" height="2" fill="none" stroke="${colColor}" stroke-width="0.35" opacity="${printMode ? 0.4 : 0.25}"/>`);
  }

  return parts;
}

export function renderBalconyProjection(
  _floorY: number,
  floorTopY: number,
  leftX: number,
  rightX: number,
  balconyLikelihood: number,
  printMode: boolean,
  deterministicSeed?: string,
  floorIndex?: number,
): string[] {
  if (balconyLikelihood <= 0) return [];

  const parts: string[] = [];
  const balconyColor = printMode ? '#94a3b8' : '#475569';
  const railColor = printMode ? '#64748b' : '#78716c';

  const width = rightX - leftX;
  const bayCount = Math.max(1, Math.floor(width / (3 * 28)));
  const bayWidth = width / bayCount;

  for (let i = 0; i < bayCount; i++) {
    const context = deterministicSeed
      ? deterministicSeed + '-balcony-' + i + (floorIndex != null ? '-floor-' + floorIndex : '')
      : '';
    const shouldHaveBalcony = deterministicSeed
      ? deterministicBaySelector(i, bayCount, balconyLikelihood, context)
      : false;

    // Fallback: use index-based deterministic check when no seed provided
    const effective = deterministicSeed
      ? shouldHaveBalcony
      : (i % 2 === 0 && i < Math.ceil(bayCount * balconyLikelihood));

    if (!effective) continue;

    const bx = leftX + i * bayWidth + bayWidth * 0.1;
    const bw = bayWidth * 0.8;
    const bDepth = 14;
    const bY = floorTopY;

    // Balcony slab projection with shadow line
    parts.push(`<rect x="${bx.toFixed(1)}" y="${(bY - bDepth).toFixed(1)}" width="${bw.toFixed(1)}" height="${bDepth.toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#0f172a'}" stroke="${balconyColor}" stroke-width="${LW.PROFILE}" opacity="0.85"/>`);
    parts.push(`<line x1="${bx.toFixed(1)}" y1="${(bY - bDepth + 2).toFixed(1)}" x2="${(bx + bw).toFixed(1)}" y2="${(bY - bDepth + 2).toFixed(1)}" stroke="${printMode ? '#cbd5e1' : '#1e293b'}" stroke-width="0.5" opacity="0.6"/>`);

    // Balcony railing with top rail and balusters
    const railH = 16;
    const railY = bY - bDepth - railH;
    parts.push(`<rect x="${bx.toFixed(1)}" y="${railY.toFixed(1)}" width="${bw.toFixed(1)}" height="${railH.toFixed(1)}" fill="none" stroke="${railColor}" stroke-width="${LW.PARTITION}" opacity="${printMode ? 0.7 : 0.5}"/>`);

    // Top rail
    parts.push(`<line x1="${bx.toFixed(1)}" y1="${(railY + 1).toFixed(1)}" x2="${(bx + bw).toFixed(1)}" y2="${(railY + 1).toFixed(1)}" stroke="${railColor}" stroke-width="${LW.PROJECTION}" opacity="0.8"/>`);
    parts.push(`<line x1="${bx.toFixed(1)}" y1="${(railY + 3).toFixed(1)}" x2="${(bx + bw).toFixed(1)}" y2="${(railY + 3).toFixed(1)}" stroke="${railColor}" stroke-width="0.35" opacity="0.4"/>`);

    // Bottom rail
    parts.push(`<line x1="${bx.toFixed(1)}" y1="${(bY - bDepth - 2).toFixed(1)}" x2="${(bx + bw).toFixed(1)}" y2="${(bY - bDepth - 2).toFixed(1)}" stroke="${railColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);

    // Railing balusters
    const balusterSpacing = 5;
    for (let bx2 = bx + 3; bx2 < bx + bw - 2; bx2 += balusterSpacing) {
      parts.push(`<line x1="${bx2.toFixed(1)}" y1="${(railY + 4).toFixed(1)}" x2="${bx2.toFixed(1)}" y2="${(bY - bDepth - 2).toFixed(1)}" stroke="${railColor}" stroke-width="${LW.HATCH}" opacity="${printMode ? 0.5 : 0.35}"/>`);
    }

    // Balcony door threshold
    parts.push(`<line x1="${(bx + bw * 0.3).toFixed(1)}" y1="${bY.toFixed(1)}" x2="${(bx + bw * 0.7).toFixed(1)}" y2="${bY.toFixed(1)}" stroke="${balconyColor}" stroke-width="${LW.PROJECTION}"/>`);
  }

  return parts;
}

export function renderBalconyStack(
  floorIndex: number,
  totalFloors: number,
  floorTopY: number,
  leftX: number,
  rightX: number,
  balconyLikelihood: number,
  printMode: boolean,
  deterministicSeed: string,
): string[] {
  if (balconyLikelihood <= 0 || totalFloors <= 1) return [];

  // Balcony stacking: upper floors get fewer balconies unless it's a villa/apartment
  const floorFactor = 1 - (floorIndex / (totalFloors - 1)) * 0.5;
  const adjustedLikelihood = balconyLikelihood * floorFactor;

  return renderBalconyProjection(
    0, floorTopY,
    leftX, rightX,
    adjustedLikelihood,
    printMode,
    deterministicSeed + '-stack',
    floorIndex,
  );
}

export function renderVerandahProjection(
  groundY: number,
  floorY: number,
  leftX: number,
  rightX: number,
  typology: string,
  printMode: boolean,
): string[] {
  if (!typology.includes('villa') && !typology.includes('worship') && !typology.includes('community')) return [];

  const parts: string[] = [];
  const verandahColor = printMode ? '#94a3b8' : '#78716c';
  const supColor = printMode ? '#64748b' : '#475569';

  const width = rightX - leftX;
  const verandahH = Math.min(groundY - floorY - 40, 120);
  if (verandahH < 20) return [];

  const colCount = Math.max(2, Math.floor(width / 60));
  const colSpacing = width / colCount;

  // Verandah roof
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(groundY - verandahH).toFixed(1)}" width="${width.toFixed(1)}" height="4" fill="${printMode ? '#cbd5e1' : '#334155'}" stroke="${verandahColor}" stroke-width="${LW.PROFILE}" opacity="0.8"/>`);

  // Verandah columns
  for (let i = 0; i <= colCount; i++) {
    const cx = leftX + i * colSpacing;
    const colW = 3;
    parts.push(`<rect x="${(cx - colW / 2).toFixed(1)}" y="${(groundY - verandahH + 4).toFixed(1)}" width="${colW.toFixed(1)}" height="${(verandahH - 4).toFixed(1)}" fill="none" stroke="${supColor}" stroke-width="${LW.PARTITION}" opacity="0.6"/>`);

    if (typology.includes('villa')) {
      parts.push(`<rect x="${(cx - colW - 1).toFixed(1)}" y="${(groundY - verandahH + 4).toFixed(1)}" width="${(colW + 2).toFixed(1)}" height="3" fill="none" stroke="${supColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);
    }
  }

  // Verandah floor
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${groundY.toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${groundY.toFixed(1)}" stroke="${verandahColor}" stroke-width="${LW.PARTITION}" opacity="0.5"/>`);

  // Verandah label
  const textCol = printMode ? '#475569' : '#94a3b8';
  const midX = (leftX + rightX) / 2;
  parts.push(`<text x="${midX.toFixed(1)}" y="${(groundY - verandahH - 6).toFixed(1)}" fill="${textCol}" font-size="6" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">VERANDAH / PORCH</text>`);

  return parts;
}

export function renderSymmetryCenterline(
  leftX: number,
  rightX: number,
  topY: number,
  bottomY: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const cx = (leftX + rightX) / 2;
  const col = printMode ? '#94a3b8' : '#64748b';

  parts.push(`<line x1="${cx.toFixed(1)}" y1="${topY.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${bottomY.toFixed(1)}" stroke="${col}" stroke-width="${LW.REFERENCE}" stroke-dasharray="12 4 2 4" opacity="0.5"/>`);
  parts.push(`<text x="${(cx + 4).toFixed(1)}" y="${(topY + 10).toFixed(1)}" fill="${col}" font-size="6" font-family="Arial,Helvetica,sans-serif" opacity="0.6">CL</text>`);

  return parts;
}

export function renderEntranceCanopy(
  entranceX: number,
  groundY: number,
  entranceEmphasis: string,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const canopyColor = printMode ? '#475569' : '#cbd5e1';
  const supColor = printMode ? '#64748b' : '#78716c';

  const canopyW = entranceEmphasis === 'strong' ? 60 : 36;
  const canopyH = entranceEmphasis === 'strong' ? 12 : 8;
  const canopyY = groundY - 40;

  // Canopy slab with shadow
  parts.push(`<rect x="${(entranceX - canopyW / 2).toFixed(1)}" y="${canopyY.toFixed(1)}" width="${canopyW.toFixed(1)}" height="${canopyH.toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#1e293b'}" stroke="${canopyColor}" stroke-width="${LW.PROFILE}" rx="${entranceEmphasis === 'strong' ? 2 : 1}"/>`);

  // Canopy underside reveal
  parts.push(`<rect x="${(entranceX - canopyW / 2 + 3).toFixed(1)}" y="${(canopyY + 3).toFixed(1)}" width="${(canopyW - 6).toFixed(1)}" height="${(canopyH - 3).toFixed(1)}" fill="none" stroke="${canopyColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);

  if (entranceEmphasis === 'strong') {
    const colW = 4;
    const colY = canopyY + canopyH;
    const colH = groundY - colY;

    parts.push(`<rect x="${(entranceX - canopyW / 2 + 3).toFixed(1)}" y="${colY.toFixed(1)}" width="${colW.toFixed(1)}" height="${colH.toFixed(1)}" fill="${printMode ? '#f1f5f9' : '#1e293b'}" stroke="${supColor}" stroke-width="${LW.PARTITION}" opacity="0.6"/>`);
    parts.push(`<rect x="${(entranceX + canopyW / 2 - colW - 3).toFixed(1)}" y="${colY.toFixed(1)}" width="${colW.toFixed(1)}" height="${colH.toFixed(1)}" fill="${printMode ? '#f1f5f9' : '#1e293b'}" stroke="${supColor}" stroke-width="${LW.PARTITION}" opacity="0.6"/>`);

    // Column capitals
    parts.push(`<rect x="${(entranceX - canopyW / 2 + 2).toFixed(1)}" y="${colY.toFixed(1)}" width="${(colW + 2).toFixed(1)}" height="4" fill="none" stroke="${supColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);
    parts.push(`<rect x="${(entranceX + canopyW / 2 - colW - 4).toFixed(1)}" y="${colY.toFixed(1)}" width="${(colW + 2).toFixed(1)}" height="4" fill="none" stroke="${supColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);

    // Column bases
    parts.push(`<rect x="${(entranceX - canopyW / 2 + 2).toFixed(1)}" y="${(groundY - 4).toFixed(1)}" width="${(colW + 2).toFixed(1)}" height="4" fill="none" stroke="${supColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);
    parts.push(`<rect x="${(entranceX + canopyW / 2 - colW - 4).toFixed(1)}" y="${(groundY - 4).toFixed(1)}" width="${(colW + 2).toFixed(1)}" height="4" fill="none" stroke="${supColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);

    // Pediment / gable above canopy
    const pedimentApexX = entranceX;
    const pedimentApexY = canopyY - 10;
    parts.push(`<polygon points="${(entranceX - canopyW / 2 - 2).toFixed(1)},${canopyY.toFixed(1)} ${pedimentApexX.toFixed(1)},${pedimentApexY.toFixed(1)} ${(entranceX + canopyW / 2 + 2).toFixed(1)},${canopyY.toFixed(1)}" fill="none" stroke="${canopyColor}" stroke-width="${LW.PARTITION}" opacity="0.6"/>`);
    parts.push(`<line x1="${(entranceX - canopyW / 2 - 2).toFixed(1)}" y1="${(canopyY - 1).toFixed(1)}" x2="${(entranceX + canopyW / 2 + 2).toFixed(1)}" y2="${(canopyY - 1).toFixed(1)}" stroke="${canopyColor}" stroke-width="${LW.HATCH}" opacity="0.4"/>`);

    // Door surround emphasis
    const doorW = 22;
    parts.push(`<rect x="${(entranceX - doorW / 2 - 4).toFixed(1)}" y="${(groundY - 34).toFixed(1)}" width="${(doorW + 8).toFixed(1)}" height="34" fill="none" stroke="${canopyColor}" stroke-width="${LW.PARTITION}" opacity="0.4"/>`);

    // Side lights beside door
    const sideLightW = 5;
    parts.push(`<rect x="${(entranceX - doorW / 2 - sideLightW - 2).toFixed(1)}" y="${(groundY - 30).toFixed(1)}" width="${sideLightW.toFixed(1)}" height="30" fill="${printMode ? '#f1f5f9' : '#1e293b'}" stroke="${canopyColor}" stroke-width="${LW.HATCH}" opacity="0.3"/>`);
    parts.push(`<rect x="${(entranceX + doorW / 2 - 3).toFixed(1)}" y="${(groundY - 30).toFixed(1)}" width="${sideLightW.toFixed(1)}" height="30" fill="${printMode ? '#f1f5f9' : '#1e293b'}" stroke="${canopyColor}" stroke-width="${LW.HATCH}" opacity="0.3"/>`);
  }

  if (entranceEmphasis === 'moderate') {
    const colW = 3;
    parts.push(`<rect x="${(entranceX - canopyW / 2 + 2).toFixed(1)}" y="${(canopyY + canopyH).toFixed(1)}" width="${colW.toFixed(1)}" height="${(groundY - canopyY - canopyH).toFixed(1)}" fill="none" stroke="${supColor}" stroke-width="${LW.PARTITION}" opacity="0.6"/>`);
    parts.push(`<rect x="${(entranceX + canopyW / 2 - 5).toFixed(1)}" y="${(canopyY + canopyH).toFixed(1)}" width="${colW.toFixed(1)}" height="${(groundY - canopyY - canopyH).toFixed(1)}" fill="none" stroke="${supColor}" stroke-width="${LW.PARTITION}" opacity="0.6"/>`);
  }

  // Entrance label
  const textCol = printMode ? '#1e293b' : '#e2e8f0';
  parts.push(`<text x="${entranceX.toFixed(1)}" y="${(canopyY - (entranceEmphasis === 'strong' ? 16 : 6)).toFixed(1)}" fill="${textCol}" font-size="8" font-weight="700" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">ENTRY</text>`);

  // Threshold datum line
  parts.push(`<line x1="${(entranceX - 14).toFixed(1)}" y1="${(groundY - 1).toFixed(1)}" x2="${(entranceX + 14).toFixed(1)}" y2="${(groundY - 1).toFixed(1)}" stroke="${canopyColor}" stroke-width="${LW.PROJECTION}"/>`);

  // Threshold step indication
  parts.push(`<rect x="${(entranceX - 16).toFixed(1)}" y="${(groundY - 3).toFixed(1)}" width="32" height="2" fill="none" stroke="${canopyColor}" stroke-width="${LW.HATCH}" opacity="0.4"/>`);

  return parts;
}

export function renderMaterialZoneHatch(
  zone: { from: number; to: number; material: string },
  leftX: number,
  rightX: number,
  sz: (z: number) => number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const zTop = sz(zone.to);
  const zBot = sz(zone.from);
  const hatchId = materialToHatch(zone.material);

  parts.push(`<rect x="${leftX.toFixed(1)}" y="${zTop.toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${(zBot - zTop).toFixed(1)}" fill="${printMode ? '#f1f5f9' : '#0f172a'}" stroke="${printMode ? '#cbd5e1' : '#334155'}" stroke-width="${LW.HATCH}" opacity="0.6"/>`);

  if (hatchId) {
    parts.push(`<rect x="${leftX.toFixed(1)}" y="${zTop.toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${(zBot - zTop).toFixed(1)}" fill="url(#${hatchId})" opacity="${printMode ? 0.2 : 0.35}"/>`);
  }

  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${zTop.toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${zTop.toFixed(1)}" stroke="${printMode ? '#94a3b8' : '#64748b'}" stroke-width="0.5" stroke-dasharray="3 3" opacity="0.5"/>`);

  if (zone.from > 0) {
    parts.push(`<line x1="${leftX.toFixed(1)}" y1="${zBot.toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${zBot.toFixed(1)}" stroke="${printMode ? '#94a3b8' : '#64748b'}" stroke-width="0.5" stroke-dasharray="3 3" opacity="0.5"/>`);
  }

  const midY = (zTop + zBot) / 2;
  const textCol = printMode ? '#475569' : '#94a3b8';
  parts.push(`<text x="${(rightX + 4).toFixed(1)}" y="${midY.toFixed(1)}" fill="${textCol}" font-size="6" font-family="Arial,Helvetica,sans-serif">${zone.material}</text>`);

  return parts;
}

export function renderUpperFloorSetback(
  floorIndex: number,
  totalFloors: number,
  leftX: number,
  rightX: number,
  floorTopY: number,
  printMode: boolean,
  typology: string,
): string[] {
  if (totalFloors < 2) return [];
  if (floorIndex < 1) return [];

  const parts: string[] = [];
  const isIndustrial = typology.includes('warehouse') || typology.includes('industrial');
  const isMixedUse = typology.includes('mixed-use') || typology.includes('apartment');

  if (!isIndustrial && !isMixedUse) return [];

  const setback = isIndustrial ? 8 : 12;
  const setbackColor = printMode ? '#94a3b8' : '#64748b';

  // Setback offset — upper floors step in from the facade line
  const sLeft = leftX + setback;
  const sRight = rightX - setback;

  if (sLeft >= sRight) return parts;

  // Setback visual indicator — dashed line showing the floor re-entrant
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(floorTopY).toFixed(1)}" x2="${sLeft.toFixed(1)}" y2="${(floorTopY).toFixed(1)}" stroke="${setbackColor}" stroke-width="${LW.REFERENCE}" stroke-dasharray="4 4" opacity="0.5"/>`);
  parts.push(`<line x1="${rightX.toFixed(1)}" y1="${(floorTopY).toFixed(1)}" x2="${sRight.toFixed(1)}" y2="${(floorTopY).toFixed(1)}" stroke="${setbackColor}" stroke-width="${LW.REFERENCE}" stroke-dasharray="4 4" opacity="0.5"/>`);

  // Setback dimension tick
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(floorTopY + 4).toFixed(1)}" x2="${leftX.toFixed(1)}" y2="${(floorTopY - 4).toFixed(1)}" stroke="${setbackColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);
  parts.push(`<line x1="${sLeft.toFixed(1)}" y1="${(floorTopY + 4).toFixed(1)}" x2="${sLeft.toFixed(1)}" y2="${(floorTopY - 4).toFixed(1)}" stroke="${setbackColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);

  // Setback label for first upper floor only
  if (floorIndex === 1) {
    const textCol = printMode ? '#475569' : '#94a3b8';
    const midY = floorTopY - 6;
    parts.push(`<text x="${((leftX + sLeft) / 2).toFixed(1)}" y="${midY.toFixed(1)}" fill="${textCol}" font-size="5" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">SETBACK</text>`);
    parts.push(`<text x="${((rightX + sRight) / 2).toFixed(1)}" y="${midY.toFixed(1)}" fill="${textCol}" font-size="5" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">SETBACK</text>`);
  }

  return parts;
}

export function renderPodiumTransition(
  floorIndex: number,
  podiumTopFloorIndex: number,
  leftX: number,
  rightX: number,
  floorTopY: number,
  printMode: boolean,
): string[] {
  if (floorIndex !== podiumTopFloorIndex) return [];

  const parts: string[] = [];
  const podiumColor = printMode ? '#64748b' : '#94a3b8';

  // Podium transition line
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${floorTopY.toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${floorTopY.toFixed(1)}" stroke="${podiumColor}" stroke-width="${LW.PROJECTION}" stroke-dasharray="8 4 2 4" opacity="0.7"/>`);

  // Podium label
  const textCol = printMode ? '#475569' : '#94a3b8';
  const midX = (leftX + rightX) / 2;
  parts.push(`<text x="${midX.toFixed(1)}" y="${(floorTopY + 10).toFixed(1)}" fill="${textCol}" font-size="6" font-weight="700" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">PODIUM TRANSITION</text>`);

  return parts;
}

export function renderTerraceEdge(
  leftX: number,
  rightX: number,
  topY: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const terrColor = printMode ? '#64748b' : '#78716c';

  // Terrace slab edge
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${topY.toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${topY.toFixed(1)}" stroke="${terrColor}" stroke-width="${LW.PROFILE}" opacity="0.8"/>`);

  // Terrace railing posts
  const postSpacing = 30;
  for (let x = leftX + 15; x < rightX; x += postSpacing) {
    parts.push(`<line x1="${x.toFixed(1)}" y1="${topY.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(topY - 10).toFixed(1)}" stroke="${terrColor}" stroke-width="${LW.PARTITION}" opacity="0.6"/>`);
  }

  // Terrace handrail
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(topY - 10).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(topY - 10).toFixed(1)}" stroke="${terrColor}" stroke-width="${LW.PROJECTION}" opacity="0.7"/>`);

  // Terrace label
  const textCol = printMode ? '#475569' : '#94a3b8';
  const midX = (leftX + rightX) / 2;
  parts.push(`<text x="${midX.toFixed(1)}" y="${(topY - 16).toFixed(1)}" fill="${textCol}" font-size="6" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">TERRACE</text>`);

  return parts;
}

export function renderSideDifferentiation(
  leftX: number, rightX: number,
  topY: number, bottomY: number,
  orientation: 'left' | 'right',
  printMode: boolean,
  serviceSide?: 'left' | 'right',
): string[] {
  const parts: string[] = [];
  const isLeft = orientation === 'left';
  const isServiceSide = serviceSide === orientation;
  const accentColor = printMode ? '#64748b' : '#78716c';
  const textCol = printMode ? '#475569' : '#94a3b8';

  const serviceLabel = isServiceSide ? 'SERVICE ACCESS' : 'PRIVATE GARDEN';
  const sideLabel = isLeft ? 'LEFT SIDE' : 'RIGHT SIDE';

  parts.push(`<text x="${((leftX + rightX) / 2).toFixed(1)}" y="${(topY - 10).toFixed(1)}" fill="${accentColor}" font-size="5" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${sideLabel} · ${serviceLabel}</text>`);

  if (isServiceSide) {
    const midX = (leftX + rightX) / 2;
    const serviceY = bottomY - 20;
    parts.push(`<text x="${midX.toFixed(1)}" y="${serviceY.toFixed(1)}" fill="${textCol}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">SERVICE ENTRY · UTILITY ZONE</text>`);

    const markerX = leftX + (rightX - leftX) * 0.2;
    parts.push(`<rect x="${markerX.toFixed(1)}" y="${(bottomY - 4).toFixed(1)}" width="8" height="4" fill="${accentColor}" opacity="0.5"/>`);
    parts.push(`<rect x="${(markerX + 12).toFixed(1)}" y="${(bottomY - 4).toFixed(1)}" width="8" height="4" fill="${accentColor}" opacity="0.3"/>`);
  } else {
    const midX = (leftX + rightX) / 2;
    const gardenY = bottomY - 20;
    parts.push(`<text x="${midX.toFixed(1)}" y="${gardenY.toFixed(1)}" fill="${textCol}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">PRIVATE OPEN SPACE · GARDEN FRONTAGE</text>`);
  }

  return parts;
}

export function renderSideElevationContextNote(
  width: number,
  isLeft: boolean,
  totalHeight: number,
  totalFloors: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const textCol = printMode ? '#475569' : '#94a3b8';
  const sideLabel = isLeft ? 'LEFT' : 'RIGHT';
  const ftf = totalFloors > 0 ? (totalHeight / totalFloors) : 3;

  parts.push(`<text fill="${textCol}" font-size="6" font-style="italic" font-family="Arial,Helvetica,sans-serif">${sideLabel} ELEVATION</text>`);
  parts.push(`<text fill="${textCol}" font-size="5" font-style="italic" font-family="Arial,Helvetica,sans-serif">DEPTH ${width.toFixed(1)}m · ${totalFloors} FL · FTF ${ftf.toFixed(1)}m</text>`);

  return parts;
}

function materialToHatch(material: string): string {
  const map: Record<string, string> = {
    'face-brick': 'brick-hatch',
    'blockwork': 'brick-hatch',
    'render': 'concrete-hatch',
    'stone-cladding': 'concrete-hatch',
    'commercial-glazing': 'glazing-hatch',
    'timber-cladding': 'timber-hatch',
  };
  return map[material.toLowerCase()] ?? '';
}
