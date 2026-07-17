import type { Vec2, MaterialSystem, CadWall, CadOpening, CadBlock, CadBoundary } from '@/domain/ws6-types';
import type { DrawingProvenance } from '@/domain/drawing-provenance';
import { TitleBlockMeta, buildTitleBlock, TITLE_BLOCK_H } from '../title-block';
import type { SectionConfig } from '../section-svg';
import { LW } from '../lineweights';
import { HATCH_PATTERNS } from '../hatch-library';
export { HATCH_PATTERNS };

// ── Constants ──────────────────────────────────────────
export const SCALE = 28;
export const PAD = 30;

export const MAT_COLOR: Record<MaterialSystem, string> = {
  concrete: '#334155',
  steel: '#475569',
  timber: '#78350f',
};

// ── Geometry helpers ───────────────────────────────────
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(b.x - a.x, b.y - a.y);

export function wallAngle(w: CadWall): number {
  return Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x);
}

export function wallMidpoint(w: CadWall): Vec2 {
  return { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
}

// ── Viewport ───────────────────────────────────────────
export interface Viewport {
  minX: number; maxX: number;
  minY: number; maxY: number;
  w: number; h: number;
  ox: number; oy: number;
  svgH: number;
  px: (p: Vec2) => number;
  py: (p: Vec2) => number;
  printMode?: boolean;
}

export function computeViewport(
  walls: CadWall[],
  boundaries: CadBoundary[] = [],
  hasTitleBlock = false,
  printMode = false,
): Viewport {
  const pts = walls.flatMap((w) => [w.start, w.end]);
  boundaries.forEach((bnd) => pts.push(...(bnd.points as Vec2[])));

  const xs = pts.length ? pts.map((p) => p.x) : [0, 10];
  const ys = pts.length ? pts.map((p) => p.y) : [0, 10];
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const w = (maxX - minX) * SCALE + PAD * 2;
  const h = (maxY - minY) * SCALE + PAD * 2;
  const ox = -minX * SCALE + PAD;
  const oy = -minY * SCALE + PAD;

  const svgH = h + (hasTitleBlock ? TITLE_BLOCK_H : 0);

  return {
    minX, maxX, minY, maxY, w, h, ox, oy, svgH, printMode,
    px: (p: Vec2) => p.x * SCALE + ox,
    py: (p: Vec2) => h - (p.y * SCALE + oy),
  };
}

export function getArchitecturalDefs(): string {
  return `<defs>${HATCH_PATTERNS}</defs>`;
}

export function sheetBackground(vp: Viewport): string {
  if (vp.printMode) {
    return `<rect width="${vp.w}" height="${vp.svgH}" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>`;
  }
  return `<rect width="${vp.w}" height="${vp.svgH}" fill="#0b1220"/>`;
}

export function startSvg(vp: Viewport): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(vp.w)}" height="${Math.round(vp.svgH)}" viewBox="0 0 ${vp.w} ${vp.svgH}">`,
    getArchitecturalDefs(),
    sheetBackground(vp),
  ].join('');
}

export function endSvg(parts: string[], vp: Viewport, titleMeta?: TitleBlockMeta): string {
  if (titleMeta) parts.push(buildTitleBlock(vp.w, vp.svgH, titleMeta, vp.printMode));
  parts.push('</svg>');
  return parts.join('');
}

