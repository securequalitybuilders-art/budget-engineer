import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProcurementStore } from '@/stores/procurementStore';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { ProcurementPanel } from '@/components/procurement/ProcurementPanel';
import { ArrowLeft, ShoppingCart } from 'lucide-react';

export function ProcurementStudio() {
  const { id: projectId } = useParams<{ id: string }>();
  const loadForProject = useProcurementStore((s) => s.loadForProject);
  const isLoading = useProcurementStore((s) => s.isLoading);
  const loadMilestones = useMilestoneStore((s) => s.loadForProject);

  useEffect(() => {
    if (projectId) {
      loadForProject(projectId);
      loadMilestones(projectId);
    }
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
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-[var(--brand-accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Procurement</h1>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Requests, purchase orders, deliveries, and BOQ-linked procurement.
          </p>
        </div>
      </div>
      <div className="flex gap-2 text-[9px]">
        <Link to={`/project/${projectId}/studio/delivery`} className="text-cyan-400 hover:underline">Delivery</Link>
        <span className="text-[var(--text-tertiary)]">·</span>
        <Link to={`/project/${projectId}/studio/project-controls`} className="text-cyan-400 hover:underline">Project Controls</Link>
      </div>
      <ProcurementPanel projectId={projectId} />
    </div>
  );
}
