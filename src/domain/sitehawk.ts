/**
 * Site Hawk (Project Control pillar) domain records.
 * P1 Critical Path · P2 Mobilization · P3 Digital Twin · P4 Escrow Release · P5 Variation Vault · P6 WIPAA & Handover
 * Money in integer cents (repo convention).
 */

export type LensName = 'red-pen' | 'wipaa' | 'true-ledger' | 'budget-engineer';

export interface WbsDictionaryEntry {
  id: string;
  projectId: string;
  code: string;
  level: number;
  name: string;
  category: string;
  parent: string | null;
}

export interface ScheduleRecord {
  id: string;
  projectId: string;
  task: string;
  wbsCode: string;
  startDate: string;
  durationDays: number;
  predecessors: string[];
  critical: boolean;
  costCents: number;
}

export interface CriticalPathResult {
  schedule: ScheduleRecord[];
  criticalPath: string[];
  totalDurationDays: number;
}

export interface ResourceScheduleRow {
  id: string;
  projectId: string;
  date: string;
  trade: string;
  labourHours: number;
  crewSize: number;
  autoCodedWbs: string;
  costCents: number;
}

export interface LogisticsRecord {
  id: string;
  projectId: string;
  orderId: string | null;
  supplierName: string;
  material: string;
  status: 'ordered' | 'in-transit' | 'arrived' | 'delivered';
  etaDays: number;
  geofenced: boolean;
  geofenceName: string | null;
  updatedAt: string;
}

export interface RealTimeJobCosting {
  totalCents: number;
  labourCents: number;
  materialCents: number;
  equipmentCents: number;
  byWbs: Record<string, number>;
}

export interface DigitalTwinTimelineEntry {
  id: string;
  projectId: string;
  milestoneId: string | null;
  capturedAt: string;
  geoLat: number;
  geoLng: number;
  note: string;
  progressPct: number;
  status: 'verified' | 'pending' | 'rejected';
  photoDataUrl?: string;
  photoName?: string;
  thumbnailUrl?: string;
}

export interface VerificationReport {
  id: string;
  projectId: string;
  milestoneId: string | null;
  method: 'ai-vision' | 'drone' | 'manual';
  verdict: 'pass' | 'fail' | 'inconclusive';
  confidence: number;
  details: string;
  createdAt: string;
}

export type EscrowMilestoneState = 'pending' | 'verified' | 'released' | 'disputed' | 'appeal';

export interface EscrowMilestoneRecord {
  id: string;
  projectId: string;
  escrowId: string | null;
  milestoneName: string;
  amountCents: number;
  status: EscrowMilestoneState;
  releaseDate: string | null;
  createdAt: string;
}

export interface EscrowReleaseRecord {
  id: string;
  projectId: string;
  milestoneId: string;
  amountCents: number;
  releasedAt: string;
  releasedBy: 'auto' | 'qs' | 'architect' | 'system';
  proofRef: string;
}

export interface VariationPenalty {
  id: string;
  projectId: string;
  changeOrderId: string | null;
  lens: LensName;
  impactCents: number;
  penaltyCents: number;
  riskFlags: string[];
  createdAt: string;
}

export interface VariationImpact {
  changeOrderId: string | null;
  declaredImpactCents: number;
  recommendedCents: number;
  penalties: VariationPenalty[];
  reversalWarning: string | null;
  spreadCents: number;
}

// ── P1 Risk Register ──────────────────────────────────────────────────────

export type RiskProbability = 'low' | 'medium' | 'high' | 'critical';
export type RiskImpact = 'negligible' | 'minor' | 'moderate' | 'major' | 'severe';
export type RiskStatus = 'open' | 'mitigated' | 'closed' | 'accepted';

export interface RiskRegisterEntry {
  id: string;
  projectId: string;
  code: string;
  category: string;
  description: string;
  probability: RiskProbability;
  impact: RiskImpact;
  score: number;
  status: RiskStatus;
  owner: string;
  mitigation: string;
  contingencyCents: number;
  createdAt: string;
}

// ── P1 Schedule of Values ─────────────────────────────────────────────────

export interface SovLineItem {
  id: string;
  projectId: string;
  wbsCode: string;
  description: string;
  unit: string;
  quantity: number;
  rateCents: number;
  amountCents: number;
  schedulePct: number;
  earnedCents: number;
  retainedCents: number;
}

// ── P1 Cashflow Projection ────────────────────────────────────────────────

