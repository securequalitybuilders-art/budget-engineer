import type { LucideIcon } from 'lucide-react';
import {
  MessageSquare,
  FileText,
  Globe,
  PenTool,
  Activity,
  FileImage,
  DollarSign,
} from 'lucide-react';
import type { DisciplineId } from '@/lib/studio/discipline';

export type StageId =
  | 'brief'
  | 'concept'
  | 'site-analysis'
  | 'design'
  | 'engineering'
  | 'docs-bim'
  | 'cost-deliver';

export interface StageDef {
  id: StageId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}

export const ALL_STAGES: StageDef[] = [
  {
    id: 'brief',
    label: 'Brief',
    shortLabel: 'Brief',
    description: 'Describe your project in plain English. No CAD skills needed.',
    icon: MessageSquare,
  },
  {
    id: 'concept',
    label: 'Concept',
    shortLabel: 'Concept',
    description: 'Review and compare design options.',
    icon: FileText,
  },
  {
    id: 'site-analysis',
    label: 'Site Analysis',
    shortLabel: 'Site',
    description: 'Analyze site conditions, sun path, and context.',
    icon: Globe,
  },
  {
    id: 'design',
    label: 'Design',
    shortLabel: 'Design',
    description: 'View and edit 2D plans and 3D model.',
    icon: PenTool,
  },
  {
    id: 'engineering',
    label: 'Engineering',
    shortLabel: 'Eng',
    description: 'Run compliance checks and engineering analysis.',
    icon: Activity,
  },
  {
    id: 'docs-bim',
    label: 'Docs & BIM',
    shortLabel: 'Docs',
    description: 'Generate drawings, elevations, and BIM exports.',
    icon: FileImage,
  },
  {
    id: 'cost-deliver',
    label: 'Cost & Deliver',
    shortLabel: 'Cost',
    description: 'View BOQ and export reports.',
    icon: DollarSign,
  },
];

export function getStageDef(id: StageId): StageDef {
  const s = ALL_STAGES.find((s) => s.id === id);
  if (!s) throw new Error(`Unknown stage: ${id}`);
  return s;
}

export function getStagesForDiscipline(discipline: DisciplineId): StageDef[] {
  return STAGE_ORDER[discipline].map(getStageDef);
}

export function getStageIdsForDiscipline(discipline: DisciplineId): StageId[] {
  return STAGE_ORDER[discipline];
}

export function getDefaultStage(discipline: DisciplineId): StageId {
  return STAGE_ORDER[discipline][0];
}

const STAGE_ORDER: Record<DisciplineId, StageId[]> = {
  ARCH: ['brief', 'concept', 'site-analysis', 'design', 'engineering', 'docs-bim', 'cost-deliver'],
  STR: ['brief', 'concept', 'design', 'engineering', 'docs-bim', 'cost-deliver'],
  MEP: ['brief', 'design', 'engineering', 'docs-bim', 'cost-deliver'],
  ELEC: ['brief', 'design', 'engineering', 'docs-bim', 'cost-deliver'],
  PLUM: ['brief', 'design', 'engineering', 'docs-bim', 'cost-deliver'],
  INT: ['brief', 'concept', 'design', 'docs-bim', 'cost-deliver'],
  LAND: ['brief', 'concept', 'site-analysis', 'design', 'docs-bim', 'cost-deliver'],
  CIVIL: ['brief', 'concept', 'site-analysis', 'design', 'docs-bim', 'cost-deliver'],
};

export function isStageInDiscipline(stage: StageId, discipline: DisciplineId): boolean {
  return STAGE_ORDER[discipline].includes(stage);
}

export function nextStage(current: StageId, discipline: DisciplineId): StageId | null {
  const stages = STAGE_ORDER[discipline];
  const idx = stages.indexOf(current);
  if (idx === -1 || idx === stages.length - 1) return null;
  return stages[idx + 1];
}
