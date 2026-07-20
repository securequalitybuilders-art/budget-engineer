import type { DrawingViewRef } from './sheet-coordination';

export type PackageType = 'architectural' | 'structural' | 'mep' | 'interior' | 'site' | 'all';

export interface ScheduleFilterCriteria {
  packageType: PackageType;
  viewTypesOnSheet: string[];
  floorCount?: number;
  hasStructural?: boolean;
  hasMep?: boolean;
}

export interface ScheduleFilterResult {
  included: DrawingViewRef[];
  excluded: DrawingViewRef[];
  reason: string;
  scheduleTypeBreakdown: { type: string; count: number }[];
}

const SCHEDULE_MAP: Record<string, string[]> = {
  architectural: ['door', 'window', 'finish', 'room'],
  structural: ['structural', 'reinforcement', 'foundation'],
  mep: ['electrical', 'plumbing', 'hvac', 'equipment'],
  interior: ['finish', 'room', 'door', 'window'],
  site: ['site', 'landscape', 'drainage'],
};

const SCHEDULE_LABELS: Record<string, string> = {
  door: 'Door Schedule',
  window: 'Window Schedule',
  finish: 'Room Finish Schedule',
  room: 'Room Schedule',
  structural: 'Structural Schedule',
  reinforcement: 'Reinforcement Schedule',
  foundation: 'Foundation Schedule',
  electrical: 'Electrical Schedule',
  plumbing: 'Plumbing Schedule',
  hvac: 'HVAC Schedule',
  equipment: 'Equipment Schedule',
  site: 'Site Schedule',
  landscape: 'Landscape Schedule',
  drainage: 'Drainage Schedule',
};

function extractScheduleType(view: DrawingViewRef): string | undefined {
  for (const [key] of Object.entries(SCHEDULE_LABELS)) {
    if (view.viewId.toLowerCase().includes(key) || view.label.toLowerCase().includes(key)) {
      return key;
    }
  }
  return undefined;
}

export function filterSchedules(
  schedules: DrawingViewRef[],
  criteria: ScheduleFilterCriteria,
): ScheduleFilterResult {
  const relevantTypes = SCHEDULE_MAP[criteria.packageType] ?? [];

  if (criteria.packageType === 'all') {
    const breakdown = buildTypeBreakdown(schedules);
    return {
      included: [...schedules],
      excluded: [],
      reason: 'All disciplines — all schedules included',
      scheduleTypeBreakdown: breakdown,
    };
  }

  const included: DrawingViewRef[] = [];
  const excluded: DrawingViewRef[] = [];

  for (const s of schedules) {
    const type = extractScheduleType(s);
    const matches = type ? relevantTypes.includes(type) : relevantTypes.some(rt =>
      s.viewId.toLowerCase().includes(rt) || s.label.toLowerCase().includes(rt),
    );
    if (matches) {
      included.push(s);
    } else {
      excluded.push(s);
    }
  }

  if (included.length === 0) {
    return {
      included: [...schedules],
      excluded: [],
      reason: `No ${criteria.packageType}-specific schedules found — showing all available`,
      scheduleTypeBreakdown: buildTypeBreakdown(schedules),
    };
  }

  const breakdown = buildTypeBreakdown(included);

  let reason: string;
  if (criteria.floorCount !== undefined && criteria.floorCount > 1) {
    reason = `${criteria.packageType} schedules for ${criteria.floorCount}-floor project (${included.length} of ${schedules.length})`;
  } else if (criteria.packageType === 'architectural' && criteria.hasStructural) {
    reason = `Architectural schedules (structural excluded — structural schedules available separately)`;
  } else if (criteria.packageType === 'architectural' && criteria.hasMep) {
    reason = `Architectural schedules (MEP excluded — MEP schedules available separately)`;
  } else {
    reason = `Filtered to ${criteria.packageType}-relevant schedules (${included.length} of ${schedules.length})`;
  }

  return {
    included,
    excluded,
    reason,
    scheduleTypeBreakdown: breakdown,
  };
}

function buildTypeBreakdown(refs: DrawingViewRef[]): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of refs) {
    const type = extractScheduleType(r) ?? r.viewType;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([type, count]) => ({ type, count }));
}

export function getScheduleExcerpt(
  allScheduleRefs: DrawingViewRef[],
  packageType: PackageType,
  extras?: { floorCount?: number; hasStructural?: boolean; hasMep?: boolean },
): ScheduleFilterResult {
  return filterSchedules(allScheduleRefs, {
    packageType,
    viewTypesOnSheet: [],
    floorCount: extras?.floorCount,
    hasStructural: extras?.hasStructural,
    hasMep: extras?.hasMep,
  });
}

export function explainScheduleFilter(
  result: ScheduleFilterResult,
): string {
  const parts: string[] = [result.reason];
  if (result.scheduleTypeBreakdown.length > 0) {
    const types = result.scheduleTypeBreakdown.map(t => `${t.type} (${t.count})`).join(', ');
    parts.push(`Types: ${types}`);
  }
  if (result.excluded.length > 0) {
    parts.push(`Excluded: ${result.excluded.map(e => e.label).join(', ')}`);
  }
  return parts.join('. ');
}
