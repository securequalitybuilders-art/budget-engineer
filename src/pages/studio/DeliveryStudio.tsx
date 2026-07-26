import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { DeliveryWorkflowPanel } from '@/components/delivery/DeliveryWorkflowPanel';
import { MilestoneBoard } from '@/components/lifecycle/MilestoneBoard';
import { computeMilestoneLifecycleSummary } from '@/lib/lifecycle/lifecycleSummary';
import { ArrowLeft, FileSpreadsheet, Flag, AlertTriangle } from 'lucide-react';

export function DeliveryStudio() {
  const { id: projectId } = useParams<{ id: string }>();
  const { loadForProject, currentDelivery, isLoading } = useDeliveryStore();
  const loadMilestones = useMilestoneStore((s) => s.loadForProject);
  const milestones = useMilestoneStore((s) => s.milestones);
  const [viewMode, setViewMode] = useState<'workflow' | 'milestones'>('workflow');

  useEffect(() => {
    if (projectId) { loadForProject(projectId); loadMilestones(projectId); }
  }, [projectId, loadForProject, loadMilestones]);

  const milestoneSummary = useMemo(() => computeMilestoneLifecycleSummary(milestones), [milestones]);

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">No project selected</h2>
          <Link to="/" className="text-sm text-[var(--brand-accent)] underline">Back to home</Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--brand-accent)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          to={`/project/${projectId}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-[var(--brand-accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Delivery Studio</h1>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Issue management, drawing register, package tracking, and delivery workflow.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-[var(--bg-tertiary)] p-0.5">
          <button
            onClick={() => setViewMode('workflow')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'workflow' ? 'bg-[var(--brand-accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Workflow
          </button>
          <button
            onClick={() => setViewMode('milestones')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'milestones' ? 'bg-[var(--brand-accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            <Flag size={14} className="mr-1 inline" />
            Milestones
          </button>
        </div>
      </div>

      {/* Milestone summary bar — visible in both modes */}
      {milestoneSummary.total > 0 && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flag size={14} className="text-cyan-400" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">Milestone Summary</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">{milestoneSummary.overallProgressPct}% complete</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-500"
              style={{ width: `${milestoneSummary.overallProgressPct}%` }}
            />
          </div>
          <div className="flex gap-4 text-[9px]">
            <span className="text-green-400">{milestoneSummary.released} released</span>
            <span className="text-amber-400">{milestoneSummary.held} held</span>
            <span className="text-red-400">{milestoneSummary.rejected} rejected</span>
            <span className="text-blue-400">{milestoneSummary.pending} pending</span>
          </div>
          {milestoneSummary.criticalDelayed.length > 0 && (
            <div className="mt-1 flex items-center gap-1 text-[9px] text-red-400">
              <AlertTriangle size={10} />
              {milestoneSummary.criticalDelayed.length} critical delay(s)
            </div>
          )}
          {viewMode === 'workflow' && (
            <button
              onClick={() => setViewMode('milestones')}
              className="mt-2 text-[9px] text-cyan-400 hover:underline"
            >
              View all milestones →
            </button>
          )}
        </div>
      )}

      {/* Cross-studio navigation hints */}
      <div className="flex gap-2 text-[9px]">
        <Link to={`/project/${projectId}/studio/assurance`} className="text-cyan-400 hover:underline">Assurance</Link>
        <span className="text-[var(--text-tertiary)]">·</span>
        <Link to={`/project/${projectId}/studio/procurement`} className="text-cyan-400 hover:underline">Procurement</Link>
        <span className="text-[var(--text-tertiary)]">·</span>
        <Link to={`/project/${projectId}/studio/handover`} className="text-cyan-400 hover:underline">Handover</Link>
        <span className="text-[var(--text-tertiary)]">·</span>
        <Link to={`/project/${projectId}/studio/project-controls`} className="text-cyan-400 hover:underline">Project Controls</Link>
      </div>

      {viewMode === 'workflow' ? (
        <DeliveryWorkflowPanel delivery={currentDelivery} />
      ) : (
        <MilestoneBoard />
      )}
    </div>
  );
}
