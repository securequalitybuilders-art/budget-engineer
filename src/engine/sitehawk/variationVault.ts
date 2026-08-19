/**
 * P5 Variation Vault engine.
 * Change protocol with 4-lens cost impact (Red Pen / WIPAA / True Ledger /
 * Budget Engineer) and reversal penalties on the declared change value.
 * Mirrors the changeLensEngine contract with a local lens union.
 */
import type { LensName, VariationPenalty, VariationImpact } from '@/domain/sitehawk';

export const VARIATION_LENSES: LensName[] = ['red-pen', 'wipaa', 'true-ledger', 'budget-engineer'];

export const REVERSAL_PENALTY_RATE = 0.25;
export const MAX_PENALTY_PCT = 10;

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