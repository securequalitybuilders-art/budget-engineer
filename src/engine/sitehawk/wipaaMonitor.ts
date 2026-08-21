/**
 * P6 WIPAA & Handover engine.
 * Monthly true-profitability monitor (WIPAA vs P4P), escalation alert
 * levels (green ≥90 / amber 70-89 / red <70), P&L from the ledger, gain/fade
 * analysis, solvency dashboard, contingency spend-down, cashflow projection,
 * and the digital + physical key handover pack.
 */
import type { WipaaEntry, WipaaAlertLevel } from '@/domain/sitehawk';

/** Money in integer cents (repo convention). */

export const WIPAA_ALERT_THRESHOLDS = { green: 90, amber: 70 };

export function alertLevelFor(escalationPct: number): WipaaAlertLevel {
  if (escalationPct >= WIPAA_ALERT_THRESHOLDS.green) return 'green';
  if (escalationPct >= WIPAA_ALERT_THRESHOLDS.amber) return 'amber';
  return 'red';
}

export interface WipaaRowInput {
  projectId: string;
  monthKey: string;
  billedCents: number;
  incurredCents: number;
  revenueEarnedCents: number;
  overUnderBilledCents: number;
  status: 'on-track' | 'under-billed' | 'over-billed';
  createdAt?: string;
}

