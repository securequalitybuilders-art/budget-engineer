
export type ReferenceDirection = 'left' | 'right' | 'up' | 'down';
export type SectionAxis = 'AA' | 'BB';

export interface ElevationRefConfig {
  label: string;
  sheetRef: string;
  x: number;
  y: number;
  direction: ReferenceDirection;
}

export function renderSectionCutMarker(
  axis: SectionAxis,
  position: number,
  vp: { px: (p: { x: number; y: number }) => number; py: (p: { x: number; y: number }) => number; w: number; h: number },
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const stroke = printMode ? '#64748b' : '#d4a574';
  const fill = printMode ? '#0b1220' : '#0b1220';
  const textFill = printMode ? '#d4a574' : '#d4a574';
  const bubble = axis === 'AA' ? 'A' : 'B';

  if (axis === 'AA') {
    const ly = vp.py({ x: 0, y: position });
    parts.push(`<line x1="6" y1="${ly.toFixed(1)}" x2="${(vp.w - 6).toFixed(1)}" y2="${ly.toFixed(1)}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="10 4 2 4"/>`);

    for (const cx of [16, vp.w - 16]) {
      parts.push(`<circle cx="${cx.toFixed(1)}" cy="${ly.toFixed(1)}" r="9" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
      parts.push(`<text x="${cx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" fill="${textFill}" font-size="11" font-weight="700" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${bubble}</text>`);
      const arrowDir = cx < vp.w / 2 ? 1 : -1;
      parts.push(`<polygon points="${(cx + arrowDir * 6).toFixed(1)},${(ly - 4).toFixed(1)} ${(cx + arrowDir * 12).toFixed(1)},${ly.toFixed(1)} ${(cx + arrowDir * 6).toFixed(1)},${(ly + 4).toFixed(1)}" fill="${stroke}"/>`);
    }
  } else {
    const lx = vp.px({ x: position, y: 0 });
    parts.push(`<line x1="${lx.toFixed(1)}" y1="6" x2="${lx.toFixed(1)}" y2="${(vp.h - 6).toFixed(1)}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="10 4 2 4"/>`);

    for (const cy of [16, vp.h - 16]) {
      parts.push(`<circle cx="${lx.toFixed(1)}" cy="${cy.toFixed(1)}" r="9" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
      parts.push(`<text x="${lx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" fill="${textFill}" font-size="11" font-weight="700" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${bubble}</text>`);
      const arrowDir = cy < vp.h / 2 ? 1 : -1;
      parts.push(`<polygon points="${(lx - 4).toFixed(1)},${(cy + arrowDir * 6).toFixed(1)} ${lx.toFixed(1)},${(cy + arrowDir * 12).toFixed(1)} ${(lx + 4).toFixed(1)},${(cy + arrowDir * 6).toFixed(1)}" fill="${stroke}"/>`);
    }
  }

  return parts;
}

export function renderElevationBubble(
  label: string,
  sheetRef: string,
  x: number, y: number,
  direction: ReferenceDirection,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const stroke = printMode ? '#64748b' : '#d4a574';
  const fill = printMode ? '#0f172a' : '#0b1220';
  const textFill = printMode ? '#ffffff' : '#e2e8f0';
  const subFill = printMode ? '#64748b' : '#94a3b8';
  const arrLen = 14;

  let dx = 0, dy = 0;
  if (direction === 'right') dx = arrLen;
  else if (direction === 'left') dx = -arrLen;
  else if (direction === 'up') dy = -arrLen;
  else if (direction === 'down') dy = arrLen;

  const tipX = x + dx;
  const tipY = y + dy;

  parts.push(`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${tipX.toFixed(1)}" y2="${tipY.toFixed(1)}" stroke="${stroke}" stroke-width="1.5"/>`);

  parts.push(`<circle cx="${tipX.toFixed(1)}" cy="${tipY.toFixed(1)}" r="9" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
  parts.push(`<text x="${tipX.toFixed(1)}" y="${(tipY + 3).toFixed(1)}" fill="${textFill}" font-size="8" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${label}</text>`);

  parts.push(`<text x="${tipX.toFixed(1)}" y="${(tipY + 16).toFixed(1)}" fill="${subFill}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${sheetRef}</text>`);

  return parts;
}

export function renderSheetRefBubble(
  sheetNumber: string,
  detailNumber: string,
  x: number, y: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const stroke = printMode ? '#64748b' : '#d4a574';
  const fill = printMode ? '#0f172a' : '#0b1220';
  const textFill = printMode ? '#ffffff' : '#e2e8f0';
  const subFill = printMode ? '#64748b' : '#94a3b8';

  parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
  parts.push(`<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" fill="${textFill}" font-size="9" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${detailNumber}</text>`);

  parts.push(`<rect x="${(x - 20).toFixed(1)}" y="${(y + 12).toFixed(1)}" width="40" height="12" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`);
  parts.push(`<text x="${x.toFixed(1)}" y="${(y + 21).toFixed(1)}" fill="${subFill}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${sheetNumber}</text>`);

  parts.push(`<line x1="${x.toFixed(1)}" y1="${(y + 10).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + 12).toFixed(1)}" stroke="${stroke}" stroke-width="1"/>`);

  return parts;
}

export function renderElevationArrow(
  label: string,
  x: number, y: number,
  direction: ReferenceDirection,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const stroke = printMode ? '#64748b' : '#94a3b8';
  const textFill = printMode ? '#475569' : '#94a3b8';

  const arrLen = 20;
  let dx = 0, dy = 0;
  if (direction === 'right') dx = arrLen;
  else if (direction === 'left') dx = -arrLen;
  else if (direction === 'up') dy = -arrLen;
  else if (direction === 'down') dy = arrLen;

  const tipX = x + dx;
  const tipY = y + dy;
  const perpX = -dy * 0.3;
  const perpY = dx * 0.3;

  parts.push(`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${tipX.toFixed(1)}" y2="${tipY.toFixed(1)}" stroke="${stroke}" stroke-width="1.5"/>`);

  parts.push(`<polygon points="${tipX.toFixed(1)},${tipY.toFixed(1)} ${(tipX + perpX - dx * 0.2).toFixed(1)},${(tipY + perpY - dy * 0.2).toFixed(1)} ${(tipX - perpX - dx * 0.2).toFixed(1)},${(tipY - perpY - dy * 0.2).toFixed(1)}" fill="${stroke}"/>`);

  const labelOffset = 6;
  const lx = x + dx * 0.5 + (direction === 'up' || direction === 'down' ? 10 : 0);
  const ly = y + dy * 0.5 + (direction === 'left' || direction === 'right' ? -labelOffset : (direction === 'up' ? -labelOffset : labelOffset + 10));
  parts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="${textFill}" font-size="7" font-family="Arial,Helvetica,sans-serif">${label}</text>`);

  return parts;
}

export function renderCrossSheetReference(
  targetSheet: string,
  targetDrawing: string,
  x: number, y: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const stroke = printMode ? '#475569' : '#64748b';
  const textFill = printMode ? '#1e293b' : '#e2e8f0';
  const subFill = printMode ? '#64748b' : '#94a3b8';

  parts.push(`<rect x="${(x - 2).toFixed(1)}" y="${(y - 8).toFixed(1)}" width="28" height="16" rx="3" fill="none" stroke="${stroke}" stroke-width="1.5"/>`);
  parts.push(`<text x="${(x + 12).toFixed(1)}" y="${(y + 4).toFixed(1)}" fill="${textFill}" font-size="8" font-weight="bold" font-family="Arial,Helvetica,sans-serif">${targetSheet}</text>`);
  parts.push(`<polygon points="${(x + 26).toFixed(1)},${y.toFixed(1)} ${(x + 34).toFixed(1)},${(y - 4).toFixed(1)} ${(x + 34).toFixed(1)},${(y + 4).toFixed(1)}" fill="${stroke}"/>`);
  parts.push(`<text x="${x.toFixed(1)}" y="${(y + 22).toFixed(1)}" fill="${subFill}" font-size="7" font-family="Arial,Helvetica,sans-serif">CONT. ON ${targetDrawing}</text>`);

  return parts;
}

export function renderColumnGridBubble(
  label: string,
  x: number, y: number,
  printMode: boolean,
): string {
  const stroke = printMode ? '#64748b' : '#94a3b8';
  const fill = printMode ? '#0f172a' : '#1e293b';
  const textFill = printMode ? '#e2e8f0' : '#e2e8f0';

  return [
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" fill="${textFill}" font-size="8" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${label}</text>`,
  ].join('');
}
