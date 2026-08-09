import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWipaaStore } from '@/stores/wipaaStore';
import { WipaaPanel } from '@/components/payment/WipaaPanel';
import { ArrowLeft, Scale } from 'lucide-react';
import { StudioLoading } from '@/components/ui/StudioLoading';

export function WipaaStudio() {
  const { id: projectId } = useParams<{ id: string }>();
  const loadForProject = useWipaaStore((s) => s.loadForProject);
  const isLoading = useWipaaStore((s) => s.isLoading);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

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
        <StudioLoading />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          to={`/project/${projectId}`}
          className="touch-target flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Scale size={20} className="text-[var(--brand-accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">WIPAA</h1>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Work-in-Progress Accounting Adjustment — monthly auto-run revenue recognition snapshots.
          </p>
        </div>
      </div>
      <div className="flex gap-2 text-[9px]">
        <Link to={`/project/${projectId}/studio/ledger`} className="text-cyan-400 hover:underline">True Ledger</Link>
        <span className="text-[var(--text-tertiary)]">·</span>
        <Link to={`/project/${projectId}/studio/closeout`} className="text-cyan-400 hover:underline">Closeout</Link>
      </div>
      <WipaaPanel projectId={projectId} />
    </div>
  );
}
