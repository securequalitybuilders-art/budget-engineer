/**
 * C5 Cost Clarification engine.
 * ZIQS SMM-aligned WBS dictionary, dynamic cost build-up (the "live BOQ"),
 * Red Pen variance audit against the SADC market rate catalogue, value
 * engineering suggestions, ghost material detection, cash flow forecast,
 * volatility-adjusted contingency, milestone escrow derivation, and the
 * locked Cost Baseline.
 */
import type {
  BoqItem,
  CashFlowForecast,
  CashFlowMilestone,
  CostAtGlance,
  CostBaseline,
  CostBaselineLine,
  GhostMaterial,
  MustHaveItem,
  RedPenAuditResult,
  RedPenVariance,
  ValueEngineeringSuggestion,
} from '@/domain/greenflag';

export const ZIQS_WBS_TEMPLATE: Array<{ code: string; level: number; name: string; category: string; parent: string | null }> = [
  { code: '01', level: 1, name: 'Site Preparation', category: 'Preliminaries', parent: null },
  { code: '01.01', level: 2, name: 'Site Clearing', category: 'Preliminaries', parent: '01' },
  { code: '01.02', level: 2, name: 'Setting Out', category: 'Preliminaries', parent: '01' },
  { code: '02', level: 1, name: 'Substructure', category: 'Substructure', parent: null },
  { code: '02.01', level: 2, name: 'Excavation', category: 'Substructure', parent: '02' },
  { code: '02.02', level: 2, name: 'Blinding & Foundation Concrete', category: 'Substructure', parent: '02' },
  { code: '03', level: 1, name: 'Superstructure', category: 'Superstructure', parent: null },
  { code: '03.01', level: 2, name: 'Masonry (115mm units)', category: 'Superstructure', parent: '03' },
  { code: '03.02', level: 2, name: 'Concrete Frame', category: 'Superstructure', parent: '03' },
  { code: '04', level: 1, name: 'Roofing', category: 'Roofing', parent: null },
  { code: '04.01', level: 2, name: 'Roof Structure', category: 'Roofing', parent: '04' },
  { code: '04.02', level: 2, name: 'Roof Covering', category: 'Roofing', parent: '04' },
  { code: '05', level: 1, name: 'Finishes', category: 'Finishes', parent: null },
  { code: '05.01', level: 2, name: 'Plaster & Screed', category: 'Finishes', parent: '05' },
  { code: '05.02', level: 2, name: 'Tiling', category: 'Finishes', parent: '05' },
  { code: '05.03', level: 2, name: 'Painting', category: 'Finishes', parent: '05' },
  { code: '06', level: 1, name: 'Services', category: 'Services', parent: null },
  { code: '06.01', level: 2, name: 'Electrical & Solar', category: 'Services', parent: '06' },
  { code: '06.02', level: 2, name: 'Plumbing & Sanitary', category: 'Services', parent: '06' },
  { code: '07', level: 1, name: 'Fees & Statutory', category: 'Fees & Statutory', parent: null },
  { code: '07.01', level: 2, name: 'Council & Levies', category: 'Fees & Statutory', parent: '07' },
];

export const RED_PEN_THRESHOLD_PCT = 15;

function classifyWbs(description: string): string {
  const lower = description.toLowerCase();
  if (/excavat|foundation|blinding|concrete|strip/i.test(lower)) return '02.01';
  if (/masonry|brick|block|wall/i.test(lower)) return '03.01';
  if (/roof|truss|sheet|gutter/i.test(lower)) return '04.01';
  if (/plaster|screed|tile|paint/i.test(lower)) return '05.01';
  if (/electrical|solar|conduit/i.test(lower)) return '06.01';
  if (/plumb|pipe|sanitary|wc|basin/i.test(lower)) return '06.02';
  return '03.02';
}

/** Build the WBS-tagged BOQ (ZIQS SMM-aligned). */
export function tagBoqWithWbs(lines: BoqItem[]): BoqItem[] {
  return lines.map((line) => ({
    ...line,
    wbsCode: line.wbsCode ?? classifyWbs(line.description),
  }));
}

