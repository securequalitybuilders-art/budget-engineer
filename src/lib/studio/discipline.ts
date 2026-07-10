import type { DisciplineCode } from '@/lib/drawings/layerStandard';

export type DisciplineId =
  | 'ARCH'
  | 'STR'
  | 'MEP'
  | 'ELEC'
  | 'PLUM'
  | 'INT'
  | 'LAND'
  | 'CIVIL';

export interface Discipline {
  id: DisciplineId;
  label: string;
  shortLabel: string;
  aiaCode: DisciplineCode;
  color: string;
  description: string;
  icon: string;
}

export const DISCIPLINES: Discipline[] = [
  {
    id: 'ARCH',
    label: 'Architecture',
    shortLabel: 'Arch',
    aiaCode: 'A',
    color: '#8B5CF6',
    description: 'Architectural plans, elevations, sections, and details',
    icon: 'Building2',
  },
  {
    id: 'STR',
    label: 'Structural',
    shortLabel: 'Struct',
    aiaCode: 'S',
    color: '#EF4444',
    description: 'Structural framing, foundations, and load-bearing elements',
    icon: 'Triangle',
  },
  {
    id: 'MEP',
    label: 'Mechanical',
    shortLabel: 'Mech',
    aiaCode: 'M',
    color: '#F59E0B',
    description: 'HVAC, ductwork, and mechanical systems',
    icon: 'Fan',
  },
  {
    id: 'ELEC',
    label: 'Electrical',
    shortLabel: 'Elec',
    aiaCode: 'E',
    color: '#FBBF24',
    description: 'Power, lighting, data, and low-voltage systems',
    icon: 'Zap',
  },
  {
    id: 'PLUM',
    label: 'Plumbing',
    shortLabel: 'Plumb',
    aiaCode: 'P',
    color: '#3B82F6',
    description: 'Water supply, drainage, and plumbing fixtures',
    icon: 'Droplets',
  },
  {
    id: 'INT',
    label: 'Interior',
    shortLabel: 'Inter',
    aiaCode: 'I',
    color: '#EC4899',
    description: 'Interior layouts, finishes, furniture, and millwork',
    icon: 'Sofa',
  },
  {
    id: 'LAND',
    label: 'Landscape',
    shortLabel: 'Land',
    aiaCode: 'L',
    color: '#22C55E',
    description: 'Site grading, planting, hardscape, and outdoor spaces',
    icon: 'TreePine',
  },
  {
    id: 'CIVIL',
    label: 'Civil',
    shortLabel: 'Civil',
    aiaCode: 'C',
    color: '#A855F7',
    description: 'Site survey, earthworks, roads, and civil infrastructure',
    icon: 'Mountain',
  },
];

export function getDiscipline(id: DisciplineId): Discipline {
  const d = DISCIPLINES.find((d) => d.id === id);
  if (!d) throw new Error(`Unknown discipline: ${id}`);
  return d;
}

export function getDisciplineByAiaCode(code: DisciplineCode): Discipline | undefined {
  return DISCIPLINES.find((d) => d.aiaCode === code);
}

export function getDisciplineByAiaCodeOrFail(code: DisciplineCode): Discipline {
  const d = getDisciplineByAiaCode(code);
  if (!d) throw new Error(`No studio discipline for AIA code: ${code}`);
  return d;
}

export const DEFAULT_DISCIPLINE: DisciplineId = 'ARCH';
