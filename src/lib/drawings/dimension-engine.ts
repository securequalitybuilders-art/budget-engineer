import type { Vec2 } from '@/domain/ws6-types';
import { LW } from './lineweights';

const DIM_OFFSET = 20;
const DIM_TICK = 5;
const DIM_FONT_SIZE = 7;
const CLUTTER_THRESHOLD = 18;

function esc(s: string | number): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmt(n: number): string {
  return n.toFixed(1);
}

function dimColor(printMode = false): string {
  return printMode ? '#475569' : '#94a3b8';
}

function dimTextColor(printMode = false): string {
  return printMode ? '#1e293b' : '#cbd5e1';
}

function baseOffset(vp: { h: number; w: number }, side: 'top' | 'bottom' | 'left' | 'right'): number {
  if (side === 'bottom') return vp.h - 10;
  if (side === 'top') return 10;
  if (side === 'left') return 10;
  return vp.w - 10;
}

export function renderDimLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  offset = DIM_OFFSET,
  printMode = false,
  opts?: { flip?: boolean },
): string {
  const parts: string[] = [];
  const isVert = Math.abs(x1 - x2) < 0.1;
  const sign = opts?.flip ? -1 : 1;
  let dx = 0;
  let dy = 0;
  if (isVert) {
    dx = offset * sign;
  } else {
    dy = -offset * sign;
  }
  const lx1 = x1 + dx;
  const ly1 = y1 + dy;
  const lx2 = x2 + dx;
  const ly2 = y2 + dy;
  const col = dimColor(printMode);
  const tCol = dimTextColor(printMode);
  parts.push(`<g>`);
  parts.push(`<line x1="${fmt(lx1)}" y1="${fmt(ly1)}" x2="${fmt(lx2)}" y2="${fmt(ly2)}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`);
  parts.push(`<line x1="${fmt(lx1 - DIM_TICK)}" y1="${fmt(ly1 + DIM_TICK)}" x2="${fmt(lx1 + DIM_TICK)}" y2="${fmt(ly1 - DIM_TICK)}" stroke="${tCol}" stroke-width="1.5"/>`);
  parts.push(`<line x1="${fmt(lx2 - DIM_TICK)}" y1="${fmt(ly2 + DIM_TICK)}" x2="${fmt(lx2 + DIM_TICK)}" y2="${fmt(ly2 - DIM_TICK)}" stroke="${tCol}" stroke-width="1.5"/>`);
  const cx = (lx1 + lx2) / 2;
  const cy = (ly1 + ly2) / 2;
  if (isVert) {
    parts.push(`<text x="${fmt(cx - 6)}" y="${fmt(cy + 3)}" fill="${tCol}" font-size="${DIM_FONT_SIZE}" text-anchor="middle" transform="rotate(-90 ${cx} ${cy})" font-family="Arial,Helvetica,sans-serif">${esc(label)}</text>`);
  } else {
    parts.push(`<text x="${fmt(cx)}" y="${fmt(cy - 4)}" fill="${tCol}" font-size="${DIM_FONT_SIZE}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(label)}</text>`);
  }
  parts.push(`</g>`);
  return parts.join('');
}

export function renderWitnessLine(
  x1: number, y1: number, x2: number, y2: number,
  printMode = false,
): string {
  const col = dimColor(printMode);
  return `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}" stroke="${col}" stroke-width="${LW.GRID}" stroke-dasharray="2 2"/>`;
}

export function renderOverallDim(
  min: number,
  max: number,
  _fixed: number,
  isVert: boolean,
  side: 'top' | 'bottom' | 'left' | 'right',
  vp: { w: number; h: number },
  label: string,
  printMode = false,
): string {
  const off = 14;
  let x1: number; let y1: number; let x2: number; let y2: number;
  if (isVert) {
    const x = side === 'left' ? off : vp.w - off;
    x1 = x; y1 = baseOffset(vp, 'top') + min;
    x2 = x; y2 = baseOffset(vp, 'top') + max;
  } else {
    const y = side === 'top' ? off : vp.h - off;
    y1 = baseOffset(vp, 'left') + min; x1 = y;
    y2 = baseOffset(vp, 'left') + max; x2 = y;
  }
  return renderDimLine(x1, y1, x2, y2, label, 0, printMode);
}

