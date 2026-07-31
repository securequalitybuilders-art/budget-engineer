import { describe, it, expect } from 'vitest'
import { assembleCouncilPackage, printDrawingRegister, printRoomSchedule } from '@/engine/tier1/councilPackageAssembler'
import type { PlanModel } from '@/domain/plan'
import type { EnhancedBrief } from '@/engine/tier1/briefEnhancer'
import type { TopologyCandidate } from '@/engine/tier3/multiObjectiveOptimizer'
import type { DesignOption } from '@/domain/boq'

function makePlanModel(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'test-plan-1',
    designOptionId: 'test-design-1',
    width: 12,
    height: 10,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 5, height: 4 },
      { id: 'r2', name: 'Kitchen', x: 5, y: 0, width: 3.5, height: 4 },
      { id: 'r3', name: 'Master Bedroom', x: 0, y: 4, width: 4, height: 3.5 },
      { id: 'r4', name: 'Bedroom 2', x: 4, y: 4, width: 3.5, height: 3.5 },
      { id: 'r5', name: 'Bathroom', x: 7.5, y: 4, width: 2.5, height: 2.5 },
    ],
    walls: [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w2', start: { x: 12, y: 0 }, end: { x: 12, y: 10 }, thickness: 0.23, type: 'external' },
      { id: 'w3', start: { x: 12, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.23, type: 'external' },
      { id: 'w4', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, thickness: 0.23, type: 'external' },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', kind: 'door', offset: 0.25, width: 0.9 },
      { id: 'o2', wallId: 'w1', kind: 'window', offset: 0.5, width: 1.5, height: 1.2, sillHeight: 0.9 },
    ],
    scaleLabel: '1:100',
    ...overrides,
  }
}

function makeEnhancedBrief(): EnhancedBrief {
  return {
    rawText: '3 bedroom house with kitchen and lounge',
    typology: { id: 'house-residential', displayName: 'House', aliases: ['house'], sans10400Class: 'H1', zbcClass: 'Residential', defaultStoreys: 1, defaultProgram: [], minRoomDimensions: {}, notes: '', maxStructuralSpan: 6 },
    typologyConfidence: 0.9,
    climateZone: null,
    heritagePattern: null,
    siteInfo: { widthM: 15, depthM: 20, areaM2: 300, aspect: '0.75' },
    program: [{ name: 'Living Room', count: 1, areaM2: 25 }],
    constraints: { budgetCents: null, budgetUsd: null, timeline: null, materials: [] },
    qualityGate: { passed: true, score: 1, issues: [], recommendations: [] },
    spatialConstraints: [],
  }
}

function makeDesignOption(): DesignOption {
  return {
    id: 'test-design-1',
    name: 'Test House',
    grossFloorArea: 120,
    floors: 1,
    buildingType: 'house',
    elements: [],
  }
}

function makeCandidate(): TopologyCandidate {
  return {
    topology: 'rectangle',
    seed: 42,
    floorPlan: { id: 'fp1', name: 'Ground Floor', rooms: [], width: 12, height: 10, topology: 'rectangle' },
    planModel: makePlanModel(),
    scores: { efficiency: 0.8, wetCoreClustering: 0.7, structuralEfficiency: 0.85, circulation: 0.75, daylightAccess: 0.6, overall: 0.75 },
    rankByProfile: {},
  }
}

