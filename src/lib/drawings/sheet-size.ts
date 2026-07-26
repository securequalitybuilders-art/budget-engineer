export type SheetSize = 'A1' | 'A2' | 'A3';

export interface SheetConfig {
  size: SheetSize;
  orientation: 'portrait' | 'landscape';
  printMode: boolean;
}

export const SHEET_MM: Record<SheetSize, { w: number; h: number }> = {
  A1: { w: 841, h: 594 },
  A2: { w: 594, h: 420 },
  A3: { w: 420, h: 297 },
};

export const MARGIN = 15;
export const PRINT_BG = '#ffffff';
export const TITLE_BLOCK_RESERVE_H = 70;

export function getSheetPixelDims(sheet: SheetConfig, dpi = 96): { w: number; h: number } {
  const mm = SHEET_MM[sheet.size];
  const mmToPx = dpi / 25.4;
  const w = Math.round(mm.w * mmToPx);
  const h = Math.round(mm.h * mmToPx);
  return sheet.orientation === 'portrait' ? { w: Math.min(w, h), h: Math.max(w, h) } : { w, h };
}

export function getSheetViewport(
  sheet: SheetConfig,
  contentW: number,
  contentH: number,
  dpi = 96,
): { svgW: number; svgH: number; ox: number; oy: number; scale: number } {
  const pix = getSheetPixelDims(sheet, dpi);
  const usableW = pix.w - MARGIN * 2;
  const usableH = pix.h - MARGIN * 2 - TITLE_BLOCK_RESERVE_H;
  const scale = Math.min(usableW / contentW, usableH / contentH, 1);
  const ox = MARGIN + (usableW - contentW * scale) / 2;
  const oy = MARGIN + (usableH - contentH * scale) / 2;
  return { svgW: pix.w, svgH: pix.h, ox, oy, scale };
}

export function sheetBackground(sheet: SheetConfig): { fill: string; stroke: string; strokeWidth: number } {
  if (sheet.printMode) {
    return { fill: PRINT_BG, stroke: '#cbd5e1', strokeWidth: 2 };
  }
  return { fill: '#0b1220', stroke: '#24324b', strokeWidth: 2 };
}