export function renderChainDims(
  segments: { pos: number; label: string }[],
  basePos: number,
  isVert: boolean,
  offset: number,
  _side: 'top' | 'bottom' | 'left' | 'right',
  _vp: { w: number; h: number },
  printMode = false,
): string {
  const parts: string[] = [];
  const scratch: string[] = [];
  const sorted = [...segments].sort((a, b) => a.pos - b.pos);
  const fullDist = sorted.length >= 2 ? sorted[sorted.length - 1].pos - sorted[0].pos : 0;
  if (fullDist > 0.01) {
    scratch.push(renderDimLine(
      isVert ? basePos : basePos + sorted[0].pos,
      isVert ? basePos + sorted[0].pos : basePos,
      isVert ? basePos : basePos + sorted[sorted.length - 1].pos,
      isVert ? basePos + sorted[sorted.length - 1].pos : basePos,
      `${fullDist.toFixed(1)}m`,
      offset,
      printMode,
    ));
  }
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i].pos - sorted[i - 1].pos;
    if (d < CLUTTER_THRESHOLD * 0.05) continue;
    scratch.push(renderDimLine(
      isVert ? basePos : basePos + sorted[i - 1].pos,
      isVert ? basePos + sorted[i - 1].pos : basePos,
      isVert ? basePos : basePos + sorted[i].pos,
      isVert ? basePos + sorted[i].pos : basePos,
      `${d.toFixed(1)}m`,
      offset + 14,
      printMode,
    ));
  }
  parts.push(`<g>${scratch.join('')}</g>`);
  return parts.join('');
}

interface DimWallInfo {
  start: Vec2;
  end: Vec2;
  thickness: number;
  structural: boolean;
}

export function renderWallDims(
  walls: DimWallInfo[],
  vp: { w: number; h: number; px: (p: Vec2) => number; py: (p: Vec2) => number },
  printMode = false,
): string {
  const parts: string[] = [];
  const hWalls = walls.filter(w => Math.abs(w.end.y - w.start.y) < 0.1);
  const vWalls = walls.filter(w => Math.abs(w.end.x - w.start.x) < 0.1);
  if (hWalls.length > 0) {
    const xs = hWalls.flatMap(w => [w.start.x, w.end.x]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const bottomY = Math.min(...hWalls.map(w => w.start.y));
    const y1 = vp.py({ x: 0, y: bottomY });
    const x1 = vp.px({ x: minX, y: 0 });
    const x2 = vp.px({ x: maxX, y: 0 });
    parts.push(renderDimLine(x1, y1, x2, y1, `${(maxX - minX).toFixed(1)}m`, -14, printMode));
  }
  if (vWalls.length > 0) {
    const ys = vWalls.flatMap(w => [w.start.y, w.end.y]);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const leftX = Math.min(...vWalls.map(w => w.start.x));
    const x1 = vp.px({ x: leftX, y: 0 });
    const y1 = vp.py({ x: 0, y: minY });
    const y2 = vp.py({ x: 0, y: maxY });
    parts.push(renderDimLine(x1, y1, x1, y2, `${(maxY - minY).toFixed(1)}m`, -14, printMode));
  }
  return parts.join('');
}

export interface OpeningDimInfo {
  hostStart: Vec2;
  hostEnd: Vec2;
  offset: number;
  width: number;
  tag: string;
}

export function renderOpeningDims(
  openings: OpeningDimInfo[],
  vp: { px: (p: Vec2) => number; py: (p: Vec2) => number },
  printMode = false,
): string {
  const parts: string[] = [];
  for (const o of openings) {
    const dx = o.hostEnd.x - o.hostStart.x;
    const dy = o.hostEnd.y - o.hostStart.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) continue;
    const t = o.offset / len;
    const mx = o.hostStart.x + dx * t;
    const my = o.hostStart.y + dy * t;
    const perpX = -dy / len;
    const perpY = dx / len;
    const ppx = vp.px({ x: mx + perpX * 0.3, y: 0 });
    const ppy = vp.py({ x: 0, y: my + perpY * 0.3 });
    const off = 16;
    const sx = ppx + perpX * off;
    const sy = ppy + perpY * off;
    const ex = ppx + perpX * (off + o.width / 2);
    const ey = ppy + perpY * (off + o.width / 2);
    parts.push(renderDimLine(sx, sy, ex, ey, `${(o.width * 1000).toFixed(0)}mm`, 0, printMode));
  }
  return parts.join('');
}

