import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';

interface PropertiesPanelProps {
  variant?: 'sidebar' | 'full';
}

export function PropertiesPanel({ variant = 'sidebar' }: PropertiesPanelProps) {
  const { currentProject, currentBrief } = useProjectStore();
  const containerClass = variant === 'full'
    ? 'flex-1 overflow-y-auto bg-[var(--bg-secondary)] p-4'
    : 'w-80 flex-shrink-0 overflow-y-auto border-l border-[var(--border-default)] bg-[var(--bg-secondary)] p-4';

  return (
    <div className={cn(containerClass, 'flex flex-col')}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display font-semibold">Properties</h3>
      </div>

      {!currentProject ? (
        <p className="text-sm text-[var(--text-muted)]">No project selected.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-default)] p-3">
            <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Project</span>
            <p className="font-medium">{currentProject.name}</p>
            <p className="text-xs text-[var(--text-secondary)]">{currentProject.profile}</p>
          </div>

          <div className="rounded-lg border border-[var(--border-default)] p-3">
            <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Brief</span>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {currentBrief?.rawText || 'No brief yet.'}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-default)] p-3">
            <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Standards</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {(currentBrief?.parsed.standards || []).map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
                >
                  {s}
                </span>
              )) || <span className="text-sm text-[var(--text-muted)]">None</span>}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-default)] p-3">
            <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">AI Suggestions</span>
            <ul className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-accent)]" />
                Optimize wall layout for cost
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-accent)]" />
                Reduce foundation depth
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-accent)]" />
                Use local brick supplier
              </li>
            </ul>
          </div>


        </div>
      )}
    </div>
  );
}
