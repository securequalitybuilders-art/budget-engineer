import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { ThemeToggleSimple } from './ThemeToggle';
import { OfflineIndicator } from './OfflineIndicator';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Menu, Save, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const stages = [
  'Brief',
  'Concept',
  'Design',
  'Engineering',
  'Docs & BIM',
  'Cost & Deliver',
];

export function CommandBar() {
  const { currentProject } = useProjectStore();
  const { toggleSidebar, activeStage, selectedDesignId } = useUIStore();

  function isStageAccessible(idx: number): { accessible: boolean; reason?: string } {
    if (idx >= 2 && !selectedDesignId) {
      return { accessible: false, reason: 'Select a design option first' };
    }
    return { accessible: true };
  }

  return (
    <header className="glass-strong sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border-default)] px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <Menu size={18} />
        </Button>
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-[var(--brand-accent)]">
            <Sparkles size={18} />
          </div>
          <span className="hidden font-display font-bold md:inline">Dzenhare</span>
        </Link>
        {currentProject && (
          <>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="max-w-[180px] truncate text-sm font-medium">
              {currentProject.name}
            </span>
            <Badge variant="brand" className="hidden sm:inline-flex">
              {currentProject.status}
            </Badge>
          </>
        )}
      </div>

      <nav className="hidden items-center gap-1 lg:flex">
        {stages.map((stage, idx) => {
          const isActive = idx + 1 === activeStage;
          const { accessible, reason } = isStageAccessible(idx);
          const isLocked = !accessible && !isActive;
          return (
            <div
              key={stage}
              title={isLocked ? reason : undefined}
              className={
                'relative flex items-center gap-2 px-3 py-1 text-sm transition-colors ' +
                (isActive
                  ? 'font-medium text-[var(--brand-accent)]'
                  : isLocked
                    ? 'cursor-not-allowed text-[var(--text-muted)]/40 line-through decoration-dotted'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]')
              }
            >
              {isActive && <span className="absolute inset-0 rounded-md border border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/10" />}
              <span className="relative">{stage}</span>
            </div>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 text-xs text-[var(--text-muted)] sm:flex">
          <Save size={14} />
          <span>Auto-saved</span>
        </div>
        <ThemeToggleSimple />
      </div>
      <OfflineIndicator />
    </header>
  );
}
