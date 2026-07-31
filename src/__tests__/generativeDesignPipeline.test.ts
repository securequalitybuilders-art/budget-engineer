import { describe, it, expect } from 'vitest'
import { runPipeline, formatPipelineReport } from '@/engine/pipeline/generativeDesignPipeline'

describe('generativeDesignPipeline', () => {
  describe('runPipeline', () => {
    it('runs end-to-end with a valid 3-bedroom house brief', async () => {
      const result = await runPipeline({
        rawBriefText: '3 bedroom house with kitchen, lounge, 2 bathrooms, master bedroom with ensuite. Site 15m x 20m.',
        projectName: 'Test House',
        siteWidthM: 15,
        siteDepthM: 20,
      })
      expect(result.success).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('passes the brief correctly with detected typology', async () => {
      const result = await runPipeline({
        rawBriefText: 'Build a 3-bedroom house with kitchen on a 15m x 20m site',
        siteWidthM: 15,
        siteDepthM: 20,
      })
      expect(result.brief!.rawText).toBeTruthy()
      expect(result.brief!.typology).toBeDefined()
      expect(result.brief!.program.length).toBeGreaterThanOrEqual(1)
    })

    it('produces an enhanced brief with spatial constraints when text describes adjacencies', async () => {
      const result = await runPipeline({
        rawBriefText: '3 bedroom house with kitchen next to the dining room and master bedroom away from lounge. Site 15m x 20m.',
        siteWidthM: 15,
        siteDepthM: 20,
      })
      expect(result.enhancedBrief).toBeDefined()
      const hasConstraints = result.enhancedBrief!.spatialConstraints!.length > 0
      expect(hasConstraints).toBe(true)
    })

    it('returns optimizerResult with candidates', async () => {
      const result = await runPipeline({
        rawBriefText: '2 bedroom house with kitchen and bathroom. Site 12m x 15m.',
        siteWidthM: 12,
        siteDepthM: 15,
      })
      expect(result.optimizerResult).not.toBeNull()
      expect(result.optimizerResult!.candidates.length).toBeGreaterThan(0)
    })

    it('selects a candidate from the optimizer', async () => {
      const result = await runPipeline({
        rawBriefText: '3 bedroom house with lounge and kitchen. Site 15m x 20m.',
        siteWidthM: 15,
        siteDepthM: 20,
      })
      expect(result.selectedCandidate).not.toBeNull()
      expect(result.selectedCandidate!.topology).toBeTruthy()
      expect(result.selectedCandidate!.planModel).not.toBeNull()
    })

    it('generates a planModel for the selected candidate', async () => {
      const result = await runPipeline({
        rawBriefText: '3 bedroom house. Site 15m x 20m.',
        siteWidthM: 15,
        siteDepthM: 20,
      })
      expect(result.planModel).not.toBeNull()
      expect(result.planModel!.rooms.length).toBeGreaterThan(0)
      expect(result.planModel!.walls.length).toBeGreaterThan(0)
    })

    it('runs compliance check on the plan model', async () => {
      const result = await runPipeline({
        rawBriefText: '3 bedroom house. Site 15m x 20m.',
        siteWidthM: 15,
        siteDepthM: 20,
        jurisdiction: 'south-africa',
      })
      expect(result.complianceReport).not.toBeNull()
      expect(result.complianceReport!.jurisdiction).toBe('south-africa')
    })

    it('assembles a council package with sheets', async () => {
      const result = await runPipeline({
        rawBriefText: '3 bedroom house. Site 15m x 20m.',
        siteWidthM: 15,
        siteDepthM: 20,
      })
      expect(result.councilPackage).not.toBeNull()
      expect(result.councilPackage!.sheets.length).toBeGreaterThanOrEqual(18)
      expect(result.councilPackage!.roomSchedule.length).toBeGreaterThan(0)
    })

    it('uses the specified weight profile', async () => {
      const result = await runPipeline({
        rawBriefText: '2 bedroom house. Site 12m x 15m.',
        siteWidthM: 12,
        siteDepthM: 15,
        weightProfile: 'cost-effective',
      })
      expect(result.success).toBe(true)
    })

    it('generates a design option with valid fields', async () => {
      const result = await runPipeline({
        rawBriefText: '3 bedroom house. Site 15m x 20m.',
        siteWidthM: 15,
        siteDepthM: 20,
      })
      expect(result.designOption).toBeDefined()
      expect(result.designOption!.id).toBeTruthy()
      expect(result.designOption!.name).toBeTruthy()
      expect(result.designOption!.grossFloorArea).toBeGreaterThan(0)
      expect(result.designOption!.floors).toBeGreaterThanOrEqual(1)
      expect(result.designOption!.buildingType).toBeTruthy()
      expect(Array.isArray(result.designOption!.elements)).toBe(true)
    })

    it('records steps with correct statuses', async () => {
      const result = await runPipeline({
        rawBriefText: '3 bedroom house. Site 15m x 20m.',
        siteWidthM: 15,
        siteDepthM: 20,
      })
      expect(result.steps.length).toBeGreaterThanOrEqual(4)
      const stepNames = result.steps.map((s) => s.name)
      expect(stepNames).toContain('Parse Brief')
      expect(stepNames).toContain('Enhance Brief')
      expect(stepNames).toContain('Multi-Objective Optimization')
      expect(stepNames).toContain('Compliance Check')
      expect(stepNames).toContain('Council Package Assembly')
      const parseBriefSteps = result.steps.filter((s) => s.name === 'Parse Brief')
      expect(parseBriefSteps.length).toBeGreaterThanOrEqual(1)
      expect(parseBriefSteps[parseBriefSteps.length - 1].status).toBe('passed')
    })

    it('handles a minimal brief without crashing', async () => {
      const result = await runPipeline({
        rawBriefText: '1 bedroom house with kitchen and bathroom',
        siteWidthM: 10,
        siteDepthM: 10,
      })
      expect(result.success).toBe(true)
    })

    it('recovers gracefully with empty text — creates minimal brief', async () => {
      const result = await runPipeline({
        rawBriefText: '',
        siteWidthM: 10,
        siteDepthM: 10,
      })
      expect(result.brief).toBeDefined()
      expect(result.brief!.program).toEqual([])
      expect(result.errors.length).toBe(0)
    })
  })

  describe('formatPipelineReport', () => {
    it('returns a formatted report string for a successful run', async () => {
      const result = await runPipeline({
        rawBriefText: '3 bedroom house. Site 15m x 20m.',
        siteWidthM: 15,
        siteDepthM: 20,
      })
      const report = formatPipelineReport(result)
      expect(report).toContain('GENERATIVE DESIGN PIPELINE REPORT')
      expect(report).toContain('PASSED')
      expect(report).toContain('Parse Brief')
      expect(report).toContain('Enhance Brief')
    })

    it('includes compliance section when report exists', async () => {
      const result = await runPipeline({
        rawBriefText: '3 bedroom house. Site 15m x 20m.',
        siteWidthM: 15,
        siteDepthM: 20,
        jurisdiction: 'south-africa',
      })
      const report = formatPipelineReport(result)
      expect(report).toContain('Compliance')
      expect(report).toContain('south-africa')
    })

    it('includes council package section when package exists', async () => {
      const result = await runPipeline({
        rawBriefText: '3 bedroom house. Site 15m x 20m.',
        siteWidthM: 15,
        siteDepthM: 20,
      })
      const report = formatPipelineReport(result)
      expect(report).toContain('Council Package')
      expect(report).toContain('Sheets')
    })

    it('formatPipelineReport succeeds for any pipeline result', async () => {
      const result = await runPipeline({
        rawBriefText: '3 bedroom house',
        siteWidthM: 15,
        siteDepthM: 20,
      })
      const report = formatPipelineReport(result)
      expect(report).toContain('GENERATIVE DESIGN PIPELINE REPORT')
      expect(report).toContain('Optimization')
    })
  })
})