describe('councilPackageAssembler', () => {
  describe('assembleCouncilPackage', () => {
    it('returns a CouncilPackage with all required fields', () => {
      const plan = makePlanModel()
      const brief = makeEnhancedBrief()
      const design = makeDesignOption()
      const candidate = makeCandidate()
      const pkg = assembleCouncilPackage(plan, design, brief, candidate, null, 'Test Project')

      expect(pkg.projectName).toBe('Test Project')
      expect(pkg.projectNumber).toBeTruthy()
      expect(pkg.issueDate).toBeTruthy()
      expect(Array.isArray(pkg.sheets)).toBe(true)
      expect(Array.isArray(pkg.roomSchedule)).toBe(true)
      expect(Array.isArray(pkg.drawingRegister)).toBe(true)
      expect(pkg.boqSummary).toBeDefined()
      expect(pkg.titleBlock).toBeDefined()
      expect(pkg.complianceCertificate).toBeNull()
    })

    it('generates 18+ sheets across multiple disciplines', () => {
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      expect(pkg.sheets.length).toBeGreaterThanOrEqual(18)
      const disciplines = new Set(pkg.sheets.map((s) => s.discipline))
      expect(disciplines.has('A')).toBe(true)
      expect(disciplines.has('S')).toBe(true)
      expect(disciplines.has('E')).toBe(true)
      expect(disciplines.has('P')).toBe(true)
    })

    it('each sheet has required fields', () => {
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      for (const s of pkg.sheets) {
        expect(s.sheetNumber).toBeTruthy()
        expect(s.sadcCode).toBeTruthy()
        expect(s.discipline).toBeTruthy()
        expect(s.title).toBeTruthy()
        expect(s.scale).toBeTruthy()
        expect(typeof s.isPlanView).toBe('boolean')
        expect(typeof s.generateContent).toBe('function')
      }
    })

    it('room schedule entries match plan rooms', () => {
      const plan = makePlanModel()
      const pkg = assembleCouncilPackage(plan, makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      expect(pkg.roomSchedule.length).toBe(plan.rooms.length)
      for (let i = 0; i < plan.rooms.length; i++) {
        expect(pkg.roomSchedule[i].roomName).toBe(plan.rooms[i].name)
        expect(pkg.roomSchedule[i].areaM2).toBeGreaterThan(0)
        expect(pkg.roomSchedule[i].classification).toBeTruthy()
      }
    })

    it('classifies rooms correctly', () => {
      const plan = makePlanModel()
      const pkg = assembleCouncilPackage(plan, makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      const bathroom = pkg.roomSchedule.find((r) => r.roomName === 'Bathroom')
      expect(bathroom?.classification).toBe('wet-core')
      const living = pkg.roomSchedule.find((r) => r.roomName === 'Living Room')
      expect(living?.classification).toBe('habitable')
      const bedroom = pkg.roomSchedule.find((r) => r.roomName === 'Master Bedroom')
      expect(bedroom?.classification).toBe('habitable')
    })

    it('title block is populated with default values', () => {
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      const tb = pkg.titleBlock
      expect(tb.drawingTitle).toBeTruthy()
      expect(tb.projectName).toBeTruthy()
      expect(tb.projectNumber).toBe('BE-2026-001')
      expect(tb.status).toBe('FOR_APPROVAL')
      expect(tb.author).toBe('Budget Engineer AI')
    })

    it('drawing register has same count as sheets', () => {
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      expect(pkg.drawingRegister.length).toBe(pkg.sheets.length)
    })

    it('compliance certificate is included when provided', () => {
      const complianceReport = {
        jurisdiction: 'south-africa',
        score: 85,
        passedRules: 17,
        totalRules: 20,
        warnings: ['Minor setback issue'],
        results: [],
      }
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), complianceReport)
      expect(pkg.complianceCertificate).not.toBeNull()
      expect(pkg.complianceCertificate!.jurisdiction).toBe('south-africa')
      expect(pkg.complianceCertificate!.score).toBe(85)
    })

    it('uses fallback project name when not provided', () => {
      const brief = makeEnhancedBrief()
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), brief, makeCandidate(), null)
      expect(pkg.projectName).toContain('House')
      expect(pkg.projectName).toContain('15m')
    })
  })

  describe('printDrawingRegister', () => {
    it('returns a tab-delimited string with header', () => {
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      const output = printDrawingRegister(pkg)
      expect(output).toContain('Sheet No')
      expect(output).toContain('Title')
      expect(output).toContain('A-001')
    })
  })

  describe('printRoomSchedule', () => {
    it('returns a tab-delimited string with header and entries', () => {
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      const output = printRoomSchedule(pkg)
      expect(output).toContain('No')
      expect(output).toContain('Room')
      expect(output).toContain('Living Room')
    })
  })
})
