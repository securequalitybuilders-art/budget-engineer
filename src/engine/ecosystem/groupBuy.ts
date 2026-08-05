export interface BoqLineLike {
  id: string;
  projectId: string;
  description: string;
  quantity: number;
  unit: string;
  unitCostCents: number;
}

export interface AggregateDemand {
  key: string;
  label: string;
  unit: string;
  quantity: number;
  avgUnitCostCents: number;
  totalCostCents: number;
  projectCount: number;
}

function normalizeKey(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 80);
}

export function aggregateMaterialDemand(lines: BoqLineLike[]): AggregateDemand[] {
  const byKey = new Map<string, { label: string; unit: string; quantity: number; costCents: number; projects: Set<string> }>();
  for (const line of lines) {
    const key = normalizeKey(line.description);
    const entry = byKey.get(key) ?? { label: line.description.trim(), unit: line.unit, quantity: 0, costCents: 0, projects: new Set<string>() };
    entry.quantity += line.quantity;
    entry.costCents += line.quantity * line.unitCostCents;
    entry.projects.add(line.projectId);
    byKey.set(key, entry);
  }
  return Array.from(byKey.values())
    .map((entry) => ({
      key: normalizeKey(entry.label),
      label: entry.label,
      unit: entry.unit,
      quantity: Math.round(entry.quantity * 100) / 100,
      avgUnitCostCents: entry.quantity > 0 ? Math.round(entry.costCents / entry.quantity) : 0,
      totalCostCents: entry.costCents,
      projectCount: entry.projects.size,
    }))
    .sort((a, b) => b.totalCostCents - a.totalCostCents);
}

export function estimateBulkDiscount(quantity: number, unitCostCents: number): {
  discountPct: number;
  groupPriceCents: number;
  savingCents: number;
} {
  const discountPct = quantity >= 50000 ? 12 : quantity >= 10000 ? 9 : quantity >= 1000 ? 6 : quantity >= 100 ? 3 : 0;
  const groupPriceCents = Math.round(unitCostCents * (1 - discountPct / 100));
  const savingCents = Math.round((unitCostCents - groupPriceCents) * quantity);
  return { discountPct, groupPriceCents, savingCents };
}

export function aggregateDemandSummary(demand: AggregateDemand[]): {
  materialCount: number;
  totalOrderValueCents: number;
  totalSavingCents: number;
  largestProjectCount: number;
} {
  let totalSavingCents = 0;
  let largestProjectCount = 0;
  for (const item of demand) {
    totalSavingCents += estimateBulkDiscount(item.quantity, item.avgUnitCostCents).savingCents;
    if (item.projectCount > largestProjectCount) largestProjectCount = item.projectCount;
  }
  return {
    materialCount: demand.length,
    totalOrderValueCents: demand.reduce((s, i) => s + i.totalCostCents, 0),
    totalSavingCents,
    largestProjectCount,
  };
}
