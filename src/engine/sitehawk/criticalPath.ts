/**
 * P1 Critical Path engine.
 * CPM dependency mapping, forward pass, critical-path identification,
 * Gantt rows and cashflow curve from the locked baseline + schedules.
 */
import type {
  ScheduleRecord,
  CriticalPathResult,
  WbsDictionaryEntry,
  RiskRegisterEntry,
  RiskProbability,
  RiskImpact,
  RiskStatus,
  SovLineItem,
  CashflowProjectionMonth,
  CashflowProjectionResult,
} from '@/domain/sitehawk';
import type { CostBaseline } from '@/domain/greenflag';

export interface CpmTask {
  id: string;
  name: string;
  wbsCode: string;
  durationDays: number;
  predecessors: string[];
  costCents: number;
  startDays?: number;
  endDays?: number;
}

export function buildCriticalPath(tasks: CpmTask[]): CriticalPathResult {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const startOf = new Map<string, number>();
  const memo = new Map<string, number>();

  function earliestStart(id: string): number {
    if (memo.has(id)) return memo.get(id)!;
    const task = byId.get(id);
    if (!task) return 0;
    let start = 0;
    for (const pred of task.predecessors) {
      const predTask = byId.get(pred);
      if (!predTask) continue;
      start = Math.max(start, earliestStart(pred) + predTask.durationDays);
    }
    memo.set(id, start);
    return start;
  }

  for (const task of tasks) {
    startOf.set(task.id, earliestStart(task.id));
  }

  const endDays = Math.max(0, ...tasks.map((t) => startOf.get(t.id)! + t.durationDays));

  const schedule: ScheduleRecord[] = tasks.map((t) => ({
    id: t.id,
    projectId: '',
    task: t.name,
    wbsCode: t.wbsCode,
    startDate: '',
    durationDays: t.durationDays,
    predecessors: t.predecessors,
    critical: false,
    costCents: t.costCents,
  }));

  const criticalPath = findCriticalPath(tasks, startOf, endDays);
  const criticalSet = new Set(criticalPath);
  schedule.forEach((s) => { s.critical = criticalSet.has(s.id); });

  return { schedule, criticalPath, totalDurationDays: endDays };
}

export function findCriticalPath(tasks: CpmTask[], startOf: Map<string, number>, endDays: number): string[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const successors = new Map<string, string[]>();
  for (const t of tasks) {
    for (const pred of t.predecessors) {
      const list = successors.get(pred) ?? [];
      list.push(t.id);
      successors.set(pred, list);
    }
  }
  const ends = tasks.filter((t) => (startOf.get(t.id) ?? 0) + t.durationDays >= endDays);
  if (ends.length === 0) return [];

  const path: string[] = [];
  let current = ends[0].id;
  while (current) {
    path.unshift(current);
    const task = byId.get(current);
    const preds = (task?.predecessors ?? []).filter((p) => byId.has(p));
    const criticalPred = preds.find(
      (p) => (startOf.get(p) ?? 0) + byId.get(p)!.durationDays === (startOf.get(current) ?? 0),
    );
    if (!criticalPred) break;
    current = criticalPred;
  }
  return path;
}

export interface GanttRow {
  id: string;
  task: string;
  wbsCode: string;
  startDays: number;
  endDays: number;
  durationDays: number;
  critical: boolean;
  progressPct: number;
}

/** Gantt rows from the realized schedule, with optional per-task progress. */
export function toGanttRows(schedule: ScheduleRecord[], progress?: Record<string, number>): GanttRow[] {
  const byId = new Map(schedule.map((s) => [s.id, s]));
  const memo = new Map<string, number>();
  function earliestStart(id: string): number {
    if (memo.has(id)) return memo.get(id)!;
    const task = byId.get(id);
    if (!task) return 0;
    let start = 0;
    for (const pred of task.predecessors) {
      const predTask = byId.get(pred);
      if (!predTask) continue;
      start = Math.max(start, earliestStart(pred) + predTask.durationDays);
    }
    memo.set(id, start);
    return start;
  }
  return schedule.map((s) => {
    const startDays = earliestStart(s.id);
    return {
      id: s.id,
      task: s.task,
      wbsCode: s.wbsCode,
      startDays,
      endDays: startDays + s.durationDays,
      durationDays: s.durationDays,
      critical: s.critical,
      progressPct: progress?.[s.id] ?? 0,
    };
  });
}

