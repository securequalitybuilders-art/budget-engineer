import { describe, it, expect } from 'vitest'
import { deriveBoqFromCadOrDesign } from '@/adapters/cadToDesignSyncAdapter'
import { buildBoqFromDesignOption, buildExportCsv } from '@/adapters/designToBoq'
import { createSampleDesignOption, createSamplePlanModel, createAlternatePlanModel } from './fixtures/cadFixtures'

describe('CAD-edited BOQ export sync', () => {
  const design = createSampleDesignOption()
  const alternateDesign = createSampleDesignOption({ id: 'fixture-design-alt', name: 'Alt House', grossFloorArea: 200, floors: 2 })

  it('returns BOQ with persisted-cad source metadata when PlanModel exists', () => {
    const plan = createSamplePlanModel()
    const boq = deriveBoqFromCadOrDesign({
      plan,
      design,
      source: 'generated-design',
      projectId: 'proj-1',
    })
    expect(boq).not.toBeNull()
    expect(boq!.sourceMetadata).toBeDefined()
    expect(boq!.sourceMetadata!.geometrySource).toBe('persisted-cad')
    expect(boq!.sourceMetadata!.quantitySourceLabel).toBe('Edited CAD / persisted plan')
  })

  it('uses CAD-derived quantities when PlanModel exists', () => {
    const plan = createSamplePlanModel()
    const boqWithPlan = deriveBoqFromCadOrDesign({
      plan,
      design,
      source: 'generated-design',
      projectId: 'proj-1',
    })
    const boqWithoutPlan = deriveBoqFromCadOrDesign({
      plan: null,
      design,
      source: 'generated-design',
      projectId: 'proj-1',
    })
    expect(boqWithPlan).not.toBeNull()
    expect(boqWithoutPlan).not.toBeNull()

    // Provenance is tracked at sourceMetadata level (not item descriptions)
    expect(boqWithPlan!.sourceMetadata!.quantitySourceLabel).toBe('Edited CAD / persisted plan')
    expect(boqWithoutPlan!.sourceMetadata!.quantitySourceLabel).toBe('Generated design geometry')
    expect(boqWithPlan!.sourceMetadata!.geometrySource).toBe('persisted-cad')
    expect(boqWithoutPlan!.sourceMetadata!.geometrySource).toBe('generated-design')
  })

  it('CAD-edited source metadata appears with PlanModel; generated without', () => {
    const plan = createAlternatePlanModel()
    const boqWithPlan = deriveBoqFromCadOrDesign({
      plan,
      design: alternateDesign,
      source: 'generated-design',
      projectId: 'proj-2',
    })
    const boqWithoutPlan = deriveBoqFromCadOrDesign({
      plan: null,
      design: alternateDesign,
      source: 'generated-design',
      projectId: 'proj-2',
    })
    expect(boqWithPlan).not.toBeNull()
    expect(boqWithoutPlan).not.toBeNull()

    // Provenance tracked at metadata level
    expect(boqWithPlan!.sourceMetadata!.geometrySource).toBe('persisted-cad')
    expect(boqWithoutPlan!.sourceMetadata!.geometrySource).toBe('generated-design')

    // Totals differ because CAD overrides change quantities
    expect(boqWithPlan!.summary.grandTotal).not.toBe(boqWithoutPlan!.summary.grandTotal)
  })

  it('fallback with no PlanModel uses generated-design source and labels', () => {
    const boq = deriveBoqFromCadOrDesign({
      plan: null,
      design,
      source: 'generated-design',
      projectId: 'proj-3',
    })
    expect(boq).not.toBeNull()
    expect(boq!.sourceMetadata).toBeDefined()
    expect(boq!.sourceMetadata!.geometrySource).toBe('generated-design')
    expect(boq!.sourceMetadata!.quantitySourceLabel).toBe('Generated design geometry')
    expect(boq!.sourceMetadata!.cadDocumentId).toBeUndefined()
  })

  it('CSV export includes CAD source metadata when derived from PlanModel', () => {
    const plan = createSamplePlanModel()
    const boq = deriveBoqFromCadOrDesign({
      plan,
      design,
      source: 'generated-design',
      projectId: 'proj-4',
    })
    expect(boq).not.toBeNull()

    const csv = buildExportCsv(boq!, 'Zimbabwe', boq!.quantities, boq!.sourceMetadata)
    expect(csv).toContain('Geometry source: persisted-cad')
    expect(csv).toContain('Quantity source: Edited CAD / persisted plan')
  })

  it('CSV export includes generated source metadata when no PlanModel', () => {
    const boq = deriveBoqFromCadOrDesign({
      plan: null,
      design,
      source: 'generated-design',
      projectId: 'proj-5',
    })
    expect(boq).not.toBeNull()

    const csv = buildExportCsv(boq!, 'Zimbabwe', boq!.quantities, boq!.sourceMetadata)
    expect(csv).toContain('Geometry source: generated-design')
    expect(csv).toContain('Quantity source: Generated design geometry')
  })

  it('buildBoqFromDesignOption accepts cadQuantities override through public function', () => {
    const cadQty = {
      floors: 1,
      externalWallLength: 44,
      internalWallLength: 10,
      externalWallArea: 132,
      internalWallArea: 30,
      doorCount: 3,
      windowCount: 4,
      openingArea: 12,
      warnings: [],
    }
    const boq = buildBoqFromDesignOption(design, 'zimbabwe', undefined, cadQty)
    expect(boq).not.toBeNull()

    // Quantities reflect CAD overrides
    const doorItem = boq!.items.find((i) => i.description.includes('Doors'))
    expect(doorItem).toBeDefined()
    expect(doorItem!.quantity).toBe(3)

    const extWallItem = boq!.items.find((i) => i.description.includes('External walls'))
    expect(extWallItem).toBeDefined()
    expect(extWallItem!.quantity).toBeCloseTo(132, 0)

    // sourceMetadata is absent when not passed; provenance tracked at metadata level
    expect(boq!.sourceMetadata).toBeUndefined()
  })

  it('fallback with no DesignOption returns null', () => {
    const boq = deriveBoqFromCadOrDesign({
      plan: createSamplePlanModel(),
      design: null,
      source: 'generated-design',
    })
    expect(boq).toBeNull()
  })
})
