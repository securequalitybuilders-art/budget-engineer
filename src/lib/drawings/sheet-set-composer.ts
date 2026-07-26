import type { CadDocument } from '@/domain/ws6-types';
import type { SheetMeta, SheetMode, IssueMeta } from './issue-sheet-meta';
import type { SheetViewportSlot } from './sheet-templates';
import type { TitleBlockMeta } from './title-block';
import type { SheetCoordinator, DrawingViewRef } from './sheet-coordination';
import type { SectionConfig } from './section-svg';
import { SHEET_MM, MARGIN } from './sheet-size';
import { HATCH_PATTERNS } from './hatch-library';
import { buildTitleBlock } from './title-block';
import { DEFAULT_COORDINATOR } from './sheet-coordination';
import { getTemplate } from './sheet-templates';
import { buildDisciplinePlanSvg } from './plan-svg';
import { layoutViewsOnSheet, type PlacedView } from './viewport-layout';
import { renderIssueNotePanel } from './legend-panels';
import { renderProvenanceNote } from './disciplines/svg-shared';
import type { DrawingProvenance } from '@/domain/drawing-provenance';
import { buildCoverSheet, buildDrawingRegisterSheet } from './drawing-register-sheet';
import type { CoverSheetContent, DrawingRegisterContent, ApprovalSignature, CoverBranding } from './package-sheet-meta';
import type { PackageType } from './schedule-context-filter';

const COMPOSED_DERIVED_PROVENANCE: DrawingProvenance = {
  source: 'derived',
  confidence: 'medium',
  note: 'Sheet composition auto-generated from building model — verify before use',
};

export interface ComposedSheet {
  sheetSvg: string;
  sheetMeta: SheetMeta;
  placedViews: PlacedView[];
}

export interface ComposeOptions {
  cad: CadDocument;
  sheetMeta: SheetMeta;
  mode: SheetMode;
  coordinator?: SheetCoordinator;
  issue?: IssueMeta;
  titleMeta?: TitleBlockMeta;
  branding?: CoverBranding;
  approvals?: ApprovalSignature[];
  disclaimer?: string;
  packageDiscipline?: PackageType;
  projectAddress?: string;
}

function bgColor(mode: SheetMode): string {
  return mode === 'technical' ? '#ffffff' : '#0b1220';
}

function subColor(mode: SheetMode): string {
  return mode === 'technical' ? '#475569' : '#94a3b8';
}

function textColor(mode: SheetMode): string {
  return mode === 'technical' ? '#0f172a' : '#e2e8f0';
}

export function generateViewSvg(
  cad: CadDocument,
  slot: SheetViewportSlot,
  _meta: SheetMeta,
  mode: SheetMode,
  _coordinator: SheetCoordinator,
): string {
  const printMode = mode === 'technical';

  // Build appropriate TitleBlockMeta for the view
  const viewTitleMeta: TitleBlockMeta = {
    project: '',
    drawing: '',
  };

  const allowed = slot.allowedTypes ?? [];
  if (allowed.includes('elevation')) {
    return buildDisciplinePlanSvg({
      cad,
      viewId: slot.id.replace('elevation-', ''),
      titleMeta: viewTitleMeta,
      printMode,
    });
  }

  if (allowed.includes('section')) {
    const axis = slot.id === 'section-bb' ? 'BB' : 'AA';
    const sectionConfig: SectionConfig = { axis, position: 5 };
    return buildDisciplinePlanSvg({
      cad,
      viewId: 'section',
      titleMeta: viewTitleMeta,
      sectionConfig,
      printMode,
    });
  }

  if (allowed.includes('plan')) {
    return buildDisciplinePlanSvg({
      cad,
      viewId: 'plan',
      floorId: 'f1',
      titleMeta: viewTitleMeta,
      printMode,
    });
  }

  if (allowed.includes('roof')) {
    return buildDisciplinePlanSvg({
      cad,
      viewId: 'roof',
      titleMeta: viewTitleMeta,
      printMode,
    });
  }

  if (allowed.includes('schedule')) {
    const type = slot.id.includes('window') ? 'window' : slot.id.includes('structural') ? 'structural' : 'door';
    return buildDisciplinePlanSvg({
      cad,
      viewId: `schedule-${type}`,
      titleMeta: viewTitleMeta,
      printMode,
    });
  }

  return '';
}