// ── Background grid & Structural Grids ─────────────────
export function renderGrid(vp: Viewport, spacing: number = SCALE): string {
  const parts: string[] = [];
  const color = vp.printMode ? '#e2e8f0' : '#1a2540';
  parts.push(`<g stroke="${color}" stroke-width="${LW.GRID}">`);
  for (let gx = 0; gx <= vp.w; gx += spacing) parts.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="${vp.h}"/>`);
  for (let gy = 0; gy <= vp.h; gy += spacing) parts.push(`<line x1="0" y1="${gy}" x2="${vp.w}" y2="${gy}"/>`);
  parts.push('</g>');
  return parts.join('');
}

export function renderArchitecturalGrid(walls: CadWall[], vp: Viewport): string {
  // Simplistic structural grid based on major structural walls
  const structural = walls.filter(w => w.structural);
  if (structural.length === 0) return '';
  
  const xs = new Set<number>();
  const ys = new Set<number>();
  structural.forEach(w => {
    if (Math.abs(w.start.x - w.end.x) < 0.1) xs.add(Math.round(w.start.x * 10) / 10);
    if (Math.abs(w.start.y - w.end.y) < 0.1) ys.add(Math.round(w.start.y * 10) / 10);
  });
  
  const sortedX = Array.from(xs).sort((a, b) => a - b);
  const sortedY = Array.from(ys).sort((a, b) => a - b);
  
  const parts: string[] = [];
  
  // Y-axis grid (Numbers)
  sortedY.forEach((y, i) => {
    const py = vp.py({ x: 0, y });
    parts.push(`<line x1="20" y1="${py.toFixed(1)}" x2="${(vp.w - 20).toFixed(1)}" y2="${py.toFixed(1)}" stroke="#64748b" stroke-width="0.5" stroke-dasharray="12 4 2 4" opacity="0.5"/>`);
    parts.push(`<circle cx="12" cy="${py.toFixed(1)}" r="8" fill="none" stroke="#64748b" stroke-width="1"/>`);
    parts.push(`<text x="12" y="${(py + 3).toFixed(1)}" fill="#94a3b8" font-size="8" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${i + 1}</text>`);
  });
  
  // X-axis grid (Letters)
  sortedX.forEach((x, i) => {
    const px = vp.px({ x, y: 0 });
    parts.push(`<line x1="${px.toFixed(1)}" y1="20" x2="${px.toFixed(1)}" y2="${(vp.h - 20).toFixed(1)}" stroke="#64748b" stroke-width="0.5" stroke-dasharray="12 4 2 4" opacity="0.5"/>`);
    parts.push(`<circle cx="${px.toFixed(1)}" cy="12" r="8" fill="none" stroke="#64748b" stroke-width="1"/>`);
    const char = String.fromCharCode(65 + i);
    parts.push(`<text x="${px.toFixed(1)}" y="15" fill="#94a3b8" font-size="8" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${char}</text>`);
  });

  return parts.join('');
}

// ── Architectural Dimension Line ───────────────────────
export function renderDimensionLine(x1: number, y1: number, x2: number, y2: number, label: string): string {
  const parts: string[] = [];
  // The line itself
  parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#94a3b8" stroke-width="0.75"/>`);
  
  // Architectural Ticks (slash)
  const tickSize = 4;
  parts.push(`<line x1="${(x1 - tickSize).toFixed(1)}" y1="${(y1 + tickSize).toFixed(1)}" x2="${(x1 + tickSize).toFixed(1)}" y2="${(y1 - tickSize).toFixed(1)}" stroke="#e2e8f0" stroke-width="1.5"/>`);
  parts.push(`<line x1="${(x2 - tickSize).toFixed(1)}" y1="${(y2 + tickSize).toFixed(1)}" x2="${(x2 + tickSize).toFixed(1)}" y2="${(y2 - tickSize).toFixed(1)}" stroke="#e2e8f0" stroke-width="1.5"/>`);
  
  // Label centered above line
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const isVert = Math.abs(x1 - x2) < 0.1;
  if (isVert) {
    parts.push(`<text x="${(cx - 4).toFixed(1)}" y="${cy.toFixed(1)}" fill="#cbd5e1" font-size="8" text-anchor="middle" transform="rotate(-90 ${cx} ${cy})" font-family="Arial,Helvetica,sans-serif">${label}</text>`);
  } else {
    parts.push(`<text x="${cx.toFixed(1)}" y="${(cy - 4).toFixed(1)}" fill="#cbd5e1" font-size="8" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${label}</text>`);
  }
  
  return parts.join('');
}

export interface WallRenderOptions {
  colorOverride?: string;
  dashArray?: string;
  opacityOverride?: number;
  materialSystem?: MaterialSystem;
  asPolygon?: boolean;
  hatchFill?: string;
}

function renderWallAsPolygon(
  wl: CadWall,
  vp: Viewport,
): string {
  const dx = wl.end.x - wl.start.x;
  const dy = wl.end.y - wl.start.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return '';
  const perpX = -dy / len;
  const perpY = dx / len;
  const halfT = (wl.thickness * SCALE) / 2;
  const sx = vp.px(wl.start);
  const sy = vp.py(wl.start);
  const ex = vp.px(wl.end);
  const ey = vp.py(wl.end);
  const pTopLeft = { x: sx + perpX * halfT, y: sy + perpY * halfT };
  const pTopRight = { x: ex + perpX * halfT, y: ey + perpY * halfT };
  const pBotRight = { x: ex - perpX * halfT, y: ey - perpY * halfT };
  const pBotLeft = { x: sx - perpX * halfT, y: sy - perpY * halfT };
  return `${pTopLeft.x.toFixed(1)},${pTopLeft.y.toFixed(1)} ${pTopRight.x.toFixed(1)},${pTopRight.y.toFixed(1)} ${pBotRight.x.toFixed(1)},${pBotRight.y.toFixed(1)} ${pBotLeft.x.toFixed(1)},${pBotLeft.y.toFixed(1)}`;
}

