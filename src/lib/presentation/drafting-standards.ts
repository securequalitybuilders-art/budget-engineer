export type DrawingMode = 'technical' | 'presentation'

export type PenWidth = 0.13 | 0.18 | 0.25 | 0.35 | 0.50 | 0.70 | 1.00

export type LineweightCategory =
  | 'cut-wall'
  | 'cut-slab'
  | 'cut-structure'
  | 'external-outline'
  | 'internal-wall'
  | 'overhead'
  | 'fixture'
  | 'furniture'
  | 'dimension'
  | 'annotation-leader'
  | 'grid'
  | 'hatch-boundary'
  | 'hidden'
  | 'section-cut'
  | 'terrain'
  | 'reference'

export type Linetype =
  | 'continuous'
  | 'dashed'
  | 'dotted'
  | 'dash-dot'
  | 'long-dash'
  | 'long-dash-short-dash'
  | 'short-dash'
  | 'hidden2'

export type TextRole =
  | 'drawing-title'
  | 'sheet-title'
  | 'room-label'
  | 'dimension-text'
  | 'annotation-text'
  | 'note-text'
  | 'legend-title'
  | 'legend-entry'
  | 'scale-label'
  | 'revision-text'
  | 'title-block-field'
  | 'title-block-heading'

export type HatchStyle =
  | 'solid-fill'
  | 'diagonal-crosshatch'
  | 'horizontal-lines'
  | 'vertical-lines'
  | 'crosshatch'
  | 'dots'
  | 'earth'
  | 'concrete'
  | 'insulation'
  | 'brick'
  | 'blockwork'
  | 'steel'
  | 'glass'

export type PlotColor = 'black' | 'white' | 'grey' | 'blueprint' | 'full-color'

export interface LineweightDef {
  category: LineweightCategory
  penWidth: PenWidth
  svgStrokeWidth: number
  rgb: string
  priority: number
}

export interface TextDef {
  role: TextRole
  fontSizeMm: number
  fontFamily: string
  weight: 'normal' | 'bold'
  color: string
}

export interface SheetSizeDef {
  code: string
  widthMm: number
  heightMm: number
  landscape: boolean
  printableWidthMm: number
  printableHeightMm: number
  marginMm: number
}

export interface DraftingStandards {
  mode: DrawingMode
  name: string
  description: string
  plotColor: PlotColor
  lineweights: LineweightDef[]
  textStyles: TextDef[]
  sheetSizes: SheetSizeDef[]
  dimensionArrowSizeMm: number
  dimensionExtensionMm: number
  dimensionOffsetMm: number
  gridBubbleDiameterMm: number
  levelMarkerSizeMm: number
  sectionMarkerSizeMm: number
  calloutBubbleDiameterMm: number
}

const BASE_WEIGHTS: Record<LineweightCategory, { technical: PenWidth; presentation: PenWidth }> = {
  'cut-wall': { technical: 0.70, presentation: 0.50 },
  'cut-slab': { technical: 0.50, presentation: 0.35 },
  'cut-structure': { technical: 0.50, presentation: 0.35 },
  'external-outline': { technical: 0.35, presentation: 0.25 },
  'internal-wall': { technical: 0.25, presentation: 0.18 },
  'overhead': { technical: 0.18, presentation: 0.13 },
  'fixture': { technical: 0.18, presentation: 0.13 },
  'furniture': { technical: 0.13, presentation: 0.13 },
  'dimension': { technical: 0.18, presentation: 0.13 },
  'annotation-leader': { technical: 0.18, presentation: 0.13 },
  'grid': { technical: 0.13, presentation: 0.13 },
  'hatch-boundary': { technical: 0.13, presentation: 0.13 },
  'hidden': { technical: 0.18, presentation: 0.13 },
  'section-cut': { technical: 0.70, presentation: 0.50 },
  'terrain': { technical: 0.25, presentation: 0.18 },
  'reference': { technical: 0.13, presentation: 0.13 },
}

const PEN_TO_SVG: Record<PenWidth, number> = {
  0.13: 0.13,
  0.18: 0.18,
  0.25: 0.25,
  0.35: 0.35,
  0.50: 0.50,
  0.70: 0.70,
  1.00: 1.00,
}

const PEN_COLORS: Record<DrawingMode, Record<PenWidth, string>> = {
  technical: {
    0.13: '#555555',
    0.18: '#444444',
    0.25: '#333333',
    0.35: '#222222',
    0.50: '#111111',
    0.70: '#000000',
    1.00: '#000000',
  },
  presentation: {
    0.13: '#888888',
    0.18: '#666666',
    0.25: '#444444',
    0.35: '#333333',
    0.50: '#222222',
    0.70: '#111111',
    1.00: '#000000',
  },
}

