import { describe, it, expect } from 'vitest'
import { buildAnalysisFromDesignOption } from '@/adapters/designToAnalysis'
import type { DesignOption } from '@/domain/boq'

function makeDesign(overrides: Partial<DesignOption> = {}): DesignOption {
  return {
    id: 'test-1',
    name: overrides.name ?? 'Standard House',
    grossFloorArea: overrides.grossFloorArea ?? 150,
    floors: overrides.floors ?? 1,
    buildingType: 'house',
    elements: overrides.elements ?? [],
  }
}

describe('designToAnalysis', () => {
  it('no design returns safe null/empty result', () => {
    const r = buildAnalysisFromDesignOption(null)
    expect(r.bim).toBeNull()
    expect(r.cad).toBeNull()
    expect(r.clashes).toBeNull()
    expect(r.solar).toBeNull()
    expect(r.mep).toBeNull()
  })

  it('residential design returns BIM model', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const r = buildAnalysisFromDesignOption(design)
    expect(r.bim).not.toBeNull()
    expect(r.bim!.elements.length).toBeGreaterThan(0)
  })

  it('solar result has window area > 0 when windows present', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const r = buildAnalysisFromDesignOption(design)
    expect(r.solar).not.toBeNull()
    expect(r.solar!.totalWindowArea).toBeGreaterThan(0)
  })

  it('solar result includes cardinal metrics', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const r = buildAnalysisFromDesignOption(design)
    expect(r.solar!.cardinalMetrics.length).toBe(4)
    const west = r.solar!.cardinalMetrics.find((m) => m.orientation === 'West')
    expect(west).toBeDefined()
  })

  it('MEP result has electrical/lighting/plumbing points', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const r = buildAnalysisFromDesignOption(design)
    expect(r.mep).not.toBeNull()
    expect(r.mep!.totalElecPoints).toBeGreaterThan(0)
    expect(r.mep!.totalLightPoints).toBeGreaterThan(0)
    expect(r.mep!.totalMepCostUsd).toBeGreaterThan(0)
  })

  it('clash detection runs without throwing', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const r = buildAnalysisFromDesignOption(design)
    expect(r.clashes).not.toBeNull()
    expect(Array.isArray(r.clashes!.clashes)).toBe(true)
  })

  it('cad document has walls and openings', () => {
    const design = makeDesign({ name: '3 Bedroom House', grossFloorArea: 150 })
    const r = buildAnalysisFromDesignOption(design)
    expect(r.cad).not.toBeNull()
    expect(r.cad!.walls.length).toBeGreaterThan(0)
    expect(r.cad!.openings.length).toBeGreaterThan(0)
  })

  it('no thrown errors', () => {
    const designs = [
      null,
      makeDesign({ name: 'Small', grossFloorArea: 30 }),
      makeDesign({ name: 'Clinic', grossFloorArea: 300 }),
      makeDesign({ name: 'Duplex', grossFloorArea: 240, floors: 2 }),
    ]
    for (const d of designs) {
      expect(() => buildAnalysisFromDesignOption(d)).not.toThrow()
    }
  })
})
