import { useEffect } from 'react';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { PHASES } from '@/engine/construction/constructionPhases';
import { seedMilestonesFromPhases } from '@/engine/construction/executionSync';
import type { Milestone } from '@/domain/milestone';

const PHASE_LIST = Object.values(PHASES);
const DEFAULT_BUDGET_CENTS = 100_000_00;

export interface MilestonePlan {
  milestones: Milestone[];
  isLoading: boolean;
}

export function useMilestonePlan(projectId?: string, budgetCents?: number): MilestonePlan {
  const milestones = useMilestoneStore((s) => s.milestones);
  const isLoading = useMilestoneStore((s) => s.isLoading);
  const loadForProject = useMilestoneStore((s) => s.loadForProject);
  const addMilestone = useMilestoneStore((s) => s.addMilestone);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void (async () => {
      await loadForProject(projectId);
      if (cancelled) return;
      if (useMilestoneStore.getState().milestones.length > 0) return;
      const seed = seedMilestonesFromPhases({
        projectId,
        phases: PHASE_LIST,
        totalBudgetCents: budgetCents ?? DEFAULT_BUDGET_CENTS,
      });
      for (const milestone of seed) {
        if (cancelled) return;
        await addMilestone(milestone);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, budgetCents, loadForProject, addMilestone]);

  return { milestones, isLoading };
}