function generateViewportContent(
  cad: CadDocument,
  _slot: SheetViewportSlot,
  viewId: string,
  _meta: SheetMeta,
  mode: SheetMode,
  coordinator: SheetCoordinator,
): string {
  const printMode = mode === 'technical';
  const viewTitleMeta: TitleBlockMeta = { project: '', drawing: '' };

  const viewRef = coordinator.getAllViews().find(v => v.viewId === viewId);
  if (!viewRef) return '';

  switch (viewRef.viewType) {
    case 'elevation':
      return buildDisciplinePlanSvg({
        cad, viewId: viewRef.viewId,
        titleMeta: viewTitleMeta, printMode,
      });
    case 'section':
      return buildDisciplinePlanSvg({
        cad, viewId: 'section',
        titleMeta: viewTitleMeta,
        sectionConfig: { axis: viewRef.sectionAxis ?? 'AA', position: 5 },
        printMode,
      });
    case 'plan': {
      return buildDisciplinePlanSvg({
        cad, viewId: 'plan',
        floorId: viewRef.floorId ?? 'f1',
        titleMeta: viewTitleMeta, printMode,
      });
    }
    case 'roof':
      return buildDisciplinePlanSvg({
        cad, viewId: 'roof',
        titleMeta: viewTitleMeta, printMode,
      });
    case 'schedule': {
      const st = viewRef.viewId.replace('schedule-', '') as 'door' | 'window' | 'structural';
      return buildDisciplinePlanSvg({
        cad, viewId: `schedule-${st}`,
        titleMeta: viewTitleMeta, printMode,
      });
    }
    default:
      return '';
  }
}

function renderDatumLines(
  datumGroups: { groupId: string; slotIds: string[] }[],
  placedViews: PlacedView[],
  printMode: boolean,
): string[] {
  if (!datumGroups || datumGroups.length === 0) return [];
  const parts: string[] = [];
  const clr = printMode ? '#1e293b' : '#d4a574';

  for (const dg of datumGroups) {
    const groupViews = placedViews.filter(pv => dg.slotIds.includes(pv.slot.id));
    if (groupViews.length < 2) continue;

    const minX = Math.min(...groupViews.map(pv => pv.ox));
    const maxX = Math.max(...groupViews.map(pv => pv.ox + pv.slot.width));
    const datumY = Math.min(...groupViews.map(pv => pv.oy + pv.slot.height * 0.85));

    parts.push(`<line x1="${minX.toFixed(1)}" y1="${datumY.toFixed(1)}" x2="${maxX.toFixed(1)}" y2="${datumY.toFixed(1)}" stroke="${clr}" stroke-width="0.35" stroke-dasharray="4,3" opacity="0.6"/>`);
    parts.push(`<text x="${(minX + 4).toFixed(1)}" y="${(datumY - 2).toFixed(1)}" fill="${clr}" font-size="5" font-family="Arial,Helvetica,sans-serif" opacity="0.6">${dg.groupId} datum</text>`);
  }

  return parts;
}

function getRefsForSheet(meta: SheetMeta, coordinator: SheetCoordinator): DrawingViewRef[] {
  const refs: DrawingViewRef[] = [];
  for (const v of meta.views) {
    const r = coordinator.getAllViews().find(rf => rf.viewId === v.viewId);
    if (r && !refs.some(ex => ex.viewId === r.viewId)) refs.push(r);
  }
  return refs;
}

