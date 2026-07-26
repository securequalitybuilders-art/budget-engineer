import type { PackageDiscipline } from './package-sheet-meta';

export interface SheetSlot {
  discipline: PackageDiscipline;
  group: string;
  sortKey: string;
  sheetNumber: string;
  title: string;
  templateId: string;
}

export type SheetGroup =
  | 'cover'
  | 'register'
  | 'site'
  | 'plan'
  | 'elevation-section'
  | 'section'
  | 'schedule'
  | 'detail'
  | 'presentation';

const GROUP_ORDER: Record<SheetGroup, number> = {
  cover: 0,
  register: 1,
  site: 2,
  plan: 3,
  'elevation-section': 4,
  section: 5,
  schedule: 6,
  detail: 7,
  presentation: 8,
};

const DISCIPLINE_PREFIX: Record<PackageDiscipline, string> = {
  architectural: 'A',
  structural: 'S',
  mep: 'M',
  interior: 'I',
  site: 'X',
  all: 'Z',
};

function groupOrder(group: string): number {
  return GROUP_ORDER[group as SheetGroup] ?? 99;
}

function padNumber(n: number, width = 3): string {
  return String(n).padStart(width, '0');
}

export interface PackageSequence {
  sheets: SheetSlot[];
}

export function buildPackageSequence(
  discipline: PackageDiscipline,
  sheets: Partial<SheetSlot>[],
): PackageSequence {
  const prefix = DISCIPLINE_PREFIX[discipline];
  const groups = new Map<string, SheetSlot[]>();
  const ordered: SheetSlot[] = [];

  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i];
    const group = s.group ?? 'plan';
    if (!groups.has(group)) groups.set(group, []);
    const sheetNumber = s.sheetNumber ?? `${prefix}-${padNumber(i + 1)}`;
    groups.get(group)!.push({
      discipline: s.discipline ?? discipline,
      group,
      sortKey: s.sortKey ?? `${prefix}-${padNumber(i + 1)}`,
      sheetNumber,
      title: s.title ?? 'Untitled',
      templateId: s.templateId ?? 'a2-landscape-plan',
    });
  }

  const sortedGroups = Array.from(groups.entries()).sort(
    (a, b) => groupOrder(a[0]) - groupOrder(b[0]),
  );

  for (const [, groupSheets] of sortedGroups) {
    ordered.push(...groupSheets);
  }

  return { sheets: ordered };
}

export function assignSheetNumbers(
  sheets: { group: string; title: string }[],
  discipline: PackageDiscipline = 'architectural',
): { sheetNumber: string; title: string; group: string }[] {
  const prefix = DISCIPLINE_PREFIX[discipline];
  const counters = new Map<string, number>();
  const result: { sheetNumber: string; title: string; group: string }[] = [];

  for (const s of sheets) {
    const group = s.group;
    const count = (counters.get(group) ?? 0) + 1;
    counters.set(group, count);
    const groupNum = groupOrder(group);
    const sheetNum = groupNum * 100 + count;
    result.push({
      sheetNumber: `${prefix}-${padNumber(sheetNum)}`,
      title: s.title,
      group: s.group,
    });
  }

  return result;
}
