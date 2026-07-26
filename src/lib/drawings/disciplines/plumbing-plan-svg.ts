import type { CadDocument, Vec2 } from '@/domain/ws6-types';
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

export function buildPlumbingPlanSvg(
  cad: CadDocument,
  floorId?: string,
  titleMeta?: TitleBlockMeta,
  printMode = false,
): string {
  const floor = cad.floors.find((f) => f.id === floorId) ?? cad.floors[0];
  if (!floor) return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="200" y="100" fill="#94a3b8" text-anchor="middle">No floor data</text></svg>';

  const walls = cad.walls.filter((w) => w.floorId === floor.id);
  const blocks = cad.blocks.filter((b) => b.floorId === floor.id);
  const boundaries = cad.boundaries || [];

  const plumbKinds = ['wc', 'sink', 'shower', 'manhole'];
  const plumbBlocks = blocks.filter((b) => plumbKinds.includes(b.kind));
  const fixtures = plumbBlocks.filter((b) => ['wc', 'sink', 'shower'].includes(b.kind));
  const manholes = plumbBlocks.filter((b) => b.kind === 'manhole');

  let inferredManhole: Vec2 | null = null;
  if (fixtures.length > 0 && manholes.length === 0) {
    const xs = walls.flatMap((w) => [w.start.x, w.end.x]);
    const ys = walls.flatMap((w) => [w.start.y, w.end.y]);
    if (xs.length > 0) {
      inferredManhole = {
        x: Math.min(...xs) - 2,
        y: Math.min(...ys) - 2,
      };
      boundaries.push({ id: 'mh-infer', points: [inferredManhole], layerId: 'boundaries' });
    }
  }

  const vp = computeViewport(walls, boundaries, !!titleMeta, printMode);
  const parts: string[] = [startSvg(vp)];

  const mepPalettes = resolveMepPalette(printMode, !printMode);
  const pal = mepPalettes.plumbing;

  parts.push(renderWalls(walls, vp, cad.materialSystem, { colorOverride: '#334155', opacityOverride: 0.4 }));

  const mhPos = manholes.length > 0 ? manholes[0].position : inferredManhole;

  // ── Wet-core / service shaft location ──
  if (fixtures.length >= 2) {
    const coreX = (Math.min(...fixtures.map(f => f.position.x)) + Math.max(...fixtures.map(f => f.position.x))) / 2;
    const coreY = (Math.min(...fixtures.map(f => f.position.y)) + Math.max(...fixtures.map(f => f.position.y))) / 2;
    const cpx = vp.px({ x: coreX, y: 0 });
    const cpy = vp.py({ x: 0, y: coreY });
    const shaftColor = printMode ? pal.outline : '#9333ea';
    parts.push(`<rect x="${(cpx - 20).toFixed(1)}" y="${(cpy - 20).toFixed(1)}" width="40" height="40" fill="none" stroke="${shaftColor}" stroke-width="1.5" stroke-dasharray="6 3" opacity="0.5"/>`);
    parts.push(`<text x="${cpx.toFixed(1)}" y="${(cpy + 3).toFixed(1)}" fill="${shaftColor}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="bold">WET CORE</text>`);
    parts.push(`<text x="${cpx.toFixed(1)}" y="${(cpy + 13).toFixed(1)}" fill="${pal.label}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">SERVICES SHAFT</text>`);
  }

  let fixtureIndex = 1;

  // ── Fixture-to-manhole routing ──
  if (mhPos && fixtures.length > 0) {
    for (const f of fixtures) {
      const fx = vp.px(f.position);
      const fy = vp.py(f.position);
      const mx = vp.px(mhPos);
      const my = vp.py(mhPos);
      const soilColor = printMode ? pal.wire : '#854d0e';
      const wasteColor = printMode ? pal.secondary : '#2563eb';
      const color = f.kind === 'wc' ? soilColor : wasteColor;
      const width = f.kind === 'wc' ? 3 : 2;
      parts.push(`<polyline points="${fx.toFixed(1)},${fy.toFixed(1)} ${fx.toFixed(1)},${my.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-dasharray="8 4"/>`);

      const midX = (fx + mx) / 2;
      const midY = (fy + my) / 2;
      const pipeLabel = f.kind === 'wc' ? '110mm SOIL & VENT' : '50mm WASTE';
      parts.push(`<text x="${midX.toFixed(1)}" y="${(midY - 4).toFixed(1)}" fill="${pal.label}" font-size="5" font-family="Arial,Helvetica,sans-serif">${pipeLabel}</text>`);
    }
  }

  // ── Hot / cold supply routing ──
  if (fixtures.length > 0) {
    const sinksShowers = fixtures.filter((f) => ['sink', 'shower'].includes(f.kind));
    if (sinksShowers.length > 1) {
      const f1 = vp.px(sinksShowers[0].position);
      const f1y = vp.py(sinksShowers[0].position);
      const hotColor = printMode ? pal.secondary : '#ef4444';
      const coldColor = printMode ? pal.accent : '#3b82f6';
      for (let i = 1; i < sinksShowers.length; i++) {
        const fn = vp.px(sinksShowers[i].position);
        const fny = vp.py(sinksShowers[i].position);
        parts.push(`<polyline points="${f1.toFixed(1)},${f1y.toFixed(1)} ${fn.toFixed(1)},${f1y.toFixed(1)} ${fn.toFixed(1)},${fny.toFixed(1)}" fill="none" stroke="${hotColor}" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.6"/>`);
        parts.push(`<text x="${(f1 + fn) / 2}" y="${(f1y - 4).toFixed(1)}" fill="${pal.label}" font-size="5" font-family="Arial,Helvetica,sans-serif">HOT 15mm Cu</text>`);
        parts.push(`<polyline points="${(f1+2).toFixed(1)},${(f1y+2).toFixed(1)} ${(fn+2).toFixed(1)},${(f1y+2).toFixed(1)} ${(fn+2).toFixed(1)},${fny.toFixed(1)}" fill="none" stroke="${coldColor}" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.6"/>`);
        parts.push(`<text x="${(f1 + fn + 2) / 2}" y="${(f1y + 8).toFixed(1)}" fill="${pal.label}" font-size="5" font-family="Arial,Helvetica,sans-serif">COLD 15mm MDPE</text>`);
      }
    }
    // ── Vent route ──
    if (mhPos) {
      const mx = vp.px(mhPos);
      const my = vp.py(mhPos);
      parts.push(`<line x1="${mx.toFixed(1)}" y1="${(my - 12).toFixed(1)}" x2="${mx.toFixed(1)}" y2="${(my - 24).toFixed(1)}" stroke="${pal.outline}" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.5"/>`);
      parts.push(`<text x="${(mx + 6).toFixed(1)}" y="${(my - 18).toFixed(1)}" fill="${pal.label}" font-size="5" font-family="Arial,Helvetica,sans-serif">VENT 32mm Cu · OPEN VENT</text>`);
    }
  }

  for (const b of fixtures) {
    const bx = b.position.x * SCALE + vp.ox;
    const by = vp.h - (b.position.y * SCALE + vp.oy) - b.depth * SCALE;
    const fixtureFill = printMode ? pal.fill : '#60a5fa';
    const fixtureStroke = printMode ? pal.outline : '#2563eb';
    parts.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(b.width * SCALE).toFixed(1)}" height="${(b.depth * SCALE).toFixed(1)}" fill="${fixtureFill}" stroke="${fixtureStroke}" stroke-width="1.5" opacity="0.8" rx="2"/>`);

    let label = '';
    if (b.kind === 'wc') label = 'WC';
    if (b.kind === 'sink') label = 'WHB';
    if (b.kind === 'shower') label = 'SHR';
    parts.push(`<text x="${(bx + b.width * SCALE / 2).toFixed(1)}" y="${(by + b.depth * SCALE / 2 + 3).toFixed(1)}" fill="${pal.label}" font-size="7" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${label}</text>`);

    const ref = `F${fixtureIndex.toString().padStart(2, '0')}`;
    parts.push(`<text x="${(bx + b.width * SCALE + 4).toFixed(1)}" y="${(by + b.depth * SCALE / 2 + 3).toFixed(1)}" fill="${pal.label}" font-size="6" font-family="Arial,Helvetica,sans-serif">${ref}</text>`);
    fixtureIndex++;
  }

  if (mhPos) {
    const mx = vp.px(mhPos);
    const my = vp.py(mhPos);
    const mhColor = printMode ? pal.outline : '#854d0e';
    parts.push(`<rect x="${(mx - 10).toFixed(1)}" y="${(my - 10).toFixed(1)}" width="20" height="20" fill="none" stroke="${mhColor}" stroke-width="2"/>`);
    parts.push(`<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="6" fill="none" stroke="${mhColor}" stroke-width="1.5"/>`);
    parts.push(`<text x="${mx.toFixed(1)}" y="${(my + 16).toFixed(1)}" fill="${mhColor}" font-size="7" text-anchor="middle" font-weight="bold" font-family="Arial,Helvetica,sans-serif">IC / MH</text>`);
    parts.push(`<text x="${mx.toFixed(1)}" y="${(my + 26).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">100mm DRAIN · FALL 1:40</text>`);
    if (inferredManhole) {
       parts.push(`<text x="${mx.toFixed(1)}" y="${(my + 34).toFixed(1)}" fill="#f59e0b" font-size="6" text-anchor="middle" font-style="italic" font-family="Arial,Helvetica,sans-serif">ASSUMED LOCATION</text>`);
    }
  }

  parts.push(renderOverallDimensions(vp));

  const legendItems: LegendItem[] = [
    { color: pal.outline, label: 'Soil & vent pipe (110mm)', dash: '8 4' },
    { color: pal.secondary, label: 'Waste water (50mm)', dash: '8 4' },
    { color: pal.wire, label: 'Hot water supply 15mm Cu', dash: '2 2' },
    { color: pal.accent, label: 'Cold water supply 15mm MDPE', dash: '2 2' },
    { color: pal.outline, label: 'Vent pipe 32mm Cu', dash: '3 3' },
    { color: pal.outline, label: 'Wet core / services shaft', dash: '6 3' },
  ];
  parts.push(renderLegend(legendItems, vp.w - 180, 40, 'PLUMBING LEGEND'));

  // ── Stack/riser notation ──
  if (fixtures.length > 0) {
    const riserX = vp.w - 100;
    const riserY = vp.h - 170;
    parts.push(`<text x="${riserX.toFixed(1)}" y="${riserY.toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">STACK S1 (SOIL & VENT): 110mm PVC-U</text>`);
    parts.push(`<text x="${riserX.toFixed(1)}" y="${(riserY + 10).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">STACK W1 (WASTE): 50mm PVC-U</text>`);
    parts.push(`<text x="${riserX.toFixed(1)}" y="${(riserY + 20).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">STACK V1 (VENT): 32mm COPPER · OPEN VENT</text>`);
    parts.push(`<text x="${riserX.toFixed(1)}" y="${(riserY + 30).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">WET CORE: WC / WHB / SHR IN COMMON SHAFT</text>`);
    parts.push(`<text x="${riserX.toFixed(1)}" y="${(riserY + 40).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">TRAPS: 75mm WATER SEAL TO ALL FIXTURES</text>`);
  }

  const scRefX = vp.w - 50;
  const scRefY = vp.h - 100;
  parts.push(renderScheduleRef('P', 'P-101', scRefX - 70, scRefY - 8, printMode));
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${scRefY.toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">SCHEDULE REF: P-101</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 10).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">HOT: 15mm COPPER · COLD: 15mm MDPE</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 20).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">WASTE: 50mm PVC-U · SOIL: 110mm PVC-U</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 30).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">VENT: OPEN VENT · 32mm COPPER</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 40).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">TRAPS: 75mm WATER SEAL TO ALL FIXTURES</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 50).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">MAINS: 25mm MDPE SUPPLY · 3 bar WORKING PRESSURE</text>`);

  if (inferredManhole) {
    parts.push(renderProvenanceNote(MEP_PRE_DESIGN_PROVENANCE, 8, vp.h - 14));
  }

  parts.push(renderDrawingTitle(`Pre-Design Plumbing Layout — ${floor.name}`, `Rules-based pipe routing · ${fixtures.length} fixtures · wet core · verify slopes and vents`, vp));

  return endSvg(parts, vp, titleMeta);
}
