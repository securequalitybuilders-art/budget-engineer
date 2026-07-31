import { describe, it, expect } from 'vitest'
import { optimize, selectByProfile, selectParetoTop, WEIGHT_PROFILES } from '@/engine/tier3/multiObjectiveOptimizer'
import type { Tier1ParsedBrief } from '@/engine/tier1-types'
import type { DesignOption } from '@/domain/boq'

function makeBrief(overrides?: Partial<Tier1ParsedBrief>): Tier1ParsedBrief {
  return {
    rawText: '3 bedroom house with kitchen and lounge',
    typology: { id: 'house-residential', displayName: 'House', aliases: ['house'], sans10400Class: 'H1', zbcClass: 'Residential', defaultStoreys: 1, defaultProgram: [], minRoomDimensions: {}, notes: '', maxStructuralSpan: 6 },
    typologyConfidence: 0.9,
    climateZone: null,
    heritagePattern: null,
    siteInfo: { widthM: 15, depthM: 20, areaM2: 300, aspect: '0.75' },
    program: [
      { name: 'Living Room', count: 1, areaM2: 25, zone: 'public' },
      { name: 'Kitchen', count: 1, areaM2: 15, zone: 'service', isWetCore: true },
      { name: 'Master Bedroom', count: 1, areaM2: 20, zone: 'private' },
      { name: 'Bedroom', count: 2, areaM2: 15, zone: 'private' },
      { name: 'Bathroom', count: 2, areaM2: 6, zone: 'service', isWetCore: true },
    ],
    constraints: { budgetCents: null, budgetUsd: null, timeline: null, materials: [] },
    qualityGate: { passed: true, score: 1, issues: [], recommendations: [] },
    ...overrides,
  }
}

function makeDesignOption(): DesignOption {
  return {
    id: 'test-design-1',
    name: 'Test House',
    grossFloorArea: 150,
    floors: 1,
    buildingType: 'house',
    elements: [
      { id: 'el-wall', type: 'wall', category: 'superstructure', name: 'Walls', unit: 'm2', quantity: 120 },
    ],
  }
}

