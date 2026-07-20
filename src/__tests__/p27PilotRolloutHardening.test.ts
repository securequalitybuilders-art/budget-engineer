import { describe, it, expect } from 'vitest';
import { generateId, SEVERITY_LABELS, STATUS_LABELS, DOMAIN_LABELS, SEVERITY_ORDER } from '@/lib/pilot/pilotFeedbackModel';
import type { PilotObservation, PilotSession, PilotSeverity, PilotStatus, PilotDomain } from '@/lib/pilot/pilotFeedbackModel';
import {
  isUnresolved, isOpen, isResolved, isBlocker, isBlocking,
  filterBySeverity, filterByDomain, filterByStatus,
  sortBySeverity, getUnresolvedBlockers,
  countBySeverity, countByDomain, countByStatus,
  getDomainConcentration, getOpenVsResolvedCount,
} from '@/lib/pilot/pilotIssueClassification';
import {
  generatePilotReviewSummary, computeCloseoutRecommendation,
  formatReviewSummaryText,
} from '@/lib/pilot/pilotReviewSummary';
import {
  formatPilotIssueLogHtml, formatPilotSummaryReportHtml,
  formatOpenBlockerReportHtml, formatCloseoutRecommendationHtml,
  formatPilotIssueLogJson, formatPilotSummaryText,
  formatMultiSessionSummaryHtml, formatTrendReportHtml,
  formatSessionComparisonHtml, formatTrendReportText, formatMultiSessionSummaryText,
} from '@/lib/pilot/pilotExport';
import {
  buildTrendData, buildSessionSnapshot, computeTrendAssessment,
  formatTrendDataHtml, formatTrendDataText,
} from '@/lib/pilot/pilotTrendAnalysis';
import type { TrendData } from '@/lib/pilot/pilotTrendAnalysis';

function makeObs(overrides: Partial<PilotObservation> & { severity: PilotSeverity; domain: PilotDomain }): PilotObservation {
  const id = overrides.id ?? generateId();
  return {
    id,
    sessionId: overrides.sessionId ?? 'test-session',
    createdAt: overrides.createdAt ?? '2026-07-19T12:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-07-19T12:00:00.000Z',
    title: overrides.title ?? 'Test observation',
    description: overrides.description ?? 'Test description',
    severity: overrides.severity,
    domain: overrides.domain,
    status: overrides.status ?? 'new',
    evidenceRef: overrides.evidenceRef ?? '',
    recommendation: overrides.recommendation ?? '',
    reviewerName: overrides.reviewerName ?? 'Test Reviewer',
    reviewerRole: overrides.reviewerRole ?? 'Engineer',
    followUpAction: overrides.followUpAction ?? '',
    followUpAssignee: overrides.followUpAssignee ?? '',
    resolutionNotes: overrides.resolutionNotes ?? '',
    tags: overrides.tags ?? [],
    recurringIssueKey: overrides.recurringIssueKey ?? '',
    attachments: overrides.attachments ?? [],
  };
}

function makeSession(overrides: Partial<PilotSession> = {}): PilotSession {
  return {
    id: overrides.id ?? 'test-session',
    projectId: overrides.projectId ?? 'test-project',
    name: overrides.name ?? 'Test Pilot Session',
    description: overrides.description ?? 'Test session description',
    startDate: overrides.startDate ?? '2026-07-01T00:00:00.000Z',
    endDate: overrides.endDate ?? null,
    status: overrides.status ?? 'active',
    leadReviewer: overrides.leadReviewer ?? 'Lead Reviewer',
    teamMembers: overrides.teamMembers ?? [],
    notes: overrides.notes ?? '',
    readinessContext: overrides.readinessContext ?? null,
  };
}

