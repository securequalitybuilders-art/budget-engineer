import Dexie, { type Table } from 'dexie';
import type { Project, Brief, Design, BOQ, ProjectTransaction, Rate } from '@/types';
import type { CadDocument } from '@/domain/cad';
import type { BimModel } from '@/domain/bim';
import type { GovernanceRecord } from '@/domain/governance';
import type { ProjectSnapshot } from '@/domain/versioning';
import type { PlanModel } from '@/domain/plan';
import type { DeliveryProject } from '@/domain/delivery';
import type { ProjectIntake, FeasibilityAssessment, RiskGate, RiskRegisterEntry, SolvencyCheck } from '@/domain/assurance';
import type { Milestone } from '@/domain/milestone';
import type { ContractorProfile, SubcontractorProfile, SupplierProfile, ConsultantProfile } from '@/domain/contractor';
import type { ProcurementRequest, SupplierQuote, PurchaseOrder, DeliveryRecord } from '@/domain/procurement';
import type { ChangeOrder, RFI, Submittal, SiteInspection, NCR, SnagItem } from '@/domain/change';
import type { CompletionStage, SnagList, HandoverPackage, AssetRegisterItem, WarrantyRecord, OAndMRecord } from '@/domain/handover';
import type { ProjectControlsBaseline, ProjectControlsSnapshot } from '@/domain/projectControls';

export class BudgetEngineerDB extends Dexie {
  projects!: Table<Project, string>;
  briefs!: Table<Brief, string>;
  designs!: Table<Design, string>;
  boqs!: Table<BOQ, string>;
  transactions!: Table<ProjectTransaction, string>;
  rates!: Table<Rate, string>;
  cadDocs!: Table<CadDocument, string>;
  bimModels!: Table<BimModel, string>;
  governance!: Table<GovernanceRecord, string>;
  snapshots!: Table<ProjectSnapshot, string>;
  planModels!: Table<PlanModel & { projectId: string; designId: string; savedAt: string }, string>;

  projectIntakes!: Table<ProjectIntake, string>;
  feasibilityAssessments!: Table<FeasibilityAssessment, string>;
  riskGates!: Table<RiskGate, string>;
  riskRegister!: Table<RiskRegisterEntry, string>;
  solvencyChecks!: Table<SolvencyCheck, string>;
  milestones!: Table<Milestone, string>;
  contractorProfiles!: Table<ContractorProfile, string>;
  subcontractorProfiles!: Table<SubcontractorProfile, string>;
  supplierProfiles!: Table<SupplierProfile, string>;
  consultantProfiles!: Table<ConsultantProfile, string>;
  procurementRequests!: Table<ProcurementRequest, string>;
  supplierQuotes!: Table<SupplierQuote, string>;
  purchaseOrders!: Table<PurchaseOrder, string>;
  deliveryRecords!: Table<DeliveryRecord, string>;
  changeOrders!: Table<ChangeOrder, string>;
  rfis!: Table<RFI, string>;
  submittals!: Table<Submittal, string>;
  siteInspections!: Table<SiteInspection, string>;
  ncrs!: Table<NCR, string>;
  snagItems!: Table<SnagItem, string>;
  completionStages!: Table<CompletionStage, string>;
  snagLists!: Table<SnagList, string>;
  handoverPackages!: Table<HandoverPackage, string>;
  assetRegister!: Table<AssetRegisterItem, string>;
  warrantyRecords!: Table<WarrantyRecord, string>;
  oAndMRecords!: Table<OAndMRecord, string>;
  projectControlsBaselines!: Table<ProjectControlsBaseline, string>;
  projectControlsSnapshots!: Table<ProjectControlsSnapshot, string>;
  deliveryProjects!: Table<DeliveryProject, string>;

