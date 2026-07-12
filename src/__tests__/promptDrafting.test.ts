import { describe, it, expect } from 'vitest'
import { briefToBuildingGraph } from '@/adapters/canonical/brief-to-building'
import { getPenAssignment, dxfLineWeightCode, dxfLayerColor, getLineWeight } from '@/lib/draft/pen-table'
import { getLinetype, linetypeForLayer, LINETYPES } from '@/lib/draft/linetypes'
import { getHatchPattern, hatchPatternForMaterial, svgHatchPattern, HATCH_PATTERNS } from '@/lib/draft/hatch-patterns'
import { getTextStyle, textStyleForPurpose, svgFontDeclaration, TEXT_STYLES } from '@/lib/draft/text-styles'

// ── Track A: Brief → BuildingGraph ──────────────────────────

describe('briefToBuildingGraph', () => {
  it('creates a BuildingGraph with correct floor count', () => {
    const { graph } = briefToBuildingGraph({
      buildingType: 'house', floors: 2, bedrooms: 3, bathrooms: 2,
    })
    expect(graph.levels).toHaveLength(2)
    expect(graph.levels[1].number).toBe(1)
  })

  it('creates rooms based on bedrooms and bathrooms', () => {
    const { graph } = briefToBuildingGraph({
      buildingType: 'house', floors: 1, bedrooms: 2, bathrooms: 1,
    })
    const programmes = graph.spaces.map((s) => s.programme)
    expect(programmes.filter((p) => p === 'bedroom').length).toBeGreaterThanOrEqual(2)
    expect(programmes.filter((p) => p === 'bathroom').length).toBeGreaterThanOrEqual(1)
    expect(programmes).toContain('living')
    expect(programmes).toContain('kitchen')
  })

  it('adds feature spaces when present', () => {
    const { graph } = briefToBuildingGraph({
      buildingType: 'house', floors: 1, bedrooms: 2, bathrooms: 1,
      features: ['garage', 'study'],
    })
    const names = graph.spaces.map((s) => s.name)
    expect(names).toContain('Garage')
    expect(names).toContain('Study')
  })

  it('estimates area from brief if none provided', () => {
    const { graph } = briefToBuildingGraph({
      buildingType: 'house', floors: 1, bedrooms: 3, bathrooms: 1,
    })
    expect(graph.spaces.reduce((s, r) => s + r.areaM2, 0)).toBeGreaterThan(0)
  })

  it('derives from ParsedBrief-like input', () => {
    const { graph } = briefToBuildingGraph({
      buildingType: 'apartment', floors: 1, bedrooms: 2, bathrooms: 1,
      areaM2: 80, summary: '2 bed apartment',
    })
    expect(graph.meta.name).toBe('2 bed apartment')
    expect(graph.levels).toHaveLength(1)
  })

  it('generates walls for each space', () => {
    const { graph } = briefToBuildingGraph({
      buildingType: 'house', floors: 1, bedrooms: 2, bathrooms: 1,
    })
    expect(graph.walls.length).toBeGreaterThan(0)
    expect(graph.openings.length).toBeGreaterThan(0)
  })

  it('handles single-floor input', () => {
    const { graph } = briefToBuildingGraph({
      buildingType: 'office', floors: 1,
    })
    expect(graph.levels).toHaveLength(1)
    expect(graph.spaces.length).toBeGreaterThanOrEqual(3)
  })

  it('handles empty features gracefully', () => {
    const { graph } = briefToBuildingGraph({
      buildingType: 'house', floors: 1, bedrooms: 1, bathrooms: 1,
    })
    expect(graph.meta).toBeDefined()
    expect(graph.spaces.length).toBeGreaterThan(0)
  })

  it('derivation metadata is prompt-sourced', () => {
    const { derivation } = briefToBuildingGraph({
      buildingType: 'clinic', floors: 1,
    })
    expect(derivation.source).toBe('prompt')
    expect(derivation.confidence).toBeLessThan(1)
    expect(derivation.warnings.length).toBeGreaterThan(0)
  })
})

// ── Track B: Pen Table ──────────────────────────────────────

