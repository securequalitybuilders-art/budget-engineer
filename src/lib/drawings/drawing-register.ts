import type { DisciplineCode } from '@/lib/drawings/layerStandard';
import type { SheetSize } from '@/lib/drawings/sheetSet';
import type { CadDocument } from '@/domain/cad';

export type { DisciplineCode, SheetSize };

export interface RevisionEntry {
  rev: string;
  date: string;
  note: string;
  by?: string;
}

export type SheetStatus = 'pending' | 'generated' | 'error';

export type DrawingTabId =
  | 'plan' | 'site-plan' | 'foundation' | 'roof'
  | 'ceiling' | 'electrical' | 'plumbing' | 'hvac'
  | 'front' | 'side' | 'section' | 'presentation'
  | 'schedule-door' | 'schedule-window' | 'schedule-structural';

export interface DrawingRegisterSheet {
  id: string;
  sheetNumber: string;
  title: string;
  discipline: DisciplineCode;
  disciplineLabel: string;
  scale: string;
  sheetSize: SheetSize;
  revision: string;
  revisions: RevisionEntry[];
  status: SheetStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  viewId: DrawingTabId | null;
  floorIndex?: number;
}

export interface DrawingTypeDef {
  id: string;
  title: string;
  discipline: DisciplineCode;
  sheetSequence: number;
  viewId: DrawingTabId;
  scale: string;
  perFloor: boolean;
  description: string;
}

export const DEFAULT_DRAWING_TYPES: DrawingTypeDef[] = [
  { id: 'site-plan', title: 'Site Plan', discipline: 'A', sheetSequence: 100, viewId: 'site-plan', scale: '1:200', perFloor: false, description: 'Site context plan' },
  { id: 'floor-plan', title: 'Floor Plan', discipline: 'A', sheetSequence: 101, viewId: 'plan', scale: '1:100', perFloor: true, description: 'Architectural floor plan' },
  { id: 'roof-plan', title: 'Roof Plan', discipline: 'A', sheetSequence: 200, viewId: 'roof', scale: '1:100', perFloor: false, description: 'Roof layout and slopes' },
  { id: 'rcp', title: 'Reflected Ceiling Plan', discipline: 'A', sheetSequence: 301, viewId: 'ceiling', scale: '1:100', perFloor: true, description: 'Reflected ceiling plan' },
  { id: 'front-elevation', title: 'Front Elevation', discipline: 'A', sheetSequence: 401, viewId: 'front', scale: '1:100', perFloor: false, description: 'Front elevation view' },
  { id: 'side-elevation', title: 'Side Elevation', discipline: 'A', sheetSequence: 402, viewId: 'side', scale: '1:100', perFloor: false, description: 'Side elevation view' },
  { id: 'section', title: 'Section A–A', discipline: 'A', sheetSequence: 501, viewId: 'section', scale: '1:100', perFloor: false, description: 'Building section' },
  
  { id: 'foundation', title: 'Foundation Plan', discipline: 'S', sheetSequence: 100, viewId: 'foundation', scale: '1:100', perFloor: false, description: 'Foundation layout' },
  
  { id: 'schedule-door', title: 'Door Schedule', discipline: 'A', sheetSequence: 601, viewId: 'schedule-door', scale: 'NTS', perFloor: false, description: 'Door schedule' },
  { id: 'schedule-window', title: 'Window Schedule', discipline: 'A', sheetSequence: 602, viewId: 'schedule-window', scale: 'NTS', perFloor: false, description: 'Window schedule' },
  { id: 'schedule-structural', title: 'Structural Schedule', discipline: 'S', sheetSequence: 601, viewId: 'schedule-structural', scale: 'NTS', perFloor: false, description: 'Structural schedule' },
  
  { id: 'presentation', title: 'Presentation Sheet', discipline: 'A', sheetSequence: 900, viewId: 'presentation', scale: 'NTS', perFloor: false, description: 'Composed presentation sheet' },
  
  { id: 'electrical', title: 'Electrical Plan', discipline: 'E', sheetSequence: 101, viewId: 'electrical', scale: '1:100', perFloor: true, description: 'Electrical layout' },
  { id: 'plumbing', title: 'Plumbing Plan', discipline: 'P', sheetSequence: 101, viewId: 'plumbing', scale: '1:100', perFloor: true, description: 'Plumbing layout' },
  { id: 'hvac', title: 'HVAC Plan', discipline: 'M', sheetSequence: 101, viewId: 'hvac', scale: '1:100', perFloor: true, description: 'HVAC layout' },
];

export function nextRev(rev: string): string {
  if (!rev) return 'A';
  const last = rev[rev.length - 1];
  if (last === 'Z') return rev + 'A';
  return rev.slice(0, -1) + String.fromCharCode(last.charCodeAt(0) + 1);
}

function generateSheetNumber(discipline: DisciplineCode, sequence: number, floorIndex?: number): string {
  const base = `${discipline}-${String(sequence).padStart(3, '0')}`;
  if (floorIndex !== undefined) {
    return `${discipline}-${String(sequence + floorIndex).padStart(3, '0')}`;
  }
  return base;
}

