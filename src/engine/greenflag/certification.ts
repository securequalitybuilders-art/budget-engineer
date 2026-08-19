/**
 * C3 Green Flag Certification & Vetting engine.
 * KYC/AML credential checklist, SI 56/2025 Architect Registry validation,
 * product certifications (SAZ/ISO), role-specific certifications (video + TCO),
 * public scorecard, and silver/gold/platinum tier with dual-source rebates.
 */
import type {
  ContractorScorecard,
  SupplierScorecard,
  ScoreTier,
  ProductCertification,
  RoleCertRequirement,
  PublicScorecard,
  RebateTierConfig,
} from '@/domain/greenflag';
import { lookupArchitect } from '@/engine/compliance/architectRegistry';

/* -------------------------------------------------------------------------- */
/*  9-point KYC/AML credential checklist                                      */
/* -------------------------------------------------------------------------- */

export const CREDENTIAL_CHECKS: Array<{ id: string; label: string; points: number }> = [
  { id: 'company-registration', label: 'Company Registration', points: 10 },
  { id: 'tax-clearance', label: 'Tax Clearance', points: 10 },
  { id: 'zimra', label: 'ZIMRA Compliance', points: 10 },
  { id: 'bank-details', label: 'Verified Bank Details', points: 10 },
  { id: 'insurance', label: 'Public Liability Insurance', points: 10 },
  { id: 'architect-registry', label: 'Architect Registry License (SI 56/2025)', points: 14 },
  { id: 'praz', label: 'PRAZ Indemnity', points: 8 },
  { id: 'trade-certificates', label: 'Trade Certificates', points: 8 },
  { id: 'nssa', label: 'NSSA Clearance', points: 8 },
];

/* -------------------------------------------------------------------------- */
/*  Credential set & input                                                    */
/* -------------------------------------------------------------------------- */

export interface CredentialSet {
  companyRegistration?: boolean;
  taxClearance?: boolean;
  zimra?: boolean;
  bankDetails?: boolean;
  insurance?: boolean;
  architectRegistrationNumber?: string;
  prazIndemnity?: boolean;
  tradeCertificates?: boolean;
  nssa?: boolean;
}

export interface CertificationInput {
  projectId: string;
  entityId: string;
  entityName: string;
  credentials: CredentialSet;
  rating: number;
  projectCount: number;
  onTimeDeliveryPct: number;
  wipaaPct?: number;
  qualityPct?: number;
  reviewCount?: number;
  kind: 'contractor' | 'supplier';
  now?: Date;
}

export interface CertificationResult {
  score: number;
  tier: ScoreTier;
  checks: string[];
  verified: boolean;
  architectRegistered: boolean;
  architectName: string | null;
  rebatePct: number;
  /** Public scorecard snapshot for the certified entity */
  publicScorecard: PublicScorecard;
}

/* -------------------------------------------------------------------------- */
/*  Tier thresholds                                                           */
/* -------------------------------------------------------------------------- */

export const TIER_THRESHOLDS: Record<ScoreTier, number> = { silver: 60, gold: 80, platinum: 90 };

