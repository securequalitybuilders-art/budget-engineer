import { CadDocument, Vec2, MaterialSystem } from '@/domain/ws6-types';
import { TitleBlockMeta, buildTitleBlock, TITLE_BLOCK_H } from './title-block';
import { SectionConfig } from './section-svg';

const SCALE = 28;
const PAD = 30;

const MAT_COLOR: Record<MaterialSystem, string> = {
  concrete: '#1a365d', steel: '#64748b', timber: '#a0522d',
};

const dist = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.y - a.y);

export function buildPlanSvg(cad: CadDocument, floorId?: string, titleMeta?: TitleBlockMeta, sectionMark?: SectionConfig): string {
  const floor = cad.floors.find((f) => f.id === floorId) ?? cad.floors[0];
  const walls = cad.walls.filter((w) => w.floorId === floor.id);
  const openings = cad.openings.filter((o) => o.floorId === floor.id);
  const blocks = cad.blocks.filter((b) => b.floorId === floor.id);

  const floorIdx = cad.floors.indexOf(floor);
  const floorBelow = floorIdx > 0 ? cad.floors[floorIdx - 1] : null;
  const stairwells = floorBelow
    ? cad.blocks.filter((b) => b.floorId === floorBelow.id && b.kind === 'stair')
    : [];

  const pts = walls.flatMap((w) => [w.start, w.end]);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs, 0); const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0); const maxY = Math.max(...ys, 1);
  const w = (maxX - minX) * SCALE + PAD * 2;
  const h = (maxY - minY) * SCALE + PAD * 2;
  const ox = -minX * SCALE + PAD;
  const oy = -minY * SCALE + PAD;

  const px = (p: Vec2) => p.x * SCALE + ox;
  const py = (p: Vec2) => h - (p.y * SCALE + oy);

  const svgH = h + (titleMeta ? TITLE_BLOCK_H : 0);

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(svgH)}" viewBox="0 0 ${w} ${svgH}">`);
  parts.push(`<rect width="${w}" height="${svgH}" fill="#0b1220"/>`);

  parts.push('<g stroke="#1a2540" stroke-width="1">');
  for (let gx = 0; gx <= w; gx += SCALE) parts.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="${h}"/>`);
  for (let gy = 0; gy <= h; gy += SCALE) parts.push(`<line x1="0" y1="${gy}" x2="${w}" y2="${gy}"/>`);
  parts.push('</g>');

  for (const wl of walls) {
    const mat = wl.metadata.material ?? cad.materialSystem;
    const color = wl.structural ? MAT_COLOR[mat] : '#475569';
    const sw = Math.max(wl.thickness * SCALE, wl.structural ? 6 : 4);
    parts.push(`<line x1="${px(wl.start).toFixed(1)}" y1="${py(wl.start).toFixed(1)}" x2="${px(wl.end).toFixed(1)}" y2="${py(wl.end).toFixed(1)}" stroke="${color}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round"/>`);
  }

  for (const o of openings) {
    const host = walls.find((wl) => wl.id === o.wallId);
    if (!host) continue;
    const t = o.offset / Math.max(dist(host.start, host.end), 0.01);
    const cx = px({ x: host.start.x + (host.end.x - host.start.x) * t, y: host.start.y + (host.end.y - host.start.y) * t });
    const cy = py({ x: host.start.x + (host.end.x - host.start.x) * t, y: host.start.y + (host.end.y - host.start.y) * t });
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="${o.kind === 'door' ? '#22c55e' : '#06b6d4'}" stroke="#0b1220" stroke-width="2"/>`);
  }

  for (const b of blocks) {
    const isCol = b.kind === 'column';
    const fill = isCol ? MAT_COLOR[b.metadata.material ?? cad.materialSystem] : '#334155';
    const bx = b.position.x * SCALE + ox;
    const by = h - (b.position.y * SCALE + oy) - b.depth * SCALE;
    parts.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(b.width * SCALE).toFixed(1)}" height="${(b.depth * SCALE).toFixed(1)}" fill="${fill}" stroke="#64748b" stroke-width="1.5" opacity="0.75" rx="2"/>`);
  }

  for (const st of stairwells) {
    const bx = st.position.x * SCALE + ox;
    const by = h - (st.position.y * SCALE + oy) - st.depth * SCALE;
    const bw = st.width * SCALE;
    const bh = st.depth * SCALE;
    parts.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="#0b1220" stroke="#d4a574" stroke-width="2.5" stroke-dasharray="6 4"/>`);
    parts.push(`<line x1="${bx.toFixed(1)}" y1="${(by + bh).toFixed(1)}" x2="${(bx + bw).toFixed(1)}" y2="${by.toFixed(1)}" stroke="#d4a574" stroke-width="1" opacity="0.6"/>`);
    parts.push(`<text x="${(bx + bw / 2).toFixed(1)}" y="${(by + bh / 2).toFixed(1)}" fill="#d4a574" font-size="9" font-family="Inter,Arial" text-anchor="middle">VOID</text>`);
  }

  const overallW = (maxX - minX).toFixed(1);
  const overallD = (maxY - minY).toFixed(1);
  parts.push(`<text x="${(w / 2).toFixed(0)}" y="${(h - 8).toFixed(0)}" fill="#94a3b8" font-size="12" font-family="Inter,Arial" text-anchor="middle">${overallW} m</text>`);
  parts.push(`<text x="12" y="${(h / 2).toFixed(0)}" fill="#94a3b8" font-size="12" font-family="Inter,Arial" text-anchor="middle" transform="rotate(-90 12 ${(h / 2).toFixed(0)})">${overallD} m</text>`);

  if (sectionMark) {
    const bubble = sectionMark.axis === 'AA' ? 'A' : 'B';
    if (sectionMark.axis === 'AA') {
      const ly = py({ x: 0, y: sectionMark.position });
      parts.push(`<line x1="6" y1="${ly.toFixed(1)}" x2="${(w - 6).toFixed(1)}" y2="${ly.toFixed(1)}" stroke="#d4a574" stroke-width="1.5" stroke-dasharray="10 4 2 4"/>`);
      for (const cx of [14, w - 14]) {
        parts.push(`<circle cx="${cx.toFixed(1)}" cy="${ly.toFixed(1)}" r="9" fill="#0b1220" stroke="#d4a574" stroke-width="1.5"/>`);
        parts.push(`<text x="${cx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" fill="#d4a574" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,Arial">${bubble}</text>`);
      }
    } else {
      const lx = px({ x: sectionMark.position, y: 0 });
      parts.push(`<line x1="${lx.toFixed(1)}" y1="6" x2="${lx.toFixed(1)}" y2="${(h - 6).toFixed(1)}" stroke="#d4a574" stroke-width="1.5" stroke-dasharray="10 4 2 4"/>`);
      for (const cy of [14, h - 14]) {
        parts.push(`<circle cx="${lx.toFixed(1)}" cy="${cy.toFixed(1)}" r="9" fill="#0b1220" stroke="#d4a574" stroke-width="1.5"/>`);
        parts.push(`<text x="${lx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" fill="#d4a574" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,Arial">${bubble}</text>`);
      }
    }
  }

  if (titleMeta) parts.push(buildTitleBlock(w, svgH, titleMeta));

  parts.push('</svg>');
  return parts.join('');
}
