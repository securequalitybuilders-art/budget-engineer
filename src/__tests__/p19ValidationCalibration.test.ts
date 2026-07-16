import { describe, it, expect } from 'vitest';
import {
  getBenchmarks, calibrateAgainst, getKnownWeaknesses,
  detectRegressions, generateValidationReport, generateValidationReportHtml,
} from '@/lib/validation/validationEngine';

describe('P19 — Validation & Calibration Programme', () => {
  describe('getBenchmarks', () => {
    it('returns all benchmarks when no category filter', () => {
      const benchmarks = getBenchmarks();
      expect(benchmarks.length).toBeGreaterThanOrEqual(5);
    });

    it('filters by category', () => {
      const plans = getBenchmarks('plan');
      expect(plans.every(b => b.category === 'plan')).toBe(true);
      expect(plans.length).toBeGreaterThanOrEqual(2);
    });

    it('all benchmarks have required fields', () => {
      const benchmarks = getBenchmarks();
      for (const b of benchmarks) {
        expect(b.id).toBeTruthy();
        expect(b.name).toBeTruthy();
        expect(b.category).toBeTruthy();
        expect(b.source).toBeTruthy();
        expect(b.sourceType).toBeTruthy();
      }
    });
  });

  describe('calibrateAgainst', () => {
    it('returns scorecard with metrics', () => {
      const scorecard = calibrateAgainst(
        'bm-plan-1',
        { areaM2: 115, roomCount: 6 },
        { areaM2: 120, roomCount: 5 },
        { areaM2: 15, roomCount: 20 }
      );
      expect(scorecard.benchmarkId).toBe('bm-plan-1');
      expect(scorecard.metrics.length).toBeGreaterThanOrEqual(2);
      expect(scorecard.overallScore).toBeGreaterThanOrEqual(0);
      expect(scorecard.overallScore).toBeLessThanOrEqual(100);
    });

    it('assigns pass for within tolerance', () => {
      const scorecard = calibrateAgainst('bm-plan-1', { area: 100 }, { area: 100 }, { area: 10 });
      expect(scorecard.metrics[0].acceptance).toBe('pass');
      expect(scorecard.metrics[0].deviationPct).toBe(0);
    });

    it('assigns fail for outside tolerance', () => {
      const scorecard = calibrateAgainst('bm-plan-1', { area: 200 }, { area: 100 }, { area: 10 });
      expect(scorecard.metrics[0].acceptance).toBe('fail');
      expect(Math.abs(scorecard.metrics[0].deviationPct)).toBeGreaterThan(10);
    });

    it('assigns marginal for between 1x and 2x tolerance', () => {
      const scorecard = calibrateAgainst('bm-plan-1', { area: 120 }, { area: 100 }, { area: 10 });
      expect(scorecard.metrics[0].acceptance).toBe('marginal');
    });

    it('calculates overall score correctly', () => {
      const scorecard = calibrateAgainst('bm-plan-1',
        { a: 100, b: 50, c: 200 },
        { a: 100, b: 100, c: 100 },
        { a: 10, b: 10, c: 10 }
      );
      expect(scorecard.overallScore).toBeLessThan(100);
      expect(scorecard.overallScore).toBeGreaterThan(0);
    });
  });

  describe('getKnownWeaknesses', () => {
    it('returns known weaknesses register', () => {
      const weaknesses = getKnownWeaknesses();
      expect(weaknesses.length).toBeGreaterThanOrEqual(5);
      for (const w of weaknesses) {
        expect(w.id).toBeTruthy();
        expect(w.area).toBeTruthy();
        expect(w.impact).toBeDefined();
        expect(w.status).toBeDefined();
      }
    });
  });

  describe('detectRegressions', () => {
    it('detects score regressions', () => {
      const previous = [
        { id: 'sc-1', benchmarkId: 'bm-plan-1', benchmarkName: 'Plan A', category: 'plan' as const, metrics: [], overallScore: 85, overallAcceptance: 'pass' as const, calibratedAt: '', notes: '' },
      ];
      const current = [
        { id: 'sc-2', benchmarkId: 'bm-plan-1', benchmarkName: 'Plan A', category: 'plan' as const, metrics: [], overallScore: 70, overallAcceptance: 'marginal' as const, calibratedAt: '', notes: '' },
      ];
      const regressions = detectRegressions(previous, current);
      expect(regressions.length).toBe(1);
      expect(regressions[0].delta).toBe(-15);
    });

    it('returns empty when no regressions', () => {
      const previous = [
        { id: 'sc-1', benchmarkId: 'bm-plan-1', benchmarkName: 'Plan A', category: 'plan' as const, metrics: [], overallScore: 70, overallAcceptance: 'marginal' as const, calibratedAt: '', notes: '' },
      ];
      const current = [
        { id: 'sc-2', benchmarkId: 'bm-plan-1', benchmarkName: 'Plan A', category: 'plan' as const, metrics: [], overallScore: 85, overallAcceptance: 'pass' as const, calibratedAt: '', notes: '' },
      ];
      const regressions = detectRegressions(previous, current);
      expect(regressions.length).toBe(0);
    });
  });

  describe('generateValidationReport', () => {
    it('generates complete validation report', () => {
      const scorecards = [
        calibrateAgainst('bm-plan-1', { area: 120 }, { area: 120 }, { area: 10 }),
        calibrateAgainst('bm-boq-1', { total: 550000 }, { total: 500000 }, { total: 15 }),
      ];
      const report = generateValidationReport(scorecards, [], getKnownWeaknesses());
      expect(report.totalBenchmarks).toBe(2);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.length).toBeGreaterThan(10);
      expect(report.runAt).toBeTruthy();
    });
  });

  describe('generateValidationReportHtml', () => {
    it('generates HTML report', () => {
      const scorecards = [
        calibrateAgainst('bm-plan-1', { area: 120 }, { area: 120 }, { area: 10 }),
      ];
      const report = generateValidationReport(scorecards, [], getKnownWeaknesses());
      const html = generateValidationReportHtml(report);
      expect(html).toContain('Validation & Calibration Report');
      expect(html).toContain('Score');
      expect(html).toContain('Known Weaknesses');
    });
  });
});
