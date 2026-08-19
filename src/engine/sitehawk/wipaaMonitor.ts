/**
 * P6 WIPAA & Handover engine.
 * Monthly true-profitability monitor (WIPAA vs P4P), escalation alert
 * levels (green ≥90 / amber 70-89 / red <70), P&L from the ledger, gain/fade
 * analysis, and the digital + physical key handover pack.
 */
import type { WipaaEntry, WipaaAlertLevel } from '@/domain/sitehawk';

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