describe('pen-table', () => {
  it('returns correct line weight for known layer', () => {
    expect(getPenAssignment('A-WALL').lineWeight).toBe(0.50)
    expect(getPenAssignment('A-ANNO-TEXT').lineWeight).toBe(0.18)
    expect(getPenAssignment('S-COLS').lineWeight).toBe(0.50)
  })

  it('falls back to default for unknown layer', () => {
    const pen = getPenAssignment('X-CUSTOM')
    expect(pen.lineWeight).toBe(0.18)
  })

  it('dxfLineWeightCode maps correctly', () => {
    expect(dxfLineWeightCode(0.13)).toBe(18)
    expect(dxfLineWeightCode(0.50)).toBe(70)
    expect(dxfLineWeightCode(1.00)).toBe(140)
  })

  it('dxfLayerColor returns DXF color index', () => {
    const idx = dxfLayerColor('A-WALL')
    expect(typeof idx).toBe('number')
    expect(idx).toBeGreaterThan(0)
  })

  it('getLineWeight convenience returns the weight number', () => {
    expect(getLineWeight('A-DOOR')).toBe(0.25)
  })
})

// ── Track B: Linetypes ──────────────────────────────────────

describe('linetypes', () => {
  it('returns CONTINUOUS by default', () => {
    expect(getLinetype('CONTINUOUS').name).toBe('CONTINUOUS')
  })

  it('returns valid linetype for known layer', () => {
    expect(linetypeForLayer('A-EXST').name).toBe('PHANTOM')
    expect(linetypeForLayer('A-GRID').name).toBe('CENTER')
    expect(linetypeForLayer('A-WALL').name).toBe('CONTINUOUS')
  })

  it('returns CONTINUOUS for unknown layer', () => {
    expect(linetypeForLayer('X-UNKNOWN').name).toBe('CONTINUOUS')
  })

  it('all linetypes have valid patterns', () => {
    for (const lt of LINETYPES) {
      expect(lt.name).toBeTruthy()
      expect(lt.description).toBeTruthy()
      expect(Array.isArray(lt.pattern)).toBe(true)
    }
  })
})

// ── Track B: Hatch Patterns ─────────────────────────────────

describe('hatch-patterns', () => {
  it('returns a default hatch pattern for known material', () => {
    expect(hatchPatternForMaterial('concrete').name).toBe('CONC')
    expect(hatchPatternForMaterial('brick').name).toBe('AR-BRSTD')
    expect(hatchPatternForMaterial('timber').name).toBe('WOOD')
  })

  it('falls back to CONC for unknown material', () => {
    expect(hatchPatternForMaterial('alien').name).toBe('CONC')
  })

  it('generates valid SVG pattern string', () => {
    const pattern = getHatchPattern('CONC')
    const svg = svgHatchPattern(pattern)
    expect(svg).toContain('<pattern')
    expect(svg).toContain('hatch-CONC')
  })

  it('all hatch patterns have valid properties', () => {
    for (const hp of HATCH_PATTERNS) {
      expect(hp.name).toBeTruthy()
      expect(typeof hp.angle).toBe('number')
      expect(hp.spacing).toBeGreaterThan(0)
    }
  })
})

// ── Track B: Text Styles ────────────────────────────────────

describe('text-styles', () => {
  it('returns Standard style by default', () => {
    const style = getTextStyle('Standard')
    expect(style.font).toBe('Arial')
    expect(style.heightMm).toBe(2.5)
  })

  it('returns style for a known purpose', () => {
    expect(textStyleForPurpose('drawing title').name).toBe('Title')
    expect(textStyleForPurpose('dimension strings').name).toBe('Dimension')
  })

  it('generates valid SVG font declaration', () => {
    const style = getTextStyle('Title')
    const svg = svgFontDeclaration(style, '#ff0000')
    expect(svg).toContain('font-family="Arial"')
    expect(svg).toContain('font-size="5mm"')
    expect(svg).toContain('font-weight="bold"')
    expect(svg).toContain('fill="#ff0000"')
  })

  it('all text styles have valid properties', () => {
    for (const ts of TEXT_STYLES) {
      expect(ts.name).toBeTruthy()
      expect(ts.font).toBeTruthy()
      expect(ts.heightMm).toBeGreaterThan(0)
    }
  })
})
