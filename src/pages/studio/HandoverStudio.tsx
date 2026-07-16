import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useHandoverStore } from '@/stores/handoverStore';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { useChangeStore } from '@/stores/changeStore';
import { HandoverPanel } from '@/components/handover/HandoverPanel';
import { ArrowLeft, FolderOpen } from 'lucide-react';

export function HandoverStudio() {
  const { id: projectId } = useParams<{ id: string }>();
  const { loadForProject, isLoading } = useHandoverStore();
  const loadMilestones = useMilestoneStore((s) => s.loadForProject);
  const loadChanges = useChangeStore((s) => s.loadForProject);

  useEffect(() => {
    if (projectId) {
      loadForProject(projectId);
      loadMilestones(projectId);
      loadChanges(projectId);
    }
  }, [projectId, loadForProject, loadMilestones, loadChanges]);

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
            <FolderOpen size={20} className="text-[var(--brand-accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Handover Studio</h1>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Completion stages, snag lists, handover packages, asset register, warranties, and O&amp;M records.
          </p>
        </div>
      </div>
      <HandoverPanel projectId={projectId} />
    </div>
  );
}
