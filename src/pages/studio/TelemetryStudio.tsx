import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TelemetryPanel } from '@/components/observability/TelemetryPanel';
import { ArrowLeft, Activity } from 'lucide-react';

export function TelemetryStudio() {
  const { id: projectId } = useParams<{ id: string }>();

  useEffect(() => {
    // no preload needed; TelemetryPanel loads on mount
  }, [projectId]);

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
            <Activity size={20} className="text-[var(--brand-accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Telemetry</h1>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Langfuse-style observability — local-first RAG, rerank, LLM, tool and agent-node event tracing.
          </p>
        </div>
      </div>
      <TelemetryPanel projectId={projectId} />
    </div>
  );
}