export function renderFloorLevelMarker(
  elevation: number,
  name: string,
  x: number,
  y: number,
  printMode = false,
): string {
  const fill = printMode ? '#1e293b' : '#e2e8f0';
  const stroke = printMode ? '#0f172a' : '#94a3b8';
  return [
    `<g>`,
    `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="7" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
    `<line x1="${fmt(x - 8)}" y1="${fmt(y)}" x2="${fmt(x + 8)}" y2="${fmt(y)}" stroke="${stroke}" stroke-width="1.5"/>`,
    `<line x1="${fmt(x)}" y1="${fmt(y - 7)}" x2="${fmt(x)}" y2="${fmt(y + 7)}" stroke="${stroke}" stroke-width="0.75"/>`,
    `<text x="${fmt(x + 12)}" y="${fmt(y + 3)}" fill="${fill}" font-size="8" font-family="Arial,Helvetica,sans-serif">+${elevation.toFixed(2)} ${name}</text>`,
    `</g>`,
  ].join('');
}

export function renderStringDim(
  positions: number[],
  isVert: boolean,
  basePos: number,
  offset: number,
  printMode = false,
): string {
  const parts: string[] = [];
  const sorted = [...new Set(positions.map(p => Math.round(p * 100) / 100))].sort((a, b) => a - b);
  if (sorted.length < 2) return '';

  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i] - prev;
    const label = `${(d).toFixed(1)}m`;
    let x1, y1, x2, y2: number;
    if (isVert) {
      x1 = basePos + offset; y1 = basePos + prev;
      x2 = basePos + offset; y2 = basePos + sorted[i];
    } else {
      x1 = basePos + prev; y1 = basePos - offset;
      x2 = basePos + sorted[i]; y2 = basePos - offset;
    }
    parts.push(renderDimLine(x1, y1, x2, y2, label, 0, printMode));
    prev = sorted[i];
  }
  return parts.join('');
}

export function renderRunningDim(
  positions: number[],
  isVert: boolean,
  basePos: number,
  offset: number,
  printMode = false,
): string {
  const parts: string[] = [];
  const sorted = [...new Set(positions.map(p => Math.round(p * 100) / 100))].sort((a, b) => a - b);
  if (sorted.length < 2) return '';

  const col = dimColor(printMode);
  const tCol = dimTextColor(printMode);
  const ref = sorted[0];

  for (const p of sorted) {
    const d = p - ref;
    const label = d < 0.01 ? '0.0' : `${d.toFixed(1)}m`;
    let line: string;
    if (isVert) {
      const x = basePos + offset;
      const y = basePos + p;
      line = `<line x1="${fmt(x - 3)}" y1="${fmt(y)}" x2="${fmt(x + 3)}" y2="${fmt(y)}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`;
      if (d > 0.01) {
        line += `<text x="${fmt(x + 6)}" y="${fmt(y + 3)}" fill="${tCol}" font-size="7" font-family="Arial,Helvetica,sans-serif">${esc(label)}</text>`;
      }
    } else {
      const x = basePos + p;
      const y = basePos - offset;
      line = `<line x1="${fmt(x)}" y1="${fmt(y - 3)}" x2="${fmt(x)}" y2="${fmt(y + 3)}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`;
      if (d > 0.01) {
        line += `<text x="${fmt(x)}" y="${fmt(y - 4)}" fill="${tCol}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(label)}</text>`;
      }
    }
    parts.push(line);
  }

  if (sorted.length >= 2) {
    const total = sorted[sorted.length - 1] - ref;
    if (isVert) {
      parts.push(`<line x1="${fmt(basePos + offset)}" y1="${fmt(basePos + ref)}" x2="${fmt(basePos + offset)}" y2="${fmt(basePos + sorted[sorted.length - 1])}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`);
    } else {
      parts.push(`<line x1="${fmt(basePos + ref)}" y1="${fmt(basePos - offset)}" x2="${fmt(basePos + sorted[sorted.length - 1])}" y2="${fmt(basePos - offset)}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`);
    }
    parts.push(renderDimLine(
      isVert ? basePos + offset : basePos + ref,
      isVert ? basePos + ref : basePos - offset,
      isVert ? basePos + offset : basePos + sorted[sorted.length - 1],
      isVert ? basePos + sorted[sorted.length - 1] : basePos - offset,
      `${total.toFixed(1)}m`, 0, printMode,
    ));
  }

  return parts.join('');
}

