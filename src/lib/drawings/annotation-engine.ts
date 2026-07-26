import { renderProvenanceNote } from './disciplines/svg-shared';
import type { DrawingProvenance } from '@/domain/drawing-provenance';
import type { RoomProgramme } from '@/domain/ws6-types';

function esc(s: string | number): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmt(n: number): string {
  return n.toFixed(1);
}

export interface RoomZone {
  id: string;
  name: string;
  area: number;
  centerX: number;
  centerY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  provenance?: DrawingProvenance;
}

export function renderRoomLabel(
  room: RoomZone,
  vp: { px: (p: { x: number; y: number }) => number; py: (p: { x: number; y: number }) => number },
  printMode = false,
): string {
  const cx = vp.px({ x: room.centerX, y: room.centerY });
  const cy = vp.py({ x: room.centerX, y: room.centerY });
  const fill = printMode ? '#0f172a' : '#e2e8f0';
  const subFill = printMode ? '#475569' : '#94a3b8';
  const parts: string[] = [];
  parts.push(`<g>`);
  parts.push(`<text x="${fmt(cx)}" y="${fmt(cy - 4)}" fill="${fill}" font-size="10" font-weight="700" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(room.name)}</text>`);
  parts.push(`<text x="${fmt(cx)}" y="${fmt(cy + 10)}" fill="${subFill}" font-size="8" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${room.area.toFixed(1)} m²</text>`);
  if (room.provenance && room.provenance.source !== 'user') {
    const provNote = renderProvenanceNote(room.provenance, cx - 20, cy + 24);
    if (provNote) parts.push(provNote);
  }
  parts.push(`</g>`);
  return parts.join('');
}

export function renderScaleBar(
  meters: number,
  x: number,
  y: number,
  pxPerMeter: number,
  printMode = false,
): string {
  const totalPx = meters * pxPerMeter;
  const fill = printMode ? '#1e293b' : '#e2e8f0';
  const subFill = printMode ? '#475569' : '#94a3b8';
  const parts: string[] = [];
  parts.push(`<g font-family="Arial,Helvetica,sans-serif">`);
  parts.push(`<text x="${fmt(x)}" y="${fmt(y - 4)}" fill="${subFill}" font-size="7">0</text>`);
  parts.push(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(totalPx / 2)}" height="4" fill="${fill}"/>`);
  parts.push(`<rect x="${fmt(x + totalPx / 2)}" y="${fmt(y)}" width="${fmt(totalPx / 2)}" height="4" fill="${subFill}"/>`);
  parts.push(`<text x="${fmt(x + totalPx / 2)}" y="${fmt(y - 4)}" fill="${subFill}" font-size="7" text-anchor="middle">${(meters / 2).toFixed(0)}m</text>`);
  parts.push(`<text x="${fmt(x + totalPx)}" y="${fmt(y - 4)}" fill="${subFill}" font-size="7" text-anchor="end">${meters}m</text>`);
  parts.push(`</g>`);
  return parts.join('');
}

export function renderNorthArrow(
  x: number,
  y: number,
  label = 'N',
  printMode = false,
): string {
  const fill = printMode ? '#1e293b' : '#d4a574';
  const darkFill = printMode ? '#0f172a' : '#a16207';
  const stroke = printMode ? '#0f172a' : '#0b1220';
  return [
    `<g transform="translate(${fmt(x)},${fmt(y)})">`,
    `<polygon points="0,-22 -7,0 7,0" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    `<polygon points="0,-22 0,0 7,0" fill="${darkFill}" stroke="${stroke}" stroke-width="1"/>`,
    `<text x="0" y="16" fill="${fill}" font-size="11" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(label)}</text>`,
    `</g>`,
  ].join('');
}

export function renderScheduleRef(
  scheduleType: string,
  sheetRef: string,
  x: number,
  y: number,
  printMode = false,
): string {
  return [
    `<g>`,
    `<rect x="${fmt(x - 14)}" y="${fmt(y - 7)}" width="28" height="14" rx="4" fill="none" stroke="${printMode ? '#475569' : '#64748b'}" stroke-width="1.5"/>`,
    `<text x="${fmt(x)}" y="${fmt(y + 4)}" fill="${printMode ? '#1e293b' : '#94a3b8'}" font-size="7" text-anchor="middle" font-weight="bold" font-family="Arial,Helvetica,sans-serif">${esc(scheduleType)}</text>`,
    `<text x="${fmt(x)}" y="${fmt(y + 16)}" fill="${printMode ? '#475569' : '#64748b'}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(sheetRef)}</text>`,
    `</g>`,
  ].join('');
}