export interface CashflowProjectionMonth {
  monthKey: string;
  label: string;
  plannedInflowCents: number;
  plannedOutflowCents: number;
  netCents: number;
  cumulativeNetCents: number;
}

export interface CashflowProjectionResult {
  months: CashflowProjectionMonth[];
  totalInflowCents: number;
  totalOutflowCents: number;
  nextCashflowDate: string;
  nextCashflowCents: number;
}

// ── P2 Equipment & Machine Scheduling ────────────────────────────────────

export type EquipmentStatus = 'scheduled' | 'on-site' | 'in-use' | 'demob';

export interface EquipmentSlot {
  id: string;
  projectId: string;
  equipmentType: string;
  description: string;
  operatorName: string | null;
  scheduledDate: string;
  durationDays: number;
  wbsCode: string;
  costCents: number;
  status: EquipmentStatus;
}

// ── P2 Fleet / Truck GPS Tracking ────────────────────────────────────────

export type TruckStatus = 'en-route' | 'at-gate' | 'unloading' | 'departed';

export interface TruckLocation {
  id: string;
  orderId: string;
  truckId: string;
  driverName: string;
  supplierName: string;
  material: string;
  lat: number;
  lng: number;
  heading: number;
  speedKmh: number;
  lastPing: string;
  geofenced: boolean;
  geofenceRadiusM: number;
  etaMinutes: number;
  status: TruckStatus;
}

export type DriverStatus = 'idle' | 'en-route' | 'delivering' | 'off-duty';

export interface FleetDriver {
  id: string;
  projectId: string;
  name: string;
  phone: string;
  truckId: string;
  licenseClass: string;
  status: DriverStatus;
  deliveriesCompleted: number;
  totalDistanceKm: number;
}

// ── P2 Procurement / PO / Invoice ────────────────────────────────────────

export type PoStatus = 'draft' | 'issued' | 'received' | 'invoiced' | 'paid';

export interface PurchaseOrderRecord {
  id: string;
  projectId: string;
  poNumber: string;
  supplierName: string;
  material: string;
  quantity: number;
  unit: string;
  unitCostCents: number;
  totalCostCents: number;
  status: PoStatus;
  issuedAt: string | null;
  receivedAt: string | null;
  invoiceRef: string | null;
  createdAt: string;
}

export type InvoiceStatus = 'received' | 'matched' | 'approved' | 'paid';

export interface InvoiceRecord {
  id: string;
  projectId: string;
  invoiceRef: string;
  poId: string | null;
  supplierName: string;
  amountCents: number;
  taxCents: number;
  totalCents: number;
  status: InvoiceStatus;
  receivedAt: string;
  approvedAt: string | null;
}

// ── WIPAA (existing) ─────────────────────────────────────────────────────

export type WipaaAlertLevel = 'green' | 'amber' | 'red';

export interface WipaaEntry {
  id: string;
  projectId: string;
  monthKey: string;
  billedCents: number;
  incurredCents: number;
  revenueEarnedCents: number;
  overUnderBilledCents: number;
  status: 'on-track' | 'under-billed' | 'over-billed';
  escalationPct: number;
  alertLevel: WipaaAlertLevel;
  createdAt: string;
}

// ── P3 Digital Twin — Inspection Checklist ─────────────────────────────────

export type InspectionCategory = 'structural' | 'mep' | 'roof' | 'final';

export interface InspectionChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  note?: string;
}

export interface InspectionChecklist {
  id: string;
  projectId: string;
  category: InspectionCategory;
  milestoneName: string;
  items: InspectionChecklistItem[];
  signedOff: boolean;
  signedOffBy: string | null;
  signedOffAt: string | null;
  createdAt: string;
}

// ── P3 Digital Twin — Progress Status ──────────────────────────────────────

export interface ProgressStatus {
  completionPct: number;
  spentToDateCents: number;
  budgetCents: number;
  varianceCents: number;
  grossMarginPct: number;
  wipaaStatus: 'on-track' | 'under-billed' | 'over-billed' | null;
  milestoneName: string;
  milestoneStatus: 'verified' | 'pending' | 'rejected';
}

// ── P3 Digital Twin — Computer Vision Match ────────────────────────────────

export interface CvMatchResult {
  matched: boolean;
  confidence: number;
  matchedFeatures: string[];
  mismatchedFeatures: string[];
  photoNote: string;
  workingDrawingRef: string;
}