export function renderMultiChainDims(
  chains: { positions: number[]; offset: number }[],
  isVert: boolean,
  basePos: number,
  printMode = false,
): string {
  return chains.map(ch => {
    if (isVert) {
      return renderWallChainVert(basePos, ch.positions, ch.offset, printMode);
    }
    return renderWallChainHoriz(basePos, ch.positions, ch.offset, printMode);
  }).join('');
}

function renderWallChainHoriz(
  baseY: number,
  positions: number[],
  offset: number,
  printMode = false,
): string {
  const parts: string[] = [];
  const sorted = [...new Set(positions.map(p => Math.round(p * 100) / 100))].sort((a, b) => a - b);
  if (sorted.length < 2) return '';

  const col = dimColor(printMode);
  const tCol = dimTextColor(printMode);
  const y = baseY - offset;

  for (const p of sorted) {
    parts.push(`<line x1="${fmt(basePos(p))}" y1="${fmt(y)}" x2="${fmt(basePos(p))}" y2="${fmt(y + 4)}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`);
    parts.push(`<line x1="${fmt(basePos(p))}" y1="${fmt(y + 4)}" x2="${fmt(basePos(p))}" y2="${fmt(y - 6)}" stroke="${col}" stroke-width="${LW.GRID}" stroke-dasharray="2 2"/>`);
  }

  for (let wallIdx = 0; wallIdx < sorted.length; wallIdx++) {
    const p = sorted[wallIdx];
    parts.push(`<circle cx="${fmt(basePos(p))}" cy="${fmt(y + 2)}" r="1.5" fill="${col}"/>`);
  }

  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i] - sorted[i - 1];
    if (d < 0.5) continue;
    const label = `${d.toFixed(1)}m`;
    const cx = (basePos(sorted[i - 1]) + basePos(sorted[i])) / 2;
    parts.push(`<line x1="${fmt(basePos(sorted[i - 1]))}" y1="${fmt(y)}" x2="${fmt(basePos(sorted[i]))}" y2="${fmt(y)}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`);
    parts.push(`<text x="${fmt(cx)}" y="${fmt(y - 4)}" fill="${tCol}" font-size="${DIM_FONT_SIZE}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${label}</text>`);
  }

  return `<g>${parts.join('')}</g>`;

  function basePos(coord: number): number {
    return baseY > 0 ? baseY + coord : 0;
  }
}

function renderWallChainVert(
  baseX: number,
  positions: number[],
  offset: number,
  printMode = false,
): string {
  const parts: string[] = [];
  const sorted = [...new Set(positions.map(p => Math.round(p * 100) / 100))].sort((a, b) => a - b);
  if (sorted.length < 2) return '';

  const col = dimColor(printMode);
  const tCol = dimTextColor(printMode);
  const x = baseX + offset;

  for (const p of sorted) {
    parts.push(`<line x1="${fmt(x)}" y1="${fmt(basePos(p))}" x2="${fmt(x - 4)}" y2="${fmt(basePos(p))}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`);
    parts.push(`<line x1="${fmt(x - 4)}" y1="${fmt(basePos(p))}" x2="${fmt(x + 6)}" y2="${fmt(basePos(p))}" stroke="${col}" stroke-width="${LW.GRID}" stroke-dasharray="2 2"/>`);
  }

  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i] - sorted[i - 1];
    if (d < 0.5) continue;
    const label = `${d.toFixed(1)}m`;
    const cy = (basePos(sorted[i - 1]) + basePos(sorted[i])) / 2;
    parts.push(`<line x1="${fmt(x)}" y1="${fmt(basePos(sorted[i - 1]))}" x2="${fmt(x)}" y2="${fmt(basePos(sorted[i]))}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`);
    parts.push(`<text x="${fmt(x + 6)}" y="${fmt(cy + 3)}" fill="${tCol}" font-size="${DIM_FONT_SIZE}" font-family="Arial,Helvetica,sans-serif">${label}</text>`);
  }

  return `<g>${parts.join('')}</g>`;

  function basePos(coord: number): number {
    return baseX > 0 ? baseX + coord : 0;
  }
}

// ── Dimension hierarchy helpers ──
export type DimPurpose = 'overall' | 'setting-out' | 'internal-room' | 'opening' | 'site' | 'grid';

