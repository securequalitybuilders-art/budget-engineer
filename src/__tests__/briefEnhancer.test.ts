import { describe, it, expect } from 'vitest'
import { enhanceBrief } from '@/engine/tier1/briefEnhancer'
import type { Tier1ParsedBrief } from '@/engine/tier1-types'

function makeBrief(text: string, programNames: string[] = []): Tier1ParsedBrief {
  return {
    rawText: text,
    typology: null,
    typologyConfidence: 0,
    climateZone: null,
    heritagePattern: null,
    siteInfo: { widthM: null, depthM: null, areaM2: null, aspect: null },
    program: programNames.map((name) => ({ name, count: 1, areaM2: 15 })),
    constraints: { budgetCents: null, budgetUsd: null, timeline: null, materials: [] },
    qualityGate: { passed: true, score: 1, issues: [], recommendations: [] },
  }
}

describe('briefEnhancer', () => {
  describe('enhanceBrief', () => {
    it('returns an EnhancedBrief with empty constraints when no patterns match', () => {
      const brief = makeBrief('Build a simple house')
      const result = enhanceBrief(brief)
      expect(result.spatialConstraints).toEqual([])
    })

    it('detects adjacency constraint: "kitchen next to dining"', () => {
      const brief = makeBrief('kitchen next to dining room', ['Kitchen', 'Dining Room'])
      const result = enhanceBrief(brief)
      const adjs = result.spatialConstraints.filter((c) => c.type === 'adjacency')
      expect(adjs.length).toBeGreaterThanOrEqual(1)
      const adj = adjs[0]
      expect(adj.type).toBe('adjacency')
      if (adj.type === 'adjacency') {
        expect(adj.relation).toBe('adjacent')
        expect(adj.weight).toBe(0.8)
      }
    })

    it('detects adjacency constraint: "lounge adjacent to kitchen"', () => {
      const brief = makeBrief('lounge adjacent to kitchen', ['Lounge', 'Kitchen'])
      const result = enhanceBrief(brief)
      const adjs = result.spatialConstraints.filter((c) => c.type === 'adjacency')
      expect(adjs.length).toBeGreaterThanOrEqual(1)
    })

    it('detects separation constraint: "master bedroom away from lounge"', () => {
      const brief = makeBrief('master bedroom away from lounge', ['Master Bedroom', 'Lounge'])
      const result = enhanceBrief(brief)
      const seps = result.spatialConstraints.filter((c) => c.type === 'separation')
      expect(seps.length).toBeGreaterThanOrEqual(1)
      const sep = seps[0]
      expect(sep.type).toBe('separation')
      if (sep.type === 'separation') {
        expect(sep.minDistanceM).toBeGreaterThan(0)
        expect(sep.weight).toBe(0.7)
      }
    })

    it('detects zone constraint: "living room at the front"', () => {
      const brief = makeBrief('living room at the front', ['Living Room'])
      const result = enhanceBrief(brief)
      const zones = result.spatialConstraints.filter((c) => c.type === 'zone')
      expect(zones.length).toBeGreaterThanOrEqual(1)
      const zone = zones[0]
      expect(zone.type).toBe('zone')
      if (zone.type === 'zone') {
        expect(zone.zone).toBe('front')
        expect(zone.weight).toBe(0.6)
      }
    })

    it('detects area hint: "large kitchen"', () => {
      const brief = makeBrief('large kitchen', ['Kitchen'])
      const result = enhanceBrief(brief)
      const hints = result.spatialConstraints.filter((c) => c.type === 'area-hint')
      expect(hints.length).toBeGreaterThanOrEqual(1)
      const hint = hints[0]
      expect(hint.type).toBe('area-hint')
      if (hint.type === 'area-hint') {
        expect(hint.minAreaM2).toBeGreaterThanOrEqual(20)
        expect(hint.weight).toBe(0.5)
      }
    })

    it('detects multiple spatial constraint types from one brief', () => {
      const text = 'large kitchen next to dining room, master bedroom away from lounge'
      const brief = makeBrief(text, ['Kitchen', 'Dining Room', 'Master Bedroom', 'Lounge'])
      const result = enhanceBrief(brief)
      const types = new Set(result.spatialConstraints.map((c) => c.type))
      expect(types.has('adjacency')).toBe(true)
      expect(types.has('separation')).toBe(true)
      expect(types.has('area-hint')).toBe(true)
    })

    it('normalizes room names via the lookup map', () => {
      const brief = makeBrief('bedroom adjacent to ensuite', ['Bedroom', 'Ensuite'])
      const result = enhanceBrief(brief)
      const adjs = result.spatialConstraints.filter((c) => c.type === 'adjacency')
      expect(adjs.length).toBeGreaterThanOrEqual(1)
    })

    it('handles empty text gracefully', () => {
      const brief = makeBrief('', [])
      const result = enhanceBrief(brief)
      expect(result.spatialConstraints).toEqual([])
    })

    it('handles text with no program names gracefully', () => {
      const brief = makeBrief('kitchen next to dining room', [])
      const result = enhanceBrief(brief)
      expect(result.spatialConstraints).toBeDefined()
    })

    it('preserves original brief fields in the enhanced result', () => {
      const brief = makeBrief('large kitchen', ['Kitchen'])
      const result = enhanceBrief(brief)
      expect(result.rawText).toBe(brief.rawText)
      expect(result.program).toEqual(brief.program)
      expect(result.siteInfo).toEqual(brief.siteInfo)
    })
  })
})
