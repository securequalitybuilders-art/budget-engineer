import type { CadDocument } from '@/domain/ws6-types';
import type { TitleBlockMeta } from '../title-block';
import { MEP_PRE_DESIGN_PROVENANCE } from '@/domain/drawing-provenance';
import {
  computeViewport, startSvg, endSvg, renderWalls,
  renderOverallDimensions, renderProvenanceNote,
  renderDrawingTitle, renderLegend, dist,
  type LegendItem,
} from './svg-shared';
import { resolveMepPalette } from '../mep-palette';
import { renderScheduleRef } from '../annotation-engine';

let circuitCounter = 1;

function nextCircuit(): number {
  return circuitCounter++;
}

function renderElecSymbol(kind: string, cx: number, cy: number, palette: { primary: string; secondary: string; accent: string; wire: string; outline: string; fill: string; label: string }): string {
  const p: string[] = [];
  switch (kind) {
    case 'light':
      p.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="none" stroke="${palette.primary}" stroke-width="1.5"/>`);
      p.push(`<line x1="${(cx - 4).toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + 4).toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${palette.primary}" stroke-width="1"/>`);
      p.push(`<line x1="${cx.toFixed(1)}" y1="${(cy - 4).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(cy + 4).toFixed(1)}" stroke="${palette.primary}" stroke-width="1"/>`);
      break;
    case 'switch':
      p.push(`<rect x="${(cx - 4).toFixed(1)}" y="${(cy - 4).toFixed(1)}" width="8" height="8" fill="none" stroke="${palette.secondary}" stroke-width="1.5"/>`);
      p.push(`<text x="${cx.toFixed(1)}" y="${(cy + 3).toFixed(1)}" fill="${palette.secondary}" font-size="7" text-anchor="middle" font-weight="bold">S</text>`);
      break;
    case 'socket':
      p.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5" fill="none" stroke="${palette.accent}" stroke-width="1.5"/>`);
      p.push(`<line x1="${(cx - 3).toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + 3).toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${palette.accent}" stroke-width="1"/>`);
      break;
    case 'db_board':
      p.push(`<rect x="${(cx - 8).toFixed(1)}" y="${(cy - 10).toFixed(1)}" width="16" height="20" fill="${palette.outline}" stroke="${palette.primary}" stroke-width="2"/>`);
      p.push(`<text x="${cx.toFixed(1)}" y="${(cy + 3).toFixed(1)}" fill="${palette.primary}" font-size="7" text-anchor="middle" font-weight="bold">DB</text>`);
      break;
  }
  return p.join('');
}

