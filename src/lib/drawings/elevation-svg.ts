import { CadDocument } from '@/domain/ws6-types';
import { TitleBlockMeta, buildTitleBlock, TITLE_BLOCK_H } from './title-block';
import { renderProvenanceNote, renderEntourageTree, renderEntouragePerson, HATCH_PATTERNS } from './disciplines/svg-shared';
import { ELEVATION_DERIVED_PROVENANCE } from '@/domain/drawing-provenance';
import { LW } from './lineweights';
import { renderSectionHeightDims } from './dimension-engine';

const SCALE = 28;
const PAD = 40;
const GROUND_DEPTH = 0.8;

export function buildElevationSvg(cad: CadDocument, viewId: string, titleMeta?: TitleBlockMeta, _printMode = false): string {
  const isFront = viewId === 'front';
  const isSide = viewId === 'side';
  const printMode = _printMode ?? false;

  const allPts = cad.walls.flatMap((w) => [w.start, w.end]);
  const xs = allPts.map(p => p.x);
  const ys = allPts.map(p => p.y);
  const minX = Math.min(...xs, 0); const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0); const maxY = Math.max(...ys, 1);

  const bWidth = isFront ? (maxX - minX) : (maxY - minY);

  const topFloor = cad.floors[cad.floors.length - 1];
  const totalHeight = topFloor.elevation + topFloor.height;
  const roofPitch = 1.5;

  const w = bWidth * SCALE + PAD * 2;
  const h = (totalHeight + roofPitch + GROUND_DEPTH) * SCALE + PAD * 2;

  const sx = (coord: number) => (coord - (isFront ? minX : minY)) * SCALE + PAD;
  const sz = (z: number) => h - PAD - GROUND_DEPTH * SCALE - z * SCALE;

  const svgH = h + (titleMeta ? TITLE_BLOCK_H : 0);
  const label = isFront ? 'Front Elevation' : 'Side Elevation';

  const bg = printMode ? '#ffffff' : '#0b1220';
  const groundFill = 'earth-hatch';
  const groundStroke = printMode ? '#0f172a' : '#cbd5e1';
  const wallFill = printMode ? '#e2e8f0' : '#0f172a';
  const wallStroke = printMode ? '#0f172a' : '#334155';
  const roofFill = printMode ? '#cbd5e1' : '#1e293b';
  const roofStroke = printMode ? '#64748b' : '#94a3b8';
  const trimColor = printMode ? '#64748b' : '#cbd5e1';
  const textMain = printMode ? '#0f172a' : '#e2e8f0';
  const textSub = printMode ? '#475569' : '#94a3b8';
  const openingFill = printMode ? '#0b1220' : '#0b1220';
  const glassFill = printMode ? '#f1f5f9' : '#1e293b';
  const projColor = printMode ? '#94a3b8' : '#475569';

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(svgH)}" viewBox="0 0 ${w} ${svgH}">`);
  parts.push(`<defs>${HATCH_PATTERNS}</defs>`);
  parts.push(`<rect width="${w}" height="${svgH}" fill="${bg}"/>`);

  const groundY = sz(0);
  const extLine = 30;

  parts.push(`<line x1="-${extLine}" y1="${groundY.toFixed(1)}" x2="${(w + extLine).toFixed(1)}" y2="${groundY.toFixed(1)}" stroke="${groundStroke}" stroke-width="${LW.MAJOR}" stroke-linecap="butt"/>`);
  parts.push(`<rect x="0" y="${groundY.toFixed(1)}" width="${w}" height="${(svgH - groundY).toFixed(1)}" fill="url(#${groundFill})" opacity="${printMode ? 0.3 : 0.5}"/>`);
  parts.push(`<rect x="0" y="${groundY.toFixed(1)}" width="${w}" height="${(svgH - groundY).toFixed(1)}" fill="${printMode ? '#f8fafc' : '#0b1220'}" opacity="${printMode ? 0.3 : 0.4}"/>`);
  parts.push(`<text x="8" y="${(groundY - 8).toFixed(1)}" fill="${textMain}" font-size="11" font-weight="600" font-family="Arial,Helvetica,sans-serif">±0.000 GL</text>`);

  for (const floor of cad.floors) {
    const baseZ = floor.elevation;
    const topZ = floor.elevation + floor.height;

    const floorPts = cad.walls.filter(wl => wl.floorId === floor.id).flatMap((w) => [w.start, w.end]);
    if (floorPts.length === 0) continue;

    const fx = floorPts.map(p => isFront ? p.x : p.y);
    const fMinX = Math.min(...fx);
    const fMaxX = Math.max(...fx);

    const leftX = sx(fMinX);
    const rightX = sx(fMaxX);
    const wallH = ((topZ - baseZ) * SCALE);

    parts.push(`<rect x="${leftX.toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${wallH.toFixed(1)}" fill="${wallFill}" stroke="${wallStroke}" stroke-width="${LW.PROFILE}" opacity="0.9"/>`);
    parts.push(`<rect x="${leftX.toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${wallH.toFixed(1)}" fill="url(#brick-hatch)" opacity="${printMode ? 0.12 : 0.2}"/>`);

    const courseH = 8;
    for (let cy = sz(topZ + 0.1); cy < sz(baseZ) - 2; cy += courseH * 2) {
      parts.push(`<line x1="${leftX.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${projColor}" stroke-width="${LW.HATCH}" opacity="${printMode ? 0.5 : 0.3}"/>`);
    }

    parts.push(`<line x1="${(rightX + 2).toFixed(1)}" y1="${sz(topZ).toFixed(1)}" x2="${(w - 20).toFixed(1)}" y2="${sz(topZ).toFixed(1)}" stroke="${projColor}" stroke-width="${LW.REFERENCE}" stroke-dasharray="4 4"/>`);
    parts.push(`<text x="${(rightX + 6).toFixed(1)}" y="${(sz(topZ) - 2).toFixed(1)}" fill="${textSub}" font-size="10" font-family="Arial,Helvetica,sans-serif">FFL +${topZ.toFixed(2)}</text>`);

    for (const o of cad.openings.filter((o) => o.floorId === floor.id)) {
      const host = cad.walls.find((wl) => wl.id === o.wallId);
      if (!host) continue;

      const isHorizontal = Math.abs(host.start.y - host.end.y) < 0.1;
      const isVertical = Math.abs(host.start.x - host.end.x) < 0.1;

      if ((isFront && !isHorizontal) || (isSide && !isVertical)) continue;

      const len = Math.hypot(host.end.x - host.start.x, host.end.y - host.start.y);
      if (len < 0.01) continue;
      const t = o.offset / len;
      const oh = isFront
        ? host.start.x + (host.end.x - host.start.x) * t
        : host.start.y + (host.end.y - host.start.y) * t;

      const sill = o.sillHeight ?? 0;
      const head = o.headHeight ?? (o.kind === 'door' ? 2.1 : (sill + 1.2));

      const opX = sx(oh) - (o.width * SCALE / 2);
      const opY = sz(baseZ + head);
      const opW = o.width * SCALE;
      const opH = (head - sill) * SCALE;

      parts.push(`<rect x="${opX.toFixed(1)}" y="${opY.toFixed(1)}" width="${opW.toFixed(1)}" height="${opH.toFixed(1)}" fill="${openingFill}" stroke="${wallStroke}" stroke-width="${LW.PROJECTION}"/>`);

      if (o.kind === 'window') {
        const frameD = 4;
        const innerW = opW - frameD * 2;
        const innerH = opH - frameD * 2;
        parts.push(`<rect x="${(opX + frameD).toFixed(1)}" y="${(opY + frameD).toFixed(1)}" width="${innerW.toFixed(1)}" height="${innerH.toFixed(1)}" fill="${glassFill}" stroke="${projColor}" stroke-width="${LW.HATCH}"/>`);

        if (innerH > 30) {
          parts.push(`<line x1="${(opX + frameD).toFixed(1)}" y1="${(opY + opH * 0.33).toFixed(1)}" x2="${(opX + opW - frameD).toFixed(1)}" y2="${(opY + opH * 0.33).toFixed(1)}" stroke="${projColor}" stroke-width="${LW.HIDDEN}"/>`);
        }
        if (innerW > 40) {
          parts.push(`<line x1="${(opX + opW * 0.5).toFixed(1)}" y1="${(opY + frameD).toFixed(1)}" x2="${(opX + opW * 0.5).toFixed(1)}" y2="${(opY + opH - frameD).toFixed(1)}" stroke="${projColor}" stroke-width="${LW.HIDDEN}"/>`);
        }

        parts.push(`<line x1="${opX.toFixed(1)}" y1="${(opY + 8).toFixed(1)}" x2="${(opX + frameD).toFixed(1)}" y2="${(opY + 8).toFixed(1)}" stroke="${trimColor}" stroke-width="${LW.ANNOTATION}"/>`);

        const reveal = 3;
        parts.push(`<rect x="${(opX - reveal).toFixed(1)}" y="${opY.toFixed(1)}" width="${reveal.toFixed(1)}" height="${opH.toFixed(1)}" fill="none" stroke="${projColor}" stroke-width="${LW.HATCH}"/>`);
        parts.push(`<rect x="${(opX + opW).toFixed(1)}" y="${opY.toFixed(1)}" width="${reveal.toFixed(1)}" height="${opH.toFixed(1)}" fill="none" stroke="${projColor}" stroke-width="${LW.HATCH}"/>`);

        parts.push(`<rect x="${opX.toFixed(1)}" y="${(opY - 3).toFixed(1)}" width="${opW.toFixed(1)}" height="3" fill="${projColor}" stroke="none"/>`);
        parts.push(`<rect x="${opX.toFixed(1)}" y="${(opY + opH).toFixed(1)}" width="${opW.toFixed(1)}" height="3" fill="${projColor}" stroke="none"/>`);

        parts.push(`<text x="${(opX + opW + 5).toFixed(1)}" y="${(opY + 8).toFixed(1)}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">SILL +${sill.toFixed(2)}</text>`);
        parts.push(`<text x="${(opX + opW + 5).toFixed(1)}" y="${(opY + opH - 4).toFixed(1)}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">HD +${head.toFixed(2)}</text>`);
      } else {
        const frameD = 3;
        parts.push(`<rect x="${(opX + frameD).toFixed(1)}" y="${(opY + frameD).toFixed(1)}" width="${(opW - frameD * 2).toFixed(1)}" height="${(opH - frameD).toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#1e293b'}" stroke="${projColor}" stroke-width="${LW.PROJECTION}"/>`);
        parts.push(`<rect x="${(opX + opW - 10).toFixed(1)}" y="${(opY + opH * 0.45).toFixed(1)}" width="3" height="10" fill="${trimColor}" rx="1"/>`);
        if (opW > 20) {
          parts.push(`<rect x="${(opX + 8).toFixed(1)}" y="${(opY + 12).toFixed(1)}" width="${(opW - 16).toFixed(1)}" height="${(opH * 0.3).toFixed(1)}" fill="none" stroke="${projColor}" stroke-width="${LW.HATCH}"/>`);
        }
        parts.push(`<text x="${(opX + opW + 5).toFixed(1)}" y="${(opY + 8).toFixed(1)}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">HD +${head.toFixed(2)}</text>`);
      }
    }
  }

  const roofZ = totalHeight;
  const roofApexX = PAD + bWidth * SCALE / 2;
  const roofApexY = sz(roofZ + roofPitch);
  const leftEavesX = PAD - 15;
  const rightEavesX = PAD + bWidth * SCALE + 15;
  const roofEavesY = sz(roofZ);
  const fasciaDepth = 10;

  parts.push(`<polygon points="${leftEavesX.toFixed(1)},${roofEavesY.toFixed(1)} ${roofApexX.toFixed(1)},${(roofApexY - 3).toFixed(1)} ${rightEavesX.toFixed(1)},${roofEavesY.toFixed(1)}" fill="${roofFill}" stroke="${roofStroke}" stroke-width="${LW.PROFILE}"/>`);

  parts.push(`<polyline points="${(leftEavesX - 5).toFixed(1)},${(roofEavesY - 3).toFixed(1)} ${roofApexX.toFixed(1)},${(roofApexY - 8).toFixed(1)} ${(rightEavesX + 5).toFixed(1)},${(roofEavesY - 3).toFixed(1)}" fill="none" stroke="${roofStroke}" stroke-width="${LW.PARTITION}"/>`);

  parts.push(`<polyline points="${leftEavesX.toFixed(1)},${roofEavesY.toFixed(1)} ${leftEavesX.toFixed(1)},${(roofEavesY - fasciaDepth).toFixed(1)} ${roofApexX.toFixed(1)},${(roofApexY - fasciaDepth).toFixed(1)} ${rightEavesX.toFixed(1)},${(roofEavesY - fasciaDepth).toFixed(1)} ${rightEavesX.toFixed(1)},${roofEavesY.toFixed(1)}" fill="none" stroke="${trimColor}" stroke-width="${LW.PROJECTION}"/>`);

  parts.push(`<text x="8" y="16" fill="${textMain}" font-size="13" font-weight="700" font-family="Arial,Helvetica,sans-serif">${label}</text>`);
  parts.push(`<text x="8" y="30" fill="${textSub}" font-size="9" font-family="Arial,Helvetica,sans-serif">scale 1:100</text>`);

  // Elevation height dimensions
  const elevLevels = cad.floors.map(f => ({ z: f.elevation + f.height, label: f.name }));
  const glLevel = { z: 0, label: 'GL' };
  elevLevels.unshift(glLevel);
  elevLevels.push({ z: totalHeight + roofPitch, label: 'Apex' });
  parts.push(renderSectionHeightDims(elevLevels, 40, { py: (p) => sz(p.y), w, h }, printMode));

  parts.push(`<text x="${(w - 8).toFixed(0)}" y="${(h - 80).toFixed(0)}" fill="${textSub}" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">EXTERNAL WALL: BRICKWORK / BLOCKWORK</text>`);
  parts.push(`<text x="${(w - 8).toFixed(0)}" y="${(h - 70).toFixed(0)}" fill="${textSub}" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">CAVITY: 100mm MINERAL WOOL INSULATION</text>`);
  parts.push(`<text x="${(w - 8).toFixed(0)}" y="${(h - 60).toFixed(0)}" fill="${textSub}" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">ROOF: CHROMADEK ON TIMBER TRUSSES @ 600c/c</text>`);
  parts.push(`<text x="${(w - 8).toFixed(0)}" y="${(h - 50).toFixed(0)}" fill="${textSub}" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">WINDOWS: ALUMINIUM DOUBLE-GLAZED · REVEAL 100mm</text>`);
  parts.push(`<text x="${(w - 8).toFixed(0)}" y="${(h - 40).toFixed(0)}" fill="${textSub}" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">FINISH: PAINTED RENDER / FACE BRICKWORK</text>`);
  parts.push(`<text x="${(w - 8).toFixed(0)}" y="${(h - 30).toFixed(0)}" fill="${textSub}" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">FOUNDATION: RC STRIP · 600W×250D · T12@150 REINFORCEMENT</text>`);

  const treeY = groundY + 5;
  parts.push(renderEntourageTree(40, treeY, 1.5, printMode));
  parts.push(renderEntourageTree(w - 50, treeY, 1.2, printMode));
  parts.push(renderEntourageTree(120, treeY, 1, printMode));

  parts.push(renderEntouragePerson(200, sz(0), 1.2, printMode));
  parts.push(renderEntouragePerson(w - 150, sz(0), 1.2, printMode));

  parts.push(`<line x1="40" y1="${sz(roofZ).toFixed(1)}" x2="40" y2="${(groundY - 10).toFixed(1)}" stroke="${projColor}" stroke-width="${LW.REFERENCE}" stroke-dasharray="4 4"/>`);
  parts.push(`<text x="38" y="${(groundY - 14).toFixed(1)}" fill="${textSub}" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">HT ${totalHeight.toFixed(2)}m</text>`);

  parts.push(renderProvenanceNote(ELEVATION_DERIVED_PROVENANCE, 8, h - 14));

  if (titleMeta) parts.push(buildTitleBlock(w, svgH, titleMeta, printMode));

  parts.push('</svg>');
  return parts.join('');
}
