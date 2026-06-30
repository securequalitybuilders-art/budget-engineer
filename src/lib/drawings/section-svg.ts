import { CadDocument, Vec2, MaterialSystem } from '@/domain/ws6-types';
import { TitleBlockMeta, buildTitleBlock, TITLE_BLOCK_H } from './title-block';

const SCALE = 28;
const PAD = 40;
const SLAB_T = 0.2;
const GROUND_DEPTH = 0.8;

const MAT_COLOR: Record<MaterialSystem, string> = {
  concrete: '#1a365d', steel: '#64748b', timber: '#a0522d',
};

export type SectionAxis = 'AA' | 'BB';
export interface SectionConfig {
  axis: SectionAxis;
  position: number;
}

const dist = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.y - a.y);

export function buildSectionSvg(cad: CadDocument, titleMeta?: TitleBlockMeta, config?: SectionConfig): string {
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

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(svgH)}" viewBox="0 0 ${w} ${svgH}">`);
  parts.push(`<rect width="${w}" height="${svgH}" fill="#0b1220"/>`);

  const groundY = sz(0);
  parts.push(`<rect x="0" y="${groundY.toFixed(1)}" width="${w}" height="${(svgH - groundY).toFixed(1)}" fill="#15203a"/>`);
  parts.push(`<line x1="0" y1="${groundY.toFixed(1)}" x2="${w}" y2="${groundY.toFixed(1)}" stroke="#475569" stroke-width="2"/>`);
  parts.push(`<text x="8" y="${(groundY - 6).toFixed(1)}" fill="#94a3b8" font-size="11" font-family="Inter,Arial">±0.000 GL</text>`);

  const leftX = sx(minH);
  const rightX = sx(maxH);

  for (const floor of cad.floors) {
    const matColor = MAT_COLOR[cad.materialSystem];
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
      parts.push(`<rect x="${leftX.toFixed(1)}" y="${slabY.toFixed(1)}" width="${(gx1 - leftX).toFixed(1)}" height="${slabH.toFixed(1)}" fill="#334155" stroke="#475569" stroke-width="1"/>`);
      parts.push(`<rect x="${gx2.toFixed(1)}" y="${slabY.toFixed(1)}" width="${(rightX - gx2).toFixed(1)}" height="${slabH.toFixed(1)}" fill="#334155" stroke="#475569" stroke-width="1"/>`);
      parts.push(`<rect x="${(gx1 - 3).toFixed(1)}" y="${slabY.toFixed(1)}" width="6" height="${(slabH * 1.8).toFixed(1)}" fill="#06b6d4"/>`);
      parts.push(`<rect x="${(gx2 - 3).toFixed(1)}" y="${slabY.toFixed(1)}" width="6" height="${(slabH * 1.8).toFixed(1)}" fill="#06b6d4"/>`);
    } else {
      parts.push(`<rect x="${leftX.toFixed(1)}" y="${slabY.toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${slabH.toFixed(1)}" fill="#334155" stroke="#475569" stroke-width="1"/>`);
    }

    const wallT = 0.2 * SCALE;
    parts.push(`<rect x="${leftX.toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${wallT.toFixed(1)}" height="${(floor.height * SCALE).toFixed(1)}" fill="${matColor}" opacity="0.9"/>`);
    parts.push(`<rect x="${(rightX - wallT).toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${wallT.toFixed(1)}" height="${(floor.height * SCALE).toFixed(1)}" fill="${matColor}" opacity="0.9"/>`);

    for (const o of cad.openings.filter((o) => o.floorId === floor.id)) {
      const host = cad.walls.find((wl) => wl.id === o.wallId);
      if (!host) continue;
      const hostPlane = (planeOf(host.start) + planeOf(host.end)) / 2;
      if (Math.abs(hostPlane - cutPos) > 0.6) continue;
      const t = o.offset / Math.max(dist(host.start, host.end), 0.01);
      const oh = hOf({ x: host.start.x + (host.end.x - host.start.x) * t, y: host.start.y + (host.end.y - host.start.y) * t });
      const sill = o.sillHeight ?? 0;
      const head = o.headHeight ?? (o.kind === 'door' ? 2.1 : (sill + 1.2));
      parts.push(`<rect x="${(sx(oh) - o.width * SCALE / 2).toFixed(1)}" y="${sz(baseZ + head).toFixed(1)}" width="${(o.width * SCALE).toFixed(1)}" height="${((head - sill) * SCALE).toFixed(1)}" fill="${o.kind === 'door' ? '#22c55e' : '#06b6d4'}" opacity="0.5" stroke="#0b1220" stroke-width="1"/>`);
    }

    parts.push(`<text x="${(rightX + 6).toFixed(1)}" y="${(sz(baseZ) - 2).toFixed(1)}" fill="#94a3b8" font-size="11" font-family="Inter,Arial">${floor.name} +${baseZ.toFixed(2)}</text>`);

    const stair = cad.blocks.find((b) => b.floorId === floor.id && b.kind === 'stair');
    if (stair && floor !== topFloor) {
      const a = axis === 'AA' ? stair.position.x : stair.position.y;
      const span = axis === 'AA' ? stair.width : stair.depth;
      const x1 = sx(a);
      const x2 = sx(a + span);
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${sz(baseZ).toFixed(1)}" x2="${x2.toFixed(1)}" y2="${sz(topZ).toFixed(1)}" stroke="#d4a574" stroke-width="3"/>`);
      for (let i = 1; i < 5; i++) {
        const tx = x1 + ((x2 - x1) * i) / 5;
        const tz = baseZ + (floor.height * i) / 5;
        parts.push(`<line x1="${tx.toFixed(1)}" y1="${sz(tz).toFixed(1)}" x2="${(tx + 6).toFixed(1)}" y2="${sz(tz).toFixed(1)}" stroke="#d4a574" stroke-width="1.5"/>`);
      }
    }
  }

  const roofZ = totalHeight;
  parts.push(`<rect x="${(leftX - 6).toFixed(1)}" y="${sz(roofZ + 0.15).toFixed(1)}" width="${(rightX - leftX + 12).toFixed(1)}" height="${(0.15 * SCALE).toFixed(1)}" fill="#475569" stroke="#64748b" stroke-width="1"/>`);
  parts.push(`<text x="8" y="16" fill="#e2e8f0" font-size="13" font-family="'Space Grotesk',Arial" font-weight="700">Section ${label}</text>`);
  parts.push(`<text x="8" y="30" fill="#64748b" font-size="9" font-family="Inter,Arial">cut @ ${axis === 'AA' ? 'Y' : 'X'}=${cutPos.toFixed(1)} m · looking ${axis === 'AA' ? 'North' : 'East'}</text>`);

  parts.push(`<text x="${(w - 8).toFixed(0)}" y="${(h - 8).toFixed(0)}" fill="#94a3b8" font-size="11" font-family="Inter,Arial" text-anchor="end">Overall height ${totalHeight.toFixed(2)} m · ${cad.floors.length} storey</text>`);

  if (titleMeta) parts.push(buildTitleBlock(w, svgH, titleMeta));

  parts.push('</svg>');
  return parts.join('');
}
