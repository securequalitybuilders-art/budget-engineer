import type { CadDocument } from '@/domain/ws6-types';
import { TitleBlockMeta, buildTitleBlock, TITLE_BLOCK_H } from '../title-block';
import { SCHEDULE_DERIVED_PROVENANCE } from '@/domain/drawing-provenance';
import { renderProvenanceNote } from './svg-shared';

export type ScheduleType = 'door' | 'window' | 'structural' | 'equipment' | 'room';

function esc(s: string | number): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildScheduleSvg(
  cad: CadDocument,
  type: ScheduleType,
  titleMeta?: TitleBlockMeta,
): string {
  const w = 840;
  const h = 594;
  const svgH = h + (titleMeta ? TITLE_BLOCK_H : 0);

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${svgH}" viewBox="0 0 ${w} ${svgH}">`,
    `<rect width="${w}" height="${svgH}" fill="#0b1220"/>`,
  ];

  const padX = 40;
  let cursorY = 40;

  parts.push(`<text x="${padX}" y="${cursorY}" fill="#e2e8f0" font-size="16" font-family="'Space Grotesk',Arial" font-weight="bold">${type.toUpperCase()} SCHEDULE</text>`);
  cursorY += 10;
  parts.push(`<line x1="${padX}" y1="${cursorY}" x2="${w - padX}" y2="${cursorY}" stroke="#334155" stroke-width="2"/>`);
  cursorY += 30;

  const rowH = 30;

  if (type === 'door') {
    const doors = cad?.openings.filter((o) => o.kind === 'door') ?? [];
    const cols = [
      { header: 'MARK', x: padX, width: 80 },
      { header: 'WIDTH (mm)', x: padX + 80, width: 100 },
      { header: 'HEIGHT (mm)', x: padX + 180, width: 100 },
      { header: 'MATERIAL', x: padX + 280, width: 150 },
      { header: 'FIRE RATING', x: padX + 430, width: 100 },
      { header: 'LEVEL', x: padX + 530, width: 120 },
    ];

    for (const c of cols) {
      parts.push(`<text x="${c.x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-weight="bold" font-family="Arial,Helvetica,sans-serif">${c.header}</text>`);
    }
    cursorY += 15;
    parts.push(`<line x1="${padX}" y1="${cursorY}" x2="${w - padX}" y2="${cursorY}" stroke="#1e293b" stroke-width="1"/>`);
    cursorY += 20;

    if (doors.length === 0) {
      parts.push(`<text x="${padX}" y="${cursorY}" fill="#64748b" font-size="10" font-family="Arial,Helvetica,sans-serif">No doors found in model.</text>`);
    } else {
      for (const d of doors) {
        const floor = cad?.floors.find((f) => f.id === d.floorId);
        const floorName = floor ? floor.name : 'Unknown';
        const mat = d.metadata?.material || (d.metadata?.properties?.material as string) || 'Timber';
        const fr = d.metadata?.fireRating || '-';
        const hMm = d.height || 2100;
        const wMm = Math.round(d.width * 1000);

        parts.push(`<text x="${cols[0].x}" y="${cursorY}" fill="#e2e8f0" font-size="10" font-family="Arial,Helvetica,sans-serif">D-${d.id.slice(0, 3).toUpperCase()}</text>`);
        parts.push(`<text x="${cols[1].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${wMm}</text>`);
        parts.push(`<text x="${cols[2].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${hMm}</text>`);
        parts.push(`<text x="${cols[3].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${esc(mat)}</text>`);
        parts.push(`<text x="${cols[4].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${fr}</text>`);
        parts.push(`<text x="${cols[5].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${floorName}</text>`);
        cursorY += rowH;
      }
    }
  } else if (type === 'window') {
    const windows = cad?.openings.filter((o) => o.kind === 'window') ?? [];
    const cols = [
      { header: 'MARK', x: padX, width: 80 },
      { header: 'WIDTH (mm)', x: padX + 80, width: 100 },
      { header: 'HEIGHT (mm)', x: padX + 180, width: 100 },
      { header: 'SILL (mm)', x: padX + 280, width: 100 },
      { header: 'TYPE', x: padX + 380, width: 150 },
      { header: 'LEVEL', x: padX + 530, width: 120 },
    ];

    for (const c of cols) {
      parts.push(`<text x="${c.x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-weight="bold" font-family="Arial,Helvetica,sans-serif">${c.header}</text>`);
    }
    cursorY += 15;
    parts.push(`<line x1="${padX}" y1="${cursorY}" x2="${w - padX}" y2="${cursorY}" stroke="#1e293b" stroke-width="1"/>`);
    cursorY += 20;

    if (windows.length === 0) {
      parts.push(`<text x="${padX}" y="${cursorY}" fill="#64748b" font-size="10" font-family="Arial,Helvetica,sans-serif">No windows found in model.</text>`);
    } else {
      for (const w_ of windows) {
        const floor = cad?.floors.find((f) => f.id === w_.floorId);
        const wMm = Math.round(w_.width * 1000);
        const hMm = w_.height || 1200;
        const sMm = w_.sillHeight || 900;
        const typeStr = w_.metadata?.typeName || (w_.metadata?.properties?.typeName as string) || 'Aluminium Casement';

        parts.push(`<text x="${cols[0].x}" y="${cursorY}" fill="#e2e8f0" font-size="10" font-family="Arial,Helvetica,sans-serif">W-${w_.id.slice(0, 3).toUpperCase()}</text>`);
        parts.push(`<text x="${cols[1].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${wMm}</text>`);
        parts.push(`<text x="${cols[2].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${hMm}</text>`);
        parts.push(`<text x="${cols[3].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${sMm}</text>`);
        parts.push(`<text x="${cols[4].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${esc(typeStr)}</text>`);
        parts.push(`<text x="${cols[5].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${floor?.name || 'Unknown'}</text>`);
        cursorY += rowH;
      }
    }
  } else if (type === 'structural') {
    const cols = [
      { header: 'ELEMENT', x: padX, width: 150 },
      { header: 'SYSTEM', x: padX + 150, width: 150 },
      { header: 'THICKNESS (mm)', x: padX + 300, width: 120 },
      { header: 'QTY / LENGTH', x: padX + 420, width: 150 },
    ];

    for (const c of cols) {
      parts.push(`<text x="${c.x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-weight="bold" font-family="Arial,Helvetica,sans-serif">${c.header}</text>`);
    }
    cursorY += 15;
    parts.push(`<line x1="${padX}" y1="${cursorY}" x2="${w - padX}" y2="${cursorY}" stroke="#1e293b" stroke-width="1"/>`);
    cursorY += 20;

    const matSystem = cad?.materialSystem ?? 'concrete';
    const extWalls = cad?.walls.filter(wl => wl.structural) ?? [];
    const intWalls = cad?.walls.filter(wl => !wl.structural) ?? [];
    const columns = cad?.blocks.filter(b => b.kind === 'column') ?? [];
    const footings = cad?.blocks.filter(b => b.kind === 'footing') ?? [];

    const rows: { element: string; system: string; thickness: string; qty: string }[] = [
      { element: 'Structural Walls', system: matSystem, thickness: '-', qty: `${extWalls.length} segments` },
      { element: 'Internal Partitions', system: 'Stud/Block', thickness: '-', qty: `${intWalls.length} segments` },
    ];
    if (columns.length > 0) {
      rows.push({ element: 'Columns', system: matSystem, thickness: '-', qty: `${columns.length} nos` });
    }
    if (footings.length > 0) {
      rows.push({ element: 'Pad Footings', system: matSystem, thickness: '-', qty: `${footings.length} nos` });
    }
    for (const row of rows) {
      parts.push(`<text x="${cols[0].x}" y="${cursorY}" fill="#e2e8f0" font-size="10" font-family="Arial,Helvetica,sans-serif">${row.element}</text>`);
      parts.push(`<text x="${cols[1].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${row.system}</text>`);
      parts.push(`<text x="${cols[2].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${row.thickness}</text>`);
      parts.push(`<text x="${cols[3].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${row.qty}</text>`);
      cursorY += rowH;
    }
  } else if (type === 'equipment') {
    const cols = [
      { header: 'TAG', x: padX, width: 80 },
      { header: 'TYPE', x: padX + 80, width: 120 },
      { header: 'CAPACITY', x: padX + 200, width: 100 },
      { header: 'REFRIGERANT', x: padX + 300, width: 100 },
      { header: 'LOCATION', x: padX + 400, width: 150 },
      { header: 'LEVEL', x: padX + 550, width: 100 },
    ];

    for (const c of cols) {
      parts.push(`<text x="${c.x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-weight="bold" font-family="Arial,Helvetica,sans-serif">${c.header}</text>`);
    }
    cursorY += 15;
    parts.push(`<line x1="${padX}" y1="${cursorY}" x2="${w - padX}" y2="${cursorY}" stroke="#1e293b" stroke-width="1"/>`);
    cursorY += 20;

    const hvacUnits = cad?.blocks.filter(b => ['hvac_unit', 'ac_unit', 'fc_u'].includes(b.kind)) ?? [];
    if (hvacUnits.length === 0) {
      parts.push(`<text x="${padX}" y="${cursorY}" fill="#64748b" font-size="10" font-family="Arial,Helvetica,sans-serif">No HVAC equipment found in model.</text>`);
    } else {
      for (let i = 0; i < hvacUnits.length; i++) {
        const u = hvacUnits[i];
        const tag = `AC-${String(i + 1).padStart(2, '0')}`;
        const typeStr = u.kind === 'fc_u' ? 'FCU' : 'Split AC';
        const floor = cad?.floors.find((f) => f.id === u.floorId);
        const floorName = floor ? floor.name : 'Unknown';
        const loc = `${(u.position.x).toFixed(1)}, ${(u.position.y).toFixed(1)}`;
        parts.push(`<text x="${cols[0].x}" y="${cursorY}" fill="#e2e8f0" font-size="10" font-family="Arial,Helvetica,sans-serif">${tag}</text>`);
        parts.push(`<text x="${cols[1].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${typeStr}</text>`);
        parts.push(`<text x="${cols[2].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">3.5kW</text>`);
        parts.push(`<text x="${cols[3].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">R32</text>`);
        parts.push(`<text x="${cols[4].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${loc}</text>`);
        parts.push(`<text x="${cols[5].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${floorName}</text>`);
        cursorY += rowH;
      }
    }
  } else if (type === 'room') {
    const cols = [
      { header: 'ROOM NAME', x: padX, width: 160 },
      { header: 'AREA (m²)', x: padX + 160, width: 100 },
      { header: 'LEVEL', x: padX + 260, width: 120 },
      { header: 'PROGRAMME', x: padX + 380, width: 150 },
    ];

    for (const c of cols) {
      parts.push(`<text x="${c.x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-weight="bold" font-family="Arial,Helvetica,sans-serif">${c.header}</text>`);
    }
    cursorY += 15;
    parts.push(`<line x1="${padX}" y1="${cursorY}" x2="${w - padX}" y2="${cursorY}" stroke="#1e293b" stroke-width="1"/>`);
    cursorY += 20;

    if (cad?.roomProgramme && Object.keys(cad.roomProgramme).length > 0) {
      for (const [roomName, area] of Object.entries(cad.roomProgramme)) {
        parts.push(`<text x="${cols[0].x}" y="${cursorY}" fill="#e2e8f0" font-size="10" font-family="Arial,Helvetica,sans-serif">${esc(roomName)}</text>`);
        parts.push(`<text x="${cols[1].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${area} m²</text>`);
        parts.push(`<text x="${cols[2].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">Ground Floor</text>`);
        parts.push(`<text x="${cols[3].x}" y="${cursorY}" fill="#94a3b8" font-size="10" font-family="Arial,Helvetica,sans-serif">${cad.roomProgramme as unknown as string}</text>`);
        cursorY += rowH;
      }
    } else {
      parts.push(`<text x="${padX}" y="${cursorY}" fill="#64748b" font-size="10" font-family="Arial,Helvetica,sans-serif">No room programme defined.</text>`);
    }
  }

  parts.push(renderProvenanceNote(SCHEDULE_DERIVED_PROVENANCE, padX, cursorY + 20));

  if (titleMeta) {
    parts.push(buildTitleBlock(w, svgH, titleMeta));
  }
  parts.push('</svg>');
  return parts.join('');
}
