/**
 * P5 Variation Vault engine.
 * Change protocol with 4-lens cost impact (Red Pen / WIPAA / True Ledger /
 * Budget Engineer) and reversal penalties on the declared change value.
 * Mirrors the changeLensEngine contract with a local lens union.
 *
 * `processChangeOrder()` adds the full change-order workflow:
 *   Input  → Escrow release trigger + locked baseline + builder request +
 *            contractor priced response + supplier restocking fees
 *   Process → 4-lens analysis + reversal penalty breakdown
 *   Output → New BOQ line, revised WBS, timeline update, notifications,
 *            True Ledger capture
 */
import type { LensName, VariationPenalty, VariationImpact } from '@/domain/sitehawk';

export const VARIATION_LENSES: LensName[] = ['red-pen', 'wipaa', 'true-ledger', 'budget-engineer'];

export const REVERSAL_PENALTY_RATE = 0.25;
export const MAX_PENALTY_PCT = 10;

// ── Reversal penalty breakdown constants ──────────────────────────
export const SUPPLIER_RESTOCKING_PCT = 0.45;
export const LABOR_REALLOCATION_PCT = 0.35;
export const CONTRACTOR_OVERHEAD_PCT = 0.20;

export interface ChangeLine {
  description: string;
  quantity: number;
  unit: string;
  unitCostCents: number;
}

export interface VariationInput {
  projectId: string;
  changeOrderId?: string | null;
  title: string;
  lines: ChangeLine[];
  declaredImpactCents: number;
  lensInputs: Partial<Record<LensName, number>>;
  now?: Date;
}

/**
 * 4-lens analysis: each lens revalues the declared impact; the recommended
 * impact is the median; reversal penalty = 25% of the gap between declared
 * and recommended, capped at 10% of declared.
 */
export function analyzeVariation(input: VariationInput): VariationImpact {
  const declared = Math.max(input.declaredImpactCents, 0);
  const penalties: VariationPenalty[] = [];
  const now = input.now ?? new Date();

  for (const lens of VARIATION_LENSES) {
    const lensValue = input.lensInputs[lens];
    const impactCents = lensValue !== undefined ? Math.max(lensValue, 0) : declared;
    const gapCents = impactCents - declared;
    const penaltyCents = Math.min(
      Math.round(Math.abs(gapCents) * REVERSAL_PENALTY_RATE),
      Math.round(declared * (MAX_PENALTY_PCT / 100)),
    );
    penalties.push({
      id: `vp-${input.projectId}-${now.getTime()}-${lens}`,
      projectId: input.projectId,
      changeOrderId: input.changeOrderId ?? null,
      lens,
      impactCents,
      penaltyCents,
      riskFlags: gapCents > 0 ? [`${lens} revalues the change ${pct(gapCents, declared)} higher than declared`] : [],
      createdAt: now.toISOString(),
    });
  }

  const impacts = penalties.map((p) => p.impactCents).sort((a, b) => a - b);
  const mid = Math.floor(impacts.length / 2);
  const recommendedCents = impacts.length % 2 === 1 ? impacts[mid] : Math.round((impacts[mid - 1] + impacts[mid]) / 2);
  const spreadCents = impacts.length ? impacts[impacts.length - 1] - impacts[0] : 0;
  const maxPenaltyCents = Math.max(...penalties.map((p) => p.penaltyCents), 0);

  return {
    changeOrderId: input.changeOrderId ?? null,
    declaredImpactCents: declared,
    recommendedCents,
    penalties,
    reversalWarning:
      maxPenaltyCents > 0
        ? `Reversal penalty up to ${fmtCents(maxPenaltyCents)} (${MAX_PENALTY_PCT}% cap) applies if the declared change is reversed`
        : null,
    spreadCents,
  };
}

function pct(part: number, whole: number): string {
  return `${Math.round((part / Math.max(whole, 1)) * 100)}%`;
}

export function fmtCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function variationTotals(penalties: VariationPenalty[]): {
  totalPenaltyCents: number;
  byLens: Partial<Record<LensName, number>>;
} {
  const byLens: Partial<Record<LensName, number>> = {};
  let total = 0;
  for (const p of penalties) {
    total += p.penaltyCents;
    byLens[p.lens] = (byLens[p.lens] ?? 0) + p.penaltyCents;
  }
  return { totalPenaltyCents: total, byLens };
}

// ── Reversal penalty breakdown ────────────────────────────────────

export interface ReversalPenaltyBreakdown {
  supplierRestockingCents: number;
  laborReallocationCents: number;
  contractorOverheadCents: number;
  totalCents: number;
  notes: string[];
}

/**
 * Split a total reversal penalty into three cost categories:
 *   - Supplier restocking (45%) — restocking fees on ordered materials
 *   - Labor reallocation (35%) — redeploying crew to revised scope
 *   - Contractor overhead (20%) — site overhead protection
 */
export function computeReversalBreakdown(totalPenaltyCents: number): ReversalPenaltyBreakdown {
  const supplierRestockingCents = Math.round(totalPenaltyCents * SUPPLIER_RESTOCKING_PCT);
  const laborReallocationCents = Math.round(totalPenaltyCents * LABOR_REALLOCATION_PCT);
  const contractorOverheadCents = Math.round(totalPenaltyCents * CONTRACTOR_OVERHEAD_PCT);
  const totalCents = supplierRestockingCents + laborReallocationCents + contractorOverheadCents;
  const notes: string[] = [];
  if (supplierRestockingCents > 0) notes.push(`${Math.round(SUPPLIER_RESTOCKING_PCT * 100)}% supplier restocking fees`);
  if (laborReallocationCents > 0) notes.push(`${Math.round(LABOR_REALLOCATION_PCT * 100)}% labor reallocation`);
  if (contractorOverheadCents > 0) notes.push(`${Math.round(CONTRACTOR_OVERHEAD_PCT * 100)}% contractor overhead protection`);
  return { supplierRestockingCents, laborReallocationCents, contractorOverheadCents, totalCents, notes };
}

