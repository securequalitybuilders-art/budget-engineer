import { describe, it, expect } from 'vitest'
import {
  buildCadSyncMetadata,
  deriveBimFromCadOrDesign,
  deriveBoqFromCadOrDesign,
  deriveAnalysisFromCadOrDesign,
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

    it('source metadata reflects fallback-generated when no plan', () => {
      const design = createSampleDesignOption()
      const boq = deriveBoqFromCadOrDesign({ plan: null, design, source: 'fallback-generated' })
      expect(boq).not.toBeNull()
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
      expect(analysis.warnings).toEqual([])
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
  })
})
