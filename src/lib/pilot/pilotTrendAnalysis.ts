import type {
  PilotObservation,
  PilotSession,
  PilotDomain,
  PilotDeploymentTier,
} from './pilotFeedbackModel';
import { getUnresolvedBlockers, getOpenVsResolvedCount, countBySeverity } from './pilotIssueClassification';

export interface SessionSnapshot {
  sessionId: string;
  sessionName: string;
  startDate: string;
  status: string;
  totalObservations: number;
  blockerCount: number;
  majorCount: number;
  openCount: number;
  resolvedCount: number;
  resolutionRate: number;
  domainsAffected: number;
  readinessTier: PilotDeploymentTier | null;
  readinessScore: number | null;
}

export interface TrendData {
  sessionCount: number;
  totalObservations: number;
  blockerTrend: { session: string; count: number; date: string }[];
  majorTrend: { session: string; count: number; date: string }[];
  resolutionTrend: { session: string; rate: number; date: string }[];
  readinessTrend: { session: string; tier: PilotDeploymentTier | null; score: number | null; date: string }[];
  domainRecurrence: { domain: PilotDomain; count: number; sessions: string[] }[];
  recurringIssues: { key: string; title: string; sessions: string[]; totalOccurrences: number }[];
  overallAssessment: string;
}

export function buildSessionSnapshot(
  session: PilotSession,
  observations: PilotObservation[]
): SessionSnapshot {
  const openVsResolved = getOpenVsResolvedCount(observations);
  const blockers = getUnresolvedBlockers(observations);
  const bySeverity = countBySeverity(observations);
  const domains = new Set(observations.map(o => o.domain));
  const total = observations.length;

  return {
    sessionId: session.id,
    sessionName: session.name,
    startDate: session.startDate,
    status: session.status,
    totalObservations: total,
    blockerCount: blockers.length,
    majorCount: bySeverity.major,
    openCount: openVsResolved.open,
    resolvedCount: openVsResolved.resolved,
    resolutionRate: total > 0 ? Math.round((openVsResolved.resolved / total) * 100) : 0,
    domainsAffected: domains.size,
    readinessTier: session.readinessContext?.tier ?? null,
    readinessScore: session.readinessContext?.benchmarkScore ?? null,
  };
}

export function buildTrendData(
  sessions: PilotSession[],
  allObservations: PilotObservation[]
): TrendData {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const blockerTrend: TrendData['blockerTrend'] = [];
  const majorTrend: TrendData['majorTrend'] = [];
  const resolutionTrend: TrendData['resolutionTrend'] = [];
  const readinessTrend: TrendData['readinessTrend'] = [];
  const domainRecurrenceMap = new Map<PilotDomain, { count: number; sessions: Set<string> }>();
  const recurringMap = new Map<string, { key: string; title: string; sessions: Set<string>; totalOccurrences: number }>();

  let totalObs = 0;

  for (const session of sorted) {
    const sessionObs = allObservations.filter(o => o.sessionId === session.id);
    const snapshot = buildSessionSnapshot(session, sessionObs);
    totalObs += snapshot.totalObservations;

    blockerTrend.push({
      session: session.name,
      count: snapshot.blockerCount,
      date: session.startDate,
    });

    majorTrend.push({
      session: session.name,
      count: snapshot.majorCount,
      date: session.startDate,
    });

    resolutionTrend.push({
      session: session.name,
      rate: snapshot.resolutionRate,
      date: session.startDate,
    });

    readinessTrend.push({
      session: session.name,
      tier: snapshot.readinessTier,
      score: snapshot.readinessScore,
      date: session.startDate,
    });

    for (const obs of sessionObs) {
      const current = domainRecurrenceMap.get(obs.domain) ?? { count: 0, sessions: new Set() };
      current.count++;
      current.sessions.add(session.name);
      domainRecurrenceMap.set(obs.domain, current);

      if (obs.recurringIssueKey) {
        const rec = recurringMap.get(obs.recurringIssueKey) ?? {
          key: obs.recurringIssueKey,
          title: obs.title,
          sessions: new Set(),
          totalOccurrences: 0,
        };
        rec.totalOccurrences++;
        rec.sessions.add(session.name);
        if (obs.title && !rec.title.includes(obs.title)) {
          rec.title = `${rec.title} / ${obs.title}`;
        }
        recurringMap.set(obs.recurringIssueKey, rec);
      }
    }
  }

  const domainRecurrence: TrendData['domainRecurrence'] = [];
  for (const [domain, data] of domainRecurrenceMap) {
    domainRecurrence.push({
      domain,
      count: data.count,
      sessions: [...data.sessions],
    });
  }
  domainRecurrence.sort((a, b) => b.count - a.count);

  const recurringIssues: TrendData['recurringIssues'] = [];
  for (const [, data] of recurringMap) {
    recurringIssues.push({
      key: data.key,
      title: data.title,
      sessions: [...data.sessions],
      totalOccurrences: data.totalOccurrences,
    });
  }
  recurringIssues.sort((a, b) => b.totalOccurrences - a.totalOccurrences);

  const overallAssessment = computeTrendAssessment(
    blockerTrend,
    resolutionTrend,
    readinessTrend,
    sorted.length
  );

  return {
    sessionCount: sorted.length,
    totalObservations: totalObs,
    blockerTrend,
    majorTrend,
    resolutionTrend,
    readinessTrend,
    domainRecurrence,
    recurringIssues,
    overallAssessment,
  };
}

