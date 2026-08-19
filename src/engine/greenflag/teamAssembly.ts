/**
 * C2 Team Assembly engine.
 * Three paths (Do it alone / Do it together / Do it for them), best-fit
 * contractor scoring (proximity 8km, specialization, availability, WIPAA
 * variance, true profitability, rating) and auto-generated contract terms.
 */
import type {
  AssemblyPath,
  ContractorCandidate,
  BestFitResult,
  TeamAssignment,
  MilestoneSplit,
} from '@/domain/greenflag';

export const MILESTONE_SPLIT: MilestoneSplit[] = [
  { name: 'Foundation & Bones', pct: 35 },
  { name: 'Wall Plate & Shell', pct: 40 },
  { name: 'Finishes & Keys', pct: 25 },
];

export const FORTRESS_FEE_RANGE_PCT = { min: 12, max: 15 };

export interface BestFitOptions {
  specialization: string;
  availableFrom: string;
  /** Distance cap in km — canonical 8km. */
  maxDistanceKm?: number;
}

export interface PathDefinition {
  id: AssemblyPath;
  label: string;
  description: string;
  includes: string[];
}

export const ASSEMBLY_PATHS: PathDefinition[] = [
  {
    id: 'alone',
    label: 'Do it alone',
    description: 'You orchestrate; DzeNhare equips you with the full toolbelt.',
    includes: ['P4P Calculator', 'WIPAA Monitor', 'Red Pen Audit $50', 'Ghost Materials', 'Group Buy Aggregator', 'My Must-Haves'],
  },
  {
    id: 'together',
    label: 'Do it together',
    description: 'Best-fit contractor auto-assigned from the Green Flag Guild.',
    includes: ['Best-fit contractor match', 'Contract auto-generated', 'Materials transparency'],
  },
  {
    id: 'for-them',
    label: 'Do it for them',
    description: 'Fortress turnkey — DzeNhare orchestrates the invisible workstreams.',
    includes: ['Fortress 12-15% turnkey', '10-12 clicks, ~45 minutes', 'Invisible workstream orchestration'],
  },
];

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Deterministic best-fit scoring. Weights: proximity 8km (25), specialization
 * (20), availability (15), WIPAA variance (15), true profitability (15),
 * rating (10) → max 100.
 */
export function bestFitContractor(
  candidates: ContractorCandidate[],
  opts: BestFitOptions,
): BestFitResult | null {
  if (candidates.length === 0) return null;
  const maxDistance = opts.maxDistanceKm ?? 8;
  let best: BestFitResult | null = null;
  for (const candidate of candidates) {
    const reasons: string[] = [];
    let score = 0;

    if (candidate.distanceKm <= maxDistance) {
      score += 25;
      reasons.push(`${candidate.distanceKm}km — within the ${maxDistance}km radius`);
    } else {
      score += clamp(25 - (candidate.distanceKm - maxDistance) * 2, 0, 25);
    }

    if (candidate.specialization.toLowerCase().includes(opts.specialization.toLowerCase())) {
      score += 20;
      reasons.push(`Specializes in ${opts.specialization}`);
    }

    if (candidate.availableFrom <= opts.availableFrom) {
      score += 15;
      reasons.push(`Available from ${candidate.availableFrom}`);
    }

    const wipaa = clamp(candidate.wipaaPct, 0, 100);
    score += Math.round(15 * (wipaa / 100));
    if (wipaa >= 90) reasons.push(`WIPAA variance ${wipaa}%`);

    const profit = clamp(candidate.trueProfitabilityPct, 0, 100);
    score += Math.round(15 * (profit / 100));
    if (profit >= 12) reasons.push(`True profitability ${profit}%`);

    score += Math.round(10 * (clamp(candidate.rating, 0, 5) / 5));
    if (candidate.rating >= 4.8) reasons.push(`Rated ${candidate.rating}★ (${candidate.reviews} reviews)`);

    if (!best || score > best.score) {
      best = { candidate, score: Math.min(score, 100), reasons };
    }
  }
  return best;
}

export interface ContractOptions {
  projectId: string;
  path: AssemblyPath;
  ownerName: string;
  projectName: string;
  contractor: ContractorCandidate | null;
  totalCents: number;
  now?: Date;
}

export interface GeneratedContract {
  assignment: TeamAssignment;
  contractRef: string;
  terms: string[];
}

/**
 * Auto-generate the contract terms for the selected path. Contract ref
 * follows the DZ-YYYYMMDD-N format. Milestones split 35/40/25.
 */
