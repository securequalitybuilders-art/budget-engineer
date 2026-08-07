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

    it('assembles the exact 18-sheet SADC council package', () => {
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      expect(pkg.sheets.length).toBe(18)
      const numbers = pkg.sheets.map((s) => s.sheetNumber)
      expect(numbers).toEqual([
        'A-001', 'A-101', 'A-102', 'A-103', 'A-104', 'A-105',
        'A-201', 'A-202', 'A-203', 'A-204',
        'A-301', 'A-302',
        'A-401', 'A-402',
        'A-501', 'A-502',
        'A-601', 'A-701',
      ])
      const disciplines = new Set(pkg.sheets.map((s) => s.discipline))
      expect(disciplines.has('A')).toBe(true)
      expect(disciplines.size).toBe(1)
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

    it('register sheet A-001 lists all 18 sheets', () => {
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      const register = pkg.sheets.find((s) => s.sheetNumber === 'A-001')!
      const table = register.generateContent().tableData ?? []
      expect(table.length).toBe(18)
      expect(table[0].sheetNumber).toBe('A-001')
      expect(table[17].sheetNumber).toBe('A-701')
    })

    it('all four elevation sheets produce SVG content', () => {
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      const elevations = pkg.sheets.filter((s) => s.sheetNumber.startsWith('A-2'))
      expect(elevations.length).toBe(4)
      for (const e of elevations) {
        const content = e.generateContent()
        expect(content.svgContent).toBeTruthy()
        expect(content.svgContent!).toContain('<svg')
      }
    })

    it('section sheets produce SVG content', () => {
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      const sections = pkg.sheets.filter((s) => s.sheetNumber.startsWith('A-3'))
      for (const s of sections) {
        expect(s.generateContent().svgContent).toContain('<svg')
      }
    })

    it('A-601 construction details sheet renders detail cards', () => {
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      const sheet = pkg.sheets.find((s) => s.sheetNumber === 'A-601')!
      const svg = sheet.generateContent().svgContent ?? ''
      expect(svg).toContain('Construction Details')
      expect(svg).toContain('<svg')
    })

    it('A-701 compliance certificate renders score when report provided', () => {
      const complianceReport = {
        jurisdiction: 'south-africa',
        score: 85,
        passedRules: 17,
        totalRules: 20,
        warnings: ['Minor setback issue'],
        results: [],
      }
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), complianceReport)
      const sheet = pkg.sheets.find((s) => s.sheetNumber === 'A-701')!
      const svg = sheet.generateContent().svgContent ?? ''
      expect(svg).toContain('COMPLIANCE CERTIFICATE')
      expect(svg).toContain('85%')
      expect(svg).toContain('17 of 20')
    })

    it('A-701 renders placeholder when no compliance report', () => {
      const pkg = assembleCouncilPackage(makePlanModel(), makeDesignOption(), makeEnhancedBrief(), makeCandidate(), null)
      const sheet = pkg.sheets.find((s) => s.sheetNumber === 'A-701')!
      const svg = sheet.generateContent().svgContent ?? ''
      expect(svg).toContain('No compliance report available')
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
