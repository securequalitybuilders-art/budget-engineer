import { describe, it, expect } from 'vitest';
import {
  getBenchmarks, calibrateAgainst, getKnownWeaknesses,
  generateValidationReport, generateValidationReportHtml,
  classifyValidationResults, getBlockerSummary, formatValidationResultsHtml,
} from '@/lib/validation/validationEngine';
import type { ValidationResult, ValidationReport, ValidationDomain, KnownWeakness } from '@/lib/validation/validationEngine';
import { assessPilotReadiness, getPilotReadinessSummaryHtml } from '@/lib/validation/pilotReadinessEvaluator';
import {
  annotateMetric, annotateScorecard, annotateBenchmarks, formatTransparencyHtml,
} from '@/lib/validation/calibrationTransparency';

function makeValidationResult(overrides: Partial<ValidationResult> & { domain: ValidationDomain; status: 'pass' | 'warning' | 'fail' | 'not-applicable' }): ValidationResult {
  return {
    domain: overrides.domain,
    status: overrides.status,
    reason: overrides.reason ?? 'Test validation check',
    details: overrides.details ?? [],
    requiresHumanReview: overrides.requiresHumanReview ?? false,
    humanReviewNote: overrides.humanReviewNote,
  };
}

function makeReport(overrides: Partial<ValidationReport>): ValidationReport {
  return {
    id: 'test-report',
    runAt: '2026-07-19T12:00:00.000Z',
    totalBenchmarks: overrides.totalBenchmarks ?? 0,
    passed: overrides.passed ?? 0,
    marginal: overrides.marginal ?? 0,
    failed: overrides.failed ?? 0,
    notRated: overrides.notRated ?? 0,
    overallScore: overrides.overallScore ?? 100,
    scorecards: overrides.scorecards ?? [],
    regressionRecords: overrides.regressionRecords ?? [],
    weaknesses: overrides.weaknesses ?? [],
    summary: overrides.summary ?? 'Test report summary.',
    validationResults: overrides.validationResults ?? [],
  };
}