export function buildElectricalPlanSvg(
  cad: CadDocument,
  floorId?: string,
  titleMeta?: TitleBlockMeta,
  printMode = false,
): string {
  circuitCounter = 1;
  const floor = cad.floors.find((f) => f.id === floorId) ?? cad.floors[0];
  if (!floor) return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="200" y="100" fill="#94a3b8" text-anchor="middle">No floor data</text></svg>';

  const walls = cad.walls.filter((w) => w.floorId === floor.id);
  const blocks = cad.blocks.filter((b) => b.floorId === floor.id);
  const boundaries = cad.boundaries || [];

  const elecKinds = ['light', 'switch', 'socket', 'db_board'];
  const elecBlocks = blocks.filter((b) => elecKinds.includes(b.kind));
  const lights = elecBlocks.filter((b) => b.kind === 'light');
  const switches = elecBlocks.filter((b) => b.kind === 'switch');
  const sockets = elecBlocks.filter((b) => b.kind === 'socket');
  const dbBoards = elecBlocks.filter((b) => b.kind === 'db_board');

  const vp = computeViewport(walls, boundaries, !!titleMeta, printMode);
  const parts: string[] = [startSvg(vp)];

  const mepPalettes = resolveMepPalette(printMode, !printMode);
  const pal = mepPalettes.electrical;

  parts.push(renderWalls(walls, vp, cad.materialSystem, { colorOverride: '#334155', opacityOverride: 0.4 }));

  // ── Circuit grouping by zone ──
  const zoneLabels = ['A', 'B', 'C', 'D'];
  const zones: { label: string; lights: typeof lights; sockets: typeof sockets }[] = [];
  if (lights.length > 0) {
    const sortedLights = [...lights].sort((a, b) => a.position.x - b.position.x);
    const perZone = Math.max(1, Math.ceil(sortedLights.length / zoneLabels.length));
    for (let zi = 0; zi < zoneLabels.length && zi * perZone < sortedLights.length; zi++) {
      const slice = sortedLights.slice(zi * perZone, (zi + 1) * perZone);
      zones.push({ label: zoneLabels[zi], lights: slice, sockets: [] });
    }
  }
  if (zones.length === 0 && lights.length > 0) {
    zones.push({ label: 'A', lights, sockets: [] });
  }

  // ── DB board outgoing-way references ──
  if (dbBoards.length > 0) {
    const db = dbBoards[0];
    const dbCx = vp.px(db.position);
    const dbCy = vp.py(db.position);
    const totalCcts = lights.length + sockets.length;
    const outgoingWays = zones.length > 0 ? zones.length : 1;
    parts.push(`<text x="${(dbCx + 14).toFixed(1)}" y="${(dbCy - 14).toFixed(1)}" fill="${pal.label}" font-size="6" font-family="Arial,Helvetica,sans-serif">DB-${floor.name.slice(0,2).toUpperCase()}</text>`);
    parts.push(`<text x="${(dbCx + 14).toFixed(1)}" y="${(dbCy - 6).toFixed(1)}" fill="${pal.label}" font-size="6" font-family="Arial,Helvetica,sans-serif">32A MCB INCOMER · 30mA RCD</text>`);
    parts.push(`<text x="${(dbCx + 14).toFixed(1)}" y="${(dbCy + 2).toFixed(1)}" fill="${pal.label}" font-size="6" font-family="Arial,Helvetica,sans-serif">OUTGOING: ${outgoingWays} WAYS · ${totalCcts} CCTS</text>`);
    parts.push(`<text x="${(dbCx + 14).toFixed(1)}" y="${(dbCy + 10).toFixed(1)}" fill="${pal.label}" font-size="6" font-family="Arial,Helvetica,sans-serif">EST. LOAD: ${(totalCcts * 0.5).toFixed(1)}kVA</text>`);

    // DB-to-switch leg references
    for (const sw of switches) {
      parts.push(`<line x1="${dbCx.toFixed(1)}" y1="${dbCy.toFixed(1)}" x2="${vp.px(sw.position).toFixed(1)}" y2="${vp.py(sw.position).toFixed(1)}" stroke="${pal.wire}" stroke-width="1" stroke-dasharray="8 4" opacity="0.5"/>`);
    }
  }

  // ── Switch-light relationship with circuit grouping ──
  for (const sw of switches) {
    const swPos = sw.position;
    const sorted = [...lights].sort((a, b) => dist(swPos, a.position) - dist(swPos, b.position));
    const nearest = sorted[0];
    if (nearest) {
      const sx = vp.px(swPos);
      const sy = vp.py(swPos);
      const lx = vp.px(nearest.position);
      const ly = vp.py(nearest.position);
      const circuit = nextCircuit();
      const zoneOf = zones.find(z => z.lights.includes(nearest));
      const zLabel = zoneOf ? zoneOf.label : 'A';
      parts.push(`<path d="M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${sx.toFixed(1)} ${ly.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)}" fill="none" stroke="${pal.wire}" stroke-width="1.5" stroke-dasharray="4 4"/>`);
      const cx = (sx + lx) / 2;
      const cy = (sy + ly) / 2;
      parts.push(`<text x="${(cx + 6).toFixed(1)}" y="${(cy - 4).toFixed(1)}" fill="${pal.label}" font-size="5" font-family="Arial,Helvetica,sans-serif">C${circuit} · 1.5mm² · Z${zLabel}</text>`);
    }
  }

  // ── Zone demarcation ──
  for (const zone of zones) {
    if (zone.lights.length === 0) continue;
    const zx = zone.lights.reduce((s, l) => s + l.position.x, 0) / zone.lights.length;
    const zy = zone.lights.reduce((s, l) => s + l.position.y, 0) / zone.lights.length;
    const px = vp.px({ x: zx, y: 0 });
    const py = vp.py({ x: 0, y: zy });
    parts.push(`<text x="${px.toFixed(1)}" y="${(py - 14).toFixed(1)}" fill="${pal.label}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">── ZONE ${zone.label} ──</text>`);
    const loadW = zone.lights.length * 150;
    parts.push(`<text x="${px.toFixed(1)}" y="${(py + 16).toFixed(1)}" fill="${pal.label}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${zone.lights.length} fittings · ~${(loadW / 1000).toFixed(1)}kW</text>`);
  }

  for (const b of elecBlocks) {
    const cx = vp.px(b.position);
    const cy = vp.py(b.position);
    parts.push(renderElecSymbol(b.kind, cx, cy, pal));
  }

  // ── Power point category tags ──
  for (const s of sockets) {
    const sx = vp.px(s.position);
    const sy = vp.py(s.position);
    parts.push(`<text x="${(sx + 8).toFixed(1)}" y="${(sy + 3).toFixed(1)}" fill="${pal.label}" font-size="6" font-family="Arial,Helvetica,sans-serif">13A SW · GEN PURP</text>`);
  }

  // ── Light fitting labels with circuit IDs ──
  for (const l of lights) {
    const lx = vp.px(l.position);
    const ly = vp.py(l.position);
    const circ = lights.indexOf(l) + 1;
    parts.push(`<text x="${(lx + 8).toFixed(1)}" y="${(ly + 3).toFixed(1)}" fill="${pal.label}" font-size="6" font-family="Arial,Helvetica,sans-serif">L${circ} · 150W EQ · CCT ${nextCircuit()}</text>`);
  }

  // ── Circuit schedule reference block ──
  const schedX = vp.w - 50;
  const schedY = vp.h - 130;
  parts.push(`<text x="${schedX.toFixed(1)}" y="${schedY.toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">CIRCUIT SCHEDULE:</text>`);
  parts.push(`<text x="${schedX.toFixed(1)}" y="${(schedY + 10).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">LIGHTING: ${lights.length} CCTS · 1.5mm² PVC/PVC · 6A MCB</text>`);
  parts.push(`<text x="${schedX.toFixed(1)}" y="${(schedY + 20).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">SOCKETS: ${sockets.length} CCTS · 2.5mm² PVC/PVC · 32A RCBO</text>`);
  parts.push(`<text x="${schedX.toFixed(1)}" y="${(schedY + 30).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">ZONE A–${zones.length > 0 ? zoneLabels[zones.length - 1] : 'A'}: SEGREGATED PER AREA</text>`);

  parts.push(renderOverallDimensions(vp));

  const legendItems: LegendItem[] = [
    { color: pal.primary, label: 'Light fitting' },
    { color: pal.secondary, label: 'Switch (1-gang)' },
    { color: pal.accent, label: 'Socket outlet — general purpose' },
    { color: pal.primary, label: 'Distribution board (DB)' },
    { color: pal.wire, label: 'Wiring (switch leg)', dash: '4 4' },
    { color: pal.wire, label: 'DB outgoing feeder', dash: '8 4' },
  ];
  parts.push(renderLegend(legendItems, vp.w - 175, 40, 'ELECTRICAL LEGEND'));

  const scRefX = vp.w - 50;
  const scRefY = vp.h - 100;
  parts.push(renderScheduleRef('E', 'E-101', scRefX - 70, scRefY - 8, printMode));
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${scRefY.toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">SCHEDULE REF: E-101</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 10).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">ALL CABLES: 1.5–2.5mm² PVC/PVC</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 20).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">LIGHTING: 230V · 50Hz · 6A MCB</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 30).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">SOCKETS: RCD PROTECTED · 32A RADIAL</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 40).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">ISOLATORS: 32A DP SWITCH FOR EACH DB</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 50).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">EARTHING: 10mm² BONDING CONDUCTOR</text>`);
  parts.push(`<text x="${scRefX.toFixed(1)}" y="${(scRefY + 60).toFixed(1)}" fill="${pal.label}" font-size="6" text-anchor="end" font-family="Arial,Helvetica,sans-serif">SEPARATE EARTH FOR ZONE A (LAB/IT)</text>`);

  parts.push(renderProvenanceNote(MEP_PRE_DESIGN_PROVENANCE, 8, vp.h - 14));
  parts.push(renderDrawingTitle(`Pre-Design Electrical Layout — ${floor.name}`, `Rules-based placement · ${lights.length} lights · ${sockets.length} sockets · ${switches.length} switches · ${zones.length} zones`, vp));

  return endSvg(parts, vp, titleMeta);
}
