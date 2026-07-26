import type { SheetSize as SheetSizeT } from './sheet-size';
import { SHEET_MM } from './sheet-size';

export type SheetOrientation = 'portrait' | 'landscape';

export interface SheetTemplateDef {
  id: string;
  name: string;
  size: SheetSizeT;
  orientation: SheetOrientation;
  description: string;
  viewports: SheetViewportSlot[];
  legendSlots: LegendSlot[];
  titleBlock: { reserveH: number };
  margins: { top: number; right: number; bottom: number; left: number };
}

export interface SheetViewportSlot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minScale?: number;
  allowedTypes?: string[];
  label?: string;
}

export interface LegendSlot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

const MARGIN = 15;
const TB_H = 60;

function layout(
  size: SheetSizeT, orient: SheetOrientation,
  rows: { yRel: number; hRel: number; cols: { xRel: number; wRel: number; id: string; type?: string[]; label?: string }[] }[],
  idSuffix?: string,
  legendSlots: { xRel: number; yRel: number; wRel: number; hRel: number; id: string; label: string }[] = [],
): SheetTemplateDef {
  const mm = SHEET_MM[size];
  const sheetW = orient === 'landscape' ? mm.w : mm.h;
  const sheetH = orient === 'landscape' ? mm.h : mm.w;
  const usableW = sheetW - MARGIN * 2;
  const usableH = sheetH - MARGIN * 2 - TB_H;

  const viewports: SheetViewportSlot[] = rows.flatMap(r =>
    r.cols.map(c => ({
      id: c.id,
      x: MARGIN + c.xRel * usableW,
      y: MARGIN + r.yRel * usableH,
      width: c.wRel * usableW,
      height: r.hRel * usableH,
      allowedTypes: c.type,
      label: c.label,
    })),
  );

  const legendSlotsDef: LegendSlot[] = legendSlots.map(ls => ({
    id: ls.id,
    x: MARGIN + ls.xRel * usableW,
    y: MARGIN + ls.yRel * usableH,
    width: ls.wRel * usableW,
    height: ls.hRel * usableH,
    label: ls.label,
  }));

  const baseId = `${size.toLowerCase()}-${orient}`;
  const id = idSuffix ? `${baseId}-${idSuffix}` : baseId;

  return {
    id,
    name: `${size} ${orient === 'landscape' ? 'Landscape' : 'Portrait'}`,
    size,
    orientation: orient,
    description: `${size} ${orient === 'landscape' ? 'Landscape' : 'Portrait'} sheet template`,
    viewports,
    legendSlots: legendSlotsDef,
    titleBlock: { reserveH: TB_H },
    margins: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
  };
}

function fullWidth(size: SheetSizeT, orient: SheetOrientation, slots: { id: string; yRel: number; hRel: number; type?: string[]; label?: string }[], idSuffix?: string): SheetTemplateDef {
  const mm = SHEET_MM[size];
  const sheetW = orient === 'landscape' ? mm.w : mm.h;
  const sheetH = orient === 'landscape' ? mm.h : mm.w;
  const usableW = sheetW - MARGIN * 2;
  const usableH = sheetH - MARGIN * 2 - TB_H;

  return {
    id: `${size.toLowerCase()}-${orient}-${idSuffix ?? 'full'}`,
    name: `${size} ${orient === 'landscape' ? 'Landscape' : 'Portrait'} Full`,
    size,
    orientation: orient,
    description: `${size} full-width slots`,
    viewports: slots.map(s => ({
      id: s.id,
      x: MARGIN,
      y: MARGIN + s.yRel * usableH,
      width: usableW,
      height: s.hRel * usableH,
      allowedTypes: s.type,
      label: s.label,
    })),
    legendSlots: [],
    titleBlock: { reserveH: TB_H },
    margins: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
  };
}

export const SHEET_TEMPLATES: Record<string, SheetTemplateDef> = {};

function register(t: SheetTemplateDef): void {
  SHEET_TEMPLATES[t.id] = t;
}

// ── A1 Landscape templates ──

register(layout('A1', 'landscape', [
  { yRel: 0, hRel: 0.48, cols: [
    { xRel: 0, wRel: 0.5, id: 'elevation-front', type: ['elevation'], label: 'Front Elevation' },
    { xRel: 0.5, wRel: 0.5, id: 'elevation-rear', type: ['elevation'], label: 'Rear Elevation' },
  ] },
  { yRel: 0.48, hRel: 0.52, cols: [
    { xRel: 0, wRel: 0.33, id: 'elevation-left', type: ['elevation'], label: 'Left Elevation' },
    { xRel: 0.33, wRel: 0.34, id: 'elevation-right', type: ['elevation'], label: 'Right Elevation' },
    { xRel: 0.67, wRel: 0.33, id: 'notes-legend', type: ['legend'], label: 'Notes & Legend' },
  ] },
], 'elevation', [
  { xRel: 0, yRel: 0.52, wRel: 0.67, hRel: 0.48, id: 'sections', label: 'Sections' },
]));

register(fullWidth('A1', 'landscape', [
  { id: 'elevations', yRel: 0, hRel: 0.48, type: ['elevation'], label: 'Elevations' },
  { id: 'sections', yRel: 0.48, hRel: 0.32, type: ['section'], label: 'Sections' },
  { id: 'notes', yRel: 0.8, hRel: 0.2, label: 'General Notes' },
], 'full-width'));

