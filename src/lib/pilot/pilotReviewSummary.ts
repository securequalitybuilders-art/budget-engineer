import type {
  PilotObservation,
  PilotSession,
  PilotCloseoutRecommendation,
  PilotSeverity,
  PilotStatus,
  PilotDomain,
  PilotDeploymentTier,
} from './pilotFeedbackModel';
import {
  getUnresolvedBlockers,
  countBySeverity,
  countByDomain,
  countByStatus,
  getDomainConcentration,
  getOpenVsResolvedCount,
} from './pilotIssueClassification';
import type { TrendData } from './pilotTrendAnalysis';
import { buildTrendData } from './pilotTrendAnalysis';

export interface PilotReviewSummary {
  sessionId: string;
  sessionName: string;
  generatedAt: string;
  totalObservations: number;
  bySeverity: Record<PilotSeverity, number>;
  byDomain: Record<PilotDomain, number>;
  byStatus: Record<PilotStatus, number>;
  unresolvedBlockers: PilotObservation[];
  domainConcentration: { domain: PilotDomain; count: number; pct: number }[];
  openVsResolved: { open: number; resolved: number; total: number };
  recommendation: PilotCloseoutRecommendation;
  recommendationReason: string;
  hasUnresolvedBlockers: boolean;
  resolutionRate: number;
  readinessContext: { tier: PilotDeploymentTier; score: number } | null;
  recurringIssueKeys: string[];
  trendContext: string | null;
}

export function generatePilotReviewSummary(
  session: PilotSession,
  observations: PilotObservation[],
  allSessions?: PilotSession[],
  allObservations?: PilotObservation[]
): PilotReviewSummary {
  const bySeverity = countBySeverity(observations);
  const byDomain = countByDomain(observations);
  const byStatus = countByStatus(observations);
  const unresolvedBlockersList = getUnresolvedBlockers(observations);
  const concentration = getDomainConcentration(observations);
  const openVsResolved = getOpenVsResolvedCount(observations);
  const total = observations.length;
  const resolutionRate = total > 0
    ? Math.round((openVsResolved.resolved / total) * 100)
    : 0;

  const recurringIssueKeys = [...new Set(observations.filter(o => o.recurringIssueKey).map(o => o.recurringIssueKey))];

  let trendData: TrendData | null = null;
  if (allSessions && allObservations && allSessions.length > 1) {
    trendData = buildTrendData(allSessions, allObservations);
  }

  const rec = computeCloseoutRecommendation(
    total,
    unresolvedBlockersList.length,
    openVsResolved,
    bySeverity,
    session.readinessContext?.tier ?? null,
    trendData
  );

  return {
    sessionId: session.id,
    sessionName: session.name,
    generatedAt: new Date().toISOString(),
    totalObservations: total,
    bySeverity,
    byDomain,
    byStatus,
    unresolvedBlockers: unresolvedBlockersList,
    domainConcentration: concentration,
    openVsResolved,
    recommendation: rec.recommendation,
    recommendationReason: rec.reason,
    hasUnresolvedBlockers: unresolvedBlockersList.length > 0,
    resolutionRate,
    readinessContext: session.readinessContext
      ? { tier: session.readinessContext.tier, score: session.readinessContext.benchmarkScore }
      : null,
    recurringIssueKeys,
    trendContext: trendData?.overallAssessment ?? null,
  };
}

