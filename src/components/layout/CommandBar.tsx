import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { useDisciplineStore } from '@/stores/disciplineStore';
import { ThemeToggleSimple } from './ThemeToggle';
import { OfflineIndicator } from './OfflineIndicator';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Menu, Save, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStagesForDiscipline, type StageId } from '@/lib/studio/stageRegistry';
import { DisciplineSwitcher } from '@/components/studio/DisciplineSwitcher';

export function CommandBar() {
  const { currentProject } = useProjectStore();
  const { toggleSidebar, activeStageId, setActiveStage, selectedDesignId } = useUIStore();
  const currentDiscipline = useDisciplineStore((s) => s.currentDiscipline);

  const disciplineStages = getStagesForDiscipline(currentDiscipline);

  function isStageAccessible(stageId: StageId): { accessible: boolean; reason?: string } {
    if ((stageId === 'design' || stageId === 'engineering' || stageId === 'docs-bim' || stageId === 'cost-deliver') && !selectedDesignId) {
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
        <Link to="/" className="flex items-center gap-2" aria-label="Home">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-[var(--brand-accent)]" aria-hidden="true">
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

      <nav className="hidden items-center gap-1 lg:flex" aria-label="Stage navigation">
        {disciplineStages.map((stage) => {
          const isActive = stage.id === activeStageId;
          const { accessible, reason } = isStageAccessible(stage.id);
          const isLocked = !accessible && !isActive;
          return (
            <button
              key={stage.id}
              disabled={isLocked}
              onClick={() => setActiveStage(stage.id)}
              title={isLocked ? reason : undefined}
              aria-current={isActive ? 'step' : undefined}
              className={
                'relative flex items-center gap-2 px-3 py-1 text-sm transition-colors rounded-md ' +
                (isActive
                  ? 'font-medium text-[var(--brand-accent)]'
                  : isLocked
                    ? 'cursor-not-allowed text-[var(--text-muted)]/40 line-through decoration-dotted'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]')
              }
            >
              {isActive && <span className="absolute inset-0 rounded-md border border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/10" aria-hidden="true" />}
              <span className="relative">{stage.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 text-xs text-[var(--text-muted)] sm:flex">
          <Save size={14} />
          <span>Auto-saved</span>
        </div>
        <DisciplineSwitcher compact />
        <ThemeToggleSimple />
      </div>
      <OfflineIndicator />
    </header>
  );
}
