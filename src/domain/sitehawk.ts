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