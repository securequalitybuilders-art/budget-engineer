// ── HPGL Generator ────────────────────────────────────────────
// Converts optimized PlotterSegments into HPGL command streams
// for physical pen plotters (HP 7440/7550A, Roland DXY, etc.).

import type {
  PlotterPoint,
  PlotterSegment,
  OptimizedPenGroup,
  HPGLCommand,
  HPGLCommandType,
  PaperSize,
  PlotterPipelineResult,
} from './types'
import { PAPER_DIMENSIONS, HPGL_UNITS_PER_MM } from './types'
import type { OptimizationStats } from './pathOptimizer'

// ── Coordinate conversion ─────────────────────────────────────

/** Convert a single SVG coordinate (px, origin top-left) to HPGL units (origin bottom-left). */
export function svgCoordToHpgl(
  pt: PlotterPoint,
  svgWidth: number,
  svgHeight: number,
  paperWidthMm: number,
  paperHeightMm: number,
): PlotterPoint {
  // Scale SVG coordinates to fit paper
  const scaleX = paperWidthMm / svgWidth
  const scaleY = paperHeightMm / svgHeight
  const scale = Math.min(scaleX, scaleY) // Fit within paper bounds

  // SVG origin is top-left, HPGL origin is bottom-left
  const hpglX = Math.round(pt.x * scale * HPGL_UNITS_PER_MM)
  const hpglY = Math.round((svgHeight - pt.y) * scale * HPGL_UNITS_PER_MM)

  return { x: hpglX, y: hpglY }
}

/** Compute the SVG bounding box from a set of segments. */
function svgBounds(segments: PlotterSegment[]): {
  minX: number; maxX: number; minY: number; maxY: number; width: number; height: number
} {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const seg of segments) {
    for (const pt of seg.points) {
      if (pt.x < minX) minX = pt.x
      if (pt.x > maxX) maxX = pt.x
      if (pt.y < minY) minY = pt.y
      if (pt.y > maxY) maxY = pt.y
    }
  }
  if (!Number.isFinite(minX)) { minX = 0; maxX = 1; minY = 0; maxY = 1 }
  return { minX, maxX, minY, maxY, width: maxX - minX || 1, height: maxY - minY || 1 }
}

// ── HPGL command generation ───────────────────────────────────

/** Format a single HPGL command as a string. */
export function formatHpglCmd(cmd: HPGLCommand): string {
  switch (cmd.cmd) {
    case 'SP':
      return `SP${cmd.pen};`
    case 'PU':
      if (cmd.point) return `PU${cmd.point.x},${cmd.point.y};`
      return 'PU;'
    case 'PD':
      if (cmd.points && cmd.points.length > 0) {
        const coords = cmd.points.map(p => `${p.x},${p.y}`).join(',')
        return `PD${coords};`
      }
      return 'PD;'
    case 'PA':
      if (cmd.point) return `PA${cmd.point.x},${cmd.point.y};`
      return 'PA;'
    case 'IP':
      return 'IP;'
    case 'SC':
      return 'SC;'
    case 'LT':
      return 'LT;'
    case 'VS':
      return cmd.pen != null ? `VS${cmd.pen};` : 'VS;'
    case 'PF':
      return 'PF;'
    default:
      return ''
  }
}

/** Generate HPGL commands for a single segment (pen-up to start, pen-down through points). */
function segmentToHpgl(
  seg: PlotterSegment,
  bounds: { minX: number; minY: number; width: number; height: number },
  paperWidthMm: number,
  paperHeightMm: number,
): HPGLCommand[] {
  if (seg.points.length < 2) return []

  const scale = Math.min(
    paperWidthMm / bounds.width,
    paperHeightMm / bounds.height,
  )

  const toHpgl = (pt: PlotterPoint): PlotterPoint => ({
    x: Math.round((pt.x - bounds.minX) * scale * HPGL_UNITS_PER_MM),
    y: Math.round((pt.y - bounds.minY) * scale * HPGL_UNITS_PER_MM),
  })

  const start = toHpgl(seg.points[0])

  const cmds: HPGLCommand[] = [
    // Pen up and move to segment start
    { cmd: 'PU', point: start },
  ]

  // Pen down and draw through all points
  const drawPoints = seg.points.slice(1).map(toHpgl)
  cmds.push({ cmd: 'PD', points: drawPoints })

  return cmds
}