export function renderPurposeLabel(purpose: DimPurpose, printMode = false): string {
  const labels: Record<DimPurpose, string> = {
    'overall': 'OVERALL',
    'setting-out': 'SETTING OUT',
    'internal-room': 'INTERNAL',
    'opening': 'OPENING',
    'site': 'SITE',
    'grid': 'GRID',
  };
  const col = printMode ? '#94a3b8' : '#64748b';
  return `<text fill="${col}" font-size="5" font-family="Arial,Helvetica,sans-serif">[${labels[purpose]}]</text>`;
}

// ── Grid-aligned setting-out dimensions ──
export function renderGridDimLine(
  startPx: number, startPy: number,
  endPx: number, endPy: number,
  label: string,
  offset: number,
  printMode = false,
): string {
  return renderDimLine(startPx, startPy, endPx, endPy, label, offset, printMode);
}

export function renderCoordinatedGridDims(
  gridPositions: number[],
  isVert: boolean,
  origin: number,
  vp: { px: (p: Vec2) => number; py: (p: Vec2) => number; w: number; h: number },
  side: 'top' | 'bottom' | 'left' | 'right',
  printMode = false,
): string {
  const parts: string[] = [];
  const sorted = [...gridPositions].sort((a, b) => a - b);
  if (sorted.length < 2) return '';

  const off = side === 'bottom' || side === 'right' ? 24 : 24;
  const col = dimColor(printMode);
  const tCol = dimTextColor(printMode);

  // Runner line
  let lx1: number, ly1: number, lx2: number, ly2: number;
  if (isVert) {
    const x = vp.px({ x: origin, y: 0 }) + (side === 'right' ? off : -off);
    ly1 = vp.py({ x: 0, y: sorted[0] });
    ly2 = vp.py({ x: 0, y: sorted[sorted.length - 1] });
    lx1 = lx2 = x;
  } else {
    const y = vp.py({ x: 0, y: origin }) + (side === 'bottom' ? off : -off);
    lx1 = vp.px({ x: sorted[0], y: 0 });
    lx2 = vp.px({ x: sorted[sorted.length - 1], y: 0 });
    ly1 = ly2 = y;
  }
  parts.push(`<line x1="${fmt(lx1)}" y1="${fmt(ly1)}" x2="${fmt(lx2)}" y2="${fmt(ly2)}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`);

  for (const pos of sorted) {
    let px: number, py: number;
    if (isVert) {
      px = lx1;
      py = vp.py({ x: 0, y: pos });
    } else {
      px = vp.px({ x: pos, y: 0 });
      py = ly1;
    }
    // Tick
    parts.push(`<line x1="${fmt(px - 3)}" y1="${fmt(py - 3)}" x2="${fmt(px + 3)}" y2="${fmt(py + 3)}" stroke="${tCol}" stroke-width="1.5"/>`);
    const d = pos - sorted[0];
    if (d > 0.01) {
      const label = `${d.toFixed(1)}m`;
      if (isVert) {
        parts.push(`<text x="${fmt(px + (side === 'right' ? 6 : -14))}" y="${fmt(py + 3)}" fill="${tCol}" font-size="6" font-family="Arial,Helvetica,sans-serif">${esc(label)}</text>`);
      } else {
        parts.push(`<text x="${fmt(px)}" y="${fmt(py + (side === 'bottom' ? 14 : -6))}" fill="${tCol}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(label)}</text>`);
      }
    }
  }
  return `<g>${parts.join('')}</g>`;
}

// ── Angular dimension for non-orthogonal walls ──
export function renderAngularDim(
  start: Vec2, mid: Vec2, end: Vec2,
  vp: { px: (p: Vec2) => number; py: (p: Vec2) => number },
  printMode = false,
): string {
  const col = dimColor(printMode);
  const tCol = dimTextColor(printMode);
  const sx = vp.px(start), sy = vp.py(start);
  const mx = vp.px(mid), my = vp.py(mid);
  const ex = vp.px(end), ey = vp.py(end);
  const a1 = Math.atan2(sy - my, sx - mx);
  const a2 = Math.atan2(ey - my, ex - mx);
  let angle = Math.abs(a2 - a1) * (180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  const r = 20;
  const steps = 12;
  const arc: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a1 + (a2 - a1) * t;
    arc.push(`${fmt(mx + r * Math.cos(a))},${fmt(my + r * Math.sin(a))}`);
  }
  const parts: string[] = [];
  parts.push(`<polyline points="${arc.join(' ')}" fill="none" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`);
  const midA = (a1 + a2) / 2;
  const labelX = mx + (r + 10) * Math.cos(midA);
  const labelY = my + (r + 10) * Math.sin(midA);
  parts.push(`<text x="${fmt(labelX)}" y="${fmt(labelY + 3)}" fill="${tCol}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${angle.toFixed(1)}°</text>`);
  return `<g>${parts.join('')}</g>`;
}

