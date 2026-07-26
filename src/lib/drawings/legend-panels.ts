const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function panelFill(printMode: boolean): string {
  return printMode ? '#f8fafc' : '#0e1830';
}

function textColor(printMode: boolean): string {
  return printMode ? '#0f172a' : '#e2e8f0';
}

function subColor(printMode: boolean): string {
  return printMode ? '#475569' : '#94a3b8';
}

function borderColor(printMode: boolean): string {
  return printMode ? '#cbd5e1' : '#24324b';
}

export function renderMaterialLegend(x: number, y: number, w: number, h: number, printMode: boolean): string[] {
  const parts: string[] = [];
  const bg = panelFill(printMode);
  const tc = textColor(printMode);
  const sc = subColor(printMode);
  const bc = borderColor(printMode);

  parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${bg}" stroke="${bc}" stroke-width="0.5" rx="3"/>`);
  parts.push(`<text x="${(x + 6).toFixed(1)}" y="${(y + 14).toFixed(1)}" fill="${tc}" font-size="8" font-weight="700" font-family="Arial,Helvetica,sans-serif">Material Legend</text>`);
  parts.push(`<line x1="${(x + 6).toFixed(1)}" y1="${(y + 18).toFixed(1)}" x2="${(x + w - 6).toFixed(1)}" y2="${(y + 18).toFixed(1)}" stroke="${sc}" stroke-width="0.35" opacity="0.3"/>`);

  const items = [
    { label: 'Concrete', hatch: 'concrete-hatch', color: '#1e293b' },
    { label: 'Brick / Blockwork', hatch: 'brick-hatch', color: '#334155' },
    { label: 'Insulation', hatch: 'insulation-hatch', color: '#57534e' },
    { label: 'Hardcore', hatch: 'hardcore-hatch', color: '#475569' },
    { label: 'Timber Stud', hatch: 'timber-hatch', color: '#78716c' },
    { label: 'Screed', hatch: 'screed-hatch', color: '#64748b' },
    { label: 'Glazing', hatch: 'glazing-hatch', color: '#94a3b8' },
    { label: 'Structural Steel', hatch: '', color: '#64748b' },
  ];

  let iy = y + 24;
  const rowH = Math.min(14, (h - 30) / items.length);

  for (const item of items) {
    parts.push(`<rect x="${(x + 6).toFixed(1)}" y="${iy.toFixed(1)}" width="10" height="10" fill="${item.color}" stroke="${bc}" stroke-width="0.5"/>`);
    if (item.hatch) {
      parts.push(`<rect x="${(x + 6).toFixed(1)}" y="${iy.toFixed(1)}" width="10" height="10" fill="url(#${item.hatch})" opacity="0.4"/>`);
    }
    parts.push(`<text x="${(x + 20).toFixed(1)}" y="${(iy + 8).toFixed(1)}" fill="${sc}" font-size="6" font-family="Arial,Helvetica,sans-serif">${esc(item.label)}</text>`);
    iy += rowH;
  }

  return parts;
}

export function renderScaleBar(x: number, y: number, w: number, printMode: boolean, scaleText = '1:100'): string[] {
  const parts: string[] = [];
  const tc = textColor(printMode);
  const sc = subColor(printMode);

  const totalSegments = 4;
  const segW = Math.min(w * 0.8, 120) / totalSegments;
  const barY = y + 16;
  const barH = 6;

  parts.push(`<text x="${x.toFixed(1)}" y="${(y + 10).toFixed(1)}" fill="${sc}" font-size="6" font-family="Arial,Helvetica,sans-serif">Scale Bar ${scaleText}</text>`);

  for (let i = 0; i < totalSegments; i++) {
    const sx = x + i * segW;
    const fill = i % 2 === 0 ? sc : tc;
    const val = Math.round((i + 1) * 2.5 * 10) / 10;
    parts.push(`<rect x="${sx.toFixed(1)}" y="${barY.toFixed(1)}" width="${segW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${fill}" stroke="${sc}" stroke-width="0.35"/>`);
    parts.push(`<text x="${(sx + segW).toFixed(1)}" y="${(barY + barH + 10).toFixed(1)}" fill="${sc}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${val}m</text>`);
  }

  return parts;
}

