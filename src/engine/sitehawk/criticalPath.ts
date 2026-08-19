/**
 * P1 Critical Path engine.
 * CPM dependency mapping, forward pass, critical-path identification,
 * Gantt rows and cashflow curve from the locked baseline + schedules.
 */
import type { ScheduleRecord, CriticalPathResult, WbsDictionaryEntry } from '@/domain/sitehawk';
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