/** Build a WBS dictionary from schedule tasks, deriving parent-child hierarchy from dotted codes. */
export function buildWbsDictionary(
  projectId: string,
  schedule: ScheduleRecord[],
): WbsDictionaryEntry[] {
  const seen = new Map<string, WbsDictionaryEntry>();
  for (const s of schedule) {
    if (seen.has(s.wbsCode)) continue;
    const parts = s.wbsCode.split('.');
    const level = parts.length - 1;
    const parent = level > 0 ? parts.slice(0, level).join('.') : null;
    seen.set(s.wbsCode, {
      id: `wbs-${s.wbsCode}`,
      projectId,
      code: s.wbsCode,
      level,
      name: s.task,
      category: level === 0 ? 'division' : level === 1 ? 'section' : 'detail',
      parent: parent ? `wbs-${parent}` : null,
    });
  }
  return [...seen.values()];
}

/** Cashflow S-curve from the baseline: cumulative milestone/cost spend. */
export function cashflowCurve(baseline: CostBaseline | null, schedule: ScheduleRecord[]): Array<{ day: number; cumulativeCents: number }> {
  if (!baseline || schedule.length === 0) return [];
  const total = Math.max(baseline.totalCents, 1);
  const totalDays = Math.max(1, ...schedule.map((s) => s.durationDays));
  const out: Array<{ day: number; cumulativeCents: number }> = [];
  for (let day = 0; day <= totalDays; day += Math.max(1, Math.floor(totalDays / 20))) {
    const pct = day / totalDays;
    const cumulativeCents = Math.round(total * (0.35 * Math.min(1, pct * 3) + 0.4 * Math.max(0, Math.min(1, (pct - 0.33) * 3)) + 0.25 * Math.max(0, Math.min(1, (pct - 0.66) * 3))));
    out.push({ day, cumulativeCents });
  }
  return out;
}

// ---------------------------------------------------------------------------
// P1 Risk Register — SADC volatility-adjusted contingency
// ---------------------------------------------------------------------------

const PROBABILITY_WEIGHT: Record<RiskProbability, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const IMPACT_WEIGHT: Record<RiskImpact, number> = { negligible: 1, minor: 2, moderate: 3, major: 4, severe: 5 };

function riskScore(probability: RiskProbability, impact: RiskImpact): number {
  return PROBABILITY_WEIGHT[probability] * IMPACT_WEIGHT[impact];
}

function contingencyForScore(score: number, totalCents: number): number {
  const basePct = score >= 12 ? 0.15 : score >= 8 ? 0.10 : score >= 4 ? 0.06 : 0.03;
  return Math.round(totalCents * basePct);
}

interface RiskTemplate {
  category: string;
  description: string;
  baseProbability: RiskProbability;
  baseImpact: RiskImpact;
  owner: string;
  mitigation: string;
}

