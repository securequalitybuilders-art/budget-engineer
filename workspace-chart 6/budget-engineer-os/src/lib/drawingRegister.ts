// ============================================================================
// Stage 58 — Drawing Register / Sheet List
// Assigns conventional sheet numbers to the generated drawings and provides a
// register suitable for a dossier table.
// ============================================================================

import { CadDocument } from '../domain/types';

export interface RevisionEntry {
  rev: string;   // "A", "B", …
  date: string;  // ISO date
  note: string;  // description of the change
  by?: string;
}

export interface DrawingSheet {
  sheet: string;      // e.g. "A-101"
  title: string;      // e.g. "Floor Plan — Ground Floor"
  discipline: string; // e.g. "Architectural"
  scale: string;
  revision: string;   // current revision (= latest revisions[].rev)
  revisions: RevisionEntry[];
}

/** Next revision letter after the given one (A→B→…→Z→AA). */
export function nextRev(rev: string): string {
  if (!rev) return 'A';
  const last = rev[rev.length - 1];
  if (last === 'Z') return rev + 'A';
  return rev.slice(0, -1) + String.fromCharCode(last.charCodeAt(0) + 1);
}

/**
 * Build the sheet register for a CAD document:
 *  - A-1xx : floor plans (one per storey, A-101, A-102, …)
 *  - A-201 : building section
 * (Structural/services series can be added as those drawings appear.)
 */
export function buildDrawingRegister(cad: CadDocument, revision = 'A', date = new Date().toISOString().slice(0, 10)): DrawingSheet[] {
  const firstIssue = (): RevisionEntry[] => [{ rev: 'A', date, note: 'First issue', by: 'Budget Engineer Studio' }];
  // if a higher current revision is requested, synthesise intermediate history
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

/** Look up the sheet number for a floor plan by floor index. */
export function planSheet(register: DrawingSheet[], floorIndex: number): string {
  return register[floorIndex]?.sheet ?? `A-1${String(floorIndex + 1).padStart(2, '0')}`;
}

/** The section sheet number. */
export function sectionSheet(register: DrawingSheet[]): string {
  return register.find((s) => s.title.startsWith('Section'))?.sheet ?? 'A-201';
}
