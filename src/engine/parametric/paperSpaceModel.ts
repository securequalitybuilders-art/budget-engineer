export type IsoPaperSize = 'A0' | 'A1' | 'A2' | 'A3' | 'A4'
export type SheetOrientation = 'portrait' | 'landscape'

export interface PaperSize {
  widthMm: number
  heightMm: number
}

export interface Viewport {
  id: string
  label: string
  modelX: number
  modelY: number
  modelWidth: number
  modelHeight: number
  paperX: number
  paperY: number
  paperWidth: number
  paperHeight: number
  scale: number
}

export interface PaperSpaceLayout {
  sheetSize: IsoPaperSize
  orientation: SheetOrientation
  paperWidthMm: number
  paperHeightMm: number
  marginMm: number
  titleBlockHeightMm: number
  viewports: Viewport[]
}

export const ISO_PAPER_SIZES: Record<IsoPaperSize, PaperSize> = {
  A0: { widthMm: 841, heightMm: 1189 },
  A1: { widthMm: 594, heightMm: 841 },
  A2: { widthMm: 420, heightMm: 594 },
  A3: { widthMm: 297, heightMm: 420 },
  A4: { widthMm: 210, heightMm: 297 },
}

export const MARGIN_MM = 15
export const TITLE_BLOCK_HEIGHT_MM = 70

export type ViewportScale =
  | '1:1' | '1:2' | '1:5' | '1:10' | '1:20' | '1:25'
  | '1:50' | '1:75' | '1:100' | '1:200' | '1:500' | '1:1000'

export const VIEWPORT_SCALES: Record<ViewportScale, number> = {
  '1:1': 1, '1:2': 0.5, '1:5': 0.2, '1:10': 0.1,
  '1:20': 0.05, '1:25': 0.04, '1:50': 0.02, '1:75': 0.01333,
  '1:100': 0.01, '1:200': 0.005, '1:500': 0.002, '1:1000': 0.001,
}

export function getPaperDimensions(
  size: IsoPaperSize,
  orientation: SheetOrientation,
): { widthMm: number; heightMm: number } {
  const dims = ISO_PAPER_SIZES[size]
  const short = Math.min(dims.widthMm, dims.heightMm)
  const long = Math.max(dims.widthMm, dims.heightMm)
  if (orientation === 'landscape') {
    return { widthMm: long, heightMm: short }
  }
  return { widthMm: short, heightMm: long }
}

export function getUsableArea(
  size: IsoPaperSize,
  orientation: SheetOrientation,
  marginMm: number = MARGIN_MM,
  titleBlockMm: number = TITLE_BLOCK_HEIGHT_MM,
): { usableWidthMm: number; usableHeightMm: number } {
  const dims = getPaperDimensions(size, orientation)
  return {
    usableWidthMm: dims.widthMm - marginMm * 2,
    usableHeightMm: dims.heightMm - marginMm * 2 - titleBlockMm,
  }
}

export interface ViewportConfig {
  modelWidth: number
  modelHeight: number
  scale: ViewportScale
}

export function createViewport(
  id: string,
  label: string,
  config: ViewportConfig,
  paperX: number,
  paperY: number,
): Viewport {
  const scaleFactor = VIEWPORT_SCALES[config.scale]
  return {
    id,
    label,
    modelX: 0,
    modelY: 0,
    modelWidth: config.modelWidth,
    modelHeight: config.modelHeight,
    paperX,
    paperY,
    paperWidth: config.modelWidth * scaleFactor * 1000,
    paperHeight: config.modelHeight * scaleFactor * 1000,
    scale: scaleFactor,
  }
}

export interface LayoutViewportsResult {
  viewports: Viewport[]
  remainingWidthMm: number
  remainingHeightMm: number
}