export function renderNorthArrow(x: number, y: number, size: number, printMode: boolean): string[] {
  const parts: string[] = [];
  const tc = textColor(printMode);
  const sc = subColor(printMode);
  const half = size / 2;

  parts.push(`<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">`);

  // Circle
  parts.push(`<circle cx="0" cy="0" r="${half.toFixed(1)}" fill="none" stroke="${sc}" stroke-width="0.75"/>`);

  // N arrow
  parts.push(`<polygon points="0,${(-half).toFixed(1)} ${(-half * 0.3).toFixed(1)},${(half * 0.4).toFixed(1)} ${(half * 0.3).toFixed(1)},${(half * 0.4).toFixed(1)}" fill="${tc}" stroke="none"/>`);

  // N text
  parts.push(`<text x="0" y="${(-half - 4).toFixed(1)}" fill="${tc}" font-size="7" font-weight="700" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">N</text>`);

  parts.push('</g>');
  return parts;
}

export function renderKeynotePanel(x: number, y: number, w: number, h: number, keynotes: { num: number; text: string }[], printMode: boolean): string[] {
  const parts: string[] = [];
  const bg = panelFill(printMode);
  const tc = textColor(printMode);
  const sc = subColor(printMode);
  const bc = borderColor(printMode);

  if (keynotes.length === 0) return parts;

  parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${bg}" stroke="${bc}" stroke-width="0.5" rx="3"/>`);
  parts.push(`<text x="${(x + 6).toFixed(1)}" y="${(y + 14).toFixed(1)}" fill="${tc}" font-size="8" font-weight="700" font-family="Arial,Helvetica,sans-serif">Keynotes</text>`);
  parts.push(`<line x1="${(x + 6).toFixed(1)}" y1="${(y + 18).toFixed(1)}" x2="${(x + w - 6).toFixed(1)}" y2="${(y + 18).toFixed(1)}" stroke="${sc}" stroke-width="0.35" opacity="0.3"/>`);

  let iy = y + 24;
  const rowH = Math.min(14, (h - 30) / keynotes.length);

  for (const kn of keynotes) {
    parts.push(`<circle cx="${(x + 10).toFixed(1)}" cy="${(iy + 5).toFixed(1)}" r="5" fill="${bg}" stroke="${sc}" stroke-width="0.75"/>`);
    parts.push(`<text x="${(x + 10).toFixed(1)}" y="${(iy + 7).toFixed(1)}" fill="${tc}" font-size="5" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${kn.num}</text>`);
    parts.push(`<text x="${(x + 18).toFixed(1)}" y="${(iy + 7).toFixed(1)}" fill="${sc}" font-size="5.5" font-family="Arial,Helvetica,sans-serif">${esc(kn.text)}</text>`);
    iy += rowH;
  }

  return parts;
}

