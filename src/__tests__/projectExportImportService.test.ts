import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/db/db'
import { exportProjectPackage, importProjectPackage } from '@/services/projectExportImportService'

const TEST_PROJECT_ID = 'export-test-proj-1'

const now = new Date().toISOString()
const uid = (s: string) => `export-${s}`

async function seedAllTables() {
  const records: [string, Record<string, unknown>][] = [
    ['projects', { id: TEST_PROJECT_ID, slug: 'export-test-project', name: 'Export Test Project', ownerId: 'local-user', profile: 'first-time', region: 'zimbabwe', currency: 'USD', status: 'design', createdAt: now, updatedAt: now, version: 1 }],
    ['briefs', { projectId: TEST_PROJECT_ID, rawText: 'A 3-bedroom house in Harare', parsed: { buildingType: 'house', floors: 1, location: 'harare', standards: ['ZBC 1996'] } }],
    ['designs', { id: uid('design-1'), projectId: TEST_PROJECT_ID, name: 'Standard House', optionIndex: 0, parameters: { areaM2: 120, floors: 1 }, elements: [], buildingType: 'house', generatedAt: now }],
    ['boqs', { id: uid('boq-1'), projectId: TEST_PROJECT_ID, designId: uid('design-1'), sections: [], lineItems: [{ id: uid('li-1'), code: 'A1', description: 'Excavation', unit: 'm3', quantity: 50, rateCents: 1000, totalCents: 50000 }], totalCents: 50000, createdAt: now, updatedAt: now, name: 'Test BOQ', version: 1 }],
    ['transactions', { id: uid('tx-1'), projectId: TEST_PROJECT_ID, date: now, description: 'Test tx', amountCents: 10000, entityType: 'client-payment', entityId: 'client-1', createdAt: now, category: 'payment' }],
    ['cadDocs', { id: uid('cad-1'), name: 'test.dxf', projectId: TEST_PROJECT_ID, file: new Blob(), uploadedAt: now, mimeType: 'image/vnd.dxf', size: 0 }],
    ['bimModels', { id: uid('bim-1'), name: 'test.ifc', projectId: TEST_PROJECT_ID, uploadedAt: now, format: 'ifc', status: 'ready', version: '1' }],
    ['governance', { projectId: TEST_PROJECT_ID, approvalState: 'approved', lastUpdated: now, auditTrail: [], currentStage: 'design' }],
    ['snapshots', { id: uid('snap-1'), projectId: TEST_PROJECT_ID, name: 'v1', timestamp: now, description: 'First export snapshot', data: '{}' }],
    ['planModels', { id: uid('plan-1'), projectId: TEST_PROJECT_ID, designId: uid('design-1'), savedAt: now, storeys: [], buildingType: 'house' }],
    ['projectIntakes', { id: uid('intake-1'), projectId: TEST_PROJECT_ID, status: 'submitted', submittedAt: now, documents: [], source: 'client', clientName: 'Test', clientType: 'individual', projectName: 'Test', projectDescription: '', estimatedBudget: 0, requestedBy: '', contactEmail: '', contactPhone: '', createdAt: now, updatedAt: now }],
    ['feasibilityAssessments', { id: uid('feas-1'), projectId: TEST_PROJECT_ID, verdict: 'pass', assessedAt: now, assessmentDate: now, assessor: 'PM', overallResult: 'pass', budgetFeasibility: { isAdequate: true, confidencePct: 80, contingencies: [] }, siteFeasibility: { soilCondition: 'good', accessRoute: 'ok', utilitiesAvailable: true }, scheduleFeasibility: { isAchievable: true, criticalPathItems: [] }, riskFeasibility: { riskLevel: 'low', keyRisks: [] }, resourceFeasibility: { labourAvailable: true, materialsAvailable: true, equipmentAvailable: true }, budgetCents: 100000, feasibilityScore: 85, findings: [], recommendations: [], createdAt: now, updatedAt: now }],
    ['riskGates', { id: uid('gate-1'), projectId: TEST_PROJECT_ID, gateType: 'design-review', status: 'passed', assessedAt: now, assessedBy: 'PM', criteria: [], name: 'Design Review', required: true, order: 0, description: '', category: 'design', createdAt: now, updatedAt: now }],
    ['riskRegister', { id: uid('risk-1'), projectId: TEST_PROJECT_ID, category: 'technical', status: 'open', likelihood: 3, impact: 4, description: 'Cost overrun risk', createdAt: now, updatedAt: now, riskScore: 12, mitigation: '', owner: '', severity: 'high', contingency: '' }],
    ['solvencyChecks', { id: uid('solv-1'), projectId: TEST_PROJECT_ID, status: 'cleared', checkedAt: now, creditScore: 700, debtRatio: 0.3, assessedBy: 'Finance', entityType: 'contractor', entityId: uid('entity'), entityName: 'Test', checkDate: now, entityTypeLabel: 'contractor', financialStatements: [], isSolvent: true, createdAt: now, updatedAt: now }],
    ['milestones', { id: uid('ms-1'), projectId: TEST_PROJECT_ID, name: 'Design Complete', plannedDate: '2026-06-01', category: 'design', releaseState: 'released', createdAt: now, updatedAt: now, description: '', plannedCostCents: 0, linkedBOQSectionIds: [], linkedScheduleLineIds: [], deliverables: [], status: 'pending', conditionIds: [], dependencyIds: [] }],
    ['contractorProfiles', { id: uid('contr-1'), name: 'Test Contractor', trade: 'general', verificationState: 'verified', contactPerson: 'John', email: 'john@test.com', phone: '123', address: 'Harare', safetyRating: 80, qualityRating: 85, timelinessRating: 75, reliabilityScore: 80, completedProjects: 5, linkedProjectIds: [TEST_PROJECT_ID], notes: '', createdAt: now, updatedAt: now, registrationNumber: 'REG-001', taxId: 'TAX-001', subTrades: [] }],
    ['subcontractorProfiles', { id: uid('sub-1'), contractorId: uid('contr-1'), name: 'Test Sub', trade: 'electrical', verificationState: 'verified', contactPerson: 'Jane', email: 'jane@test.com', phone: '456', performanceScore: 80, safetyRecord: 'good', linkedProjectIds: [TEST_PROJECT_ID], notes: '', createdAt: now, updatedAt: now, licenseNumber: 'LIC-001' }],
    ['supplierProfiles', { id: uid('supp-1'), name: 'Test Supplier', category: 'materials', verificationState: 'verified', contactPerson: 'Bob', email: 'bob@test.com', phone: '789', address: 'Bulawayo', paymentTerms: 'net30', deliveryLeadDays: 14, qualityRating: 85, reliabilityScore: 80, linkedProjectIds: [TEST_PROJECT_ID], preferred: true, notes: '', createdAt: now, updatedAt: now }],
    ['consultantProfiles', { id: uid('cons-1'), name: 'Test Engineer', discipline: 'structural', registrationNumber: 'ENG-001', verificationState: 'verified', email: 'eng@test.com', phone: '000', firmName: 'Struct Ltd', linkedProjectIds: [TEST_PROJECT_ID], notes: '', createdAt: now, updatedAt: now }],
    ['procurementRequests', { id: uid('pr-1'), projectId: TEST_PROJECT_ID, requestNumber: 'PR-001', title: 'Steel order', description: 'Steel rebar for foundation', category: 'materials', priority: 'high', status: 'awarded', requestedBy: 'PM', requestedAt: now, requiredByDate: '2026-07-01', budgetCents: 100000, estimatedCostCents: 95000, linkedBOQLineIds: [], linkedScheduleLineIds: [], specifications: ['Grade 60'], deliveryLocation: 'Site', notes: '', createdAt: now, updatedAt: now }],
    ['purchaseOrders', { id: uid('po-1'), projectId: TEST_PROJECT_ID, procurementRequestId: uid('pr-1'), supplierQuoteId: uid('quote-1'), supplierId: uid('supp-1'), poNumber: 'PO-001', title: 'PO for steel', status: 'delivered', lineItems: [], subtotalCents: 90000, taxCents: 0, shippingCents: 5000, totalCents: 95000, currency: 'USD', issuedDate: now, deliveryDate: '2026-07-15', deliveryLocation: 'Site', paymentTerms: 'net30', notes: '', issuedBy: 'PM', approvedBy: 'Dir', createdAt: now, updatedAt: now }],
    ['supplierQuotes', { id: uid('quote-1'), procurementRequestId: uid('pr-1'), supplierId: uid('supp-1'), supplierName: 'Test Supplier', quoteNumber: 'Q-001', quoteDate: now, validUntil: '2026-08-01', status: 'awarded', lineItems: [], subtotalCents: 90000, taxCents: 0, shippingCents: 5000, totalCents: 95000, currency: 'USD', deliveryDays: 21, paymentTerms: 'net30', warrantyTerms: '12 months', notes: '', createdAt: now, updatedAt: now }],
    ['deliveryRecords', { id: uid('dr-1'), purchaseOrderId: uid('po-1'), deliveryNote: 'DN-001', status: 'delivered', deliveryDate: '2026-07-10', receivedBy: 'Site Manager', items: [], notes: '', createdAt: now }],
    ['changeOrders', { id: uid('co-1'), projectId: TEST_PROJECT_ID, title: 'Additional wall', description: 'Add partition wall', status: 'approved', category: 'variation', createdAt: now, updatedAt: now, approvedBy: 'PM', approvedAt: now, budgetImpactCents: 5000, reason: 'Client request', linkedBOQLineIds: [], changeOrderNumber: 'CO-001', requestedBy: 'Client', submittedBy: 'PM', scopeChange: '', scheduleImpactDays: 0, reviewedBy: '', rejectedReason: '' }],
    ['rfis', { id: uid('rfi-1'), projectId: TEST_PROJECT_ID, title: 'Structural query', description: 'Beam size question', status: 'open', createdAt: now, updatedAt: now, assignedTo: 'Engineer', priority: 'medium', category: 'structural', rfiNumber: 'RFI-001', submittedBy: 'Site', responseStatus: 'pending', responseDueDate: now }],
    ['submittals', { id: uid('subm-1'), projectId: TEST_PROJECT_ID, title: 'Rebar shop drawings', status: 'approved', createdAt: now, updatedAt: now, submittalNumber: 'SUB-001', description: '', category: 'shop-drawing', submittedBy: 'Contractor', specificationSection: '', revision: '0', dueDate: now, actualDate: now, reviewedBy: '', reviewNotes: '' }],
    ['siteInspections', { id: uid('si-1'), projectId: TEST_PROJECT_ID, title: 'Foundation inspection', status: 'passed', inspectionType: 'structural', createdAt: now, updatedAt: now, inspectionNumber: 'INS-001', description: '', scheduledDate: now, inspector: 'QA', location: 'Site', findings: [] }],
    ['ncrs', { id: uid('ncr-1'), projectId: TEST_PROJECT_ID, title: 'Concrete strength low', description: 'Cylinder test failed', severity: 'major', status: 'open', createdAt: now, updatedAt: now, ncrNumber: 'NCR-001', originator: 'Inspector', originatorRole: 'QA', location: 'Foundation', assignedTo: 'Contractor', linkedRfiId: '', linkedSnagId: '', linkedChangeOrderId: '', correctionDueDate: now, correctedDate: '', verifiedDate: '', verifiedBy: '', rootCause: '', correctionAction: '', preventionPlan: '', attachments: [] }],
    ['snagItems', { id: uid('snag-1'), projectId: TEST_PROJECT_ID, title: 'Paint touch-up', description: 'Scratched paint in hallway', priority: 'low', status: 'open', area: 'finishes', createdAt: now, updatedAt: now, snagNumber: 'S-001', category: 'finish', location: 'Hallway', originator: 'Inspector', originatorRole: 'QA', assignedTo: '', linkedNcrId: '', photos: [], resolutionDate: '', verifiedBy: '' }],
    ['completionStages', { id: uid('cs-1'), projectId: TEST_PROJECT_ID, stage: 'practical-completion', status: 'achieved', targetDate: '2026-05-01', conditions: [{ id: uid('cond-1'), completionStageId: uid('cs-1'), description: 'Pour test passed', met: true }], certificates: [], notes: '', createdAt: now, updatedAt: now }],
    ['snagLists', { id: uid('sl-1'), projectId: TEST_PROJECT_ID, name: 'Ground floor snags', snagItems: [], createdAt: now, updatedAt: now }],
    ['handoverPackages', { id: uid('hp-1'), projectId: TEST_PROJECT_ID, name: 'Foundation handover', recipient: 'Client', recipientType: 'client', status: 'draft', contents: [], certificateRefs: [], notes: '', createdAt: now, updatedAt: now }],
    ['assetRegister', { id: uid('ar-1'), projectId: TEST_PROJECT_ID, name: 'HVAC Unit', assetTag: 'HVAC-001', category: 'equipment', status: 'active', manufacturer: 'Carrier', model: 'X200', serialNumber: 'SN-001', installationDate: now, warrantyExpiry: '2031-07-01', expectedLifeYears: 15, location: 'Roof', maintenanceSchedule: [], documents: [], createdAt: now, updatedAt: now }],
    ['warrantyRecords', { id: uid('wr-1'), projectId: TEST_PROJECT_ID, provider: 'Carrier', warrantyType: 'manufacturer', reference: 'W-001', startDate: now, expiryDate: '2031-07-01', status: 'active', claimHistory: [], createdAt: now, updatedAt: now }],
    ['oAndMRecords', { id: uid('om-1'), projectId: TEST_PROJECT_ID, title: 'HVAC Manual', documentType: 'manual', fileRef: 'HVAC-MAN-001', system: 'HVAC', description: '', revision: '0', issueDate: now, author: 'Engineer', approvedBy: '' }],
    ['projectControlsBaselines', { id: uid('pcb-1'), projectId: TEST_PROJECT_ID, plannedBudgetCents: 5000000, plannedDurationDays: 365, plannedStartDate: '2026-01-01', milestones: [], createdAt: now, updatedAt: now, name: 'Baseline', version: 1, plannedProgressPct: 100 }],
    ['projectControlsSnapshots', { id: uid('pcs-1'), projectId: TEST_PROJECT_ID, snapshotDate: now, actualCostCents: 4800000, earnedValueCents: 4900000, plannedValueCents: 5000000, scheduleVariance: -2, costVariance: 2, budgetUtilizationPct: 96, alertConditions: [], delayFlags: [], createdAt: now, updatedAt: now, spi: 0.98, cpi: 1.02, plannedProgressPct: 50, actualProgressPct: 48, costPerformanceIndex: 1.02, schedulePerformanceIndex: 0.98, baselineId: uid('bl') }],
  ]
  for (const [table, record] of records) {
    await (db.table(table) as { put: (r: Record<string, unknown>) => Promise<unknown> }).put(record)
  }
}