export function generateContract(opts: ContractOptions): GeneratedContract {
  const now = opts.now ?? new Date();
  const contractRef = `DZ-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${(opts.totalCents % 90) + 10}`;
  const terms: string[] = [
    `Contract value ${money(opts.totalCents)} on the locked cost baseline.`,
    `Milestone split: ${MILESTONE_SPLIT.map((m) => `${m.name} ${m.pct}%`).join(' · ')}.`,
    'Payments release from escrow only after Site Hawk digital-twin verification (P3/P4).',
    'Variations require the Variation Vault protocol; verbal change orders are not honoured (P5).',
  ];
  if (opts.path === 'for-them') {
    terms.push(`Fortress turnkey fee ${FORTRESS_FEE_RANGE_PCT.min}-${FORTRESS_FEE_RANGE_PCT.max}% — DzeNhare orchestrates all workstreams.`);
  } else if (opts.path === 'together' && opts.contractor) {
    terms.push(`Contractor: ${opts.contractor.name} (${opts.contractor.specialization}, ${opts.contractor.rating}★).`);
    terms.push('Retention: 10% per milestone, released at practical completion (P6 handover).');
  }
  const assignment: TeamAssignment = {
    id: `ta-${projectSlug(opts.projectId)}-${contractRef}`,
    projectId: opts.projectId,
    path: opts.path,
    contractorId: opts.contractor?.id ?? null,
    contractorName: opts.contractor?.name ?? null,
    milestoneSplit: MILESTONE_SPLIT,
    contractRef,
    terms,
    createdAt: now.toISOString(),
  };
  return { assignment, contractRef, terms };
}

function projectSlug(id: string): string {
  return id.replace(/[^a-z0-9]/gi, '').slice(-8).toLowerCase();
}

export function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ---------------------------------------------------------------------------
// Materials Transparency — canonical SADC supplier list
// ---------------------------------------------------------------------------

export interface MaterialTransparencyLine {
  id: string;
  name: string;
  supplier: string;
  totalCents: number;
  qty: string;
}

export const MATERIALS_TRANSPARENCY: MaterialTransparencyLine[] = [
  { id: 'mat-bricks', name: 'Face Bricks (standard)', supplier: 'Willdale Brickworks', totalCents: 4_200_00, qty: '4,200 units' },
  { id: 'mat-cement', name: 'Portland Cement 50kg', supplier: 'Sino Cement', totalCents: 3_800_00, qty: '200 bags' },
  { id: 'mat-windows', name: 'Aluminium Windows', supplier: 'PG Glass Zimbabwe', totalCents: 2_100_00, qty: '8 windows' },
  { id: 'mat-doors', name: 'Panel Doors (internal)', supplier: 'Davis Doors', totalCents: 1_400_00, qty: '12 doors' },
];

export const MATERIALS_TOTAL_CENTS = MATERIALS_TRANSPARENCY.reduce((sum, m) => sum + m.totalCents, 0);

// ---------------------------------------------------------------------------
// Force Majeure — standard contract clause
// ---------------------------------------------------------------------------

export const FORCE_MAJEURE_CLAUSE =
  'Neither party shall be liable for failure to perform due to events beyond reasonable control ' +
  '(including but not limited to natural disasters, government-imposed restrictions, pandemic lockdowns, ' +
  'labor strikes, or material supply-chain disruptions exceeding 30 days). The affected party must notify ' +
  'the other within 72 hours. Performance shall resume within 14 days of the force majeure event ceasing.';

// ---------------------------------------------------------------------------
// Accelerated pricing — tiered fee structure for "Do it together"
// ---------------------------------------------------------------------------

export interface AcceleratedTier {
  label: string;
  feePct: number;
  description: string;
}

export const ACCELERATED_TIERS: AcceleratedTier[] = [
  { label: 'Standard', feePct: 12, description: '12% project management fee — 3-5 day contractor matching' },
  { label: 'Express', feePct: 15, description: '15% priority matching — 24-hour contractor deployment' },
  { label: 'Fortress', feePct: 15, description: '15% turnkey — DzeNhare orchestrates all workstreams' },
];

// ---------------------------------------------------------------------------
// Wizard step definitions
// ---------------------------------------------------------------------------

export type WizardStep = 'plan' | 'pick' | 'build' | 'move-in';

export interface WizardStepDef {
  id: WizardStep;
  label: string;
  description: string;
}

export const WIZARD_STEPS: WizardStepDef[] = [
  { id: 'plan', label: 'Plan', description: 'Choose your assembly path' },
  { id: 'pick', label: 'Pick', description: 'Match your contractor' },
  { id: 'build', label: 'Build', description: 'Materials & contract' },
  { id: 'move-in', label: 'Move In', description: 'Team locked' },
];