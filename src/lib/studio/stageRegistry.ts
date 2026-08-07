import type { LucideIcon } from 'lucide-react';
import {
  MessageSquare,
  FileText,
  PenTool,
  Box,
  DollarSign,
  FileSpreadsheet,
  BookOpen,
} from 'lucide-react';
import type { DisciplineId } from '@/lib/studio/discipline';

export type StageId =
  | 'brief'
  | 'concept'
  | 'design'
  | 'bim'
  | 'docs-bim'
  | 'budget'
  | 'budget-engineered';

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
    description: 'Review and compare design options. 3 site-aware concepts.',
    icon: FileText,
  },
  {
    id: 'design',
    label: 'Design',
    shortLabel: 'Design',
    description: 'View all architectural elevations and edit 2D plans. Site analysis integrated.',
    icon: PenTool,
  },
  {
    id: 'bim',
    label: 'BIM',
    shortLabel: 'BIM',
    description: '3D Model, Site Analysis, Engineering & Compliance, 4D Sequencing, Layered Assembly.',
    icon: Box,
  },
  {
    id: 'docs-bim',
    label: 'Docs & BIM',
    shortLabel: 'Docs',
    description: 'Documentation set, drawing packages, and BIM coordination.',
    icon: BookOpen,
  },
  {
    id: 'budget',
    label: 'Budget',
    shortLabel: 'Budget',
    description: 'BOQ Cost & Deliver.',
    icon: DollarSign,
  },
  {
    id: 'budget-engineered',
    label: 'Budget Engineered',
    shortLabel: 'Engineered',
    description: 'Presentation sheet and export reports.',
    icon: FileSpreadsheet,
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
  ARCH: ['brief', 'concept', 'design', 'bim', 'docs-bim', 'budget', 'budget-engineered'],
  STR: ['brief', 'concept', 'design', 'bim', 'docs-bim', 'budget', 'budget-engineered'],
  MEP: ['brief', 'design', 'bim', 'docs-bim', 'budget', 'budget-engineered'],
  ELEC: ['brief', 'design', 'bim', 'docs-bim', 'budget', 'budget-engineered'],
  PLUM: ['brief', 'design', 'bim', 'docs-bim', 'budget', 'budget-engineered'],
  INT: ['brief', 'concept', 'design', 'bim', 'docs-bim', 'budget', 'budget-engineered'],
  LAND: ['brief', 'concept', 'design', 'bim', 'docs-bim', 'budget', 'budget-engineered'],
  CIVIL: ['brief', 'concept', 'design', 'bim', 'docs-bim', 'budget', 'budget-engineered'],
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