export function buildWipaaEntry(input: WipaaRowInput): WipaaEntry {
  const escalationPct = input.incurredCents > 0
    ? Math.round((input.billedCents / input.incurredCents) * 1000) / 10
    : 100;
  return {
    id: `we-${input.projectId}-${input.monthKey}`,
    projectId: input.projectId,
    monthKey: input.monthKey,
    billedCents: input.billedCents,
    incurredCents: input.incurredCents,
    revenueEarnedCents: input.revenueEarnedCents,
    overUnderBilledCents: input.overUnderBilledCents,
    status: input.status,
    escalationPct,
    alertLevel: alertLevelFor(escalationPct),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export interface PnlRow {
  code: string;
  name: string;
  category: string;
  costCents: number;
  billedCents: number;
  marginCents: number;
  marginPct: number;
}

/** P&L from coded ledger lines + billed WIPAA totals. */
export function buildPnl(
  byWbs: Array<{ code: string; name: string; category: string; costCents: number }>,
  billedCents: number,
): PnlRow[] {
  return byWbs.map((line) => {
    const marginCents = billedCents - line.costCents;
    return {
      code: line.code,
      name: line.name,
      category: line.category,
      costCents: line.costCents,
      billedCents,
      marginCents,
      marginPct: line.costCents > 0 ? Math.round((marginCents / line.costCents) * 1000) / 10 : 0,
    };
  });
}

export interface GainFadeRow {
  description: string;
  baselineCents: number;
  actualCents: number;
  verdict: 'gain' | 'fade' | 'on-target';
  deltaCents: number;
}

/** Gain/Fade per cost line (baseline vs actual). */
export function analyzeGainFade(
  lines: Array<{ description: string; baselineCents: number; actualCents: number }>,
): GainFadeRow[] {
  return lines.map((l) => {
    const deltaCents = l.actualCents - l.baselineCents;
    const pct = Math.abs(l.baselineCents) > 0 ? Math.abs(deltaCents) / l.baselineCents : 0;
    return {
      description: l.description,
      baselineCents: l.baselineCents,
      actualCents: l.actualCents,
      verdict: deltaCents <= 0 && pct > 0.05 ? 'gain' : deltaCents > 0 && pct > 0.05 ? 'fade' : 'on-target',
      deltaCents,
    };
  });
}

export interface HandoverPack {
  digital: string[];
  physical: string[];
  completed: boolean;
}

/** Digital + physical key handover checklists (P6). */
export function buildHandoverPack(completedFlags: Record<string, boolean>): HandoverPack {
  const digital = [
    'As-built floor plans & elevations',
    'Building model (GLB)',
    'Warranty certificates',
    'O&M manuals',
    'Final account & lien waivers',
  ];
  const physical = [
    'Keys (main + duplicates)',
    'Remote controls & gate transmitters',
    'Water meter key',
    'Electrical DB schedule',
  ];
  const all = [...digital, ...physical];
  const completed = all.every((item) => completedFlags[item] === true);
  return { digital, physical, completed };
}

export function wipaaSummary(entries: WipaaEntry[]): {
  latest: WipaaEntry | null;
  monthCount: number;
  alerts: { green: number; amber: number; red: number };
  totalOverUnderBilledCents: number;
} {
  const sorted = [...entries].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  const alerts = { green: 0, amber: 0, red: 0 };
  let totalOverUnderBilledCents = 0;
  for (const e of entries) {
    alerts[e.alertLevel] += 1;
    totalOverUnderBilledCents += e.overUnderBilledCents;
  }
  return { latest: sorted[0] ?? null, monthCount: entries.length, alerts, totalOverUnderBilledCents };
}

// ── Solvency Dashboard ───────────────────────────────────────────────────

export interface SolvencyRatio {
  monthKey: string;
  ratio: number;
  alertLevel: WipaaAlertLevel;
  billedCents: number;
  incurredCents: number;
}

export interface SolvencyTrend {
  months: SolvencyRatio[];
  currentRatio: number;
  avgRatio: number;
  alertLevel: WipaaAlertLevel;
  minRatio: number;
  maxRatio: number;
}

/** Billed/incurred ratio (0–1+). Ratios below 0.7 (70%) flag red. */
export function solvencyRatioFor(entry: WipaaEntry): SolvencyRatio {
  const ratio = entry.incurredCents > 0
    ? Math.round((entry.billedCents / entry.incurredCents) * 100) / 100
    : 0;
  return {
    monthKey: entry.monthKey,
    ratio,
    alertLevel: alertLevelFor(ratio * 100),
    billedCents: entry.billedCents,
    incurredCents: entry.incurredCents,
  };
}

/** Build a solvency trend across sorted WIPAA entries. */
export function solvencyTrend(entries: WipaaEntry[]): SolvencyTrend {
  const sorted = [...entries].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  const months = sorted.map(solvencyRatioFor);
  if (months.length === 0) {
    return { months: [], currentRatio: 0, avgRatio: 0, alertLevel: 'red', minRatio: 0, maxRatio: 0 };
  }
  const ratios = months.map((m) => m.ratio);
  const sum = ratios.reduce((s, r) => s + r, 0);
  const avg = Math.round((sum / ratios.length) * 100) / 100;
  const latest = months[months.length - 1];
  return {
    months,
    currentRatio: latest.ratio,
    avgRatio: avg,
    alertLevel: latest.alertLevel,
    minRatio: Math.min(...ratios),
    maxRatio: Math.max(...ratios),
  };
}

// ── Contingency Spend-Down ──────────────────────────────────────────────

export type ContingencyAlertLevel = 'healthy' | 'caution' | 'warning' | 'critical';

export interface ContingencySpendDown {
  totalCents: number;
  spentCents: number;
  remainingCents: number;
  spentPct: number;
  alertLevel: ContingencyAlertLevel;
  months: number;
  monthlyBurnCents: number;
  projectedExhaustedMonthKey: string | null;
}

/** Contingency thresholds: healthy <50%, caution 50-70%, warning 70-90%, critical ≥90%. */
export function contingencyAlertLevel(spentPct: number): ContingencyAlertLevel {
  if (spentPct >= 90) return 'critical';
  if (spentPct >= 70) return 'warning';
  if (spentPct >= 50) return 'caution';
  return 'healthy';
}

export interface ContingencyMonth {
  monthKey: string;
  spentCents: number;
}

/** Compute contingency spend-down trajectory. */
export function contingencySpendDown(
  totalCents: number,
  months: ContingencyMonth[],
): ContingencySpendDown {
  if (totalCents <= 0 || months.length === 0) {
    return {
      totalCents,
      spentCents: 0,
      remainingCents: totalCents,
      spentPct: 0,
      alertLevel: 'healthy',
      months: months.length,
      monthlyBurnCents: 0,
      projectedExhaustedMonthKey: null,
    };
  }
  const spentCents = months.reduce((s, m) => s + m.spentCents, 0);
  const remainingCents = Math.max(0, totalCents - spentCents);
  const spentPct = Math.round((spentCents / totalCents) * 1000) / 10;
  const avgBurn = Math.round(spentCents / months.length);
  const monthsRemaining = avgBurn > 0 ? Math.floor(remainingCents / avgBurn) : Infinity;
  const lastMonth = months[months.length - 1].monthKey;
  const [y, m] = lastMonth.split('-').map(Number);
  const exhaustMonth = monthsRemaining === Infinity ? null : addMonths(y, m, monthsRemaining);
  return {
    totalCents,
    spentCents,
    remainingCents,
    spentPct,
    alertLevel: contingencyAlertLevel(spentPct),
    months: months.length,
    monthlyBurnCents: avgBurn,
    projectedExhaustedMonthKey: exhaustMonth,
  };
}

function addMonths(year: number, month: number, add: number): string {
  let m = month + add;
  let y = year;
  while (m > 12) { m -= 12; y += 1; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

// ── Monthly Cashflow Projection ─────────────────────────────────────────

export interface CashflowMonth {
  monthKey: string;
  inflowCents: number;
  outflowCents: number;
  netCents: number;
  cumulativeCents: number;
}

/** Build a monthly cashflow projection from WIPAA entries. */
export function monthlyCashflow(entries: WipaaEntry[]): CashflowMonth[] {
  const sorted = [...entries].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  let cumulative = 0;
  return sorted.map((e) => {
    const inflow = e.billedCents;
    const outflow = e.incurredCents;
    const net = inflow - outflow;
    cumulative += net;
    return {
      monthKey: e.monthKey,
      inflowCents: inflow,
      outflowCents: outflow,
      netCents: net,
      cumulativeCents: cumulative,
    };
  });
}

// ── Handover Checklist ──────────────────────────────────────────────────

export interface HandoverItem {
  id: string;
  label: string;
  category: 'digital' | 'physical';
  checked: boolean;
  signedBy: string | null;
  signedAt: string | null;
}

export interface HandoverChecklist {
  items: HandoverItem[];
  totalItems: number;
  checkedItems: number;
  completionPct: number;
  completed: boolean;
  digitalCompletionPct: number;
  physicalCompletionPct: number;
}

export interface HandoverSignOff {
  signerName: string;
  signedAt: string;
  itemsSignedOff: number;
  allComplete: boolean;
}

const DIGITAL_ITEMS = [
  'As-built floor plans & elevations',
  'Building model (GLB)',
  'Warranty certificates',
  'O&M manuals',
  'Final account & lien waivers',
];

const PHYSICAL_ITEMS = [
  'Keys (main + duplicates)',
  'Remote controls & gate transmitters',
  'Water meter key',
  'Electrical DB schedule',
];

/** Build an interactive handover checklist from a completed-flags map. */
export function buildHandoverChecklist(
  completedFlags: Record<string, boolean>,
): HandoverChecklist {
  const items: HandoverItem[] = [
    ...DIGITAL_ITEMS.map((label) => ({
      id: `d-${label}`,
      label,
      category: 'digital' as const,
      checked: completedFlags[label] === true,
      signedBy: null,
      signedAt: null,
    })),
    ...PHYSICAL_ITEMS.map((label) => ({
      id: `p-${label}`,
      label,
      category: 'physical' as const,
      checked: completedFlags[label] === true,
      signedBy: null,
      signedAt: null,
    })),
  ];
  const digitalItems = items.filter((i) => i.category === 'digital');
  const physicalItems = items.filter((i) => i.category === 'physical');
  const checkedItems = items.filter((i) => i.checked).length;
  return {
    items,
    totalItems: items.length,
    checkedItems,
    completionPct: items.length > 0 ? Math.round((checkedItems / items.length) * 100) : 0,
    completed: checkedItems === items.length,
    digitalCompletionPct: digitalItems.length > 0
      ? Math.round((digitalItems.filter((i) => i.checked).length / digitalItems.length) * 100)
      : 0,
    physicalCompletionPct: physicalItems.length > 0
      ? Math.round((physicalItems.filter((i) => i.checked).length / physicalItems.length) * 100)
      : 0,
  };
}

/** Sign off all checked items in a handover checklist. */
export function signOffHandover(
  checklist: HandoverChecklist,
  signerName: string,
  now?: string,
): HandoverSignOff {
  const ts = now ?? new Date().toISOString();
  const signed = checklist.items.filter((i) => i.checked).length;
  return {
    signerName,
    signedAt: ts,
    itemsSignedOff: signed,
    allComplete: signed === checklist.totalItems,
  };
}