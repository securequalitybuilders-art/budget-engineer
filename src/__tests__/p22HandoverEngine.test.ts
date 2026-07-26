import { describe, it, expect } from 'vitest'
import {
  createCompletionStage,
  addCompletionCondition,
  satisfyCompletionCondition,
  issueCompletionCertificate,
  checkCompletionReadiness,
  achieveCompletionStage,
  createSnagList,
  addSnagListItem,
  createHandoverPackage,
  addHandoverContent,
  issueHandoverPackage,
  acknowledgeHandoverPackage,
  createAssetRegisterItem,
  createWarrantyRecord,
  submitWarrantyClaim,
  createOAndMRecord,
  calculateSnagCompletion,
} from '@/engine/handover/handoverEngine'

describe('P22 — Handover Engine', () => {
  describe('createCompletionStage', () => {
    it('creates stage with not-started status', () => {
      const stage = createCompletionStage({
        projectId: 'p1',
        stage: 'practical-completion',
        targetDate: '2026-12-01',
      })
      expect(stage.status).toBe('not-started')
      expect(stage.stage).toBe('practical-completion')
      expect(stage.conditions).toHaveLength(0)
    })
  })

  describe('addCompletionCondition', () => {
    it('adds condition to stage', () => {
      let stage = createCompletionStage({ projectId: 'p1', stage: 'practical-completion', targetDate: '2026-12-01' })
      stage = addCompletionCondition(stage, { description: 'All snags resolved', met: false })
      expect(stage.conditions).toHaveLength(1)
      expect(stage.conditions[0].description).toBe('All snags resolved')
    })
  })

  describe('satisfyCompletionCondition', () => {
    it('marks condition as met', () => {
      let stage = createCompletionStage({ projectId: 'p1', stage: 'final-completion', targetDate: '2027-01-01' })
      stage = addCompletionCondition(stage, { description: 'O&M manuals submitted', met: false })
      const conditionId = stage.conditions[0].id
      const updated = satisfyCompletionCondition(stage, conditionId, 'om-manual.pdf', 'pm-1')
      expect(updated.conditions[0].met).toBe(true)
    })
  })

  describe('issueCompletionCertificate', () => {
    it('adds certificate to stage', () => {
      let stage = createCompletionStage({ projectId: 'p1', stage: 'practical-completion', targetDate: '2026-12-01' })
      stage = issueCompletionCertificate(stage, {
        certificateNumber: 'PC-001', title: 'Practical Completion Certificate',
        issuedDate: '2026-12-01', issuedBy: 'architect-1', status: 'draft', notes: '',
      })
      expect(stage.certificates).toHaveLength(1)
      expect(stage.certificates[0].certificateNumber).toBe('PC-001')
    })
  })

  describe('checkCompletionReadiness', () => {
    it('returns ready when all conditions met', () => {
      let stage = createCompletionStage({ projectId: 'p1', stage: 'practical-completion', targetDate: '2026-12-01' })
      stage = addCompletionCondition(stage, { description: 'C1', met: true })
      const result = checkCompletionReadiness(stage)
      expect(result.ready).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    it('returns missing conditions', () => {
      let stage = createCompletionStage({ projectId: 'p1', stage: 'practical-completion', targetDate: '2026-12-01' })
      stage = addCompletionCondition(stage, { description: 'Snags resolved', met: false })
      stage = addCompletionCondition(stage, { description: 'Manuals submitted', met: true })
      const result = checkCompletionReadiness(stage)
      expect(result.ready).toBe(false)
      expect(result.missing).toContain('Snags resolved')
    })
  })

  describe('achieveCompletionStage', () => {
    it('sets status to achieved', () => {
      const stage = createCompletionStage({ projectId: 'p1', stage: 'practical-completion', targetDate: '2026-12-01' })
      const achieved = achieveCompletionStage(stage)
      expect(achieved.status).toBe('achieved')
      expect(achieved.achievedDate).toBeDefined()
    })
  })

  describe('createSnagList', () => {
    it('creates empty snag list', () => {
      const list = createSnagList({ projectId: 'p1', name: 'Final Snags' })
      expect(list.snagItems).toHaveLength(0)
      expect(list.name).toBe('Final Snags')
    })
  })

  describe('addSnagListItem', () => {
    it('adds item to snag list', () => {
      let list = createSnagList({ projectId: 'p1', name: 'Snags' })
      list = addSnagListItem(list, {
        description: 'Paint touch-up', priority: 'medium', status: 'open',
        category: 'finish', location: 'Hallway', assignedTo: 'painter-1',
        dueDate: '2026-12-15', photoRefs: [], notes: '',
      })
      expect(list.snagItems).toHaveLength(1)
      expect(list.snagItems[0].description).toBe('Paint touch-up')
    })
  })

  describe('createHandoverPackage', () => {
    it('creates draft handover package', () => {
      const pkg = createHandoverPackage({
        projectId: 'p1', name: 'Building A Handover',
        recipient: 'Client Name', recipientType: 'client',
      })
      expect(pkg.status).toBe('draft')
      expect(pkg.contents).toHaveLength(0)
    })
  })

  describe('addHandoverContent', () => {
    it('adds content to package', () => {
      let pkg = createHandoverPackage({ projectId: 'p1', name: 'Handover', recipient: 'Client', recipientType: 'client' })
      pkg = addHandoverContent(pkg, {
        type: 'as-built-drawing', title: 'As-Built Floor Plan',
        description: 'Final as-built drawing set', revision: 'A',
        status: 'pending', notes: '',
      })
      expect(pkg.contents).toHaveLength(1)
      expect(pkg.contents[0].type).toBe('as-built-drawing')
    })
  })

  describe('issueHandoverPackage', () => {
    it('sets status to issued', () => {
      const pkg = createHandoverPackage({ projectId: 'p1', name: 'Pkg', recipient: 'Client', recipientType: 'client' })
      const issued = issueHandoverPackage(pkg, 'pm-1')
      expect(issued.status).toBe('issued')
      expect(issued.issuedBy).toBe('pm-1')
    })
  })

  describe('acknowledgeHandoverPackage', () => {
    it('sets status to acknowledged', () => {
      const pkg = createHandoverPackage({ projectId: 'p1', name: 'Pkg', recipient: 'Client', recipientType: 'client' })
      const ack = acknowledgeHandoverPackage(pkg, 'client-rep')
      expect(ack.status).toBe('acknowledged')
      expect(ack.acknowledgedBy).toBe('client-rep')
    })
  })

  describe('createAssetRegisterItem', () => {
    it('creates asset with active status', () => {
      const asset = createAssetRegisterItem({
        projectId: 'p1', assetTag: 'ASSET-001', name: 'AHU-01',
        description: 'Air Handling Unit', category: 'mep',
        subCategory: 'HVAC', location: 'Plant Room', manufacturer: 'Trane',
        model: 'M-100', serialNumber: 'SN-12345',
        installationDate: '2026-06-01', warrantyExpiry: '2031-06-01',
        expectedLifeYears: 15, replacementCostCents: 5000000,
        maintenanceIntervalDays: 90,
      })
      expect(asset.status).toBe('active')
      expect(asset.assetTag).toBe('ASSET-001')
    })
  })

  describe('createWarrantyRecord', () => {
    it('creates active warranty', () => {
      const warranty = createWarrantyRecord({
        projectId: 'p1', warrantyType: 'defects-liability',
        provider: 'BuildCorp', providerType: 'contractor',
        reference: 'WAR-001', description: '12-month defects liability',
        startDate: '2026-12-01', expiryDate: '2027-12-01',
        coverageDetails: 'All structural defects', exclusions: ['Fair wear and tear'],
        claimProcess: 'Submit written notice within 14 days',
      })
      expect(warranty.status).toBe('active')
      expect(warranty.claimHistory).toHaveLength(0)
    })
  })

  describe('submitWarrantyClaim', () => {
    it('adds claim and sets status to claimed', () => {
      const warranty = createWarrantyRecord({ projectId: 'p1', warrantyType: 'structural', provider: 'X', providerType: 'contractor', reference: 'W1', description: 'D', startDate: '', expiryDate: '', coverageDetails: '', exclusions: [], claimProcess: '' })
      const claimed = submitWarrantyClaim(warranty, {
        claimDate: '2027-03-01', description: 'Crack in wall',
        status: 'submitted', resolution: '', costCents: 200000, notes: '',
      })
      expect(claimed.status).toBe('claimed')
      expect(claimed.claimHistory).toHaveLength(1)
    })
  })

  describe('createOAndMRecord', () => {
    it('creates O&M record', () => {
      const record = createOAndMRecord({
        projectId: 'p1', title: 'HVAC O&M Manual',
        documentType: 'manual', system: 'HVAC',
        description: 'Operation and maintenance for HVAC system',
        fileRef: 'om-hvac.pdf', revision: 'A', issueDate: '2026-12-01',
      })
      expect(record.title).toBe('HVAC O&M Manual')
      expect(record.documentType).toBe('manual')
    })
  })

  describe('calculateSnagCompletion', () => {
    it('returns 100% for empty list', () => {
      const list = createSnagList({ projectId: 'p1', name: 'Snags' })
      expect(calculateSnagCompletion(list)).toBe(100)
    })

    it('returns partial completion', () => {
      let list = createSnagList({ projectId: 'p1', name: 'Snags' })
      list = addSnagListItem(list, { description: 'S1', priority: 'high', status: 'open', category: 'finish', location: 'L1', assignedTo: 'u1', dueDate: '2026-12-01', photoRefs: [], notes: '' })
      list = addSnagListItem(list, { description: 'S2', priority: 'medium', status: 'resolved', category: 'finish', location: 'L2', assignedTo: 'u2', dueDate: '2026-12-01', photoRefs: [], notes: '' })
      list = addSnagListItem(list, { description: 'S3', priority: 'low', status: 'verified', category: 'finish', location: 'L3', assignedTo: 'u3', dueDate: '2026-12-01', photoRefs: [], notes: '' })
      expect(calculateSnagCompletion(list)).toBe(67)
    })
  })
})
