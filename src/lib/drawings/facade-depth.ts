import { LW } from './lineweights';

export interface DepthCueConfig {
  lintelDepthPx: number;
  sillProjectionPx: number;
  revealDepthPx: number;
  plinthThicknessPx: number;
  slabShadowOffsetPx: number;
  corniceDepthPx: number;
  copingDepthPx: number;
  wallFaceTransitionOffsetPx: number;
}

export function getDepthCueConfig(typology: string): DepthCueConfig {
  const t = typology.toLowerCase();
  if (t.includes('villa')) {
    return { lintelDepthPx: 6, sillProjectionPx: 5, revealDepthPx: 8, plinthThicknessPx: 10, slabShadowOffsetPx: 4, corniceDepthPx: 8, copingDepthPx: 6, wallFaceTransitionOffsetPx: 6 };
  }
  if (t.includes('apartment') || t.includes('mixed-use')) {
    return { lintelDepthPx: 4, sillProjectionPx: 3, revealDepthPx: 6, plinthThicknessPx: 8, slabShadowOffsetPx: 5, corniceDepthPx: 5, copingDepthPx: 4, wallFaceTransitionOffsetPx: 4 };
  }
  if (t.includes('warehouse') || t.includes('industrial')) {
    return { lintelDepthPx: 3, sillProjectionPx: 2, revealDepthPx: 4, plinthThicknessPx: 6, slabShadowOffsetPx: 3, corniceDepthPx: 3, copingDepthPx: 3, wallFaceTransitionOffsetPx: 3 };
  }
  if (t.includes('worship') || t.includes('community')) {
    return { lintelDepthPx: 8, sillProjectionPx: 6, revealDepthPx: 10, plinthThicknessPx: 12, slabShadowOffsetPx: 5, corniceDepthPx: 10, copingDepthPx: 8, wallFaceTransitionOffsetPx: 8 };
  }
  if (t.includes('clinic') || t.includes('school') || t.includes('office')) {
    return { lintelDepthPx: 4, sillProjectionPx: 3, revealDepthPx: 5, plinthThicknessPx: 6, slabShadowOffsetPx: 4, corniceDepthPx: 4, copingDepthPx: 3, wallFaceTransitionOffsetPx: 4 };
  }
  return { lintelDepthPx: 4, sillProjectionPx: 3, revealDepthPx: 5, plinthThicknessPx: 6, slabShadowOffsetPx: 3, corniceDepthPx: 4, copingDepthPx: 3, wallFaceTransitionOffsetPx: 4 };
}

