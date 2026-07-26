export interface TitleBlockMeta {
  project: string;
  drawing: string;
  sheet?: string;
  scale?: string;
  date?: string;
  revision?: string;
  drawnBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  drawingType?: string;
  client?: string;
  projectNumber?: string;
  projectDescription?: string;
  provenanceSummary?: string;
  /**
   * Deprecated: inline schedules replaced by dedicated schedule sheets.
   * Kept for safety during transition.
   */
  schedules?: { title: string; rows: { col1: string; col2: string; col3: string }[] }[];
}

export const TITLE_BLOCK_H = 60; // Increased height for richer metadata

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildVerticalSection(
  p: string[],
  x: number,
  y: number,
  items: { label: string; value: string }[],
  printMode = false,
): void {
  const labelFill = printMode ? '#64748b' : '#64748b';
  const valueFill = printMode ? '#0f172a' : '#e2e8f0';
  let curY = y + 8;
  for (const item of items) {
    p.push(`<text x="${x + 4}" y="${curY}" fill="${labelFill}" font-size="6">${esc(item.label)}</text>`);
    p.push(`<text x="${x + 4}" y="${curY + 10}" fill="${valueFill}" font-size="9" font-weight="500">${esc(item.value)}</text>`);
    curY += 22;
  }
}

