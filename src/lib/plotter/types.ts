// ── Plotter Pipeline Types ─────────────────────────────────────
// Core types for the IFC → SVG → Optimized HPGL → Physical Pen Plotter pipeline.

/** A 2D point in plotter coordinate space (plotter units: 0.025mm per unit on HPGL). */
export interface PlotterPoint {
  x: number
  y: number
}

/** A polyline segment: an ordered list of points drawn with the pen down. */
export interface PlotterSegment {
  points: PlotterPoint[]
  /** Layer code from the drawing (e.g. 'A-WALL', 'S-COLS'). */
  layer: string
  /** SVG stroke color (informational). */
  stroke?: string
  /** SVG stroke-width in px (informational). */
  strokeWidth?: number
}

/** A parsed plotter path: one SVG element → one or more segments. */
export interface PlotterPath {
  /** Original SVG element index (for traceability). */
  index: number
  /** Layer / pen group key. */
  layer: string
  /** Segments (may be >1 for complex paths). */
  segments: PlotterSegment[]
  /** Total path length in SVG px (sum of segment lengths). */
  length: number
}

// ── Paper sizes (ISO 216) ─────────────────────────────────────

export type PaperSize = 'A0' | 'A1' | 'A2' | 'A3' | 'A4'

/** Dimensions in mm (width × height, landscape orientation). */
export const PAPER_DIMENSIONS: Record<PaperSize, { widthMm: number; heightMm: number }> = {
  A0: { widthMm: 1189, heightMm: 841 },
  A1: { widthMm: 841, heightMm: 594 },
  A2: { widthMm: 594, heightMm: 420 },
  A3: { widthMm: 420, heightMm: 297 },
  A4: { widthMm: 297, heightMm: 210 },
}

/** Plotter resolution: HPGL standard is 40 units per mm (0.025mm resolution). */
export const HPGL_UNITS_PER_MM = 40

/** Convert mm to HPGL plotter units. */
export function mmToHpglUnits(mm: number): number {
  return Math.round(mm * HPGL_UNITS_PER_MM)
}

// ── Pen specifications ────────────────────────────────────────

/** Physical pen tip diameter in mm (architectural standard technical pens). */
export type PenTipMm = 0.13 | 0.18 | 0.25 | 0.35 | 0.50 | 0.70 | 1.00

/** A physical pen slot assignment for the plotter. */
export interface PenSpec {
  /** Pen slot number (1-based, maps to SP command). */
  slot: number
  /** Physical tip diameter. */
  tipMm: PenTipMm
  /** Human-readable label. */
  label: string
}

/** Standard architectural pen set for pen plotters. */
export const ARCH_PEN_SET: PenSpec[] = [
  { slot: 1, tipMm: 0.18, label: 'Fine lines — annotations, hatching, grid' },
  { slot: 2, tipMm: 0.25, label: 'Thin lines — doors, windows, furniture' },
  { slot: 3, tipMm: 0.35, label: 'Medium lines — dimensions, partitions' },
  { slot: 4, tipMm: 0.50, label: 'Heavy lines — walls, sections, title block' },
]

/** Map from line weight to pen slot. */
export function penSlotForWeight(weightMm: number): number {
  if (weightMm <= 0.18) return 1
  if (weightMm <= 0.25) return 2
  if (weightMm <= 0.35) return 3
  return 4
}

// ── HPGL commands ─────────────────────────────────────────────

export type HPGLCommandType = 'SP' | 'PU' | 'PD' | 'PA' | 'IP' | 'SC' | 'LT' | 'VS' | 'PF'

export interface HPGLCommand {
  cmd: HPGLCommandType
  /** Pen number for SP. */
  pen?: number
  /** Point for PU/PD. */
  point?: PlotterPoint
  /** Points for PD (multi-point draw). */
  points?: PlotterPoint[]
  /** Pen-up move to point. */
  moveTo?: PlotterPoint
}

// ── TSP optimizer ─────────────────────────────────────────────

export interface TspOptions {
  /** Maximum 2-opt iterations without improvement. */
  maxIterations?: number
  /** Stop early if improvement is below this fraction. */
  improvementThreshold?: number
}

export interface OptimizedPenGroup {
  pen: number
  /** Ordered segments after TSP optimization. */
  segments: PlotterSegment[]
  /** Total pen-up travel distance (in SVG px). */
  penUpTravel: number
  /** Total pen-down drawing distance (in SVG px). */
  penDownDistance: number
  /** Number of pen lifts. */
  penLifts: number
  /** Number of collinear merges applied. */
  mergesApplied: number
}

// ── Pipeline result ───────────────────────────────────────────

export interface PlotterPipelineResult {
  /** Final HPGL command stream. */
  hpgl: HPGLCommand[]
  /** Total HPGL string output. */
  hpglString: string
  /** Per-pen-group optimization stats. */
  penGroups: OptimizedPenGroup[]
  /** Overall stats. */
  stats: {
    totalSegments: number
    totalPenUpTravelMm: number
    totalPenDownDistanceMm: number
    totalPenLifts: number
    totalMerges: number
    estimatedTimeMinutes: number
  }
  /** Paper configuration used. */
  paper: {
    size: PaperSize
    widthMm: number
    heightMm: number
    scale: number
  }
}

// ── SVG element types (parsed from SVG strings) ───────────────

export interface SvgLineElement {
  type: 'line'
  x1: number; y1: number
  x2: number; y2: number
  stroke?: string
  strokeWidth?: number
  layer?: string
}

export interface SvgRectElement {
  type: 'rect'
  x: number; y: number
  width: number; height: number
  stroke?: string
  strokeWidth?: number
  layer?: string
}

export interface SvgPolylineElement {
  type: 'polyline'
  points: PlotterPoint[]
  stroke?: string
  strokeWidth?: number
  layer?: string
}

export interface SvgPathElement {
  type: 'path'
  d: string
  stroke?: string
  strokeWidth?: number
  layer?: string
}

export interface SvgCircleElement {
  type: 'circle'
  cx: number; cy: number; r: number
  stroke?: string
  strokeWidth?: number
  layer?: string
}

export type SvgElement = SvgLineElement | SvgRectElement | SvgPolylineElement | SvgPathElement | SvgCircleElement
