import { CadDocument, Vec2 } from '@/domain/ws6-types';
import { TitleBlockMeta, buildTitleBlock, TITLE_BLOCK_H } from './title-block';
import { renderProvenanceNote, HATCH_PATTERNS } from './disciplines/svg-shared';
import { SECTION_DERIVED_PROVENANCE } from '@/domain/drawing-provenance';
import { LW } from './lineweights';
import { renderSectionHeightDims } from './dimension-engine';

const SCALE = 28;
const PAD = 40;
const SLAB_T = 0.2;
const GROUND_DEPTH = 0.8;

export type SectionAxis = 'AA' | 'BB';
export interface SectionConfig {
  axis: SectionAxis;
  position: number;
}

const dist = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.y - a.y);

export function buildSectionSvg(cad: CadDocument, titleMeta?: TitleBlockMeta, config?: SectionConfig, _printMode = false): string {
  const printMode = _printMode ?? false;
  const axis: SectionAxis = config?.axis ?? 'AA';
  const hOf = (p: Vec2) => (axis === 'AA' ? p.x : p.y);
  const planeOf = (p: Vec2) => (axis === 'AA' ? p.y : p.x);

  const allPts = cad.walls.flatMap((w) => [w.start, w.end]);
  const hs = allPts.map(hOf);
  const minH = Math.min(...hs, 0);
  const maxH = Math.max(...hs, 1);
  const planes = allPts.map(planeOf);
  const minPlane = Math.min(...planes, 0);
  const maxPlane = Math.max(...planes, 1);
  const cutPos = config?.position ?? (minPlane + maxPlane) / 2;
  const bWidth = maxH - minH;

  const topFloor = cad.floors[cad.floors.length - 1];
  const totalHeight = topFloor.elevation + topFloor.height;

  const w = bWidth * SCALE + PAD * 2;
  const h = (totalHeight + GROUND_DEPTH) * SCALE + PAD * 2;

  const sx = (hcoord: number) => (hcoord - minH) * SCALE + PAD;
  const sz = (z: number) => h - PAD - GROUND_DEPTH * SCALE - z * SCALE;

  const svgH = h + (titleMeta ? TITLE_BLOCK_H : 0);
  const label = axis === 'AA' ? 'A–A' : 'B–B';

  const bg = printMode ? '#ffffff' : '#0b1220';
  const groundFill = 'earth-hatch';
  const cutFill = printMode ? '#cbd5e1' : '#1e293b';
  const cutStroke = printMode ? '#0f172a' : '#334155';
  const concHatch = 'concrete-hatch';
  const brickHatch = 'brick-hatch';
  const textMain = printMode ? '#0f172a' : '#e2e8f0';
  const textSub = printMode ? '#475569' : '#94a3b8';
  const projColor = printMode ? '#94a3b8' : '#475569';

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(svgH)}" viewBox="0 0 ${w} ${svgH}">`);
  parts.push(`<defs>${HATCH_PATTERNS}</defs>`);
  parts.push(`<rect width="${w}" height="${svgH}" fill="${bg}"/>`);

  const groundY = sz(0);
  parts.push(`<rect x="0" y="${groundY.toFixed(1)}" width="${w}" height="${(svgH - groundY).toFixed(1)}" fill="url(#${groundFill})" opacity="${printMode ? 0.5 : 0.8}"/>`);
  parts.push(`<rect x="0" y="${groundY.toFixed(1)}" width="${w}" height="${(svgH - groundY).toFixed(1)}" fill="${printMode ? '#f8fafc' : '#0b1220'}" opacity="${printMode ? 0.3 : 0.5}"/>`);
  parts.push(`<line x1="0" y1="${groundY.toFixed(1)}" x2="${w}" y2="${groundY.toFixed(1)}" stroke="${cutStroke}" stroke-width="${LW.CUT}" stroke-linecap="butt"/>`);
  parts.push(`<text x="8" y="${(groundY - 6).toFixed(1)}" fill="${textMain}" font-size="11" font-family="Arial,Helvetica,sans-serif">±0.000 NGL</text>`);

  const leftX = sx(minH);
  const rightX = sx(maxH);

  const wallT = Math.max(0.2 * SCALE, 5);
  const internalWalls = cad.walls.filter(w => {
    const plane = (planeOf(w.start) + planeOf(w.end)) / 2;
    return Math.abs(plane - cutPos) < 0.6 && !w.structural;
  });

  for (const floor of cad.floors) {
    const baseZ = floor.elevation;
    const topZ = floor.elevation + floor.height;
    const idx = cad.floors.indexOf(floor);
    const below = idx > 0 ? cad.floors[idx - 1] : null;
    const wellStair = below ? cad.blocks.find((b) => b.floorId === below.id && b.kind === 'stair') : null;
    const slabY = sz(baseZ + SLAB_T);
    const slabH = SLAB_T * SCALE;

    if (wellStair) {
      const a = axis === 'AA' ? wellStair.position.x : wellStair.position.y;
      const span = axis === 'AA' ? wellStair.width : wellStair.depth;
      const gx1 = sx(a);
      const gx2 = sx(a + span);
      const slabLeft = `<rect x="${leftX.toFixed(1)}" y="${slabY.toFixed(1)}" width="${(gx1 - leftX).toFixed(1)}" height="${slabH.toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`;
      const slabRight = `<rect x="${gx2.toFixed(1)}" y="${slabY.toFixed(1)}" width="${(rightX - gx2).toFixed(1)}" height="${slabH.toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`;
      parts.push(slabLeft);
      parts.push(slabRight);
      parts.push(`<rect x="${(gx1 - 4).toFixed(1)}" y="${slabY.toFixed(1)}" width="8" height="${(slabH * 2).toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.PARTITION}"/>`);
      parts.push(`<rect x="${(gx2 - 4).toFixed(1)}" y="${slabY.toFixed(1)}" width="8" height="${(slabH * 2).toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.PARTITION}"/>`);
    } else {
      parts.push(`<rect x="${leftX.toFixed(1)}" y="${slabY.toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${slabH.toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);
      parts.push(`<rect x="${leftX.toFixed(1)}" y="${slabY.toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${slabH.toFixed(1)}" fill="url(#${concHatch})" opacity="${printMode ? 0.25 : 0.4}"/>`);

      const screedH = 0.075 * SCALE;
      const finishH = 0.025 * SCALE;
      parts.push(`<rect x="${leftX.toFixed(1)}" y="${(slabY - screedH - finishH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${screedH.toFixed(1)}" fill="${cutFill}" stroke="${projColor}" stroke-width="${LW.HATCH}"/>`);
      parts.push(`<rect x="${leftX.toFixed(1)}" y="${(slabY - finishH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${finishH.toFixed(1)}" fill="${projColor}" stroke="none"/>`);
      if (idx === 0) {
        const hcY = slabY + slabH;
        const hcH = 0.15 * SCALE;
        parts.push(`<rect x="${leftX.toFixed(1)}" y="${hcY.toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${hcH.toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.PARTITION}"/>`);
        parts.push(`<rect x="${leftX.toFixed(1)}" y="${hcY.toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${hcH.toFixed(1)}" fill="url(#hardcore-hatch)" opacity="${printMode ? 0.2 : 0.35}"/>`);
        const insulH = 0.05 * SCALE;
        parts.push(`<rect x="${leftX.toFixed(1)}" y="${(hcY + hcH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${insulH.toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#334155'}" stroke="${projColor}" stroke-width="${LW.HATCH}"/>`);
        parts.push(`<rect x="${leftX.toFixed(1)}" y="${(hcY + hcH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${insulH.toFixed(1)}" fill="url(#insulation-hatch)" opacity="0.3"/>`);

        parts.push(`<text x="${(leftX + (rightX - leftX) / 2).toFixed(1)}" y="${(hcY + hcH + insulH + 14).toFixed(1)}" fill="${textSub}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">150mm H/C + 50mm INS + DPM · 200mm RC SLAB · 75mm SCR + 25mm FIN</text>`);
      }
    }

    const floorWalls = cad.walls.filter(w => w.floorId === floor.id);
    const extLeftWalls = floorWalls.filter(w => {
      const plane = (planeOf(w.start) + planeOf(w.end)) / 2;
      return Math.abs(plane - cutPos) < 0.6 && w.structural;
    });
    for (const w of extLeftWalls) {
      const wh = hOf(w.start);
      const wLeft = sx(wh);
      parts.push(`<rect x="${wLeft.toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${wallT.toFixed(1)}" height="${(floor.height * SCALE).toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);
      parts.push(`<rect x="${wLeft.toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${wallT.toFixed(1)}" height="${(floor.height * SCALE).toFixed(1)}" fill="url(#${brickHatch})" opacity="${printMode ? 0.2 : 0.35}"/>`);
    }

    if (idx === 0) {
      const footW = 0.6 * SCALE;
      const footH = 0.25 * SCALE;
      const footD = 0.6 * SCALE;
      const ftY = sz(-footD);
      const ext = (footW - wallT) / 2;

      for (const w of extLeftWalls) {
        const wh = hOf(w.start);
        const wL = sx(wh) - ext;
        parts.push(`<rect x="${wL.toFixed(1)}" y="${ftY.toFixed(1)}" width="${footW.toFixed(1)}" height="${footH.toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);
        parts.push(`<rect x="${wL.toFixed(1)}" y="${ftY.toFixed(1)}" width="${footW.toFixed(1)}" height="${footH.toFixed(1)}" fill="url(#${concHatch})" opacity="${printMode ? 0.25 : 0.4}"/>`);
        parts.push(`<text x="${(wL + footW / 2).toFixed(1)}" y="${(ftY - 4).toFixed(1)}" fill="${textSub}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">600W × 250D FOOTING</text>`);
      }
    }

    for (const iw of internalWalls) {
      if (iw.floorId !== floor.id) continue;
      const iwh = hOf(iw.start);
      const iwLeft = sx(iwh);
      const iwT = Math.max(0.15 * SCALE, 3);
      parts.push(`<rect x="${iwLeft.toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${iwT.toFixed(1)}" height="${(floor.height * SCALE).toFixed(1)}" fill="${cutFill}" stroke="${projColor}" stroke-width="${LW.PARTITION}"/>`);
      parts.push(`<rect x="${iwLeft.toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${iwT.toFixed(1)}" height="${(floor.height * SCALE).toFixed(1)}" fill="url(#timber-hatch)" opacity="${printMode ? 0.15 : 0.25}"/>`);
    }

    for (const o of cad.openings.filter((o) => o.floorId === floor.id)) {
      const host = cad.walls.find((wl) => wl.id === o.wallId);
      if (!host) continue;
      const hostPlane = (planeOf(host.start) + planeOf(host.end)) / 2;
      if (Math.abs(hostPlane - cutPos) > 0.6) continue;
      const ln = Math.max(dist(host.start, host.end), 0.01);
      const t = o.offset / ln;
      const oh = hOf({ x: host.start.x + (host.end.x - host.start.x) * t, y: host.start.y + (host.end.y - host.start.y) * t });
      const sill = o.sillHeight ?? 0;
      const head = o.headHeight ?? (o.kind === 'door' ? 2.1 : (sill + 1.2));
      const opX = sx(oh) - o.width * SCALE / 2;
      const opY = sz(baseZ + head);
      const opW = o.width * SCALE;
      const opH = (head - sill) * SCALE;
      parts.push(`<rect x="${opX.toFixed(1)}" y="${opY.toFixed(1)}" width="${opW.toFixed(1)}" height="${opH.toFixed(1)}" fill="${bg}" stroke="${projColor}" stroke-width="${LW.PROJECTION}"/>`);

      const reveal = 4;
      parts.push(`<rect x="${(opX - reveal).toFixed(1)}" y="${opY.toFixed(1)}" width="${reveal.toFixed(1)}" height="${opH.toFixed(1)}" fill="none" stroke="${projColor}" stroke-width="${LW.HATCH}"/>`);
      parts.push(`<rect x="${(opX + opW).toFixed(1)}" y="${opY.toFixed(1)}" width="${reveal.toFixed(1)}" height="${opH.toFixed(1)}" fill="none" stroke="${projColor}" stroke-width="${LW.HATCH}"/>`);
      parts.push(`<rect x="${opX.toFixed(1)}" y="${(opY - 3).toFixed(1)}" width="${opW.toFixed(1)}" height="3" fill="${projColor}" stroke="none"/>`);
      parts.push(`<text x="${(opX + opW + 3).toFixed(1)}" y="${(opY - 2).toFixed(1)}" fill="${textSub}" font-size="5" font-family="Arial,Helvetica,sans-serif">HD +${(baseZ + head).toFixed(2)}</text>`);
      parts.push(`<text x="${(opX + opW + 3).toFixed(1)}" y="${(sz(baseZ + sill) + 10).toFixed(1)}" fill="${textSub}" font-size="5" font-family="Arial,Helvetica,sans-serif">SILL +${(baseZ + sill).toFixed(2)}</text>`);
    }

    parts.push(`<text x="${(rightX + 6).toFixed(1)}" y="${(sz(baseZ) - 2).toFixed(1)}" fill="${textSub}" font-size="10" font-family="Arial,Helvetica,sans-serif">${floor.name} +${baseZ.toFixed(2)}</text>`);
    parts.push(`<line x1="${(rightX + 2).toFixed(1)}" y1="${sz(baseZ).toFixed(1)}" x2="${(w - 20).toFixed(1)}" y2="${sz(baseZ).toFixed(1)}" stroke="${projColor}" stroke-width="${LW.REFERENCE}" stroke-dasharray="4 4"/>`);

    const stair = cad.blocks.find((b) => b.floorId === floor.id && b.kind === 'stair');
    if (stair && floor !== topFloor) {
      const a = axis === 'AA' ? stair.position.x : stair.position.y;
      const span = axis === 'AA' ? stair.width : stair.depth;
      const x1 = sx(a);
      const x2 = sx(a + span);
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${sz(baseZ).toFixed(1)}" x2="${x2.toFixed(1)}" y2="${sz(topZ).toFixed(1)}" stroke="${projColor}" stroke-width="${LW.PARTITION}"/>`);
      for (let i = 1; i < 5; i++) {
        const tx = x1 + ((x2 - x1) * i) / 5;
        const tz = baseZ + (floor.height * i) / 5;
        parts.push(`<line x1="${tx.toFixed(1)}" y1="${sz(tz).toFixed(1)}" x2="${(tx + 8).toFixed(1)}" y2="${sz(tz).toFixed(1)}" stroke="${projColor}" stroke-width="${LW.HIDDEN}"/>`);
      }
    }
  }

  const roofZ = totalHeight;
  const roofApexX = leftX + (rightX - leftX) / 2;
  const roofApexY = sz(roofZ + 1.5);
  const roofEavesY = sz(roofZ);
  const trussColor = printMode ? '#64748b' : '#78716c';

  parts.push(`<polyline points="${(leftX - 20).toFixed(1)},${(roofEavesY - 5).toFixed(1)} ${roofApexX.toFixed(1)},${(roofApexY - 5).toFixed(1)} ${(rightX + 20).toFixed(1)},${(roofEavesY - 5).toFixed(1)}" fill="none" stroke="${cutStroke}" stroke-width="${LW.PROFILE}"/>`);

  parts.push(`<polyline points="${(leftX - 18).toFixed(1)},${(roofEavesY - 3).toFixed(1)} ${roofApexX.toFixed(1)},${(roofApexY - 3).toFixed(1)} ${(rightX + 18).toFixed(1)},${(roofEavesY - 3).toFixed(1)}" fill="none" stroke="${projColor}" stroke-width="${LW.PROJECTION}" stroke-dasharray="2 2"/>`);

  const insulLayer = printMode ? '#94a3b8' : '#57534e';
  parts.push(`<polyline points="${(leftX - 16).toFixed(1)},${(roofEavesY - 1).toFixed(1)} ${roofApexX.toFixed(1)},${(roofApexY - 1).toFixed(1)} ${(rightX + 16).toFixed(1)},${(roofEavesY - 1).toFixed(1)}" fill="none" stroke="${insulLayer}" stroke-width="${LW.PARTITION}" stroke-dasharray="4 2"/>`);

  parts.push(`<polyline points="${(leftX - 15).toFixed(1)},${roofEavesY.toFixed(1)} ${roofApexX.toFixed(1)},${roofApexY.toFixed(1)} ${(rightX + 15).toFixed(1)},${roofEavesY.toFixed(1)}" fill="none" stroke="${trussColor}" stroke-width="${LW.PARTITION}"/>`);
  parts.push(`<line x1="${(leftX - 15).toFixed(1)}" y1="${roofEavesY.toFixed(1)}" x2="${(rightX + 15).toFixed(1)}" y2="${roofEavesY.toFixed(1)}" stroke="${trussColor}" stroke-width="${LW.PARTITION}"/>`);
  parts.push(`<line x1="${roofApexX.toFixed(1)}" y1="${roofEavesY.toFixed(1)}" x2="${roofApexX.toFixed(1)}" y2="${roofApexY.toFixed(1)}" stroke="${trussColor}" stroke-width="${LW.PARTITION}"/>`);

  parts.push(`<rect x="${(leftX).toFixed(1)}" y="${(roofEavesY - 4).toFixed(1)}" width="6" height="4" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);
  parts.push(`<rect x="${(rightX - 6).toFixed(1)}" y="${(roofEavesY - 4).toFixed(1)}" width="6" height="4" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);

  parts.push(`<text x="${(roofApexX).toFixed(1)}" y="${(roofApexY - 24).toFixed(1)}" fill="${textSub}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">CHROMADEK ROOFING</text>`);
  parts.push(`<text x="${(roofApexX).toFixed(1)}" y="${(roofApexY - 16).toFixed(1)}" fill="${textSub}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">BREATHABLE MEMBRANE + 150mm INSULATION</text>`);
  parts.push(`<text x="${(roofApexX).toFixed(1)}" y="${(roofApexY - 8).toFixed(1)}" fill="${textSub}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">TIMBER TRUSSES @ 600mm c/c · CEILING LINING 12.5mm FIRELINE</text>`);
  parts.push(`<text x="${(rightX + 6).toFixed(1)}" y="${(roofEavesY - 2).toFixed(1)}" fill="${textSub}" font-size="10" font-family="Arial,Helvetica,sans-serif">Wall Plate +${roofZ.toFixed(2)}</text>`);
  parts.push(`<text x="${(rightX + 6).toFixed(1)}" y="${(roofApexY - 2).toFixed(1)}" fill="${textSub}" font-size="10" font-family="Arial,Helvetica,sans-serif">Apex +${(roofZ + 1.5).toFixed(2)}</text>`);

  parts.push(`<text x="8" y="16" fill="${textMain}" font-size="13" font-weight="700" font-family="Arial,Helvetica,sans-serif">Section ${label}</text>`);
  parts.push(`<line x1="0" y1="21" x2="${w.toFixed(0)}" y2="21" stroke="${projColor}" stroke-width="0.35" opacity="0.3"/>`);
  parts.push(`<text x="8" y="34" fill="${textSub}" font-size="9" font-family="Arial,Helvetica,sans-serif">cut @ ${axis === 'AA' ? 'Y' : 'X'}=${cutPos.toFixed(1)} m · looking ${axis === 'AA' ? 'North' : 'East'}</text>`);

  // Section height dimensions
  const heightLevels = cad.floors.map(f => ({ z: f.elevation, label: f.name }));
  const roofLevel = { z: totalHeight, label: 'Wall Plate' };
  const apexLevel = { z: totalHeight + 1.5, label: 'Apex' };
  heightLevels.push(roofLevel);
  heightLevels.push(apexLevel);
  parts.push(renderSectionHeightDims(heightLevels, w - 20, { py: (p) => sz(p.y), w, h }, printMode));

  parts.push(`<text x="${(w - 8).toFixed(0)}" y="${(h - 8).toFixed(0)}" fill="${textSub}" font-size="10" font-family="Arial,Helvetica,sans-serif" text-anchor="end">Overall height ${totalHeight.toFixed(2)} m · ${cad.floors.length} storey</text>`);

  // Construction notes block
  const cnX = 8;
  const cnY = h - 100;
  parts.push(`<text x="${cnX}" y="${cnY}" fill="${textSub}" font-size="7" font-weight="bold" font-family="Arial,Helvetica,sans-serif">CONSTRUCTION NOTES</text>`);
  parts.push(`<text x="${cnX}" y="${cnY + 12}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">1. EXTERNAL WALLS: CAVITY WALL — 100mm BRICK / 100mm BLOCK / 100mm MINERAL WOOL</text>`);
  parts.push(`<text x="${cnX}" y="${cnY + 22}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">2. INTERNAL PARTITIONS: 100mm TIMBER STUD / 12.5mm FIRELINE PLASTERBOARD</text>`);
  parts.push(`<text x="${cnX}" y="${cnY + 32}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">3. FLOOR: 200mm RC SLAB / 75mm SCREED / 25mm FINISH</text>`);
  parts.push(`<text x="${cnX}" y="${cnY + 42}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">4. FOUNDATION: 600mm × 250mm RC STRIP · REINFORCEMENT T12 @ 150c/c · 50mm BLINDING</text>`);
  parts.push(`<text x="${cnX}" y="${cnY + 52}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">5. ROOF: CHROMADEK ON TIMBER TRUSSES @ 600c/c · 150mm INSULATION · 12.5mm FIRELINE</text>`);

  parts.push(renderProvenanceNote(SECTION_DERIVED_PROVENANCE, 8, h - 14));

  if (titleMeta) parts.push(buildTitleBlock(w, svgH, titleMeta, printMode));

  parts.push('</svg>');
  return parts.join('');
}
