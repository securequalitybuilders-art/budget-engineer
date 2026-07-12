export type PlotType = 'color' | 'monochrome' | 'grayscale'

export type PlotStyle = 'solid' | 'screened-50' | 'screened-30' | 'dashed'

export type LineWeight = 0.13 | 0.18 | 0.25 | 0.35 | 0.50 | 0.70 | 1.00

export interface PenAssignment {
  layerCode: string
  lineWeight: LineWeight
  color: string
  plotStyle: PlotStyle
}

const PEN_TABLE: PenAssignment[] = [
  // ── Structure ──
  { layerCode: 'S-COLS', lineWeight: 0.50, color: '#4a5568', plotStyle: 'solid' },
  { layerCode: 'S-BEAM', lineWeight: 0.50, color: '#4a5568', plotStyle: 'solid' },
  { layerCode: 'S-FOOT', lineWeight: 0.35, color: '#4a5568', plotStyle: 'solid' },
  { layerCode: 'S-SLAB', lineWeight: 0.35, color: '#718096', plotStyle: 'screened-50' },
  { layerCode: 'S-WALL', lineWeight: 0.50, color: '#4a5568', plotStyle: 'solid' },

  // ── Architecture ──
  { layerCode: 'A-WALL', lineWeight: 0.50, color: '#1a202c', plotStyle: 'solid' },
  { layerCode: 'A-WALL-FULL', lineWeight: 0.50, color: '#1a202c', plotStyle: 'solid' },
  { layerCode: 'A-WALL-PART', lineWeight: 0.35, color: '#4a5568', plotStyle: 'solid' },
  { layerCode: 'A-DOOR', lineWeight: 0.25, color: '#2d3748', plotStyle: 'solid' },
  { layerCode: 'A-DOOR-FULL', lineWeight: 0.25, color: '#2d3748', plotStyle: 'solid' },
  { layerCode: 'A-GLAZ', lineWeight: 0.18, color: '#718096', plotStyle: 'solid' },
  { layerCode: 'A-GLAZ-SILL', lineWeight: 0.18, color: '#718096', plotStyle: 'solid' },
  { layerCode: 'A-FLOR', lineWeight: 0.25, color: '#4a5568', plotStyle: 'solid' },
  { layerCode: 'A-ROOF', lineWeight: 0.35, color: '#4a5568', plotStyle: 'solid' },
  { layerCode: 'A-ROOF-ANNO', lineWeight: 0.18, color: '#718096', plotStyle: 'solid' },
  { layerCode: 'A-FURN', lineWeight: 0.18, color: '#a0aec0', plotStyle: 'solid' },
  { layerCode: 'A-FURN-FIXD', lineWeight: 0.25, color: '#718096', plotStyle: 'solid' },
  { layerCode: 'A-FLOR-PATT', lineWeight: 0.13, color: '#cbd5e0', plotStyle: 'screened-50' },
  { layerCode: 'A-ELEV', lineWeight: 0.35, color: '#1a202c', plotStyle: 'solid' },
  { layerCode: 'A-ELEV-TEXT', lineWeight: 0.18, color: '#4a5568', plotStyle: 'solid' },
  { layerCode: 'A-SECT', lineWeight: 0.70, color: '#e53e3e', plotStyle: 'solid' },

  // ── Existing / Demo ──
  { layerCode: 'A-EXST', lineWeight: 0.25, color: '#718096', plotStyle: 'screened-50' },
  { layerCode: 'A-EXST-DEMO', lineWeight: 0.35, color: '#e53e3e', plotStyle: 'solid' },

  // ── Grid ──
  { layerCode: 'A-GRID', lineWeight: 0.18, color: '#a0aec0', plotStyle: 'solid' },
  { layerCode: 'A-GRID-DIMS', lineWeight: 0.18, color: '#718096', plotStyle: 'solid' },

  // ── Annotations ──
  { layerCode: 'A-ANNO', lineWeight: 0.18, color: '#4a5568', plotStyle: 'solid' },
  { layerCode: 'A-ANNO-DIMS', lineWeight: 0.18, color: '#4a5568', plotStyle: 'solid' },
  { layerCode: 'A-ANNO-TEXT', lineWeight: 0.18, color: '#2d3748', plotStyle: 'solid' },
  { layerCode: 'A-ANNO-LEAD', lineWeight: 0.18, color: '#4a5568', plotStyle: 'solid' },
  { layerCode: 'A-ANNO-SYMB', lineWeight: 0.25, color: '#2d3748', plotStyle: 'solid' },

  // ── Title Block ──
  { layerCode: 'A-TTLB', lineWeight: 0.50, color: '#1a202c', plotStyle: 'solid' },

  // ── Interiors ──
  { layerCode: 'I-WALL', lineWeight: 0.35, color: '#4a5568', plotStyle: 'solid' },
  { layerCode: 'I-FURN', lineWeight: 0.18, color: '#718096', plotStyle: 'solid' },
  { layerCode: 'I-FURN-FIXD', lineWeight: 0.25, color: '#4a5568', plotStyle: 'solid' },
  { layerCode: 'I-FLOR', lineWeight: 0.25, color: '#553c9a', plotStyle: 'solid' },
  { layerCode: 'I-CLNG', lineWeight: 0.18, color: '#718096', plotStyle: 'dashed' },

  // ── Electrical ──
  { layerCode: 'E-POWR', lineWeight: 0.25, color: '#d69e2e', plotStyle: 'solid' },
  { layerCode: 'E-LITE', lineWeight: 0.25, color: '#d69e2e', plotStyle: 'solid' },
  { layerCode: 'E-LITE-ANNO', lineWeight: 0.18, color: '#b7791f', plotStyle: 'solid' },

  // ── Plumbing ──
  { layerCode: 'P-PIPE', lineWeight: 0.25, color: '#2b6cb0', plotStyle: 'solid' },
  { layerCode: 'P-PIPE-HOT', lineWeight: 0.25, color: '#c53030', plotStyle: 'dashed' },
  { layerCode: 'P-PIPE-COLD', lineWeight: 0.25, color: '#2b6cb0', plotStyle: 'solid' },
  { layerCode: 'P-PIPE-SAN', lineWeight: 0.25, color: '#553c9a', plotStyle: 'solid' },
  { layerCode: 'P-FIXT', lineWeight: 0.18, color: '#2b6cb0', plotStyle: 'solid' },

  // ── Mechanical ──
  { layerCode: 'M-HVAC', lineWeight: 0.25, color: '#9b2c2c', plotStyle: 'solid' },
  { layerCode: 'M-HVAC-DUCT', lineWeight: 0.25, color: '#9b2c2c', plotStyle: 'dashed' },
  { layerCode: 'M-HVAC-EQUP', lineWeight: 0.25, color: '#9b2c2c', plotStyle: 'solid' },
]