export function computeCloseoutRecommendation(
  total: number,
  unresolvedBlockerCount: number,
  openVsResolved: { open: number; resolved: number; total: number },
  bySeverity: Record<PilotSeverity, number>,
  _currentTier?: PilotDeploymentTier | null,
  trendData?: TrendData | null
): { recommendation: PilotCloseoutRecommendation; reason: string } {
  if (total === 0) {
    return {
      recommendation: 'continue',
      reason: 'No observations recorded. Pilot should continue to gather data before making a closeout decision.',
    };
  }

  if (unresolvedBlockerCount > 0) {
    return {
      recommendation: 'pause',
      reason: `${unresolvedBlockerCount} unresolved blocker(s) remain. Pilot should pause until these are resolved.`,
    };
  }

  if (bySeverity.major > 0 && openVsResolved.open > bySeverity.major) {
    const openMajor = bySeverity.major;
    return {
      recommendation: 'pause',
      reason: `${openMajor} major issue(s) remain unresolved. Recommend pausing until addressed.`,
    };
  }

  if (openVsResolved.resolved === 0 && total > 0) {
    let reason = 'No items resolved yet. Pilot should continue with structured observation gathering.';
    if (trendData && trendData.sessionCount > 1) {
      const prevRate = trendData.resolutionTrend[trendData.resolutionTrend.length - 2]?.rate ?? 0;
      if (prevRate > 0) reason += ` Previous session had ${prevRate}% resolution rate — investigate why progress stalled.`;
    }
    return { recommendation: 'continue', reason };
  }

  if (openVsResolved.open === 0) {
    let reason = 'All items resolved or accepted as limitations. Ready for pilot closeout.';
    if (trendData && trendData.sessionCount > 1) {
      const latestBlocker = trendData.blockerTrend[trendData.blockerTrend.length - 1]?.count ?? 0;
      if (latestBlocker === 0 && trendData.blockerTrend.every(t => t.count === 0)) {
        reason += ' No blockers across all sessions — strong readiness signal.';
      }
    }
    if (trendData && trendData.sessionCount > 1 && trendData.overallAssessment.includes('positive')) {
      reason += ' Overall trend trajectory is positive.';
    }
    return { recommendation: 'close-resolved', reason };
  }

  if (trendData && trendData.sessionCount > 1) {
    const latestBlocker = trendData.blockerTrend[trendData.blockerTrend.length - 1]?.count ?? 0;
    const earliestBlocker = trendData.blockerTrend[0]?.count ?? 0;
    const blockerPersistent = latestBlocker > 0 && latestBlocker >= earliestBlocker;

    if (blockerPersistent) {
      return {
        recommendation: 'pause',
        reason: `Blockers persistent across ${trendData.sessionCount} sessions (${earliestBlocker} → ${latestBlocker}). Recommend pause until root cause addressed.`,
      };
    }

    const latestRate = trendData.resolutionTrend[trendData.resolutionTrend.length - 1]?.rate ?? 0;
    const earliestRate = trendData.resolutionTrend[0]?.rate ?? 0;
    if (latestRate < earliestRate && latestRate < 50) {
      return {
        recommendation: 'pause',
        reason: `Resolution rate declining (${earliestRate}% → ${latestRate}%) across ${trendData.sessionCount} sessions. Pause to investigate process gaps.`,
      };
    }
  }

  if (openVsResolved.resolved > 0 && openVsResolved.resolved >= openVsResolved.open) {
    const deferredCount = bySeverity.observation + bySeverity.enhancement;
    if (deferredCount >= openVsResolved.open) {
      let reason = `Most items resolved (${openVsResolved.resolved}/${total}). ${openVsResolved.open} open item(s) are observations/enhancements suitable for follow-up.`;
      if (trendData && trendData.sessionCount > 1 && trendData.overallAssessment.includes('positive')) {
        reason += ' Consistent improvement across sessions supports closeout.';
      }
      return { recommendation: 'close-with-followups', reason };
    }
    return {
      recommendation: 'continue',
      reason: `${openVsResolved.resolved}/${total} items resolved but significant open items remain. Continue pilot.`,
    };
  }

  let reason = `${openVsResolved.resolved}/${total} items resolved with ${openVsResolved.open} still open. Continue monitoring.`;
  if (trendData && trendData.sessionCount > 1) {
    const recentBlocker = trendData.blockerTrend[trendData.blockerTrend.length - 1]?.count ?? 0;
    if (recentBlocker > 0) reason += ` ${recentBlocker} blocker(s) in latest session require attention.`;
  }
  return { recommendation: 'continue', reason };
}

export function formatReviewSummaryText(summary: PilotReviewSummary): string {
  const lines: string[] = [];
  lines.push(`Pilot Review Summary: ${summary.sessionName}`);
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push('');
  lines.push(`Total Observations: ${summary.totalObservations}`);
  lines.push(`Resolution Rate: ${summary.resolutionRate}%`);
  if (summary.readinessContext) {
    lines.push(`Readiness Tier: ${summary.readinessContext.tier} (Score: ${summary.readinessContext.score}%)`);
  }
  lines.push('');
  lines.push('--- By Severity ---');
  for (const [sev, count] of Object.entries(summary.bySeverity)) {
    if (count > 0) lines.push(`  ${sev}: ${count}`);
  }
  lines.push('');
  lines.push('--- By Domain ---');
  for (const d of summary.domainConcentration) {
    lines.push(`  ${d.domain}: ${d.count} (${d.pct}%)`);
  }
  lines.push('');
  lines.push('--- Resolution Status ---');
  lines.push(`  Open: ${summary.openVsResolved.open}`);
  lines.push(`  Resolved: ${summary.openVsResolved.resolved}`);
  lines.push('');
  if (summary.unresolvedBlockers.length > 0) {
    lines.push('--- Unresolved Blockers ---');
    for (const b of summary.unresolvedBlockers) {
      lines.push(`  [${b.domain}] ${b.title}`);
    }
    lines.push('');
  }
  if (summary.recurringIssueKeys.length > 0) {
    lines.push('--- Recurring Issues ---');
    for (const key of summary.recurringIssueKeys) {
      lines.push(`  ${key}`);
    }
    lines.push('');
  }
  if (summary.trendContext) {
    lines.push('--- Trend Context ---');
    lines.push(`  ${summary.trendContext}`);
    lines.push('');
  }
  lines.push(`Recommendation: ${summary.recommendation}`);
  lines.push(`Reason: ${summary.recommendationReason}`);
  return lines.join('\n');
}
