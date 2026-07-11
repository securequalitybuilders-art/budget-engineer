/**
 * @deprecated Use stageRegistry directly instead.
 * This file is kept as a thin adapter for components not yet fully migrated.
 */
import type { LucideIcon } from 'lucide-react'
import { getStagesForDiscipline, type StageId } from '@/lib/studio/stageRegistry'
import type { DisciplineId } from '@/lib/studio/discipline'

export interface WorkflowStage {
  id: number
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
}

/** Map old numeric stages to StageId for backward compat */
const NUM_TO_STAGE_ID: StageId[] = ['brief', 'concept', 'design', 'engineering', 'docs-bim', 'cost-deliver'];

/** Get stages for a discipline as the old WorkflowStage format */
export function getStagesForDisciplineLegacy(discipline: DisciplineId): WorkflowStage[] {
  return getStagesForDiscipline(discipline).map((s, i) => ({
    id: i + 1,
    label: s.label,
    shortLabel: s.shortLabel,
    description: s.description,
    icon: s.icon,
  }));
}

/** Legacy STAGES array — defaults to Architecture discipline */
export const STAGES: WorkflowStage[] = getStagesForDisciplineLegacy('ARCH');

/** Convert StageId to numeric index (legacy compat) */
export function stageIdToNumeric(id: StageId): number {
  const idx = NUM_TO_STAGE_ID.indexOf(id);
  return idx >= 0 ? idx + 1 : 1;
}

/** Convert numeric to StageId */
export function numericToStageId(n: number): StageId {
  return NUM_TO_STAGE_ID[n - 1] ?? 'brief';
}
