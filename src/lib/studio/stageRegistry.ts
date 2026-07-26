import type { LucideIcon } from 'lucide-react';
import {
  MessageSquare,
  FileText,
  PenTool,
  Box,
  Wrench,
  Layers,
  LayoutPanelTop,
  Palette,
  Plug,
  DollarSign,
  FileSpreadsheet,
} from 'lucide-react';
import type { DisciplineId } from '@/lib/studio/discipline';

export type StageId =
  | 'brief'
  | 'concept'
  | 'design'
  | 'bim'
  | 'rough-in'
  | 'substrates'
  | 'millwork'
  | 'finishes'
  | 'appliances'
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
    description: '3D Model, 4D Construction Sequencing, Layered Visual Assembly.',
    icon: Box,
  },
  {
    id: 'rough-in',
    label: 'Rough-in & Infrastructure',
    shortLabel: 'Rough-in',
    description: 'Laying out plumbing pipes, drains, and electrical conduits.',
    icon: Wrench,
  },
  {
    id: 'substrates',
    label: 'Substrates & Enclosures',
    shortLabel: 'Substrates',
    description: 'Wall plastering, waterproofing, and tile backing.',
    icon: Layers,
  },
  {
    id: 'millwork',
    label: 'Primary Millwork & Fixtures',
    shortLabel: 'Millwork',
    description: 'Base and wall cabinet installation, sink fitting, backsplash.',
    icon: LayoutPanelTop,
  },
  {
    id: 'finishes',
    label: 'Finishes',
    shortLabel: 'Finishes',
    description: 'Wooden floor laying (done after heavy cabinet installation).',
    icon: Palette,
  },
  {
    id: 'appliances',
    label: 'Appliances & Staging',
    shortLabel: 'Appliances',
    description: 'Installing the oven, stovetop, and countertop accessories.',
    icon: Plug,
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
    description: 'Complete documentation set, presentation sheet, export reports.',
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
  ARCH: ['brief', 'concept', 'design', 'bim', 'rough-in', 'substrates', 'millwork', 'finishes', 'appliances', 'budget', 'budget-engineered'],
  STR: ['brief', 'concept', 'design', 'bim', 'rough-in', 'substrates', 'budget', 'budget-engineered'],
  MEP: ['brief', 'design', 'bim', 'rough-in', 'budget', 'budget-engineered'],
  ELEC: ['brief', 'design', 'bim', 'rough-in', 'budget', 'budget-engineered'],
  PLUM: ['brief', 'design', 'bim', 'rough-in', 'budget', 'budget-engineered'],
  INT: ['brief', 'concept', 'design', 'bim', 'rough-in', 'millwork', 'finishes', 'budget', 'budget-engineered'],
  LAND: ['brief', 'concept', 'design', 'bim', 'rough-in', 'substrates', 'budget', 'budget-engineered'],
  CIVIL: ['brief', 'concept', 'design', 'bim', 'rough-in', 'substrates', 'budget', 'budget-engineered'],
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
