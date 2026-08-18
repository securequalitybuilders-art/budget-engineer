// ── Plotter Pipeline — barrel export ──────────────────────────

export * from './types'
export * from './svgParser'
export * from './pathOptimizer'
// Explicit re-exports to avoid svgToHpgl name collision between hpglGenerator and plotterPipeline
export {
  formatHpglCmd,
  generateHpgl,
  estimatePlotTime,
  buildPlotterResult,
  computeScale,
  svgCoordToHpgl,
  PAPER_SIZES,
  DEFAULT_PEN_CONFIGS,
  generateHpglExport,
  downloadHpgl,
  hpglBlob,
} from './hpglGenerator'
export type { PaperConfig, PenConfig } from './hpglGenerator'
export * from './penAssignment'
export * from './plotterPipeline'
export * from './planToPaths'
export { generateDxf, countDxfEntities, dxfLayerNames } from './dxfGenerator'
export * from './svgGenerator'
export { PlotterSimulator } from './plotterSimulator'
