import { describe, it, expect } from 'vitest'
import {
  createChangeOrder,
  createRFI,
  respondToRFI,
  createSubmittal,
  reviewSubmittal,
  createSiteInspection,
  completeInspection,
  createNCR,
  resolveNCR,
  verifyNCR,
  createSnagItem,
  resolveSnag,
  advanceChangeOrderStatus,
  advanceRFIStatus,
  advanceNCRStatus,
} from '@/engine/change/changeEngine'

describe('P22 — Change & Issue Engine', () => {
  describe('createChangeOrder', () => {
    it('creates draft change order', () => {
      const co = createChangeOrder({
        projectId: 'p1', changeOrderNumber: 'CO-001',
        title: 'Additional Window', description: 'Add window to east wall',
        originator: 'architect-1', category: 'variation',
        reason: 'Client request', costImpactCents: 500000,
        timeImpactDays: 5, scopeChange: 'Add aluminium window 1200x1500',
      })
      expect(co.status).toBe('draft')
      expect(co.costImpactCents).toBe(500000)
      expect(co.timeImpactDays).toBe(5)
    })
  })

  describe('createRFI', () => {
    it('creates open RFI', () => {
      const rfi = createRFI({
        projectId: 'p1', rfiNumber: 'RFI-001',
        title: 'Beam Depth Query', question: 'What is the beam depth at grid B2?',
        originator: 'site-eng', originatorRole: 'Site Engineer',
        assignedTo: 'struct-eng', discipline: 'structural',
        priority: 'high', daysToRespond: 3,
      })
      expect(rfi.status).toBe('open')
      expect(rfi.rfiNumber).toBe('RFI-001')
    })
  })

  describe('respondToRFI', () => {
    it('sets status to answered', () => {
      const rfi = createRFI({ projectId: 'p1', rfiNumber: 'RFI-001', title: 'Q', question: '?', originator: 'u1', originatorRole: 'Eng', assignedTo: 'u2', discipline: 'structural', priority: 'medium', daysToRespond: 3 })
      const answered = respondToRFI(rfi, 'Beam depth is 600mm', 'struct-eng')
      expect(answered.status).toBe('answered')
      expect(answered.response).toBe('Beam depth is 600mm')
    })
  })

  describe('createSubmittal', () => {
    it('creates draft submittal', () => {
      const sub = createSubmittal({
        projectId: 'p1', submittalNumber: 'SUB-001',
        title: 'Steel Shop Drawings', description: 'Shop drawings for steel frame',
        category: 'shop-drawing', submittedBy: 'steel-contractor',
        assignedReviewer: 'architect-1', revision: 'A',
      })
      expect(sub.status).toBe('draft')
      expect(sub.category).toBe('shop-drawing')
    })
  })

  describe('reviewSubmittal', () => {
    it('updates status with reviewer decision', () => {
      const sub = createSubmittal({ projectId: 'p1', submittalNumber: 'S1', title: 'T', description: 'D', category: 'shop-drawing', submittedBy: 'u1', assignedReviewer: 'u2', revision: 'A' })
      const reviewed = reviewSubmittal(sub, 'approved-with-comments', 'Minor adjustments needed', 'architect-1')
      expect(reviewed.status).toBe('approved-with-comments')
      expect(reviewed.reviewNotes).toBe('Minor adjustments needed')
    })
  })

  describe('createSiteInspection', () => {
    it('creates scheduled inspection', () => {
      const insp = createSiteInspection({
        projectId: 'p1', inspectionNumber: 'INS-001',
        title: 'Foundation Inspection', description: 'Inspect rebar before pour',
        inspectionType: 'structural', scheduledDate: '2026-08-01',
        inspector: 'eng-1', inspectionTeam: ['eng-1', 'qa-1'],
        location: 'Grid A-B/1-2',
      })
      expect(insp.status).toBe('scheduled')
      expect(insp.inspectionType).toBe('structural')
    })
  })

  describe('completeInspection', () => {
    it('completes inspection with findings', () => {
      const insp = createSiteInspection({ projectId: 'p1', inspectionNumber: 'I1', title: 'T', description: 'D', inspectionType: 'quality', scheduledDate: '2026-08-01', inspector: 'u1', inspectionTeam: [], location: 'Site' })
      const done = completeInspection(insp, 'All good', 'pass', [], [], false)
      expect(done.status).toBe('completed')
      expect(done.completedDate).toBeDefined()
      expect(done.overallResult).toBe('pass')
    })
  })

  describe('createNCR', () => {
    it('creates open NCR', () => {
      const ncr = createNCR({
        projectId: 'p1', ncrNumber: 'NCR-001',
        title: 'Cracked Beam', description: 'Beam B2 has crack > 0.3mm',
        severity: 'major', originator: 'inspector-1',
        originatorRole: 'QA Inspector', location: 'Grid B2',
        category: 'workmanship',
      })
      expect(ncr.status).toBe('open')
      expect(ncr.severity).toBe('major')
    })
  })

  describe('resolveNCR', () => {
    it('resolves with root cause and actions', () => {
      const ncr = createNCR({ projectId: 'p1', ncrNumber: 'N1', title: 'T', description: 'D', severity: 'minor', originator: 'u1', originatorRole: 'Insp', location: 'Site', category: 'material' })
      const resolved = resolveNCR(ncr, 'Insufficient curing', 'Apply epoxy injection', 'Update curing procedure', 'eng-1')
      expect(resolved.status).toBe('resolved')
      expect(resolved.rootCause).toBe('Insufficient curing')
    })
  })

  describe('verifyNCR', () => {
    it('sets status to verified', () => {
      let ncr = createNCR({ projectId: 'p1', ncrNumber: 'N1', title: 'T', description: 'D', severity: 'critical', originator: 'u1', originatorRole: 'Insp', location: 'Site', category: 'safety' })
      ncr = resolveNCR(ncr, 'Cause', 'Action', 'Prevention', 'eng-1')
      const verified = verifyNCR(ncr, 'qa-1')
      expect(verified.status).toBe('verified')
    })
  })

  describe('createSnagItem', () => {
    it('creates open snag', () => {
      const snag = createSnagItem({
        projectId: 'p1', snagNumber: 'SNAG-001',
        description: 'Paint peeling on wall A1', priority: 'high',
        category: 'finish', location: 'Room 101', originator: 'inspector-1',
        assignedTo: 'painter-1', dueDate: '2026-08-07',
      })
      expect(snag.status).toBe('open')
      expect(snag.priority).toBe('high')
    })
  })

  describe('resolveSnag', () => {
    it('marks snag as resolved', () => {
      const snag = createSnagItem({ projectId: 'p1', snagNumber: 'S1', description: 'Paint issue', priority: 'medium', category: 'finish', location: 'R1', originator: 'u1', assignedTo: 'u2', dueDate: '2026-08-01' })
      const resolved = resolveSnag(snag, 'painter-1')
      expect(resolved.status).toBe('resolved')
      expect(resolved.resolvedBy).toBe('painter-1')
    })
  })

  describe('advanceChangeOrderStatus', () => {
    it('advances through sequence', () => {
      expect(advanceChangeOrderStatus('draft')).toBe('pending-review')
      expect(advanceChangeOrderStatus('pending-review')).toBe('approved')
      expect(advanceChangeOrderStatus('approved')).toBe('implemented')
      expect(advanceChangeOrderStatus('implemented')).toBe('implemented')
    })
  })

  describe('advanceRFIStatus', () => {
    it('advances through sequence', () => {
      expect(advanceRFIStatus('open')).toBe('answered')
      expect(advanceRFIStatus('answered')).toBe('clarified')
      expect(advanceRFIStatus('clarified')).toBe('closed')
      expect(advanceRFIStatus('closed')).toBe('closed')
    })
  })

  describe('advanceNCRStatus', () => {
    it('advances through sequence', () => {
      expect(advanceNCRStatus('open')).toBe('in-progress')
      expect(advanceNCRStatus('in-progress')).toBe('resolved')
      expect(advanceNCRStatus('resolved')).toBe('verified')
      expect(advanceNCRStatus('verified')).toBe('closed')
      expect(advanceNCRStatus('closed')).toBe('closed')
    })
  })
})
