/**
 * Roof Plan SVG Generator
 * Discipline: Architectural (A)
 *
 * Renders: roof outline from footprint, ridge/hip/valley lines,
 *          slope arrows, gutter indication, downpipe markers
 *
 * PROVENANCE: Roof geometry is inferred from footprint unless
 * a dedicated roof model exists. Marked as derived.
 */
import type { CadDocument, Vec2 } from '@/domain/ws6-types';
import type { TitleBlockMeta } from '../title-block';
import { ROOF_DERIVED_PROVENANCE } from '@/domain/drawing-provenance';
import {
  computeViewport, startSvg, endSvg,
  renderOverallDimensions, renderProvenanceNote,
  renderDrawingTitle, renderLegend,
  type LegendItem,
} from './svg-shared';

export function buildRoofPlanSvg(
  cad: CadDocument,
  titleMeta?: TitleBlockMeta,
  printMode = false,
): string {
  const floor = cad.floors[0];
  if (!floor) return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="200" y="100" fill="#94a3b8" text-anchor="middle">No floor data</text></svg>';

  const walls = cad.walls.filter((w) => w.floorId === floor.id);
  const boundaries = cad.boundaries || [];

  const vp = computeViewport(walls, boundaries, !!titleMeta, printMode);
  const parts: string[] = [startSvg(vp)];

  // ── Compute building footprint ──
  const xs = walls.flatMap((w) => [w.start.x, w.end.x]);
  const ys = walls.flatMap((w) => [w.start.y, w.end.y]);
  if (xs.length === 0) {
    parts.push(`<text x="${vp.w / 2}" y="${vp.h / 2}" fill="#94a3b8" text-anchor="middle">No wall data for roof generation</text>`);
    return endSvg(parts, vp, titleMeta);
  }

  const fMinX = Math.min(...xs);
  const fMaxX = Math.max(...xs);
  const fMinY = Math.min(...ys);
  const fMaxY = Math.max(...ys);
  const eave = 0.4; // Eave overhang in metres

  // Roof outline (with eave overhang)
  const roofCorners: Vec2[] = [
    { x: fMinX - eave, y: fMinY - eave },
    { x: fMaxX + eave, y: fMinY - eave },
    { x: fMaxX + eave, y: fMaxY + eave },
    { x: fMinX - eave, y: fMaxY + eave },
  ];
  const roofStr = roofCorners.map((p) => `${vp.px(p).toFixed(1)},${vp.py(p).toFixed(1)}`).join(' ');
  parts.push(`<polygon points="${roofStr}" fill="#1e293b" opacity="0.5" stroke="#94a3b8" stroke-width="2.5"/>`);

  // ── Ridge line (center horizontal) ──
  const ridgeY = (fMinY + fMaxY) / 2;
  const ridgeStart: Vec2 = { x: fMinX - eave, y: ridgeY };
  const ridgeEnd: Vec2 = { x: fMaxX + eave, y: ridgeY };
  parts.push(`<line x1="${vp.px(ridgeStart).toFixed(1)}" y1="${vp.py(ridgeStart).toFixed(1)}" x2="${vp.px(ridgeEnd).toFixed(1)}" y2="${vp.py(ridgeEnd).toFixed(1)}" stroke="#e2e8f0" stroke-width="2.5"/>`);
  parts.push(`<text x="${vp.px({ x: (fMinX + fMaxX) / 2, y: ridgeY }).toFixed(1)}" y="${(vp.py({ x: 0, y: ridgeY }) - 6).toFixed(1)}" fill="#e2e8f0" font-size="8" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">RIDGE</text>`);

  // ── Hip lines (diagonal corners to ridge ends) ──
  const hipColor = '#d4a574';
  // Top-left to ridge start
  parts.push(`<line x1="${vp.px(roofCorners[0]).toFixed(1)}" y1="${vp.py(roofCorners[0]).toFixed(1)}" x2="${vp.px(ridgeStart).toFixed(1)}" y2="${vp.py(ridgeStart).toFixed(1)}" stroke="${hipColor}" stroke-width="1.5" stroke-dasharray="8 4"/>`);
  // Bottom-left to ridge start
  parts.push(`<line x1="${vp.px(roofCorners[3]).toFixed(1)}" y1="${vp.py(roofCorners[3]).toFixed(1)}" x2="${vp.px(ridgeStart).toFixed(1)}" y2="${vp.py(ridgeStart).toFixed(1)}" stroke="${hipColor}" stroke-width="1.5" stroke-dasharray="8 4"/>`);
  // Top-right to ridge end
  parts.push(`<line x1="${vp.px(roofCorners[1]).toFixed(1)}" y1="${vp.py(roofCorners[1]).toFixed(1)}" x2="${vp.px(ridgeEnd).toFixed(1)}" y2="${vp.py(ridgeEnd).toFixed(1)}" stroke="${hipColor}" stroke-width="1.5" stroke-dasharray="8 4"/>`);
  // Bottom-right to ridge end
  parts.push(`<line x1="${vp.px(roofCorners[2]).toFixed(1)}" y1="${vp.py(roofCorners[2]).toFixed(1)}" x2="${vp.px(ridgeEnd).toFixed(1)}" y2="${vp.py(ridgeEnd).toFixed(1)}" stroke="${hipColor}" stroke-width="1.5" stroke-dasharray="8 4"/>`);

  // ── Slope arrows ──
  const arrowColor = '#64748b';
  // Arrow pointing down from ridge (front)
  const arrowMidX = (fMinX + fMaxX) / 2;
  const arrowTopY = ridgeY + (fMaxY - ridgeY) * 0.4;
  const arrowBotY = ridgeY - (ridgeY - fMinY) * 0.4;
  parts.push(`<line x1="${vp.px({ x: arrowMidX, y: ridgeY }).toFixed(1)}" y1="${vp.py({ x: 0, y: ridgeY }).toFixed(1)}" x2="${vp.px({ x: arrowMidX, y: arrowTopY }).toFixed(1)}" y2="${vp.py({ x: 0, y: arrowTopY }).toFixed(1)}" stroke="${arrowColor}" stroke-width="1.5" marker-end="url(#slope-arrow)"/>`);
  parts.push(`<line x1="${vp.px({ x: arrowMidX, y: ridgeY }).toFixed(1)}" y1="${vp.py({ x: 0, y: ridgeY }).toFixed(1)}" x2="${vp.px({ x: arrowMidX, y: arrowBotY }).toFixed(1)}" y2="${vp.py({ x: 0, y: arrowBotY }).toFixed(1)}" stroke="${arrowColor}" stroke-width="1.5" marker-end="url(#slope-arrow)"/>`);
  // Slope note
  parts.push(`<text x="${vp.px({ x: arrowMidX + 0.5, y: arrowTopY }).toFixed(1)}" y="${vp.py({ x: 0, y: arrowTopY }).toFixed(1)}" fill="${arrowColor}" font-size="8" font-family="Arial,Helvetica,sans-serif">22.5° SLOPE</text>`);

  // Arrow marker definition
  parts.push(`<defs><marker id="slope-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="${arrowColor}"/></marker></defs>`);

  // ── Gutter indication (muted technical palette) ──
  const gutterColor = printMode ? '#64748b' : '#475569';
  const dpColor = printMode ? '#475569' : '#334155';
  parts.push(`<polygon points="${roofStr}" fill="none" stroke="${gutterColor}" stroke-width="1" stroke-dasharray="3 3"/>`);
  parts.push(`<text x="${vp.px(roofCorners[2]).toFixed(1)}" y="${(vp.py(roofCorners[2]) + 12).toFixed(1)}" fill="${gutterColor}" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">GUTTER</text>`);

  // ── Downpipe markers (at corners, muted) ──
  for (const corner of roofCorners) {
    const cx = vp.px(corner);
    const cy = vp.py(corner);
    const dpFill = printMode ? '#cbd5e1' : '#334155';
    const dpStroke = printMode ? '#475569' : '#64748b';
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="${dpFill}" stroke="${dpStroke}" stroke-width="1"/>`);
  }
  parts.push(`<text x="${(vp.px(roofCorners[0]) + 8).toFixed(1)}" y="${(vp.py(roofCorners[0]) - 6).toFixed(1)}" fill="${dpColor}" font-size="7" font-family="Arial,Helvetica,sans-serif">DP</text>`);

  // ── Dimensions ──
  parts.push(renderOverallDimensions(vp));

  // ── Legend ──
  const gutterLegendColor = printMode ? '#64748b' : '#475569';
  const legendItems: LegendItem[] = [
    { color: '#e2e8f0', label: 'Ridge' },
    { color: '#d4a574', label: 'Hip / valley', dash: '8 4' },
    { color: '#64748b', label: 'Slope direction' },
    { color: gutterLegendColor, label: 'Gutter / downpipe', dash: '3 3' },
  ];
  parts.push(renderLegend(legendItems, vp.w - 160, 40));

  // ── Provenance ──
  parts.push(renderProvenanceNote(ROOF_DERIVED_PROVENANCE, 8, vp.h - 14));

  // ── Title ──
  parts.push(renderDrawingTitle('Roof Plan', 'Inferred from building footprint — verify roof type with designer', vp));

  return endSvg(parts, vp, titleMeta);
}