export function renderWalls(
  walls: CadWall[],
  vp: Viewport,
  _materialSystem: MaterialSystem,
  opts: WallRenderOptions = {},
): string {
  const parts: string[] = [];
  const printMode = vp.printMode ?? false;
  const usePolygon = opts.asPolygon ?? true;
  for (const wl of walls) {
    const isStructural = wl.structural ?? wl.thickness >= 0.2;
    const sw = Math.max(wl.thickness * SCALE, isStructural ? LW.CUT : LW.PARTITION);
    if (usePolygon && sw >= 3) {
      const pts = renderWallAsPolygon(wl, vp);
      if (!pts) continue;
      const cutFill = wl.structural
        ? (printMode ? '#cbd5e1' : '#1e293b')
        : (printMode ? '#e2e8f0' : '#0f172a');
      const hatch = isStructural ? 'concrete-hatch' : 'brick-hatch';
      const strokeColor = opts.colorOverride ?? (isStructural
        ? (printMode ? '#0f172a' : '#334155')
        : (printMode ? '#64748b' : '#475569'));
      const dash = opts.dashArray ? `stroke-dasharray="${opts.dashArray}"` : '';
      const opacity = opts.opacityOverride !== undefined ? opts.opacityOverride : 1;
      parts.push(`<polygon points="${pts}" fill="${cutFill}" stroke="${strokeColor}" stroke-width="${isStructural ? LW.CUT : LW.PARTITION}" ${dash} opacity="${opacity}" stroke-linejoin="round"/>`);
      if (isStructural) {
        parts.push(`<polygon points="${pts}" fill="url(#${hatch})" opacity="${printMode ? 0.3 : 0.4}"/>`);
      }
    } else {
      const color = opts.colorOverride ?? (isStructural ? (printMode ? '#0f172a' : '#334155') : (printMode ? '#64748b' : '#475569'));
      const dash = opts.dashArray ? `stroke-dasharray="${opts.dashArray}"` : '';
      const opacity = opts.opacityOverride !== undefined ? `opacity="${opts.opacityOverride}"` : '';
      parts.push(
        `<line x1="${vp.px(wl.start).toFixed(1)}" y1="${vp.py(wl.start).toFixed(1)}" ` +
        `x2="${vp.px(wl.end).toFixed(1)}" y2="${vp.py(wl.end).toFixed(1)}" ` +
        `stroke="${color}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" ${dash} ${opacity}/>`
      );
    }
  }
  return parts.join('');
}