// ── Section height dimensions ──
export function renderSectionHeightDims(
  levels: { z: number; label: string }[],
  x: number,
  vp: { py: (p: Vec2) => number; w: number; h: number },
  printMode = false,
): string {
  const parts: string[] = [];
  const col = dimColor(printMode);
  const tCol = dimTextColor(printMode);
  if (levels.length < 2) return '';
  const sorted = [...levels].sort((a, b) => a.z - b.z);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const y1 = vp.py({ x: 0, y: prev.z });
    const y2 = vp.py({ x: 0, y: curr.z });
    const d = (curr.z - prev.z);
    parts.push(`<line x1="${fmt(x)}" y1="${fmt(y1)}" x2="${fmt(x)}" y2="${fmt(y2)}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`);
    parts.push(`<line x1="${fmt(x - 4)}" y1="${fmt(y1)}" x2="${fmt(x + 4)}" y2="${fmt(y1)}" stroke="${tCol}" stroke-width="1.5"/>`);
    parts.push(`<line x1="${fmt(x - 4)}" y1="${fmt(y2)}" x2="${fmt(x + 4)}" y2="${fmt(y2)}" stroke="${tCol}" stroke-width="1.5"/>`);
    const midY = (y1 + y2) / 2;
    parts.push(`<text x="${fmt(x - 8)}" y="${fmt(midY + 3)}" fill="${tCol}" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">${d.toFixed(2)}m</text>`);
  }
  return `<g>${parts.join('')}</g>`;
}

// ── Internal room dimensions from walls ──
export function renderRoomInternalDims(
  rooms: { id: string; label: string; centroid: Vec2; minX: number; maxX: number; minY: number; maxY: number }[],
  vp: { px: (p: Vec2) => number; py: (p: Vec2) => number },
  printMode = false,
): string {
  const parts: string[] = [];

  for (const room of rooms) {
    const wDim = room.maxX - room.minX;
    const hDim = room.maxY - room.minY;
    if (wDim < 0.5 || hDim < 0.5) continue;

    // Horizontal dimension below room
    const botY = vp.py({ x: 0, y: room.minY }) + 10;
    parts.push(renderDimLine(
      vp.px({ x: room.minX, y: 0 }), botY,
      vp.px({ x: room.maxX, y: 0 }), botY,
      `${wDim.toFixed(1)}m`, 0, printMode,
    ));
    // Vertical dimension beside room
    const rightX = vp.px({ x: room.maxX, y: 0 }) + 10;
    parts.push(renderDimLine(
      rightX, vp.py({ x: 0, y: room.minY }),
      rightX, vp.py({ x: 0, y: room.maxY }),
      `${hDim.toFixed(1)}m`, 0, printMode,
    ));
  }

  return `<g>${parts.join('')}</g>`;
}

export function renderSiteSetbackDims(
  buildingMinX: number, _buildingMaxX: number,
  buildingMinY: number, buildingMaxY: number,
  boundaryMinX: number, _boundaryMaxX: number,
  _boundaryMinY: number, _boundaryMaxY: number,
  vp: { px: (p: Vec2) => number; py: (p: Vec2) => number; w: number; h: number },
  printMode = false,
): string {
  const parts: string[] = [];
  const col = dimColor(printMode);
  const tCol = dimTextColor(printMode);

  const leftSetback = buildingMinX - boundaryMinX;

  if (leftSetback > 0.01) {
    const x = (vp.px({ x: boundaryMinX, y: 0 }) + vp.px({ x: buildingMinX, y: 0 })) / 2;
    const y = vp.py({ x: 0, y: (buildingMinY + buildingMaxY) / 2 });
    parts.push(`<text x="${fmt(x)}" y="${fmt(y)}" fill="${tCol}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${leftSetback.toFixed(1)}m</text>`);
    parts.push(`<line x1="${fmt(vp.px({ x: boundaryMinX, y: 0 }))}" y1="${fmt(y + 8)}" x2="${fmt(vp.px({ x: buildingMinX, y: 0 }))}" y2="${fmt(y + 8)}" stroke="${col}" stroke-width="${LW.DIMENSION}" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/>`);
  }

  return parts.join('');
}