const RISK_TEMPLATES: RiskTemplate[] = [
  { category: 'Schedule', description: 'Critical path delay due to resource unavailability or weather', baseProbability: 'medium', baseImpact: 'major', owner: 'Project Manager', mitigation: 'Buffer float on non-critical tasks; pre-order materials 4 weeks ahead' },
  { category: 'Cost', description: 'Material price volatility (cement, steel, bricks) exceeding SADC baseline', baseProbability: 'high', baseImpact: 'moderate', owner: 'Quantity Surveyor', mitigation: 'Forward commitments locked at C4; volatility-adjusted contingency' },
  { category: 'Quality', description: 'Substandard workmanship requiring rework', baseProbability: 'medium', baseImpact: 'moderate', owner: 'Site Engineer', mitigation: 'Mandatory hold points; AI-vision verification at P3' },
  { category: 'Safety', description: 'Site incident causing work stoppage', baseProbability: 'low', baseImpact: 'severe', owner: 'HSE Officer', mitigation: 'Mandatory PPE; daily toolbox talks; incident reporting' },
  { category: 'Supply Chain', description: 'Supplier default or delivery delay beyond ETA', baseProbability: 'medium', baseImpact: 'major', owner: 'Procurement Lead', mitigation: 'Dual-source critical materials; escrow-gated payments' },
  { category: 'Regulatory', description: 'Non-compliance with SANS 10400 or ZBC by-laws', baseProbability: 'low', baseImpact: 'major', owner: 'Architect', mitigation: 'Continuous compliance checking at each stage gate' },
  { category: 'Financial', description: 'Cash flow shortfall between escrow releases', baseProbability: 'medium', baseImpact: 'moderate', owner: 'Financial Manager', mitigation: 'Monthly WIPAA forecasting; early billing on milestones' },
  { category: 'Environmental', description: 'Rain delays or extreme weather events', baseProbability: 'medium', baseImpact: 'minor', owner: 'Site Manager', mitigation: 'Weather monitoring; indoor-work contingency days in schedule' },
];