export function renderLintel(
  opX: number, opW: number, headY: number,
  lintelDepth: number,
  printMode: boolean,
  frontageType?: string,
): string[] {
  const parts: string[] = [];
  const lintelColor = printMode ? '#64748b' : '#cbd5e1';
  const shadowColor = printMode ? '#475569' : '#1e293b';

  parts.push(`<rect x="${opX.toFixed(1)}" y="${(headY - lintelDepth).toFixed(1)}" width="${opW.toFixed(1)}" height="${lintelDepth.toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#1e293b'}" stroke="${lintelColor}" stroke-width="${LW.PARTITION}"/>`);
  parts.push(`<line x1="${opX.toFixed(1)}" y1="${(headY - lintelDepth + 1).toFixed(1)}" x2="${(opX + opW).toFixed(1)}" y2="${(headY - lintelDepth + 1).toFixed(1)}" stroke="${shadowColor}" stroke-width="0.5" opacity="0.5"/>`);

  if (frontageType === 'entry' || frontageType === 'public') {
    const keystoneX = opX + opW / 2;
    parts.push(`<rect x="${(keystoneX - 3).toFixed(1)}" y="${(headY - lintelDepth - 2).toFixed(1)}" width="6" height="${(lintelDepth + 2).toFixed(1)}" fill="none" stroke="${lintelColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);
  }

  return parts;
}

export function renderSill(
  opX: number, opW: number, sillY: number,
  sillProjection: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const sillColor = printMode ? '#64748b' : '#cbd5e1';
  const shadowColor = printMode ? '#475569' : '#0f172a';

  const proj = sillProjection;
  const sillH = Math.max(proj, 3);

  parts.push(`<rect x="${(opX - 2).toFixed(1)}" y="${sillY.toFixed(1)}" width="${(opW + 4).toFixed(1)}" height="${sillH.toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#1e293b'}" stroke="${sillColor}" stroke-width="${LW.PARTITION}"/>`);

  parts.push(`<line x1="${(opX - 2).toFixed(1)}" y1="${(sillY + 1).toFixed(1)}" x2="${(opX + opW + 2).toFixed(1)}" y2="${(sillY + 1).toFixed(1)}" stroke="${shadowColor}" stroke-width="0.5" opacity="0.4"/>`);

  parts.push(`<line x1="${(opX - 1).toFixed(1)}" y1="${(sillY + sillH).toFixed(1)}" x2="${(opX + opW + 1).toFixed(1)}" y2="${(sillY + sillH).toFixed(1)}" stroke="${sillColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);

  const dripX = opX + opW / 2;
  parts.push(`<line x1="${dripX.toFixed(1)}" y1="${(sillY + sillH).toFixed(1)}" x2="${dripX.toFixed(1)}" y2="${(sillY + sillH + 1.5).toFixed(1)}" stroke="${sillColor}" stroke-width="0.5" opacity="0.3"/>`);

  return parts;
}

export function renderReveal(
  opX: number, opY: number, opW: number, opH: number,
  revealDepth: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const revealColor = printMode ? '#64748b' : '#475569';
  const shadowColor = printMode ? '#475569' : '#1e293b';

  parts.push(`<rect x="${(opX - revealDepth).toFixed(1)}" y="${opY.toFixed(1)}" width="${revealDepth.toFixed(1)}" height="${opH.toFixed(1)}" fill="${printMode ? '#f1f5f9' : '#0f172a'}" stroke="${revealColor}" stroke-width="${LW.HATCH}"/>`);
  parts.push(`<rect x="${(opX + opW).toFixed(1)}" y="${opY.toFixed(1)}" width="${revealDepth.toFixed(1)}" height="${opH.toFixed(1)}" fill="${printMode ? '#f1f5f9' : '#0f172a'}" stroke="${revealColor}" stroke-width="${LW.HATCH}"/>`);

  parts.push(`<line x1="${opX.toFixed(1)}" y1="${(opY + opH * 0.3).toFixed(1)}" x2="${(opX - revealDepth).toFixed(1)}" y2="${(opY + opH * 0.3).toFixed(1)}" stroke="${shadowColor}" stroke-width="0.5" opacity="0.3"/>`);
  parts.push(`<line x1="${(opX + opW).toFixed(1)}" y1="${(opY + opH * 0.7).toFixed(1)}" x2="${(opX + opW + revealDepth).toFixed(1)}" y2="${(opY + opH * 0.7).toFixed(1)}" stroke="${shadowColor}" stroke-width="0.5" opacity="0.3"/>`);

  return parts;
}

export function renderOpeningSurround(
  opX: number, opY: number, opW: number, opH: number,
  headY: number, sillY: number,
  config: DepthCueConfig,
  printMode: boolean,
  frontageType?: string,
): string[] {
  const parts: string[] = [];

  parts.push(...renderReveal(opX, opY, opW, opH, config.revealDepthPx, printMode));
  parts.push(...renderLintel(opX, opW, headY, config.lintelDepthPx, printMode, frontageType));
  parts.push(...renderSill(opX, opW, sillY, config.sillProjectionPx, printMode));

  return parts;
}

export function renderPlinthWithDepth(
  leftX: number, rightX: number, plinthY: number, plinthH: number,
  plinthThickness: number,
  printMode: boolean,
  typology?: string,
): string[] {
  const parts: string[] = [];
  const plinthColor = printMode ? '#64748b' : '#78716c';
  const shadowColor = printMode ? '#475569' : '#0f172a';
  const hatchOpacity = printMode ? 0.12 : 0.22;

  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(plinthY - plinthH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${plinthH.toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#0f172a'}" stroke="${plinthColor}" stroke-width="${LW.PROJECTION}"/>`);
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(plinthY - plinthH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${plinthH.toFixed(1)}" fill="url(#brick-hatch)" opacity="${hatchOpacity}"/>`);

  const thick = Math.min(plinthThickness, plinthH);
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(plinthY - thick).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${thick.toFixed(1)}" fill="none" stroke="${plinthColor}" stroke-width="${LW.PARTITION}"/>`);

  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(plinthY - plinthH + 2).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(plinthY - plinthH + 2).toFixed(1)}" stroke="${shadowColor}" stroke-width="0.5" opacity="0.4"/>`);

  if (typology?.includes('villa') || typology?.includes('worship')) {
    parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(plinthY - plinthH + 4).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(plinthY - plinthH + 4).toFixed(1)}" stroke="${plinthColor}" stroke-width="${LW.HATCH}" opacity="0.3"/>`);
  }

  return parts;
}

export function renderSlabShadowLine(
  leftX: number, rightX: number, slabY: number,
  shadowOffset: number,
  printMode: boolean,
  isPodium?: boolean,
): string[] {
  const parts: string[] = [];
  const shadowColor = printMode ? '#475569' : '#1e293b';
  const weight = isPodium ? LW.PARTITION : LW.HATCH;

  // Primary shadow line
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(slabY + shadowOffset).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(slabY + shadowOffset).toFixed(1)}" stroke="${shadowColor}" stroke-width="${weight}" opacity="${isPodium ? 0.6 : 0.35}"/>`);

  // Secondary shadow line (thinner, offset further down) for gradient effect
  const gradOffset = shadowOffset + 2;
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(slabY + gradOffset).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(slabY + gradOffset).toFixed(1)}" stroke="${shadowColor}" stroke-width="0.5" opacity="${isPodium ? 0.3 : 0.15}"/>`);

  // Slab edge line
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${slabY.toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${slabY.toFixed(1)}" stroke="${shadowColor}" stroke-width="0.5" opacity="0.2"/>`);

  return parts;
}

export function renderSlabEdgeProfile(
  leftX: number, rightX: number,
  slabY: number, slabThicknessPx: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const slabFill = printMode ? '#cbd5e1' : '#1e293b';
  const slabStroke = printMode ? '#64748b' : '#475569';
  const hatchOpacity = printMode ? 0.15 : 0.25;

  parts.push(`<rect x="${leftX.toFixed(1)}" y="${slabY.toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${slabThicknessPx.toFixed(1)}" fill="${slabFill}" stroke="${slabStroke}" stroke-width="${LW.HATCH}" opacity="0.6"/>`);
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${slabY.toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${slabThicknessPx.toFixed(1)}" fill="url(#concrete-hatch)" opacity="${hatchOpacity}"/>`);

  return parts;
}

export function renderCorniceCoping(
  leftX: number, rightX: number, topY: number,
  corniceDepth: number, copingDepth: number,
  printMode: boolean,
  parapetType: string,
): string[] {
  const parts: string[] = [];
  const corniceColor = printMode ? '#64748b' : '#cbd5e1';
  const shadowColor = printMode ? '#475569' : '#1e293b';

  if (parapetType === 'flat' || parapetType === 'none') {
    parts.push(`<rect x="${leftX.toFixed(1)}" y="${(topY - corniceDepth).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${corniceDepth.toFixed(1)}" fill="${printMode ? '#f1f5f9' : '#1e293b'}" stroke="${corniceColor}" stroke-width="${LW.PARTITION}"/>`);
    parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(topY - corniceDepth + 1).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(topY - corniceDepth + 1).toFixed(1)}" stroke="${shadowColor}" stroke-width="0.5" opacity="0.4"/>`);

    parts.push(`<rect x="${leftX.toFixed(1)}" y="${(topY - corniceDepth - copingDepth).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${copingDepth.toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#0f172a'}" stroke="${corniceColor}" stroke-width="${LW.HATCH}"/>`);
    parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(topY - corniceDepth - copingDepth).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(topY - corniceDepth - copingDepth).toFixed(1)}" stroke="${corniceColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);
  }

  if (parapetType === 'stepped') {
    const stepDepth = corniceDepth * 2;
    const midX = (leftX + rightX) / 2;
    parts.push(`<rect x="${midX.toFixed(1)}" y="${(topY - stepDepth).toFixed(1)}" width="${((rightX - leftX) / 2).toFixed(1)}" height="${stepDepth.toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#1e293b'}" stroke="${corniceColor}" stroke-width="${LW.PARTITION}"/>`);
    parts.push(`<line x1="${midX.toFixed(1)}" y1="${(topY - stepDepth + 1).toFixed(1)}" x2="${(midX + (rightX - leftX) / 2).toFixed(1)}" y2="${(topY - stepDepth + 1).toFixed(1)}" stroke="${shadowColor}" stroke-width="0.5" opacity="0.4"/>`);

    const copingStepY = topY - stepDepth - copingDepth;
    parts.push(`<rect x="${midX.toFixed(1)}" y="${copingStepY.toFixed(1)}" width="${((rightX - leftX) / 2).toFixed(1)}" height="${copingDepth.toFixed(1)}" fill="${printMode ? '#0f172a' : '#334155'}" stroke="${corniceColor}" stroke-width="${LW.PARTITION}"/>`);
  }

  return parts;
}

export function renderWallFaceTransition(
  leftX: number, rightX: number, transitionY: number,
  offset: number,
  printMode: boolean,
  materialFrom?: string,
  materialTo?: string,
): string[] {
  const parts: string[] = [];
  const transColor = printMode ? '#64748b' : '#94a3b8';
  const shadowColor = printMode ? '#475569' : '#1e293b';

  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${transitionY.toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${transitionY.toFixed(1)}" stroke="${transColor}" stroke-width="${LW.PARTITION}"/>`);

  const ext = offset;
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${transitionY.toFixed(1)}" x2="${leftX.toFixed(1)}" y2="${(transitionY - ext).toFixed(1)}" stroke="${shadowColor}" stroke-width="1" opacity="0.4"/>`);
  parts.push(`<line x1="${rightX.toFixed(1)}" y1="${transitionY.toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(transitionY - ext).toFixed(1)}" stroke="${shadowColor}" stroke-width="1" opacity="0.4"/>`);

  if (materialFrom && materialTo) {
    parts.push(`<text x="${(rightX + 4).toFixed(1)}" y="${(transitionY - 2).toFixed(1)}" fill="${transColor}" font-size="5" font-style="italic" font-family="Arial,Helvetica,sans-serif">${materialFrom} → ${materialTo}</text>`);
  }

  return parts;
}
