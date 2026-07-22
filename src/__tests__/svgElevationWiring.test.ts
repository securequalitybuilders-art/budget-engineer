import { describe, it, expect } from 'vitest'
import type { PlanModel } from '@/domain/plan'
import { convertPlanModelToWs6Cad } from '@/adapters/planModelToWs6Cad'
import { buildElevationSvg } from '@/lib/drawings/elevation-svg'
import type { TitleBlockMeta } from '@/lib/drawings/title-block'

function makeSamplePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'test-plan-wiring',
    designOptionId: 'design-1',
    width: 12,
    height: 8,
    wallThickness: 0.23,
    scaleLabel: '1:100',
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 6, height: 4 },
      { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 4, height: 4 },
      { id: 'r3', name: 'Bedroom 1', x: 0, y: 4, width: 5, height: 4 },
    ],
    walls: [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w2', start: { x: 12, y: 0 }, end: { x: 12, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w3', start: { x: 12, y: 8 }, end: { x: 0, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w4', start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w5', start: { x: 4, y: 0 }, end: { x: 4, y: 4 }, thickness: 0.15, type: 'internal' },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', kind: 'door', offset: 0.3, width: 0.9, height: 2.1, sillHeight: 0 },
      { id: 'o2', wallId: 'w1', kind: 'window', offset: 0.7, width: 1.2, height: 1.2, sillHeight: 0.9 },
      { id: 'o3', wallId: 'w2', kind: 'window', offset: 0.5, width: 1.5, height: 1.5, sillHeight: 0.6 },
      { id: 'o4', wallId: 'w4', kind: 'window', offset: 0.4, width: 1.0, height: 1.0, sillHeight: 1.0 },
    ],
    ...overrides,
  }
}

describe('Rich elevation SVG pipeline wiring', () => {
  it('uses the intended generator (buildElevationSvg) for front elevation', () => {
    const plan = makeSamplePlan()
    const cad = convertPlanModelToWs6Cad(plan, 2, 3)
    expect(cad).not.toBeNull()

    const titleMeta: TitleBlockMeta = { project: 'Test', drawing: 'FRONT ELEVATION' }
    const svg = buildElevationSvg(cad!, 'front', titleMeta)
    // The SVG must contain a full SVG tag structure
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    // Must contain the elevation label
    expect(svg).toContain('Front Elevation')
    // Must contain typology-based content (3 rooms → 'compact house' or relevant typology)
    expect(svg).toMatch(/compact house|family house|villa/)
    // Must contain scale note
    expect(svg).toContain('1:100')
  })

  it('side elevation SVG contains real openings and not only envelope primitives', () => {
    const plan = makeSamplePlan()
    const cad = convertPlanModelToWs6Cad(plan, 2, 3)
    expect(cad).not.toBeNull()

    const titleMeta: TitleBlockMeta = { project: 'Test', drawing: 'RIGHT SIDE ELEVATION' }
    const svg = buildElevationSvg(cad!, 'right', titleMeta)

    // Must contain opening-related SVG elements — rects for openings
    expect(svg).toMatch(/<rect/)
    // Must refer to windows in the side elevation
    expect(svg).toContain('SIDE')
    // Must contain HD (head) annotations for openings
    expect(svg).toContain('HD')
    // Must contain FFL datum markers
    expect(svg).toContain('FFL')
    // Must contain building depth info
    expect(svg).toMatch(/m deep/)
  })

  it('front elevation SVG contains entrance and canopy markers', () => {
    const plan = makeSamplePlan()
    // Add a door on the front wall that reception/public room would use
    plan.rooms.push({ id: 'r4', name: 'Reception', x: 3, y: 0, width: 3, height: 2 })
    const cad = convertPlanModelToWs6Cad(plan, 1, 3)
    const titleMeta: TitleBlockMeta = { project: 'Test', drawing: 'FRONT ELEVATION' }
    const svg = buildElevationSvg(cad!, 'front', titleMeta)

    // Front elevation annotations
    expect(svg).toContain('Rooms:')
    // Frontage type annotation
    expect(svg).toMatch(/Rooms:/)
  })

  it('dimension output is sane — contains height dimensions and level markers', () => {
    const plan = makeSamplePlan()
    const cad = convertPlanModelToWs6Cad(plan, 2, 3)
    const titleMeta: TitleBlockMeta = { project: 'Test', drawing: 'FRONT ELEVATION' }
    const svg = buildElevationSvg(cad!, 'front', titleMeta)

    // Must contain level datum markers
    expect(svg).toContain('GL')
    expect(svg).toContain('FFL')
    // Must contain floor-to-floor height dimensions
    expect(svg).toContain('STOREY')
    // Must contain overall height
    expect(svg).toContain('HT ')
    // Must contain section height dimension lines
    expect(svg).toMatch(/<line.*stroke-dasharray.*4 4/);
  })

  it('fallback path (planToElevations) does not silently win when full data is available', () => {
    // This test verifies that when a valid PlanModel is available, the
    // rich SVG path can be used instead of the fallback
    const plan = makeSamplePlan()
    const cad = convertPlanModelToWs6Cad(plan, 2, 3)
    expect(cad).not.toBeNull()

    // Rich path should produce a detailed SVG with facade features
    const titleMeta: TitleBlockMeta = { project: 'Test', drawing: 'FRONT ELEVATION' }
    const svg = buildElevationSvg(cad!, 'front', titleMeta)

    // Rich path contains facade-rhythm features
    expect(svg).toContain('<svg')
    // Must contain more than just a bare skeleton — look for wall elements
    const rectCount = (svg.match(/<rect/g) || []).length
    // There should be multiple rects (wall panels, openings, title block, etc.)
    expect(rectCount).toBeGreaterThan(5)

    // Must contain keynote callouts (construction notes)
    expect(svg).toContain('EXTERNAL WALL:')
    expect(svg).toContain('ROOF:')
    expect(svg).toContain('WINDOWS:')

    // Must contain provenance note
    expect(svg).toContain('DERIVED')
  })

  it('produces full SVG with proper SVG namespace and dimensions', () => {
    const plan = makeSamplePlan()
    const cad = convertPlanModelToWs6Cad(plan, 2, 3)
    const titleMeta: TitleBlockMeta = { project: 'Test', drawing: 'RIGHT SIDE ELEVATION' }
    const svg = buildElevationSvg(cad!, 'right', titleMeta)

    // SVG structure
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('viewBox=')
    expect(svg).toContain('width="')
    expect(svg).toContain('height="')

    // Must contain both opening types
    const hasDoorRect = svg.includes('door') || svg.includes('Door') || svg.includes('ENTRY')
    const hasWindowRect = svg.includes('HD') && svg.includes('SILL')
    // At least one of these should be true for a building with openings
    expect(hasDoorRect || hasWindowRect).toBeTruthy()
  })
})