export function renderOpenings(
  openings: CadOpening[],
  walls: CadWall[],
  vp: Viewport,
  options: { showTags?: boolean } = {},
): string {
  const parts: string[] = [];
  const printMode = vp.printMode ?? false;
  const wallBreak = printMode ? '#ffffff' : '#0b1220';
  const openingColor = printMode ? '#0f172a' : '#e2e8f0';
  const dimColor = printMode ? '#64748b' : '#94a3b8';
  for (const o of openings) {
    const host = walls.find((wl) => wl.id === o.wallId);
    if (!host) continue;
    const len = dist(host.start, host.end);
    if (len < 0.01) continue;
    const t = o.offset / len;
    const midX = host.start.x + (host.end.x - host.start.x) * t;
    const midY = host.start.y + (host.end.y - host.start.y) * t;
    const dx = host.end.x - host.start.x;
    const dy = host.end.y - host.start.y;
    const perpX = -dy / len;
    const perpY = dx / len;
    const halfW = (o.width * SCALE) / 2;
    const gap = 2;
    const leftPx = vp.px({ x: midX - perpX * (o.width / 2 + gap / SCALE), y: 0 });
    const leftPy = vp.py({ x: 0, y: midY - perpY * (o.width / 2 + gap / SCALE) });
    const rightPx = vp.px({ x: midX + perpX * (o.width / 2 + gap / SCALE), y: 0 });
    const rightPy = vp.py({ x: 0, y: midY + perpY * (o.width / 2 + gap / SCALE) });
    const opLeftPx = vp.px({ x: midX - perpX * (o.width / 2), y: 0 });
    const opLeftPy = vp.py({ x: 0, y: midY - perpY * (o.width / 2) });
    const opRightPx = vp.px({ x: midX + perpX * (o.width / 2), y: 0 });
    const opRightPy = vp.py({ x: 0, y: midY + perpY * (o.width / 2) });
    const cx = (opLeftPx + opRightPx) / 2;
    const cy = (opLeftPy + opRightPy) / 2;
    parts.push(`<g>`);
    parts.push(`<line x1="${leftPx.toFixed(1)}" y1="${leftPy.toFixed(1)}" x2="${rightPx.toFixed(1)}" y2="${rightPy.toFixed(1)}" stroke="${wallBreak}" stroke-width="8"/>`);
    parts.push(`<line x1="${opLeftPx.toFixed(1)}" y1="${opLeftPy.toFixed(1)}" x2="${opRightPx.toFixed(1)}" y2="${opRightPy.toFixed(1)}" stroke="${openingColor}" stroke-width="${o.kind === 'door' ? 1.5 : 2}"/>`);
    if (o.kind === 'door') {
      const arcR = o.width * SCALE;
      const nearS = Math.sin(midY) > 0;
      const dir = nearS ? -1 : 1;
      const arcOriginX = opLeftPx < opRightPx ? opLeftPx : opRightPx;
      const arcOriginY = (Math.abs(dy) < 0.01) ? opLeftPy : (opLeftPy < opRightPy ? opLeftPy : opRightPy);
      const sweep = dir > 0 ? 1 : 0;
      const ax = Math.abs(dy) < 0.01 ? (opLeftPx + opRightPx) / 2 : arcOriginX;
      const ay = Math.abs(dy) < 0.01 ? (opLeftPy + opRightPy) / 2 : arcOriginY;
      const swX = halfW;
      const swY = 0;
      parts.push(`<path d="M ${ax.toFixed(1)} ${ay.toFixed(1)} A ${arcR.toFixed(1)} ${arcR.toFixed(1)} 0 0 ${sweep} ${(ax + swX * 2).toFixed(1)} ${(ay + swY * 2).toFixed(1)}" fill="none" stroke="${openingColor}" stroke-width="1"/>`);
      parts.push(`<line x1="${(ax + swX * 2).toFixed(1)}" y1="${(ay + swY * 2).toFixed(1)}" x2="${(ax + swX * 2).toFixed(1)}" y2="${(ay - 2).toFixed(1)}" stroke="${openingColor}" stroke-width="2"/>`);
    } else {
      const mullionPx = vp.px({ x: midX, y: 0 });
      const mullionPy = vp.py({ x: 0, y: midY });
      parts.push(`<line x1="${(opLeftPx + opRightPx) / 2}" y1="${(opLeftPy + opRightPy) / 2}" x2="${mullionPx.toFixed(1)}" y2="${mullionPy.toFixed(1)}" stroke="${dimColor}" stroke-width="0.5" opacity="0.6"/>`);
      parts.push(`<line x1="${opLeftPx.toFixed(1)}" y1="${(opLeftPy + opRightPy) / 2}" x2="${opRightPx.toFixed(1)}" y2="${(opLeftPy + opRightPy) / 2}" stroke="${dimColor}" stroke-width="0.5" opacity="0.4"/>`);
    }
    if (options.showTags) {
      const tag = `${o.kind === 'door' ? 'D' : 'W'}-${o.id.slice(0, 3).toUpperCase()}`;
      parts.push(`<text x="${cx.toFixed(1)}" y="${(cy - 10).toFixed(1)}" fill="${dimColor}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${escXml(tag)}</text>`);
    }
    parts.push(`</g>`);
  }
  return parts.join('');
}