export function buildTitleBlock(w: number, h: number, meta: TitleBlockMeta, printMode = false): string {
  const y = h - TITLE_BLOCK_H;
  const date = meta.date ?? new Date().toISOString().slice(0, 10);
  const scale = meta.scale ?? '1:100 @ A4';
  const rev = meta.revision ?? 'A';
  const drawnBy = meta.drawnBy ?? 'Budget Engineer Studio';
  const checkedBy = meta.checkedBy ?? '';
  const approvedBy = meta.approvedBy ?? '';
  const sheet = meta.sheet;
  const dType = meta.drawingType ?? 'ARCHITECTURAL';
  const client = meta.client ?? '';
  const projectNumber = meta.projectNumber ?? '';
  const projectDescription = meta.projectDescription ?? '';

  const colW = Math.floor(w / 6);
  const outerStroke = printMode ? '#1e293b' : '#24324b';
  const innerStroke = printMode ? '#cbd5e1' : '#0f172a';
  const tbBg = printMode ? '#f1f5f9' : '#0e1830';
  const dividerStroke = printMode ? '#cbd5e1' : '#d4a574';
  const tbDivider = printMode ? '#94a3b8' : '#24324b';

  const p: string[] = [];
  p.push(`<g font-family="Arial,Helvetica,sans-serif">`);

  // Outer frame for the whole sheet
  p.push(`<rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="${outerStroke}" stroke-width="4"/>`);
  p.push(`<rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="none" stroke="${innerStroke}" stroke-width="1"/>`);

  // Title Block Background
  p.push(`<rect x="0" y="${y}" width="${w}" height="${TITLE_BLOCK_H}" fill="${tbBg}"/>`);
  p.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${dividerStroke}" stroke-width="2"/>`);

  // Vertical dividers
  for (let i = 1; i <= 4; i++) {
    p.push(`<line x1="${colW * i}" y1="${y}" x2="${colW * i}" y2="${h}" stroke="${tbDivider}" stroke-width="1"/>`);
  }

  // ── Column 1: Branding / Project ──
  buildVerticalSection(p, 0, y, [
    { label: 'PROJECT', value: meta.project },
    ...(client ? [{ label: 'CLIENT', value: client }] : []),
  ], printMode);

  // ── Column 2: Drawing Info ──
  buildVerticalSection(p, colW, y, [
    { label: 'DRAWING TYPE', value: dType },
    { label: 'DRAWING TITLE', value: meta.drawing },
    ...(projectDescription ? [{ label: 'DESCRIPTION', value: projectDescription }] : []),
  ], printMode);

  // ── Column 3: Scale / Date / Project Number ──
  buildVerticalSection(p, colW * 2, y, [
    { label: 'SCALE', value: scale },
    { label: 'DATE', value: date },
    ...(projectNumber ? [{ label: 'PROJECT NO', value: projectNumber }] : []),
  ], printMode);

  // ── Column 4: Sheet / Revision / Sign-off ──
  buildVerticalSection(p, colW * 3, y, [
    { label: 'SHEET', value: sheet ? esc(sheet) : '-' },
    { label: 'REVISION', value: rev },
    { label: 'DRAWN BY', value: drawnBy },
  ], printMode);

  // ── Column 5: Checked / Approved ──
  buildVerticalSection(p, colW * 4, y, [
    ...(checkedBy ? [{ label: 'CHECKED BY', value: checkedBy }] : []),
    ...(approvedBy ? [{ label: 'APPROVED BY', value: approvedBy }] : [{ label: 'STATUS', value: 'ISSUED FOR REVIEW' }]),
  ], printMode);

  // ── Provenance warning if any ──
  if (meta.provenanceSummary) {
    const provBg = printMode ? '#fef2f2' : '#7f1d1d';
    const provLabel = printMode ? '#dc2626' : '#fca5a5';
    const provText = printMode ? '#b91c1c' : '#ef4444';
    p.push(`<rect x="${colW * 5 + 8}" y="${y + 8}" width="${colW - 16}" height="${TITLE_BLOCK_H - 16}" fill="${provBg}" rx="3"/>`);
    p.push(`<text x="${colW * 5 + colW / 2}" y="${y + 20}" fill="${provLabel}" font-size="7" font-weight="bold" text-anchor="middle">PROVENANCE</text>`);
    p.push(`<text x="${colW * 5 + colW / 2}" y="${y + 32}" fill="${provText}" font-size="7" font-weight="bold" text-anchor="middle">${esc(meta.provenanceSummary)}</text>`);
  }

  // ── Deprecated Schedules support (kept for safety during transition) ──
  if (meta.schedules && meta.schedules.length > 0) {
    let sy = y - 10;
    const sx = w - 240;
    const sw = 220;
    const schBg = printMode ? '#f8fafc' : '#0b1220';
    const schHeaderBg = printMode ? '#e2e8f0' : '#1e293b';
    const schHeaderFill = printMode ? '#0f172a' : '#e2e8f0';
    const schTextFill = printMode ? '#475569' : '#94a3b8';
    const schValueFill = printMode ? '#0f172a' : '#e2e8f0';
    const schStroke = printMode ? '#cbd5e1' : '#24324b';
    for (const sch of [...meta.schedules].reverse()) {
      const rowH = 16;
      const thH = 20;
      const shH = thH + sch.rows.length * rowH;
      sy -= shH;
      p.push(`<g stroke="${schStroke}" stroke-width="1">`);
      p.push(`<rect x="${sx}" y="${sy}" width="${sw}" height="${shH}" fill="${schBg}"/>`);
      p.push(`<rect x="${sx}" y="${sy}" width="${sw}" height="${thH}" fill="${schHeaderBg}"/>`);
      p.push(`<text x="${sx + sw / 2}" y="${sy + 14}" fill="${schHeaderFill}" font-size="10" font-weight="bold" text-anchor="middle">${esc(sch.title)}</text>`);
      let ry = sy + thH;
      for (const row of sch.rows) {
        p.push(`<line x1="${sx}" y1="${ry}" x2="${sx + sw}" y2="${ry}" />`);
        p.push(`<text x="${sx + 6}" y="${ry + 11}" fill="${schTextFill}" font-size="9">${esc(row.col1)}</text>`);
        p.push(`<text x="${sx + sw / 2}" y="${ry + 11}" fill="${schValueFill}" font-size="9" text-anchor="middle">${esc(row.col2)}</text>`);
        p.push(`<text x="${sx + sw - 6}" y="${ry + 11}" fill="${schTextFill}" font-size="9" text-anchor="end">${esc(row.col3)}</text>`);
        ry += rowH;
      }
      p.push(`<rect x="${sx}" y="${sy}" width="${sw}" height="${shH}" fill="none"/>`);
      p.push(`</g>`);
      sy -= 10;
    }
  }

  p.push(`</g>`);
  return p.join('');
}
