/**
 * C4 Bulk Procurement engine.
 * Value-driven quoting (TCO-enabled), group-buy aggregation, forward
 * commitments, demand radar dual view, and RFQ/Tender module on top
 * of the existing marketplace workflow + TCO engines.
 */
import type { ForwardCommitment } from '@/domain/greenflag';
import { compareSuppliers, type TcoInput, type TcoComparisonRow } from '@/engine/ecosystem/tco';
import { estimateBulkDiscount, type AggregateDemand } from '@/engine/ecosystem/groupBuy';
import { createRfq } from '@/engine/ecosystem/workflow';

/* -------------------------------------------------------------------------- */
/*  Value-driven quoting                                                       */
/* -------------------------------------------------------------------------- */

export interface QuoteInput {
  id: string;
  name: string;
  material: string;
  priceCents: number;
  freightCents: number;
  onTimeDeliveryPct: number;
  defectRatePct: number;
  laborDowntimeCostCentsPerDay: number;
  leadDays: number;
  typicalLeadDays: number;
}

export interface TcoScoringBreakdown {
  tcoRow: TcoComparisonRow;
  reliabilityBonusCents: number;
  defectPenaltyCents: number;
  tcoScore: number;
  /** human-readable explanation, e.g. "5% higher but 99% on-time saves $X downtime" */
  explanation: string;
}

export interface ValueQuoteResult {
  tcoRows: TcoComparisonRow[];
  scoringRows: TcoScoringBreakdown[];
  bestId: string | null;
  bulk: { discountPct: number; groupPriceCents: number; savingCents: number };
}

/**
 * Compute TCO scoring breakdown per supplier.
 * reliabilityBonusCents = downtime saved vs cheapest price supplier.
 * defectPenaltyCents    = excess defect cost vs cheapest price supplier.
 * tcoScore              = 100 - (tcoDelta / maxTco * 50), capped 0-100.
 */
export function buildTcoScoringTable(rows: TcoComparisonRow[]): TcoScoringBreakdown[] {
  if (rows.length === 0) return [];
  const cheapestPrice = Math.min(...rows.map((r) => r.input.priceCents));
  const maxTco = Math.max(...rows.map((r) => r.result.totalCostCents));
  const minTco = Math.min(...rows.map((r) => r.result.totalCostCents));

  return rows.map((row) => {
    const cheapestRow = rows.find((r) => r.input.priceCents === cheapestPrice) ?? rows[0];
    const reliabilityBonusCents = Math.max(cheapestRow.result.downtimeCostCents - row.result.downtimeCostCents, 0);
    const defectPenaltyCents = Math.max(row.result.defectCostCents - cheapestRow.result.defectCostCents, 0);
    const tcoDelta = row.result.totalCostCents - minTco;
    const tcoScore = maxTco > minTco ? Math.round(100 - (tcoDelta / (maxTco - minTco)) * 50) : 100;

    const pctHigher = cheapestPrice > 0 ? Math.round(((row.input.priceCents - cheapestPrice) / cheapestPrice) * 100) : 0;
    const explanation = row.input.onTimeDeliveryPct >= 95 && pctHigher > 0
      ? `${pctHigher}% higher but ${row.input.onTimeDeliveryPct}% on-time saves $${(reliabilityBonusCents / 100).toFixed(0)} downtime`
      : row.result.downtimeCostCents === 0
        ? `${row.input.onTimeDeliveryPct}% on-time, $0 downtime cost`
        : `TCO ${tcoScore}/100`;

    return { tcoRow: row, reliabilityBonusCents, defectPenaltyCents, tcoScore, explanation };
  });
}

/**
 * Value-driven quoting: TCO comparison across suppliers + scoring
 * + group-buy aggregator discount on the aggregated demand.
 */
export function valueDrivenQuote(
  quotes: QuoteInput[],
  quantity: number,
  demand: AggregateDemand[] = [],
): ValueQuoteResult {
  const tcoRows = compareSuppliers(
    quotes.map((q) => ({
      id: q.id,
      name: q.name,
      input: {
        priceCents: q.priceCents,
        freightCents: q.freightCents,
        onTimeDeliveryPct: q.onTimeDeliveryPct,
        defectRatePct: q.defectRatePct,
        laborDowntimeCostCentsPerDay: q.laborDowntimeCostCentsPerDay,
        leadDays: q.leadDays,
        typicalLeadDays: q.typicalLeadDays,
      } satisfies TcoInput,
    })),
  );
  const scoringRows = buildTcoScoringTable(tcoRows);
  const best = tcoRows.length > 0 ? tcoRows.find((r) => r.rank === 1) ?? null : null;
  const aggregated = demand.find((d) => d.quantity >= quantity) ?? demand[0];
  const baseUnit = best ? best.result.priceCents / Math.max(quantity, 1) : 0;
  const bulk = estimateBulkDiscount(aggregated?.quantity ?? quantity, baseUnit);
  return { tcoRows, scoringRows, bestId: best?.id ?? null, bulk };
}