// ── Block rendering ────────────────────────────────────
export function renderBlocks(
  blocks: CadBlock[],
  vp: Viewport,
  materialSystem: MaterialSystem,
  filterKinds?: string[],
): string {
  const parts: string[] = [];
  const printMode = vp.printMode ?? false;
  for (const b of blocks) {
    if (filterKinds && !filterKinds.includes(b.kind)) continue;
    const isCol = b.kind === 'column';
    const fill = isCol ? MAT_COLOR[b.metadata?.material ?? materialSystem] : (printMode ? '#cbd5e1' : '#334155');
    const stroke = printMode ? '#64748b' : '#64748b';
    const bx = b.position.x * SCALE + vp.ox;
    const by = vp.h - (b.position.y * SCALE + vp.oy) - b.depth * SCALE;
    parts.push(
      `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" ` +
      `width="${(b.width * SCALE).toFixed(1)}" height="${(b.depth * SCALE).toFixed(1)}" ` +
      `fill="${fill}" stroke="${stroke}" stroke-width="${LW.FIXTURE}" opacity="0.75" rx="2"/>`
    );
  }
  return parts.join('');
}

// ── Overall dimensions ─────────────────────────────────
export function renderOverallDimensions(vp: Viewport): string {
  const overallW = (vp.maxX - vp.minX).toFixed(1);
  const overallD = (vp.maxY - vp.minY).toFixed(1);
  return [
    `<text x="${(vp.w / 2).toFixed(0)}" y="${(vp.h - 8).toFixed(0)}" fill="#94a3b8" font-size="12" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">${overallW} m</text>`,
    `<text x="12" y="${(vp.h / 2).toFixed(0)}" fill="#94a3b8" font-size="12" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" transform="rotate(-90 12 ${(vp.h / 2).toFixed(0)})">${overallD} m</text>`,
  ].join('');
}

// ── Section cut mark ───────────────────────────────────
export function renderSectionMark(sectionMark: SectionConfig, vp: Viewport): string {
  const parts: string[] = [];
  const bubble = sectionMark.axis === 'AA' ? 'A' : 'B';
  if (sectionMark.axis === 'AA') {
    const ly = vp.py({ x: 0, y: sectionMark.position });
    parts.push(`<line x1="6" y1="${ly.toFixed(1)}" x2="${(vp.w - 6).toFixed(1)}" y2="${ly.toFixed(1)}" stroke="#d4a574" stroke-width="1.5" stroke-dasharray="10 4 2 4"/>`);
    for (const cx of [14, vp.w - 14]) {
      parts.push(`<circle cx="${cx.toFixed(1)}" cy="${ly.toFixed(1)}" r="9" fill="#0b1220" stroke="#d4a574" stroke-width="1.5"/>`);
      parts.push(`<text x="${cx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" fill="#d4a574" font-size="11" font-weight="700" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${bubble}</text>`);
    }
  } else {
    const lx = vp.px({ x: sectionMark.position, y: 0 });
    parts.push(`<line x1="${lx.toFixed(1)}" y1="6" x2="${lx.toFixed(1)}" y2="${(vp.h - 6).toFixed(1)}" stroke="#d4a574" stroke-width="1.5" stroke-dasharray="10 4 2 4"/>`);
    for (const cy of [14, vp.h - 14]) {
      parts.push(`<circle cx="${lx.toFixed(1)}" cy="${cy.toFixed(1)}" r="9" fill="#0b1220" stroke="#d4a574" stroke-width="1.5"/>`);
      parts.push(`<text x="${lx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" fill="#d4a574" font-size="11" font-weight="700" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${bubble}</text>`);
    }
  }
  return parts.join('');
}

// ── Provenance disclaimer ──────────────────────────────
export function renderProvenanceNote(prov: DrawingProvenance | undefined, x: number, y: number): string {
  if (!prov || prov.source === 'user') return '';
  const label = prov.source === 'assumed' ? 'ASSUMED' : prov.source === 'derived' ? 'DERIVED' : 'IMPORTED';
  const confColor = prov.confidence === 'low' ? '#ef4444' : prov.confidence === 'medium' ? '#f59e0b' : '#22c55e';
  const parts: string[] = [];
  parts.push(`<text x="${x}" y="${y}" fill="${confColor}" font-size="8" font-style="italic" font-family="Arial,Helvetica,sans-serif">[${label}] ${prov.note ?? ''}</text>`);
  return parts.join('');
}

export function renderDrawingTitle(title: string, subtitle: string, vp: Viewport): string {
  const fill = vp.printMode ? '#0f172a' : '#e2e8f0';
  const subFill = vp.printMode ? '#475569' : '#64748b';
  const separator = vp.printMode ? '#94a3b8' : '#334155';
  return [
    `<text x="8" y="16" fill="${fill}" font-size="13" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escXml(title)}</text>`,
    `<line x1="0" y1="21" x2="${(vp.w).toFixed(0)}" y2="21" stroke="${separator}" stroke-width="0.35" opacity="0.3"/>`,
    `<text x="8" y="34" fill="${subFill}" font-size="8" font-family="Arial,Helvetica,sans-serif">${escXml(subtitle)}</text>`,
  ].join('');
}