  constructor() {
    super('BudgetEngineerDB');
    this.version(1).stores({
      projects: 'id, [ownerId+status], updatedAt',
      briefs: 'projectId',
      designs: 'id, projectId, [projectId+optionIndex]',
      boqs: 'id, projectId, designId',
      transactions: 'id, [projectId+createdAt], entityType',
      rates: 'id, [region+code], source',
    });
    this.version(2).stores({
      projects: 'id, [ownerId+status], updatedAt',
      briefs: 'projectId',
      designs: 'id, projectId, [projectId+optionIndex]',
      boqs: 'id, projectId, designId',
      transactions: 'id, [projectId+createdAt], entityType',
      rates: 'id, [region+code], source',
      cadDocs: 'id,name,projectId',
      bimModels: 'id,name,projectId',
    });
    this.version(3).stores({
      projects: 'id, [ownerId+status], updatedAt',
      briefs: 'projectId',
      designs: 'id, projectId, [projectId+optionIndex]',
      boqs: 'id, projectId, designId',
      transactions: 'id, [projectId+createdAt], entityType',
      rates: 'id, [region+code], source',
      cadDocs: 'id,name,projectId',
      bimModels: 'id,name,projectId',
      governance: 'projectId,approvalState,lastUpdated',
      snapshots: 'id,timestamp,name,projectId',
    });
    this.version(4).stores({
      projects: 'id, [ownerId+status], updatedAt',
      briefs: 'projectId',
      designs: 'id, projectId, [projectId+optionIndex]',
      boqs: 'id, projectId, designId',
      transactions: 'id, [projectId+createdAt], entityType',
      rates: 'id, [region+code], source',
      cadDocs: 'id,name,projectId',
      bimModels: 'id,name,projectId',
      governance: 'projectId,approvalState,lastUpdated',
      snapshots: 'id,timestamp,name,projectId',
      planModels: 'id,projectId,designId,savedAt',
    });
    this.version(5).stores({
      projects: 'id, [ownerId+status], updatedAt',
      briefs: 'projectId',
      designs: 'id, projectId, [projectId+optionIndex]',
      boqs: 'id, projectId, designId',
      transactions: 'id, [projectId+createdAt], entityType',
      rates: 'id, [region+code], source',
      cadDocs: 'id,name,projectId',
      bimModels: 'id,name,projectId',
      governance: 'projectId,approvalState,lastUpdated',
      snapshots: 'id,timestamp,name,projectId',
      planModels: 'id,projectId,designId,savedAt',
      projectIntakes: 'id,projectId,status',
      feasibilityAssessments: 'id,projectId',
      riskGates: 'id,projectId,gateType,status',
      riskRegister: 'id,projectId,category,status',
      solvencyChecks: 'id,projectId',
      milestones: 'id,projectId,releaseState,category',
      contractorProfiles: 'id,trade,verificationState',
      subcontractorProfiles: 'id,contractorId',
      supplierProfiles: 'id,category,verificationState',
      consultantProfiles: 'id,discipline',
      procurementRequests: 'id,projectId,status',
      supplierQuotes: 'id,procurementRequestId,supplierId',
      purchaseOrders: 'id,projectId,status',
      deliveryRecords: 'id,purchaseOrderId',
      changeOrders: 'id,projectId,status,category',
      rfis: 'id,projectId,status,assignedTo',
      submittals: 'id,projectId,status',
      siteInspections: 'id,projectId,status,inspectionType',
      ncrs: 'id,projectId,severity,status',
      snagItems: 'id,projectId,priority,status',
      completionStages: 'id,projectId,stage,status',
      snagLists: 'id,projectId',
      handoverPackages: 'id,projectId,status',
      assetRegister: 'id,projectId,category,status',
      warrantyRecords: 'id,projectId,warrantyType,status',
      oAndMRecords: 'id,projectId',
      projectControlsBaselines: 'id,projectId',
      projectControlsSnapshots: 'id,projectId,snapshotDate',
    });
    this.version(6).stores({
      projects: 'id, [ownerId+status], updatedAt',
      briefs: 'projectId',
      designs: 'id, projectId, [projectId+optionIndex]',
      boqs: 'id, projectId, designId',
      transactions: 'id, [projectId+createdAt], entityType',
      rates: 'id, [region+code], source',
      cadDocs: 'id,name,projectId',
      bimModels: 'id,name,projectId',
      governance: 'projectId,approvalState,lastUpdated',
      snapshots: 'id,timestamp,name,projectId',
      planModels: 'id,projectId,designId,savedAt',
      projectIntakes: 'id,projectId,status',
      feasibilityAssessments: 'id,projectId',
      riskGates: 'id,projectId,gateType,status',
      riskRegister: 'id,projectId,category,status',
      solvencyChecks: 'id,projectId',
      milestones: 'id,projectId,releaseState,category',
      contractorProfiles: 'id,projectId,trade,verificationState',
      subcontractorProfiles: 'id,projectId,contractorId',
      supplierProfiles: 'id,projectId,category,verificationState',
      consultantProfiles: 'id,projectId,discipline',
      procurementRequests: 'id,projectId,status',
      supplierQuotes: 'id,projectId,procurementRequestId,supplierId',
      purchaseOrders: 'id,projectId,status',
      deliveryRecords: 'id,projectId,purchaseOrderId',
      deliveryProjects: 'id,projectId',
      changeOrders: 'id,projectId,status,category',
      rfis: 'id,projectId,status,assignedTo',
      submittals: 'id,projectId,status',
      siteInspections: 'id,projectId,status,inspectionType',
      ncrs: 'id,projectId,severity,status',
      snagItems: 'id,projectId,priority,status',
      completionStages: 'id,projectId,stage,status',
      snagLists: 'id,projectId',
      handoverPackages: 'id,projectId,status',
      assetRegister: 'id,projectId,category,status',
      warrantyRecords: 'id,projectId,warrantyType,status',
      oAndMRecords: 'id,projectId',
      projectControlsBaselines: 'id,projectId',
      projectControlsSnapshots: 'id,projectId,snapshotDate',
    });
  }
}

