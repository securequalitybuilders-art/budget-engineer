import { CadDocument } from '@/domain/ws6-types';

export interface RevisionEntry {
  rev: string;
  date: string;
  note: string;
  by?: string;
}

export interface DrawingSheet {
  sheet: string;
  title: string;
  discipline: string;
  scale: string;
  revision: string;
  revisions: RevisionEntry[];
}

export function nextRev(rev: string): string {
  if (!rev) return 'A';
  const last = rev[rev.length - 1];
  if (last === 'Z') return rev + 'A';
  return rev.slice(0, -1) + String.fromCharCode(last.charCodeAt(0) + 1);
}

export function buildDrawingRegister(cad: CadDocument, revision = 'A', date = new Date().toISOString().slice(0, 10)): DrawingSheet[] {
  const firstIssue = (): RevisionEntry[] => [{ rev: 'A', date, note: 'First issue', by: 'Budget Engineer Studio' }];
  const history = (): RevisionEntry[] => {
    const out = firstIssue();
    let r = 'A';
    while (r !== revision) {
      r = nextRev(r);
      out.push({ rev: r, date, note: r === revision ? 'Issued for construction' : 'Coordination update', by: 'Budget Engineer Studio' });
    }
    return out;
  };
  const sheets: DrawingSheet[] = [];
  cad.floors.forEach((f, i) => {
    sheets.push({
      sheet: `A-1${String(i + 1).padStart(2, '0')}`,
      title: `Floor Plan — ${f.name}`,
      discipline: 'Architectural',
      scale: '1:100 @ A4',
      revision,
      revisions: history(),
    });
  });
  sheets.push({
    sheet: 'A-201',
    title: 'Section A–A',
    discipline: 'Architectural',
    scale: '1:100 @ A4',
    revision,
    revisions: history(),
  });
  return sheets;
}

export function planSheet(register: DrawingSheet[], floorIndex: number): string {
  return register[floorIndex]?.sheet ?? `A-1${String(floorIndex + 1).padStart(2, '0')}`;
}

export function sectionSheet(register: DrawingSheet[]): string {
  return register.find((s) => s.title.startsWith('Section'))?.sheet ?? 'A-201';
}
