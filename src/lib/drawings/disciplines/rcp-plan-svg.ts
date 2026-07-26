/**
 * Reflected Ceiling Plan (RCP) SVG Generator
 * Discipline: Architectural (A)
 *
 * Renders: ceiling grid (600×600mm suspended or plasterboard),
 *          light fixture positions aligned to rooms, ceiling type notes
 *
 * PROVENANCE: Ceiling grids and fixture placement are rules-based inferences.
 */
import type { CadDocument } from '@/domain/ws6-types';
import type { TitleBlockMeta } from '../title-block';
import { CEILING_ASSUMED_PROVENANCE } from '@/domain/drawing-provenance';
import {
  computeViewport, startSvg, endSvg, renderWalls,
  renderOverallDimensions, renderProvenanceNote,
  renderDrawingTitle, renderLegend, SCALE,
  type LegendItem,
} from './svg-shared';

export function buildRcpPlanSvg(
  cad: CadDocument,
  floorId?: string,
  titleMeta?: TitleBlockMeta,
  printMode = false,
): string {
  const floor = cad.floors.find((f) => f.id === floorId) ?? cad.floors[0];
  if (!floor) return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="200" y="100" fill="#94a3b8" text-anchor="middle">No floor data</text></svg>';

  const walls = cad.walls.filter((w) => w.floorId === floor.id);
  const blocks = cad.blocks.filter((b) => b.floorId === floor.id);
  const lights = blocks.filter((b) => b.kind === 'light');
  const boundaries = cad.boundaries || [];

  const vp = computeViewport(walls, boundaries, !!titleMeta, printMode);
  const parts: string[] = [startSvg(vp)];

  // ── Ceiling grid (600×600mm = 0.6m) ──
  const gridSpacing = 0.6 * SCALE;
  parts.push('<g stroke="#1e293b" stroke-width="0.5">');
  for (let gx = 0; gx <= vp.w; gx += gridSpacing) {
    parts.push(`<line x1="${gx.toFixed(1)}" y1="0" x2="${gx.toFixed(1)}" y2="${vp.h}"/>`);
  }
  for (let gy = 0; gy <= vp.h; gy += gridSpacing) {
    parts.push(`<line x1="0" y1="${gy.toFixed(1)}" x2="${vp.w}" y2="${gy.toFixed(1)}"/>`);
  }
  parts.push('</g>');

  // ── Walls (subdued, as reference) ──
  parts.push(renderWalls(walls, vp, cad.materialSystem, { colorOverride: '#334155', opacityOverride: 0.5 }));

  // ── Light fixtures ──
  for (const light of lights) {
    const cx = vp.px(light.position);
    const cy = vp.py(light.position);
    // Recessed downlight symbol (muted palette)
    const lightColor = printMode ? '#64748b' : '#475569';
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="none" stroke="${lightColor}" stroke-width="1.5"/>`);
    parts.push(`<line x1="${(cx - 4).toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + 4).toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${lightColor}" stroke-width="1"/>`);
    parts.push(`<line x1="${cx.toFixed(1)}" y1="${(cy - 4).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(cy + 4).toFixed(1)}" stroke="${lightColor}" stroke-width="1"/>`);
  }

  // If no lights placed, infer centered light per room area (very rough)
  if (lights.length === 0 && walls.length > 0) {
    const xs = walls.flatMap((w) => [w.start.x, w.end.x]);
    const ys = walls.flatMap((w) => [w.start.y, w.end.y]);
    const cx = vp.px({ x: (Math.min(...xs) + Math.max(...xs)) / 2, y: 0 });
    const cy = vp.py({ x: 0, y: (Math.min(...ys) + Math.max(...ys)) / 2 });
    const lightColor = printMode ? '#64748b' : '#475569';
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="none" stroke="${lightColor}" stroke-width="1.5" stroke-dasharray="3 3"/>`);
    parts.push(`<text x="${cx.toFixed(1)}" y="${(cy + 14).toFixed(1)}" fill="${lightColor}" font-size="7" text-anchor="middle" font-style="italic" font-family="Arial,Helvetica,sans-serif">INFERRED</text>`);
  }

  // ── Ceiling type note ──
  parts.push(`<text x="${vp.w - 10}" y="${vp.h - 30}" fill="#94a3b8" font-size="8" text-anchor="end" font-family="Arial,Helvetica,sans-serif">CEILING TYPE: SUSPENDED T-BAR (600×600)</text>`);
  parts.push(`<text x="${vp.w - 10}" y="${vp.h - 20}" fill="#64748b" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">Wet areas: Moisture-resistant plasterboard</text>`);

  // ── Dimensions ──
  parts.push(renderOverallDimensions(vp));

  // ── Legend ──
  const legendColor = printMode ? '#64748b' : '#475569';
  const legendItems: LegendItem[] = [
    { color: '#1e293b', label: 'Ceiling grid (600×600)' },
    { color: legendColor, label: 'Recessed downlight' },
    { color: '#334155', label: 'Wall (reference)' },
  ];
  parts.push(renderLegend(legendItems, vp.w - 160, 40));

  // ── Provenance ──
  parts.push(renderProvenanceNote(CEILING_ASSUMED_PROVENANCE, 8, vp.h - 14));

  // ── Title ──
  parts.push(renderDrawingTitle(`Reflected Ceiling Plan — ${floor.name}`, 'Rules-based layout — not coordination-grade', vp));

  return endSvg(parts, vp, titleMeta);
}
