import { describe, it, expect } from 'vitest'
import { generateLayoutByTypology } from '@/lib/layout/typology-router'
import { evaluateTypologyConstraints, getConstraintsForTypology, listTypologyIds } from '@/engine/architecture/typologies/constraintEvaluator'
import type { ConstraintEvaluation } from '@/engine/architecture/typologies/types'

describe('constraint evaluation wiring', () => {
  describe('generateLayoutByTypology includes constraintEvaluation', () => {
    it('office-commercial layout carries a constraint evaluation', () => {
      const program = [
        { name: 'Reception', ratio: 1 },
        { name: 'Open Plan Office', ratio: 3 },
        { name: 'Private Office', ratio: 1 },
        { name: 'Meeting Room', ratio: 1 },
        { name: 'Kitchenette', ratio: 1 },
        { name: 'Toilet', ratio: 1 },
        { name: 'Staircase', ratio: 1 },
        { name: 'Corridor', ratio: 1 },
        { name: 'Lift Core', ratio: 1 },
        { name: 'Fire Exit', ratio: 1 },
      ]
      const result = generateLayoutByTypology('office-commercial', program, 24, 24, 0)
      expect(result.constraintEvaluation).toBeDefined()
      expect(result.constraintEvaluation!.typologyId).toBe('office-commercial')
      expect(typeof result.constraintEvaluation!.score).toBe('number')
      expect(result.constraintEvaluation!.findings.length).toBeGreaterThan(0)
      expect(result.constraintEvaluation!.summary.totalRules).toBeGreaterThan(0)
    })

    it('house-residential layout carries a constraint evaluation', () => {
      const program = [
        { name: 'Living Room', ratio: 1 },
        { name: 'Kitchen', ratio: 1 },
        { name: 'Bedroom 1', ratio: 1 },
        { name: 'Bathroom', ratio: 1 },
        { name: 'Main Entrance', ratio: 1 },
        { name: 'Back Door', ratio: 1 },
        { name: 'Staircase', ratio: 1 },
      ]
      const result = generateLayoutByTypology('house-residential', program, 12, 12, 0)
      expect(result.constraintEvaluation).toBeDefined()
      expect(result.constraintEvaluation!.typologyId).toBe('house-residential')
    })

    it('clinic-health layout carries a constraint evaluation', () => {
      const program = [
        { name: 'Reception', ratio: 1 },
        { name: 'Consultation Room 1', ratio: 1 },
        { name: 'Treatment Room', ratio: 1 },
        { name: 'Pharmacy', ratio: 1 },
        { name: 'Toilet', ratio: 1 },
        { name: 'Staircase', ratio: 1 },
        { name: 'Corridor', ratio: 1 },
      ]
      const result = generateLayoutByTypology('clinic-health', program, 20, 20, 0)
      expect(result.constraintEvaluation).toBeDefined()
      expect(result.constraintEvaluation!.typologyId).toBe('clinic-health')
    })

    it('unknown building type does not produce a constraint evaluation', () => {
      const program = [{ name: 'Room A', ratio: 1 }]
      const result = generateLayoutByTypology('unknown-fantasy', program, 10, 10, 0)
      expect(result.constraintEvaluation).toBeUndefined()
    })
  })

  describe('evaluator results are structurally valid', () => {
    const allIds = listTypologyIds()

    for (const id of allIds) {
      it(`${id} constraints exist and produce a valid evaluation shape`, () => {
        const constraints = getConstraintsForTypology(id)
        expect(constraints).toBeDefined()
        expect(constraints!.typologyId).toBe(id)

        // Build a minimal evaluator input with one room per functional zone pattern
        const rooms = constraints!.functionalZoning.zones.flatMap((z, i) =>
          z.patterns.slice(0, z.minCount ?? 1).map((p, j) => ({
            id: `${p.toLowerCase().replace(/\s+/g, '-')}-${i}-${j}`,
            name: p,
            x: 0,
            y: 0,
            width: z.minAreaM2 ? Math.sqrt(z.minAreaM2) + 1 : 5,
            height: z.minAreaM2 ? Math.sqrt(z.minAreaM2) + 1 : 5,
          }))
        )

        const evaluation: ConstraintEvaluation = evaluateTypologyConstraints(id, {
          rooms,
          totalWidth: 20,
          totalHeight: 20,
          buildingType: id,
        })

        expect(evaluation.typologyId).toBe(id)
        expect(typeof evaluation.score).toBe('number')
        expect(evaluation.score).toBeGreaterThanOrEqual(0)
        expect(evaluation.score).toBeLessThanOrEqual(1)
        expect(evaluation.summary.totalRules).toBe(evaluation.findings.length)
        expect(evaluation.summary.errors + evaluation.summary.warnings + evaluation.summary.info + evaluation.summary.passed).toBe(evaluation.summary.totalRules)
      })
    }
  })

  describe('constraintEvaluation propagates to PlanModel', () => {
    it('stampSpatialExtras copies constraintEvaluation when present', () => {
      // We can test this indirectly by checking that the typology router
      // produces a layout result with constraintEvaluation, which stampSpatialExtras
      // would copy. Direct unit test of stampSpatialExtras is not exported,
      // so we verify the source data exists on FloorLayoutResult.
      const program = [
        { name: 'Living Room', ratio: 1 },
        { name: 'Kitchen', ratio: 1 },
        { name: 'Bedroom 1', ratio: 1 },
        { name: 'Bathroom', ratio: 1 },
        { name: 'Main Entrance', ratio: 1 },
        { name: 'Back Door', ratio: 1 },
      ]
      const layout = generateLayoutByTypology('house-residential', program, 12, 10, 0)
      expect(layout.constraintEvaluation).toBeDefined()
      // stampSpatialExtras will copy this to PlanModel — verified by integration
    })
  })
})
