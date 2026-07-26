import type { DrawingRegisterSheet, DisciplineCode } from './drawing-register';
import type { PackageDiscipline, PackageIssueType, PackageSubmissionCategory, PackageIdentity } from './package-sheet-meta';
import type { DrawingViewRef } from './sheet-coordination';
import { filterSchedules, type ScheduleFilterResult } from './schedule-context-filter';

export interface PackageAssemblyOptions {
  projectName: string;
  projectNumber: string;
  client?: string;
  architect?: string;
  identity: PackageIdentity;
  register: DrawingRegisterSheet[];
  allScheduleRefs: DrawingViewRef[];
  issueDate: string;
  generalNotes?: string[];
  packageDescription?: string;
}

export interface PackageSheetEntry {
  sheetNumber: string;
  title: string;
  discipline: DisciplineCode;
  viewId: string;
  group: string;
  templateId: string;
  scheduleType?: string;
}

export interface PackageAssemblyResult {
  identity: PackageIdentity;
  projectName: string;
  projectNumber: string;
  client?: string;
  architect?: string;
  issueDate: string;
  sheets: PackageSheetEntry[];
  scheduleFilter: ScheduleFilterResult;
  sheetCount: number;
  scheduleCount: number;
  disciplineSummary: { discipline: string; count: number }[];
  groupSummary: { group: string; count: number }[];
  warnings: string[];
  coverSheetNumber: string;
  registerSheetNumber: string;
}

const DISCIPLINE_CODE_TO_PACKAGE: Record<string, PackageDiscipline> = {
  A: 'architectural',
  S: 'structural',
  M: 'mep',
  E: 'mep',
  P: 'mep',
  I: 'interior',
  L: 'site',
  C: 'site',
};

function inferGroupFromViewId(viewId: string): string {
  if (viewId.includes('site')) return 'site';
  if (viewId.includes('plan') || viewId.includes('foundation') || viewId.includes('roof') || viewId.includes('ceiling')) return 'plan';
  if (viewId.includes('elevation')) return 'elevation-section';
  if (viewId.includes('section')) return 'section';
  if (viewId.includes('schedule')) return 'schedule';
  if (viewId.includes('detail')) return 'detail';
  if (viewId.includes('presentation')) return 'presentation';
  return 'plan';
}

function disciplinePrefix(discipline: DisciplineCode): string {
  const map: Record<string, string> = { A: 'A', S: 'S', M: 'M', E: 'E', P: 'P', I: 'I', L: 'X', C: 'C' };
  return map[discipline] ?? 'Z';
}

export function assemblePackage(options: PackageAssemblyOptions): PackageAssemblyResult {
  const { identity, register, allScheduleRefs, issueDate } = options;
  const warnings: string[] = [];
  const primaryDiscipline = identity.packageDiscipline;

  const disciplineFilter = primaryDiscipline === 'all'
    ? register
    : register.filter(s => {
        const pkg = DISCIPLINE_CODE_TO_PACKAGE[s.discipline] ?? 'architectural';
        return pkg === primaryDiscipline;
      });

  if (disciplineFilter.length === 0) {
    warnings.push(`No sheets found for discipline "${primaryDiscipline}" — including all`);
  }

  const effectiveSheets = disciplineFilter.length > 0 ? disciplineFilter : register;

  const sortedSheets = [...effectiveSheets].sort((a, b) => {
    const groupA = inferGroupFromViewId(a.viewId ?? '');
    const groupB = inferGroupFromViewId(b.viewId ?? '');
    const groupOrder: Record<string, number> = {
      site: 0, plan: 1, 'elevation-section': 2, section: 3, schedule: 4, detail: 5, presentation: 6,
    };
    const gDiff = (groupOrder[groupA] ?? 99) - (groupOrder[groupB] ?? 99);
    if (gDiff !== 0) return gDiff;
    return a.sheetNumber.localeCompare(b.sheetNumber);
  });

  const scheduleFilter = filterSchedules(allScheduleRefs, {
    packageType: primaryDiscipline,
    viewTypesOnSheet: [],
  });

  if (scheduleFilter.included.length === 0 && scheduleFilter.reason) {
    warnings.push(scheduleFilter.reason);
  }

  const sheets: PackageSheetEntry[] = sortedSheets.map(s => ({
    sheetNumber: s.sheetNumber,
    title: s.title,
    discipline: s.discipline,
    viewId: s.viewId ?? '',
    group: inferGroupFromViewId(s.viewId ?? ''),
    templateId: s.sheetSize ? `a2-landscape-${s.sheetSize.toLowerCase()}-plan` : 'a2-landscape-plan',
    scheduleType: s.viewId?.startsWith('schedule-') ? s.viewId.replace('schedule-', '') : undefined,
  }));

  const groupSummary = groupCounts(sheets);

  const disciplineMap = new Map<string, number>();
  for (const s of sheets) {
    disciplineMap.set(s.discipline, (disciplineMap.get(s.discipline) ?? 0) + 1);
  }
  const disciplineSummary = Array.from(disciplineMap.entries()).map(([discipline, count]) => ({ discipline, count }));

  const coverSheetNumber = `${disciplinePrefix(register[0]?.discipline ?? 'A')}-000`;
  const registerSheetNumber = `${disciplinePrefix(register[0]?.discipline ?? 'A')}-001`;

  return {
    identity,
    projectName: options.projectName,
    projectNumber: options.projectNumber,
    client: options.client,
    architect: options.architect,
    issueDate,
    sheets,
    scheduleFilter,
    sheetCount: sheets.length,
    scheduleCount: scheduleFilter.included.length,
    disciplineSummary,
    groupSummary,
    warnings,
    coverSheetNumber,
    registerSheetNumber,
  };
}