beforeAll(async () => {
  await db.open()
  await seedAllTables()
})

afterAll(async () => {
  db.close()
})

describe('projectExportImportService', () => {
  it('exportProjectPackage returns a Blob for a valid project', async () => {
    const blob = await exportProjectPackage(TEST_PROJECT_ID)
    expect(blob).not.toBeNull()
    expect(blob!.type).toBe('application/json')
  })

  it('exportProjectPackage returns null for missing project', async () => {
    const blob = await exportProjectPackage('nonexistent')
    expect(blob).toBeNull()
  })

  it('importProjectPackage restores project data from exported blob', async () => {
    const blob = await exportProjectPackage(TEST_PROJECT_ID)
    expect(blob).not.toBeNull()

    await db.projects.clear()
    await db.briefs.clear()
    await db.designs.clear()
    await db.boqs.clear()
    await db.transactions.clear()
    await db.cadDocs.clear()
    await db.bimModels.clear()
    await db.governance.clear()
    await db.snapshots.clear()
    await db.planModels.clear()
    await db.projectIntakes.clear()
    await db.feasibilityAssessments.clear()
    await db.riskGates.clear()
    await db.riskRegister.clear()
    await db.solvencyChecks.clear()
    await db.milestones.clear()
    await db.contractorProfiles.clear()
    await db.subcontractorProfiles.clear()
    await db.supplierProfiles.clear()
    await db.consultantProfiles.clear()
    await db.procurementRequests.clear()
    await db.supplierQuotes.clear()
    await db.purchaseOrders.clear()
    await db.deliveryRecords.clear()
    await db.changeOrders.clear()
    await db.rfis.clear()
    await db.submittals.clear()
    await db.siteInspections.clear()
    await db.ncrs.clear()
    await db.snagItems.clear()
    await db.completionStages.clear()
    await db.snagLists.clear()
    await db.handoverPackages.clear()
    await db.assetRegister.clear()
    await db.warrantyRecords.clear()
    await db.oAndMRecords.clear()
    await db.projectControlsBaselines.clear()
    await db.projectControlsSnapshots.clear()

    const importedId = await importProjectPackage(blob!)
    expect(importedId).toBe(TEST_PROJECT_ID)

    const project = await db.projects.get(TEST_PROJECT_ID)
    expect(project).not.toBeUndefined()
    expect(project!.name).toBe('Export Test Project')

    const brief = await db.briefs.get(TEST_PROJECT_ID)
    expect(brief).not.toBeUndefined()
    expect(brief!.parsed.location).toBe('harare')

    const designs = await db.designs.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(designs.length).toBeGreaterThan(0)

    const milestones = await db.milestones.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(milestones.length).toBe(1)
    expect(milestones[0].name).toBe('Design Complete')

    const procurementReqs = await db.procurementRequests.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(procurementReqs.length).toBe(1)
    expect(procurementReqs[0].title).toBe('Steel order')

    const supplierQuotes = await db.supplierQuotes.toArray()
    expect(supplierQuotes.length).toBe(1)
    expect(supplierQuotes[0].supplierName).toBe('Test Supplier')

    const pos = await db.purchaseOrders.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(pos.length).toBe(1)

    const deliveryRecords = await db.deliveryRecords.toArray()
    expect(deliveryRecords.length).toBe(1)

    const changeOrders = await db.changeOrders.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(changeOrders.length).toBe(1)

    const rfis = await db.rfis.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(rfis.length).toBe(1)

    const submittals = await db.submittals.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(submittals.length).toBe(1)

    const inspections = await db.siteInspections.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(inspections.length).toBe(1)

    const ncrs = await db.ncrs.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(ncrs.length).toBe(1)

    const snagItems = await db.snagItems.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(snagItems.length).toBe(1)

    const stages = await db.completionStages.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(stages.length).toBe(1)

    const packages = await db.handoverPackages.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(packages.length).toBe(1)

    const assets = await db.assetRegister.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(assets.length).toBe(1)

    const warranties = await db.warrantyRecords.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(warranties.length).toBe(1)

    const oms = await db.oAndMRecords.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(oms.length).toBe(1)

    const baselines = await db.projectControlsBaselines.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(baselines.length).toBe(1)

    const snapshots = await db.projectControlsSnapshots.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(snapshots.length).toBe(1)

    const intakes = await db.projectIntakes.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(intakes.length).toBe(1)

    const feas = await db.feasibilityAssessments.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(feas.length).toBe(1)

    const gates = await db.riskGates.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(gates.length).toBe(1)

    const risks = await db.riskRegister.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(risks.length).toBe(1)

    const solvency = await db.solvencyChecks.where({ projectId: TEST_PROJECT_ID }).toArray()
    expect(solvency.length).toBe(1)
  })

  it('importProjectPackage returns null for invalid data', async () => {
    const badBlob = new Blob(['not-json'], { type: 'application/json' })
    const result = await importProjectPackage(badBlob)
    expect(result).toBeNull()
  })

  it('importProjectPackage returns null for incomplete data', async () => {
    const badBlob = new Blob([JSON.stringify({ version: 1 })], { type: 'application/json' })
    const result = await importProjectPackage(badBlob)
    expect(result).toBeNull()
  })
})
