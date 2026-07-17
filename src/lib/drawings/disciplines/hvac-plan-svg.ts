import type { CadDocument } from '@/domain/ws6-types';
import type { TitleBlockMeta } from '../title-block';
import { MEP_PRE_DESIGN_PROVENANCE } from '@/domain/drawing-provenance';
import {
  computeViewport, startSvg, endSvg, renderWalls,
  renderOverallDimensions, renderProvenanceNote,
  renderDrawingTitle, renderLegend, SCALE,
  type LegendItem,
} from './svg-shared';
import { resolveMepPalette } from '../mep-palette';
import { renderScheduleRef } from '../annotation-engine';

let unitTagCounter = 1;

function nextTag(): string {
  return `AC-${String(unitTagCounter++).padStart(2, '0')}`;
}

const ZONE_LABELS = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];

export function buildHvacPlanSvg(
  cad: CadDocument,
  floorId?: string,
  titleMeta?: TitleBlockMeta,
  printMode = false,
): string {
  unitTagCounter = 1;
  const floor = cad.floors.find((f) => f.id === floorId) ?? cad.floors[0];
  if (!floor) return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="200" y="100" fill="#94a3b8" text-anchor="middle">No floor data</text></svg>';

  const walls = cad.walls.filter((w) => w.floorId === floor.id);
  const blocks = cad.blocks.filter((b) => b.floorId === floor.id);
  const boundaries = cad.boundaries || [];

  const hvacKinds = ['hvac_unit', 'ac_unit', 'duct', 'fc_u', 'diffuser', 'grille'];
  const hvacBlocks = blocks.filter((b) => hvacKinds.includes(b.kind));
  const units = hvacBlocks.filter((b) => ['hvac_unit', 'ac_unit', 'fc_u'].includes(b.kind));
  const diffusers = hvacBlocks.filter((b) => ['diffuser', 'grille'].includes(b.kind));
  const ducts = hvacBlocks.filter((b) => b.kind === 'duct');

  const vp = computeViewport(walls, boundaries, !!titleMeta, printMode);
  const parts: string[] = [startSvg(vp)];

  const mepPalettes = resolveMepPalette(printMode, !printMode);
  const pal = mepPalettes.hvac;

  parts.push(renderWalls(walls, vp, cad.materialSystem, { colorOverride: '#334155', opacityOverride: 0.4 }));

  let hasInferredHvac = false;

  // ── Zone demarcation ──
  const zoneData: { tag: string; cx: number; cy: number }[] = [];
  for (const u of units) {
    const tag = nextTag();
    const ux = vp.px(u.position);
    const uy = vp.py(u.position);
    zoneData.push({ tag, cx: ux, cy: uy });
  }

  for (let zi = 0; zi < zoneData.length && zi < ZONE_LABELS.length; zi++) {
    const z = zoneData[zi];
    const zoneLabel = ZONE_LABELS[zi];
    const zoneColor = printMode ? pal.secondary : '#2d6a4f';
    parts.push(`<text x="${z.cx.toFixed(1)}" y="${(z.cy - 18).toFixed(1)}" fill="${zoneColor}" font-size="6" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">── ${zoneLabel} ──</text>`);
  }

  for (const b of hvacBlocks) {
    const bx = b.position.x * SCALE + vp.ox;
    const by = vp.h - (b.position.y * SCALE + vp.oy) - b.depth * SCALE;

    if (['hvac_unit', 'ac_unit', 'fc_u'].includes(b.kind)) {
      const tag = nextTag();
      const zi = units.indexOf(b);
      const zoneLabel = zi < ZONE_LABELS.length ? ZONE_LABELS[zi] : `Zone ${zi + 1}`;
      parts.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(b.width * SCALE).toFixed(1)}" height="${(b.depth * SCALE).toFixed(1)}" fill="${pal.fill}" stroke="${pal.primary}" stroke-width="1.5" opacity="0.8"/>`);
      parts.push(`<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx + b.width * SCALE).toFixed(1)}" y2="${(by + b.depth * SCALE).toFixed(1)}" stroke="${pal.primary}" stroke-width="1"/>`);
      parts.push(`<line x1="${bx.toFixed(1)}" y1="${(by + b.depth * SCALE).toFixed(1)}" x2="${(bx + b.width * SCALE).toFixed(1)}" y2="${by.toFixed(1)}" stroke="${pal.primary}" stroke-width="1"/>`);
      parts.push(`<text x="${(bx + b.width * SCALE / 2).toFixed(1)}" y="${(by + b.depth * SCALE + 12).toFixed(1)}" fill="${pal.primary}" font-size="7" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${tag}</text>`);
      parts.push(`<text x="${(bx + b.width * SCALE / 2).toFixed(1)}" y="${(by - 6).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${b.kind === 'fc_u' ? 'FCU' : 'SPLIT AC'} · 3.5kW · ${zoneLabel}</text>`);
      continue;
    }

    if (b.kind === 'duct') {
      const zi = ducts.indexOf(b);
      const zoneLabel = zi < ZONE_LABELS.length ? ZONE_LABELS[zi] : 'General';
      parts.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(b.width * SCALE).toFixed(1)}" height="${(b.depth * SCALE).toFixed(1)}" fill="${pal.fill}" stroke="${pal.secondary}" stroke-width="1" stroke-dasharray="4 2" opacity="0.6"/>`);
      parts.push(`<text x="${(bx + b.width * SCALE / 2).toFixed(1)}" y="${(by + b.depth * SCALE / 2 + 3).toFixed(1)}" fill="${pal.label}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">DUCT 600×300 · ${zoneLabel}</text>`);
      continue;
    }

    if (b.kind === 'diffuser' || b.kind === 'grille') {
      parts.push(`<rect x="${(bx + 2).toFixed(1)}" y="${(by + 2).toFixed(1)}" width="${(b.width * SCALE - 4).toFixed(1)}" height="${(b.depth * SCALE - 4).toFixed(1)}" fill="none" stroke="${pal.primary}" stroke-width="1"/>`);
      parts.push(`<line x1="${(bx + 2).toFixed(1)}" y1="${(by + b.depth * SCALE / 2).toFixed(1)}" x2="${(bx + b.width * SCALE - 2).toFixed(1)}" y2="${(by + b.depth * SCALE / 2).toFixed(1)}" stroke="${pal.primary}" stroke-width="0.5"/>`);
      parts.push(`<line x1="${(bx + b.width * SCALE / 2).toFixed(1)}" y1="${(by + 2).toFixed(1)}" x2="${(bx + b.width * SCALE / 2).toFixed(1)}" y2="${(by + b.depth * SCALE - 2).toFixed(1)}" stroke="${pal.primary}" stroke-width="0.5"/>`);
      parts.push(`<text x="${(bx + b.width * SCALE / 2).toFixed(1)}" y="${(by + b.depth * SCALE + 10).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${b.kind === 'diffuser' ? 'DIFF' : 'GRILLE'}</text>`);
    }
  }

  if (hvacBlocks.length === 0 && walls.length > 0) {
    hasInferredHvac = true;
    const xs = walls.flatMap((w) => [w.start.x, w.end.x]);
    const ys = walls.flatMap((w) => [w.start.y, w.end.y]);
    const cx = vp.px({ x: (Math.min(...xs) + Math.max(...xs)) / 2, y: 0 });
    const cy = vp.py({ x: 0, y: (Math.min(...ys) + Math.max(...ys)) / 2 });

    parts.push(`<rect x="${(cx - 15).toFixed(1)}" y="${(cy - 8).toFixed(1)}" width="30" height="16" fill="none" stroke="${pal.secondary}" stroke-width="2" stroke-dasharray="3 3"/>`);
    parts.push(`<text x="${cx.toFixed(1)}" y="${(cy + 3).toFixed(1)}" fill="${pal.secondary}" font-size="7" text-anchor="middle" font-weight="bold" font-family="Arial,Helvetica,sans-serif">SPLIT AC</text>`);
    parts.push(`<text x="${cx.toFixed(1)}" y="${(cy - 8).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">AC-00 (INFERRED) · 3.5kW · Zone A</text>`);
  }

  parts.push(renderOverallDimensions(vp));

  const legendItems: LegendItem[] = [
    { color: pal.primary, label: 'Air conditioning unit (split/FCU)' },
    { color: pal.secondary, label: 'Ductwork supply/return', dash: '4 2' },
    { color: pal.primary, label: 'Supply / return grille / diffuser' },
    { color: pal.secondary, label: 'Zone boundary' },
  ];
  if (hasInferredHvac) {
    legendItems.push({ color: pal.secondary, label: 'Inferred AC unit (pre-design)', dash: '3 3' });
  }
  parts.push(renderLegend(legendItems, vp.w - 180, 40, 'HVAC LEGEND'));

  // ── Equipment schedule cross-reference ──
  if (units.length > 0) {
    const eqRefX = vp.w - 120;
    const eqRefY = vp.h - 150;
    parts.push(`<text x="${eqRefX.toFixed(1)}" y="${eqRefY.toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">EQUIPMENT SCHEDULE:</text>`);
    units.forEach((_u, i) => {
      const tag = `AC-${String(i + 1).padStart(2, '0')}`;
      const zi = i < ZONE_LABELS.length ? ZONE_LABELS[i] : `Zone ${i + 1}`;
      parts.push(`<text x="${eqRefX.toFixed(1)}" y="${(eqRefY + 10 + i * 10).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">${tag}: SPLIT AC · 3.5kW · R32 · COP 3.5 · ${zi}</text>`);
    });
    parts.push(`<text x="${eqRefX.toFixed(1)}" y="${(eqRefY + 10 + units.length * 10 + 5).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">CONDENSATE: 20mm PVC-U FALL 1:60</text>`);
    parts.push(`<text x="${eqRefX.toFixed(1)}" y="${(eqRefY + 10 + units.length * 10 + 15).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">BMS: DDC CONTROLLED · MODBUS RTU</text>`);
  }

  const scRefX = vp.w - 50;
  const scRefY = vp.h - 100;
  parts.push(renderScheduleRef('M', 'M-101', scRefX - 70, scRefY - 8, printMode));
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${scRefY.toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">SCHEDULE REF: M-101</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 10).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">AC UNITS: 3.5kW SPLIT · R32 REFRIGERANT</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 20).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">DUCT: 600×300 GALVANISED STEEL</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 30).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">FRESH AIR: 150mm INSULATED FLEX</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 40).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">CONTROLS: THERMOSTAT · ZONE VALVE · DDC READY · MODBUS</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 50).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">ZONES: INDEPENDENT TEMP CONTROL PER ZONE</text>`);

  if (hasInferredHvac) {
    parts.push(renderProvenanceNote(MEP_PRE_DESIGN_PROVENANCE, 8, vp.h - 14));
  }

  parts.push(renderDrawingTitle(`Pre-Design HVAC Layout — ${floor.name}`, `Rules-based mechanical inference · ${units.length} units · ${diffusers.length} terminals · ${ducts.length} duct segments · ${Math.min(units.length, ZONE_LABELS.length)} zones`, vp));

  return endSvg(parts, vp, titleMeta);
}
