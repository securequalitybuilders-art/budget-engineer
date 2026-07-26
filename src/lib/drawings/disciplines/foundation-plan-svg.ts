/**
 * Foundation Plan SVG Generator
 * Discipline: Structural (S)
 *
 * Renders: wall centerlines (dashed), merged closed-polygon strip/pad footings,
 *          clean junction handling at wall intersections, DPM/blinding notes,
 *          footing dimensions, below-ground edge distinction.
 *
 * PROVENANCE: Foundation geometry is derived from structural wall data.
 * Mark as pre-design structural assumption unless engineer-reviewed.
 */
import type { CadDocument } from '@/domain/ws6-types';
import type { TitleBlockMeta } from '../title-block';
import { STRUCTURAL_DERIVED_PROVENANCE } from '@/domain/drawing-provenance';
import { renderCoordinatedGridDims } from '../dimension-engine';
import {
  computeViewport, startSvg, endSvg, renderGrid, renderArchitecturalGrid,
  renderOverallDimensions, renderProvenanceNote,
  renderDrawingTitle, renderLegend, SCALE,
  type LegendItem,
} from './svg-shared';
import {
  buildMergedFootingPolygons,
  detectJunctions,
} from '../foundation-geometry';

export function buildFoundationPlanSvg(
  cad: CadDocument,
  _floorId?: string,
  titleMeta?: TitleBlockMeta,
  printMode = false,
): string {
  const floor = cad.floors[0];
  if (!floor) return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="200" y="100" fill="#94a3b8" text-anchor="middle">No floor data</text></svg>';

  const walls = cad.walls.filter((w) => w.floorId === floor.id);
  const blocks = cad.blocks.filter((b) => b.floorId === floor.id);
  const boundaries = cad.boundaries || [];
  const structuralWalls = walls.filter((w) => w.structural);
  const nonStructuralWalls = walls.filter((w) => !w.structural);
  const columns = blocks.filter((b) => b.kind === 'column');
  const footingBlocks = blocks.filter((b) => b.kind === 'footing');

  const vp = computeViewport(walls, boundaries, !!titleMeta, printMode);
  const parts: string[] = [startSvg(vp)];

  // Detect junctions for legend
  const junctions = detectJunctions(structuralWalls);

  // Background grid & Structural Grids
  parts.push(renderGrid(vp));
  parts.push(renderArchitecturalGrid(structuralWalls, vp));

  // ── Non-structural walls as dashed centerlines (light reference) ──
  for (const wl of nonStructuralWalls) {
    parts.push(
      `<line x1="${vp.px(wl.start).toFixed(1)}" y1="${vp.py(wl.start).toFixed(1)}" ` +
      `x2="${vp.px(wl.end).toFixed(1)}" y2="${vp.py(wl.end).toFixed(1)}" ` +
      `stroke="#334155" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="6 3" opacity="0.5"/>`
    );
  }

  // ── Structural wall centerlines (dashed, foundation reference) ──
  for (const wl of structuralWalls) {
    parts.push(
      `<line x1="${vp.px(wl.start).toFixed(1)}" y1="${vp.py(wl.start).toFixed(1)}" ` +
      `x2="${vp.px(wl.end).toFixed(1)}" y2="${vp.py(wl.end).toFixed(1)}" ` +
      `stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-dasharray="8 4" opacity="0.7"/>`
    );
  }

  // ── Merged closed-polygon strip footings ──
  const footingPolygons = buildMergedFootingPolygons(structuralWalls, 0.25);
  const printFill = printMode ? '#e2e8f0' : '#1e293b';
  const printStroke = printMode ? '#0f172a' : '#475569';
  for (const fp of footingPolygons) {
    parts.push(
      `<polygon points="${fp.points}" fill="${printFill}" stroke="${printStroke}" stroke-width="1.5" opacity="0.85" stroke-linejoin="round"/>`
    );
    parts.push(
      `<polygon points="${fp.points}" fill="url(#concrete-hatch)" opacity="0.4"/>`
    );
  }

  // ── Footing outline dashed border (extends slightly past polygon) ──
  for (const fp of footingPolygons) {
    parts.push(
      `<polygon points="${fp.points}" fill="none" stroke="#94a3b8" stroke-width="1" opacity="0.6" stroke-dasharray="4 4" stroke-linejoin="round"/>`
    );
  }

  // ── Junction markers (visual indication of merged footing intersections) ──
  for (const j of junctions) {
    if (j.connectedWalls.length > 1) {
      const jx = vp.px(j.point);
      const jy = vp.py(j.point);
      parts.push(
        `<circle cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" r="3" fill="none" stroke="${printStroke}" stroke-width="1" opacity="0.5"/>`
      );
    }
  }

  // ── Pad footings under columns (integrated with strip geometry) ──
  for (const col of columns) {
    const cx = vp.px(col.position);
    const cy = vp.py(col.position);
    const padW = (col.width * SCALE) + 16;
    const padD = ((col.depth ?? col.width) * SCALE) + 16;
    parts.push(
      `<rect x="${(cx - padW / 2).toFixed(1)}" y="${(cy - padD / 2).toFixed(1)}" ` +
      `width="${padW.toFixed(1)}" height="${padD.toFixed(1)}" ` +
      `fill="${printFill}" stroke="${printStroke}" stroke-width="1.5" stroke-linejoin="round" opacity="0.85"/>`
    );
    parts.push(
      `<rect x="${(cx - padW / 2).toFixed(1)}" y="${(cy - padD / 2).toFixed(1)}" ` +
      `width="${padW.toFixed(1)}" height="${padD.toFixed(1)}" ` +
      `fill="url(#concrete-hatch)" opacity="0.4"/>`
    );
    // Column above
    parts.push(
      `<rect x="${(cx - col.width * SCALE / 2).toFixed(1)}" y="${(cy - (col.depth ?? col.width) * SCALE / 2).toFixed(1)}" ` +
      `width="${(col.width * SCALE).toFixed(1)}" height="${((col.depth ?? col.width) * SCALE).toFixed(1)}" ` +
      `fill="#475569" stroke="#0f172a" stroke-width="1.5"/>`
    );
    const labelFill = printMode ? '#475569' : '#94a3b8';
    parts.push(
      `<text x="${cx.toFixed(1)}" y="${(cy + padD / 2 + 12).toFixed(1)}" fill="${labelFill}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">PAD FOOTING</text>`
    );
  }

  // ── Explicit footing blocks ──
  for (const fb of footingBlocks) {
    const bx = fb.position.x * SCALE + vp.ox;
    const by = vp.h - (fb.position.y * SCALE + vp.oy) - fb.depth * SCALE;
    parts.push(
      `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(fb.width * SCALE).toFixed(1)}" ` +
      `height="${(fb.depth * SCALE).toFixed(1)}" fill="${printFill}" stroke="${printStroke}" stroke-width="1.5" stroke-linejoin="round"/>`
    );
    parts.push(
      `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(fb.width * SCALE).toFixed(1)}" ` +
      `height="${(fb.depth * SCALE).toFixed(1)}" fill="url(#concrete-hatch)" opacity="0.4"/>`
    );
  }

  // ── Slab-on-grade indication ──
  if (structuralWalls.length > 0) {
    const xs = structuralWalls.flatMap((w) => [w.start.x, w.end.x]);
    const ys = structuralWalls.flatMap((w) => [w.start.y, w.end.y]);
    const slabFill = printMode ? '#f1f5f9' : '#0f172a';
    parts.push(
      `<rect x="${vp.px({ x: Math.min(...xs), y: 0 }).toFixed(1)}" ` +
      `y="${vp.py({ x: 0, y: Math.max(...ys) }).toFixed(1)}" ` +
      `width="${(Math.max(...xs) - Math.min(...xs)) * SCALE}" ` +
      `height="${(Math.max(...ys) - Math.min(...ys)) * SCALE}" ` +
      `fill="${slabFill}" opacity="0.3" pointer-events="none"/>`
    );
  }

  // ── Below-ground / hidden edge dashed line around slab extent ──
  if (structuralWalls.length > 0) {
    const hiddenColor = printMode ? '#94a3b8' : '#334155';
    for (const wl of structuralWalls) {
      const dx = wl.end.x - wl.start.x;
      const dy = wl.end.y - wl.start.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.01) continue;
      const perpX = -dy / len;
      const perpY = dx / len;
      const inset = 3;
      parts.push(
        `<line x1="${(vp.px(wl.start) + perpX * inset).toFixed(1)}" ` +
        `y1="${(vp.py(wl.start) + perpY * inset).toFixed(1)}" ` +
        `x2="${(vp.px(wl.end) + perpX * inset).toFixed(1)}" ` +
        `y2="${(vp.py(wl.end) + perpY * inset).toFixed(1)}" ` +
        `stroke="${hiddenColor}" stroke-width="0.75" stroke-dasharray="4 4" opacity="0.5"/>`
      );
    }
  }

  // ── Foundation section reference ──
  const secRefColor = printMode ? '#475569' : '#d4a574';
  parts.push(`<text x="${(vp.w / 2).toFixed(0)}" y="22" fill="${secRefColor}" font-size="9" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">SECTION A–A · SEE SHEET S-101 FOR FOUNDATION SECTION DETAIL</text>`);

  // ── Coordinated grid dimensions for foundation layout ──
  if (structuralWalls.length > 0) {
    const gridXs = Array.from(new Set(structuralWalls.flatMap(w => [Math.round(w.start.x * 10) / 10, Math.round(w.end.x * 10) / 10]))).sort((a, b) => a - b);
    const gridYs = Array.from(new Set(structuralWalls.flatMap(w => [Math.round(w.start.y * 10) / 10, Math.round(w.end.y * 10) / 10]))).sort((a, b) => a - b);
    if (gridXs.length >= 2) {
      parts.push(renderCoordinatedGridDims(gridXs, false, gridYs[0] || 0, vp, 'bottom', printMode));
    }
    if (gridYs.length >= 2) {
      parts.push(renderCoordinatedGridDims(gridYs, true, gridXs[0] || 0, vp, 'right', printMode));
    }
  }

  // ── Notes (strengthened with reinforcement and founding depth) ──
  const noteY = vp.h - 60;
  const noteColor = printMode ? '#64748b' : '#94a3b8';
  const noteText = printMode ? '#475569' : '#64748b';
  parts.push(`<text x="8" y="${noteY}" fill="${noteColor}" font-size="8" font-family="Arial,Helvetica,sans-serif">NOTES:</text>`);
  parts.push(`<text x="8" y="${noteY + 12}" fill="${noteText}" font-size="7" font-family="Arial,Helvetica,sans-serif">1. All footings to be placed on undisturbed soil or compacted fill.</text>`);
  parts.push(`<text x="8" y="${noteY + 22}" fill="${noteText}" font-size="7" font-family="Arial,Helvetica,sans-serif">2. 150mm compacted hardcore + DPM under ground floor slab.</text>`);
  parts.push(`<text x="8" y="${noteY + 32}" fill="${noteText}" font-size="7" font-family="Arial,Helvetica,sans-serif">3. Footing widths and depths are pre-design estimates — verify with structural engineer.</text>`);
  parts.push(`<text x="8" y="${noteY + 42}" fill="${noteText}" font-size="7" font-family="Arial,Helvetica,sans-serif">4. Reinforcement: A142 mesh (6mm @ 200c/c) in slab · T12 @ 150c/c in strip footings.</text>`);
  parts.push(`<text x="8" y="${noteY + 52}" fill="${noteText}" font-size="7" font-family="Arial,Helvetica,sans-serif">5. Founding depth: minimum 900mm below FFL to undisturbed bearing stratum.</text>`);
  parts.push(`<text x="8" y="${noteY + 62}" fill="${noteText}" font-size="7" font-family="Arial,Helvetica,sans-serif">6. Blinding: 50mm GEN1 concrete below all strip and pad footings.</text>`);

  // ── Legend ──
  const legendItems: LegendItem[] = [
    { color: '#94a3b8', label: 'Structural wall centerline', dash: '8 4' },
    { color: '#475569', label: 'Strip footing (merged polygon)' },
    { color: '#94a3b8', label: 'Footing outline', dash: '4 4' },
    { color: '#334155', label: 'Below-grade edge', dash: '4 4' },
    { color: '#475569', label: 'Reinforcement A142 / T12' },
  ];
  if (columns.length > 0) legendItems.push({ color: '#475569', label: 'Pad footing' });
  if (junctions.some(j => j.connectedWalls.length > 2)) {
    legendItems.push({ color: '#475569', label: 'Footing junction (merged)' });
  }
  parts.push(renderLegend(legendItems, vp.w - 200, 40));

  // ── Dimensions ──
  parts.push(renderOverallDimensions(vp));

  // ── Provenance ──
  parts.push(renderProvenanceNote(STRUCTURAL_DERIVED_PROVENANCE, 8, vp.h - 14));

  // ── Title ──
  parts.push(renderDrawingTitle('Foundation Plan', 'Pre-design foundation layout — structural review required', vp));

  return endSvg(parts, vp, titleMeta);
}
