/**
 * Presentation Sheet SVG Generator
 * Discipline: Architectural (A)
 *
 * Renders a stylized presentation sheet with:
 * - Stricter layout grid with consistent margins
 * - Aligned isometric massing viewport
 * - Stronger title block placement
 * - Better use of negative space
 * - Muted professional palette (no bright blues)
 */
import type { CadDocument } from '@/domain/ws6-types';
import type { TitleBlockMeta } from '../title-block';
import { buildTitleBlock, TITLE_BLOCK_H } from '../title-block';

const SHEET_W = 840;
const SHEET_H = 594;
const MARGIN = 32;
const GRID_COLS = 12;
const COL_W = (SHEET_W - MARGIN * 2) / GRID_COLS;

function col(colIndex: number, subOffset = 0): number {
  return MARGIN + colIndex * COL_W + subOffset;
}

export function buildPresentationSvg(
  cad: CadDocument,
  titleMeta?: TitleBlockMeta,
): string {
  const svgH = SHEET_H + (titleMeta ? TITLE_BLOCK_H : 0);
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_W}" height="${svgH}" viewBox="0 0 ${SHEET_W} ${svgH}">`,
    `<rect width="${SHEET_W}" height="${svgH}" fill="#1e293b"/>`,
    // Grid margin guide (subtle)
    `<rect x="${MARGIN}" y="${MARGIN}" width="${SHEET_W - MARGIN * 2}" height="${SHEET_H - MARGIN * 2}" fill="none" stroke="#334155" stroke-width="0.5" stroke-dasharray="8 4" opacity="0.3"/>`,
  ];

  const titleX = col(0);
  const titleY = 56;

  // Title header
  parts.push(`<text x="${titleX}" y="${titleY}" fill="#f8fafc" font-size="22" font-family="'Space Grotesk','Inter',Arial,sans-serif" font-weight="bold" letter-spacing="1">CONCEPTUAL PRESENTATION</text>`);
  parts.push(`<text x="${titleX}" y="${titleY + 18}" fill="#94a3b8" font-size="11" font-family="Inter,Arial,sans-serif">Massing &amp; Typology Overview</text>`);

  // Separator line below header
  parts.push(`<line x1="${MARGIN}" y1="${titleY + 28}" x2="${SHEET_W - MARGIN}" y2="${titleY + 28}" stroke="#475569" stroke-width="0.5" opacity="0.4"/>`);

  // Typology badge (right-aligned, muted)
  const badgeX = col(9);
  const typology = 'Architectural';
  parts.push(`<rect x="${badgeX}" y="40" width="${COL_W * 2}" height="28" fill="#334155" rx="3"/>`);
  parts.push(`<text x="${badgeX + COL_W}" y="58" fill="#e2e8f0" font-size="11" font-weight="bold" text-anchor="middle" font-family="Inter,Arial,sans-serif" letter-spacing="2">${typology.toUpperCase()}</text>`);

  // ── Isometric massing viewport (centered, aligned) ──
  const isoScale = 11;
  const isoCx = SHEET_W / 2;
  const isoCy = SHEET_H / 2 + 40;

  parts.push(`<g stroke-linejoin="round">`);

  const walls = [...cad.walls].sort((a, b) => {
    const aMinY = Math.min(a.start.y, a.end.y);
    const bMinY = Math.min(b.start.y, b.end.y);
    return bMinY - aMinY;
  });

  const wallHeight = 2.8 * isoScale;

  for (const wl of walls) {
    const isoX = (p: { x: number; y: number }) => isoCx + (p.x - p.y) * 0.866 * isoScale;
    const isoY = (p: { x: number; y: number }, z = 0) => isoCy + (p.x + p.y) * 0.5 * isoScale - z;

    const x1 = isoX(wl.start);   const y1 = isoY(wl.start);
    const x2 = isoX(wl.end);     const y2 = isoY(wl.end);
    const x1t = isoX(wl.start);  const y1t = isoY(wl.start, wallHeight);
    const x2t = isoX(wl.end);    const y2t = isoY(wl.end, wallHeight);

    const color = wl.structural ? '#475569' : '#5b6a7a';
    parts.push(`<polygon points="${x1},${y1} ${x2},${y2} ${x2t},${y2t} ${x1t},${y1t}" fill="${color}" stroke="#1e293b" stroke-width="0.8" opacity="0.9"/>`);
  }
  parts.push(`</g>`);

  // ── Metrics panel (left-aligned, composed) ──
  const metricsX = col(0);
  const metricsY = SHEET_H - 90;
  parts.push(`<rect x="${metricsX}" y="${metricsY}" width="${COL_W * 3}" height="54" fill="#0f172a" stroke="#334155" stroke-width="0.8" rx="3"/>`);
  parts.push(`<text x="${metricsX + 12}" y="${metricsY + 18}" fill="#64748b" font-size="8" font-family="Inter,Arial,sans-serif" letter-spacing="1">PROJECT STATISTICS</text>`);

  const totalWalls = cad.walls.length;
  const totalOpenings = cad.openings.length;
  const totalBlocks = cad.blocks.length;
  parts.push(`<text x="${metricsX + 12}" y="${metricsY + 34}" fill="#94a3b8" font-size="10" font-family="Inter,Arial,sans-serif">WALLS: <tspan fill="#e2e8f0" font-weight="bold">${totalWalls}</tspan></text>`);
  parts.push(`<text x="${metricsX + COL_W * 1.2}" y="${metricsY + 34}" fill="#94a3b8" font-size="10" font-family="Inter,Arial,sans-serif">OPENINGS: <tspan fill="#e2e8f0" font-weight="bold">${totalOpenings}</tspan></text>`);
  parts.push(`<text x="${metricsX + 12}" y="${metricsY + 48}" fill="#94a3b8" font-size="10" font-family="Inter,Arial,sans-serif">BLOCKS: <tspan fill="#e2e8f0" font-weight="bold">${totalBlocks}</tspan></text>`);

  // ── Scale bar (aligned right) ──
  const scaleBarX = col(9);
  const scaleBarY = SHEET_H - 80;
  parts.push(`<line x1="${scaleBarX}" y1="${scaleBarY}" x2="${scaleBarX + 100}" y2="${scaleBarY}" stroke="#64748b" stroke-width="1"/>`);
  parts.push(`<line x1="${scaleBarX}" y1="${scaleBarY - 4}" x2="${scaleBarX}" y2="${scaleBarY + 4}" stroke="#64748b" stroke-width="1"/>`);
  parts.push(`<line x1="${scaleBarX + 50}" y1="${scaleBarY - 3}" x2="${scaleBarX + 50}" y2="${scaleBarY + 3}" stroke="#64748b" stroke-width="0.8"/>`);
  parts.push(`<line x1="${scaleBarX + 100}" y1="${scaleBarY - 4}" x2="${scaleBarX + 100}" y2="${scaleBarY + 4}" stroke="#64748b" stroke-width="1"/>`);
  parts.push(`<text x="${scaleBarX}" y="${scaleBarY + 14}" fill="#64748b" font-size="8" font-family="Inter,Arial,sans-serif">0</text>`);
  parts.push(`<text x="${scaleBarX + 50}" y="${scaleBarY + 14}" fill="#64748b" font-size="8" text-anchor="middle" font-family="Inter,Arial,sans-serif">5m</text>`);
  parts.push(`<text x="${scaleBarX + 100}" y="${scaleBarY + 14}" fill="#64748b" font-size="8" text-anchor="end" font-family="Inter,Arial,sans-serif">10m</text>`);

  // ── Title block at bottom ──
  if (titleMeta) {
    parts.push(buildTitleBlock(SHEET_W, svgH, titleMeta));
  }

  parts.push('</svg>');
  return parts.join('');
}