export function tierForScore(score: number): ScoreTier {
  if (score >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (score >= TIER_THRESHOLDS.gold) return 'gold';
  return 'silver';
}

/* -------------------------------------------------------------------------- */
/*  Dual-source rebates (SADC market index + group-buy aggregator)            */
/*  Dollar-based tier config per spec:                                        */
/*    Silver  $50k–$100k  →  0.50% + 0.25% = 0.75%                         */
/*    Gold    $100k–$250k →  0.75% + 0.50% = 1.25%                         */
/*    Platinum $250k+      →  1.00% + 0.75% = 1.75%                         */
/* -------------------------------------------------------------------------- */

export const REBATE_TIERS: RebateTierConfig[] = [
  { tier: 'silver', minContractDollars: 50_000, maxContractDollars: 100_000, marketIndexPct: 0.50, groupBuyPct: 0.25, totalPct: 0.75 },
  { tier: 'gold', minContractDollars: 100_000, maxContractDollars: 250_000, marketIndexPct: 0.75, groupBuyPct: 0.50, totalPct: 1.25 },
  { tier: 'platinum', minContractDollars: 250_000, maxContractDollars: null, marketIndexPct: 1.00, groupBuyPct: 0.75, totalPct: 1.75 },
];

/** Base rebate for a tier (ignoring contract-value override). */
export function rebateForTier(tier: ScoreTier): number {
  if (tier === 'platinum') return 1.75;
  if (tier === 'gold') return 1.25;
  return 0.75;
}

/**
 * Compute the effective rebate for a given tier AND contract value in dollars.
 * Falls back to the tier base when the contract value is outside the bracket.
 */
export function rebateForContract(tier: ScoreTier, contractDollars: number): RebateTierConfig {
  const match = REBATE_TIERS.find(
    (t) => t.tier === tier && contractDollars >= t.minContractDollars && (t.maxContractDollars === null || contractDollars < t.maxContractDollars),
  );
  return match ?? REBATE_TIERS.find((t) => t.tier === tier)!;
}

/* -------------------------------------------------------------------------- */
/*  Product certifications (SAZ / ISO / SABS / BSI / CE)                      */
/* -------------------------------------------------------------------------- */

export interface ProductCertInput {
  projectId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  standard: ProductCertification['standard'];
  standardNumber: string;
  description: string;
  now?: Date;
}

/** Well-known SAZ-certified Zimbabwe construction materials. */
export const SAZ_CERTIFIED_PRODUCTS: Array<{ name: string; standard: ProductCertification['standard']; number: string; description: string }> = [
  { name: 'Willdale Face Bricks', standard: 'SAZ', number: 'SAZ 72', description: 'Compressive strength ≥ 7 MPa, common brick per ZWS 72' },
  { name: 'Sino Cement 50kg', standard: 'SAZ', number: 'SAZ 146', description: 'Portland cement CEM II/B-M 32.5N per SANS 50131' },
  { name: 'PG Glass Float 4mm', standard: 'SABS', number: 'SANS 1263-1', description: 'Safety glass for fenestration, EN 12600 Class 2(B)2' },
  { name: 'Davis Doors flush 35mm', standard: 'SABS', number: 'SANS 1841', description: 'Timber flush door, Grade 3 internal' },
  { name: 'Willdale Bricks Non-Facing', standard: 'SAZ', number: 'SAZ 72', description: 'Non-facing common brick, compressive strength ≥ 5 MPa' },
  { name: 'Sino Cement PPC 42.5N', standard: 'SAZ', number: 'SAZ 146', description: 'Portland composite cement, high early strength' },
];

export function createProductCert(input: ProductCertInput): ProductCertification {
  return {
    id: `pc-${input.projectId}-${input.supplierId}-${input.standard.toLowerCase()}`,
    projectId: input.projectId,
    productName: input.productName,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    standard: input.standard,
    standardNumber: input.standardNumber,
    description: input.description,
    verified: true,
    verifiedAt: (input.now ?? new Date()).toISOString(),
  };
}

/** Auto-verify a product against the SAZ certified list. */
export function autoVerifyProduct(productName: string, projectId: string, now?: Date): ProductCertification | null {
  const match = SAZ_CERTIFIED_PRODUCTS.find(
    (p) => productName.toLowerCase().includes(p.name.toLowerCase().split(' ')[0]),
  );
  if (!match) return null;
  return createProductCert({
    projectId,
    productName: match.name,
    supplierId: `auto-${match.standard.toLowerCase()}`,
    supplierName: match.name.split(' ')[0],
    standard: match.standard,
    standardNumber: match.number,
    description: match.description,
    now,
  });
}

/* -------------------------------------------------------------------------- */
/*  Role-specific certifications (15-30 min video + TCO calculator)           */
/* -------------------------------------------------------------------------- */

export const ROLE_CERTIFICATIONS: RoleCertRequirement[] = [
  { id: 'rc-general-builder', role: 'general-builder', label: 'General Builder', videoMinutes: 20, tcoRequired: true, completed: false, completedAt: null },
  { id: 'rc-structural', role: 'structural', label: 'Structural & Earthworks', videoMinutes: 25, tcoRequired: true, completed: false, completedAt: null },
  { id: 'rc-mep', role: 'mep', label: 'Specialist Mechanical & HVAC', videoMinutes: 30, tcoRequired: true, completed: false, completedAt: null },
  { id: 'rc-electrical', role: 'electrical', label: 'Renewable Energy & High Voltage', videoMinutes: 25, tcoRequired: false, completed: false, completedAt: null },
  { id: 'rc-finishing', role: 'finishing', label: 'Finishing & Fit-Out', videoMinutes: 15, tcoRequired: false, completed: false, completedAt: null },
  { id: 'rc-waterproofing', role: 'waterproofing', label: 'Protection & Waterproofing', videoMinutes: 20, tcoRequired: true, completed: false, completedAt: null },
  { id: 'rc-facade', role: 'facade', label: 'Facade & Fenestration', videoMinutes: 25, tcoRequired: true, completed: false, completedAt: null },
];

export function markRoleComplete(roleId: string, now?: Date): RoleCertRequirement[] {
  const ts = (now ?? new Date()).toISOString();
  return ROLE_CERTIFICATIONS.map((r): RoleCertRequirement => (r.id === roleId ? { ...r, completed: true, completedAt: ts } : { ...r }));
}

export function roleCompletionCount(roles: RoleCertRequirement[]): { completed: number; total: number; pct: number } {
  const completed = roles.filter((r) => r.completed).length;
  const total = roles.length;
  return { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

/* -------------------------------------------------------------------------- */
/*  Public scorecard builder                                                  */
/* -------------------------------------------------------------------------- */

export function buildPublicScorecard(input: CertificationInput, tier: ScoreTier, rebatePct: number): PublicScorecard {
  return {
    id: `ps-${input.projectId}-${input.entityId}`,
    projectId: input.projectId,
    entityId: input.entityId,
    entityName: input.entityName,
    onTimePct: Math.min(Math.max(input.onTimeDeliveryPct, 0), 100),
    qualityPct: Math.min(Math.max(input.qualityPct ?? input.onTimeDeliveryPct, 0), 100),
    wipaaHealthPct: Math.min(Math.max(input.wipaaPct ?? 0, 0), 100),
    projectCount: Math.max(input.projectCount, 0),
    reviewCount: Math.max(input.reviewCount ?? Math.floor(input.projectCount * 0.6), 0),
    rating: Math.min(Math.max(input.rating, 0), 5),
    tier,
    rebatePct,
    certifiedAt: (input.now ?? new Date()).toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/*  Core KYC/AML + SI 56/2025 certification                                  */
/* -------------------------------------------------------------------------- */

export function certifyEntity(input: CertificationInput): CertificationResult {
  const checks: string[] = [];
  let score = 0;
  const creds = input.credentials;

  // 1. KYC/AML credential checklist (9 points-per-item)
  if (creds.companyRegistration) { score += 10; checks.push('Company Registration'); }
  if (creds.taxClearance) { score += 10; checks.push('Tax Clearance'); }
  if (creds.zimra) { score += 10; checks.push('ZIMRA Compliance'); }
  if (creds.bankDetails) { score += 10; checks.push('Verified Bank Details'); }
  if (creds.insurance) { score += 10; checks.push('Public Liability Insurance'); }
  if (creds.prazIndemnity) { score += 8; checks.push('PRAZ Indemnity'); }
  if (creds.tradeCertificates) { score += 8; checks.push('Trade Certificates'); }
  if (creds.nssa) { score += 8; checks.push('NSSA Clearance'); }

  // 2. SI 56/2025 Architect Registry validation
  let architectRegistered = false;
  let architectName: string | null = null;
  if (creds.architectRegistrationNumber) {
    const architect = lookupArchitect(creds.architectRegistrationNumber);
    if (architect) {
      architectRegistered = true;
      architectName = architect.name;
      score += 14;
      checks.push('Architect Registry License (SI 56/2025)');
    }
  }

  // 3. Performance score (rating / project count / on-time / WIPAA)
  score += Math.round(5 * (Math.min(Math.max(input.rating, 0), 5) / 5));
  score += Math.min(5, Math.floor(input.projectCount / 5));
  score += Math.round(6 * (Math.min(Math.max(input.onTimeDeliveryPct, 0), 100) / 100));
  if (input.wipaaPct !== undefined && input.wipaaPct >= 90) score += 2;

  const finalScore = Math.min(score, 100);
  const tier = tierForScore(finalScore);
  const verified = finalScore >= TIER_THRESHOLDS.gold;

  const publicScorecard = buildPublicScorecard(input, tier, rebateForTier(tier));

  return {
    score: finalScore,
    tier,
    checks,
    verified,
    architectRegistered,
    architectName,
    rebatePct: rebateForTier(tier),
    publicScorecard,
  };
}

/* -------------------------------------------------------------------------- */
/*  Scorecard builders (persisted to Dexie)                                   */
/* -------------------------------------------------------------------------- */

export function buildContractorScorecard(input: CertificationInput): ContractorScorecard {
  const r = certifyEntity(input);
  return {
    id: `cs-${input.projectId}-${input.entityId}`,
    projectId: input.projectId,
    contractorId: input.entityId,
    contractorName: input.entityName,
    tier: r.tier,
    score: r.score,
    checks: r.checks,
    verified: r.verified,
    rebatePct: r.rebatePct,
    createdAt: (input.now ?? new Date()).toISOString(),
  };
}

export function buildSupplierScorecard(input: CertificationInput): SupplierScorecard {
  const r = certifyEntity(input);
  return {
    id: `ss-${input.projectId}-${input.entityId}`,
    projectId: input.projectId,
    supplierId: input.entityId,
    supplierName: input.entityName,
    tier: r.tier,
    score: r.score,
    verified: r.verified,
    rebatePct: r.rebatePct,
    createdAt: (input.now ?? new Date()).toISOString(),
  };
}
