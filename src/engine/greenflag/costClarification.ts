/**
 * C5 Cost Clarification engine.
 * ZIQS SMM-aligned WBS dictionary, dynamic cost build-up (the "live BOQ"),
 * Red Pen variance audit against the SADC market rate catalogue, value
 * engineering suggestions, and the locked Cost Baseline.
 */
import type {
  BoqItem,
  CostBaseline,
  CostBaselineLine,
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

/** Lock the Cost Baseline with the 9% contingency. */
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