/* -------------------------------------------------------------------------- */
/*  Demand Radar dual view                                                     */
/* -------------------------------------------------------------------------- */

export interface DemandRadarProjectEntry {
  projectId: string;
  projectName: string;
  material: string;
  unit: string;
  quantity: number;
  neededBy: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DemandRadarDualView {
  aggregate: AggregateDemand[];
  byProject: DemandRadarProjectEntry[];
  totalDemandUnits: number;
  totalOrderValueCents: number;
  uniqueMaterials: number;
  crossProjectMaterials: string[];
}

/**
 * Build the dual-view demand radar from BOQ lines and per-project entries.
 * Aggregate view = groupBuy aggregation. Per-project = anonymized project-level demand.
 */
export function buildDemandRadarDualView(
  boqLines: AggregateDemand[],
  projectEntries: DemandRadarProjectEntry[],
): DemandRadarDualView {
  const totalDemandUnits = projectEntries.reduce((s, e) => s + e.quantity, 0);
  const totalOrderValueCents = boqLines.reduce((s, l) => s + l.totalCostCents, 0);
  const uniqueMaterials = new Set(projectEntries.map((e) => e.material)).size;

  const materialProjectCounts = new Map<string, Set<string>>();
  for (const e of projectEntries) {
    const existing = materialProjectCounts.get(e.material) ?? new Set<string>();
    existing.add(e.projectId);
    materialProjectCounts.set(e.material, existing);
  }
  const crossProjectMaterials = Array.from(materialProjectCounts.entries())
    .filter(([, ps]) => ps.size > 1)
    .map(([mat]) => mat);

  return { aggregate: boqLines, byProject: projectEntries, totalDemandUnits, totalOrderValueCents, uniqueMaterials, crossProjectMaterials };
}

/* -------------------------------------------------------------------------- */
/*  Forward commitments                                                        */
/* -------------------------------------------------------------------------- */

export interface ForwardCommitmentInput {
  projectId: string;
  material: string;
  quantity: number;
  unit: string;
  priceCents: number;
  supplierId: string;
  commitmentDate: string;
  now?: Date;
}

export function createForwardCommitment(input: ForwardCommitmentInput): ForwardCommitment {
  const now = input.now ?? new Date();
  return {
    id: `fc-${input.projectId}-${now.getTime()}`,
    projectId: input.projectId,
    material: input.material,
    quantity: input.quantity,
    unit: input.unit,
    priceCents: input.priceCents,
    supplierId: input.supplierId,
    commitmentDate: input.commitmentDate,
    status: 'proposed',
    createdAt: now.toISOString(),
  };
}

export function commitmentTotals(commitments: ForwardCommitment[]): {
  totalCents: number;
  lockedCents: number;
  materialCount: number;
} {
  let totalCents = 0;
  let lockedCents = 0;
  for (const c of commitments) {
    const line = c.quantity * c.priceCents;
    totalCents += line;
    if (c.status === 'locked') lockedCents += line;
  }
  return { totalCents, lockedCents, materialCount: commitments.length };
}

/* -------------------------------------------------------------------------- */
/*  RFQ / Tender module                                                        */
/* -------------------------------------------------------------------------- */

export interface RfqTenderSupplier {
  supplierId: string;
  supplierName: string;
  tcoScore: number;
  priceCents: number;
  invitedAt: string;
}

export interface RfqTenderResult {
  rfqId: string;
  suppliers: RfqTenderSupplier[];
  material: string;
  quantity: number;
  totalBudgetCents: number;
  bestTcoScore: number;
  createdAt: string;
}

export interface RfqFromMaterialsInput {
  projectId: string;
  projectName: string;
  category: string;
  title: string;
  budgetCents: number;
  priority: 'high' | 'medium' | 'low';
  deliveryLocation: string;
  lines: Array<{ material: string; quantity: number; unit: string }>;
  /** Top N suppliers to invite, pre-scored by TCO */
  invitedSuppliers?: RfqTenderSupplier[];
}

/** RFQ/Tender module — reuses the marketplace workflow's createRfq + TCO scoring. */
export async function tenderFromMaterials(
  input: RfqFromMaterialsInput,
): Promise<RfqTenderResult> {
  const rfq = await createRfq({
    projectId: input.projectId,
    projectName: input.projectName,
    category: input.category,
    title: input.title,
    budgetCents: input.budgetCents,
    priority: input.priority,
    deliveryLocation: input.deliveryLocation,
    description: input.lines.map((l) => `${l.quantity} ${l.unit} ${l.material}`).join('; '),
  });
  const suppliers = input.invitedSuppliers ?? [];
  const bestTcoScore = suppliers.length > 0 ? Math.max(...suppliers.map((s) => s.tcoScore)) : 0;
  return {
    rfqId: rfq.id,
    suppliers,
    material: input.lines[0]?.material ?? '',
    quantity: input.lines.reduce((s, l) => s + l.quantity, 0),
    totalBudgetCents: input.budgetCents,
    bestTcoScore,
    createdAt: rfq.createdAt,
  };
}