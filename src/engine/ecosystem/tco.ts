export interface TcoInput {
  priceCents: number;
  freightCents: number;
  onTimeDeliveryPct: number;
  defectRatePct: number;
  laborDowntimeCostCentsPerDay: number;
  leadDays: number;
  typicalLeadDays: number;
}

export interface TcoResult {
  priceCents: number;
  freightCents: number;
  downtimeCostCents: number;
  defectCostCents: number;
  totalCostCents: number;
  priceDeltaCents: number;
}

const REWORK_MULTIPLIER = 2;

export function calculateTco(input: TcoInput): TcoResult {
  const lateProbability = Math.max(1 - input.onTimeDeliveryPct / 100, 0);
  const expectedLateDays = lateProbability * Math.max(input.typicalLeadDays - input.leadDays, 1);
  const downtimeCostCents = Math.round(expectedLateDays * input.laborDowntimeCostCentsPerDay);

  const expectedRejectedFraction = Math.max(input.defectRatePct / 100, 0);
  const defectCostCents = Math.round(input.priceCents * expectedRejectedFraction * REWORK_MULTIPLIER);

  const totalCostCents = input.priceCents + input.freightCents + downtimeCostCents + defectCostCents;
  const priceDeltaCents = totalCostCents - input.priceCents;

  return {
    priceCents: input.priceCents,
    freightCents: input.freightCents,
    downtimeCostCents,
    defectCostCents,
    totalCostCents,
    priceDeltaCents,
  };
}

export interface TcoComparisonRow {
  id: string;
  name: string;
  input: TcoInput;
  result: TcoResult;
  rank: number;
  priceRank: number;
}

export function compareSuppliers(
  items: { id: string; name: string; input: TcoInput }[]
): TcoComparisonRow[] {
  return items
    .map((item) => ({
      id: item.id,
      name: item.name,
      input: item.input,
      result: calculateTco(item.input),
      rank: 0,
      priceRank: 0,
    }))
    .sort((a, b) => a.result.totalCostCents - b.result.totalCostCents)
    .map((row, index) => ({ ...row, rank: index + 1 }))
    .sort((a, b) => a.input.priceCents - b.input.priceCents)
    .map((row, index) => ({ ...row, priceRank: index + 1 }))
    .sort((a, b) => a.rank - b.rank);
}