describe('multiObjectiveOptimizer', () => {
  describe('optimize', () => {
    it('returns an OptimizerResult with candidates array', async () => {
      const brief = makeBrief()
      const design = makeDesignOption()
      const result = await optimize(brief, design)
      expect(result).toBeDefined()
      expect(Array.isArray(result.candidates)).toBe(true)
    })

    it('generates candidates across multiple topologies', async () => {
      const brief = makeBrief()
      const design = makeDesignOption()
      const result = await optimize(brief, design)
      const topologies = new Set(result.candidates.map((c) => c.topology))
      expect(topologies.size).toBeGreaterThanOrEqual(1)
    })

    it('each candidate has required fields', async () => {
      const brief = makeBrief()
      const design = makeDesignOption()
      const result = await optimize(brief, design)
      for (const c of result.candidates) {
        expect(c.topology).toBeTruthy()
        expect(typeof c.seed).toBe('number')
        expect(c.floorPlan).toBeDefined()
        expect(c.planModel).toBeDefined()
        expect(c.scores).toBeDefined()
        expect(typeof c.scores.efficiency).toBe('number')
        expect(typeof c.scores.wetCoreClustering).toBe('number')
        expect(typeof c.scores.structuralEfficiency).toBe('number')
        expect(typeof c.scores.circulation).toBe('number')
        expect(typeof c.scores.daylightAccess).toBe('number')
      }
    })

    it('scores are within 0-1 range', async () => {
      const brief = makeBrief()
      const design = makeDesignOption()
      const result = await optimize(brief, design)
      for (const c of result.candidates) {
        expect(c.scores.efficiency).toBeGreaterThanOrEqual(0)
        expect(c.scores.efficiency).toBeLessThanOrEqual(1)
        expect(c.scores.wetCoreClustering).toBeGreaterThanOrEqual(0)
        expect(c.scores.wetCoreClustering).toBeLessThanOrEqual(1)
        expect(c.scores.structuralEfficiency).toBeGreaterThanOrEqual(0)
        expect(c.scores.structuralEfficiency).toBeLessThanOrEqual(1)
        expect(c.scores.circulation).toBeGreaterThanOrEqual(0)
        expect(c.scores.circulation).toBeLessThanOrEqual(1)
        expect(c.scores.daylightAccess).toBeGreaterThanOrEqual(0)
        expect(c.scores.daylightAccess).toBeLessThanOrEqual(1)
      }
    })

    it('populates topByProfile for all weight profiles', async () => {
      const brief = makeBrief()
      const design = makeDesignOption()
      const result = await optimize(brief, design)
      for (const profile of WEIGHT_PROFILES) {
        expect(result.topByProfile[profile.id]).toBeDefined()
        expect(result.topByProfile[profile.id].length).toBeGreaterThanOrEqual(1)
      }
    })

    it('generates a paretoFront subset of candidates', async () => {
      const brief = makeBrief()
      const design = makeDesignOption()
      const result = await optimize(brief, design)
      expect(result.paretoFront.length).toBeGreaterThan(0)
      expect(result.paretoFront.length).toBeLessThanOrEqual(result.candidates.length)
    })

    it('each pareto front candidate is also in candidates', async () => {
      const brief = makeBrief()
      const design = makeDesignOption()
      const result = await optimize(brief, design)
      const candidateKeys = new Set(result.candidates.map((c) => `${c.topology}-${c.seed}`))
      for (const pf of result.paretoFront) {
        expect(candidateKeys.has(`${pf.topology}-${pf.seed}`)).toBe(true)
      }
    })
  })

  describe('selectByProfile', () => {
    it('returns top candidates for the given profile', async () => {
      const brief = makeBrief()
      const design = makeDesignOption()
      const result = await optimize(brief, design)
      const top = selectByProfile(result, 'balanced', 2)
      expect(top.length).toBeGreaterThanOrEqual(1)
      expect(top.length).toBeLessThanOrEqual(2)
    })

    it('returns empty array for unknown profile', async () => {
      const brief = makeBrief()
      const design = makeDesignOption()
      const result = await optimize(brief, design)
      const top = selectByProfile(result, 'nonexistent' as never, 3)
      expect(top).toEqual([])
    })

    it('returns candidates in descending score order', async () => {
      const brief = makeBrief()
      const design = makeDesignOption()
      const result = await optimize(brief, design)
      for (const profile of WEIGHT_PROFILES) {
        const top = selectByProfile(result, profile.id, 5)
        for (let i = 1; i < top.length; i++) {
          expect(top[i - 1].scores.overall).toBeGreaterThanOrEqual(top[i].scores.overall - 0.001)
        }
      }
    })
  })

  describe('selectParetoTop', () => {
    it('returns top N from pareto front', async () => {
      const brief = makeBrief()
      const design = makeDesignOption()
      const result = await optimize(brief, design)
      const top = selectParetoTop(result, 2)
      expect(top.length).toBeGreaterThanOrEqual(1)
      expect(top.length).toBeLessThanOrEqual(2)
    })

    it('all returned candidates are from pareto front', async () => {
      const brief = makeBrief()
      const design = makeDesignOption()
      const result = await optimize(brief, design)
      const top = selectParetoTop(result, 10)
      const paretoKeys = new Set(result.paretoFront.map((c) => `${c.topology}-${c.seed}`))
      for (const c of top) {
        expect(paretoKeys.has(`${c.topology}-${c.seed}`)).toBe(true)
      }
    })
  })

  describe('WEIGHT_PROFILES', () => {
    it('has 4 profiles with unique IDs', () => {
      const ids = WEIGHT_PROFILES.map((p) => p.id)
      expect(new Set(ids).size).toBe(4)
      expect(ids).toContain('balanced')
      expect(ids).toContain('cost-effective')
      expect(ids).toContain('comfort')
      expect(ids).toContain('construction-ease')
    })

    it('each profile has weights summing to 1', () => {
      for (const p of WEIGHT_PROFILES) {
        const sum = p.weights.efficiency + p.weights.wetCoreClustering + p.weights.structuralEfficiency + p.weights.circulation + p.weights.daylightAccess
        expect(Math.abs(sum - 1)).toBeLessThan(0.01)
      }
    })
  })
})