const DISCIPLINE_LABELS: Record<DisciplineCode, string> = {
  A: 'Architectural', S: 'Structural', M: 'Mechanical',
  E: 'Electrical', P: 'Plumbing', I: 'Interior', L: 'Landscape', C: 'Civil',
};

export function generateDefaultRegister(options: {
  projectName?: string;
  floorCount: number;
  floorNames?: string[];
  includeTypes?: DrawingTypeDef[];
  revision?: string;
  sheetSize?: SheetSize;
}): DrawingRegisterSheet[] {
  const {
    floorCount,
    floorNames,
    includeTypes = DEFAULT_DRAWING_TYPES,
    revision = 'A',
    sheetSize = 'A4',
  } = options;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const sheets: DrawingRegisterSheet[] = [];
  const seqCounter: Partial<Record<DisciplineCode, number>> = {};

  function nextSequence(discipline: DisciplineCode, baseSequence: number): number {
    const key = discipline;
    const used = seqCounter[key] ?? 0;
    seqCounter[key] = Math.max(used + 1, baseSequence);
    return seqCounter[key]!;
  }

  for (const def of includeTypes) {
    if (def.perFloor) {
      for (let i = 0; i < floorCount; i++) {
        const seq = nextSequence(def.discipline, def.sheetSequence);
        const name = floorNames?.[i] ?? `Floor ${i + 1}`;
        sheets.push({
          id: `${def.id}-f${i}`,
          sheetNumber: generateSheetNumber(def.discipline, seq),
          title: `${def.title} — ${name}`,
          discipline: def.discipline,
          disciplineLabel: DISCIPLINE_LABELS[def.discipline] ?? def.discipline,
          scale: def.scale,
          sheetSize,
          revision,
          revisions: [{ rev: 'A', date: today, note: 'First issue', by: 'Budget Engineer Studio' }],
          status: 'pending',
          createdAt: now,
          updatedAt: now,
          viewId: def.viewId,
          floorIndex: i,
        });
      }
    } else {
      const seq = nextSequence(def.discipline, def.sheetSequence);
      sheets.push({
        id: def.id,
        sheetNumber: generateSheetNumber(def.discipline, seq),
        title: def.title,
        discipline: def.discipline,
        disciplineLabel: DISCIPLINE_LABELS[def.discipline] ?? def.discipline,
        scale: def.scale,
        sheetSize,
        revision,
        revisions: [{ rev: 'A', date: today, note: 'First issue', by: 'Budget Engineer Studio' }],
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        viewId: def.viewId,
      });
    }
  }

  return sheets;
}

export function buildDrawingRegister(cad: CadDocument, revision = 'A', date = new Date().toISOString().slice(0, 10)): DrawingRegisterSheet[] {
  const history = (): RevisionEntry[] => {
    const out: RevisionEntry[] = [{ rev: 'A', date, note: 'First issue', by: 'Budget Engineer Studio' }];
    let r = 'A';
    while (r !== revision) {
      r = nextRev(r);
      out.push({ rev: r, date, note: r === revision ? 'Issued for construction' : 'Coordination update', by: 'Budget Engineer Studio' });
    }
    return out;
  };
  return generateDefaultRegister({
    floorCount: cad.floors.length,
    floorNames: cad.floors.map((f) => f.name),
    revision,
    sheetSize: 'A4',
  }).map((s) => ({ ...s, revisions: history(), status: 'generated' as SheetStatus }));
}

export function planSheet(register: DrawingRegisterSheet[], floorIndex: number): string {
  return register.find((s) => s.viewId === 'plan' && s.floorIndex === floorIndex)?.sheetNumber
    ?? `A-${String(101 + floorIndex).padStart(3, '0')}`;
}

export function sectionSheet(register: DrawingRegisterSheet[]): string {
  return register.find((s) => s.viewId === 'section')?.sheetNumber ?? 'A-600';
}

export function sheetByView(register: DrawingRegisterSheet[], viewId: DrawingTabId, floorIndex?: number): DrawingRegisterSheet | undefined {
  return register.find((s) => s.viewId === viewId && (floorIndex === undefined || s.floorIndex === floorIndex));
}

export function sheetsByDiscipline(register: DrawingRegisterSheet[], discipline: DisciplineCode): DrawingRegisterSheet[] {
  return register.filter((s) => s.discipline === discipline);
}

export function sheetsByStatus(register: DrawingRegisterSheet[], status: SheetStatus): DrawingRegisterSheet[] {
  return register.filter((s) => s.status === status);
}

export function updateSheetRevision(sheet: DrawingRegisterSheet, newRev: string, note?: string): DrawingRegisterSheet {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...sheet,
    revision: newRev,
    updatedAt: new Date().toISOString(),
    revisions: [...sheet.revisions, { rev: newRev, date: today, note: note ?? `Revision ${newRev}`, by: 'Budget Engineer Studio' }],
  };
}
