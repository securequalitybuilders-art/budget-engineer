import type { SheetViewportSlot } from './sheet-templates';
import { SHEET_MM } from './sheet-size';
import type { SheetConfig } from './sheet-size';

export interface PlacedView {
  slot: SheetViewportSlot;
  viewSvg: string;
  scale: number;
  ox: number;
  oy: number;
}

export interface LayoutResult {
  placedViews: PlacedView[];
  sheetW: number;
  sheetH: number;
}

function extractSvgContent(svg: string): string {
  const start = svg.indexOf('>');
  const end = svg.lastIndexOf('</svg>');
  if (start === -1 || end === -1) return svg;
  return svg.slice(start + 1, end).trim();
}

function parseViewBox(svg: string): { w: number; h: number } | null {
  const match = svg.match(/viewBox="([^"]+)"/);
  if (!match) return null;
  const parts = match[1].split(/\s+/).map(Number);
  if (parts.length === 4) return { w: parts[2], h: parts[3] };
  return null;
}

function scaleToFitViewport(
  contentW: number, contentH: number,
  vpW: number, vpH: number,
): { scale: number; ox: number; oy: number } {
  const padX = vpW * 0.05;
  const padY = vpH * 0.05;
  const availW = vpW - padX * 2;
  const availH = vpH - padY * 2;
  const scale = Math.min(availW / Math.max(contentW, 1), availH / Math.max(contentH, 1));
  const ox = padX + (availW - contentW * scale) / 2;
  const oy = padY + (availH - contentH * scale) / 2;
  return { scale, ox, oy };
}

function sheetPixelDims(sheet: SheetConfig): { w: number; h: number } {
  const mm = SHEET_MM[sheet.size];
  const dpi = 96;
  const mmToPx = dpi / 25.4;
  const w = Math.round(mm.w * mmToPx);
  const h = Math.round(mm.h * mmToPx);
  return sheet.orientation === 'portrait' ? { w: Math.min(w, h), h: Math.max(w, h) } : { w, h };
}

export function layoutViewsOnSheet(
  sheet: SheetConfig,
  slotAssignments: { slot: SheetViewportSlot; viewSvg: string }[],
  datumGroups?: { groupId: string; slotIds: string[] }[],
): LayoutResult {
  const pix = sheetPixelDims(sheet);
  const placedViews: PlacedView[] = [];

  for (const sa of slotAssignments) {
    const content = extractSvgContent(sa.viewSvg);
    const vb = parseViewBox(sa.viewSvg);
    if (!vb) {
      placedViews.push({ slot: sa.slot, viewSvg: content, scale: 1, ox: sa.slot.x, oy: sa.slot.y });
      continue;
    }
    const { scale, ox, oy } = scaleToFitViewport(vb.w, vb.h, sa.slot.width, sa.slot.height);
    placedViews.push({
      slot: sa.slot,
      viewSvg: content,
      scale,
      ox: sa.slot.x + ox,
      oy: sa.slot.y + oy,
    });
  }

  // Apply datum alignment: adjust oy so all views in a group share the same vertical baseline
  if (datumGroups) {
    for (const dg of datumGroups) {
      const groupViews = placedViews.filter(pv => dg.slotIds.includes(pv.slot.id));
      if (groupViews.length < 2) continue;
      const minOy = Math.min(...groupViews.map(pv => pv.oy));
      for (const pv of groupViews) {
        pv.oy = minOy;
      }
    }
  }

  return { placedViews, sheetW: pix.w, sheetH: pix.h + 60 };
}

export function wrapViewAsNestedSvg(placed: PlacedView, printMode: boolean): string {
  const viewW = placed.slot.width;
  const viewH = placed.slot.height;
  const bg = printMode ? '#ffffff' : '#0b1220';

  return `<svg x="${placed.ox.toFixed(1)}" y="${placed.oy.toFixed(1)}" width="${viewW.toFixed(1)}" height="${viewH.toFixed(1)}" viewBox="0 0 ${viewW.toFixed(1)} ${viewH.toFixed(1)}" preserveAspectRatio="xMidYMid meet">
<rect width="${viewW.toFixed(1)}" height="${viewH.toFixed(1)}" fill="${bg}" opacity="0.95"/>
<g transform="scale(${placed.scale.toFixed(4)})">
${placed.viewSvg}
</g>
</svg>`;
}