export function renderMaterialTag(
  material: string,
  x: number,
  y: number,
  printMode = false,
): string {
  const fill = printMode ? '#1e293b' : '#e2e8f0';
  return [
    `<text x="${fmt(x)}" y="${fmt(y)}" fill="${fill}" font-size="6" font-family="Arial,Helvetica,sans-serif" font-style="italic">[${esc(material)}]</text>`,
  ].join('');
}

export function renderKeynote(
  number: number,
  x: number,
  y: number,
  printMode = false,
): string {
  const fill = printMode ? '#0f172a' : '#0b1220';
  const stroke = printMode ? '#1e293b' : '#94a3b8';
  const textFill = printMode ? '#ffffff' : '#e2e8f0';
  return [
    `<g>`,
    `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="8" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
    `<text x="${fmt(x)}" y="${fmt(y + 3)}" fill="${textFill}" font-size="8" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${number}</text>`,
    `</g>`,
  ].join('');
}

export interface RoomComputeResult {
  rooms: RoomZone[];
}

// ── Detail / callout reference bubble ──
export function renderDetailBubble(
  detailNumber: number,
  sheetRef: string,
  x: number,
  y: number,
  printMode = false,
): string {
  const fill = printMode ? '#0f172a' : '#0b1220';
  const stroke = printMode ? '#475569' : '#d4a574';
  const textFill = printMode ? '#ffffff' : '#e2e8f0';
  const subFill = printMode ? '#64748b' : '#94a3b8';
  return [
    `<g>`,
    `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="10" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
    `<text x="${fmt(x)}" y="${fmt(y + 4)}" fill="${textFill}" font-size="9" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${detailNumber}</text>`,
    `<rect x="${fmt(x - 20)}" y="${fmt(y + 12)}" width="40" height="12" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    `<text x="${fmt(x)}" y="${fmt(y + 21)}" fill="${subFill}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(sheetRef)}</text>`,
    `<line x1="${fmt(x)}" y1="${fmt(y + 10)}" x2="${fmt(x)}" y2="${fmt(y + 12)}" stroke="${stroke}" stroke-width="1"/>`,
    `</g>`,
  ].join('');
}

// ── Elevation reference mark on plan ──
export function renderElevationRefMark(
  label: string,
  sheetRef: string,
  x: number,
  y: number,
  direction: 'left' | 'right' | 'up' | 'down' = 'right',
  printMode = false,
): string {
  const stroke = printMode ? '#64748b' : '#d4a574';
  const fill = printMode ? '#0f172a' : '#0b1220';
  const textFill = printMode ? '#ffffff' : '#e2e8f0';
  const subFill = printMode ? '#64748b' : '#94a3b8';
  const arrLen = 16;
  let dx = 0, dy = 0;
  if (direction === 'right') { dx = arrLen; }
  if (direction === 'left') { dx = -arrLen; }
  if (direction === 'up') { dy = -arrLen; }
  if (direction === 'down') { dy = arrLen; }
  return [
    `<g>`,
    `<line x1="${fmt(x)}" y1="${fmt(y)}" x2="${fmt(x + dx)}" y2="${fmt(y + dy)}" stroke="${stroke}" stroke-width="1.5"/>`,
    `<circle cx="${fmt(x + dx)}" cy="${fmt(y + dy)}" r="9" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
    `<text x="${fmt(x + dx)}" y="${fmt(y + dy + 3)}" fill="${textFill}" font-size="8" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(label)}</text>`,
    `<text x="${fmt(x + dx)}" y="${fmt(y + dy + 16)}" fill="${subFill}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(sheetRef)}</text>`,
    `</g>`,
  ].join('');
}

// ── Wall / partition type tag ──
export interface WallTypeEntry {
  wallId: string;
  typeCode: string;
  description: string;
}