export function buildRiskRegister(
  projectId: string,
  schedule: ScheduleRecord[],
  baseline: CostBaseline | null,
  volatilityCv: number = 0,
  now: Date = new Date(),
): RiskRegisterEntry[] {
  const totalCents = baseline?.totalCents ?? schedule.reduce((s, r) => s + r.costCents, 0);
  const criticalCount = schedule.filter((s) => s.critical).length;

  return RISK_TEMPLATES.map((tpl, i) => {
    let { baseProbability: probability, baseImpact: impact } = tpl;
    let score = riskScore(probability, impact);

    // Escalate cost risks when market volatility is high
    if (tpl.category === 'Cost' && volatilityCv > 0.3) {
      probability = 'critical';
      impact = 'severe';
      score = riskScore(probability, impact);
    }
    // Escalate schedule risks when many critical tasks
    if (tpl.category === 'Schedule' && criticalCount > schedule.length * 0.4) {
      probability = 'high';
      score = riskScore(probability, impact);
    }

    const status: RiskStatus = score <= 4 ? 'accepted' : 'open';

    return {
      id: `risk-${projectId}-${String(i + 1).padStart(3, '0')}`,
      projectId,
      code: `R-${String(i + 1).padStart(3, '0')}`,
      category: tpl.category,
      description: tpl.description,
      probability,
      impact,
      score,
      status,
      owner: tpl.owner,
      mitigation: tpl.mitigation,
      contingencyCents: contingencyForScore(score, totalCents),
      createdAt: now.toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// P1 Schedule of Values — earned value tracking per WBS line
// ---------------------------------------------------------------------------

export function buildScheduleOfValues(
  projectId: string,
  schedule: ScheduleRecord[],
  baseline: CostBaseline | null,
): SovLineItem[] {
  const totalCents = baseline?.totalCents ?? schedule.reduce((s, r) => s + r.costCents, 0);
  const totalDays = Math.max(1, ...schedule.map((s) => s.durationDays));

  // Group schedule by WBS code
  const byWbs = new Map<string, { description: string; costCents: number; durationDays: number }>();
  for (const s of schedule) {
    const existing = byWbs.get(s.wbsCode);
    if (existing) {
      existing.costCents += s.costCents;
      existing.durationDays = Math.max(existing.durationDays, s.durationDays);
    } else {
      byWbs.set(s.wbsCode, { description: s.task, costCents: s.costCents, durationDays: s.durationDays });
    }
  }

  const lines: SovLineItem[] = [];
  for (const [wbsCode, entry] of byWbs) {
    const schedulePct = totalDays > 0 ? (entry.durationDays / totalDays) * 100 : 0;
    const amountCents = totalCents > 0 ? Math.round((entry.costCents / Math.max(totalCents, 1)) * totalCents) : 0;
    lines.push({
      id: `sov-${projectId}-${wbsCode}`,
      projectId,
      wbsCode,
      description: entry.description,
      unit: 'lot',
      quantity: 1,
      rateCents: amountCents,
      amountCents,
      schedulePct: Math.round(schedulePct * 10) / 10,
      earnedCents: 0,
      retainedCents: 0,
    });
  }
  return lines;
}

// ---------------------------------------------------------------------------
// P1 Monthly Cashflow Projection — inflows vs outflows with next-cashflow
// ---------------------------------------------------------------------------

export function monthlyCashflowProjection(
  baseline: CostBaseline | null,
  schedule: ScheduleRecord[],
  startDate: string = new Date().toISOString().slice(0, 10),
  months: number = 12,
): CashflowProjectionResult {
  if (!baseline || schedule.length === 0) {
    return { months: [], totalInflowCents: 0, totalOutflowCents: 0, nextCashflowDate: '', nextCashflowCents: 0 };
  }

  const totalCents = Math.max(baseline.totalCents, 1);
  const totalDays = Math.max(1, ...schedule.map((s) => s.durationDays));

  // Milestone split: 35% / 40% / 25% (foundation / shell / finishes)
  const milestoneSplits = [0.35, 0.40, 0.25];
  const baseDate = new Date(startDate + 'T00:00:00Z');

  const result: CashflowProjectionMonth[] = [];
  let cumulativeNet = 0;
  let totalInflow = 0;
  let totalOutflow = 0;
  let nextCashflowDate = '';
  let nextCashflowCents = 0;

  for (let m = 0; m < months; m++) {
    const monthDate = new Date(baseDate);
    monthDate.setUTCMonth(monthDate.getUTCMonth() + m);
    const monthKey = monthDate.toISOString().slice(0, 7);
    const label = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

    // Which milestone falls in this month?
    const dayInMonth = (m / months) * totalDays;
    const plannedInflowCents = (() => {
      if (m < Math.ceil(months * 0.35)) {
        // Foundation phase
        const phasePct = Math.min(1, dayInMonth / (totalDays * 0.35));
        return Math.round(totalCents * milestoneSplits[0] * phasePct / Math.ceil(months * 0.35));
      } else if (m < Math.ceil(months * 0.75)) {
        // Shell phase
        const phasePct = Math.min(1, (dayInMonth - totalDays * 0.35) / (totalDays * 0.40));
        return Math.round(totalCents * milestoneSplits[1] * phasePct / Math.ceil(months * 0.40));
      } else {
        // Finishes phase
        const phasePct = Math.min(1, (dayInMonth - totalDays * 0.75) / (totalDays * 0.25));
        return Math.round(totalCents * milestoneSplits[2] * phasePct / Math.ceil(months * 0.25));
      }
    })();

    // Outflow = proportionate share of costs
    const plannedOutflowCents = Math.round(totalCents / months);

    const netCents = plannedInflowCents - plannedOutflowCents;
    cumulativeNet += netCents;
    totalInflow += plannedInflowCents;
    totalOutflow += plannedOutflowCents;

    result.push({ monthKey, label, plannedInflowCents, plannedOutflowCents, netCents, cumulativeNetCents: cumulativeNet });

    // Track next positive cashflow
    if (plannedInflowCents > 0 && !nextCashflowDate) {
      nextCashflowDate = monthKey;
      nextCashflowCents = plannedInflowCents;
    }
  }

  return { months: result, totalInflowCents: totalInflow, totalOutflowCents: totalOutflow, nextCashflowDate, nextCashflowCents };
}