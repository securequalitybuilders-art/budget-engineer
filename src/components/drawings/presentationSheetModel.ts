export interface CellRect {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
}

export interface PresentationLayout {
  sheetW: number
  sheetH: number
  cells: CellRect[]
}

const MARGIN = 40
const GAP = 20
const TITLE_H = 80
const SHEET_W = 1682
const SHEET_H = 1188

const CELL_IDS = [
  { id: 'front-elevation', label: 'FRONT ELEVATION' },
  { id: 'side-elevation', label: 'SIDE ELEVATION' },
  { id: 'section', label: 'SECTION A-A' },
  { id: 'floor-plan', label: 'FLOOR PLAN' },
  { id: 'site-plan', label: 'SITE PLAN' },
  { id: 'foundation', label: 'FOUNDATION PLAN' },
  { id: 'roof-plan', label: 'ROOF PLAN' },
  { id: 'rcp', label: 'REFLECTED CEILING PLAN' },
  { id: 'mep-overview', label: 'ELECTRICAL / PLUMBING / HVAC' },
]

export function computePresentationLayout(): PresentationLayout {
  const cols = 3
  const rows = Math.ceil(CELL_IDS.length / cols)

  const availW = SHEET_W - MARGIN * 2 - GAP * (cols - 1)
  const availH = SHEET_H - MARGIN * 2 - TITLE_H - GAP * (rows - 1)
  const cellW = Math.floor(availW / cols)
  const cellH = Math.floor(availH / rows)

  const cells: CellRect[] = CELL_IDS.map((item, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    return {
      id: item.id,
      label: item.label,
      x: MARGIN + col * (cellW + GAP),
      y: MARGIN + row * (cellH + GAP),
      w: cellW,
      h: cellH,
    }
  })

  return { sheetW: SHEET_W, sheetH: SHEET_H, cells }
}
