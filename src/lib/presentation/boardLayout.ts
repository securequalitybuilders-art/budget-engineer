import type { BoardCell, BoardCellType, BoardTemplateId } from '@/domain/presentation'
import { getSheetDimensions } from '@/lib/drawings/sheetSet'
import type { SheetSize } from '@/lib/drawings/sheetSet'

const MARGIN = 40
const GAP = 20
const TITLE_H = 80

interface LayoutCellDef {
  id: string
  label: string
  type: BoardCellType
}

const TEMPLATES: Record<BoardTemplateId, LayoutCellDef[]> = {
  concept: [
    { id: 'hero', label: 'CONCEPT RENDERING', type: 'snapshot' },
    { id: 'mood', label: 'MATERIAL MOOD BOARD', type: 'snapshot' },
    { id: 'sketch', label: 'DESIGN SKETCH', type: 'drawing' },
    { id: 'notes', label: 'DESIGN NOTES', type: 'text' },
    { id: 'legend', label: 'LEGEND', type: 'legend' },
    { id: 'title', label: '', type: 'title-block' },
  ],
  'design-development': [
    { id: 'floor-plan', label: 'FLOOR PLAN', type: 'drawing' },
    { id: 'section', label: 'SECTION', type: 'drawing' },
    { id: 'elevation', label: 'ELEVATION', type: 'drawing' },
    { id: 'detail', label: 'KEY DETAIL', type: 'drawing' },
    { id: 'schedule', label: 'SCHEDULE', type: 'text' },
    { id: 'snapshot-3d', label: '3D VIEW', type: 'snapshot' },
    { id: 'callouts', label: 'CALLOUTS', type: 'text' },
    { id: 'legend', label: 'LEGEND', type: 'legend' },
    { id: 'title', label: '', type: 'title-block' },
  ],
  planning: [
    { id: 'site-plan', label: 'SITE PLAN', type: 'drawing' },
    { id: 'floor-plan', label: 'FLOOR PLAN', type: 'drawing' },
    { id: 'elevations', label: 'ELEVATIONS', type: 'drawing' },
    { id: 'sections', label: 'SECTIONS', type: 'drawing' },
    { id: 'schedule', label: 'SCHEDULE', type: 'text' },
    { id: 'notes', label: 'NOTES', type: 'text' },
    { id: 'legend', label: 'LEGEND', type: 'legend' },
    { id: 'title', label: '', type: 'title-block' },
  ],
}

export function getTemplateDef(id: BoardTemplateId): LayoutCellDef[] {
  return TEMPLATES[id]
}

export function listTemplateIds(): BoardTemplateId[] {
  return Object.keys(TEMPLATES) as BoardTemplateId[]
}

export function getDefaultCells(templateId: BoardTemplateId): BoardCell[] {
  const defs = TEMPLATES[templateId]
  if (!defs) return []
  return defs.map((d) => ({
    id: d.id,
    type: d.type,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    label: d.label,
  }))
}

function computeGridCells(
  defs: LayoutCellDef[],
  sheetW: number,
  sheetH: number,
): BoardCell[] {
  const contentW = sheetW - MARGIN * 2
  const contentH = sheetH - MARGIN * 2 - TITLE_H

  const count = defs.length
  const cols = count <= 4 ? 2 : 3
  const rows = Math.ceil(count / cols)
  const cellW = Math.floor((contentW - GAP * (cols - 1)) / cols)
  const cellH = Math.floor((contentH - GAP * (rows - 1)) / rows)

  return defs.map((d, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    return {
      id: d.id,
      type: d.type,
      x: MARGIN + col * (cellW + GAP),
      y: MARGIN + row * (cellH + GAP) + TITLE_H,
      w: d.type === 'title-block' ? sheetW - MARGIN * 2 : cellW,
      h: d.type === 'title-block' ? TITLE_H : cellH,
      label: d.label,
    }
  })
}

export function computeBoardLayout(
  templateId: BoardTemplateId,
  sheetSize: SheetSize = 'A1',
  landscape = true,
): { cells: BoardCell[]; sheetW: number; sheetH: number } {
  const defs = TEMPLATES[templateId]
  if (!defs) return { cells: [], sheetW: 0, sheetH: 0 }
  const dim = getSheetDimensions(sheetSize, landscape)
  const sheetW = dim.widthMm
  const sheetH = dim.heightMm
  const cells = computeGridCells(defs, sheetW, sheetH)
  return { cells, sheetW, sheetH }
}

export function scaleCellContent(
  cellW: number,
  cellH: number,
  contentW: number,
  contentH: number,
): { scale: number; offsetX: number; offsetY: number } {
  const margin = 10
  const availW = cellW - margin * 2
  const availH = cellH - margin * 2
  const scale = Math.min(availW / (contentW || 1), availH / (contentH || 1)) * 0.9
  const offsetX = (cellW - contentW * scale) / 2
  const offsetY = (cellH - contentH * scale) / 2
  return { scale: Math.min(scale, 1), offsetX, offsetY }
}