export function composeSheet(options: ComposeOptions): ComposedSheet {
  const { cad, sheetMeta, mode, coordinator = DEFAULT_COORDINATOR, issue, branding, approvals, disclaimer, projectAddress } = options;

  // ── Cover sheet dispatch ──
  if (sheetMeta.templateId === 'a2-landscape-cover') {
    const content: CoverSheetContent = {
      projectName: cad.name,
      projectNumber: sheetMeta.drawingNumber,
      client: sheetMeta.checkedBy,
      architect: sheetMeta.drawnBy,
      issueDate: sheetMeta.date ?? issue?.issueDate ?? new Date().toISOString().slice(0, 10),
      issueStage: issue?.stage ?? 'design-development',
      issueNumber: issue?.issueNumber ?? '01',
      packageTitle: sheetMeta.sheetTitle,
      packageDescription: sheetMeta.description,
      sheetList: [{ sheetNumber: sheetMeta.sheetNumber, title: sheetMeta.sheetTitle }],
      generalNotes: [
        'This package is procedurally generated from the building model.',
        'All dimensions must be verified on site before construction.',
        'Refer to individual sheets for detailed notes and specifications.',
        'This document is for coordination purposes only and does not constitute a contract document.',
      ],
      revisionHistory: sheetMeta.revision ? [{ revision: sheetMeta.revision, purpose: 'Initial Issue', date: sheetMeta.date ?? '', description: 'First issue for review', author: sheetMeta.drawnBy }] : [],
      branding,
      approvals,
      disclaimer,
      projectAddress,
    };
    if (coordinator !== DEFAULT_COORDINATOR) {
      content.sheetList = coordinator.getAllViews().map(v => ({ sheetNumber: v.sheetNumber, title: v.label }));
    }
    return {
      sheetSvg: buildCoverSheet(content, mode),
      sheetMeta,
      placedViews: [],
    };
  }

  // ── Drawing register dispatch ──
  if (sheetMeta.templateId === 'a2-landscape-register') {
    const allViews = coordinator.getAllViews();
    const entries = allViews.map(v => ({
      drawingNumber: v.drawingNumber,
      title: v.label,
      revision: sheetMeta.revision,
      scale: sheetMeta.scale ?? '1:100',
      status: 'ISSUED FOR REVIEW',
      discipline: v.viewType === 'plan' || v.viewType === 'elevation' || v.viewType === 'section' || v.viewType === 'schedule' ? 'ARCHITECTURAL' : 'STRUCTURAL',
      sheetNumber: v.sheetNumber,
    }));
    const content: DrawingRegisterContent = {
      projectName: cad.name,
      projectNumber: sheetMeta.drawingNumber,
      entries,
      revisionHistory: sheetMeta.revision ? [{ revision: sheetMeta.revision, purpose: 'Initial Issue', date: sheetMeta.date ?? '', description: 'First issue for review', author: sheetMeta.drawnBy }] : [],
    };
    return {
      sheetSvg: buildDrawingRegisterSheet(content, mode),
      sheetMeta,
      placedViews: [],
    };
  }

  const template = getTemplate(sheetMeta.templateId);
  if (!template) {
    return {
      sheetSvg: '',
      sheetMeta,
      placedViews: [],
    };
  }

  const printMode = mode === 'technical';
  const mm = SHEET_MM[template.size];
  const sheetWmm = template.orientation === 'landscape' ? mm.w : mm.h;
  const sheetHmm = template.orientation === 'landscape' ? mm.h : mm.w;
  const dpi = 96;
  const mmToPx = dpi / 25.4;
  const svgW = Math.round(sheetWmm * mmToPx);
  const svgH = Math.round(sheetHmm * mmToPx);
  const h = svgH;

  const bg = bgColor(mode);
  const sc = subColor(mode);
  const tc = textColor(mode);
  const tBlockH = template.titleBlock.reserveH;

  // Build title block metadata
  const titleMeta: TitleBlockMeta = {
    project: cad.name,
    drawing: sheetMeta.sheetTitle,
    sheet: sheetMeta.sheetNumber,
    scale: sheetMeta.scale,
    date: sheetMeta.date ?? issue?.issueDate,
    revision: sheetMeta.revision,
    drawnBy: sheetMeta.drawnBy,
    checkedBy: sheetMeta.checkedBy,
    approvedBy: sheetMeta.approvedBy,
    drawingType: sheetMeta.description,
  };

  // Generate view SVGs and compose
  const slotViews: { slot: SheetViewportSlot; viewSvg: string }[] = [];

  for (const v of sheetMeta.views) {
    const slot = template.viewports.find(s => s.id === v.slotId);
    if (!slot) continue;
    const viewSvg = generateViewportContent(cad, slot, v.viewId, sheetMeta, mode, coordinator);
    if (viewSvg) {
      slotViews.push({ slot, viewSvg });
    }
  }

  // Build datum groups for elevation/section alignment
  const datumGroups: { groupId: string; slotIds: string[] }[] = [];
  const elevSlotIds = template.viewports.filter(s => s.allowedTypes?.includes('elevation')).map(s => s.id);
  const secSlotIds = template.viewports.filter(s => s.allowedTypes?.includes('section')).map(s => s.id);
  if (elevSlotIds.length >= 2) {
    datumGroups.push({ groupId: 'elevation', slotIds: elevSlotIds });
  }
  if (secSlotIds.length >= 2) {
    datumGroups.push({ groupId: 'section', slotIds: secSlotIds });
  }

  const layout = layoutViewsOnSheet(
    { size: template.size, orientation: template.orientation, printMode },
    slotViews,
    datumGroups.length > 0 ? datumGroups : undefined,
  );

  const parts: string[] = [];

  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${(h + tBlockH).toString()}" viewBox="0 0 ${svgW} ${h + tBlockH}">`);
  parts.push(`<defs>${HATCH_PATTERNS}</defs>`);

  // Sheet background
  parts.push(`<rect width="${svgW}" height="${(h + tBlockH).toString()}" fill="${bg}"/>`);

  // Sheet border
  const bs = printMode ? '#cbd5e1' : '#24324b';
  parts.push(`<rect x="2" y="2" width="${(svgW - 4).toString()}" height="${(h + tBlockH - 4).toString()}" fill="none" stroke="${bs}" stroke-width="1" rx="2"/>`);

  // Inner margin
  const marginPx = Math.round(MARGIN * mmToPx);
  const usableW = svgW - marginPx * 2;
  parts.push(`<rect x="${marginPx}" y="${marginPx}" width="${(svgW - marginPx * 2).toString()}" height="${(h + tBlockH - marginPx * 2).toString()}" fill="none" stroke="${sc}" stroke-width="0.35" opacity="0.3"/>`);

  // Viewport labels
  for (const pv of layout.placedViews) {
    const label = pv.slot.label ?? '';
    if (label) {
      parts.push(`<text x="${(pv.slot.x + 4).toFixed(1)}" y="${(pv.slot.y + pv.slot.height + 12).toFixed(1)}" fill="${sc}" font-size="6" font-family="Arial,Helvetica,sans-serif">${label}</text>`);
    }
  }

  // Grid lines (subtle)
  const gridColor = printMode ? '#e2e8f0' : '#1e293b';
  const marginG = marginPx;
  const gW = svgW - marginG * 2;
  const gH = h - marginG * 2 - tBlockH;
  for (let gx = 0; gx <= 4; gx++) {
    const x = marginG + gx * gW / 4;
    parts.push(`<line x1="${x.toFixed(1)}" y1="${marginG}" x2="${x.toFixed(1)}" y2="${(marginG + gH).toFixed(1)}" stroke="${gridColor}" stroke-width="0.2" opacity="0.25"/>`);
  }
  for (let gy = 0; gy <= 4; gy++) {
    const y = marginG + gy * gH / 4;
    parts.push(`<line x1="${marginG}" y1="${y.toFixed(1)}" x2="${(marginG + gW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${gridColor}" stroke-width="0.2" opacity="0.25"/>`);
  }

  // Placed views
  const viewBg = printMode ? '#ffffff' : '#0b1220';
  for (const pv of layout.placedViews) {
    const vw = pv.slot.width;
    const vh = pv.slot.height;

    // Viewport border
    parts.push(`<rect x="${pv.slot.x.toFixed(1)}" y="${pv.slot.y.toFixed(1)}" width="${vw.toFixed(1)}" height="${vh.toFixed(1)}" fill="${viewBg}" stroke="${sc}" stroke-width="0.5" rx="2"/>`);

    // View content
    parts.push(`<svg x="${pv.ox.toFixed(1)}" y="${pv.oy.toFixed(1)}" width="${vw.toFixed(1)}" height="${vh.toFixed(1)}" viewBox="0 0 ${vw.toFixed(1)} ${vh.toFixed(1)}" preserveAspectRatio="xMidYMid meet">`);
    parts.push(`<g transform="scale(${pv.scale.toFixed(4)})">`);
    parts.push(pv.viewSvg);
    parts.push('</g>');
    parts.push('</svg>');

    // View label in viewport corner
    parts.push(`<text x="${(pv.slot.x + 6).toFixed(1)}" y="${(pv.slot.y + 14).toFixed(1)}" fill="${sc}" font-size="7" font-weight="600" font-family="Arial,Helvetica,sans-serif">${pv.slot.label ?? ''}</text>`);
  }

  // Visual datum lines spanning aligned viewports
  const datumLineParts = renderDatumLines(datumGroups, layout.placedViews, printMode);
  parts.push(...datumLineParts);

  // Cross-view references block
  const refs = getRefsForSheet(sheetMeta, coordinator);
  if (refs.length > 0) {
    const refX = marginPx + Math.round(usableW * 0.75);
    const refY = h - tBlockH - 10;
    parts.push(`<text x="${refX.toFixed(1)}" y="${refY.toFixed(1)}" fill="${sc}" font-size="7" font-weight="600" font-family="Arial,Helvetica,sans-serif">Sheet References</text>`);
    let ry = refY + 14;
    for (const r of refs) {
      if (r.viewType === 'plan' || r.viewType === 'section' || r.viewType === 'elevation') {
        parts.push(`<text x="${refX.toFixed(1)}" y="${ry.toFixed(1)}" fill="${sc}" font-size="6" font-family="Arial,Helvetica,sans-serif">${r.label}: ${r.sheetNumber}</text>`);
        ry += 12;
      }
    }
  }

  // Title block zone separator
  const tbY = h;
  parts.push(`<line x1="0" y1="${tbY.toFixed(1)}" x2="${svgW}" y2="${tbY.toFixed(1)}" stroke="${bs}" stroke-width="1"/>`);

  // Title block
  parts.push(buildTitleBlock(svgW, h + tBlockH, titleMeta, printMode));

  // Sheet header
  const projectLabel = cad.name;
  parts.push(`<text x="${marginPx}" y="${(marginPx + 12).toFixed(1)}" fill="${tc}" font-size="10" font-weight="700" font-family="Arial,Helvetica,sans-serif">${projectLabel}</text>`);
  parts.push(`<text x="${marginPx}" y="${(marginPx + 24).toFixed(1)}" fill="${sc}" font-size="8" font-family="Arial,Helvetica,sans-serif">${sheetMeta.sheetTitle} · ${sheetMeta.sheetNumber} · Rev ${sheetMeta.revision}</text>`);
  if (sheetMeta.description) {
    parts.push(`<text x="${marginPx}" y="${(marginPx + 34).toFixed(1)}" fill="${sc}" font-size="6" font-family="Arial,Helvetica,sans-serif">${sheetMeta.description}</text>`);
  }

  // Issue note
  if (issue) {
    parts.push(...renderIssueNotePanel(marginPx, svgW - marginPx - 300, 300, printMode));
  }

  // Provenance
  parts.push(renderProvenanceNote(
    COMPOSED_DERIVED_PROVENANCE,
    marginPx,
    h - 10,
  ));

  parts.push('</svg>');

  return {
    sheetSvg: parts.join(''),
    sheetMeta,
    placedViews: layout.placedViews,
  };
}

export function buildElevationSectionSheet(
  cad: CadDocument,
  meta: SheetMeta,
  mode: SheetMode,
  coordinator?: SheetCoordinator,
): ComposedSheet {
  return composeSheet({ cad, sheetMeta: meta, mode, coordinator });
}

export function buildPlanSheet(
  cad: CadDocument,
  meta: SheetMeta,
  mode: SheetMode,
  coordinator?: SheetCoordinator,
): ComposedSheet {
  return composeSheet({ cad, sheetMeta: meta, mode, coordinator });
}

export function buildScheduleSheet(
  cad: CadDocument,
  meta: SheetMeta,
  mode: SheetMode,
  coordinator?: SheetCoordinator,
): ComposedSheet {
  return composeSheet({ cad, sheetMeta: meta, mode, coordinator });
}

export function buildCombinedIssueSheet(
  cad: CadDocument,
  meta: SheetMeta,
  mode: SheetMode,
  coordinator?: SheetCoordinator,
): ComposedSheet {
  return composeSheet({ cad, sheetMeta: meta, mode, coordinator });
}