/** Dynamic cost build-up: straight-line WBS rollup of the tagged BOQ. */
export function dynamicCostBuildUp(lines: BoqItem[]): Array<{ code: string; name: string; category: string; costCents: number }> {
  const byCode = new Map<string, { name: string; category: string; costCents: number }>();
  for (const line of tagBoqWithWbs(lines)) {
    const template = ZIQS_WBS_TEMPLATE.find((w) => w.code === line.wbsCode);
    const entry = byCode.get(line.wbsCode) ?? {
      name: template?.name ?? line.wbsCode,
      category: template?.category ?? 'Unallocated',
      costCents: 0,
    };
    entry.costCents += line.totalCents;
    byCode.set(line.wbsCode, entry);
  }
  return Array.from(byCode.entries())
    .map(([code, e]) => ({ code, name: e.name, category: e.category, costCents: e.costCents }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

function catalogueMatch(description: string, rateCatalogue: Array<{ description: string; rateCents: number }>) {
  const tokens = description.toLowerCase().split(/\s+/).filter((t) => t.length > 2).slice(0, 3);
  if (tokens.length === 0) return undefined;
  return rateCatalogue.find((r) =>
    tokens.some((t) => r.description.toLowerCase().includes(t)),
  );
}

/** Red Pen Audit: flag any line priced >15% above the SADC rate catalogue. */
export function redPenAudit(
  lines: BoqItem[],
  rateCatalogue: Array<{ description: string; rateCents: number }>,
  now: Date = new Date(),
): RedPenAuditResult {
  const variances: RedPenVariance[] = [];
  for (const line of tagBoqWithWbs(lines)) {
    const match = catalogueMatch(line.description, rateCatalogue);
    if (!match || match.rateCents <= 0) continue;
    const requiredCents = match.rateCents * line.quantity;
    const quotedCents = line.totalCents;
    const varianceCents = quotedCents - requiredCents;
    const flagged = (varianceCents / Math.max(requiredCents, 1)) * 100 > RED_PEN_THRESHOLD_PCT;
    variances.push({
      wbsCode: line.wbsCode,
      description: line.description,
      requiredCents,
      quotedCents,
      varianceCents,
      unitCostCents: line.unitCostCents,
      leakageCents: varianceCents,
      flagged,
    });
  }
  const totalLeakageCents = variances.filter((v) => v.flagged).reduce((sum, v) => sum + v.leakageCents, 0);
  return { variances, totalLeakageCents, auditDate: now.toISOString() };
}

/** Value engineering suggestions — deterministic top-quantity items. */
export function valueEngineeringSuggestions(lines: BoqItem[]): ValueEngineeringSuggestion[] {
  const tagged = tagBoqWithWbs(lines);
  return [...tagged]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3)
    .map((line) => {
      const savingCents = Math.round(line.totalCents * 0.06);
      return {
        wbsCode: line.wbsCode,
        description: line.description,
        currentCents: line.totalCents,
        suggestedCents: line.totalCents - savingCents,
        savingCents,
        rationale: `Consolidate ${line.quantity} ${line.unit} into the group-buy aggregator to unlock the 3-12% bulk discount.`,
      };
    });
}

export interface LockBaselineInput {
  projectId: string;
  region?: string;
  lines: BoqItem[];
  contingencyCents: number;
  now?: Date;
}

/** Lock the Cost Baseline with the contingency. */
export function lockCostBaseline(input: LockBaselineInput): CostBaseline {
  const now = input.now ?? new Date();
  const tagged = tagBoqWithWbs(input.lines);
  const directCents = tagged.reduce((sum, l) => sum + l.totalCents, 0);
  const totalCents = directCents + input.contingencyCents;
  const lines: CostBaselineLine[] = tagged.map((l) => ({
    wbsCode: l.wbsCode,
    description: l.description,
    unit: l.unit,
    quantity: l.quantity,
    unitCostCents: l.unitCostCents,
    totalCents: l.totalCents,
  }));
  return {
    id: `cb-${input.projectId}-${now.toISOString().slice(0, 10)}`,
    projectId: input.projectId,
    region: input.region ?? 'zimbabwe',
    totalCents,
    contingencyCents: input.contingencyCents,
    contingencyPct: Math.round((input.contingencyCents / Math.max(totalCents, 1)) * 1000) / 10,
    lines,
    status: 'locked',
    lockedAt: now.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Ghost Materials: detect BOQ items billed but not delivered to site
// ---------------------------------------------------------------------------

export interface DeliveryRecord {
  description: string;
  quantityDelivered: number;
  unit: string;
}

/**
 * Cross-reference BOQ line items against delivery records to find ghost
 * materials — items billed but not (fully) delivered on site.
 */
export function detectGhostMaterials(
  boqLines: BoqItem[],
  deliveries: DeliveryRecord[],
): GhostMaterial[] {
  const deliveredMap = new Map<string, number>();
  for (const d of deliveries) {
    const key = d.description.toLowerCase().trim();
    deliveredMap.set(key, (deliveredMap.get(key) ?? 0) + d.quantityDelivered);
  }

  const ghosts: GhostMaterial[] = [];
  for (const line of tagBoqWithWbs(boqLines)) {
    const key = line.description.toLowerCase().trim();
    const delivered = deliveredMap.get(key) ?? 0;
    if (delivered >= line.quantity) continue;

    const ghostQty = line.quantity - delivered;
    const severity: GhostMaterial['severity'] =
      delivered === 0 ? 'total' : ghostQty / Math.max(line.quantity, 1) > 0.5 ? 'partial' : 'partial';

    ghosts.push({
      id: `ghost-${line.id}`,
      projectId: line.projectId,
      wbsCode: line.wbsCode,
      description: line.description,
      unit: line.unit,
      billedQuantity: line.quantity,
      deliveredQuantity: delivered,
      ghostQuantity: ghostQty,
      unitCostCents: line.unitCostCents,
      ghostCostCents: Math.round(ghostQty * line.unitCostCents),
      severity,
    });
  }
  return ghosts;
}

// ---------------------------------------------------------------------------
// Cash Flow Forecast: 35/40/25 milestone split from the locked baseline
// ---------------------------------------------------------------------------

const DEFAULT_MILESTONE_SPLITS = [
  { name: 'Milestone 1 — Foundation & Slab', pct: 35 },
  { name: 'Milestone 2 — Superstructure & Roof', pct: 40 },
  { name: 'Milestone 3 — Finishes & Handover', pct: 25 },
];

export interface CashFlowInput {
  projectId: string;
  baseline: CostBaseline;
  milestoneSplits?: Array<{ name: string; pct: number }>;
  /** Projected due dates for each milestone (ISO strings). */
  milestoneDueDates?: string[];
  now?: Date;
}

/**
 * Build a milestone-based cash flow forecast from the locked Cost Baseline.
 * The default split is 35% / 40% / 25% (foundation → superstructure → finishes).
 */
export function cashFlowForecast(input: CashFlowInput): CashFlowForecast {
  const splits = input.milestoneSplits ?? DEFAULT_MILESTONE_SPLITS;
  const now = input.now ?? new Date();
  const availableCents = input.baseline.totalCents - input.baseline.contingencyCents;
  let cumulative = 0;

  const milestones: CashFlowMilestone[] = splits.map((split, i) => {
    const amountCents = Math.round(availableCents * (split.pct / 100));
    cumulative += amountCents;
    return {
      name: split.name,
      pct: split.pct,
      amountCents,
      cumulativeCents: cumulative,
      dueDate: input.milestoneDueDates?.[i] ?? new Date(now.getTime() + (i + 1) * 90 * 86400000).toISOString(),
      status: 'projected' as const,
    };
  });

  return {
    projectId: input.projectId,
    baselineId: input.baseline.id,
    totalCents: input.baseline.totalCents,
    contingencyCents: input.baseline.contingencyCents,
    milestones,
    generatedAt: now.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// SADC volatility-adjusted contingency
// ---------------------------------------------------------------------------

/**
 * Compute a volatility-adjusted contingency percentage based on the coefficient
 * of variation in recent rate history. Base contingency is 9% per SADC norms;
 * high-volatility markets push it up (max 15%), stable markets pull it down
 * (min 5%).
 */
export function volatilityAdjustedContingency(
  basePct: number,
  rateHistory: Array<{ rateCents: number }>,
  now: Date = new Date(),
): { adjustedPct: number; factor: string; reason: string; _now: Date } {
  void now;
  if (rateHistory.length < 3) {
    return {
      adjustedPct: basePct,
      factor: 'stable',
      reason: 'Insufficient rate history — using base contingency.',
      _now: now,
    };
  }

  const rates = rateHistory.map((r) => r.rateCents);
  const mean = rates.reduce((s, r) => s + r, 0) / rates.length;
  if (mean === 0) {
    return { adjustedPct: basePct, factor: 'stable', reason: 'Zero mean rate — using base contingency.', _now: now };
  }

  const variance = rates.reduce((s, r) => s + (r - mean) ** 2, 0) / rates.length;
  const cv = Math.sqrt(variance) / mean;

  let factor: string;
  let adjustedPct: number;
  if (cv > 0.3) {
    factor = 'high-volatility';
    adjustedPct = Math.min(basePct + 3, 15);
  } else if (cv > 0.15) {
    factor = 'moderate-volatility';
    adjustedPct = basePct + 1;
  } else {
    factor = 'stable';
    adjustedPct = Math.max(basePct - 2, 5);
  }

  return {
    adjustedPct,
    factor,
    reason: `CV = ${cv.toFixed(3)} → ${factor}. Base ${basePct}% adjusted to ${adjustedPct}%.`,
    _now: now,
  };
}

// ---------------------------------------------------------------------------
// Milestone Escrow derivation from the locked baseline
// ---------------------------------------------------------------------------

export interface MilestoneEscrow {
  name: string;
  pct: number;
  amountCents: number;
}

/**
 * Derive the milestone escrow amounts from the locked Cost Baseline using the
 * 35/40/25 split. The amounts represent the escrow-held total per milestone
 * (including pro-rata contingency).
 */
export function deriveMilestoneEscrow(
  baseline: CostBaseline,
  splits?: Array<{ name: string; pct: number }>,
): MilestoneEscrow[] {
  const actualSplits = splits ?? DEFAULT_MILESTONE_SPLITS;
  return actualSplits.map((split) => ({
    name: split.name,
    pct: split.pct,
    amountCents: Math.round(baseline.totalCents * (split.pct / 100)),
  }));
}

// ---------------------------------------------------------------------------
// Must-Haves budget tracker
// ---------------------------------------------------------------------------

export interface MustHaveBudgetInput {
  name: string;
  category: string;
  budgetAllowanceCents: number;
  actualCostCents: number;
}

/**
 * Build the Must-Haves budget tracker comparing allowance vs actual cost for
 * each must-have item.
 */
export function mustHavesTracker(items: MustHaveBudgetInput[], projectId: string): MustHaveItem[] {
  return items.map((item, i) => {
    const varianceCents = item.actualCostCents - item.budgetAllowanceCents;
    const variancePct = item.budgetAllowanceCents > 0
      ? Math.round((varianceCents / item.budgetAllowanceCents) * 1000) / 10
      : 0;
    return {
      id: `mh-${projectId}-${i}`,
      projectId,
      name: item.name,
      category: item.category,
      budgetAllowanceCents: item.budgetAllowanceCents,
      actualCostCents: item.actualCostCents,
      varianceCents,
      variancePct,
      status: varianceCents > 0 ? 'over' as const : varianceCents < 0 ? 'under' as const : 'on-target' as const,
    };
  });
}

// ---------------------------------------------------------------------------
// Cost at a Glance
// ---------------------------------------------------------------------------

export interface CostAtGlanceInput {
  projectId: string;
  baseline: CostBaseline;
  ghostMaterialCostCents: number;
  redPenLeakageCents: number;
  valueEngineeringSavingsCents: number;
  spentToDateCents?: number;
  committedCents?: number;
}

/**
 * Aggregate the cost summary for the Cost at a Glance dial/gauge.
 */
export function buildCostAtGlance(input: CostAtGlanceInput): CostAtGlance {
  const spent = input.spentToDateCents ?? 0;
  const committed = input.committedCents ?? 0;
  const remaining = Math.max(0, input.baseline.totalCents - spent - committed);
  const budgetUtilisationPct = input.baseline.totalCents > 0
    ? Math.round(((spent + committed) / input.baseline.totalCents) * 1000) / 10
    : 0;

  return {
    projectId: input.projectId,
    directCostCents: input.baseline.totalCents - input.baseline.contingencyCents,
    contingencyCents: input.baseline.contingencyCents,
    totalBudgetCents: input.baseline.totalCents,
    spentToDateCents: spent,
    committedCents: committed,
    remainingCents: remaining,
    ghostMaterialCostCents: input.ghostMaterialCostCents,
    redPenLeakageCents: input.redPenLeakageCents,
    valueEngineeringSavingsCents: input.valueEngineeringSavingsCents,
    budgetUtilisationPct,
  };
}