// ── Main HPGL generation ──────────────────────────────────────

/** Compute the scaling factor for a drawing to fit a paper size. */
export function computeScale(
  svgWidth: number,
  svgHeight: number,
  paperSize: PaperSize,
): number {
  const paper = PAPER_DIMENSIONS[paperSize]
  // Subtract 20mm margin on each side
  const usableWidth = paper.widthMm - 40
  const usableHeight = paper.heightMm - 40
  const scaleX = usableWidth / (svgWidth * HPGL_UNITS_PER_MM / HPGL_UNITS_PER_MM)
  const scaleY = usableHeight / (svgHeight * HPGL_UNITS_PER_MM / HPGL_UNITS_PER_MM)
  return Math.min(scaleX, scaleY)
}

/** Generate the full HPGL command stream from optimized pen groups. */
export function generateHpgl(
  penGroups: OptimizedPenGroup[],
  _svgWidth: number,
  _svgHeight: number,
  paperSize: PaperSize = 'A1',
): { commands: HPGLCommand[]; hpglString: string } {
  const paper = PAPER_DIMENSIONS[paperSize]
  const allSegments = penGroups.flatMap(g => g.segments)
  const bounds = svgBounds(allSegments)

  const commands: HPGLCommand[] = []

  // Initialize plotter
  commands.push({ cmd: 'IP' })   // Initialize
  commands.push({ cmd: 'IN' as HPGLCommandType }) // Reset

  // Process each pen group
  for (const group of penGroups) {
    // Select pen
    commands.push({ cmd: 'SP', pen: group.pen })

    // Draw each segment in optimized order
    for (const seg of group.segments) {
      const segCmds = segmentToHpgl(seg, bounds, paper.widthMm, paper.heightMm)
      commands.push(...segCmds)
    }
  }

  // Final pen up
  commands.push({ cmd: 'PU' })
  commands.push({ cmd: 'SP', pen: 0 }) // Deselect pen

  // Format to string
  const hpglString = commands.map(formatHpglCmd).join('')

  return { commands, hpglString }
}

// ── Time estimation ───────────────────────────────────────────

/** Estimate plotting time in minutes.
 *  Typical plotter speed: ~300mm/s pen-up, ~50mm/s pen-down.
 *  Plus ~2s per pen lift, ~5s per pen change.
 */
export function estimatePlotTime(
  penGroups: OptimizedPenGroup[],
): number {
  const PEN_UP_SPEED_MM_S = 300
  const PEN_DOWN_SPEED_MM_S = 50
  const PEN_LIFT_SECONDS = 2
  const PEN_CHANGE_SECONDS = 5

  let totalTimeSeconds = 0
  let prevPen = -1

  for (const group of penGroups) {
    // Pen change time
    if (group.pen !== prevPen) {
      totalTimeSeconds += PEN_CHANGE_SECONDS
      prevPen = group.pen
    }

    // Pen-down drawing time
    totalTimeSeconds += group.penDownDistance / PEN_DOWN_SPEED_MM_S

    // Pen-up travel time (each lift = travel + put down)
    totalTimeSeconds += (group.penUpTravel / PEN_UP_SPEED_MM_S)

    // Pen lift time
    totalTimeSeconds += group.penLifts * PEN_LIFT_SECONDS
  }

  return Math.round(totalTimeSeconds / 60)
}

// ── Build full pipeline result ────────────────────────────────

