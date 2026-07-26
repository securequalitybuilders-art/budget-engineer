import type { CoverSheetContent, DrawingRegisterContent, RevisionEntry, ApprovalSignature, CoverBranding } from './package-sheet-meta';
import { SHEET_MM, MARGIN } from './sheet-size';
import { HATCH_PATTERNS } from './hatch-library';
import { buildTitleBlock } from './title-block';
import type { TitleBlockMeta } from './title-block';
import type { SheetMode } from './issue-sheet-meta';

const DPI = 96;
const MM_TO_PX = DPI / 25.4;
const TB_H = 60;

function sheetDims(size: 'A1' | 'A2' | 'A3', orient: 'portrait' | 'landscape'): { w: number; h: number } {
  const mm = SHEET_MM[size];
  const sheetW = orient === 'landscape' ? mm.w : mm.h;
  const sheetH = orient === 'landscape' ? mm.h : mm.w;
  return { w: Math.round(sheetW * MM_TO_PX), h: Math.round(sheetH * MM_TO_PX) };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function modeColors(mode: SheetMode) {
  const bg = mode === 'technical' ? '#ffffff' : '#0b1220';
  const tc = mode === 'technical' ? '#0f172a' : '#e2e8f0';
  const sc = mode === 'technical' ? '#475569' : '#94a3b8';
  const bs = mode === 'technical' ? '#cbd5e1' : '#24324b';
  return { bg, tc, sc, bs };
}

function renderBrandingZone(
  branding: CoverBranding | undefined,
  x: number, y: number, w: number,
  mode: SheetMode,
): string[] {
  const { tc, sc, bs } = modeColors(mode);
  const parts: string[] = [];
  const zoneH = 70;

  parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${zoneH.toFixed(1)}" fill="none" stroke="${bs}" stroke-width="0.5" rx="3"/>`);

  if (branding?.firmName) {
    parts.push(`<text x="${(x + 12).toFixed(1)}" y="${(y + 22).toFixed(1)}" fill="${tc}" font-size="14" font-weight="700" font-family="Arial,Helvetica,sans-serif">${esc(branding.firmName)}</text>`);
    if (branding.firmAddress) {
      parts.push(`<text x="${(x + 12).toFixed(1)}" y="${(y + 38).toFixed(1)}" fill="${sc}" font-size="8" font-family="Arial,Helvetica,sans-serif">${esc(branding.firmAddress)}</text>`);
    }
  } else {
    if (branding?.logoPlaceholder) {
      parts.push(`<rect x="${(x + 12).toFixed(1)}" y="${(y + 8).toFixed(1)}" width="50" height="50" fill="${sc}" opacity="0.15" rx="4"/>`);
      parts.push(`<text x="${(x + 37).toFixed(1)}" y="${(y + 36).toFixed(1)}" fill="${sc}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">LOGO</text>`);
    }
    parts.push(`<text x="${(x + 76).toFixed(1)}" y="${(y + 22).toFixed(1)}" fill="${tc}" font-size="12" font-weight="700" font-family="Arial,Helvetica,sans-serif">Budget Engineer Studio</text>`);
  }

  return parts;
}

function renderApprovalSignatures(
  approvals: ApprovalSignature[] | undefined,
  x: number, y: number, w: number,
  mode: SheetMode,
): string[] {
  const { tc, sc, bs } = modeColors(mode);
  const parts: string[] = [];
  if (!approvals || approvals.length === 0) return parts;

  parts.push(`<text x="${x.toFixed(1)}" y="${(y + 10).toFixed(1)}" fill="${tc}" font-size="9" font-weight="700" font-family="Arial,Helvetica,sans-serif">Approvals</text>`);
  let ay = y + 22;

  for (const a of approvals) {
    const lineW = w * 0.55;
    parts.push(`<text x="${x.toFixed(1)}" y="${(ay + 6).toFixed(1)}" fill="${sc}" font-size="7" font-family="Arial,Helvetica,sans-serif">${esc(a.role)}</text>`);
    parts.push(`<line x1="${x.toFixed(1)}" y1="${(ay + 16).toFixed(1)}" x2="${(x + lineW).toFixed(1)}" y2="${(ay + 16).toFixed(1)}" stroke="${bs}" stroke-width="0.5"/>`);
    if (a.signed && a.name) {
      parts.push(`<text x="${(x + 2).toFixed(1)}" y="${(ay + 14).toFixed(1)}" fill="${tc}" font-size="8" font-family="Arial,Helvetica,sans-serif">${esc(a.name)}</text>`);
    }
    parts.push(`<text x="${(x + lineW + 8).toFixed(1)}" y="${(ay + 14).toFixed(1)}" fill="${sc}" font-size="7" font-family="Arial,Helvetica,sans-serif">${esc(a.date)}</text>`);
    ay += 28;
  }

  return parts;
}

function renderRevisionHistoryBlock(
  revisions: RevisionEntry[],
  x: number, y: number, w: number,
  mode: SheetMode,
): string[] {
  if (revisions.length === 0) return [];
  const { tc, sc, bs } = modeColors(mode);
  const parts: string[] = [];
  const headerH = 22;
  const rowH = 20;
  const totalH = headerH + revisions.length * rowH + 10;

  parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${totalH.toFixed(1)}" fill="none" stroke="${bs}" stroke-width="0.5" rx="3"/>`);
  parts.push(`<text x="${(x + 8).toFixed(1)}" y="${(y + 14).toFixed(1)}" fill="${tc}" font-size="9" font-weight="700" font-family="Arial,Helvetica,sans-serif">Revision History</text>`);
  parts.push(`<line x1="${(x + 8).toFixed(1)}" y1="${(y + 18).toFixed(1)}" x2="${(x + w - 8).toFixed(1)}" y2="${(y + 18).toFixed(1)}" stroke="${sc}" stroke-width="0.35" opacity="0.3"/>`);

  // Headers
  const cols = ['REV', 'PURPOSE', 'DATE', 'DESCRIPTION', 'AUTHOR'];
  const colW = w / cols.length;
  const hx = x + 8;
  parts.push(`<text x="${hx.toFixed(1)}" y="${(y + headerH - 4).toFixed(1)}" fill="${sc}" font-size="7" font-weight="600" font-family="Arial,Helvetica,sans-serif">${cols.join('   ')}</text>`);

  let ry = y + headerH + 4;
  for (const rev of revisions) {
    const cells = [rev.revision, rev.purpose, rev.date, rev.description, rev.author ?? ''];
    let cx = x + 8;
    parts.push(`<line x1="${(x + 8).toFixed(1)}" y1="${ry.toFixed(1)}" x2="${(x + w - 8).toFixed(1)}" y2="${ry.toFixed(1)}" stroke="${sc}" stroke-width="0.2" opacity="0.2"/>`);
    for (const cell of cells) {
      parts.push(`<text x="${cx.toFixed(1)}" y="${(ry + 13).toFixed(1)}" fill="${sc}" font-size="7" font-family="Arial,Helvetica,sans-serif">${esc(cell)}</text>`);
      cx += colW;
    }
    ry += rowH;
  }

  return parts;
}

export function buildCoverSheet(
  content: CoverSheetContent,
  mode: SheetMode,
): string {
  const size = 'A2';
  const orient = 'landscape';
  const { w: svgW, h: svgH } = sheetDims(size, orient);
  const { bg, tc, sc, bs } = modeColors(mode);
  const h = svgH;
  const marginPx = Math.round(MARGIN * MM_TO_PX);

  const titleMeta: TitleBlockMeta = {
    project: content.projectName,
    drawing: content.packageTitle,
    sheet: 'COVER',
    scale: 'NTS',
    date: content.issueDate,
    revision: '—',
    drawnBy: content.architect ?? '',
    client: content.client,
    projectNumber: content.projectNumber,
    drawingType: 'COVER SHEET',
    provenanceSummary: 'Procedurally generated — review all data before use',
  };

  const parts: string[] = [];

  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${(h + TB_H).toString()}" viewBox="0 0 ${svgW} ${h + TB_H}">`);
  parts.push(`<defs>${HATCH_PATTERNS}</defs>`);
  parts.push(`<rect width="${svgW}" height="${(h + TB_H).toString()}" fill="${bg}"/>`);

  const usableW = svgW - marginPx * 2;
  const centerX = svgW / 2;

  // Branding zone (top left)
  const brandingParts = renderBrandingZone(content.branding, marginPx, marginPx + 10, 280, mode);
  parts.push(...brandingParts);

  // Issue state badge (top right)
  const issueBadgeX = svgW - marginPx - 200;
  parts.push(`<rect x="${issueBadgeX.toFixed(1)}" y="${(marginPx + 10).toFixed(1)}" width="200" height="36" fill="${bs}" rx="4" opacity="0.3"/>`);
  parts.push(`<text x="${(issueBadgeX + 100).toFixed(1)}" y="${(marginPx + 28).toFixed(1)}" fill="${tc}" font-size="11" font-weight="700" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(content.issueStage.toUpperCase())}</text>`);
  parts.push(`<text x="${(issueBadgeX + 100).toFixed(1)}" y="${(marginPx + 40).toFixed(1)}" fill="${sc}" font-size="8" font-weight="600" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">Issue ${content.issueNumber} · ${content.issueDate}</text>`);

  // Project address
  if (content.projectAddress) {
    parts.push(`<text x="${centerX.toFixed(1)}" y="${(marginPx + 50).toFixed(1)}" fill="${sc}" font-size="9" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(content.projectAddress)}</text>`);
  }

  // Project title — prominent
  const titleY = content.projectAddress ? marginPx + 72 : marginPx + 60;
  parts.push(`<text x="${centerX.toFixed(1)}" y="${titleY.toFixed(1)}" fill="${tc}" font-size="28" font-weight="700" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(content.projectName)}</text>`);
  if (content.projectNumber) {
    parts.push(`<text x="${centerX.toFixed(1)}" y="${(titleY + 30).toFixed(1)}" fill="${sc}" font-size="14" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">Project No: ${esc(content.projectNumber)}</text>`);
  }

  // Separator
  const sepY = (content.projectNumber ? titleY + 50 : titleY + 30);
  parts.push(`<line x1="${(centerX - 200).toFixed(1)}" y1="${sepY.toFixed(1)}" x2="${(centerX + 200).toFixed(1)}" y2="${sepY.toFixed(1)}" stroke="${sc}" stroke-width="1" opacity="0.5"/>`);

  // Package details
  let detailY = sepY + 24;
  const details = [
    { label: 'Package', value: content.packageTitle },
    ...(content.client ? [{ label: 'Client', value: content.client }] : []),
    ...(content.architect ? [{ label: 'Architect', value: content.architect }] : []),
  ];
  for (const d of details) {
    parts.push(`<text x="${centerX.toFixed(1)}" y="${detailY.toFixed(1)}" fill="${sc}" font-size="10" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(d.label)}: ${esc(d.value)}</text>`);
    detailY += 18;
  }

  // Package description
  if (content.packageDescription) {
    detailY += 8;
    parts.push(`<text x="${centerX.toFixed(1)}" y="${detailY.toFixed(1)}" fill="${tc}" font-size="11" font-weight="600" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(content.packageDescription)}</text>`);
    detailY += 22;
  }

  // Sheet list summary
  detailY += 16;
  parts.push(`<text x="${marginPx}" y="${detailY.toFixed(1)}" fill="${tc}" font-size="12" font-weight="700" font-family="Arial,Helvetica,sans-serif">Sheet List</text>`);
  detailY += 18;
  parts.push(`<line x1="${marginPx}" y1="${detailY.toFixed(1)}" x2="${(svgW - marginPx).toFixed(1)}" y2="${detailY.toFixed(1)}" stroke="${sc}" stroke-width="0.35" opacity="0.3"/>`);
  detailY += 6;

  const sheetListHeaders = ['Sheet', 'Title'];
  const headerX = marginPx;
  parts.push(`<text x="${headerX.toFixed(1)}" y="${(detailY + 10).toFixed(1)}" fill="${sc}" font-size="8" font-weight="600" font-family="Arial,Helvetica,sans-serif">${sheetListHeaders[0]}</text>`);
  parts.push(`<text x="${(headerX + 120).toFixed(1)}" y="${(detailY + 10).toFixed(1)}" fill="${sc}" font-size="8" font-weight="600" font-family="Arial,Helvetica,sans-serif">${sheetListHeaders[1]}</text>`);
  detailY += 18;

  for (const sl of content.sheetList) {
    parts.push(`<text x="${headerX.toFixed(1)}" y="${(detailY + 8).toFixed(1)}" fill="${tc}" font-size="8" font-family="Arial,Helvetica,sans-serif">${esc(sl.sheetNumber)}</text>`);
    parts.push(`<text x="${(headerX + 120).toFixed(1)}" y="${(detailY + 8).toFixed(1)}" fill="${sc}" font-size="8" font-family="Arial,Helvetica,sans-serif">${esc(sl.title)}</text>`);
    detailY += 16;
  }

  // General notes + Revision history (side by side)
  const notesY = Math.max(detailY + 24, h - 200);
  parts.push(`<text x="${marginPx}" y="${notesY.toFixed(1)}" fill="${tc}" font-size="11" font-weight="700" font-family="Arial,Helvetica,sans-serif">General Notes</text>`);
  let ny = notesY + 18;
  for (const note of content.generalNotes) {
    parts.push(`<text x="${marginPx}" y="${ny.toFixed(1)}" fill="${sc}" font-size="8" font-family="Arial,Helvetica,sans-serif">· ${esc(note)}</text>`);
    ny += 15;
  }

  // Revision history
  const revBlockX = Math.round(marginPx + usableW * 0.5);
  const revBlockW = Math.round(usableW * 0.45);
  const revParts = renderRevisionHistoryBlock(content.revisionHistory, revBlockX, notesY, revBlockW, mode);
  parts.push(...revParts);

  // Approval signatures
  const approvalsY = Math.max(ny + 20, h - 70);
  const approvalParts = renderApprovalSignatures(content.approvals, marginPx, approvalsY, 300, mode);
  parts.push(...approvalParts);

  // Disclaimer
  const disclaimerText = content.disclaimer ?? 'This package is procedurally generated from the building model. All dimensions must be verified on site before construction. This document is for coordination purposes only.';
  parts.push(`<text x="${marginPx}" y="${(h - 12).toFixed(1)}" fill="${sc}" font-size="6" font-style="italic" font-family="Arial,Helvetica,sans-serif">${esc(disclaimerText)}</text>`);

  // Border
  parts.push(`<rect x="2" y="2" width="${(svgW - 4).toString()}" height="${(h + TB_H - 4).toString()}" fill="none" stroke="${bs}" stroke-width="1" rx="2"/>`);
  parts.push(`<rect x="${marginPx}" y="${marginPx}" width="${(svgW - marginPx * 2).toString()}" height="${(h + TB_H - marginPx * 2).toString()}" fill="none" stroke="${sc}" stroke-width="0.35" opacity="0.3"/>`);

  // Title block
  parts.push(buildTitleBlock(svgW, h + TB_H, titleMeta, mode === 'technical'));

  parts.push('</svg>');
  return parts.join('');
}

export function buildDrawingRegisterSheet(
  content: DrawingRegisterContent,
  mode: SheetMode,
): string {
  const size = 'A2';
  const orient = 'landscape';
  const { w: svgW, h: svgH } = sheetDims(size, orient);
  const { bg, tc, sc, bs } = modeColors(mode);
  const h = svgH;
  const marginPx = Math.round(MARGIN * MM_TO_PX);
  const usableW = svgW - marginPx * 2;

  const titleMeta: TitleBlockMeta = {
    project: content.projectName,
    drawing: 'Drawing Register',
    sheet: 'REG',
    scale: 'NTS',
    date: new Date().toISOString().slice(0, 10),
    revision: '—',
    drawnBy: 'Budget Engineer Studio',
    projectNumber: content.projectNumber,
    drawingType: 'DRAWING REGISTER',
    provenanceSummary: 'Procedurally generated — review all data before use',
  };

  const parts: string[] = [];

  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${(h + TB_H).toString()}" viewBox="0 0 ${svgW} ${h + TB_H}">`);
  parts.push(`<defs>${HATCH_PATTERNS}</defs>`);
  parts.push(`<rect width="${svgW}" height="${(h + TB_H).toString()}" fill="${bg}"/>`);

  // Title
  parts.push(`<text x="${marginPx}" y="${(marginPx + 28).toFixed(1)}" fill="${tc}" font-size="14" font-weight="700" font-family="Arial,Helvetica,sans-serif">Drawing Register — ${esc(content.projectName)}</text>`);
  if (content.projectNumber) {
    parts.push(`<text x="${marginPx}" y="${(marginPx + 46).toFixed(1)}" fill="${sc}" font-size="9" font-family="Arial,Helvetica,sans-serif">Project No: ${esc(content.projectNumber)}</text>`);
  }

  // Table
  const tableY = marginPx + 60;
  const headerH = 22;
  const rowH = 18;
  const totalTableH = headerH + content.entries.length * rowH + 10;
  const colDefs = [
    { label: 'DWG', width: 0.1 },
    { label: 'Title', width: 0.28 },
    { label: 'Sheet', width: 0.12 },
    { label: 'Rev', width: 0.08 },
    { label: 'Scale', width: 0.12 },
    { label: 'Status', width: 0.15 },
    { label: 'Discipline', width: 0.15 },
  ];

  parts.push(`<rect x="${marginPx}" y="${tableY.toFixed(1)}" width="${usableW.toFixed(1)}" height="${(totalTableH).toFixed(1)}" fill="none" stroke="${bs}" stroke-width="0.5" rx="3"/>`);

  // Table header
  let hx = marginPx + 6;
  for (const col of colDefs) {
    const cw = usableW * col.width;
    const cx = hx + cw / 2;
    parts.push(`<text x="${cx.toFixed(1)}" y="${(tableY + 14).toFixed(1)}" fill="${tc}" font-size="8" font-weight="700" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${col.label}</text>`);
    hx += cw;
  }
  parts.push(`<line x1="${marginPx}" y1="${(tableY + headerH).toFixed(1)}" x2="${(marginPx + usableW).toFixed(1)}" y2="${(tableY + headerH).toFixed(1)}" stroke="${sc}" stroke-width="0.5"/>`);

  // Table rows
  let ry = tableY + headerH + 4;
  for (const entry of content.entries) {
    const cells = [entry.drawingNumber, entry.title, entry.sheetNumber, entry.revision, entry.scale, entry.status, entry.discipline];
    let cx = marginPx + 6;
    for (let ci = 0; ci < cells.length; ci++) {
      const cellW = colDefs[ci].width * usableW;
      const cellCenter = cx + cellW / 2;
      parts.push(`<text x="${cellCenter.toFixed(1)}" y="${(ry + 12).toFixed(1)}" fill="${sc}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${esc(cells[ci])}</text>`);
      cx += cellW;
    }
    ry += rowH;
  }

  // Revision history
  const revY = tableY + totalTableH + 30;
  const revParts = renderRevisionHistoryBlock(content.revisionHistory, marginPx, revY, usableW, mode);
  parts.push(...revParts);

  // Border
  parts.push(`<rect x="2" y="2" width="${(svgW - 4).toString()}" height="${(h + TB_H - 4).toString()}" fill="none" stroke="${bs}" stroke-width="1" rx="2"/>`);
  parts.push(`<rect x="${marginPx}" y="${marginPx}" width="${(svgW - marginPx * 2).toString()}" height="${(h + TB_H - marginPx * 2).toString()}" fill="none" stroke="${sc}" stroke-width="0.35" opacity="0.3"/>`);

  parts.push(buildTitleBlock(svgW, h + TB_H, titleMeta, mode === 'technical'));
  parts.push('</svg>');
  return parts.join('');
}

export { renderRevisionHistoryBlock };