export function renderWallTypeTag(
  typeCode: string,
  x: number,
  y: number,
  printMode = false,
): string {
  const fill = printMode ? '#1e293b' : '#1e293b';
  const stroke = printMode ? '#475569' : '#475569';
  const textFill = printMode ? '#e2e8f0' : '#e2e8f0';
  return [
    `<g>`,
    `<rect x="${fmt(x - 14)}" y="${fmt(y - 7)}" width="28" height="14" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    `<text x="${fmt(x)}" y="${fmt(y + 4)}" fill="${textFill}" font-size="7" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(typeCode)}</text>`,
    `</g>`,
  ].join('');
}

// ── Finish / surface treatment tag ──
export function renderFinishTag(
  finishCode: string,
  x: number,
  y: number,
  printMode = false,
): string {
  const stroke = printMode ? '#64748b' : '#94a3b8';
  const textFill = printMode ? '#475569' : '#94a3b8';
  return [
    `<g>`,
    `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="8" fill="none" stroke="${stroke}" stroke-width="1" stroke-dasharray="3 2"/>`,
    `<text x="${fmt(x)}" y="${fmt(y + 3)}" fill="${textFill}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(finishCode)}</text>`,
    `</g>`,
  ].join('');
}

// ── Cross-sheet reference ──
export function renderCrossSheetRef(
  targetSheet: string,
  targetDrawing: string,
  x: number,
  y: number,
  printMode = false,
): string {
  const stroke = printMode ? '#475569' : '#64748b';
  const textFill = printMode ? '#1e293b' : '#e2e8f0';
  const subFill = printMode ? '#64748b' : '#94a3b8';
  return [
    `<g>`,
    `<rect x="${fmt(x - 2)}" y="${fmt(y - 8)}" width="28" height="16" rx="3" fill="none" stroke="${stroke}" stroke-width="1.5"/>`,
    `<text x="${fmt(x + 12)}" y="${fmt(y + 4)}" fill="${textFill}" font-size="8" font-weight="bold" font-family="Arial,Helvetica,sans-serif">${esc(targetSheet)}</text>`,
    `<polygon points="${fmt(x + 26)},${fmt(y)} ${fmt(x + 34)},${fmt(y - 4)} ${fmt(x + 34)},${fmt(y + 4)}" fill="${stroke}"/>`,
    `<text x="${fmt(x)}" y="${fmt(y + 22)}" fill="${subFill}" font-size="7" font-family="Arial,Helvetica,sans-serif">CONT. ON ${esc(targetDrawing)}</text>`,
    `</g>`,
  ].join('');
}

// ── Keynote schedule panel ──
export interface KeynoteEntry {
  number: number;
  text: string;
}