// ── Entourage ──────────────────────────────────────────
export function renderEntourageTree(x: number, y: number, scale = 1, printMode = false): string {
  const fill = printMode ? '#cbd5e1' : '#1e293b';
  const stroke = printMode ? '#94a3b8' : '#334155';
  const r = 12 * scale;
  const trunkH = 10 * scale;
  return [
    `<g opacity="0.5">`,
    `<line x1="${x}" y1="${y}" x2="${x}" y2="${(y + trunkH)}" stroke="${stroke}" stroke-width="${1.5 * scale}"/>`,
    `<circle cx="${x}" cy="${(y - r * 0.6)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${0.5 * scale}"/>`,
    `<circle cx="${(x - r * 0.4)}" cy="${(y - r * 0.3)}" r="${r * 0.7}" fill="${fill}" opacity="0.7"/>`,
    `<circle cx="${(x + r * 0.4)}" cy="${(y - r * 0.3)}" r="${r * 0.7}" fill="${fill}" opacity="0.7"/>`,
    `</g>`,
  ].join('');
}

export function renderEntouragePerson(x: number, y: number, scale = 1, printMode = false): string {
  const fill = printMode ? '#cbd5e1' : '#1e293b';
  const h = 16 * scale;
  return [
    `<g opacity="0.4">`,
    `<circle cx="${x}" cy="${(y - h)}" r="${3 * scale}" fill="${fill}"/>`,
    `<line x1="${x}" y1="${(y - h + 3 * scale)}" x2="${x}" y2="${(y - h * 0.3)}" stroke="${fill}" stroke-width="${1.5 * scale}" stroke-linecap="round"/>`,
    `<line x1="${x}" y1="${(y - h * 0.5)}" x2="${(x - 4 * scale)}" y2="${(y - h * 0.2)}" stroke="${fill}" stroke-width="${1.2 * scale}" stroke-linecap="round"/>`,
    `<line x1="${x}" y1="${(y - h * 0.5)}" x2="${(x + 4 * scale)}" y2="${(y - h * 0.2)}" stroke="${fill}" stroke-width="${1.2 * scale}" stroke-linecap="round"/>`,
    `<line x1="${x}" y1="${(y - h * 0.3)}" x2="${(x - 3 * scale)}" y2="${y}" stroke="${fill}" stroke-width="${1.5 * scale}" stroke-linecap="round"/>`,
    `<line x1="${x}" y1="${(y - h * 0.3)}" x2="${(x + 3 * scale)}" y2="${y}" stroke="${fill}" stroke-width="${1.5 * scale}" stroke-linecap="round"/>`,
    `</g>`,
  ].join('');
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── SVG Legend box ─────────────────────────────────────
export interface LegendItem {
  color: string;
  label: string;
  dash?: string;
}

export function renderLegend(items: LegendItem[], x: number, y: number, title: string = 'LEGEND', vp?: Viewport): string {
  const parts: string[] = [];
  const printMode = vp?.printMode ?? false;
  const w = 140;
  const rowH = 16;
  const h = 20 + items.length * rowH;
  const bg = printMode ? '#f8fafc' : '#0b1220';
  const border = printMode ? '#cbd5e1' : '#24324b';
  const headerFill = printMode ? '#1e293b' : '#e2e8f0';
  const textFill = printMode ? '#475569' : '#94a3b8';
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}" stroke="${border}" stroke-width="1" rx="3"/>`);
  parts.push(`<text x="${x + w / 2}" y="${y + 14}" fill="${headerFill}" font-size="9" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${title}</text>`);
  items.forEach((item, i) => {
    const ry = y + 20 + i * rowH;
    const dash = item.dash ? `stroke-dasharray="${item.dash}"` : '';
    parts.push(`<line x1="${x + 8}" y1="${ry + 6}" x2="${x + 28}" y2="${ry + 6}" stroke="${item.color}" stroke-width="2.5" ${dash}/>`);
    parts.push(`<text x="${x + 34}" y="${ry + 10}" fill="${textFill}" font-size="8" font-family="Arial,Helvetica,sans-serif">${item.label}</text>`);
  });
  return parts.join('');
}