describe('P24 — Validation & Pilot Calibration', () => {
  describe('classifyValidationResults', () => {
    it('classifies empty results', () => {
      const c = classifyValidationResults([]);
      expect(c.passes).toHaveLength(0);
      expect(c.warnings).toHaveLength(0);
      expect(c.failures).toHaveLength(0);
      expect(c.notApplicable).toHaveLength(0);
      expect(c.requiresHumanReview).toHaveLength(0);
    });

    it('classifies pass results', () => {
      const results = [
        makeValidationResult({ domain: 'geometry-validity', status: 'pass' }),
        makeValidationResult({ domain: 'package-completeness', status: 'pass' }),
      ];
      const c = classifyValidationResults(results);
      expect(c.passes).toHaveLength(2);
      expect(c.failures).toHaveLength(0);
    });

    it('classifies mixed results', () => {
      const results = [
        makeValidationResult({ domain: 'geometry-validity', status: 'pass' }),
        makeValidationResult({ domain: 'boq-procurement-linkage-integrity', status: 'warning', reason: 'BOQ values may shift' }),
        makeValidationResult({ domain: 'drawing-documentation-completeness', status: 'fail', reason: 'Missing section drawings' }),
        makeValidationResult({ domain: 'human-review-required', status: 'not-applicable' }),
      ];
      const c = classifyValidationResults(results);
      expect(c.passes).toHaveLength(1);
      expect(c.warnings).toHaveLength(1);
      expect(c.failures).toHaveLength(1);
      expect(c.notApplicable).toHaveLength(1);
    });

    it('identifies human review requirements', () => {
      const results = [
        makeValidationResult({ domain: 'human-review-required', status: 'warning', requiresHumanReview: true, humanReviewNote: 'Structural calcs need PE signoff' }),
        makeValidationResult({ domain: 'geometry-validity', status: 'pass' }),
      ];
      const c = classifyValidationResults(results);
      expect(c.requiresHumanReview).toHaveLength(1);
      expect(c.requiresHumanReview[0].humanReviewNote).toBe('Structural calcs need PE signoff');
    });
  });

  describe('getBlockerSummary', () => {
    it('extracts blockers from failures', () => {
      const results = [
        makeValidationResult({ domain: 'geometry-validity', status: 'fail', reason: 'Invalid wall intersections' }),
        makeValidationResult({ domain: 'package-completeness', status: 'fail', reason: 'Missing structural sheets' }),
      ];
      const s = getBlockerSummary(results);
      expect(s.blockers).toHaveLength(2);
      expect(s.blockers[0]).toContain('geometry-validity');
      expect(s.blockers[1]).toContain('package-completeness');
    });

    it('extracts warnings', () => {
      const results = [
        makeValidationResult({ domain: 'export-import-integrity', status: 'warning', reason: 'DXF version mismatch' }),
      ];
      const s = getBlockerSummary(results);
      expect(s.warningsList).toHaveLength(1);
      expect(s.warningsList[0]).toContain('export-import-integrity');
    });

    it('extracts review requirements', () => {
      const results = [
        makeValidationResult({ domain: 'human-review-required', status: 'pass', requiresHumanReview: true, humanReviewNote: 'Fire safety review needed' }),
      ];
      const s = getBlockerSummary(results);
      expect(s.reviewRequired).toHaveLength(1);
      expect(s.reviewRequired[0]).toContain('Fire safety review needed');
    });

    it('returns empty arrays when no issues', () => {
      const results = [
        makeValidationResult({ domain: 'geometry-validity', status: 'pass' }),
      ];
      const s = getBlockerSummary(results);
      expect(s.blockers).toHaveLength(0);
      expect(s.warningsList).toHaveLength(0);
      expect(s.reviewRequired).toHaveLength(0);
    });
  });

  describe('formatValidationResultsHtml', () => {
    it('produces HTML with pass count', () => {
      const results = [
        makeValidationResult({ domain: 'geometry-validity', status: 'pass' }),
      ];
      const html = formatValidationResultsHtml(results);
      expect(html).toContain('Validation Results');
      expect(html).toContain('1');
    });

    it('shows blockers section for failures', () => {
      const results = [
        makeValidationResult({ domain: 'drawing-documentation-completeness', status: 'fail', reason: 'Missing sections' }),
      ];
      const html = formatValidationResultsHtml(results);
      expect(html).toContain('Blockers');
      expect(html).toContain('Missing sections');
    });

    it('shows human review section', () => {
      const results = [
        makeValidationResult({ domain: 'human-review-required', status: 'warning', requiresHumanReview: true, humanReviewNote: 'PE review needed' }),
      ];
      const html = formatValidationResultsHtml(results);
      expect(html).toContain('Human Review Required');
      expect(html).toContain('PE review needed');
    });
  });

  describe('assessPilotReadiness', () => {
    it('returns blocked when benchmarks fail', () => {
      const report = makeReport({
        totalBenchmarks: 5,
        passed: 3,
        failed: 2,
        overallScore: 60,
        validationResults: [],
        weaknesses: getKnownWeaknesses(),
      });
      const p = assessPilotReadiness(report);
      expect(p.tier).toBe('blocked');
      expect(p.canProceedToPilot).toBe(false);
    });

    it('returns blocked when validation results fail', () => {
      const report = makeReport({
        totalBenchmarks: 5,
        passed: 5,
        failed: 0,
        overallScore: 85,
        validationResults: [
          makeValidationResult({ domain: 'geometry-validity', status: 'fail', reason: 'Critical geometry error' }),
        ],
        weaknesses: [],
      });
      const p = assessPilotReadiness(report);
      expect(p.tier).toBe('blocked');
      expect(p.canProceedToPilot).toBe(false);
    });

    it('returns blocked when critical regression detected', () => {
      const report = makeReport({
        totalBenchmarks: 5,
        passed: 5,
        failed: 0,
        overallScore: 85,
        validationResults: [],
        regressionRecords: [{
          id: 'reg-1', feature: 'Plan Gen', benchmarkId: 'bm-plan-1',
          previousScore: 90, currentScore: 60, delta: -30,
          detectedAt: '2026-07-19', status: 'investigating', notes: 'Regression',
        }],
        weaknesses: [],
      });
      const p = assessPilotReadiness(report);
      expect(p.tier).toBe('blocked');
      expect(p.canProceedToPilot).toBe(false);
      expect(p.reason).toContain('regression');
    });

    it('returns blocked when very low score with many weaknesses', () => {
      const weaknesses: KnownWeakness[] = Array.from({ length: 5 }, (_, i) => ({
        id: `wk-${i}`, area: `Weakness ${i}`, description: '',
        impact: 'medium' as const, affectedCategories: ['plan' as const],
        mitigation: '', status: 'open' as const,
      }));
      const report = makeReport({
        totalBenchmarks: 5, passed: 3, failed: 0, overallScore: 50,
        validationResults: [], weaknesses,
      });
      const p = assessPilotReadiness(report);
      expect(p.tier).toBe('blocked');
    });

    it('returns supervised-professional when warnings or moderate score', () => {
      const report = makeReport({
        totalBenchmarks: 5, passed: 4, failed: 0, overallScore: 75,
        validationResults: [
          makeValidationResult({ domain: 'export-import-integrity', status: 'warning', reason: 'Format may differ' }),
          makeValidationResult({ domain: 'boq-procurement-linkage-integrity', status: 'warning', reason: 'Procurement link tentative' }),
          makeValidationResult({ domain: 'lifecycle-workflow-continuity', status: 'warning', reason: 'Workflow gap' }),
          makeValidationResult({ domain: 'package-completeness', status: 'warning', reason: 'Minor omission' }),
        ],
        weaknesses: [],
      });
      const p = assessPilotReadiness(report);
      expect(p.tier).toBe('supervised-professional');
      expect(p.canProceedToPilot).toBe(false);
    });

    it('returns supervised-professional when human review required', () => {
      const report = makeReport({
        totalBenchmarks: 5, passed: 5, failed: 0, overallScore: 85,
        validationResults: [
          makeValidationResult({ domain: 'human-review-required', status: 'pass', requiresHumanReview: true, humanReviewNote: 'Expert review needed' }),
        ],
        weaknesses: [],
      });
      const p = assessPilotReadiness(report);
      expect(p.tier).toBe('supervised-professional');
    });

    it('returns pilot-deployment when all conditions met', () => {
      const report = makeReport({
        totalBenchmarks: 10, passed: 9, failed: 0, overallScore: 88,
        validationResults: [
          makeValidationResult({ domain: 'geometry-validity', status: 'pass' }),
          makeValidationResult({ domain: 'package-completeness', status: 'pass' }),
        ],
        weaknesses: [{ id: 'wk-1', area: 'Minor issue', description: '', impact: 'low', affectedCategories: ['plan'], mitigation: '', status: 'mitigated' }],
        regressionRecords: [],
      });
      const p = assessPilotReadiness(report);
      expect(p.tier).toBe('pilot-deployment');
      expect(p.canProceedToPilot).toBe(true);
    });

    it('pilot report fields are populated', () => {
      const report = makeReport({
        totalBenchmarks: 10, passed: 8, failed: 0, overallScore: 85,
        validationResults: [],
        weaknesses: [],
      });
      const p = assessPilotReadiness(report);
      expect(p.benchmarkScore).toBe(85);
      expect(p.totalBenchmarks).toBe(10);
      expect(p.passedBenchmarks).toBe(8);
      expect(p.label).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.reason).toBeTruthy();
    });
  });

  describe('getPilotReadinessSummaryHtml', () => {
    it('generates HTML with tier badge', () => {
      const report = makeReport({ totalBenchmarks: 5, passed: 5, overallScore: 90, validationResults: [], weaknesses: [] });
      const p = assessPilotReadiness(report);
      const html = getPilotReadinessSummaryHtml(p);
      expect(html).toContain('Pilot Readiness Assessment');
      expect(html).toContain(p.label);
    });

    it('shows blockers when present', () => {
      const report = makeReport({
        totalBenchmarks: 5, passed: 3, failed: 2, overallScore: 55,
        validationResults: [makeValidationResult({ domain: 'geometry-validity', status: 'fail', reason: 'Geometry error' })],
        weaknesses: [],
      });
      const p = assessPilotReadiness(report);
      const html = getPilotReadinessSummaryHtml(p);
      expect(html).toContain('Blockers');
    });
  });

  describe('calibrationTransparency', () => {
    describe('annotateMetric', () => {
      it('labels heuristic metrics', () => {
        const metric = { name: 'loadEstimateKn', actual: 45, expected: 50, unit: 'kN', tolerancePct: 20, deviationPct: -10, acceptance: 'pass' as const };
        const a = annotateMetric(metric, 'bm-structural-1');
        expect(a.transparency).toBe('heuristic');
        expect(a.annotatedName).toContain('[HEURISTIC]');
      });

      it('labels assumed metrics', () => {
        const metric = { name: 'orientationScore', actual: 60, expected: 50, unit: 'pts', tolerancePct: 40, deviationPct: 20, acceptance: 'pass' as const };
        const a = annotateMetric(metric, 'bm-site-1');
        expect(a.transparency).toBe('assumed');
        expect(a.annotatedName).toContain('[ASSUMED]');
      });

      it('labels unverified metrics from reference-design benchmarks', () => {
        const metric = { name: 'csvContainsHeader', actual: 1, expected: 1, unit: 'flag', tolerancePct: 0, deviationPct: 0, acceptance: 'pass' as const };
        const a = annotateMetric(metric, 'bm-interior-1');
        expect(a.transparency).toBe('unverified');
        expect(a.annotatedName).toContain('[UNVERIFIED]');
      });

      it('leaves verified metrics as verified', () => {
        const metric = { name: 'verifiedMetric', actual: 100, expected: 100, unit: 'm2', tolerancePct: 10, deviationPct: 0, acceptance: 'pass' as const };
        const a = annotateMetric(metric, 'some-other-benchmark');
        expect(a.transparency).toBe('verified');
      });
    });

    describe('annotateScorecard', () => {
      it('annotates all metrics in a scorecard', () => {
        const scorecard = calibrateAgainst('bm-structural-1',
          { slabThicknessMm: 180, loadEstimateKn: 45 },
          { slabThicknessMm: 180, loadEstimateKn: 50 },
          { slabThicknessMm: 15, loadEstimateKn: 20 },
        );
        const asc = annotateScorecard(scorecard);
        expect(asc.annotations).toHaveLength(2);
        expect(asc.overallTransparency).toBeDefined();
      });

      it('overall transparency reflects worst label', () => {
        const scorecard = calibrateAgainst('bm-interior-export',
          { csvContainsHeader: 1 },
          { csvContainsHeader: 1 },
          { csvContainsHeader: 0 },
        );
        const asc = annotateScorecard(scorecard);
        expect(asc.overallTransparency).toBe('unverified');
      });
    });

    describe('annotateBenchmarks', () => {
      it('annotates benchmark references with transparency labels', () => {
        const benchmarks = getBenchmarks();
        const annotated = annotateBenchmarks(benchmarks);
        expect(annotated.length).toBe(benchmarks.length);
        for (const b of annotated) {
          if (b.id.startsWith('bm-')) {
            expect(b.notes).toMatch(/\[(ASSUMED|HEURISTIC|UNVERIFIED|VERIFIED)]/);
          }
        }
      });
    });

    describe('formatTransparencyHtml', () => {
      it('generates HTML with transparency table', () => {
        const scorecard = calibrateAgainst('bm-plan-1', { area: 100 }, { area: 100 }, { area: 10 });
        const asc = annotateScorecard(scorecard);
        const html = formatTransparencyHtml([asc]);
        expect(html).toContain('Calibration Transparency');
        expect(html).toContain('[VERIFIED]');
        expect(html).toContain(scorecard.benchmarkName);
      });
    });
  });

  describe('Integration — report with validation results', () => {
    it('generateValidationReport includes validation results', () => {
      const scorecards = [
        calibrateAgainst('bm-plan-1', { area: 120 }, { area: 120 }, { area: 10 }),
      ];
      const vResults: ValidationResult[] = [
        makeValidationResult({ domain: 'geometry-validity', status: 'pass' }),
        makeValidationResult({ domain: 'drawing-documentation-completeness', status: 'fail', reason: 'Missing elevation drawings' }),
      ];
      const report = generateValidationReport(scorecards, [], getKnownWeaknesses(), vResults);
      expect(report.validationResults).toHaveLength(2);
      expect(report.summary).toContain('validation failure');
    });

    it('HTML report includes validation results section', () => {
      const scorecards = [
        calibrateAgainst('bm-plan-1', { area: 120 }, { area: 120 }, { area: 10 }),
      ];
      const vResults: ValidationResult[] = [
        makeValidationResult({ domain: 'geometry-validity', status: 'pass' }),
      ];
      const report = generateValidationReport(scorecards, [], getKnownWeaknesses(), vResults);
      const html = generateValidationReportHtml(report);
      expect(html).toContain('Validation Results');
    });

    it('pilot readiness integrates with validation report', () => {
      const vResults: ValidationResult[] = [
        makeValidationResult({ domain: 'geometry-validity', status: 'fail', reason: 'Invalid geometry detected' }),
      ];
      const report = makeReport({
        totalBenchmarks: 5, passed: 4, failed: 1, overallScore: 70,
        validationResults: vResults,
        weaknesses: [],
      });
      const p = assessPilotReadiness(report);
      expect(p.tier).toBe('blocked');
      expect(p.blockers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge cases', () => {
    it('no validation results does not crash', () => {
      const report = makeReport({ totalBenchmarks: 0, passed: 0, failed: 0, overallScore: 0, validationResults: [] });
      const c = classifyValidationResults(report.validationResults);
      expect(c.passes).toHaveLength(0);
    });

    it('all warnings does not block', () => {
      const report = makeReport({
        totalBenchmarks: 5, passed: 5, failed: 0, overallScore: 85,
        validationResults: [
          makeValidationResult({ domain: 'export-import-integrity', status: 'warning', reason: 'Minor format note' }),
        ],
        weaknesses: [],
      });
      const p = assessPilotReadiness(report);
      expect(p.tier).toBe('pilot-deployment');
    });

    it('large number of validation results are classified correctly', () => {
      const results: ValidationResult[] = [];
      for (let i = 0; i < 50; i++) {
        results.push(makeValidationResult({
          domain: 'geometry-validity',
          status: i < 30 ? 'pass' : i < 40 ? 'warning' : i < 45 ? 'fail' : 'not-applicable',
        }));
      }
      const c = classifyValidationResults(results);
      expect(c.passes).toHaveLength(30);
      expect(c.warnings).toHaveLength(10);
      expect(c.failures).toHaveLength(5);
      expect(c.notApplicable).toHaveLength(5);
    });

    it('formatValidationResultsHtml handles mixed statuses', () => {
      const results = [
        makeValidationResult({ domain: 'geometry-validity', status: 'pass' }),
        makeValidationResult({ domain: 'package-completeness', status: 'warning', reason: 'Minor gap' }),
        makeValidationResult({ domain: 'drawing-documentation-completeness', status: 'fail', reason: 'Critical gap' }),
        makeValidationResult({ domain: 'lifecycle-workflow-continuity', status: 'not-applicable' }),
      ];
      const html = formatValidationResultsHtml(results);
      expect(html).toContain('Blockers');
      expect(html).toContain('Warnings');
      expect(html).toContain('Critical gap');
      expect(html).toContain('Minor gap');
    });

    it('assessPilotReadiness returns supervised-professional for moderate score with open weaknesses', () => {
      const weaknesses: KnownWeakness[] = Array.from({ length: 2 }, (_, i) => ({
        id: `wk-${i}`, area: `Issue ${i}`, description: '',
        impact: 'low' as const, affectedCategories: ['plan' as const],
        mitigation: '', status: 'open' as const,
      }));
      const report = makeReport({
        totalBenchmarks: 5, passed: 3, failed: 0, overallScore: 65,
        validationResults: [],
        weaknesses,
      });
      const p = assessPilotReadiness(report);
      expect(p.tier).toBe('supervised-professional');
    });
  });
});
