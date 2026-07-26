import { CAD_HAIR, CAD_THIN, INK, PAPER } from '@/components/drawings/cadConstants'
import type { BoardAnnotation, BoardCell, BoardSnapshotRef } from '@/domain/presentation'

export interface OverlayContext {
  sheetW: number
  sheetH: number
  cells: BoardCell[]
}

export function renderBoardBackground(sheetW: number, sheetH: number): string {
  return `<rect x="0" y="0" width="${sheetW}" height="${sheetH}" fill="${PAPER}" stroke="${INK}" stroke-width="${CAD_THIN}"/>`
}

export function renderCellFrame(cell: BoardCell): string {
  return `<rect x="${cell.x}" y="${cell.y}" width="${cell.w}" height="${cell.h}" fill="none" stroke="${INK}" stroke-width="${CAD_HAIR}" stroke-dasharray="4,4"/>`
}

export function renderCellLabel(cell: BoardCell): string {
  if (!cell.label) return ''
  const labelY = cell.y + 16
  return `<text x="${cell.x + 8}" y="${labelY}" font-family="Arial, sans-serif" font-size="10" fill="${INK}" font-weight="bold">${cell.label}</text>`
}

export function renderAnnotationSvg(ann: BoardAnnotation): string {
  switch (ann.kind) {
    case 'textbox':
      return renderTextBox(ann)
    case 'callout':
      return renderCallout(ann)
    case 'dimension':
      return renderDimension(ann)
    case 'freehand':
      return renderFreehand(ann)
    default:
      return ''
  }
}

function renderTextBox(ann: BoardAnnotation): string {
  const w = ann.w ?? 100
  const h = ann.h ?? 30
  return `<g><rect x="${ann.x}" y="${ann.y}" width="${w}" height="${h}" fill="#fff9e6" stroke="${ann.color}" stroke-width="${ann.strokeWidth}"/><text x="${ann.x + 4}" y="${ann.y + 14}" font-family="Arial, sans-serif" font-size="10" fill="${INK}">${escapeXml(ann.text ?? '')}</text></g>`
}

function renderCallout(ann: BoardAnnotation): string {
  const pts = ann.points
  if (!pts || pts.length < 2) return ''
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const mid = pts[Math.floor(pts.length / 2)]
  return `<g><path d="${d}" fill="none" stroke="${ann.color}" stroke-width="${ann.strokeWidth}"/><circle cx="${pts[0].x}" cy="${pts[0].y}" r="3" fill="${ann.color}"/><text x="${mid.x + 4}" y="${mid.y - 4}" font-family="Arial, sans-serif" font-size="9" fill="${INK}">${escapeXml(ann.text ?? '')}</text></g>`
}

function renderDimension(ann: BoardAnnotation): string {
  const pts = ann.points
  if (!pts || pts.length < 2) return ''
  const [a, b] = pts
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.round(Math.sqrt(dx * dx + dy * dy))
  const midX = (a.x + b.x) / 2
  const midY = (a.y + b.y) / 2
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  return `<g><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${ann.color}" stroke-width="${ann.strokeWidth}" stroke-dasharray="2,2"/><text x="${midX}" y="${midY - 4}" font-family="Arial, sans-serif" font-size="9" fill="${INK}" text-anchor="middle" transform="rotate(${angle},${midX},${midY})">${len}mm</text><circle cx="${a.x}" cy="${a.y}" r="2" fill="${ann.color}"/><circle cx="${b.x}" cy="${b.y}" r="2" fill="${ann.color}"/></g>`
}

function renderFreehand(ann: BoardAnnotation): string {
  const pts = ann.points
  if (!pts || pts.length < 2) return ''
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  return `<path d="${d}" fill="none" stroke="${ann.color}" stroke-width="${ann.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
}

export function renderSnapshotImage(ref: BoardSnapshotRef, cell: BoardCell): string {
  const margin = 10
  const imgW = cell.w - margin * 2
  const imgH = cell.h - margin * 2
  const scale = Math.min(imgW / (ref.width || 1), imgH / (ref.height || 1)) * 0.85
  const ox = (cell.w - ref.width * scale) / 2
  const oy = (cell.h - ref.height * scale) / 2
  return `<image href="${ref.dataUrl}" x="${cell.x + ox}" y="${cell.y + oy}" width="${ref.width * scale}" height="${ref.height * scale}" preserveAspectRatio="xMidYMid meet"/>`
}

export function renderTitleBlock(cells: BoardCell[], sheetW: number): string {
  const title = cells.find((c) => c.type === 'title-block')
  if (!title) return ''
  const y = 10
  return `<g><rect x="${MARGIN}" y="${y}" width="${sheetW - MARGIN * 2}" height="${TITLE_H - 10}" fill="${PAPER}" stroke="${INK}" stroke-width="${CAD_THIN}"/><text x="${sheetW / 2}" y="${y + 24}" font-family="Arial, sans-serif" font-size="16" fill="${INK}" text-anchor="middle" font-weight="bold">PRESENTATION BOARD</text><text x="${sheetW / 2}" y="${y + 44}" font-family="Arial, sans-serif" font-size="11" fill="${INK}" text-anchor="middle">Project: {projectName} | Date: {date} | Scale: Not to scale</text></g>`
}

const MARGIN = 40
const TITLE_H = 80

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function composeBoardSvg(ctx: OverlayContext, annotations: BoardAnnotation[], snapshots: BoardSnapshotRef[]): string {
  let svg = renderBoardBackground(ctx.sheetW, ctx.sheetH)
  for (const cell of ctx.cells) {
    svg += renderCellFrame(cell)
    svg += renderCellLabel(cell)
    const snap = snapshots.find((s) => s.id === cell.contentId)
    if (snap && cell.type === 'snapshot') {
      svg += renderSnapshotImage(snap, cell)
    }
  }
  svg += renderTitleBlock(ctx.cells, ctx.sheetW)
  for (const ann of annotations) {
    svg += renderAnnotationSvg(ann)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ctx.sheetW} ${ctx.sheetH}" width="${ctx.sheetW}mm" height="${ctx.sheetH}mm">${svg}</svg>`
}