describe('P27 — Pilot Rollout Hardening & Feedback Capture', () => {
  describe('Domain Model', () => {
    it('generates unique IDs', () => {
      const a = generateId();
      const b = generateId();
      expect(a).not.toBe(b);
    });

    it('defines all severity labels', () => {
      expect(Object.keys(SEVERITY_LABELS)).toEqual(['blocker', 'major', 'minor', 'observation', 'enhancement']);
    });

    it('defines all status labels', () => {
      expect(Object.keys(STATUS_LABELS)).toEqual([
        'new', 'under-review', 'action-planned', 'resolved', 'accepted-limitation', 'deferred',
      ]);
    });

    it('defines all domain labels', () => {
      expect(Object.keys(DOMAIN_LABELS)).toEqual([
        'geometry-generation', 'drawings-package', 'boq-procurement',
        'delivery-lifecycle', 'validation-reporting', 'deployment-evaluation-ux',
      ]);
    });

    it('severity order is correct', () => {
      expect(SEVERITY_ORDER).toEqual(['blocker', 'major', 'minor', 'observation', 'enhancement']);
    });
  });

  describe('Issue Classification', () => {
    describe('isUnresolved', () => {
      it('returns true for new', () => expect(isUnresolved('new')).toBe(true));
      it('returns true for under-review', () => expect(isUnresolved('under-review')).toBe(true));
      it('returns true for action-planned', () => expect(isUnresolved('action-planned')).toBe(true));
      it('returns false for resolved', () => expect(isUnresolved('resolved')).toBe(false));
      it('returns false for accepted-limitation', () => expect(isUnresolved('accepted-limitation')).toBe(false));
      it('returns false for deferred', () => expect(isUnresolved('deferred')).toBe(false));
    });

    describe('isOpen', () => {
      it('deferred is open', () => expect(isOpen('deferred')).toBe(true));
      it('resolved is not open', () => expect(isOpen('resolved')).toBe(false));
      it('accepted-limitation is not open', () => expect(isOpen('accepted-limitation')).toBe(false));
    });

    describe('isResolved', () => {
      it('resolved is resolved', () => expect(isResolved('resolved')).toBe(true));
      it('accepted-limitation is resolved', () => expect(isResolved('accepted-limitation')).toBe(true));
      it('new is not resolved', () => expect(isResolved('new')).toBe(false));
    });

    describe('isBlocker / isBlocking', () => {
      it('blocker severity is blocker', () => expect(isBlocker('blocker')).toBe(true));
      it('major is not blocker', () => expect(isBlocker('major')).toBe(false));

      it('blocker with new status is blocking', () => {
        expect(isBlocking(makeObs({ severity: 'blocker', domain: 'boq-procurement', status: 'new' }))).toBe(true);
      });

      it('blocker with resolved status is not blocking', () => {
        expect(isBlocking(makeObs({ severity: 'blocker', domain: 'boq-procurement', status: 'resolved' }))).toBe(false);
      });

      it('major with new status is not blocking', () => {
        expect(isBlocking(makeObs({ severity: 'major', domain: 'boq-procurement', status: 'new' }))).toBe(false);
      });
    });

    describe('filterBySeverity', () => {
      const obs = [
        makeObs({ severity: 'blocker', domain: 'geometry-generation' }),
        makeObs({ severity: 'major', domain: 'drawings-package' }),
        makeObs({ severity: 'minor', domain: 'boq-procurement' }),
      ];

      it('returns all for "all"', () => expect(filterBySeverity(obs, 'all')).toHaveLength(3));
      it('filters by blocker', () => expect(filterBySeverity(obs, 'blocker')).toHaveLength(1));
      it('filters by major', () => expect(filterBySeverity(obs, 'major')).toHaveLength(1));
      it('returns empty for unmatched', () => expect(filterBySeverity(obs, 'enhancement')).toHaveLength(0));
    });

    describe('filterByDomain', () => {
      const obs = [
        makeObs({ severity: 'minor', domain: 'geometry-generation' }),
        makeObs({ severity: 'minor', domain: 'drawings-package' }),
      ];

      it('filters by domain', () => {
        expect(filterByDomain(obs, 'geometry-generation')).toHaveLength(1);
        expect(filterByDomain(obs, 'drawings-package')).toHaveLength(1);
        expect(filterByDomain(obs, 'all')).toHaveLength(2);
      });
    });

    describe('filterByStatus', () => {
      const obs = [
        makeObs({ severity: 'minor', domain: 'geometry-generation', status: 'new' }),
        makeObs({ severity: 'minor', domain: 'geometry-generation', status: 'resolved' }),
      ];

      it('filters by status', () => {
        expect(filterByStatus(obs, 'new')).toHaveLength(1);
        expect(filterByStatus(obs, 'resolved')).toHaveLength(1);
        expect(filterByStatus(obs, 'all')).toHaveLength(2);
      });
    });

    describe('sortBySeverity', () => {
      it('sorts by severity order', () => {
        const obs = [
          makeObs({ severity: 'observation', domain: 'boq-procurement' }),
          makeObs({ severity: 'blocker', domain: 'boq-procurement' }),
          makeObs({ severity: 'major', domain: 'boq-procurement' }),
        ];
        const sorted = sortBySeverity(obs);
        expect(sorted[0].severity).toBe('blocker');
        expect(sorted[1].severity).toBe('major');
        expect(sorted[2].severity).toBe('observation');
      });
    });

    describe('getUnresolvedBlockers', () => {
      it('returns only blocking observations', () => {
        const obs = [
          makeObs({ severity: 'blocker', domain: 'boq-procurement', status: 'new' }),
          makeObs({ severity: 'blocker', domain: 'boq-procurement', status: 'resolved' }),
          makeObs({ severity: 'major', domain: 'boq-procurement', status: 'new' }),
        ];
        expect(getUnresolvedBlockers(obs)).toHaveLength(1);
      });
    });

    describe('countBySeverity', () => {
      it('counts correctly', () => {
        const obs = [
          makeObs({ severity: 'blocker', domain: 'boq-procurement' }),
          makeObs({ severity: 'blocker', domain: 'geometry-generation' }),
          makeObs({ severity: 'major', domain: 'boq-procurement' }),
          makeObs({ severity: 'observation', domain: 'boq-procurement' }),
        ];
        const counts = countBySeverity(obs);
        expect(counts.blocker).toBe(2);
        expect(counts.major).toBe(1);
        expect(counts.minor).toBe(0);
        expect(counts.observation).toBe(1);
        expect(counts.enhancement).toBe(0);
      });
    });

    describe('countByDomain', () => {
      it('counts correctly', () => {
        const obs = [
          makeObs({ severity: 'minor', domain: 'geometry-generation' }),
          makeObs({ severity: 'minor', domain: 'geometry-generation' }),
          makeObs({ severity: 'minor', domain: 'drawings-package' }),
        ];
        const counts = countByDomain(obs);
        expect(counts['geometry-generation']).toBe(2);
        expect(counts['drawings-package']).toBe(1);
        expect(counts['boq-procurement']).toBe(0);
      });
    });

    describe('countByStatus', () => {
      it('counts correctly', () => {
        const obs = [
          makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'new' }),
          makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'new' }),
          makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved' }),
        ];
        const counts = countByStatus(obs);
        expect(counts['new']).toBe(2);
        expect(counts['resolved']).toBe(1);
        expect(counts['under-review']).toBe(0);
      });
    });

    describe('getDomainConcentration', () => {
      it('returns sorted concentration data', () => {
        const obs = [
          makeObs({ severity: 'minor', domain: 'geometry-generation' }),
          makeObs({ severity: 'minor', domain: 'geometry-generation' }),
          makeObs({ severity: 'minor', domain: 'drawings-package' }),
        ];
        const conc = getDomainConcentration(obs);
        expect(conc[0].domain).toBe('geometry-generation');
        expect(conc[0].count).toBe(2);
        expect(conc[0].pct).toBe(67);
        expect(conc[1].domain).toBe('drawings-package');
        expect(conc[1].count).toBe(1);
        expect(conc[1].pct).toBe(33);
      });

      it('returns empty for no observations', () => {
        expect(getDomainConcentration([])).toEqual([]);
      });
    });

    describe('getOpenVsResolvedCount', () => {
      it('calculates open vs resolved', () => {
        const obs = [
          makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'new' }),
          makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'under-review' }),
          makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved' }),
          makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'accepted-limitation' }),
          makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'deferred' }),
        ];
        const result = getOpenVsResolvedCount(obs);
        expect(result.open).toBe(3);
        expect(result.resolved).toBe(2);
        expect(result.total).toBe(5);
      });
    });
  });

  describe('Review Summary Logic', () => {
    describe('computeCloseoutRecommendation', () => {
      it('recommends continue when no observations', () => {
        const rec = computeCloseoutRecommendation(0, 0, { open: 0, resolved: 0, total: 0 }, { blocker: 0, major: 0, minor: 0, observation: 0, enhancement: 0 });
        expect(rec.recommendation).toBe('continue');
      });

      it('recommends pause when unresolved blockers exist', () => {
        const rec = computeCloseoutRecommendation(5, 2, { open: 3, resolved: 2, total: 5 }, { blocker: 2, major: 1, minor: 1, observation: 1, enhancement: 0 });
        expect(rec.recommendation).toBe('pause');
      });

      it('recommends pause when major issues remain open', () => {
        const rec = computeCloseoutRecommendation(5, 0, { open: 4, resolved: 1, total: 5 }, { blocker: 0, major: 2, minor: 1, observation: 1, enhancement: 1 });
        expect(rec.recommendation).toBe('pause');
      });

      it('recommends close-resolved when all items resolved', () => {
        const rec = computeCloseoutRecommendation(3, 0, { open: 0, resolved: 3, total: 3 }, { blocker: 0, major: 0, minor: 1, observation: 1, enhancement: 1 });
        expect(rec.recommendation).toBe('close-resolved');
      });

      it('recommends close-with-followups when most resolved with minors remaining', () => {
        const rec = computeCloseoutRecommendation(5, 0, { open: 2, resolved: 3, total: 5 }, { blocker: 0, major: 0, minor: 1, observation: 1, enhancement: 1 });
        expect(rec.recommendation).toBe('close-with-followups');
      });

      it('recommends pause when major issues remain open', () => {
        const rec = computeCloseoutRecommendation(5, 0, { open: 3, resolved: 2, total: 5 }, { blocker: 0, major: 2, minor: 1, observation: 2, enhancement: 0 });
        expect(rec.recommendation).toBe('pause');
      });

      it('recommends pause when major items are unresolved', () => {
        const rec = computeCloseoutRecommendation(3, 0, { open: 3, resolved: 0, total: 3 }, { blocker: 0, major: 1, minor: 1, observation: 1, enhancement: 0 });
        expect(rec.recommendation).toBe('pause');
      });
    });

    describe('generatePilotReviewSummary', () => {
      it('generates a complete summary', () => {
        const session = makeSession();
        const obs = [
          makeObs({ severity: 'blocker', domain: 'geometry-generation', status: 'new' }),
          makeObs({ severity: 'major', domain: 'drawings-package', status: 'under-review' }),
          makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved' }),
          makeObs({ severity: 'observation', domain: 'delivery-lifecycle', status: 'accepted-limitation' }),
          makeObs({ severity: 'enhancement', domain: 'validation-reporting', status: 'deferred' }),
        ];
        const summary = generatePilotReviewSummary(session, obs);
        expect(summary.sessionId).toBe('test-session');
        expect(summary.totalObservations).toBe(5);
        expect(summary.bySeverity.blocker).toBe(1);
        expect(summary.bySeverity.major).toBe(1);
        expect(summary.bySeverity.minor).toBe(1);
        expect(summary.bySeverity.observation).toBe(1);
        expect(summary.bySeverity.enhancement).toBe(1);
        expect(summary.unresolvedBlockers).toHaveLength(1);
        expect(summary.hasUnresolvedBlockers).toBe(true);
        expect(summary.openVsResolved.open).toBe(3);
        expect(summary.openVsResolved.resolved).toBe(2);
        expect(summary.openVsResolved.total).toBe(5);
        expect(summary.resolutionRate).toBe(40);
        expect(summary.recommendation).toBeDefined();
        expect(summary.recommendationReason).toBeDefined();
      });

      it('handles empty observations', () => {
        const session = makeSession();
        const summary = generatePilotReviewSummary(session, []);
        expect(summary.totalObservations).toBe(0);
        expect(summary.resolutionRate).toBe(0);
        expect(summary.hasUnresolvedBlockers).toBe(false);
      });

      it('all observations resolved gives close-resolved', () => {
        const session = makeSession();
        const obs = [
          makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved' }),
          makeObs({ severity: 'observation', domain: 'boq-procurement', status: 'accepted-limitation' }),
        ];
        const summary = generatePilotReviewSummary(session, obs);
        expect(summary.recommendation).toBe('close-resolved');
        expect(summary.resolutionRate).toBe(100);
      });
    });

    describe('formatReviewSummaryText', () => {
      it('produces readable text', () => {
        const session = makeSession();
        const obs = [makeObs({ severity: 'blocker', domain: 'boq-procurement', status: 'new' })];
        const summary = generatePilotReviewSummary(session, obs);
        const text = formatReviewSummaryText(summary);
        expect(text).toContain('Pilot Review Summary');
        expect(text).toContain('Total Observations: 1');
        expect(text).toContain('blocker: 1');
        expect(text).toContain('Recommendation:');
      });
    });
  });

  describe('Export / Report Composition', () => {
    const session = makeSession();
    const observations = [
      makeObs({ severity: 'blocker', domain: 'geometry-generation', status: 'new', title: 'Wall alignment off', description: 'Walls misaligned at node 47' }),
      makeObs({ severity: 'major', domain: 'drawings-package', status: 'under-review', title: 'Missing elevation callouts', description: 'Section cuts not labeled' }),
      makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved', title: 'Unit cost off', description: 'Concrete rate 5% below market' }),
    ];

    describe('formatPilotIssueLogHtml', () => {
      it('generates valid HTML', () => {
        const html = formatPilotIssueLogHtml(session, observations);
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('Pilot Issue Log');
        expect(html).toContain('Wall alignment off');
        expect(html).toContain('Missing elevation callouts');
        expect(html).toContain('Unit cost off');
        expect(html).toContain('Arial,Helvetica,sans-serif');
      });
    });

    describe('formatPilotSummaryReportHtml', () => {
      it('generates valid HTML summary', () => {
        const summary = generatePilotReviewSummary(session, observations);
        const html = formatPilotSummaryReportHtml(summary);
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('Pilot Review Summary');
        expect(html).toContain('pause');
        expect(html).toContain('Geometry');
        expect(html).toContain('Blocker');
      });
    });

    describe('formatOpenBlockerReportHtml', () => {
      it('reports unresolved blockers', () => {
        const html = formatOpenBlockerReportHtml(observations);
        expect(html).toContain('Open Blockers Report');
        expect(html).toContain('1 unresolved blocker(s)');
        expect(html).toContain('Wall alignment off');
      });

      it('shows clear when no blockers', () => {
        const resolved = observations.map(o => ({ ...o, status: 'resolved' as PilotStatus }));
        const html = formatOpenBlockerReportHtml(resolved);
        expect(html).toContain('No unresolved blockers');
      });
    });

    describe('formatCloseoutRecommendationHtml', () => {
      it('generates closeout HTML', () => {
        const summary = generatePilotReviewSummary(session, observations);
        const html = formatCloseoutRecommendationHtml(session, summary);
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('Pilot Closeout Recommendation');
        expect(html).toContain('test-project');
        expect(html).toContain('blocker');
      });
    });

    describe('formatPilotIssueLogJson', () => {
      it('generates valid JSON', () => {
        const json = formatPilotIssueLogJson(session, observations);
        const parsed = JSON.parse(json);
        expect(parsed.session.id).toBe('test-session');
        expect(parsed.observations).toHaveLength(3);
        expect(parsed.exportedAt).toBeDefined();
      });
    });

    describe('formatPilotSummaryText', () => {
      it('generates readable text summary', () => {
        const summary = generatePilotReviewSummary(session, observations);
        const text = formatPilotSummaryText(summary);
        expect(text).toContain('Pilot Review Summary');
        expect(text).toContain('Total Observations: 3');
        expect(text).toContain('Blocker: 1');
      });
    });
  });

  describe('Regression Protection for Existing Validation/Evaluation', () => {
    it('existing severity order is preserved', () => {
      expect(SEVERITY_ORDER[0]).toBe('blocker');
      expect(SEVERITY_ORDER[4]).toBe('enhancement');
    });

    it('all domain labels are non-empty', () => {
      for (const label of Object.values(DOMAIN_LABELS)) {
        expect(label.length).toBeGreaterThan(0);
      }
    });

    it('all status labels are non-empty', () => {
      for (const label of Object.values(STATUS_LABELS)) {
        expect(label.length).toBeGreaterThan(0);
      }
    });

    it('observation domain list matches expected impact areas', () => {
      const domains = Object.keys(DOMAIN_LABELS);
      expect(domains).toContain('geometry-generation');
      expect(domains).toContain('drawings-package');
      expect(domains).toContain('boq-procurement');
      expect(domains).toContain('delivery-lifecycle');
      expect(domains).toContain('validation-reporting');
      expect(domains).toContain('deployment-evaluation-ux');
    });

    it('unresolved statuses are correct subset of all statuses', () => {
      const allStatuses: PilotStatus[] = ['new', 'under-review', 'action-planned', 'resolved', 'accepted-limitation', 'deferred'];
      const unresolved: PilotStatus[] = ['new', 'under-review', 'action-planned'];
      for (const s of allStatuses) {
        expect(isUnresolved(s)).toBe(unresolved.includes(s));
      }
    });

    it('blocker detection does not interfere with validation classifications', () => {
      const blocker = makeObs({ severity: 'blocker', domain: 'boq-procurement', status: 'new' });
      const resolvedBlocker = makeObs({ severity: 'blocker', domain: 'boq-procurement', status: 'resolved' });
      expect(isBlocking(blocker)).toBe(true);
      expect(isBlocking(resolvedBlocker)).toBe(false);
    });

    it('empty observations return zero counts', () => {
      expect(countBySeverity([]).blocker).toBe(0);
      expect(countByDomain([])['boq-procurement']).toBe(0);
      expect(countByStatus([])['new']).toBe(0);
      expect(getDomainConcentration([])).toEqual([]);
    });
  });
});

