export interface HatchPatternDef {
  name: string
  description: string
  angle: number
  spacing: number
  lineType: 'solid' | 'dashed' | 'dot'
  scale: number
}

const HATCH_PATTERNS: HatchPatternDef[] = [
  // ── Masonry / Blockwork ──
  { name: 'AR-BRSTD', description: 'Standard brick — running bond', angle: 0, spacing: 8, lineType: 'solid', scale: 1 },
  { name: 'AR-B88', description: 'Brick — 88 mm course', angle: 0, spacing: 8, lineType: 'solid', scale: 1 },
  { name: 'BRICK', description: 'Brick elevation pattern', angle: 0, spacing: 6, lineType: 'solid', scale: 1 },
  { name: 'CONC', description: 'Concrete / block fill', angle: 45, spacing: 4, lineType: 'dot', scale: 1 },

  // ── Earth / Subgrade ──
  { name: 'EARTH', description: 'Earth / ground hatching', angle: 45, spacing: 6, lineType: 'dashed', scale: 1 },
  { name: 'GRAVEL', description: 'Gravel / hardcore', angle: 0, spacing: 3, lineType: 'dot', scale: 1 },
  { name: 'SAND', description: 'Sand fill pattern', angle: 45, spacing: 3, lineType: 'dot', scale: 0.5 },

  // ── Insulation ──
  { name: 'INSUL', description: 'Thermal insulation', angle: 0, spacing: 4, lineType: 'dashed', scale: 1 },
  { name: 'INSUL-BATT', description: 'Batt insulation', angle: 0, spacing: 3, lineType: 'dashed', scale: 0.5 },

  // ── Finishes ──
  { name: 'TILE', description: 'Floor tile grid', angle: 0, spacing: 6, lineType: 'solid', scale: 1 },
  { name: 'TILE-DIAG', description: 'Diagonal tile', angle: 45, spacing: 6, lineType: 'solid', scale: 1 },
  { name: 'WOOD', description: 'Timber / wood grain', angle: 0, spacing: 2, lineType: 'solid', scale: 0.5 },
  { name: 'PLASTER', description: 'Plaster render', angle: 45, spacing: 2, lineType: 'dot', scale: 0.5 },
  { name: 'CARPET', description: 'Carpet texture', angle: 0, spacing: 5, lineType: 'dot', scale: 1 },

  // ── Roof ──
  { name: 'ROOF', description: 'Roof tile / sheet', angle: 0, spacing: 8, lineType: 'solid', scale: 1 },
  { name: 'ROOF-SLATE', description: 'Slate roof pattern', angle: 0, spacing: 6, lineType: 'solid', scale: 1 },

  // ── Structural ──
  { name: 'STEEL', description: 'Steel section hatch', angle: 45, spacing: 3, lineType: 'solid', scale: 0.5 },
  { name: 'REBAR', description: 'Reinforcement bar', angle: 0, spacing: 2, lineType: 'solid', scale: 0.25 },

  // ── Site ──
  { name: 'SWARD', description: 'Grass / turf', angle: 0, spacing: 4, lineType: 'dashed', scale: 0.5 },
  { name: 'TREE-CROWN', description: 'Tree canopy', angle: 0, spacing: 6, lineType: 'dot', scale: 1 },
]

export function getHatchPattern(name: string): HatchPatternDef {
  return HATCH_PATTERNS.find((h) => h.name === name) ?? HATCH_PATTERNS[0]
}

export function hatchPatternForMaterial(material: string): HatchPatternDef {
  const map: Record<string, string> = {
    'concrete': 'CONC',
    'brick': 'AR-BRSTD',
    'block': 'CONC',
    'timber': 'WOOD',
    'steel': 'STEEL',
    'earth': 'EARTH',
    'gravel': 'GRAVEL',
    'sand': 'SAND',
    'tile': 'TILE',
    'carpet': 'CARPET',
    'plaster': 'PLASTER',
    'insulation': 'INSUL',
    'roof': 'ROOF',
    'grass': 'SWARD',
    'soil': 'EARTH',
    'stone': 'CONC',
    'glass': 'STEEL',
  }
  const key = material.toLowerCase()
  for (const [kw, name] of Object.entries(map)) {
    if (key.includes(kw)) return getHatchPattern(name)
  }
  return getHatchPattern('CONC')
}

export function svgHatchPattern(pattern: HatchPatternDef): string {
  const angleRad = (pattern.angle * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const s = pattern.spacing * pattern.scale

  if (pattern.lineType === 'dot') {
    return `<pattern id="hatch-${pattern.name}" width="${s}" height="${s}" patternUnits="userSpaceOnUse">
      <circle cx="${s/2}" cy="${s/2}" r="0.5" fill="#718096" opacity="0.4"/>
    </pattern>`
  }

  return `<pattern id="hatch-${pattern.name}" width="${s}" height="${s}" patternUnits="userSpaceOnUse" patternTransform="rotate(${pattern.angle})">
    <line x1="0" y1="0" x2="${s}" y2="0" stroke="#718096" stroke-width="0.3" opacity="0.4"
      ${pattern.lineType === 'dashed' ? 'stroke-dasharray="2,2"' : ''}/>
  </pattern>`
}

export { HATCH_PATTERNS }
