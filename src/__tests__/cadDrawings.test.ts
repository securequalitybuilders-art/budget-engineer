// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import type { ReactNode } from 'react'
import type { PlanModel } from '@/domain/plan'
import { metresToMm } from '@/components/drawings/cadConstants'
import { MATERIAL_LEGEND, DISCIPLINE_LEGEND } from '@/components/drawings/drawingColors'
import { MaterialHatchDefs, LegendBox } from '@/components/drawings/drawingLegend'
import { DrawingsPanel } from '@/components/drawings/DrawingsPanel'
import { TreeElevation, NorthArrow, ScaleBar, NumberedLegend, PersonSilhouette, CarSilhouette } from '@/components/drawings/entourage'
import { GroundHatchDefs, SoilLayers, GroundLine } from '@/components/drawings/ground'
import { SitePlanView } from '@/components/drawings/SitePlanView'
import { FoundationPlanView } from '@/components/drawings/FoundationPlanView'
import { computeFrontElevation, computeSideElevation, computeSection } from '@/adapters/planToElevations'
import { renderSectionSheet } from '@/components/drawings/sectionModel'
import { RoofPlanView } from '@/components/drawings/RoofPlanView'
import { renderRoofPlan } from '@/components/drawings/roofPlanModel'
import { CeilingPlanView } from '@/components/drawings/CeilingPlanView'
import { renderCeilingPlan } from '@/components/drawings/ceilingPlanModel'
import { ElectricalPlanView } from '@/components/drawings/ElectricalPlanView'
import { PlumbingPlanView } from '@/components/drawings/PlumbingPlanView'
import { HvacPlanView } from '@/components/drawings/HvacPlanView'

function makePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'cad-test-plan',
    designOptionId: 'test',
    width: 10,
    height: 8,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Living', x: 0, y: 0, width: 6, height: 8 },
      { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 4, height: 8 },
    ],
    walls: [
      { id: 'w-bottom', start: { x: 0, y: 8 }, end: { x: 10, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w-top', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w-left', start: { x: 0, y: 0 }, end: { x: 0, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w-right', start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, thickness: 0.23, type: 'external' },
    ],
    openings: [
      { id: 'o1', wallId: 'w-bottom', kind: 'door', offset: 0.5, width: 0.9 },
      { id: 'o2', wallId: 'w-bottom', kind: 'window', offset: 0.2, width: 1.2 },
      { id: 'o3', wallId: 'w-right', kind: 'door', offset: 0.5, width: 0.9 },
    ],
    scaleLabel: '1:100',
    ...overrides,
  }
}

describe('metresToMm', () => {
  it('converts 3.0m to "3000"', () => {
    expect(metresToMm(3)).toBe('3 000')
  })

  it('converts 0m to "0"', () => {
    expect(metresToMm(0)).toBe('0')
  })

  it('converts 1.5m to "1500"', () => {
    expect(metresToMm(1.5)).toBe('1 500')
  })

  it('converts 0.23m to "230"', () => {
    expect(metresToMm(0.23)).toBe('230')
  })
})

describe('CAD Front Elevation drawing', () => {
  it('drawing is not null for valid plan', () => {
    const drawing = computeFrontElevation(makePlan(), 2)
    expect(drawing).not.toBeNull()
  })

  it('drawing contains roof polygon', () => {
    const drawing = computeFrontElevation(makePlan(), 2)!
    expect(drawing.polygons.length).toBeGreaterThanOrEqual(1)
  })

  it('drawing contains opening rects × floors', () => {
    const plan = makePlan()
    const drawing = computeFrontElevation(plan, 3)!
    // w-bottom: door + window = 2 openings × 3 storeys
    expect(drawing.rects.length).toBe(6)
  })

  it('drawing title is FRONT ELEVATION', () => {
    const drawing = computeFrontElevation(makePlan(), 1)!
    expect(drawing.title).toBe('FRONT ELEVATION')
  })

  it('viewBox has valid dimensions', () => {
    const drawing = computeFrontElevation(makePlan(), 2, 3, 1.5)!
    const parts = drawing.viewBox.split(' ').map(Number)
    expect(parts[0]).toBe(0)
    expect(parts[1]).toBe(0)
    expect(parts[2]).toBeGreaterThan(10)
    expect(parts[3]).toBeGreaterThan(7)
  })

  it('no NaN or negative coordinates', () => {
    const drawing = computeFrontElevation(makePlan(), 2)!
    const allCoords = [
      ...drawing.lines.flatMap(l => [l.x1, l.y1, l.x2, l.y2]),
      ...drawing.rects.flatMap(r => [r.x, r.y, r.w, r.h]),
      ...drawing.polygons.flatMap(p => p.points.flatMap(pt => [pt.x, pt.y])),
    ]
    for (const c of allCoords) {
      expect(c).not.toBeNaN()
      expect(c).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('CAD Side Elevation drawing', () => {
  it('drawing is not null for valid plan', () => {
    const drawing = computeSideElevation(makePlan(), 1)
    expect(drawing).not.toBeNull()
  })

  it('drawing title is SIDE ELEVATION', () => {
    const drawing = computeSideElevation(makePlan(), 1)!
    expect(drawing.title).toBe('SIDE ELEVATION')
  })

  it('contains opening rects for side-face openings × floors', () => {
    const plan = makePlan()
    const drawing = computeSideElevation(plan, 2)!
    // w-right has a door (o3) — this is on the side face
    expect(drawing.rects.length).toBe(2) // 2 storeys × 1 opening
  })
})

describe('CAD Section drawing', () => {
  it('drawing is not null for valid plan', () => {
    const drawing = computeSection(makePlan(), 2)
    expect(drawing).not.toBeNull()
  })

  it('drawing title is SECTION A-A', () => {
    const drawing = computeSection(makePlan(), 1)!
    expect(drawing.title).toBe('SECTION A-A')
  })

  it('contains floor slab rects', () => {
    const drawing = computeSection(makePlan(), 2)!
    // floor slabs as rects from computeSection
    expect(drawing.rects.length).toBeGreaterThanOrEqual(1)
  })

  it('contains roof polygon', () => {
    const drawing = computeSection(makePlan(), 1)!
    expect(drawing.polygons.length).toBeGreaterThanOrEqual(1)
  })

  it('contains ground line', () => {
    const drawing = computeSection(makePlan(), 1)!
    const groundLines = drawing.lines.filter(l => l.strokeWidth && l.strokeWidth >= 0.06)
    expect(groundLines.length).toBeGreaterThanOrEqual(1)
  })

  it('has storey label texts', () => {
    const drawing = computeSection(makePlan(), 3)!
    const labels = drawing.texts.filter(t => t.text.startsWith('Fl'))
    expect(labels.length).toBe(3)
  })
})

describe('Fallback safety', () => {
  it('returns null for null plan in front elevation', () => {
    expect(computeFrontElevation(null as unknown as PlanModel, 1)).toBeNull()
  })

  it('returns null for null plan in side elevation', () => {
    expect(computeSideElevation(null as unknown as PlanModel, 1)).toBeNull()
  })

  it('returns null for null plan in section', () => {
    expect(computeSection(null as unknown as PlanModel, 1)).toBeNull()
  })

  it('returns null for zero floors', () => {
    expect(computeFrontElevation(makePlan(), 0)).toBeNull()
    expect(computeSideElevation(makePlan(), 0)).toBeNull()
    expect(computeSection(makePlan(), 0)).toBeNull()
  })

  it('returns null for zero-width plan', () => {
    const plan = makePlan({ width: 0 })
    expect(computeFrontElevation(plan, 1)).toBeNull()
    expect(computeSideElevation(plan, 1)).toBeNull()
    expect(computeSection(plan, 1)).toBeNull()
  })
})

describe('Drawing colour system', () => {
  it('MATERIAL_LEGEND has concrete, brick, earth', () => {
    const keys = MATERIAL_LEGEND.map(e => e.key)
    expect(keys).toContain('concrete')
    expect(keys).toContain('brick')
    expect(keys).toContain('earth')
  })

  it('each MATERIAL_LEGEND entry has a hex color string', () => {
    for (const e of MATERIAL_LEGEND) {
      expect(e.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('DISCIPLINE_LEGEND has structural, electrical, plumbing, hvac', () => {
    const keys = DISCIPLINE_LEGEND.map(e => e.key)
    expect(keys).toContain('structural')
    expect(keys).toContain('electrical')
    expect(keys).toContain('plumbing')
    expect(keys).toContain('hvac')
  })

  it('DISCIPLINE_LEGEND entries have hex color strings', () => {
    for (const e of DISCIPLINE_LEGEND) {
      expect(e.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})

describe('MaterialHatchDefs and LegendBox are valid components', () => {
  it('MaterialHatchDefs is a function', () => {
    expect(typeof MaterialHatchDefs).toBe('function')
  })

  it('LegendBox is a function', () => {
    expect(typeof LegendBox).toBe('function')
  })
})

describe('DrawingsPanel is a valid component', () => {
  it('DrawingsPanel is a function', () => {
    expect(typeof DrawingsPanel).toBe('function')
  })
})

describe('Entourage components', () => {
  it('TreeElevation is a function', () => {
    expect(typeof TreeElevation).toBe('function')
  })

  it('NorthArrow is a function', () => {
    expect(typeof NorthArrow).toBe('function')
  })

  it('ScaleBar is a function', () => {
    expect(typeof ScaleBar).toBe('function')
  })

  it('NumberedLegend is a function', () => {
    expect(typeof NumberedLegend).toBe('function')
  })

  it('PersonSilhouette is a function', () => {
    expect(typeof PersonSilhouette).toBe('function')
  })

  it('CarSilhouette is a function', () => {
    expect(typeof CarSilhouette).toBe('function')
  })
})

describe('Ground components', () => {
  it('GroundHatchDefs is a function', () => {
    expect(typeof GroundHatchDefs).toBe('function')
  })

  it('SoilLayers is a function', () => {
    expect(typeof SoilLayers).toBe('function')
  })

  it('GroundLine is a function', () => {
    expect(typeof GroundLine).toBe('function')
  })
})

describe('SitePlanView', () => {
  it('is a function', () => {
    expect(typeof SitePlanView).toBe('function')
  })
})

describe('FoundationPlanView', () => {
  it('is a function', () => {
    expect(typeof FoundationPlanView).toBe('function')
  })
})

describe('renderSectionSheet', () => {
  it('renders slab bands >= floors+1', () => {
    const drawing = computeSection(makePlan(), 3, 3, 1.5)!
    const plan = makePlan()
    const sheet = renderSectionSheet(drawing, plan, 3, 3, 1.5)!
    const slabCount = sheet.elements ? countByPrefix(sheet.elements, 'slab-') : 0
    expect(slabCount).toBeGreaterThanOrEqual(4)
  })

  it('renders stairs when floors >= 2', () => {
    const drawing = computeSection(makePlan(), 2, 3, 1.5)!
    const sheet = renderSectionSheet(drawing, makePlan(), 2, 3, 1.5)!
    const stairsCount = sheet.elements ? countByPrefix(sheet.elements, 'stairs-') : 0
    expect(stairsCount).toBeGreaterThanOrEqual(1)
  })

  it('renders room labels behind cut', () => {
    const drawing = computeSection(makePlan(), 2, 3, 1.5)!
    const sheet = renderSectionSheet(drawing, makePlan(), 2, 3, 1.5)!
    const labelCount = sheet.elements ? countByPrefix(sheet.elements, 'room-label-') : 0
    expect(labelCount).toBeGreaterThanOrEqual(1)
  })

  it('renders footing poché', () => {
    const drawing = computeSection(makePlan(), 1, 3, 1.5)!
    const sheet = renderSectionSheet(drawing, makePlan(), 1, 3, 1.5)!
    const footingCount = sheet.elements ? countByPrefix(sheet.elements, 'footing-') : 0
    expect(footingCount).toBeGreaterThanOrEqual(1)
  })

  it('renders soil layers', () => {
    const drawing = computeSection(makePlan(), 1, 3, 1.5)!
    const sheet = renderSectionSheet(drawing, makePlan(), 1, 3, 1.5)!
    const soilCount = sheet.elements ? countByPrefix(sheet.elements, 'soil-layers') : 0
    expect(soilCount).toBe(1)
  })

  it('renders entourage trees and person', () => {
    const drawing = computeSection(makePlan(), 2, 3, 1.5)!
    const plan = makePlan()
    const sheet = renderSectionSheet(drawing, plan, 2, 3, 1.5)!
    const treeCount = sheet.elements ? countByPrefix(sheet.elements, 'tree-') : 0
    const personCount = sheet.elements ? countByPrefix(sheet.elements, 'person') : 0
    expect(treeCount).toBeGreaterThanOrEqual(1)
    expect(personCount).toBe(1)
  })

  it('returns null for null drawing', () => {
    const sheet = renderSectionSheet(null, makePlan(), 2, 3, 1.5)
    expect(sheet).toBeNull()
  })

  it('returns null for null plan', () => {
    const drawing = computeSection(makePlan(), 2)!
    const sheet = renderSectionSheet(drawing, null, 2, 3, 1.5)
    expect(sheet).toBeNull()
  })

  it('returns null for zero floors', () => {
    const drawing = computeSection(makePlan(), 1)!
    const sheet = renderSectionSheet(drawing, makePlan(), 0, 3, 1.5)
    expect(sheet).toBeNull()
  })
})

describe('RoofPlanView', () => {
  it('is a function', () => {
    expect(typeof RoofPlanView).toBe('function')
  })

  it('renderRoofPlan returns null for null plan', () => {
    expect(renderRoofPlan(null)).toBeNull()
  })

  it('renderRoofPlan returns null for zero-width plan', () => {
    const plan = makePlan({ width: 0 })
    expect(renderRoofPlan(plan)).toBeNull()
  })

  it('renderRoofPlan contains roof plan title and ridge line', () => {
    const sheet = renderRoofPlan(makePlan())
    expect(sheet).not.toBeNull()
    const ridgeCount = sheet!.elements ? countByPrefix(sheet!.elements, 'ridge') : 0
    expect(ridgeCount).toBe(1)
  })

  it('renderRoofPlan contains eaves outline, gutter, downpipe, and legend', () => {
    const sheet = renderRoofPlan(makePlan())
    expect(sheet).not.toBeNull()
    const eavesCount = sheet!.elements ? countByPrefix(sheet!.elements, 'eaves') : 0
    expect(eavesCount).toBe(1)
    const gutterCount = sheet!.elements ? countByPrefix(sheet!.elements, 'gutter') : 0
    expect(gutterCount).toBe(1)
    const dpCount = sheet!.elements ? countByPrefix(sheet!.elements, 'downpipe-') : 0
    expect(dpCount).toBeGreaterThanOrEqual(1)
    const legendCount = sheet!.elements ? countByPrefix(sheet!.elements, 'legend') : 0
    expect(legendCount).toBe(1)
  })

  it('renderRoofPlan contains NorthArrow and ScaleBar', () => {
    const sheet = renderRoofPlan(makePlan())
    expect(sheet).not.toBeNull()
    const northCount = sheet!.elements ? countByPrefix(sheet!.elements, 'north') : 0
    expect(northCount).toBe(1)
    const scaleCount = sheet!.elements ? countByPrefix(sheet!.elements, 'scale-bar') : 0
    expect(scaleCount).toBe(1)
  })
})

describe('CeilingPlanView', () => {
  it('is a function', () => {
    expect(typeof CeilingPlanView).toBe('function')
  })

  it('renderCeilingPlan returns null for null plan', () => {
    expect(renderCeilingPlan(null)).toBeNull()
  })

  it('renderCeilingPlan returns null for zero-width plan', () => {
    const plan = makePlan({ width: 0 })
    expect(renderCeilingPlan(plan)).toBeNull()
  })

  it('renderCeilingPlan has one light fixture per room', () => {
    const plan = makePlan()
    const sheet = renderCeilingPlan(plan)
    expect(sheet).not.toBeNull()
    const lightCount = sheet!.elements ? countByPrefix(sheet!.elements, 'light-') : 0
    expect(lightCount).toBe(plan.rooms.length)
  })

  it('renderCeilingPlan draws grid lines for rooms >= 2.5 m', () => {
    const plan = makePlan()
    const sheet = renderCeilingPlan(plan)
    expect(sheet).not.toBeNull()
    const gridV = sheet!.elements ? countByPrefix(sheet!.elements, 'grid-v-') : 0
    const gridH = sheet!.elements ? countByPrefix(sheet!.elements, 'grid-h-') : 0
    // makePlan rooms are 6×8, both ≥ 2.5 m — expect at least one grid line per axis
    expect(gridV).toBeGreaterThanOrEqual(1)
    expect(gridH).toBeGreaterThanOrEqual(1)
  })

  it('renderCeilingPlan small rooms get a fixture but no grid', () => {
    const plan = makePlan({ rooms: [{ id: 'tiny', name: 'Store', x: 0, y: 0, width: 1.5, height: 1.5 }] })
    const sheet = renderCeilingPlan(plan)
    expect(sheet).not.toBeNull()
    const lightCount = sheet!.elements ? countByPrefix(sheet!.elements, 'light-') : 0
    expect(lightCount).toBe(1)
    const gridV = sheet!.elements ? countByPrefix(sheet!.elements, 'grid-v-') : 0
    const gridH = sheet!.elements ? countByPrefix(sheet!.elements, 'grid-h-') : 0
    expect(gridV).toBe(0)
    expect(gridH).toBe(0)
  })

  it('renderCeilingPlan renders note when plan has no rooms', () => {
    const plan = makePlan({ rooms: [] })
    const sheet = renderCeilingPlan(plan)
    expect(sheet).not.toBeNull()
    const noRooms = sheet!.elements ? countByPrefix(sheet!.elements, 'no-rooms') : 0
    expect(noRooms).toBe(1)
  })

  it('renderCeilingPlan has legend, NorthArrow, and ScaleBar', () => {
    const sheet = renderCeilingPlan(makePlan())
    expect(sheet).not.toBeNull()
    const legendCount = sheet!.elements ? countByPrefix(sheet!.elements, 'legend') : 0
    expect(legendCount).toBe(1)
    const northCount = sheet!.elements ? countByPrefix(sheet!.elements, 'north') : 0
    expect(northCount).toBe(1)
    const scaleCount = sheet!.elements ? countByPrefix(sheet!.elements, 'scale-bar') : 0
    expect(scaleCount).toBe(1)
  })
})

describe('ElectricalPlanView', () => {
  it('is a function', () => {
    expect(typeof ElectricalPlanView).toBe('function')
  })

  it('renders safe fallback on null plan', () => {
    const { container } = render(React.createElement(ElectricalPlanView, { activePlan: null }))
    expect(container.textContent).toMatch(/unavailable|no .* data/i)
  })

  it('renders title and symbols with a valid plan', () => {
    const { container } = render(React.createElement(ElectricalPlanView, { activePlan: makePlan() }))
    expect(container.textContent).toMatch(/ELECTRICAL LAYOUT/i)
    expect(container.textContent).toMatch(/light|socket|switch|distribution/i)
  })
})

describe('PlumbingPlanView', () => {
  it('is a function', () => {
    expect(typeof PlumbingPlanView).toBe('function')
  })

  it('renders safe fallback on null plan', () => {
    const { container } = render(React.createElement(PlumbingPlanView, { activePlan: null }))
    expect(container.textContent).toMatch(/unavailable|no .* data/i)
  })

  it('renders title and symbols with a valid plan', () => {
    const { container } = render(React.createElement(PlumbingPlanView, { activePlan: makePlan() }))
    expect(container.textContent).toMatch(/PLUMBING/i)
    expect(container.textContent).toMatch(/WC|basin|drain|stack/i)
  })
})

describe('HvacPlanView', () => {
  it('is a function', () => {
    expect(typeof HvacPlanView).toBe('function')
  })

  it('renders safe fallback on null plan', () => {
    const { container } = render(React.createElement(HvacPlanView, { activePlan: null }))
    expect(container.textContent).toMatch(/unavailable|no .* data/i)
  })

  it('renders title and symbols with a valid plan', () => {
    const { container } = render(React.createElement(HvacPlanView, { activePlan: makePlan() }))
    expect(container.textContent).toMatch(/HVAC/i)
    expect(container.textContent).toMatch(/supply|return|FCU/i)
  })
})

interface ReactEl { key?: string | null }
function countByPrefix(elements: ReactNode, prefix: string): number {
  const arr = Array.isArray(elements) ? elements : [elements]
  return arr.filter((el): el is ReactEl => {
    if (el == null || typeof el !== 'object') return false
    const e = el as ReactEl
    return typeof e.key === 'string' && e.key.startsWith(prefix)
  }).length
}
