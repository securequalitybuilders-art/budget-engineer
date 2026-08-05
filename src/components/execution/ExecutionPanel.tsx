import { useEffect, useMemo, useState } from 'react';
import GanttChart from './GanttChart';
import BudgetVsActual from './BudgetVsActual';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { PHASES } from '@/engine/construction/constructionPhases';
import {
  seedMilestonesFromPhases,
  milestonesToGanttTasks,
  milestonesToBudgetCategories,
  deriveEscrowFromMilestones,
  totalDaysForPhases,
} from '@/engine/construction/executionSync';
import { getEscrowSummary } from '@/engine/marketplace/escrowEngine';
import { Play, Calendar, DollarSign, Users, Loader2, Lock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

const PHASE_LIST = Object.values(PHASES);
const DEFAULT_BUDGET_CENTS = 100_000_00;

interface ExecutionPanelProps {
  projectId?: string;
  budgetCents?: number;
}

export default function ExecutionPanel({ projectId, budgetCents }: ExecutionPanelProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'financials' | 'resources'>('schedule');

  const milestones = useMilestoneStore((s) => s.milestones);
  const isLoading = useMilestoneStore((s) => s.isLoading);
  const loadForProject = useMilestoneStore((s) => s.loadForProject);
  const addMilestone = useMilestoneStore((s) => s.addMilestone);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void (async () => {
      await loadForProject(projectId);
      if (cancelled) return;
      if (useMilestoneStore.getState().milestones.length > 0) return;
      const seed = seedMilestonesFromPhases({
        projectId,
        phases: PHASE_LIST,
        totalBudgetCents: budgetCents ?? DEFAULT_BUDGET_CENTS,
      });
      for (const milestone of seed) {
        if (cancelled) return;
        await addMilestone(milestone);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, budgetCents, loadForProject, addMilestone]);

  const ganttTasks = useMemo(() => milestonesToGanttTasks(milestones, PHASE_LIST), [milestones]);
  const budgetCategories = useMemo(() => milestonesToBudgetCategories(milestones), [milestones]);
  const escrow = useMemo(() => deriveEscrowFromMilestones(projectId ?? 'project', milestones), [projectId, milestones]);
  const escrowSummary = useMemo(() => getEscrowSummary(escrow), [escrow]);
  const totalDays = useMemo(() => totalDaysForPhases(PHASE_LIST), []);

  const overallProgress = useMemo(() => {
    if (ganttTasks.length === 0) return 0;
    return Math.round(ganttTasks.reduce((sum, t) => sum + t.progress, 0) / ganttTasks.length);
  }, [ganttTasks]);

  const phaseSummary = useMemo(() => {
    return PHASE_LIST.map((phase) => ({
      id: phase.id,
      title: phase.title,
      trade: phase.trade,
      total: phase.workItems.length,
      pending: phase.workItems.filter((w) => w.status === 'pending').length,
      inProgress: phase.workItems.filter((w) => w.status === 'in-progress').length,
      completed: phase.workItems.filter((w) => w.status === 'completed').length,
      workItems: phase.workItems,
    }));
  }, []);

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)] p-4 md:p-6 overflow-y-auto">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
            <Play className="text-emerald-500" size={24} />
            Execution Monitor
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Live construction progress driven by the milestone and escrow engines.
          </p>
        </div>

        <div className="flex bg-stone-900 border border-stone-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'schedule' ? 'bg-stone-800 text-stone-200 shadow' : 'text-stone-400 hover:text-stone-300 hover:bg-stone-800/50'}`}
          >
            <Calendar size={16} /> Schedule
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'financials' ? 'bg-stone-800 text-stone-200 shadow' : 'text-stone-400 hover:text-stone-300 hover:bg-stone-800/50'}`}
          >
            <DollarSign size={16} /> Financials
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'resources' ? 'bg-stone-800 text-stone-200 shadow' : 'text-stone-400 hover:text-stone-300 hover:bg-stone-800/50'}`}
          >
            <Users size={16} /> Resources
          </button>
        </div>
      </div>

      {isLoading && milestones.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-stone-400 text-sm gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading execution data…
        </div>
      ) : milestones.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-stone-400 text-sm">
          No milestones found for this project.
        </div>
      ) : (
        <div className="flex-1">
          {activeTab === 'schedule' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-stone-300 font-medium text-lg">Project Gantt Chart</div>
                <div className="text-xs text-stone-400">Overall progress: <span className="font-bold text-stone-200">{overallProgress}%</span></div>
              </div>
              <div className="mb-4">
                <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                  <div className="h-full rounded-full bg-cyan-500 transition-all duration-500" style={{ width: `${overallProgress}%` }} />
                </div>
              </div>
              <GanttChart tasks={ganttTasks} totalDays={totalDays} />
              <div className="flex flex-wrap gap-3 text-[10px] text-stone-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Released</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> In review</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Delayed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-stone-500 inline-block" /> Pending</span>
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
              <div className="mb-2 text-stone-300 font-medium text-lg">Escrow Release Status</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <EscrowCard icon={<Lock size={14} />} label="Total Contract" value={formatMoney(escrowSummary.total)} tone="text-stone-200" />
                <EscrowCard icon={<CheckCircle2 size={14} />} label="Released" value={formatMoney(escrowSummary.released)} tone="text-emerald-400" />
                <EscrowCard icon={<Lock size={14} />} label="Locked" value={formatMoney(escrowSummary.locked)} tone="text-amber-400" />
                <EscrowCard icon={<AlertTriangle size={14} />} label="Disputed" value={formatMoney(escrowSummary.disputed)} tone="text-rose-400" />
              </div>
              <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
                <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
                  <span>Escrow progress</span>
                  <span className="font-bold text-stone-200">{escrowSummary.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${escrowSummary.progress}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
                  {escrowSummary.nextMilestone && (
                    <span className="flex items-center gap-1 text-stone-300">
                      Next milestone: <span className="font-medium">{escrowSummary.nextMilestone.title}</span>
                      <ArrowRight size={12} className="text-stone-400" />
                      {formatMoney(escrowSummary.nextMilestone.amount)}
                    </span>
                  )}
                  {escrowSummary.overdueCount > 0 && (
                    <span className="text-rose-400">{escrowSummary.overdueCount} overdue milestone(s)</span>
                  )}
                </div>
              </div>
              <div className="mb-1 text-stone-300 font-medium text-lg">Budget vs Actual</div>
              <BudgetVsActual categories={budgetCategories} />
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
              <div className="mb-2 text-stone-300 font-medium text-lg">Construction Work Packages</div>
              {phaseSummary.map((phase) => (
                <div key={phase.id} className="bg-stone-900 border border-stone-800 rounded-lg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-stone-200">{phase.title}</h3>
                      <p className="text-[11px] text-stone-400 mt-0.5">{phase.trade}</p>
                    </div>
                    <div className="flex gap-2 text-[10px]">
                      <span className="rounded-full bg-stone-800 px-2 py-0.5 text-stone-400">{phase.total} items</span>
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-400">{phase.inProgress} active</span>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-400">{phase.completed} done</span>
                      <span className="rounded-full bg-stone-700/40 px-2 py-0.5 text-stone-400">{phase.pending} pending</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {phase.workItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-[11px]">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.status === 'completed' ? 'bg-emerald-500' : item.status === 'in-progress' ? 'bg-cyan-500' : 'bg-stone-600'}`} />
                        <span className="text-stone-300">{item.label}</span>
                        <span className="text-stone-400 ml-auto truncate">{item.spec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EscrowCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-stone-400 text-[11px] mb-1">{icon} {label}</div>
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
    </div>
  );
}