export function layoutViewports(
  paperWidthMm: number,
  paperHeightMm: number,
  viewportConfigs: ViewportConfig[],
  gapMm: number = 5,
): Viewport[] {
  const result: Viewport[] = []
  let cursorX = 0
  let cursorY = 0
  let rowMaxH = 0

  for (let i = 0; i < viewportConfigs.length; i++) {
    const cfg = viewportConfigs[i]
    const scaleFactor = VIEWPORT_SCALES[cfg.scale]
    const vpW = cfg.modelWidth * scaleFactor * 1000
    const vpH = cfg.modelHeight * scaleFactor * 1000

    if (cursorX > 0 && cursorX + vpW > paperWidthMm + 0.001) {
      cursorX = 0
      cursorY += rowMaxH + gapMm
      rowMaxH = 0
    }

    if (cursorY + vpH > paperHeightMm + 0.001) break

    result.push({
      id: `vp-${i + 1}`,
      label: `Viewport ${i + 1} (${cfg.scale})`,
      modelX: 0,
      modelY: 0,
      modelWidth: cfg.modelWidth,
      modelHeight: cfg.modelHeight,
      paperX: cursorX,
      paperY: cursorY,
      paperWidth: vpW,
      paperHeight: vpH,
      scale: scaleFactor,
    })

    cursorX += vpW + gapMm
    rowMaxH = Math.max(rowMaxH, vpH)
  }

  return result
}

export function modelToPaper(
  viewport: Viewport,
  modelX: number,
  modelY: number,
): { paperX: number; paperY: number } {
  return {
    paperX: viewport.paperX + (modelX - viewport.modelX) * viewport.scale * 1000,
    paperY: viewport.paperY + (viewport.modelHeight - (modelY - viewport.modelY)) * viewport.scale * 1000,
  }
}

export function paperToModel(
  viewport: Viewport,
  paperX: number,
  paperY: number,
): { modelX: number; modelY: number } {
  return {
    modelX: viewport.modelX + (paperX - viewport.paperX) / (viewport.scale * 1000),
    modelY: viewport.modelY + viewport.modelHeight - (paperY - viewport.paperY) / (viewport.scale * 1000),
  }
}

export function createPaperSpaceLayout(
  size: IsoPaperSize,
  orientation: SheetOrientation,
  viewportConfigs: ViewportConfig[],
  marginMm: number = MARGIN_MM,
  titleBlockMm: number = TITLE_BLOCK_HEIGHT_MM,
): PaperSpaceLayout {
  const dims = getPaperDimensions(size, orientation)
  const usable = getUsableArea(size, orientation, marginMm, titleBlockMm)
  const viewports = layoutViewports(usable.usableWidthMm, usable.usableHeightMm, viewportConfigs)

  return {
    sheetSize: size,
    orientation,
    paperWidthMm: dims.widthMm,
    paperHeightMm: dims.heightMm,
    marginMm,
    titleBlockHeightMm: titleBlockMm,
    viewports,
  }
}

export function getScaleLabel(scaleFactor: number): ViewportScale | null {
  for (const [label, factor] of Object.entries(VIEWPORT_SCALES)) {
    if (Math.abs(factor - scaleFactor) < 0.0001) return label as ViewportScale
  }
  return null
}

export function getRecommendedScale(
  modelWidth: number,
  modelHeight: number,
  paperWidthMm: number,
  paperHeightMm: number,
): ViewportScale {
  const modelToPaperRatio = Math.min(paperWidthMm / (modelWidth * 1000), paperHeightMm / (modelHeight * 1000))
  const scales = Object.entries(VIEWPORT_SCALES) as [ViewportScale, number][]
  scales.sort((a, b) => b[1] - a[1])

  for (const [label, factor] of scales) {
    if (factor <= modelToPaperRatio) return label
  }

  return '1:100'
}

export function listIsoSizes(): IsoPaperSize[] {
  return ['A0', 'A1', 'A2', 'A3', 'A4']
}

export function listScales(): ViewportScale[] {
  return Object.keys(VIEWPORT_SCALES) as ViewportScale[]
}
