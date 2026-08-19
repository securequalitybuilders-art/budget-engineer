/**
 * Green Flag Guild (Cost Clarity pillar) domain records.
 * C1 Resource Hub · C2 Team Assembly · C3 Certification · C4 Bulk Procurement · C5 Cost Lock
 * Money in integer cents (repo convention); escrow totals in dollars only at the escrow boundary.
 */

export type ResourceCategory = 'supplier' | 'contractor' | 'material' | 'service' | 'consultant';

export interface ResourceRecord {
  id: string;
  projectId: string;
  name: string;
  category: ResourceCategory;
  trade: string;
  verified: boolean;
  rating: number;
  distanceKm: number;
  baseRateCents: number;
  unit: string;
  region: string;
  source: 'market-index' | 'rag' | 'manual';
  lockedUntil: string;
  createdAt: string;
}

export interface DemandRadarEntry {
  region: string;
  quarter: string;
  material: string;
  unit: string;
  demandUnits: number;
  activeProjects: number;
  /** Latest SADC market index price in cents */
  indexPriceCents: number;
}

export interface DemandRadarReport {
  entries: DemandRadarEntry[];
  generatedAt: string;
  lockedUntil: string;
}

export type AssemblyPath = 'alone' | 'together' | 'for-them';

export interface MilestoneSplit {
  name: string;
  pct: number;
}

export interface ContractorCandidate {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  reviews: number;
  distanceKm: number;
  availableFrom: string;
  wipaaPct: number;
  trueProfitabilityPct: number;
  projectCount: number;
  avgProjectCents: number;
  verified: boolean;
}

export interface BestFitResult {
  candidate: ContractorCandidate;
  score: number;
  reasons: string[];
}

export interface TeamAssignment {
  id: string;
  projectId: string;
  path: AssemblyPath;
  contractorId: string | null;
  contractorName: string | null;
  milestoneSplit: MilestoneSplit[];
  contractRef: string;
  terms: string[];
  createdAt: string;
}

export type ScoreTier = 'silver' | 'gold' | 'platinum';

export interface ContractorScorecard {
  id: string;
  projectId: string;
  contractorId: string;
  contractorName: string;
  tier: ScoreTier;
  score: number;
  checks: string[];
  verified: boolean;
  rebatePct: number;
  createdAt: string;
}

export interface SupplierScorecard {
  id: string;
  projectId: string;
  supplierId: string;
  supplierName: string;
  tier: ScoreTier;
  score: number;
  verified: boolean;
  rebatePct: number;
  createdAt: string;
}

export interface ForwardCommitment {
  id: string;
  projectId: string;
  material: string;
  quantity: number;
  unit: string;
  priceCents: number;
  supplierId: string;
  commitmentDate: string;
  status: 'proposed' | 'locked' | 'released';
  createdAt: string;
}

export interface CostBaselineLine {
  wbsCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitCostCents: number;
  totalCents: number;
}

export interface CostBaseline {
  id: string;
  projectId: string;
  region: string;
  totalCents: number;
  contingencyCents: number;
  contingencyPct: number;
  lines: CostBaselineLine[];
  status: 'draft' | 'locked';
  lockedAt: string | null;
}

export interface BoqItem {
  id: string;
  projectId: string;
  lineIndex: number;
  wbsCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitCostCents: number;
  totalCents: number;
  source: 'boq' | 'change-order';
  changeOrderId?: string;
}

export interface RedPenVariance {
  wbsCode: string;
  description: string;
  requiredCents: number;
  quotedCents: number;
  varianceCents: number;
  unitCostCents: number;
  leakageCents: number;
  flagged: boolean;
}

export interface RedPenAuditResult {
  variances: RedPenVariance[];
  totalLeakageCents: number;
  auditDate: string;
}

export interface ValueEngineeringSuggestion {
  wbsCode: string;
  description: string;
  currentCents: number;
  suggestedCents: number;
  savingCents: number;
  rationale: string;
}

/**
 * C3 — Product certification (SAZ / ISO) for materials like Willdale bricks,
 * Sino cement, PG Glass, Davis Doors.
 */
export interface ProductCertification {
  id: string;
  projectId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  standard: 'SAZ' | 'ISO' | 'SABS' | 'BSI' | 'CE';
  standardNumber: string;
  description: string;
  verified: boolean;
  verifiedAt: string | null;
}

/**
 * C3 — Role-specific certification (15-30 min video walkthrough + TCO calculator).
 */
export interface RoleCertRequirement {
  id: string;
  role: string;
  label: string;
  videoMinutes: number;
  tcoRequired: boolean;
  completed: boolean;
  completedAt: string | null;
}

/**
 * C3 — Public scorecard for a contractor/supplier.
 * Displayed on the public profile for builder due-diligence.
 */
export interface PublicScorecard {
  id: string;
  projectId: string;
  entityId: string;
  entityName: string;
  onTimePct: number;
  qualityPct: number;
  wipaaHealthPct: number;
  projectCount: number;
  reviewCount: number;
  rating: number;
  tier: ScoreTier;
  rebatePct: number;
  certifiedAt: string;
}

/**
 * C3 — Dual-source rebate tier boundaries in contract-value dollars.
 * Silver $50-100k (0.5% + 0.25% = 0.75%),
 * Gold $100-250k (0.75% + 0.5% = 1.25%),
 * Platinum $250k+ (1.0% + 0.75% = 1.75%).
 */
export interface RebateTierConfig {
  tier: ScoreTier;
  minContractDollars: number;
  maxContractDollars: number | null;
  marketIndexPct: number;
  groupBuyPct: number;
  totalPct: number;
}

/**
 * C5 — Ghost Material: a BOQ line item billed but not verified on site.
 * Detected by cross-referencing the locked BOQ against delivery records.
 */
export interface GhostMaterial {
  id: string;
  projectId: string;
  wbsCode: string;
  description: string;
  unit: string;
  billedQuantity: number;
  deliveredQuantity: number;
  ghostQuantity: number;
  unitCostCents: number;
  ghostCostCents: number;
  severity: 'none' | 'partial' | 'total';
}

/**
 * C5 — Cash Flow Forecast: milestone-based cash flow projection from the
 * locked Cost Baseline using the 35/40/25 milestone split.
 */
export interface CashFlowMilestone {
  name: string;
  pct: number;
  amountCents: number;
  cumulativeCents: number;
  dueDate: string;
  status: 'projected' | 'funded' | 'released';
}

export interface CashFlowForecast {
  projectId: string;
  baselineId: string;
  totalCents: number;
  contingencyCents: number;
  milestones: CashFlowMilestone[];
  generatedAt: string;
}

/**
 * C5 — Must-Have item: budget allowance vs actual cost tracker.
 * Compares the builder's must-have selections against the BOQ actuals.
 */
export interface MustHaveItem {
  id: string;
  projectId: string;
  name: string;
  category: string;
  budgetAllowanceCents: number;
  actualCostCents: number;
  varianceCents: number;
  variancePct: number;
  status: 'under' | 'on-target' | 'over';
}

/**
 * C5 — Cost at a Glance: aggregated summary for the dial/gauge display.
 */
export interface CostAtGlance {
  projectId: string;
  directCostCents: number;
  contingencyCents: number;
  totalBudgetCents: number;
  spentToDateCents: number;
  committedCents: number;
  remainingCents: number;
  ghostMaterialCostCents: number;
  redPenLeakageCents: number;
  valueEngineeringSavingsCents: number;
  budgetUtilisationPct: number;
}