// ── Change Order workflow ─────────────────────────────────────────

export interface ChangeOrderLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitCostCents: number;
}

export interface SupplierRestockingInput {
  supplierId: string;
  material: string;
  restockingFeeCents: number;
}

export interface ChangeOrderInput {
  projectId: string;
  changeOrderId?: string | null;
  /** Title of the change order */
  title: string;
  /** BOQ lines for the change */
  lines: ChangeOrderLineItem[];
  /** Declared impact in cents (from builder) */
  declaredImpactCents: number;
  /** Contractor priced response per lens */
  lensInputs: Partial<Record<LensName, number>>;
  /** Escrow milestone id that was released to fund this change */
  escrowMilestoneId?: string | null;
  /** Original baseline cost in cents (locked at BOQ freeze) */
  lockedBaselineCents: number;
  /** Number of calendar days added / removed */
  timelineDeltaDays: number;
  /** Supplier restocking fees */
  restockingFees?: SupplierRestockingInput[];
  /** True ledger WBS code for the change */
  wbsCode?: string;
  now?: Date;
}

export interface ChangeOrderResult {
  /** The 4-lens analysis output */
  analysis: VariationImpact;
  /** Reversal penalty breakdown */
  breakdown: ReversalPenaltyBreakdown;
  /** New BOQ line item generated from this change */
  newBoqLine: {
    description: string;
    quantity: number;
    unit: string;
    unitCostCents: number;
    totalCents: number;
  };
  /** Revised cumulative cost including this change */
  revisedBaselineCents: number;
  /** Net timeline change in days (positive = delay) */
  timelineDeltaDays: number;
  /** Whether the change is within the 10% reversal cap */
  withinCap: boolean;
  /** WBS code assigned for True Ledger capture */
  wbsCode: string;
  /** Notification targets */
  notifications: string[];
}

const WBS_DEFAULT = '99.00.00';

/**
 * Full change order workflow.
 * Takes the builder's declared change, contractor's lens-priced response,
 * supplier restocking fees, and locked baseline; runs 4-lens analysis,
 * computes the reversal penalty breakdown, generates the new BOQ line,
 * and returns the complete change order result with notifications.
 */
export function processChangeOrder(input: ChangeOrderInput): ChangeOrderResult {
  const analysis = analyzeVariation({
    projectId: input.projectId,
    changeOrderId: input.changeOrderId,
    title: input.title,
    lines: input.lines.map((l) => ({ description: l.description, quantity: l.quantity, unit: l.unit, unitCostCents: l.unitCostCents })),
    declaredImpactCents: input.declaredImpactCents,
    lensInputs: input.lensInputs,
    now: input.now,
  });

  // Maximum penalty from the 4-lens analysis
  const maxPenaltyCents = Math.max(...analysis.penalties.map((p) => p.penaltyCents), 0);
  const breakdown = computeReversalBreakdown(maxPenaltyCents);

  // BOQ line
  const totalCents = input.lines.reduce((s, l) => s + Math.round(l.quantity * l.unitCostCents), 0);
  const newBoqLine = {
    description: input.title,
    quantity: input.lines.reduce((s, l) => s + l.quantity, 0),
    unit: input.lines[0]?.unit ?? 'ls',
    unitCostCents: input.lines.length === 1 ? input.lines[0].unitCostCents : Math.round(totalCents / Math.max(input.lines.reduce((s, l) => s + l.quantity, 0), 1)),
    totalCents,
  };

  // Revised baseline
  const revisedBaselineCents = input.lockedBaselineCents + newBoqLine.totalCents;

  // Cap check — whether the raw (uncapped) gap penalty would exceed the cap
  const rawMaxGapCents = Math.max(...analysis.penalties.map((p) => {
    const declared = input.declaredImpactCents || 1;
    return Math.abs(p.impactCents - declared);
  }), 0);
  const rawPenaltyCents = Math.round(rawMaxGapCents * REVERSAL_PENALTY_RATE);
  const capCents = Math.round(input.declaredImpactCents * (MAX_PENALTY_PCT / 100));
  const withinCap = rawPenaltyCents <= capCents;

  // WBS code
  const wbsCode = input.wbsCode ?? WBS_DEFAULT;

  // Notifications
  const notifications: string[] = [];
  if (input.escrowMilestoneId) {
    notifications.push(`Escrow milestone ${input.escrowMilestoneId} — change order recorded`);
  }
  if (breakdown.totalCents > 0) {
    notifications.push(`Reversal penalty ${fmtCents(breakdown.totalCents)} split: ${breakdown.notes.join('; ')}`);
  }
  if (!withinCap) {
    notifications.push(`WARNING: Reversal penalty exceeds ${MAX_PENALTY_PCT}% cap — flagged for QS review`);
  }
  notifications.push(`True Ledger: ${newBoqLine.description} coded to ${wbsCode}`);
  if (input.timelineDeltaDays !== 0) {
    notifications.push(`Timeline ${input.timelineDeltaDays > 0 ? 'extended' : 'compressed'} by ${Math.abs(input.timelineDeltaDays)} day${Math.abs(input.timelineDeltaDays) !== 1 ? 's' : ''}`);
  }

  return {
    analysis,
    breakdown,
    newBoqLine,
    revisedBaselineCents,
    timelineDeltaDays: input.timelineDeltaDays,
    withinCap,
    wbsCode,
    notifications,
  };
}