export function renderDrawingListPanel(x: number, y: number, w: number, h: number, drawings: { label: string; sheet: string }[], printMode: boolean): string[] {
  const parts: string[] = [];
  const bg = panelFill(printMode);
  const tc = textColor(printMode);
  const sc = subColor(printMode);
  const bc = borderColor(printMode);

  if (drawings.length === 0) return parts;

  parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${bg}" stroke="${bc}" stroke-width="0.5" rx="3"/>`);
  parts.push(`<text x="${(x + 6).toFixed(1)}" y="${(y + 14).toFixed(1)}" fill="${tc}" font-size="8" font-weight="700" font-family="Arial,Helvetica,sans-serif">Drawing List</text>`);
  parts.push(`<line x1="${(x + 6).toFixed(1)}" y1="${(y + 18).toFixed(1)}" x2="${(x + w - 6).toFixed(1)}" y2="${(y + 18).toFixed(1)}" stroke="${sc}" stroke-width="0.35" opacity="0.3"/>`);

  // Header
  parts.push(`<text x="${(x + 6).toFixed(1)}" y="${(y + 28).toFixed(1)}" fill="${tc}" font-size="6" font-weight="700" font-family="Arial,Helvetica,sans-serif">Drawing</text>`);
  parts.push(`<text x="${(x + w * 0.6).toFixed(1)}" y="${(y + 28).toFixed(1)}" fill="${tc}" font-size="6" font-weight="700" font-family="Arial,Helvetica,sans-serif">Sheet</text>`);

  let iy = y + 32;
  const rowH = Math.min(14, (h - 36) / Math.max(drawings.length, 1));

  for (const d of drawings) {
    parts.push(`<text x="${(x + 6).toFixed(1)}" y="${(iy + 6).toFixed(1)}" fill="${sc}" font-size="5.5" font-family="Arial,Helvetica,sans-serif">${esc(d.label)}</text>`);
    parts.push(`<text x="${(x + w * 0.6).toFixed(1)}" y="${(iy + 6).toFixed(1)}" fill="${sc}" font-size="5.5" font-family="Arial,Helvetica,sans-serif">${esc(d.sheet)}</text>`);
    iy += rowH;
  }

  return parts;
}

export function renderProjectInfoPanel(x: number, y: number, w: number, h: number, info: { label: string; value: string }[], printMode: boolean): string[] {
  const parts: string[] = [];
  const bg = panelFill(printMode);
  const tc = textColor(printMode);
  const sc = subColor(printMode);
  const bc = borderColor(printMode);

  if (info.length === 0) return parts;

  parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${bg}" stroke="${bc}" stroke-width="0.5" rx="3"/>`);
  parts.push(`<text x="${(x + 6).toFixed(1)}" y="${(y + 14).toFixed(1)}" fill="${tc}" font-size="8" font-weight="700" font-family="Arial,Helvetica,sans-serif">Project Information</text>`);
  parts.push(`<line x1="${(x + 6).toFixed(1)}" y1="${(y + 18).toFixed(1)}" x2="${(x + w - 6).toFixed(1)}" y2="${(y + 18).toFixed(1)}" stroke="${sc}" stroke-width="0.35" opacity="0.3"/>`);

  let iy = y + 24;
  const rowH = Math.min(16, (h - 28) / Math.max(info.length, 1));

  for (const item of info) {
    parts.push(`<text x="${(x + 6).toFixed(1)}" y="${(iy + 4).toFixed(1)}" fill="${sc}" font-size="5.5" font-family="Arial,Helvetica,sans-serif">${esc(item.label)}:</text>`);
    parts.push(`<text x="${(x + 6).toFixed(1)}" y="${(iy + 13).toFixed(1)}" fill="${tc}" font-size="7" font-family="Arial,Helvetica,sans-serif">${esc(item.value)}</text>`);
    iy += rowH;
  }

  return parts;
}

export function renderIssueNotePanel(x: number, y: number, _w: number, printMode: boolean): string[] {
  const parts: string[] = [];
  const sc = subColor(printMode);

  parts.push(`<text x="${x.toFixed(1)}" y="${(y + 10).toFixed(1)}" fill="${sc}" font-size="5.5" font-style="italic" font-family="Arial,Helvetica,sans-serif">Issue Purpose: For Review and Comment</text>`);
  parts.push(`<text x="${x.toFixed(1)}" y="${(y + 18).toFixed(1)}" fill="${sc}" font-size="5.5" font-style="italic" font-family="Arial,Helvetica,sans-serif">Do not scale from this drawing. Verify all dimensions on site.</text>`);

  return parts;
}
