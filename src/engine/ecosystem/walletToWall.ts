export type FeasibilityVerdict = 'proceed' | 'caution' | 'white-elephant';

export interface CashVsScopeInput {
  cashOnHandCents: number;
  estimatedBuildCostCents: number;
  contingencyPct?: number;
  monthlyIncomeCents?: number;
  monthsToBuild?: number;
}

export interface CashVsScopeResult {
  verdict: FeasibilityVerdict;
  affordabilityRatio: number;
  requiredCashCents: number;
  fundingGapCents: number;
  shortfallCents: number;
  reasons: string[];
}

const DEFAULT_CONTINGENCY_PCT = 20;

export function assessCashVsScope(input: CashVsScopeInput): CashVsScopeResult {
  const contingencyPct = input.contingencyPct ?? DEFAULT_CONTINGENCY_PCT;
  const requiredCashCents = Math.round(input.estimatedBuildCostCents * (1 + contingencyPct / 100));
  const fundingGapCents = Math.max(requiredCashCents - input.cashOnHandCents, 0);
  const affordabilityRatio = input.estimatedBuildCostCents > 0
    ? input.cashOnHandCents / input.estimatedBuildCostCents
    : 1;
  const shortfallCents = Math.max(input.estimatedBuildCostCents - input.cashOnHandCents, 0);

  const reasons: string[] = [];

  if (input.cashOnHandCents >= requiredCashCents) {
    reasons.push(`Cash covers the full build plus a ${contingencyPct}% contingency buffer.`);
  } else if (input.cashOnHandCents >= input.estimatedBuildCostCents) {
    reasons.push(`Cash covers the estimated build cost but not the full ${contingencyPct}% contingency.`);
  } else {
    reasons.push(`Cash covers ${Math.round(affordabilityRatio * 100)}% of the estimated build cost.`);
  }

  const financingAvailable =
    input.monthlyIncomeCents !== undefined &&
    input.monthsToBuild !== undefined &&
    input.monthlyIncomeCents > 0 &&
    input.monthsToBuild > 0
      ? input.monthlyIncomeCents * input.monthsToBuild
      : 0;

  if (fundingGapCents > 0) {
    if (financingAvailable >= fundingGapCents) {
      reasons.push(`Financing during the build (${input.monthsToBuild} months of income) can close the ${fundingGapCents} gap.`);
    } else {
      reasons.push(`Funding gap of ${fundingGapCents} exceeds expected financing during the build.`);
    }
  }

  let verdict: FeasibilityVerdict;
  if (input.cashOnHandCents >= requiredCashCents) {
    verdict = 'proceed';
  } else if (input.cashOnHandCents < input.estimatedBuildCostCents * 0.7 && financingAvailable < fundingGapCents) {
    verdict = 'white-elephant';
  } else if (fundingGapCents > 0 && financingAvailable >= fundingGapCents) {
    verdict = 'caution';
  } else if (input.cashOnHandCents >= input.estimatedBuildCostCents) {
    verdict = 'caution';
  } else {
    verdict = 'white-elephant';
  }

  if (verdict === 'white-elephant') {
    reasons.push('The scope is likely unaffordable with current cash — a White Elephant risk.');
  } else if (verdict === 'caution') {
    reasons.push('Proceed with a staged build and a contingency review.');
  }

  return {
    verdict,
    affordabilityRatio: Math.round(affordabilityRatio * 100) / 100,
    requiredCashCents,
    fundingGapCents,
    shortfallCents,
    reasons,
  };
}
