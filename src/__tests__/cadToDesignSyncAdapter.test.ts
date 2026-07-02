import { describe, it, expect } from 'vitest'
import {
  buildCadSyncMetadata,
  deriveBimFromCadOrDesign,
  deriveBoqFromCadOrDesign,
  deriveAnalysisFromCadOrDesign,
  deriveCadFromPlan,
} from '@/adapters/cadToDesignSyncAdapter'
import { createSampleDesignOption, createSamplePlanModel } from './fixtures/cadFixtures'

describe('cadToDesignSyncAdapter', () => {
  describe('buildCadSyncMetadata', () => {
    it('returns generated-design when no saved plan exists and no edits', () => {
      const meta = buildCadSyncMetadata(false, false)
      expect(meta.source).toBe('generated-design')
      expect(meta.hasSavedPlan).toBe(false)
      expect(meta.hasCadEdits).toBe(false)
    })

    it('returns generated-design when saved plan matches generated', () => {
      const meta = buildCadSyncMetadata(true, true)
      expect(meta.source).toBe('generated-design')
      expect(meta.hasSavedPlan).toBe(true)
      expect(meta.hasCadEdits).toBe(false)
    })

    it('returns persisted-cad when saved plan diverges from generated', () => {
      const meta = buildCadSyncMetadata(true, false)
      expect(meta.source).toBe('persisted-cad')
      expect(meta.hasSavedPlan).toBe(true)
      expect(meta.hasCadEdits).toBe(true)
    })
  })

  describe('deriveBimFromCadOrDesign', () => {
    it('returns BIM model from design fallback when cad is null', () => {
      const design = createSampleDesignOption()
      const bim = deriveBimFromCadOrDesign({ plan: null, design, source: 'generated-design' })
      expect(bim).not.toBeNull()
      expect(bim!.name).toBe(design.name)
      expect(bim!.elements.length).toBeGreaterThan(0)
    })

    it('returns BIM model from design fallback when cad is provided but source is generated-design', () => {
      const design = createSampleDesignOption()
      const plan = createSamplePlanModel()
      const bim = deriveBimFromCadOrDesign({ plan, design, source: 'generated-design' })
      expect(bim).not.toBeNull()
      expect(bim!.name).toBe(design.name)
    })

    it('returns null when design is null', () => {
      const bim = deriveBimFromCadOrDesign({ plan: null, design: null, source: 'generated-design' })
      expect(bim).toBeNull()
    })

    it('returns null when design has zero GFA', () => {
      const design = createSampleDesignOption({ grossFloorArea: 0 })
      const bim = deriveBimFromCadOrDesign({ plan: null, design, source: 'generated-design' })
      expect(bim).toBeNull()
    })
  })

  describe('deriveBoqFromCadOrDesign', () => {
    it('returns BOQ with grand total > 0 from design fallback when cad is null', () => {
      const design = createSampleDesignOption()
      const boq = deriveBoqFromCadOrDesign({ plan: null, design, source: 'generated-design' })
      expect(boq).not.toBeNull()
      expect(boq!.summary.grandTotal).toBeGreaterThan(0)
      expect(boq!.items.length).toBeGreaterThan(0)
    })

    it('returns BOQ from design fallback when cad is provided', () => {
      const design = createSampleDesignOption()
      const plan = createSamplePlanModel()
      const boq = deriveBoqFromCadOrDesign({ plan, design, source: 'persisted-cad' })
      expect(boq).not.toBeNull()
      expect(boq!.summary.grandTotal).toBeGreaterThan(0)
    })

    it('returns null when design is null', () => {
      const boq = deriveBoqFromCadOrDesign({ plan: null, design: null, source: 'generated-design' })
      expect(boq).toBeNull()
    })

    it('respects region parameter in BOQ call', () => {
      const design = createSampleDesignOption()
      const zwBoq = deriveBoqFromCadOrDesign({ plan: null, design, region: 'zimbabwe', source: 'generated-design' })
      const saBoq = deriveBoqFromCadOrDesign({ plan: null, design, region: 'southafrica', source: 'generated-design' })
      expect(zwBoq).not.toBeNull()
      expect(saBoq).not.toBeNull()
      expect(zwBoq!.currency).toBe('USD')
      expect(saBoq!.currency).toBe('ZAR')
    })

    it('no NaN values in returned BOQ totals', () => {
      const design = createSampleDesignOption()
      const boq = deriveBoqFromCadOrDesign({ plan: null, design, source: 'generated-design' })
      expect(boq).not.toBeNull()
      const nums = [
        boq!.summary.subtotal,
        boq!.summary.contingency,
        boq!.summary.professionalFees,
        boq!.summary.vat,
        boq!.summary.grandTotal,
        ...boq!.items.flatMap((item) => [item.quantity, item.rate, item.total]),
      ]
      for (const n of nums) {
        expect(Number.isNaN(n)).toBe(false)
      }
    })

    it('source metadata reflects generated-design when no plan', () => {
      const design = createSampleDesignOption()
      const boq = deriveBoqFromCadOrDesign({ plan: null, design, source: 'generated-design' })
      expect(boq).not.toBeNull()
      expect(boq!.sourceMetadata).toBeDefined()
      expect(boq!.sourceMetadata!.geometrySource).toBe('generated-design')
      expect(boq!.sourceMetadata!.quantitySourceLabel).toBe('Generated design geometry')
    })

    it('source metadata reflects persisted-cad when plan available', () => {
      const design = createSampleDesignOption()
      const plan = createSamplePlanModel()
      const boq = deriveBoqFromCadOrDesign({ plan, design, source: 'persisted-cad' })
      expect(boq).not.toBeNull()
      expect(boq!.sourceMetadata).toBeDefined()
      expect(boq!.sourceMetadata!.geometrySource).toBe('persisted-cad')
      expect(boq!.sourceMetadata!.quantitySourceLabel).toBe('Edited CAD / persisted plan')
    })

    it('source metadata includes computedAt timestamp', () => {
      const design = createSampleDesignOption()
      const boq = deriveBoqFromCadOrDesign({ plan: null, design, source: 'generated-design' })
      expect(boq!.sourceMetadata!.computedAt).toBeTruthy()
      expect(() => new Date(boq!.sourceMetadata!.computedAt)).not.toThrow()
    })

    it('BOQ labels updated to edited CAD when plan available', () => {
      const design = createSampleDesignOption()
      const plan = createSamplePlanModel()
      const boq = deriveBoqFromCadOrDesign({ plan, design, source: 'persisted-cad' })
      expect(boq).not.toBeNull()
      const assumptionsJoined = boq!.assumptions.map((a) => a.label).join(' ')
      expect(assumptionsJoined).toContain('edited CAD')
      const itemsJoined = boq!.items.map((i) => i.description).join(' ')
      expect(itemsJoined).toContain('edited CAD')
    })
  })

  describe('deriveAnalysisFromCadOrDesign', () => {
    it('returns safe analysis from design fallback when cad is null', () => {
      const design = createSampleDesignOption()
      const analysis = deriveAnalysisFromCadOrDesign({ plan: null, design, source: 'generated-design' })
      expect(analysis.cad).not.toBeNull()
      expect(analysis.bim).not.toBeNull()
      expect(analysis.clashes).not.toBeNull()
      expect(analysis.solar).not.toBeNull()
      expect(analysis.mep).not.toBeNull()
      expect(analysis.warnings).toContain('Using generated-design fallback for CAD geometry')
    })

    it('returns analysis from design fallback when cad is provided', () => {
      const design = createSampleDesignOption()
      const plan = createSamplePlanModel()
      const analysis = deriveAnalysisFromCadOrDesign({ plan, design, source: 'persisted-cad' })
      expect(analysis.cad).not.toBeNull()
      expect(analysis.warnings).toEqual([])
    })

    it('returns empty analysis when design is null', () => {
      const analysis = deriveAnalysisFromCadOrDesign({ plan: null, design: null, source: 'generated-design' })
      expect(analysis.bim).toBeNull()
      expect(analysis.cad).toBeNull()
      expect(analysis.clashes).toBeNull()
      expect(analysis.solar).toBeNull()
      expect(analysis.mep).toBeNull()
    })

    it('passing minimal persisted CAD does not crash', () => {
      const design = createSampleDesignOption()
      const plan = createSamplePlanModel()
      const analysis = deriveAnalysisFromCadOrDesign({ plan, design, source: 'persisted-cad' })
      expect(analysis).toBeDefined()
    })

    it('persisted PlanModel path is preferred over generated design when valid', () => {
      const design = createSampleDesignOption()
      const plan = createSamplePlanModel()
      const noPlanAnalysis = deriveAnalysisFromCadOrDesign({ plan: null, design, source: 'generated-design' })
      const withPlanAnalysis = deriveAnalysisFromCadOrDesign({ plan, design, source: 'persisted-cad' })
      expect(withPlanAnalysis.cad).not.toBeNull()
      expect(withPlanAnalysis.cad!.walls.length).toBe(plan.walls.length)
      expect(withPlanAnalysis.cad!.walls[0].id).toBe(plan.walls[0].id)
      expect(noPlanAnalysis.cad!.walls.length).toBeGreaterThan(0)
    })

    it('invalid PlanModel falls back to generated design', () => {
      const design = createSampleDesignOption()
      const emptyPlan = createSamplePlanModel({ walls: [], rooms: [], openings: [] })
      const analysis = deriveAnalysisFromCadOrDesign({ plan: emptyPlan, design, source: 'persisted-cad' })
      expect(analysis.cad).not.toBeNull()
      expect(analysis.bim).not.toBeNull()
      expect(analysis.warnings.some((w) => w.includes('no walls'))).toBe(true)
      expect(analysis.warnings.some((w) => w.includes('Using generated-design fallback'))).toBe(true)
    })

    it('source metadata reflects persisted-cad path', () => {
      const design = createSampleDesignOption()
      const plan = createSamplePlanModel()
      const analysis = deriveAnalysisFromCadOrDesign({ plan, design, source: 'persisted-cad' })
      expect(analysis.cad).not.toBeNull()
    })

    it('BOQ still positive when plan available', () => {
      const design = createSampleDesignOption()
      const plan = createSamplePlanModel()
      const boq = deriveBoqFromCadOrDesign({ plan, design, source: 'persisted-cad' })
      expect(boq).not.toBeNull()
      expect(boq!.summary.grandTotal).toBeGreaterThan(0)
    })

    it('analysis safe when plan available', () => {
      const design = createSampleDesignOption()
      const plan = createSamplePlanModel()
      const analysis = deriveAnalysisFromCadOrDesign({ plan, design, source: 'persisted-cad' })
      expect(analysis).toBeDefined()
      expect(typeof analysis.bim).toBe(typeof {})
      expect(typeof analysis.clashes).not.toBe('undefined')
    })

    it('no NaN when plan available', () => {
      const design = createSampleDesignOption()
      const plan = createSamplePlanModel()
      const analysis = deriveAnalysisFromCadOrDesign({ plan, design, source: 'persisted-cad' })
      expect(analysis.cad).not.toBeNull()
      const allNums: number[] = []
      for (const w of analysis.cad!.walls) {
        allNums.push(w.start.x, w.start.y, w.end.x, w.end.y, w.thickness)
      }
      for (const o of analysis.cad!.openings) {
        allNums.push(o.offsetRatio, o.width)
      }
      for (const n of allNums) {
        expect(Number.isNaN(n)).toBe(false)
      }
    })
  })

  describe('deriveCadFromPlan', () => {
    it('returns CadDocument when valid PlanModel provided', () => {
      const plan = createSamplePlanModel()
      const cad = deriveCadFromPlan(plan, 'design-1')
      expect(cad).not.toBeNull()
      expect(cad!.walls.length).toBe(plan.walls.length)
      expect(cad!.openings.length).toBe(plan.openings.length)
    })

    it('returns null when PlanModel is null', () => {
      const cad = deriveCadFromPlan(null, 'design-1')
      expect(cad).toBeNull()
    })

    it('returns null when PlanModel has no walls', () => {
      const plan = createSamplePlanModel({ walls: [], rooms: [], openings: [] })
      const cad = deriveCadFromPlan(plan, 'design-1')
      expect(cad).toBeNull()
    })
  })
})