export function renderKeynoteSchedule(
  keynotes: KeynoteEntry[],
  x: number,
  y: number,
  printMode = false,
): string {
  const parts: string[] = [];
  const bg = printMode ? '#f8fafc' : '#0b1220';
  const border = printMode ? '#cbd5e1' : '#24324b';
  const headerFill = printMode ? '#1e293b' : '#e2e8f0';
  const textFill = printMode ? '#475569' : '#94a3b8';
  const rowH = 16;
  const w = 200;
  const h = 24 + keynotes.length * rowH;

  parts.push(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${w}" height="${h}" fill="${bg}" stroke="${border}" stroke-width="1" rx="3"/>`);
  parts.push(`<text x="${fmt(x + w / 2)}" y="${fmt(y + 14)}" fill="${headerFill}" font-size="9" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">KEYNOTES</text>`);
  for (let i = 0; i < keynotes.length; i++) {
    const ry = y + 24 + i * rowH;
    const numFill = printMode ? '#0f172a' : '#0b1220';
    const numStroke = printMode ? '#475569' : '#94a3b8';
    const numText = printMode ? '#ffffff' : '#e2e8f0';
    parts.push(`<circle cx="${fmt(x + 12)}" cy="${fmt(ry + 7)}" r="6" fill="${numFill}" stroke="${numStroke}" stroke-width="1"/>`);
    parts.push(`<text x="${fmt(x + 12)}" y="${fmt(ry + 10)}" fill="${numText}" font-size="6" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${keynotes[i].number}</text>`);
    parts.push(`<text x="${fmt(x + 24)}" y="${fmt(ry + 10)}" fill="${textFill}" font-size="7" font-family="Arial,Helvetica,sans-serif">${esc(keynotes[i].text)}</text>`);
  }
  return parts.join('');
}

function hasWallAtCoord(
  walls: { start: { x: number; y: number }; end: { x: number; y: number } }[],
  axis: 'x' | 'y',
  coord: number,
  rangeMin: number,
  rangeMax: number,
): boolean {
  return walls.some(w => {
    if (axis === 'x') {
      const v = Math.abs(w.start.x - w.end.x) < 0.01;
      if (!v) return false;
      const wx = Math.round(w.start.x * 100) / 100;
      if (Math.abs(wx - coord) > 0.01) return false;
      const wyMin = Math.min(w.start.y, w.end.y);
      const wyMax = Math.max(w.start.y, w.end.y);
      return wyMin <= rangeMin + 0.01 && wyMax >= rangeMax - 0.01;
    }
    const h = Math.abs(w.start.y - w.end.y) < 0.01;
    if (!h) return false;
    const wy = Math.round(w.start.y * 100) / 100;
    if (Math.abs(wy - coord) > 0.01) return false;
    const wxMin = Math.min(w.start.x, w.end.x);
    const wxMax = Math.max(w.start.x, w.end.x);
    return wxMin <= rangeMin + 0.01 && wxMax >= rangeMax - 0.01;
  });
}

export function computeRoomsFromWalls(
  walls: { start: { x: number; y: number }; end: { x: number; y: number }; structural?: boolean }[],
  _floorElevation: number,
  roomProgramme?: Record<string, RoomProgramme>,
): RoomComputeResult {
  if (walls.length < 4) return { rooms: [] };
  const xs = new Set<number>();
  const ys = new Set<number>();
  for (const w of walls) {
    xs.add(Math.round(w.start.x * 100) / 100);
    xs.add(Math.round(w.end.x * 100) / 100);
    ys.add(Math.round(w.start.y * 100) / 100);
    ys.add(Math.round(w.end.y * 100) / 100);
  }
  const sortedX = Array.from(xs).sort((a, b) => a - b);
  const sortedY = Array.from(ys).sort((a, b) => a - b);
  if (sortedX.length < 2 || sortedY.length < 2) return { rooms: [] };
  const rooms: RoomZone[] = [];
  let roomIdx = 0;
  const sortedRoomKeys = roomProgramme ? Object.keys(roomProgramme).sort() : [];
  for (let xi = 0; xi < sortedX.length - 1; xi++) {
    for (let yi = 0; yi < sortedY.length - 1; yi++) {
      const cx = (sortedX[xi] + sortedX[xi + 1]) / 2;
      const cy = (sortedY[yi] + sortedY[yi + 1]) / 2;
      const cellW = sortedX[xi + 1] - sortedX[xi];
      const cellD = sortedY[yi + 1] - sortedY[yi];
      if (cellW < 0.01 || cellD < 0.01) continue;
      const hasWallLeft = hasWallAtCoord(walls, 'x', sortedX[xi], sortedY[yi], sortedY[yi + 1]);
      const hasWallRight = hasWallAtCoord(walls, 'x', sortedX[xi + 1], sortedY[yi], sortedY[yi + 1]);
      const hasWallBottom = hasWallAtCoord(walls, 'y', sortedY[yi], sortedX[xi], sortedX[xi + 1]);
      const hasWallTop = hasWallAtCoord(walls, 'y', sortedY[yi + 1], sortedX[xi], sortedX[xi + 1]);
      if (hasWallLeft && hasWallRight && hasWallBottom && hasWallTop) {
        const area = cellW * cellD;
        const roomKey = sortedRoomKeys[rooms.length] ?? `room-${roomIdx + 1}`;
        const canonicalName = roomProgramme?.[roomKey] as RoomProgramme | undefined;
        roomIdx++;
        rooms.push({
          id: roomKey,
          name: canonicalName ?? `Room ${roomIdx}`,
          area,
          centerX: cx,
          centerY: cy,
          minX: sortedX[xi],
          maxX: sortedX[xi + 1],
          minY: sortedY[yi],
          maxY: sortedY[yi + 1],
          provenance: canonicalName
            ? { source: 'user', confidence: 'high', note: 'Programme assigned' }
            : { source: 'derived', confidence: 'medium', note: 'Room boundary inferred from wall layout' },
        });
      }
    }
  }
  return { rooms };
}
