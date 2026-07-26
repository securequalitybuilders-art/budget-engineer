import type { CadDocument } from '@/domain/ws6-types';
import type { TitleBlockMeta } from '../title-block';
import type { SectionConfig } from '../section-svg';
import type { SheetCoordinator } from '../sheet-coordination';
import { DEFAULT_COORDINATOR } from '../sheet-coordination';
import {
  computeViewport, startSvg, endSvg, renderGrid, renderWalls,
  renderOpenings, renderBlocks, renderDrawingTitle,
  renderSectionMark, renderLegend, SCALE,
} from './svg-shared';
import { renderWallDims, renderOpeningDims, renderFloorLevelMarker, renderRoomInternalDims } from '../dimension-engine';
import { renderRoomLabel, renderScaleBar, renderNorthArrow, computeRoomsFromWalls, renderScheduleRef, renderWallTypeTag, renderDetailBubble, renderElevationRefMark, renderCrossSheetRef } from '../annotation-engine';
import { LW } from '../lineweights';

export function buildFloorPlanSvg(
  cad: CadDocument,
  floorId?: string,
  titleMeta?: TitleBlockMeta,
  sectionMark?: SectionConfig,
  printMode = false,
  coordinator: SheetCoordinator = DEFAULT_COORDINATOR,
): string {
  const floor = cad.floors.find((f) => f.id === floorId) ?? cad.floors[0];
  if (!floor) return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="200" y="100" fill="#94a3b8" text-anchor="middle">No floor data</text></svg>';

  const walls = cad.walls.filter((w) => w.floorId === floor.id);
  const openings = cad.openings.filter((o) => o.floorId === floor.id);
  const blocks = cad.blocks.filter((b) => b.floorId === floor.id);
  const boundaries = cad.boundaries || [];

  const floorIdx = cad.floors.indexOf(floor);
  const floorBelow = floorIdx > 0 ? cad.floors[floorIdx - 1] : null;
  const stairwells = floorBelow
    ? cad.blocks.filter((b) => b.floorId === floorBelow.id && b.kind === 'stair')
    : [];

  const vp = computeViewport(walls, boundaries, !!titleMeta, printMode);
  const parts: string[] = [startSvg(vp)];

  parts.push(renderGrid(vp));

  const dimWallInfo = walls.map(w => ({
    start: w.start, end: w.end,
    thickness: w.thickness, structural: w.structural ?? false,
  }));

  parts.push(renderWalls(walls, vp, cad.materialSystem));

  parts.push(renderOpenings(openings, walls, vp, { showTags: true }));

  const archKinds = ['sofa', 'bed', 'table', 'column', 'core', 'stair', 'beam', 'footing'];
  parts.push(renderBlocks(blocks, vp, cad.materialSystem, archKinds));

  for (const st of stairwells) {
    const bx = st.position.x * SCALE + vp.ox;
    const by = vp.h - (st.position.y * SCALE + vp.oy) - st.depth * SCALE;
    const bw = st.width * SCALE;
    const bh = st.depth * SCALE;
    const voidStroke = printMode ? '#0f172a' : '#d4a574';
    parts.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${printMode ? '#f8fafc' : '#0b1220'}" stroke="${voidStroke}" stroke-width="${LW.MAJOR}" stroke-dasharray="6 4"/>`);
    parts.push(`<line x1="${bx.toFixed(1)}" y1="${(by + bh).toFixed(1)}" x2="${(bx + bw).toFixed(1)}" y2="${by.toFixed(1)}" stroke="${voidStroke}" stroke-width="${LW.HIDDEN}" opacity="0.6"/>`);
    const voidFill = printMode ? '#475569' : '#d4a574';
    parts.push(`<text x="${(bx + bw / 2).toFixed(1)}" y="${(by + bh / 2).toFixed(1)}" fill="${voidFill}" font-size="9" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">VOID</text>`);
  }

  const plumbKinds = ['sink', 'shower', 'wc'];
  const plumbBlocks = blocks.filter((b) => plumbKinds.includes(b.kind));
  for (const b of plumbBlocks) {
    const bx = b.position.x * SCALE + vp.ox;
    const by = vp.h - (b.position.y * SCALE + vp.oy) - b.depth * SCALE;
    const plumbFill = printMode ? '#bfdbfe' : '#60a5fa';
    parts.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(b.width * SCALE).toFixed(1)}" height="${(b.depth * SCALE).toFixed(1)}" fill="${plumbFill}" opacity="${printMode ? '0.6' : '0.4'}" rx="2"/>`);
  }

  parts.push(renderWallDims(dimWallInfo, vp, printMode));

  // Internal room dimensions
  const { rooms } = computeRoomsFromWalls(walls, floor.elevation, cad.roomProgramme);
  const roomDimData = rooms.map(room => ({
    id: room.id,
    label: room.name,
    centroid: { x: room.centerX, y: room.centerY },
    minX: room.minX, maxX: room.maxX,
    minY: room.minY, maxY: room.maxY,
  }));
  parts.push(renderRoomInternalDims(roomDimData, vp, printMode));

  const openingDimInfo = openings.map(o => {
    const host = walls.find(w => w.id === o.wallId);
    if (!host) return null;
    return {
      hostStart: host.start, hostEnd: host.end,
      offset: o.offset, width: o.width,
      tag: `${o.kind === 'door' ? 'D' : 'W'}-${o.id.slice(0, 3).toUpperCase()}`,
    };
  }).filter((o): o is NonNullable<typeof o> => o !== null);
  parts.push(renderOpeningDims(openingDimInfo, vp, printMode));

  for (const room of rooms) {
    parts.push(renderRoomLabel(room, vp, printMode));
  }

  if (sectionMark) {
    parts.push(renderSectionMark(sectionMark, vp));
  }

  parts.push(renderFloorLevelMarker(floor.elevation, floor.name, 8, vp.h - 50, printMode));

  const northX = vp.w - 40;
  const northY = 40;
  parts.push(renderNorthArrow(northX, northY, 'N', printMode));

  const pxPerMeter = SCALE;
  parts.push(renderScaleBar(5, 8, vp.h - 80, pxPerMeter, printMode));

  const lsColor1 = printMode ? '#1e293b' : '#1a365d';
  const lsColor2 = printMode ? '#64748b' : '#475569';
  const lsColor3 = printMode ? '#64748b' : '#475569';
  const lsColor4 = printMode ? '#94a3b8' : '#64748b';
  parts.push(renderLegend([
    { color: lsColor1, label: 'Structural wall (cut)' },
    { color: lsColor2, label: 'Partition wall' },
    { color: lsColor3, label: 'Door' },
    { color: lsColor4, label: 'Window' },
  ], 8, 40, 'LEGEND', vp));

  // ── Wall type tags on structural walls ──
  const structWalls = walls.filter(w => w.structural);
  const usedWallCodes = new Set<string>();
  for (const w of structWalls) {
    const wx = (vp.px(w.start) + vp.px(w.end)) / 2;
    const wy = (vp.py(w.start) + vp.py(w.end)) / 2;
    const typeCode = w.thickness >= 0.3 ? 'W1' : w.thickness >= 0.23 ? 'W2' : 'W3';
    if (!usedWallCodes.has(typeCode)) {
      usedWallCodes.add(typeCode);
      parts.push(renderWallTypeTag(typeCode, wx, wy, printMode));
    }
  }

  // ── Detail / callout reference bubbles ──
  if (walls.length > 0) {
    const midX = (vp.minX + vp.maxX) / 2;
    const midY = (vp.minY + vp.maxY) / 2;
    const dbCx1 = vp.px({ x: midX + 1, y: 0 });
    const dbCy1 = vp.py({ x: 0, y: midY + 1 });
    const dbCx2 = vp.px({ x: midX - 1, y: 0 });
    const dbCy2 = vp.py({ x: 0, y: midY - 1 });
    parts.push(renderDetailBubble(1, coordinator.getSheetForView('detail-1'), dbCx1, dbCy1, printMode));
    parts.push(renderDetailBubble(2, coordinator.getSheetForView('detail-2'), dbCx2, dbCy2, printMode));
  }

  // ── Elevation reference marks ──
  if (walls.length > 0) {
    const elevY = vp.py({ x: 0, y: vp.minY }) - 20;
    const elevTopY = vp.py({ x: 0, y: vp.maxY }) + 20;
    parts.push(renderElevationRefMark('E1', coordinator.getSheetForView('front'), vp.px({ x: vp.minX, y: 0 }), elevY, 'right', printMode));
    parts.push(renderElevationRefMark('E2', coordinator.getSheetForView('rear'), vp.px({ x: vp.maxX, y: 0 }), elevTopY, 'left', printMode));
  }

  // ── Cross-sheet references ──
  parts.push(renderCrossSheetRef(coordinator.getSheetForView('section-aa-alt'), coordinator.getLabel('section-aa-alt'), vp.w - 80, vp.h - 175, printMode));

  // Schedule cross-reference tags
  if (openings.length > 0) {
    const scheduleTagX = vp.w - 90;
    const scheduleTagY = vp.h - 130;
    parts.push(renderScheduleRef('D/W', 'Schedule ' + coordinator.getSheetForView('schedule-door'), scheduleTagX, scheduleTagY, printMode));
    const tagNoteY = vp.printMode ? '#475569' : '#64748b';
    parts.push(`<text x="${(scheduleTagX + 10).toFixed(1)}" y="${(scheduleTagY + 32).toFixed(1)}" fill="${tagNoteY}" font-size="6" font-family="Arial,Helvetica,sans-serif">See door/window schedule for sizes</text>`);
  }

  parts.push(renderDrawingTitle(`Floor Plan — ${floor.name}`, `Level +${floor.elevation.toFixed(2)} · scale 1:100`, vp));

  return endSvg(parts, vp, titleMeta);
}