export function computeTrendAssessment(
  blockerTrend: TrendData['blockerTrend'],
  resolutionTrend: TrendData['resolutionTrend'],
  readinessTrend: TrendData['readinessTrend'],
  sessionCount: number
): string {
  if (sessionCount === 0) return 'No session data available for trend assessment.';
  if (sessionCount === 1) return 'Single session recorded. More sessions needed for trend analysis.';

  const latestBlocker = blockerTrend[blockerTrend.length - 1]?.count ?? 0;
  const earliestBlocker = blockerTrend[0]?.count ?? 0;
  const latestResolution = resolutionTrend[resolutionTrend.length - 1]?.rate ?? 0;
  const earliestResolution = resolutionTrend[0]?.rate ?? 0;

  const blockerImproving = latestBlocker < earliestBlocker;
  const resolutionImproving = latestResolution > earliestResolution;
  const allBlockersResolved = latestBlocker === 0;

  const latestTier = readinessTrend[readinessTrend.length - 1]?.tier;
  const earliestTier = readinessTrend[0]?.tier;
  const tiers: PilotDeploymentTier[] = ['blocked', 'internal-only', 'supervised-professional', 'pilot-deployment'];
  const tierImproving = latestTier && earliestTier
    ? tiers.indexOf(latestTier) >= tiers.indexOf(earliestTier)
    : null;

  const parts: string[] = [];
  if (sessionCount >= 2) parts.push(`${sessionCount} sessions evaluated.`);

  if (blockerImproving && allBlockersResolved) {
    parts.push('Blockers have been fully resolved across sessions — strong improvement.');
  } else if (blockerImproving) {
    parts.push(`Blockers decreasing (${earliestBlocker} → ${latestBlocker}).`);
  } else if (latestBlocker > earliestBlocker) {
    parts.push(`Blockers increasing (${earliestBlocker} → ${latestBlocker}) — needs attention.`);
  } else {
    parts.push(`Blocker count stable at ${latestBlocker}.`);
  }

  if (resolutionImproving) {
    parts.push(`Resolution rate improving (${earliestResolution}% → ${latestResolution}%).`);
  } else if (latestResolution < earliestResolution) {
    parts.push(`Resolution rate declining (${earliestResolution}% → ${latestResolution}%).`);
  } else {
    parts.push(`Resolution rate steady at ${latestResolution}%.`);
  }

  if (tierImproving === true) {
    parts.push(`Readiness tier improving (${earliestTier} → ${latestTier}).`);
  } else if (tierImproving === false) {
    parts.push(`Readiness tier regressed (${earliestTier} → ${latestTier}).`);
  }

  if (allBlockersResolved && resolutionImproving && tierImproving !== false) {
    parts.push('Overall trajectory positive. Platform readiness trending upward.');
  } else if (latestBlocker > 0 && !blockerImproving) {
    parts.push('Overall trajectory concerning. Persistent blockers require resolution before wider use.');
  } else {
    parts.push('Mixed trajectory. Continue monitoring across more sessions.');
  }

  return parts.join(' ');
}