function buildLineweights(mode: DrawingMode): LineweightDef[] {
  const categories = Object.keys(BASE_WEIGHTS) as LineweightCategory[]
  return categories.map((category, i) => {
    const penWidth = BASE_WEIGHTS[category][mode]
    return {
      category,
      penWidth,
      svgStrokeWidth: PEN_TO_SVG[penWidth],
      rgb: PEN_COLORS[mode][penWidth],
      priority: i,
    }
  })
}

function buildTextStyles(mode: DrawingMode): TextDef[] {
  const color = mode === 'technical' ? '#222222' : '#444444'
  const font = 'Arial, Helvetica, sans-serif'
  return [
    { role: 'drawing-title', fontSizeMm: 4.0, fontFamily: font, weight: 'bold', color },
    { role: 'sheet-title', fontSizeMm: 3.5, fontFamily: font, weight: 'bold', color },
    { role: 'room-label', fontSizeMm: 2.5, fontFamily: font, weight: 'normal', color },
    { role: 'dimension-text', fontSizeMm: 2.0, fontFamily: font, weight: 'normal', color },
    { role: 'annotation-text', fontSizeMm: 2.0, fontFamily: font, weight: 'normal', color },
    { role: 'note-text', fontSizeMm: 1.8, fontFamily: font, weight: 'normal', color: '#555555' },
    { role: 'legend-title', fontSizeMm: 3.0, fontFamily: font, weight: 'bold', color },
    { role: 'legend-entry', fontSizeMm: 2.0, fontFamily: font, weight: 'normal', color },
    { role: 'scale-label', fontSizeMm: 2.0, fontFamily: font, weight: 'normal', color },
    { role: 'revision-text', fontSizeMm: 1.8, fontFamily: font, weight: 'normal', color: '#555555' },
    { role: 'title-block-field', fontSizeMm: 2.0, fontFamily: font, weight: 'normal', color },
    { role: 'title-block-heading', fontSizeMm: 2.0, fontFamily: font, weight: 'bold', color: '#333333' },
  ]
}

function buildSheetSizes(): SheetSizeDef[] {
  const margin = 20
  return [
    { code: 'A4', widthMm: 297, heightMm: 210, landscape: true, printableWidthMm: 297 - 2 * margin, printableHeightMm: 210 - 2 * margin - 46, marginMm: margin },
    { code: 'A4', widthMm: 210, heightMm: 297, landscape: false, printableWidthMm: 210 - 2 * margin, printableHeightMm: 297 - 2 * margin - 46, marginMm: margin },
    { code: 'A3', widthMm: 420, heightMm: 297, landscape: true, printableWidthMm: 420 - 2 * margin, printableHeightMm: 297 - 2 * margin - 46, marginMm: margin },
    { code: 'A3', widthMm: 297, heightMm: 420, landscape: false, printableWidthMm: 297 - 2 * margin, printableHeightMm: 420 - 2 * margin - 46, marginMm: margin },
    { code: 'A2', widthMm: 594, heightMm: 420, landscape: true, printableWidthMm: 594 - 2 * margin, printableHeightMm: 420 - 2 * margin - 46, marginMm: margin },
    { code: 'A2', widthMm: 420, heightMm: 594, landscape: false, printableWidthMm: 420 - 2 * margin, printableHeightMm: 594 - 2 * margin - 46, marginMm: margin },
    { code: 'A1', widthMm: 841, heightMm: 594, landscape: true, printableWidthMm: 841 - 2 * margin, printableHeightMm: 594 - 2 * margin - 55, marginMm: margin },
    { code: 'A1', widthMm: 594, heightMm: 841, landscape: false, printableWidthMm: 594 - 2 * margin, printableHeightMm: 841 - 2 * margin - 55, marginMm: margin },
    { code: 'A0', widthMm: 1189, heightMm: 841, landscape: true, printableWidthMm: 1189 - 2 * margin, printableHeightMm: 841 - 2 * margin - 55, marginMm: margin },
    { code: 'A0', widthMm: 841, heightMm: 1189, landscape: false, printableWidthMm: 841 - 2 * margin, printableHeightMm: 1189 - 2 * margin - 55, marginMm: margin },
  ]
}

const TECHNICAL: DraftingStandards = {
  mode: 'technical',
  name: 'Technical Drawing Standard',
  description: 'Professional architectural working drawing standard',
  plotColor: 'black',
  lineweights: buildLineweights('technical'),
  textStyles: buildTextStyles('technical'),
  sheetSizes: buildSheetSizes(),
  dimensionArrowSizeMm: 2.5,
  dimensionExtensionMm: 8,
  dimensionOffsetMm: 10,
  gridBubbleDiameterMm: 10,
  levelMarkerSizeMm: 6,
  sectionMarkerSizeMm: 12,
  calloutBubbleDiameterMm: 14,
}

