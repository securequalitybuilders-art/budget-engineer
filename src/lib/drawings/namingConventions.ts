import type { DisciplineCode } from './layerStandard';

export type IssueStatus = 'Preliminary' | 'For Review' | 'For Construction' | 'As Built';

export interface DrawingNamingOptions {
  projectCode: string;
  discipline: DisciplineCode;
  sheetNumber: string;
  revision: string;
  title: string;
  extension?: string;
}

export function formatDrawingName(opts: DrawingNamingOptions): string {
  const ext = opts.extension ?? '.dxf';
  const proj = opts.projectCode.toUpperCase().replace(/[^A-Z0-9_-]/g, '-');
  const disc = opts.discipline;
  const sheet = opts.sheetNumber;
  const rev = `R${opts.revision.padStart(2, '0')}`;
  const title = opts.title.replace(/[^a-zA-Z0-9 -]/g, '').replace(/\s+/g, '-');
  return `${proj}_${disc}-${sheet}_${rev}_${title}${ext}`;
}

export function formatBoardName(projectCode: string, sequence: number, revision: string): string {
  const proj = projectCode.toUpperCase().replace(/[^A-Z0-9_-]/g, '-');
  return `${proj}_BOARD_${String(sequence).padStart(2, '0')}_R${revision.padStart(2, '0')}`;
}

export function formatArchiveName(projectCode: string, date: string, version: string): string {
  const proj = projectCode.toUpperCase().replace(/[^A-Z0-9_-]/g, '-');
  return `${proj}_${date}_v${version}.beproj`;
}

export function nextRevision(current: string): string {
  if (!current) return '01';
  const num = parseInt(current, 10);
  if (isNaN(num)) return '01';
  return String(num + 1).padStart(2, '0');
}

export const DEFAULT_PROJECT_CODE = 'PRJ-001';
export const INITIAL_REVISION = '00';

export function generateSheetNumber(discipline: DisciplineCode, sequence: number): string {
  const prefixes: Record<DisciplineCode, string> = {
    A: 'A', S: 'S', M: 'M', E: 'E', P: 'P', I: 'I', L: 'L', C: 'C'
  };
  const prefix = prefixes[discipline] ?? 'X';
  const seq = String(sequence).padStart(3, '0');
  return `${prefix}-${seq}`;
}

export type RevisionRecord = {
  revision: string;
  date: string;
  description: string;
  author: string;
  status: IssueStatus;
};

export function createInitialRevision(): RevisionRecord {
  const now = new Date().toISOString().slice(0, 10);
  return { revision: INITIAL_REVISION, date: now, description: 'Preliminary Issue', author: 'Budget Engineer Studio', status: 'Preliminary' };
}
