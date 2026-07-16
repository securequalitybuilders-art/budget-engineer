import type { ComplianceInput, ComplianceStatus } from '@/engine/compliance/types';

export type IssueCategory =
  | 'room-minimums' | 'egress' | 'corridor-width' | 'stair-geometry'
  | 'accessibility' | 'daylight-ventilation' | 'sanitary-counts'
  | 'occupancy' | 'setbacks' | 'site-coverage' | 'fire-separation'
  | 'structural' | 'mep' | 'general';

export type IssueSeverity = 'critical' | 'major' | 'minor' | 'info';
export type IssueState = 'open' | 'acknowledged' | 'resolved' | 'closed' | 'waived';
export type ReviewDecision = 'pass' | 'conditional-pass' | 'revise' | 'fail';

export interface ReviewIssue {
  id: string;
  ruleId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  location: string;
  requirement: string;
  actual: string;
  status: ComplianceStatus;
  state: IssueState;
  assignee: string;
  comments: ReviewComment[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewComment {
  id: string;
  author: string;
  role: string;
  message: string;
  timestamp: string;
}

export interface ReviewFinding {
  id: string;
  title: string;
  finding: string;
  severity: IssueSeverity;
  category: IssueCategory;
  location: string;
  recommendation: string;
}

export interface ReviewReport {
  id: string;
  projectId: string;
  jurisdiction: string;
  issues: ReviewIssue[];
  findings: ReviewFinding[];
  decision: ReviewDecision;
  summary: {
    totalIssues: number;
    critical: number;
    major: number;
    minor: number;
    info: number;
    open: number;
    resolved: number;
    score: number;
  };
  reviewer: string;
  reviewedAt: string;
  notes: string;
}

const MIN_ROOM_SIZES: Record<string, { minArea: number; minWidth: number }> = {
  bedroom: { minArea: 9, minWidth: 2.4 },
  'single-bedroom': { minArea: 6, minWidth: 2.0 },
  living: { minArea: 16, minWidth: 3.0 },
  dining: { minArea: 10, minWidth: 2.5 },
  kitchen: { minArea: 6, minWidth: 1.8 },
  bathroom: { minArea: 2.5, minWidth: 1.2 },
  ensuite: { minArea: 2.0, minWidth: 1.0 },
  office: { minArea: 8, minWidth: 2.0 },
  hallway: { minArea: 1.5, minWidth: 0.9 },
};

const CORRIDOR_MIN_WIDTH = 0.9;
const ACCESSIBLE_CORRIDOR_WIDTH = 1.2;
const STAIR_MAX_RISE = 0.175;
const STAIR_MIN_GOING = 0.25;
const EGRESS_MAX_DISTANCE_M = 15;
const MIN_DAYLIGHT_FACTOR = 0.02;

export function generateIssueId(): string {
  return `iss-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

function checkRoomMinimums(input: ComplianceInput): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  if (!input.plan) return issues;

  for (const room of input.plan.rooms ?? []) {
    const prog = room.name?.toLowerCase() ?? 'other';
    const rules = MIN_ROOM_SIZES[prog] ?? MIN_ROOM_SIZES.bedroom;

    const area = (room.width ?? 0) * (room.height ?? 0);
    if (area > 0 && area < rules.minArea) {
      issues.push({
        id: generateIssueId(), ruleId: 'room-min-area', category: 'room-minimums',
        severity: area < rules.minArea * 0.7 ? 'critical' : 'major',
        title: `${room.name ?? room.id} below minimum area`, description: `${prog} requires ${rules.minArea}m²`,
        location: room.id, requirement: `${rules.minArea}m²`, actual: `${area.toFixed(1)}m²`,
        status: 'fail', state: 'open', assignee: '', comments: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }
  }

  return issues;
}

function checkEgress(input: ComplianceInput): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  if (!input.plan) return issues;
  const rooms = input.plan.rooms ?? [];

  const habitable = rooms.filter(r => MIN_ROOM_SIZES[r.name?.toLowerCase() ?? '']);
  for (const room of habitable) {
    issues.push({
      id: generateIssueId(), ruleId: 'egress-distance', category: 'egress',
      severity: 'minor', title: `Egress distance not checked for ${room.name ?? room.id}`,
      description: 'Verify travel distance to exit complies with local codes.',
      location: room.id, requirement: `≤ ${EGRESS_MAX_DISTANCE_M}m to exit`, actual: 'Not verified',
      status: 'warn', state: 'open', assignee: '', comments: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }

  const analysis = input.analysis as { egressStatus?: string } | null;
  if (analysis?.egressStatus && analysis.egressStatus !== 'pass') {
    issues.push({
      id: generateIssueId(), ruleId: 'egress-capacity', category: 'egress',
      severity: 'critical', title: 'Egress capacity issue detected',
      description: 'Review egress capacity for occupant load.',
      location: 'General', requirement: 'Adequate egress capacity', actual: analysis.egressStatus,
      status: 'fail', state: 'open', assignee: '', comments: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }

  return issues;
}

function checkCorridorWidths(input: ComplianceInput): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  if (!input.plan) return issues;
  const corridors = (input.plan.rooms ?? []).filter(r => (r.name?.toLowerCase() ?? '') === 'hallway');

  for (const corr of corridors) {
    const width = corr.width ?? 0;
    if (width > 0 && width < CORRIDOR_MIN_WIDTH) {
      issues.push({
        id: generateIssueId(), ruleId: 'corridor-width', category: 'corridor-width',
        severity: 'critical', title: `Corridor ${corr.name ?? corr.id} too narrow`,
        description: `Corridor width ${width}m is below minimum ${CORRIDOR_MIN_WIDTH}m.`,
        location: corr.id, requirement: `≥ ${CORRIDOR_MIN_WIDTH}m`, actual: `${width}m`,
        status: 'fail', state: 'open', assignee: '', comments: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }
  }

  return issues;
}

function checkStairGeometry(input: ComplianceInput): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  const plan = input.plan as { stairs?: Array<{ id?: string; rise?: number; going?: number; width?: number }> } | null;
  const stairs = plan?.stairs;

  if (stairs && stairs.length > 0) {
    for (const stair of stairs) {
      if (stair.rise && stair.rise > STAIR_MAX_RISE) {
        issues.push({
          id: generateIssueId(), ruleId: 'stair-rise', category: 'stair-geometry',
          severity: 'critical', title: 'Stair rise exceeds maximum',
          description: `Rise ${stair.rise}m exceeds max ${STAIR_MAX_RISE}m.`,
          location: stair.id ?? 'Stair', requirement: `≤ ${STAIR_MAX_RISE}m`, actual: `${stair.rise}m`,
          status: 'fail', state: 'open', assignee: '', comments: [],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
      }
      if (stair.going && stair.going < STAIR_MIN_GOING) {
        issues.push({
          id: generateIssueId(), ruleId: 'stair-going', category: 'stair-geometry',
          severity: 'critical', title: 'Stair going below minimum',
          description: `Going ${stair.going}m is below min ${STAIR_MIN_GOING}m.`,
          location: stair.id ?? 'Stair', requirement: `≥ ${STAIR_MIN_GOING}m`, actual: `${stair.going}m`,
          status: 'fail', state: 'open', assignee: '', comments: [],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
      }
    }
  } else {
    issues.push({
      id: generateIssueId(), ruleId: 'stair-present', category: 'stair-geometry',
      severity: 'info', title: 'No stairs in plan model',
      description: 'If multi-storey, verify stairs are modeled and comply.',
      location: 'General', requirement: 'Stair geometry per code', actual: 'Not modeled',
      status: 'warn', state: 'open', assignee: '', comments: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }

  return issues;
}

function checkAccessibility(input: ComplianceInput): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  issues.push({
    id: generateIssueId(), ruleId: 'access-general', category: 'accessibility',
    severity: 'major', title: 'Accessibility review required',
    description: 'Verify door widths, ramp gradients, and accessible path of travel.',
    location: 'General', requirement: 'Per local accessibility code', actual: 'Not verified',
    status: 'warn', state: 'open', assignee: '', comments: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  const corridors = input.plan?.rooms?.filter(r => (r.name?.toLowerCase() ?? '') === 'hallway') ?? [];
  const narrowCorridors = corridors.filter(c => (c.width ?? 0) > 0 && c.width < ACCESSIBLE_CORRIDOR_WIDTH);
  if (narrowCorridors.length > 0 && corridors.some(c => (c.width ?? 0) > 0)) {
    issues.push({
      id: generateIssueId(), ruleId: 'access-corridor', category: 'accessibility',
      severity: 'major', title: 'Some corridors below accessible width',
      description: `${narrowCorridors.length} corridor(s) are below ${ACCESSIBLE_CORRIDOR_WIDTH}m accessible minimum.`,
      location: narrowCorridors.map(c => c.id).join(', '),
      requirement: `≥ ${ACCESSIBLE_CORRIDOR_WIDTH}m for accessible route`,
      actual: `${ACCESSIBLE_CORRIDOR_WIDTH}m required`, status: 'warn', state: 'open',
      assignee: '', comments: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }

  return issues;
}

function checkDaylightVentilation(input: ComplianceInput): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  if (!input.plan) return issues;
  const rooms = input.plan.rooms ?? [];

  for (const room of rooms) {
    const prog = room.name?.toLowerCase() ?? '';
    if (!MIN_ROOM_SIZES[prog] || prog === 'hallway' || prog === 'storage') continue;

    issues.push({
      id: generateIssueId(), ruleId: 'daylight-check', category: 'daylight-ventilation',
      severity: 'minor', title: `Daylight not verified for ${room.name ?? room.id}`,
      description: 'Check window area meets minimum daylight factor.',
      location: room.id,
      requirement: `≥ ${MIN_DAYLIGHT_FACTOR * 100}% daylight factor`,
      actual: 'Not verified', status: 'warn', state: 'open',
      assignee: '', comments: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }

  return issues;
}

function checkSanitaryCounts(input: ComplianceInput): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  if (!input.plan) return issues;

  const plan = input.plan as { fixtures?: Array<{ type?: string; kind?: string }> } | null;
  const fixtures = plan?.fixtures ?? [];
  const wcs = fixtures.filter((f: Record<string, unknown>) => f.type === 'wc' || f.kind === 'wc');

  if (wcs.length === 0) {
    issues.push({
      id: generateIssueId(), ruleId: 'sanitary-wc', category: 'sanitary-counts',
      severity: 'critical', title: 'No WC fixtures found',
      description: 'At least one WC required per dwelling unit.',
      location: 'General', requirement: '≥ 1 WC', actual: '0', status: 'fail',
      state: 'open', assignee: '', comments: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }

  return issues;
}

function checkOccupancy(input: ComplianceInput): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const design = input.design;
  if (!design) return issues;

  const totalArea = design.grossFloorArea ?? 0;
  const occLoadFactor = input.buildingType === 'residential' ? 30 : 10;
  const occupantLoad = totalArea > 0 ? Math.ceil(totalArea / occLoadFactor) : 0;

  issues.push({
    id: generateIssueId(), ruleId: 'occupancy-est', category: 'occupancy',
    severity: 'info', title: `Estimated occupancy: ${occupantLoad} persons`,
    description: `Based on ${totalArea}m² at ${occLoadFactor}m²/person.`,
    location: 'General',
    requirement: `Per ${input.buildingType} occupancy factor`,
    actual: `${occupantLoad} persons`,
    status: 'pass', state: 'closed', assignee: '', comments: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  return issues;
}

function checkSetbacksSiteCoverage(_input: ComplianceInput): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  issues.push({
    id: generateIssueId(), ruleId: 'setback-check', category: 'setbacks',
    severity: 'major', title: 'Setback compliance requires site context',
    description: 'Provide site boundary and zoning info to verify setbacks.',
    location: 'Site boundary', requirement: 'Per local zoning bylaw', actual: 'Site context needed',
    status: 'warn', state: 'open', assignee: '', comments: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  return issues;
}

function checkFireSeparation(input: ComplianceInput): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const analysis = input.analysis as { fireRatingStatus?: string } | null;
  const fireRatingStatus = analysis?.fireRatingStatus;

  issues.push({
    id: generateIssueId(), ruleId: 'fire-sep-general', category: 'fire-separation',
    severity: 'major', title: 'Fire separation review',
    description: fireRatingStatus
      ? `Fire separation status: ${fireRatingStatus}`
      : 'Check fire ratings for party walls, garage separations, and egress routes.',
    location: 'General',
    requirement: 'Per local building code fire separation requirements',
    actual: fireRatingStatus ?? 'Not verified',
    status: fireRatingStatus === 'pass' ? 'pass' : 'warn',
    state: 'open', assignee: '', comments: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  return issues;
}

export function runExpandedCodeRules(input: ComplianceInput, _jurisdiction: string): ReviewIssue[] {
  const allIssues: ReviewIssue[] = [
    ...checkRoomMinimums(input),
    ...checkEgress(input),
    ...checkCorridorWidths(input),
    ...checkStairGeometry(input),
    ...checkAccessibility(input),
    ...checkDaylightVentilation(input),
    ...checkSanitaryCounts(input),
    ...checkOccupancy(input),
    ...checkSetbacksSiteCoverage(input),
    ...checkFireSeparation(input),
  ];

  return allIssues;
}

export function createReviewReport(
  projectId: string,
  jurisdiction: string,
  issues: ReviewIssue[],
  reviewer: string,
  notes = ''
): ReviewReport {
  const critical = issues.filter(i => i.severity === 'critical').length;
  const major = issues.filter(i => i.severity === 'major').length;
  const minor = issues.filter(i => i.severity === 'minor').length;
  const info = issues.filter(i => i.severity === 'info').length;
  const open = issues.filter(i => i.state === 'open').length;
  const resolved = issues.filter(i => i.state === 'resolved' || i.state === 'closed').length;

  const hasFails = issues.some(i => i.status === 'fail');
  const hasWarns = issues.some(i => i.status === 'warn');
  const decision: ReviewDecision = hasFails ? 'revise' : hasWarns ? 'conditional-pass' : 'pass';

  const totalIssues = issues.length;
  const score = totalIssues > 0 ? Math.round((resolved / totalIssues) * 100) : 100;

  return {
    id: `review-${Date.now()}`, projectId, jurisdiction, issues,
    findings: issues.filter(i => i.status !== 'pass').map(i => ({
      id: i.id, title: i.title, finding: i.description,
      severity: i.severity, category: i.category, location: i.location,
      recommendation: i.requirement,
    })),
    decision,
    summary: { totalIssues, critical, major, minor, info, open, resolved, score },
    reviewer, notes,
    reviewedAt: new Date().toISOString(),
  };
}

export function resolveIssue(issue: ReviewIssue, resolution: string, resolvedBy: string): ReviewIssue {
  return {
    ...issue,
    state: 'resolved',
    updatedAt: new Date().toISOString(),
    comments: [...issue.comments, {
      id: `cmt-${Date.now()}`, author: resolvedBy, role: 'reviewer',
      message: `Resolved: ${resolution}`, timestamp: new Date().toISOString(),
    }],
  };
}

export function generateReviewSummaryHtml(report: ReviewReport): string {
  const { summary } = report;
  let html = `<div style="font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px">
<h1 style="font-size:16px;margin-bottom:8px">Code Review Report</h1>
<p style="font-size:11px;color:#666">Project: ${report.projectId} | Jurisdiction: ${report.jurisdiction} | Date: ${report.reviewedAt}</p>
<p style="font-size:11px;color:#666">Reviewer: ${report.reviewer} | Decision: <strong style="color:${
    report.decision === 'pass' ? '#22c55e' : report.decision === 'conditional-pass' ? '#f59e0b' : '#ef4444'
  }">${report.decision}</strong></p>

<div style="display:flex;gap:12px;margin:16px 0">
<div style="background:#f8f8f8;border-radius:6px;padding:10px;text-align:center;flex:1">
<div style="font-size:20px;font-weight:bold;color:#111">${summary.totalIssues}</div>
<div style="font-size:10px;color:#666">Total Issues</div>
</div>
<div style="background:#fef2f2;border-radius:6px;padding:10px;text-align:center;flex:1">
<div style="font-size:20px;font-weight:bold;color:#ef4444">${summary.critical}</div>
<div style="font-size:10px;color:#666">Critical</div>
</div>
<div style="background:#fff7ed;border-radius:6px;padding:10px;text-align:center;flex:1">
<div style="font-size:20px;font-weight:bold;color:#f59e0b">${summary.major}</div>
<div style="font-size:10px;color:#666">Major</div>
</div>
<div style="background:#f0fdf4;border-radius:6px;padding:10px;text-align:center;flex:1">
<div style="font-size:20px;font-weight:bold;color:#22c55e">${summary.score}%</div>
<div style="font-size:10px;color:#666">Score</div>
</div>
</div>

<table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:12px">
<thead><tr style="background:#f0f0f0;font-weight:600">
<th style="padding:6px;border:1px solid #ddd;text-align:left">Issue</th>
<th style="padding:6px;border:1px solid #ddd;text-align:left">Category</th>
<th style="padding:6px;border:1px solid #ddd;text-align:center">Severity</th>
<th style="padding:6px;border:1px solid #ddd;text-align:center">Status</th>
<th style="padding:6px;border:1px solid #ddd;text-align:left">Location</th>
</tr></thead><tbody>`;

  for (const issue of report.issues) {
    const severityColor = { critical: '#ef4444', major: '#f59e0b', minor: '#3b82f6', info: '#666' }[issue.severity];
    html += `<tr>
<td style="padding:4px 6px;border:1px solid #ddd">${issue.title}</td>
<td style="padding:4px 6px;border:1px solid #ddd">${issue.category}</td>
<td style="padding:4px 6px;border:1px solid #ddd;text-align:center;color:${severityColor}">${issue.severity}</td>
<td style="padding:4px 6px;border:1px solid #ddd;text-align:center">${issue.status}</td>
<td style="padding:4px 6px;border:1px solid #ddd">${issue.location}</td>
</tr>`;
  }

  html += '</tbody></table>';
  html += `<p style="font-size:9px;color:#999;margin-top:12px">⚠ This is code-assisted review, not certified approval. Always consult a registered professional for legal compliance signoff.</p>`;
  html += '</div>';
  return html;
}