// ── A2 Landscape — Plan Sheet ──

register(layout('A2', 'landscape', [
  { yRel: 0, hRel: 0.55, cols: [
    { xRel: 0, wRel: 0.65, id: 'plan-main', type: ['plan'], label: 'Floor Plan' },
    { xRel: 0.65, wRel: 0.35, id: 'plan-secondary', type: ['plan', 'roof'], label: 'Upper Floor / Roof' },
  ] },
  { yRel: 0.55, hRel: 0.45, cols: [
    { xRel: 0, wRel: 0.5, id: 'schedule-area', type: ['schedule'], label: 'Schedule' },
    { xRel: 0.5, wRel: 0.25, id: 'legend-area', type: ['legend'], label: 'Legend' },
    { xRel: 0.75, wRel: 0.25, id: 'info-area', type: ['info'], label: 'Project Info' },
  ] },
], 'plan'));

// ── A2 Landscape — Elevation/Section Sheet ──

register(layout('A2', 'landscape', [
  { yRel: 0, hRel: 0.4, cols: [
    { xRel: 0, wRel: 0.5, id: 'elevation-front', type: ['elevation'], label: 'Front Elevation' },
    { xRel: 0.5, wRel: 0.5, id: 'elevation-rear', type: ['elevation'], label: 'Rear Elevation' },
  ] },
  { yRel: 0.4, hRel: 0.3, cols: [
    { xRel: 0, wRel: 0.5, id: 'elevation-left', type: ['elevation'], label: 'Left Elevation' },
    { xRel: 0.5, wRel: 0.5, id: 'elevation-right', type: ['elevation'], label: 'Right Elevation' },
  ] },
  { yRel: 0.7, hRel: 0.3, cols: [
    { xRel: 0, wRel: 0.4, id: 'section-aa', type: ['section'], label: 'Section A-A' },
    { xRel: 0.4, wRel: 0.4, id: 'section-bb', type: ['section'], label: 'Section B-B' },
    { xRel: 0.8, wRel: 0.2, id: 'notes-legend', type: ['legend'], label: 'Notes' },
  ] },
], 'elevation-section'));

// ── A2 Landscape — Combined Issue Sheet ──

register(layout('A2', 'landscape', [
  { yRel: 0, hRel: 0.55, cols: [
    { xRel: 0, wRel: 0.5, id: 'plan-main', type: ['plan'], label: 'Floor Plan' },
    { xRel: 0.5, wRel: 0.25, id: 'elevation-main', type: ['elevation'], label: 'Elevation' },
    { xRel: 0.75, wRel: 0.25, id: 'section-main', type: ['section'], label: 'Section' },
  ] },
  { yRel: 0.55, hRel: 0.45, cols: [
    { xRel: 0, wRel: 0.35, id: 'schedule-excerpt', type: ['schedule'], label: 'Schedule' },
    { xRel: 0.35, wRel: 0.35, id: 'legend-area', type: ['legend'], label: 'Legend' },
    { xRel: 0.7, wRel: 0.3, id: 'project-info', type: ['info'], label: 'Project Info' },
  ] },
], 'combined-issue'));

// ── A3 Landscape — Compact Review Sheet ──

register(layout('A3', 'landscape', [
  { yRel: 0, hRel: 0.5, cols: [
    { xRel: 0, wRel: 0.5, id: 'plan-compact', type: ['plan'], label: 'Plan' },
    { xRel: 0.5, wRel: 0.5, id: 'elevation-compact', type: ['elevation'], label: 'Elevation' },
  ] },
  { yRel: 0.5, hRel: 0.5, cols: [
    { xRel: 0, wRel: 0.4, id: 'section-compact', type: ['section'], label: 'Section' },
    { xRel: 0.4, wRel: 0.3, id: 'schedule-compact', type: ['schedule'], label: 'Schedule' },
    { xRel: 0.7, wRel: 0.3, id: 'legend-compact', type: ['legend'], label: 'Legend' },
  ] },
], 'compact'));

// ── A2 Portrait — Schedule Sheet ──

register(fullWidth('A2', 'portrait', [
  { id: 'schedule-door', yRel: 0, hRel: 0.3, type: ['schedule'], label: 'Door Schedule' },
  { id: 'schedule-window', yRel: 0.3, hRel: 0.3, type: ['schedule'], label: 'Window Schedule' },
  { id: 'schedule-structural', yRel: 0.6, hRel: 0.2, type: ['schedule'], label: 'Structural Schedule' },
  { id: 'legend-schedule', yRel: 0.8, hRel: 0.2, type: ['legend'], label: 'Legend' },
], 'schedule'));

// ── A2 Landscape — Cover Sheet ──

register(layout('A2', 'landscape', [
  { yRel: 0, hRel: 1, cols: [
    { xRel: 0, wRel: 1, id: 'cover-main', type: ['cover'], label: 'Cover' },
  ] },
], 'cover'));

// ── A2 Landscape — Drawing Register ──

register(layout('A2', 'landscape', [
  { yRel: 0, hRel: 1, cols: [
    { xRel: 0, wRel: 1, id: 'register-main', type: ['register'], label: 'Register' },
  ] },
], 'register'));

export function getTemplate(id: string): SheetTemplateDef | undefined {
  return SHEET_TEMPLATES[id];
}

export function listTemplates(): SheetTemplateDef[] {
  return Object.values(SHEET_TEMPLATES);
}
