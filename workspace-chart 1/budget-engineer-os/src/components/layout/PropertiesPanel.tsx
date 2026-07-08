import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { PanelRight, X, Box, Ruler, Layers } from 'lucide-react';


export function PropertiesPanel() {
  const { currentProject, currentBrief, currentDesigns } = useProjectStore();
  const { propertiesPanelOpen, togglePropertiesPanel } = useUIStore();

  if (!propertiesPanelOpen) {
    return (
      <button
        onClick={togglePropertiesPanel}
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]"
        aria-label="Open properties panel"
      >
        <PanelRight size={16} />
      </button>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 overflow-y-auto border-l border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display font-semibold">Properties</h3>
        <Button variant="ghost" size="icon" onClick={togglePropertiesPanel} aria-label="Close properties">
          <X size={16} />
        </Button>
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

          <div className="rounded-lg border border-[var(--border-default)] p-3">
            <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Design Options</span>
            {currentDesigns.length === 0 ? (
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Generate designs from the brief to see options here.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {currentDesigns.map((design) => (
                  <button
                    key={design.id}
                    className="w-full rounded-lg bg-[var(--bg-tertiary)] p-3 text-left transition-colors hover:bg-[var(--bg-secondary)] hover:ring-1 hover:ring-[var(--brand-accent)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--text-primary)]">{design.name}</span>
                      <Box size={14} className="text-[var(--brand-accent)]" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Ruler size={12} />
                        {design.parameters.totalAreaM2} m²
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers size={12} />
                        {design.parameters.floors} floor{design.parameters.floors > 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        {design.elements.length} elements
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