export function buildPackageIdentity(
  projectNumber: string,
  issueType: PackageIssueType,
  submissionCategory: PackageSubmissionCategory,
  discipline: PackageDiscipline,
  revision: string,
  sequence?: number,
): PackageIdentity {
  const seq = sequence ?? 1;
  const issueNum = `${revision}-${String(seq).padStart(2, '0')}`;
  const prefix = discipline === 'all' ? 'XX' : discipline.substring(0, 2).toUpperCase();
  const packageId = `${projectNumber}-${prefix}-${issueNum}`;
  const stageLabel = issueType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const catLabel = submissionCategory.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const packageTitle = `${stageLabel} — ${catLabel} Package`;

  return {
    packageId,
    packageTitle,
    issueType,
    submissionCategory,
    packageDiscipline: discipline,
    issueNumber: issueNum,
    revision,
  };
}

export function buildPackageSheetList(
  assembly: PackageAssemblyResult,
): string {
  const lines: string[] = [];
  lines.push(`Package: ${assembly.identity.packageTitle}`);
  lines.push(`Package ID: ${assembly.identity.packageId}`);
  lines.push(`Issue: ${assembly.identity.issueNumber}  Revision: ${assembly.identity.revision}`);
  lines.push(`Date: ${assembly.issueDate}`);
  lines.push(`Discipline: ${assembly.identity.packageDiscipline}`);
  lines.push(`Project: ${assembly.projectName}  Number: ${assembly.projectNumber}`);
  lines.push('');
  lines.push(`${'Sheet'.padEnd(12)} ${'Title'.padEnd(40)} ${'Disc'.padEnd(6)} ${'Group'}`);
  lines.push(`${''.padEnd(12, '─')} ${''.padEnd(40, '─')} ${''.padEnd(6, '─')} ${''.padEnd(10, '─')}`);
  for (const s of assembly.sheets) {
    lines.push(`${s.sheetNumber.padEnd(12)} ${s.title.padEnd(40)} ${s.discipline.padEnd(6)} ${s.group}`);
  }
  lines.push('');
  lines.push(`Total sheets: ${assembly.sheetCount}  Total schedules: ${assembly.scheduleCount}`);
  lines.push(`Disciplines: ${assembly.disciplineSummary.map(d => `${d.discipline}(${d.count})`).join(', ')}`);
  return lines.join('\n');
}

export function packageExportFilename(identity: PackageIdentity, format: string): string {
  const safeProject = identity.packageId.replace(/[^a-zA-Z0-9-]/g, '_');
  const safeTitle = identity.packageTitle.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 40);
  return `${safeProject}_${safeTitle}_${identity.revision}.${format}`;
}

export function deterministicSheetNumber(
  prefix: string,
  groupOrder: number,
  sequence: number,
): string {
  const groupNum = groupOrder * 100;
  return `${prefix}-${String(groupNum + sequence).padStart(3, '0')}`;
}

function groupCounts(sheets: PackageSheetEntry[]): { group: string; count: number }[] {
  const map = new Map<string, number>();
  for (const s of sheets) {
    map.set(s.group, (map.get(s.group) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => (GROUP_ORDER[a[0]] ?? 99) - (GROUP_ORDER[b[0]] ?? 99))
    .map(([group, count]) => ({ group, count }));
}

const GROUP_ORDER: Record<string, number> = {
  site: 0,
  plan: 1,
  'elevation-section': 2,
  section: 3,
  schedule: 4,
  detail: 5,
  presentation: 6,
};
