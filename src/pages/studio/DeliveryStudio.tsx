import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { DeliveryWorkflowPanel } from '@/components/delivery/DeliveryWorkflowPanel';
import { MilestoneBoard } from '@/components/lifecycle/MilestoneBoard';
import { ArrowLeft, FileSpreadsheet, Flag } from 'lucide-react';

export function DeliveryStudio() {
  const { id: projectId } = useParams<{ id: string }>();
  const { loadForProject, currentDelivery, isLoading } = useDeliveryStore();
  const loadMilestones = useMilestoneStore((s) => s.loadForProject);
  const [viewMode, setViewMode] = useState<'workflow' | 'milestones'>('workflow');

  useEffect(() => {
    if (projectId) { loadForProject(projectId); loadMilestones(projectId); }
  }, [projectId, loadForProject, loadMilestones]);

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
      {viewMode === 'workflow' ? (
        <DeliveryWorkflowPanel delivery={currentDelivery} />
      ) : (
        <MilestoneBoard />
      )}
    </div>
  );
}
