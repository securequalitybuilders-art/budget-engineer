import { useMemo, useState } from 'react';
import { ArrowRight, Calendar, Network } from 'lucide-react';
import type { ScheduleRecord } from '@/domain/sitehawk';
import { toGanttRows, buildWbsDictionary, buildScheduleOfValues } from '@/engine/sitehawk/criticalPath';
import type { CostBaseline } from '@/domain/greenflag';
import { DzCard, DzPill, Kicker, Money, DataTable } from '@/components/dzenhare';

interface CriticalPathGanttProps {
  projectId: string;
  schedule: ScheduleRecord[];
  baseline: CostBaseline | null;
}

function dependencyMap(schedule: ScheduleRecord[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const s of schedule) {
    map.set(s.id, s.predecessors);
  }
  return map;
}

function MilestoneMarker({ label, day, total }: { label: string; day: number; total: number }) {
  const leftPct = total > 0 ? (day / total) * 100 : 0;
  return (
    <div
      className="absolute -top-1 z-10 flex flex-col items-center"
      style={{ left: `${leftPct}%` }}
      data-testid="milestone-marker"
    >
      <div className="h-3 w-3 rotate-45 border-2 border-[var(--brand-accent)] bg-[var(--bg-primary)]" />
      <span className="mt-0.5 whitespace-nowrap text-[9px] font-semibold text-[var(--brand-accent)]">{label}</span>
    </div>
  );
}

function DependencyArrow({ fromPct, toPct, y }: { fromPct: number; toPct: number; y: number }) {
  if (Math.abs(toPct - fromPct) < 1) return null;
  const width = Math.abs(toPct - fromPct);
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ left: `${Math.min(fromPct, toPct)}%`, top: y - 4, width: `${width}%`, height: 16 }}
      viewBox={`0 0 ${width * 4} 16`}
      preserveAspectRatio="none"
      data-testid="dependency-arrow"
    >
      <line
        x1={fromPct < toPct ? 0 : width * 4}
        y1="8"
        x2={fromPct < toPct ? width * 4 : 0}
        y2="8"
        stroke="var(--brand-accent)"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        opacity="0.5"
      />
      <polygon
        points={fromPct < toPct ? `${width * 4 - 4},4 ${width * 4},8 ${width * 4 - 4},12` : `4,4 0,8 4,12`}
        fill="var(--brand-accent)"
        opacity="0.5"
      />
    </svg>
  );
}