describe('P28 — Pilot Readiness Integration & Multi-Session Trends', () => {
  describe('Model Enhancements', () => {
    it('observation includes tags, recurringIssueKey, attachments fields', () => {
      const obs = makeObs({ severity: 'minor', domain: 'boq-procurement', tags: ['ui', 'regression'], recurringIssueKey: 'GEO-007' });
      expect(obs.tags).toEqual(['ui', 'regression']);
      expect(obs.recurringIssueKey).toBe('GEO-007');
      expect(obs.attachments).toEqual([]);
    });

    it('session includes readinessContext field', () => {
      const session = makeSession({ readinessContext: { tier: 'supervised-professional', tierLabel: 'Supervised Professional', tierDescription: '', benchmarkScore: 75, totalBenchmarks: 40, passedBenchmarks: 30, failedBenchmarks: 10, validationFailures: 2, validationWarnings: 3, openWeaknesses: 1, regressionsDetected: 0, readinessReason: 'Mostly ready', readinessBlockers: [], readinessWarnings: ['UI polish needed'], evaluationRef: 'eval-001' } });
      expect(session.readinessContext).not.toBeNull();
      expect(session.readinessContext!.tier).toBe('supervised-professional');
      expect(session.readinessContext!.benchmarkScore).toBe(75);
    });
  });

  describe('buildSessionSnapshot', () => {
    it('builds correct snapshot for a session with observations', () => {
      const session = makeSession({ id: 's1', name: 'Round 1' });
      const obs = [
        makeObs({ severity: 'blocker', domain: 'geometry-generation', status: 'new', sessionId: 's1' }),
        makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved', sessionId: 's1' }),
      ];
      const snapshot = buildSessionSnapshot(session, obs);
      expect(snapshot.sessionId).toBe('s1');
      expect(snapshot.totalObservations).toBe(2);
      expect(snapshot.blockerCount).toBe(1);
      expect(snapshot.resolutionRate).toBe(50);
    });

    it('handles empty observations', () => {
      const session = makeSession({ id: 's2' });
      const snapshot = buildSessionSnapshot(session, []);
      expect(snapshot.totalObservations).toBe(0);
      expect(snapshot.blockerCount).toBe(0);
      expect(snapshot.resolutionRate).toBe(0);
    });

    it('captures readiness tier from session context', () => {
      const session = makeSession({ id: 's3', readinessContext: { tier: 'pilot-deployment', tierLabel: '', tierDescription: '', benchmarkScore: 90, totalBenchmarks: 40, passedBenchmarks: 36, failedBenchmarks: 4, validationFailures: 0, validationWarnings: 1, openWeaknesses: 0, regressionsDetected: 0, readinessReason: '', readinessBlockers: [], readinessWarnings: [], evaluationRef: 'e-1' } });
      const snapshot = buildSessionSnapshot(session, []);
      expect(snapshot.readinessTier).toBe('pilot-deployment');
      expect(snapshot.readinessScore).toBe(90);
    });
  });

  describe('buildTrendData', () => {
    const s1 = makeSession({ id: 's1', name: 'Round 1', startDate: '2026-07-01T00:00:00.000Z' });
    const s2 = makeSession({ id: 's2', name: 'Round 2', startDate: '2026-07-15T00:00:00.000Z' });
    const obs1 = [
      makeObs({ severity: 'blocker', domain: 'geometry-generation', status: 'new', sessionId: 's1', recurringIssueKey: 'GEO-001' }),
      makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved', sessionId: 's1' }),
    ];
    const obs2 = [
      makeObs({ severity: 'blocker', domain: 'geometry-generation', status: 'new', sessionId: 's2', recurringIssueKey: 'GEO-001' }),
      makeObs({ severity: 'major', domain: 'drawings-package', status: 'resolved', sessionId: 's2' }),
      makeObs({ severity: 'observation', domain: 'delivery-lifecycle', status: 'resolved', sessionId: 's2' }),
      makeObs({ severity: 'major', domain: 'geometry-generation', status: 'new', sessionId: 's2' }),
    ];

    it('aggregates trends across sessions', () => {
      const trend = buildTrendData([s1, s2], [...obs1, ...obs2]);
      expect(trend.sessionCount).toBe(2);
      expect(trend.totalObservations).toBe(6);
      expect(trend.recurringIssues).toHaveLength(1);
      expect(trend.recurringIssues[0].key).toBe('GEO-001');
      expect(trend.recurringIssues[0].totalOccurrences).toBe(2);
    });

    it('builds blocker trend in session order', () => {
      const trend = buildTrendData([s1, s2], [...obs1, ...obs2]);
      expect(trend.blockerTrend).toHaveLength(2);
      expect(trend.blockerTrend[0].count).toBe(1);
      expect(trend.blockerTrend[1].count).toBe(1);
      expect(trend.blockerTrend[0].session).toBe('Round 1');
      expect(trend.blockerTrend[1].session).toBe('Round 2');
    });

    it('builds resolution trend', () => {
      const trend = buildTrendData([s1, s2], [...obs1, ...obs2]);
      expect(trend.resolutionTrend).toHaveLength(2);
      expect(trend.resolutionTrend[0].rate).toBe(50);
      expect(trend.resolutionTrend[1].rate).toBe(50);
    });

    it('handles single session', () => {
      const trend = buildTrendData([s1], obs1);
      expect(trend.sessionCount).toBe(1);
      expect(trend.blockerTrend).toHaveLength(1);
      expect(trend.recurringIssues).toHaveLength(1);
    });

    it('handles empty sessions', () => {
      const trend = buildTrendData([], []);
      expect(trend.sessionCount).toBe(0);
      expect(trend.totalObservations).toBe(0);
    });
  });

  describe('computeTrendAssessment', () => {
    it('positive when resolution improving and blockers decreasing', () => {
      const assessment = computeTrendAssessment(
        [{ session: 'A', count: 3, date: '' }, { session: 'B', count: 0, date: '' }],
        [{ session: 'A', rate: 30, date: '' }, { session: 'B', rate: 80, date: '' }],
        [],
        2
      );
      expect(assessment).toMatch(/improving|positive/i);
    });

    it('concerning when blockers persist', () => {
      const assessment = computeTrendAssessment(
        [{ session: 'A', count: 2, date: '' }, { session: 'B', count: 2, date: '' }, { session: 'C', count: 3, date: '' }],
        [{ session: 'A', rate: 50, date: '' }, { session: 'B', rate: 40, date: '' }, { session: 'C', rate: 30, date: '' }],
        [],
        3
      );
      expect(assessment).toMatch(/concerning|attention|declining/i);
    });

    it('neutral for single session', () => {
      const assessment = computeTrendAssessment(
        [{ session: 'A', count: 0, date: '' }],
        [{ session: 'A', rate: 60, date: '' }],
        [],
        1
      );
      expect(assessment).toMatch(/single session/i);
    });

    it('positive with zero blockers across all sessions', () => {
      const assessment = computeTrendAssessment(
        [{ session: 'A', count: 0, date: '' }, { session: 'B', count: 0, date: '' }],
        [{ session: 'A', rate: 50, date: '' }, { session: 'B', rate: 75, date: '' }],
        [],
        2
      );
      expect(assessment).toMatch(/improving|positive/i);
    });
  });

  describe('Enhanced Closeout with Trend Awareness', () => {
    it('trend-aware closeout: positive trend enhances close-resolved recommendation', () => {
      const trendData: TrendData = {
        sessionCount: 2,
        totalObservations: 6,
        blockerTrend: [{ session: 'A', count: 0, date: '' }, { session: 'B', count: 0, date: '' }],
        majorTrend: [],
        resolutionTrend: [{ session: 'A', rate: 50, date: '' }, { session: 'B', rate: 100, date: '' }],
        readinessTrend: [],
        domainRecurrence: [],
        recurringIssues: [],
        overallAssessment: 'positive trend — resolution improving',
      };
      const rec = computeCloseoutRecommendation(
        3, 0, { open: 0, resolved: 3, total: 3 },
        { blocker: 0, major: 0, minor: 1, observation: 1, enhancement: 1 },
        'supervised-professional',
        trendData
      );
      expect(rec.recommendation).toBe('close-resolved');
      expect(rec.reason).toContain('strong readiness');
    });

    it('trend-aware closeout: persistent blockers trigger pause', () => {
      const trendData: TrendData = {
        sessionCount: 2,
        totalObservations: 6,
        blockerTrend: [{ session: 'A', count: 2, date: '' }, { session: 'B', count: 2, date: '' }],
        majorTrend: [],
        resolutionTrend: [{ session: 'A', rate: 50, date: '' }, { session: 'B', rate: 60, date: '' }],
        readinessTrend: [],
        domainRecurrence: [],
        recurringIssues: [],
        overallAssessment: 'Concerning — blockers persistent',
      };
      const rec = computeCloseoutRecommendation(
        3, 0, { open: 1, resolved: 2, total: 3 },
        { blocker: 0, major: 0, minor: 1, observation: 1, enhancement: 1 },
        null,
        trendData
      );
      expect(rec.recommendation).toBe('pause');
      expect(rec.reason).toContain('persistent');
    });

    it('trend-aware closeout: declining resolution rate triggers pause', () => {
      const trendData: TrendData = {
        sessionCount: 2,
        totalObservations: 6,
        blockerTrend: [{ session: 'A', count: 0, date: '' }, { session: 'B', count: 0, date: '' }],
        majorTrend: [],
        resolutionTrend: [{ session: 'A', rate: 80, date: '' }, { session: 'B', rate: 30, date: '' }],
        readinessTrend: [],
        domainRecurrence: [],
        recurringIssues: [],
        overallAssessment: 'Concerning — resolution declining',
      };
      const rec = computeCloseoutRecommendation(
        3, 0, { open: 2, resolved: 1, total: 3 },
        { blocker: 0, major: 0, minor: 1, observation: 1, enhancement: 1 },
        null,
        trendData
      );
      expect(rec.recommendation).toBe('pause');
      expect(rec.reason).toContain('declining');
    });

    it('no trend data still works with original logic', () => {
      const rec = computeCloseoutRecommendation(
        3, 0, { open: 0, resolved: 3, total: 3 },
        { blocker: 0, major: 0, minor: 1, observation: 1, enhancement: 1 }
      );
      expect(rec.recommendation).toBe('close-resolved');
    });
  });

  describe('Multi-Session Export Formats', () => {
    const s1 = makeSession({ id: 's1', name: 'Round 1', startDate: '2026-07-01T00:00:00.000Z' });
    const s2 = makeSession({ id: 's2', name: 'Round 2', startDate: '2026-07-15T00:00:00.000Z' });
    const obs1 = [
      makeObs({ severity: 'blocker', domain: 'geometry-generation', status: 'new', sessionId: 's1', title: 'Wall offset error' }),
      makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved', sessionId: 's1', title: 'Unit cost off' }),
    ];
    const obs2 = [
      makeObs({ severity: 'blocker', domain: 'geometry-generation', status: 'new', sessionId: 's2', title: 'Wall offset error (recurring)' }),
      makeObs({ severity: 'major', domain: 'drawings-package', status: 'resolved', sessionId: 's2', title: 'Missing elevation callouts' }),
      makeObs({ severity: 'observation', domain: 'delivery-lifecycle', status: 'resolved', sessionId: 's2', title: 'Process note' }),
    ];
    const allObs = [...obs1, ...obs2];

    describe('formatMultiSessionSummaryHtml', () => {
      it('generates HTML with all sessions', () => {
        const html = formatMultiSessionSummaryHtml([s1, s2], allObs);
        expect(html).toContain('Multi-Session Pilot Summary');
        expect(html).toContain('Round 1');
        expect(html).toContain('Round 2');
      });
    });

    describe('formatTrendReportHtml', () => {
      it('generates trend report HTML', () => {
        const html = formatTrendReportHtml([s1, s2], allObs);
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('Pilot Trend Report');
        expect(html).toContain('Round 1');
        expect(html).toContain('Round 2');
      });
    });

    describe('formatSessionComparisonHtml', () => {
      it('generates session comparison HTML', () => {
        const html = formatSessionComparisonHtml([s1, s2], allObs);
        expect(html).toContain('Session Comparison');
        expect(html).toContain('Round 1');
        expect(html).toContain('Round 2');
      });
    });

    describe('formatTrendReportText', () => {
      it('generates text trend report', () => {
        const text = formatTrendReportText([s1, s2], allObs);
        expect(text).toContain('Pilot Trend Report');
        expect(text).toContain('Round 1');
        expect(text).toContain('Round 2');
      });
    });

    describe('formatMultiSessionSummaryText', () => {
      it('generates text multi-session summary', () => {
        const text = formatMultiSessionSummaryText([s1, s2], allObs);
        expect(text).toContain('Multi-Session Pilot Summary');
        expect(text).toContain('Round 1');
        expect(text).toContain('Round 2');
      });
    });
  });

  describe('Readiness Context in Review Summary', () => {
    it('generatePilotReviewSummary includes readinessContext and trendContext', () => {
      const s1 = makeSession({ id: 's1', readinessContext: { tier: 'supervised-professional', tierLabel: 'Supervised Professional', tierDescription: '', benchmarkScore: 75, totalBenchmarks: 40, passedBenchmarks: 30, failedBenchmarks: 10, validationFailures: 2, validationWarnings: 3, openWeaknesses: 1, regressionsDetected: 0, readinessReason: 'Mostly ready', readinessBlockers: [], readinessWarnings: ['UI polish needed'], evaluationRef: 'eval-001' } });
      const s2 = makeSession({ id: 's2', name: 'Round 2' });
      const obs = [makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved', sessionId: 's1' })];
      const summary = generatePilotReviewSummary(s1, obs, [s1, s2], obs);
      expect(summary.readinessContext).not.toBeNull();
      expect(summary.readinessContext!.tier).toBe('supervised-professional');
      expect(summary.readinessContext!.score).toBe(75);
      expect(summary.trendContext).not.toBeNull();
    });

    it('readinessContext is null when session has no readiness data', () => {
      const session = makeSession();
      const obs = [makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved' })];
      const summary = generatePilotReviewSummary(session, obs);
      expect(summary.readinessContext).toBeNull();
      expect(summary.trendContext).toBeNull();
    });
  });

  describe('formatTrendDataHtml', () => {
    it('generates HTML trend data output', () => {
      const s1 = makeSession({ id: 's1', name: 'Round 1' });
      const s2 = makeSession({ id: 's2', name: 'Round 2' });
      const obs = [
        makeObs({ severity: 'blocker', domain: 'geometry-generation', status: 'new', sessionId: 's1' }),
        makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved', sessionId: 's1' }),
        makeObs({ severity: 'blocker', domain: 'geometry-generation', status: 'new', sessionId: 's2' }),
        makeObs({ severity: 'major', domain: 'drawings-package', status: 'resolved', sessionId: 's2' }),
      ];
      const trend = buildTrendData([s1, s2], obs);
      const html = formatTrendDataHtml(trend);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Pilot Trend Report');
      expect(html).toContain('Round 1');
      expect(html).toContain('Round 2');
      expect(html).toContain('Arial,Helvetica,sans-serif');
    });
  });

  describe('formatTrendDataText', () => {
    it('generates text trend data output', () => {
      const s1 = makeSession({ id: 's1', name: 'Round 1' });
      const obs = [makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved', sessionId: 's1' })];
      const trend = buildTrendData([s1], obs);
      const text = formatTrendDataText(trend);
      expect(text).toContain('Pilot Trend Report');
      expect(text).toContain('Round 1');
    });
  });

  describe('Trend-Aware generatePilotReviewSummary', () => {
    it('includes recurringIssueKeys in summary', () => {
      const session = makeSession();
      const obs = [
        makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved', recurringIssueKey: 'GEO-001' }),
        makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved', recurringIssueKey: 'GEO-001' }),
      ];
      const summary = generatePilotReviewSummary(session, obs);
      expect(summary.recurringIssueKeys).toContain('GEO-001');
    });

    it('recurringIssueKeys is empty when no recurring issues', () => {
      const session = makeSession();
      const obs = [makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved' })];
      const summary = generatePilotReviewSummary(session, obs);
      expect(summary.recurringIssueKeys).toEqual([]);
    });
  });

  describe('formatReviewSummaryText with new fields', () => {
    it('includes readinessContext and trendContext in text output', () => {
      const s1 = makeSession({ id: 's1', readinessContext: { tier: 'pilot-deployment', tierLabel: '', tierDescription: '', benchmarkScore: 90, totalBenchmarks: 40, passedBenchmarks: 36, failedBenchmarks: 4, validationFailures: 0, validationWarnings: 0, openWeaknesses: 0, regressionsDetected: 0, readinessReason: '', readinessBlockers: [], readinessWarnings: [], evaluationRef: 'e-1' } });
      const s2 = makeSession({ id: 's2', name: 'Round 2' });
      const obs = [
        makeObs({ severity: 'minor', domain: 'boq-procurement', status: 'resolved', recurringIssueKey: 'GEO-001', sessionId: 's1' }),
      ];
      const summary = generatePilotReviewSummary(s1, obs, [s1, s2], obs);
      const text = formatReviewSummaryText(summary);
      expect(text).toContain('Readiness Tier');
      expect(text).toContain('pilot-deployment');
      expect(text).toContain('90%');
      expect(text).toContain('Recurring Issues');
      expect(text).toContain('GEO-001');
      expect(text).toContain('Trend Context');
    });
  });
});
