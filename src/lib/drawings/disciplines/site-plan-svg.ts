/**
 * Site Plan SVG Generator
 * Discipline: Architectural / Civil (A/C)
 *
 * Renders: property boundary, setback lines, building footprint hatch,
 *          north arrow, stand/plot label, NGL notes, provenance caveats
 *
 * PROVENANCE: If boundary is inferred (boundaryMode === 'assumed'),
 * output includes a visible disclaimer. This is NOT a cadastral survey.
 */
import type { CadDocument, Vec2 } from '@/domain/ws6-types';
import type { TitleBlockMeta } from '../title-block';
import { SITE_ASSUMED_PROVENANCE } from '@/domain/drawing-provenance';
import {
  computeViewport, startSvg, endSvg,
  renderProvenanceNote,
  renderDrawingTitle, renderLegend,
  SCALE, type LegendItem,
} from './svg-shared';
import { renderScaleBar, renderNorthArrow } from '../annotation-engine';
import { renderSiteSetbackDims } from '../dimension-engine';

export function buildSitePlanSvg(
  cad: CadDocument,
  titleMeta?: TitleBlockMeta,
  printMode = false,
): string {
  const walls = cad.walls.filter((w) => w.floorId === (cad.floors[0]?.id ?? ''));
  const boundaries = cad.boundaries || [];

  const vp = computeViewport(walls, boundaries, !!titleMeta, printMode);
  const parts: string[] = [startSvg(vp)];

  let hasAssumedBoundary = false;

  for (const bnd of boundaries) {
    const ptsStr = bnd.points.map((p) => `${vp.px(p as Vec2).toFixed(1)},${vp.py(p as Vec2).toFixed(1)}`).join(' ');
    const isAssumed = bnd.boundaryMode === 'assumed';
    if (isAssumed) hasAssumedBoundary = true;

    const dash = isAssumed ? '15 5 5 5' : '15 5';
    const color = isAssumed
      ? (printMode ? '#64748b' : '#f59e0b')
      : (printMode ? '#475569' : '#ef4444');
    parts.push(`<polygon points="${ptsStr}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="${dash}"/>`);

    // Corner markers
    for (const p of bnd.points) {
      const cx = vp.px(p as Vec2);
      const cy = vp.py(p as Vec2);
      parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="${color}" stroke="#0b1220" stroke-width="1"/>`);
    }
  }

  // If no boundary at all — draw a dashed setback rectangle (assumed)
  if (boundaries.length === 0 && walls.length > 0) {
    hasAssumedBoundary = true;
    const setback = Math.max(vp.maxX - vp.minX, vp.maxY - vp.minY) * 0.35;
    const bMinX = vp.minX - setback;
    const bMaxX = vp.maxX + setback;
    const bMinY = vp.minY - setback;
    const bMaxY = vp.maxY + setback;
    const corners = [
      { x: bMinX, y: bMinY }, { x: bMaxX, y: bMinY },
      { x: bMaxX, y: bMaxY }, { x: bMinX, y: bMaxY },
    ];
    // Re-render in expanded viewport — for simplicity we just draw the rect in current vp
    const ptsStr = corners.map((p) => `${vp.px(p).toFixed(1)},${vp.py(p).toFixed(1)}`).join(' ');
    parts.push(`<polygon points="${ptsStr}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="15 5 5 5"/>`);
    parts.push(`<text x="${vp.px(corners[0]).toFixed(1)}" y="${(vp.py(corners[0]) - 8).toFixed(1)}" fill="#f59e0b" font-size="8" font-family="Arial,Helvetica,sans-serif">ASSUMED BOUNDARY</text>`);
  }

  // ── Building footprint (hatched) ──
  if (walls.length > 0) {
    const xs = walls.flatMap((w) => [w.start.x, w.end.x]);
    const ys = walls.flatMap((w) => [w.start.y, w.end.y]);
    const fMinX = Math.min(...xs);
    const fMaxX = Math.max(...xs);
    const fMinY = Math.min(...ys);
    const fMaxY = Math.max(...ys);
    const fx = vp.px({ x: fMinX, y: 0 });
    const fy = vp.py({ x: 0, y: fMaxY });
    const fw = (fMaxX - fMinX) * SCALE;
    const fh = (fMaxY - fMinY) * SCALE;

    // Hatch pattern
    parts.push(`<defs><pattern id="site-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#475569" stroke-width="0.8"/></pattern></defs>`);
    parts.push(`<rect x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" width="${fw.toFixed(1)}" height="${fh.toFixed(1)}" fill="url(#site-hatch)" stroke="#94a3b8" stroke-width="2"/>`);
    parts.push(`<text x="${(fx + fw / 2).toFixed(1)}" y="${(fy + fh / 2 + 4).toFixed(1)}" fill="#e2e8f0" font-size="11" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">BUILDING FOOTPRINT</text>`);
  }

  // ── Setback lines (dashed, lighter) ──
  if (walls.length > 0) {
    const xs = walls.flatMap((w) => [w.start.x, w.end.x]);
    const ys = walls.flatMap((w) => [w.start.y, w.end.y]);
    const fMinX = Math.min(...xs);
    const fMaxX = Math.max(...xs);
    const fMinY = Math.min(...ys);
    const fMaxY = Math.max(...ys);
    const setbackM = 3; // 3m typical
    const sbCorners = [
      { x: fMinX - setbackM, y: fMinY - setbackM },
      { x: fMaxX + setbackM, y: fMinY - setbackM },
      { x: fMaxX + setbackM, y: fMaxY + setbackM },
      { x: fMinX - setbackM, y: fMaxY + setbackM },
    ];
    const sbStr = sbCorners.map((p) => `${vp.px(p).toFixed(1)},${vp.py(p).toFixed(1)}`).join(' ');
    parts.push(`<polygon points="${sbStr}" fill="none" stroke="#64748b" stroke-width="1" stroke-dasharray="6 4"/>`);
    parts.push(`<text x="${vp.px(sbCorners[1]).toFixed(1)}" y="${(vp.py(sbCorners[1]) - 4).toFixed(1)}" fill="#64748b" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">SETBACK LINE (${setbackM}m)</text>`);
  }

  // ── NGL note ──
  const nglFill = printMode ? '#475569' : '#94a3b8';
  parts.push(`<text x="${vp.w - 10}" y="${vp.h - 10}" fill="${nglFill}" font-size="9" text-anchor="end" font-family="Arial,Helvetica,sans-serif">NGL ±0.000</text>`);

  // ── North arrow ──
  const naX = vp.w - 40;
  const naY = 40;
  parts.push(renderNorthArrow(naX, naY, 'N', printMode));

  // ── Dimensions (site-setback + coordinated grid) ──
  if (walls.length > 0 && boundaries.length > 0) {
    const xs = walls.flatMap((w) => [w.start.x, w.end.x]);
    const ys = walls.flatMap((w) => [w.start.y, w.end.y]);
    const bPts = boundaries.flatMap(b => b.points as Vec2[]);
    const bXs = bPts.map(p => p.x);
    const bYs = bPts.map(p => p.y);
    parts.push(renderSiteSetbackDims(
      Math.min(...xs), Math.max(...xs),
      Math.min(...ys), Math.max(...ys),
      Math.min(...bXs), Math.max(...bXs),
      Math.min(...bYs), Math.max(...bYs),
      vp, printMode,
    ));
  }
  const dimLabelFill = printMode ? '#475569' : '#94a3b8';
  parts.push(`<text x="${(vp.w / 2).toFixed(0)}" y="${(vp.h - 8).toFixed(0)}" fill="${dimLabelFill}" font-size="12" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">${(vp.maxX - vp.minX).toFixed(1)} m</text>`);
  parts.push(`<text x="12" y="${(vp.h / 2).toFixed(0)}" fill="${dimLabelFill}" font-size="12" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" transform="rotate(-90 12 ${(vp.h / 2).toFixed(0)})">${(vp.maxY - vp.minY).toFixed(1)} m</text>`);

  // ── Scale bar ──
  parts.push(renderScaleBar(10, 8, vp.h - 130, SCALE, printMode));

  // ── Legend ──
  const legendItems: LegendItem[] = [
    { color: '#ef4444', label: 'Property boundary', dash: '15 5' },
    { color: '#64748b', label: 'Setback line', dash: '6 4' },
    { color: '#94a3b8', label: 'Building footprint' },
  ];
  if (hasAssumedBoundary) {
    legendItems.push({ color: '#f59e0b', label: 'Assumed boundary', dash: '15 5 5 5' });
  }
  parts.push(renderLegend(legendItems, 8, vp.h - 110, 'LEGEND', vp));

  // ── Provenance note ──
  if (hasAssumedBoundary) {
    parts.push(renderProvenanceNote(SITE_ASSUMED_PROVENANCE, 8, vp.h - 14));
  }

  // ── Title ──
  parts.push(renderDrawingTitle('Site Plan', 'Pre-design site layout — verify boundary with surveyor', vp));

  return endSvg(parts, vp, titleMeta);
}