export function CriticalPathGantt({ projectId, schedule, baseline }: CriticalPathGanttProps) {
  const ganttRows = useMemo(() => toGanttRows(schedule), [schedule]);
  const totalDuration = useMemo(() => Math.max(0, ...ganttRows.map((r) => r.endDays)), [ganttRows]);
  const criticalCount = useMemo(() => ganttRows.filter((r) => r.critical).length, [ganttRows]);
  const wbsEntries = useMemo(() => buildWbsDictionary(projectId, schedule), [projectId, schedule]);
  const sovLines = useMemo(() => buildScheduleOfValues(projectId, schedule, baseline), [projectId, schedule, baseline]);
  const depMap = useMemo(() => dependencyMap(schedule), [schedule]);

  // Milestones: start of phase 1, start of phase 2, completion
  const milestones = useMemo(() => {
    if (totalDuration === 0) return [];
    return [
      { label: 'Foundation', day: Math.round(totalDuration * 0.35) },
      { label: 'Shell Complete', day: Math.round(totalDuration * 0.75) },
      { label: 'Practical Completion', day: totalDuration },
    ];
  }, [totalDuration]);

  // Dependency arrows (only between tasks with actual dependencies)
  const arrows = useMemo(() => {
    const rows = ganttRows;
    const result: Array<{ fromPct: number; toPct: number; y: number }> = [];
    for (let i = 0; i < rows.length; i++) {
      const deps = depMap.get(rows[i].id);
      if (!deps || deps.length === 0) continue;
      for (const depId of deps) {
        const depIdx = rows.findIndex((r) => r.id === depId);
        if (depIdx < 0) continue;
        const fromPct = totalDuration > 0 ? (rows[depIdx].endDays / totalDuration) * 100 : 0;
        const toPct = totalDuration > 0 ? (rows[i].startDays / totalDuration) * 100 : 0;
        result.push({ fromPct, toPct, y: i * 28 + 10 });
      }
    }
    return result;
  }, [ganttRows, depMap, totalDuration]);

  const [showWbs, setShowWbs] = useState(false);
  const [showSov, setShowSov] = useState(false);

  return (
    <DzCard className="p-4" data-testid="critical-path-gantt">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Kicker>Critical Path Gantt</Kicker>
          <DzPill tone="disputed">{criticalCount} critical</DzPill>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWbs(!showWbs)}
            className="rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            data-testid="toggle-wbs"
          >
            <Network className="mr-1 inline h-3 w-3" />
            WBS Dictionary ({wbsEntries.length})
          </button>
          <button
            onClick={() => setShowSov(!showSov)}
            className="rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            data-testid="toggle-sov"
          >
            <Calendar className="mr-1 inline h-3 w-3" />
            Schedule of Values ({sovLines.length})
          </button>
        </div>
      </div>

      {/* Gantt Timeline */}
      <div className="mb-2 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-[var(--danger)]/80" /> Critical path
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-[var(--brand-primary)]/60" /> Float
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rotate-45 border border-[var(--brand-accent)]" /> Milestone
        </span>
        <span className="flex items-center gap-1">
          <ArrowRight className="h-2 w-2 text-[var(--brand-accent)]" /> Dependency
        </span>
      </div>

      <div className="relative overflow-x-auto" data-testid="gantt-timeline">
        <div className="min-w-[640px]">
          {/* Milestone row */}
          {milestones.length > 0 && (
            <div className="relative mb-1 h-6">
              {milestones.map((m) => (
                <MilestoneMarker key={m.label} label={m.label} day={m.day} total={totalDuration} />
              ))}
            </div>
          )}

          {/* Task rows */}
          <div className="relative">
            {ganttRows.map((row) => {
              const leftPct = totalDuration > 0 ? (row.startDays / totalDuration) * 100 : 0;
              const widthPct = totalDuration > 0 ? (row.durationDays / totalDuration) * 100 : 0;
              return (
                <div key={row.id} className="mb-1 flex items-center gap-2" data-testid="gantt-row">
                  <span className="w-36 shrink-0 truncate text-[11px] text-[var(--text-primary)]">{row.task}</span>
                  <div className="relative h-5 flex-1 rounded bg-[var(--bg-tertiary)]/60">
                    <div
                      className={`absolute top-0 h-full rounded ${row.critical ? 'bg-[var(--danger)]/80' : 'bg-[var(--brand-primary)]/60'}`}
                      style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
                    />
                    {row.critical && (
                      <span
                        className="absolute top-0.5 right-1 text-[8px] font-bold text-white/80"
                      >
                        CP
                      </span>
                    )}
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono text-[10px] text-[var(--text-muted)]">{row.durationDays}d</span>
                </div>
              );
            })}

            {/* Dependency arrows overlay */}
            {arrows.map((a, i) => (
              <DependencyArrow key={i} fromPct={a.fromPct} toPct={a.toPct} y={a.y} />
            ))}
          </div>

          {ganttRows.length === 0 && (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">No schedule tasks — generate or import a WBS schedule.</p>
          )}
        </div>
      </div>

      {/* WBS Dictionary panel */}
      {showWbs && (
        <div className="mt-4 border-t border-[var(--border-default)] pt-4" data-testid="wbs-dictionary">
          <Kicker>WBS Dictionary</Kicker>
          <DataTable
            columns={[
              { key: 'code', header: 'Code', render: (r) => <span className="font-mono text-xs font-bold">{r.code}</span> },
              { key: 'level', header: 'Lvl', align: 'right', render: (r) => <span className="font-mono text-xs">{r.level}</span> },
              { key: 'name', header: 'Description' },
              { key: 'category', header: 'Category' },
              { key: 'parent', header: 'Parent', render: (r) => <span className="font-mono text-xs">{r.parent ?? '—'}</span> },
            ]}
            rows={wbsEntries}
            rowKey={(r) => r.code}
            className="mt-2"
          />
        </div>
      )}

      {/* Schedule of Values panel */}
      {showSov && (
        <div className="mt-4 border-t border-[var(--border-default)] pt-4" data-testid="schedule-of-values">
          <Kicker>Schedule of Values</Kicker>
          <DataTable
            columns={[
              { key: 'wbsCode', header: 'WBS', render: (r) => <span className="font-mono text-xs">{r.wbsCode}</span> },
              { key: 'description', header: 'Description' },
              { key: 'amountCents', header: 'Amount', align: 'right', render: (r) => <Money cents={r.amountCents} className="text-xs" /> },
              { key: 'schedulePct', header: 'Schedule %', align: 'right', render: (r) => <span className="font-mono text-xs">{r.schedulePct}%</span> },
            ]}
            rows={sovLines}
            rowKey={(r) => r.id}
            className="mt-2"
          />
          <div className="mt-2 flex justify-end border-t border-[var(--border-default)] pt-2">
            <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
              Total: <Money cents={sovLines.reduce((s, l) => s + l.amountCents, 0)} className="text-xs" />
            </span>
          </div>
        </div>
      )}
    </DzCard>
  );
}
