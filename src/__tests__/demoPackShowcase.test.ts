import { describe, it, expect } from 'vitest'
import { DEMO_SCENARIOS, getDemoScenarioBySlug, DEMO_BRIEF_TEXT } from '@/lib/demo/demo-project-pack'

describe('DemoPackShowcase', () => {
  describe('DEMO_SCENARIOS', () => {
    it('has at least one scenario', () => {
      expect(DEMO_SCENARIOS.length).toBeGreaterThanOrEqual(1)
    })

    it('each scenario has required fields', () => {
      for (const scenario of DEMO_SCENARIOS) {
        expect(scenario.slug).toBeTruthy()
        expect(scenario.name).toBeTruthy()
        expect(scenario.description).toBeTruthy()
        expect(scenario.brief).toBeTruthy()
        expect(scenario.capabilities.length).toBeGreaterThan(0)
        expect(['basic', 'intermediate', 'advanced']).toContain(scenario.complexity)
        expect(scenario.buildingType).toBeTruthy()
        expect(scenario.region).toBeTruthy()
        expect(scenario.areaM2).toBeGreaterThan(0)
        expect(scenario.estimatedCostCents).toBeGreaterThan(0)
      }
    })

    it('each scenario has a unique slug', () => {
      const slugs = DEMO_SCENARIOS.map((s) => s.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
    })

    it('each scenario has a unique name', () => {
      const names = DEMO_SCENARIOS.map((s) => s.name)
      expect(new Set(names).size).toBe(names.length)
    })

    it('all capability references are valid', () => {
      const validCapabilities = [
        'brief-to-design',
        'plan-model',
        'cad-drawing',
        'boq-estimation',
        'compliance-checking',
        'validation-tiers',
        '3d-bim-viewer',
      ]
      for (const scenario of DEMO_SCENARIOS) {
        for (const cap of scenario.capabilities) {
          expect(validCapabilities).toContain(cap)
        }
      }
    })

    it('demo-residence scenario brief is derived from DEMO_BRIEF_TEXT', () => {
      const demo = getDemoScenarioBySlug('demo-residence')
      expect(demo).toBeDefined()
      expect(DEMO_BRIEF_TEXT.startsWith(demo!.brief)).toBe(true)
    })

    it('demo-residence has expected capabilities', () => {
      const demo = getDemoScenarioBySlug('demo-residence')
      expect(demo).toBeDefined()
      expect(demo!.capabilities).toContain('brief-to-design')
      expect(demo!.capabilities).toContain('plan-model')
      expect(demo!.capabilities).toContain('cad-drawing')
      expect(demo!.capabilities).toContain('boq-estimation')
      expect(demo!.capabilities).toContain('compliance-checking')
      expect(demo!.capabilities).toContain('validation-tiers')
      expect(demo!.capabilities).toContain('3d-bim-viewer')
    })

    it('getDemoScenarioBySlug returns undefined for unknown slug', () => {
      expect(getDemoScenarioBySlug('non-existent')).toBeUndefined()
    })
  })

  describe('Honest positioning', () => {
    it('no scenario claims compliance certification', () => {
      for (const scenario of DEMO_SCENARIOS) {
        expect(scenario.description.toLowerCase()).not.toContain('certified')
        expect(scenario.description.toLowerCase()).not.toContain('certification')
      }
    })

    it('no scenario claims licensed engineer replacement', () => {
      for (const scenario of DEMO_SCENARIOS) {
        expect(scenario.description.toLowerCase()).not.toContain('licensed')
        expect(scenario.description.toLowerCase()).not.toContain('structural signoff')
        expect(scenario.description.toLowerCase()).not.toContain('architect replacement')
      }
    })

    it('cost estimates are realistic (not zero and not absurdly high)', () => {
      for (const scenario of DEMO_SCENARIOS) {
        expect(scenario.estimatedCostCents).toBeGreaterThan(100_00)
        expect(scenario.estimatedCostCents).toBeLessThan(100_000_000_00)
      }
    })
  })
})
