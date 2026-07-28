import { ExecutionStatus } from '../../domain/marketplace';

export function computeExecutionStatus(data: {
  tasks: { id: string; plannedDays: number; actualDays: number; dependencies: string[] }[];
  budgetCategories: { category: string; budgeted: number; actual: number }[];
  qualityMetrics: { metric: string; score: number; target: number }[];
  resources: { role: string; required: number; assigned: number }[];
}): ExecutionStatus {
  const schedule = data.tasks.map(t => ({
    taskId: t.id, taskName: t.id, planned: t.plannedDays, actual: t.actualDays,
    variance: t.actualDays - t.plannedDays,
    status: (t.actualDays > t.plannedDays ? 'behind' : t.actualDays === 0 ? 'critical' : 'on_track') as 'ahead' | 'on_track' | 'behind' | 'critical',
  }));
  const budget = data.budgetCategories.map(b => ({
    category: b.category, budgeted: b.budgeted, actual: b.actual,
    variance: b.budgeted - b.actual,
    percentageUsed: b.budgeted > 0 ? Math.round((b.actual / b.budgeted) * 100) : 0,
  }));
  const quality = data.qualityMetrics.map(q => ({
    metric: q.metric, score: q.score, target: q.target,
    status: (q.score >= q.target ? 'pass' : q.score >= q.target * 0.8 ? 'warn' : 'fail') as 'pass' | 'warn' | 'fail',
  }));
  const resources = data.resources.map(r => ({
    role: r.role, required: r.required, assigned: r.assigned,
    gap: r.required - r.assigned,
    utilizationPercent: r.required > 0 ? Math.round((r.assigned / r.required) * 100) : 0,
  }));
  const taskProgress = data.tasks.length > 0
    ? Math.round((data.tasks.filter(t => t.actualDays > 0).length / data.tasks.length) * 100)
    : 0;
  const budgetProgress = data.budgetCategories.length > 0
    ? Math.round((data.budgetCategories.filter(b => b.actual > 0).length / data.budgetCategories.length) * 100)
    : 0;
  const overallProgress = Math.round((taskProgress + budgetProgress) / 2);

  const criticalPath = findCriticalPath(data.tasks);
  return { projectId: '', overallProgress, criticalPath, schedule, budget, quality, resources, risks: [] };
}

export function findCriticalPath(tasks: { id: string; plannedDays: number; dependencies: string[] }[]): string[] {
  const graph = new Map<string, { days: number; deps: string[] }>();
  for (const t of tasks) graph.set(t.id, { days: t.plannedDays, deps: t.dependencies });
  const memo = new Map<string, number>();
  function dfs(nodeId: string): number {
    if (memo.has(nodeId)) return memo.get(nodeId)!;
    const node = graph.get(nodeId);
    if (!node) return 0;
    if (node.deps.length === 0) { memo.set(nodeId, node.days); return node.days; }
    const maxPred = Math.max(...node.deps.map(d => dfs(d)));
    memo.set(nodeId, maxPred + node.days);
    return memo.get(nodeId)!;
  }
  let maxDuration = 0; let maxNode = '';
  for (const id of graph.keys()) {
    const dur = dfs(id);
    if (dur > maxDuration) { maxDuration = dur; maxNode = id; }
  }
  const path: string[] = [];
  let current = maxNode;
  while (current) {
    path.unshift(current);
    const node = graph.get(current);
    if (!node || node.deps.length === 0) break;
    let next = ''; let maxPredDur = -1;
    for (const dep of node.deps) {
      const dur = memo.get(dep) ?? 0;
      if (dur > maxPredDur) { maxPredDur = dur; next = dep; }
    }
    current = next;
  }
  return path;
}

export function scheduleVariance(tasks: { id: string; plannedDays: number; actualDays: number }[]): number {
  return tasks.reduce((s, t) => s + (t.actualDays - t.plannedDays), 0);
}

export function budgetVariance(categories: { budgeted: number; actual: number }[]): number {
  return categories.reduce((s, c) => s + (c.budgeted - c.actual), 0);
}

export function costPerformanceIndex(categories: { budgeted: number; actual: number }[]): number {
  const earned = categories.reduce((s, c) => s + c.budgeted, 0);
  const actual = categories.reduce((s, c) => s + c.actual, 0);
  return actual > 0 ? earned / actual : 1;
}