export function formatTrendDataHtml(trend: TrendData): string {
  let html = `<h1>Pilot Trend Report</h1>
<p>${trend.sessionCount} sessions, ${trend.totalObservations} total observations</p>

<h2>Overall Assessment</h2>
<p>${trend.overallAssessment}</p>

<h2>Blocker Trend</h2>
<table><thead><tr><th>Session</th><th>Date</th><th>Blockers</th></tr></thead><tbody>`;
  for (const t of trend.blockerTrend) {
    html += `<tr><td>${t.session}</td><td>${new Date(t.date).toLocaleDateString()}</td><td>${t.count}</td></tr>`;
  }
  html += `</tbody></table>

<h2>Resolution Rate Trend</h2>
<table><thead><tr><th>Session</th><th>Date</th><th>Rate</th></tr></thead><tbody>`;
  for (const t of trend.resolutionTrend) {
    html += `<tr><td>${t.session}</td><td>${new Date(t.date).toLocaleDateString()}</td><td>${t.rate}%</td></tr>`;
  }
  html += `</tbody></table>

<h2>Readiness Tier Progression</h2>
<table><thead><tr><th>Session</th><th>Date</th><th>Tier</th><th>Score</th></tr></thead><tbody>`;
  for (const t of trend.readinessTrend) {
    html += `<tr><td>${t.session}</td><td>${new Date(t.date).toLocaleDateString()}</td><td>${t.tier ?? '—'}</td><td>${t.score !== null ? t.score + '%' : '—'}</td></tr>`;
  }
  html += `</tbody></table>`;

  if (trend.domainRecurrence.length > 0) {
    html += `<h2>Domain Recurrence</h2>
<table><thead><tr><th>Domain</th><th>Count</th><th>Sessions</th></tr></thead><tbody>`;
    for (const d of trend.domainRecurrence) {
      html += `<tr><td>${d.domain}</td><td>${d.count}</td><td>${d.sessions.join(', ')}</td></tr>`;
    }
    html += `</tbody></table>`;
  }

  if (trend.recurringIssues.length > 0) {
    html += `<h2>Recurring Issues</h2>
<table><thead><tr><th>Key</th><th>Occurrences</th><th>Sessions</th></tr></thead><tbody>`;
    for (const r of trend.recurringIssues) {
      html += `<tr><td>${r.key}</td><td>${r.totalOccurrences}</td><td>${r.sessions.join(', ')}</td></tr>`;
    }
    html += `</tbody></table>`;
  }

  const STYLE = `
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#222;max-width:900px;margin:0 auto;padding:20px}
h1{font-size:16px;margin:0 0 4px;color:#111}
h2{font-size:13px;margin:16px 0 4px;color:#333}
p{margin:4px 0;font-size:10px;color:#555}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:9px}
th,td{padding:4px 6px;border:1px solid #ddd;text-align:left}
th{background:#f5f5f5;font-weight:600}
.footer{margin-top:20px;padding-top:8px;border-top:1px solid #ddd;font-size:8px;color:#999}
`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pilot Trend Report</title><style>${STYLE}</style></head><body>${html}<div class="footer">Generated by Budget Engineer v4.0.0 — ${new Date().toISOString()}</div></body></html>`;
}

export function formatTrendDataText(trend: TrendData): string {
  const lines: string[] = [
    'Pilot Trend Report',
    `${trend.sessionCount} sessions, ${trend.totalObservations} total observations`,
    '',
    `Overall Assessment: ${trend.overallAssessment}`,
    '',
    'Blocker Trend:',
    ...trend.blockerTrend.map(t => `  ${t.session} (${new Date(t.date).toLocaleDateString()}): ${t.count}`),
    '',
    'Resolution Rate Trend:',
    ...trend.resolutionTrend.map(t => `  ${t.session} (${new Date(t.date).toLocaleDateString()}): ${t.rate}%`),
    '',
    'Readiness Tier Progression:',
    ...trend.readinessTrend.map(t => `  ${t.session}: ${t.tier ?? '—'} (score: ${t.score !== null ? t.score + '%' : '—'})`),
  ];
  return lines.join('\n');
}