export function getPenAssignment(layerCode: string): PenAssignment {
  const exact = PEN_TABLE.find((p) => p.layerCode === layerCode)
  if (exact) return exact
  const wild = PEN_TABLE.find((p) => layerCode.startsWith(p.layerCode))
  if (wild) return wild
  return { layerCode, lineWeight: 0.18, color: '#718096', plotStyle: 'solid' }
}

export function getLineWeight(layerCode: string): LineWeight {
  return getPenAssignment(layerCode).lineWeight
}

export function dxfLineWeightCode(lw: LineWeight): number {
  const map: Record<number, number> = { 0.13: 18, 0.18: 25, 0.25: 35, 0.35: 50, 0.50: 70, 0.70: 100, 1.00: 140 }
  return map[lw] ?? 25
}

export function dxfLayerColor(layerCode: string): number {
  const colorMap: Record<string, number> = {
    '#1a202c': 7, '#2d3748': 8, '#4a5568': 8, '#718096': 9,
    '#a0aec0': 8, '#cbd5e0': 9, '#e53e3e': 1, '#d69e2e': 2,
    '#2b6cb0': 5, '#553c9a': 6, '#9b2c2c': 1, '#b7791f': 2,
  }
  const pen = getPenAssignment(layerCode)
  return colorMap[pen.color] ?? 7
}

export { PEN_TABLE }
