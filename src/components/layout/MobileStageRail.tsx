import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from '@/stores/uiStore';
import { useDisciplineStore } from '@/stores/disciplineStore';
import { getStagesForDiscipline, type StageId } from '@/lib/studio/stageRegistry';

function isStageAccessible(stageId: StageId, selectedDesignId: string | null): { accessible: boolean; reason?: string } {
  if ((stageId === 'design' || stageId === 'bim' || stageId === 'budget' || stageId === 'budget-engineered') && !selectedDesignId) {
    return { accessible: false, reason: 'Select a design option first' };
  }
  return { accessible: true };
}

export function MobileStageRail() {
  const { activeStageId, setActiveStage, selectedDesignId } = useUIStore(
    useShallow((s) => ({
      activeStageId: s.activeStageId,
      setActiveStage: s.setActiveStage,
      selectedDesignId: s.selectedDesignId,
    }))
  );
  const currentDiscipline = useDisciplineStore((s) => s.currentDiscipline);

  const stages = getStagesForDiscipline(currentDiscipline);

  return (
    <nav
      aria-label="Stage navigation (mobile)"
      className="lg:hidden overflow-x-auto border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]"
    >
      <div className="flex gap-1 px-2 py-1.5">
        {stages.map((stage) => {
          const isActive = stage.id === activeStageId;
          const { accessible, reason } = isStageAccessible(stage.id, selectedDesignId);
          const isLocked = !accessible && !isActive;
          return (
            <button
              key={stage.id}
              disabled={isLocked}
              onClick={() => setActiveStage(stage.id)}
              title={isLocked ? reason : undefined}
              aria-current={isActive ? 'step' : undefined}
              className={
                'min-h-[44px] whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ' +
                (isActive
                  ? 'bg-[var(--brand-primary)] text-white'
                  : isLocked
                    ? 'cursor-not-allowed text-[var(--text-muted)]/50 line-through decoration-dotted'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]')
              }
            >
              {stage.shortLabel}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
