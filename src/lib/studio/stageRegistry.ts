import type { LucideIcon } from 'lucide-react';
import {
  MessageSquare,
  FileText,
  PenTool,
  Box,
  DollarSign,
  FileSpreadsheet,
  BookOpen,
  Store,
  Users,
  BadgeCheck,
  ShoppingCart,
  Lock,
  Route,
  Truck,
  Boxes,
  ShieldCheck,
  FileDiff,
  KeyRound,
} from 'lucide-react';
import type { DisciplineId } from '@/lib/studio/discipline';

export type StageId =
  | 'brief'
  | 'concept'
  | 'design'
  | 'bim'
  | 'docs-bim'
  | 'budget'
  | 'budget-engineered'
  | 'c1-resource-hub'
  | 'c2-team-assembly'
  | 'c3-green-flag-cert'
  | 'c4-bulk-procurement'
  | 'c5-cost-lock'
  | 'p1-critical-path'
  | 'p2-site-mobilization'
  | 'p3-digital-twin'
  | 'p4-escrow-release'
  | 'p5-variation-vault'
  | 'p6-wipaa-handover';

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
  {
    id: 'c1-resource-hub',
    label: 'Resource Hub',
    shortLabel: 'Resources',
    description: 'Discover vetted suppliers, materials and market demand for your build.',
    icon: Store,
  },
  {
    id: 'c2-team-assembly',
    label: 'Team Assembly',
    shortLabel: 'Team',
    description: 'Assemble your build team: alone, together, or fully managed.',
    icon: Users,
  },
  {
    id: 'c3-green-flag-cert',
    label: 'Green Flag Certification',
    shortLabel: 'Certify',
    description: 'Vet contractors, verify credentials, and earn Green Flag certification.',
    icon: BadgeCheck,
  },
  {
    id: 'c4-bulk-procurement',
    label: 'Bulk Procurement',
    shortLabel: 'Procure',
    description: 'Value-driven quoting, group buying, and forward commitments.',
    icon: ShoppingCart,
  },
  {
    id: 'c5-cost-lock',
    label: 'Cost Lock',
    shortLabel: 'Cost Lock',
    description: 'Lock your cost baseline, WBS coding, and red-pen variance audit.',
    icon: Lock,
  },
  {
    id: 'p1-critical-path',
    label: 'Critical Path',
    shortLabel: 'Schedule',
    description: 'CPM schedule, WBS dictionary, Gantt and cashflow.',
    icon: Route,
  },
  {
    id: 'p2-site-mobilization',
    label: 'Site Mobilization',
    shortLabel: 'Mobilize',
    description: 'Resources, logistics and delivery tracking for site start.',
    icon: Truck,
  },
  {
    id: 'p3-digital-twin',
    label: 'Digital Twin',
    shortLabel: 'Twin',
    description: 'Geo-tagged timeline, verification reports and live progress.',
    icon: Boxes,
  },
  {
    id: 'p4-escrow-release',
    label: 'Escrow Release',
    shortLabel: 'Escrow',
    description: 'Proof-of-funds, milestone verification and escrow release.',
    icon: ShieldCheck,
  },
  {
    id: 'p5-variation-vault',
    label: 'Variation Vault',
    shortLabel: 'Vault',
    description: 'Change orders, 4-lens cost impact and reversal penalties.',
    icon: FileDiff,
  },
  {
    id: 'p6-wipaa-handover',
    label: 'WIPAA & Handover',
    shortLabel: 'Handover',
    description: 'Monthly true profitability, gain/fade, and key handover.',
    icon: KeyRound,
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

const GREEN_FLAG_HAWK: StageId[] = [
  'c1-resource-hub',
  'c2-team-assembly',
  'c3-green-flag-cert',
  'c4-bulk-procurement',
  'c5-cost-lock',
  'p1-critical-path',
  'p2-site-mobilization',
  'p3-digital-twin',
  'p4-escrow-release',
  'p5-variation-vault',
  'p6-wipaa-handover',
];

const BASE_ORDER: StageId[] = ['brief', 'concept', 'design', 'bim', 'docs-bim', 'budget', 'budget-engineered'];
const BASE_ORDER_NO_CONCEPT: StageId[] = ['brief', 'design', 'bim', 'docs-bim', 'budget', 'budget-engineered'];

const STAGE_ORDER: Record<DisciplineId, StageId[]> = {
  ARCH: [...BASE_ORDER, ...GREEN_FLAG_HAWK],
  STR: [...BASE_ORDER, ...GREEN_FLAG_HAWK],
  MEP: [...BASE_ORDER_NO_CONCEPT, ...GREEN_FLAG_HAWK],
  ELEC: [...BASE_ORDER_NO_CONCEPT, ...GREEN_FLAG_HAWK],
  PLUM: [...BASE_ORDER_NO_CONCEPT, ...GREEN_FLAG_HAWK],
  INT: [...BASE_ORDER, ...GREEN_FLAG_HAWK],
  LAND: [...BASE_ORDER, ...GREEN_FLAG_HAWK],
  CIVIL: [...BASE_ORDER, ...GREEN_FLAG_HAWK],
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
