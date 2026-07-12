export interface LinetypeDef {
  name: string
  description: string
  pattern: number[]
}

const LINETYPES: LinetypeDef[] = [
  { name: 'CONTINUOUS', description: 'Solid ────', pattern: [] },
  { name: 'DASHED', description: 'Dash ─ ─ ─', pattern: [12, 6] },
  { name: 'HIDDEN', description: 'Hidden ─ ─', pattern: [6, 3] },
  { name: 'CENTER', description: 'Center ─ . ─', pattern: [20, 3, 6, 3] },
  { name: 'PHANTOM', description: 'Phantom ─ . . ─', pattern: [24, 3, 6, 3, 6, 3] },
  { name: 'DOT', description: 'Dotted . . . .', pattern: [3, 3] },
  { name: 'DASHDOT', description: 'Dash-dot ─ . ─', pattern: [12, 3, 3, 3] },
  { name: 'BORDER', description: 'Border ─ . ─ .', pattern: [18, 3, 3, 3, 3, 3] },
  { name: 'DIVIDE', description: 'Divide ─ . . ─', pattern: [18, 3, 3, 3, 3, 3, 3, 3] },
  { name: 'DASHED2', description: 'Dash (2×) ═══', pattern: [24, 12] },
  { name: 'DASHEDX2', description: 'Dash (½) ▬', pattern: [6, 3] },
  { name: 'ZIGZAG', description: 'Zigzag ⚡', pattern: [6, 2, 3, 2] },
]

export function getLinetype(name: string): LinetypeDef {
  return LINETYPES.find((l) => l.name === name) ?? LINETYPES[0]
}

export function linetypeForLayer(layerCode: string): LinetypeDef {
  const map: Record<string, string> = {
    'A-EXST-DEMO': 'DASHED',
    'A-EXST': 'PHANTOM',
    'A-GLAZ': 'CONTINUOUS',
    'A-ROOF': 'PHANTOM',
    'A-FLOR-PATT': 'CONTINUOUS',
    'A-GRID': 'CENTER',
    'A-SECT': 'PHANTOM',
    'S-COLS-EXST': 'PHANTOM',
    'S-SLAB-EXST': 'DASHED',
    'P-PIPE-HOT': 'DASHED',
    'P-PIPE-SAN': 'DASHDOT',
    'P-PIPE-STORM': 'DASHDOT',
    'M-HVAC-DUCT': 'DASHED',
    'I-CLNG': 'DASHED',
    'A-GRID-DIMS': 'CENTER',
  }
  const name = map[layerCode] ?? 'CONTINUOUS'
  return getLinetype(name)
}

export function dxfLinetypeName(layerCode: string): string {
  return linetypeForLayer(layerCode).name
}

export { LINETYPES }