const PRESENTATION: DraftingStandards = {
  mode: 'presentation',
  name: 'Presentation Drawing Standard',
  description: 'Client-facing presentation drawing standard',
  plotColor: 'grey',
  lineweights: buildLineweights('presentation'),
  textStyles: buildTextStyles('presentation'),
  sheetSizes: buildSheetSizes(),
  dimensionArrowSizeMm: 2.0,
  dimensionExtensionMm: 6,
  dimensionOffsetMm: 8,
  gridBubbleDiameterMm: 8,
  levelMarkerSizeMm: 5,
  sectionMarkerSizeMm: 10,
  calloutBubbleDiameterMm: 12,
}

const STANDARDS: Record<DrawingMode, DraftingStandards> = {
  technical: TECHNICAL,
  presentation: PRESENTATION,
}

export function getDrawingStandards(mode: DrawingMode = 'technical'): DraftingStandards {
  return STANDARDS[mode]
}

export function getLineweight(category: LineweightCategory, mode: DrawingMode = 'technical'): LineweightDef {
  const std = STANDARDS[mode]
  return std.lineweights.find(lw => lw.category === category) ?? std.lineweights[0]
}

export function getTextStyle(role: TextRole, mode: DrawingMode = 'technical'): TextDef {
  const std = STANDARDS[mode]
  return std.textStyles.find(ts => ts.role === role) ?? std.textStyles[0]
}

export function getSheetSize(code: string, landscape: boolean = true): SheetSizeDef | undefined {
  return STANDARDS.technical.sheetSizes.find(s => s.code === code && s.landscape === landscape)
}

export function suggestSheetSize(contentWidthMm: number, contentHeightMm: number, mode: DrawingMode = 'technical'): SheetSizeDef {
  const sizes = STANDARDS[mode].sheetSizes
  const sorted = [...sizes].sort((a, b) => {
    const aFit = a.printableWidthMm >= contentWidthMm && a.printableHeightMm >= contentHeightMm ? 0 : 1
    const bFit = b.printableWidthMm >= contentWidthMm && b.printableHeightMm >= contentHeightMm ? 0 : 1
    if (aFit !== bFit) return aFit - bFit
    return a.widthMm * a.heightMm - b.widthMm * b.heightMm
  })
  return sorted[0] ?? sizes[0]
}

export function scaleContentToFit(
  contentW: number,
  contentH: number,
  sheetW: number,
  sheetH: number,
  marginMm: number = 20,
): { scale: number; offsetX: number; offsetY: number } {
  const availableW = sheetW - 2 * marginMm
  const availableH = sheetH - 2 * marginMm - 55
  if (contentW <= 0 || contentH <= 0) return { scale: 1, offsetX: 0, offsetY: 0 }
  const scaleX = availableW / contentW
  const scaleY = availableH / contentH
  const scale = Math.min(scaleX, scaleY)
  const offsetX = (sheetW - contentW * scale) / 2
  const offsetY = (sheetH - contentH * scale - 55) / 2
  return { scale, offsetX, offsetY }
}

export function mmToSvg(mm: number, dpi: number = 96): number {
  return (mm / 25.4) * dpi
}

export function formatScaleLabel(scale: number): string {
  const denominators = [1, 2, 5, 10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500]
  const closest = denominators.reduce((prev, curr) =>
    Math.abs(curr - scale) < Math.abs(prev - scale) ? curr : prev,
  )
  return `1:${closest}`
}

export function resolveScale(
  contentWidthMm: number,
  contentHeightMm: number,
  sheetWidthMm: number,
  sheetHeightMm: number,
  marginMm: number = 20,
  titleBlockHeightMm: number = 55,
): number {
  const availableW = sheetWidthMm - 2 * marginMm
  const availableH = sheetHeightMm - 2 * marginMm - titleBlockHeightMm
  if (contentWidthMm <= 0 || availableW <= 0) return 100
  const rawScale = Math.max(contentWidthMm / availableW, contentHeightMm / availableH)
  if (rawScale <= 0) return 100
  const denominators = [1, 2, 5, 10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500]
  const rounded = Math.ceil(rawScale * 10) / 10
  const closest = denominators.reduce((prev, curr) =>
    Math.abs(curr - rounded) < Math.abs(prev - rounded) ? curr : prev,
  )
  return Math.max(closest, 1)
}