export const db = new BudgetEngineerDB();

/**
 * Seed a minimal Zimbabwe/CWICR-style rate catalogue for offline demos.
 * In production, this table is populated from OpenConstructionEstimate-DDC-CWICR
 * and regional overrides.
 */
export async function seedRates(): Promise<void> {
  const count = await db.rates.count();
  if (count > 0) return;

  const now = new Date().getFullYear();
  const rates: Rate[] = [
    { id: 'cement-50kg', region: 'zimbabwe', code: 'MAT-CEM-001', description: 'Portland cement, 50kg bag', unit: 'bag', baseRateCents: 1850, source: 'zimbabwe', year: now },
    { id: 'brick-common', region: 'zimbabwe', code: 'MAT-BRK-001', description: 'Common clay brick', unit: 'each', baseRateCents: 25, source: 'zimbabwe', year: now },
    { id: 'steel-rebar-12mm', region: 'zimbabwe', code: 'MAT-STL-001', description: 'High tensile steel rebar 12mm', unit: 'm', baseRateCents: 450, source: 'zimbabwe', year: now },
    { id: 'timber-50x100', region: 'zimbabwe', code: 'MAT-TIM-001', description: 'Sawn timber 50x100mm', unit: 'm', baseRateCents: 320, source: 'zimbabwe', year: now },
    { id: 'roof-sheet', region: 'zimbabwe', code: 'MAT-Roof-001', description: 'Corrugated galvanized iron sheet', unit: 'm2', baseRateCents: 1200, source: 'zimbabwe', year: now },
    { id: 'paint-latex', region: 'zimbabwe', code: 'MAT-PNT-001', description: 'Latex interior paint', unit: 'l', baseRateCents: 850, source: 'zimbabwe', year: now },
    { id: 'concrete-slab', region: 'zimbabwe', code: 'MAT-CON-SLAB', description: 'Reinforced concrete slab supply & place', unit: 'm2', baseRateCents: 8500, source: 'zimbabwe', year: now },
    { id: 'aluminium-window', region: 'zimbabwe', code: 'MAT-WIN-001', description: 'Aluminium window frame + glass', unit: 'm2', baseRateCents: 15000, source: 'zimbabwe', year: now },
    { id: 'timber-door', region: 'zimbabwe', code: 'MAT-DOR-001', description: 'Timber flush door', unit: 'each', baseRateCents: 12000, source: 'zimbabwe', year: now },
    { id: 'solar-panel', region: 'zimbabwe', code: 'MAT-SOL-001', description: 'Solar PV panel system', unit: 'm2', baseRateCents: 20000, source: 'zimbabwe', year: now },
    { id: 'labour-bricklayer', region: 'zimbabwe', code: 'LAB-BRK-001', description: 'Bricklayer labour', unit: 'hr', baseRateCents: 180, source: 'zimbabwe', year: now },
    { id: 'labour-carpenter', region: 'zimbabwe', code: 'LAB-CAR-001', description: 'Carpenter labour', unit: 'hr', baseRateCents: 200, source: 'zimbabwe', year: now },
  ];

  await db.rates.bulkAdd(rates);
}