/** Assemble the final pipeline result from optimized pen groups. */
export function buildPlotterResult(
  penGroups: OptimizedPenGroup[],
  svgWidth: number,
  svgHeight: number,
  paperSize: PaperSize = 'A1',
): PlotterPipelineResult {
  const paper = PAPER_DIMENSIONS[paperSize]
  const { commands, hpglString } = generateHpgl(penGroups, svgWidth, svgHeight, paperSize)

  const totalSegments = penGroups.reduce((sum, g) => sum + g.segments.length, 0)
  const totalPenUpTravel = penGroups.reduce((sum, g) => sum + g.penUpTravel, 0)
  const totalPenDown = penGroups.reduce((sum, g) => sum + g.penDownDistance, 0)
  const totalLifts = penGroups.reduce((sum, g) => sum + g.penLifts, 0)
  const totalMerges = penGroups.reduce((sum, g) => sum + g.mergesApplied, 0)

  // Convert SVG px → mm for display
  const bounds = svgBounds(penGroups.flatMap(g => g.segments))
  const scale = Math.min(
    (paper.widthMm - 40) / bounds.width,
    (paper.heightMm - 40) / bounds.height,
  )

  return {
    hpgl: commands,
    hpglString,
    penGroups,
    stats: {
      totalSegments,
      totalPenUpTravelMm: Math.round(totalPenUpTravel * scale * 10) / 10,
      totalPenDownDistanceMm: Math.round(totalPenDown * scale * 10) / 10,
      totalPenLifts: totalLifts,
      totalMerges,
      estimatedTimeMinutes: estimatePlotTime(penGroups),
    },
    paper: {
      size: paperSize,
      widthMm: paper.widthMm,
      heightMm: paper.heightMm,
      scale,
    },
  }
}

// ── Paper configuration (full HPGL export) ─────────────────────

export interface PaperConfig {
  name: string
  widthMm: number
  heightMm: number
  widthHpgl: number
  heightHpgl: number
  topMarginMm: number
  bottomMarginMm: number
}

export const PAPER_SIZES: Record<string, PaperConfig> = {
  A0: {
    name: 'A0',
    widthMm: 1189,
    heightMm: 841,
    widthHpgl: 1189 * HPGL_UNITS_PER_MM,
    heightHpgl: 841 * HPGL_UNITS_PER_MM,
    topMarginMm: 20,
    bottomMarginMm: 10,
  },
  A1: {
    name: 'A1',
    widthMm: 841,
    heightMm: 594,
    widthHpgl: 841 * HPGL_UNITS_PER_MM,
    heightHpgl: 594 * HPGL_UNITS_PER_MM,
    topMarginMm: 15,
    bottomMarginMm: 10,
  },
  A2: {
    name: 'A2',
    widthMm: 594,
    heightMm: 420,
    widthHpgl: 594 * HPGL_UNITS_PER_MM,
    heightHpgl: 420 * HPGL_UNITS_PER_MM,
    topMarginMm: 10,
    bottomMarginMm: 8,
  },
}

// ── Pen configuration (full HPGL export) ───────────────────────

export interface PenConfig {
  slot: number
  name: string
  color: number
  speed: number
  pressure: number
}

export const DEFAULT_PEN_CONFIGS: PenConfig[] = [
  { slot: 1, name: '0.18mm Structural', color: 1, speed: 30, pressure: 80 },
  { slot: 2, name: '0.25mm Walls',      color: 1, speed: 25, pressure: 90 },
  { slot: 3, name: '0.35mm Dimensions', color: 1, speed: 20, pressure: 95 },
  { slot: 4, name: '0.50mm Grid',       color: 1, speed: 15, pressure: 100 },
]

// ── Full HPGL export helpers ───────────────────────────────────

function hpglInit(paper: PaperConfig): string {
  return [
    '; ── Budget Engineer Pen Plotter Output ──',
    `; Paper: ${paper.name} (${paper.widthMm}×${paper.heightMm}mm)`,
    `; Generated: ${new Date().toISOString()}`,
    'IN;',
    'IP;',
    'SP1;',
    'PW0.18;',
    'LT;',
  ].join('\n')
}

function hpglFooter(): string {
  return [
    'SP0;',
    'PU0,0;',
    'IN;',
    'PF;',
  ].join('\n')
}

function hpglSelectPen(slot: number): string {
  return `SP${slot};`
}


function hpglPenUpXY(x: number, y: number): string {
  return `PU${Math.round(x)},${Math.round(y)};`
}

function svgToHpgl(pt: PlotterPoint, paper: PaperConfig, scale: number): [number, number] {
  const x = pt.x * scale
  const y = (paper.heightMm - pt.y * scale) * HPGL_UNITS_PER_MM
  return [x * HPGL_UNITS_PER_MM, y]
}

// ── Full HPGL export ───────────────────────────────────────────

export interface HpglExportOptions {
  paperSize?: string
  penConfigs?: PenConfig[]
  scale?: number
  titleBlock?: string[]
  stats?: OptimizationStats
}

export interface HpglExportResult {
  content: string
  sizeBytes: number
  estimatedMinutes: number
  paper: PaperConfig
  penConfigs: PenConfig[]
  stats?: OptimizationStats
}

/**
 * Generate an HPGL file from optimized pen groups.
 */
export function generateHpglExport(
  groups: OptimizedPenGroup[],
  opts: HpglExportOptions = {},
): HpglExportResult {
  const paperName = opts.paperSize ?? 'A1'
  const paper = PAPER_SIZES[paperName] ?? PAPER_SIZES.A1
  const penConfigs = opts.penConfigs ?? DEFAULT_PEN_CONFIGS
  const scale = opts.scale ?? 1

  const lines: string[] = []

  lines.push(hpglInit(paper))

  if (opts.titleBlock && opts.titleBlock.length > 0) {
    const tbY = paper.heightMm - paper.bottomMarginMm - 10
    for (let i = 0; i < Math.min(6, opts.titleBlock.length); i++) {
      const line = opts.titleBlock[i]
      lines.push(`LB${line}\x03;`)
      lines.push(hpglPenUpXY(paper.bottomMarginMm * HPGL_UNITS_PER_MM, (tbY - i * 5) * HPGL_UNITS_PER_MM))
    }
  }

  for (const group of groups) {
    const penConfig = penConfigs[group.pen - 1] ?? penConfigs[0]

    lines.push(hpglSelectPen(penConfig.slot))
    lines.push(`PW${parseFloat(penConfig.name.match(/[\d.]+/)?.[0] ?? '0.25')};`)

    for (const segment of group.segments) {
      if (segment.points.length < 2) continue

      const [sx, sy] = svgToHpgl(segment.points[0], paper, scale)
      lines.push(hpglPenUpXY(sx, sy))

      lines.push('PD;')
      for (let i = 1; i < segment.points.length; i++) {
        const [px, py] = svgToHpgl(segment.points[i], paper, scale)
        lines.push(`PA${Math.round(px)},${Math.round(py)};`)
      }
    }
  }

  lines.push(hpglFooter())

  const content = lines.join('\n')
  const sizeBytes = new TextEncoder().encode(content).length

  let totalPenDown = 0
  let totalPenUp = 0
  for (const g of groups) {
    totalPenDown += g.penDownDistance
    totalPenUp += g.penUpTravel
  }
  const estimatedMinutes = (totalPenDown / 1200) + (totalPenUp / 3000)

  return {
    content,
    sizeBytes,
    estimatedMinutes,
    paper,
    penConfigs,
    stats: opts.stats,
  }
}

// ── File download ──────────────────────────────────────────────

/**
 * Trigger a browser download of the HPGL file.
 */
export function downloadHpgl(
  result: HpglExportResult,
  filename: string = 'budget-engineer-plot.plt',
): void {
  const blob = new Blob([result.content], { type: 'application/vnd.hp-hpgl' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Get HPGL file as a Blob (for programmatic use / upload).
 */
export function hpglBlob(result: HpglExportResult): Blob {
  return new Blob([result.content], { type: 'application/vnd.hp-hpgl' })
}
