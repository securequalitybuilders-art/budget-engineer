import { describe, it, expect } from 'vitest';
import {
  runSiteBenchmark,
  runSiteTerrainBenchmark,
  runSiteAdjacentBenchmark,
  runInteriorBenchmark,
  runInteriorWardrobeBenchmark,
  runInteriorExportBenchmark,
  runStructuralBenchmark,
  runStructuralSlabBenchmark,
  runStructuralLoadingBenchmark,
  runMepBenchmark,
  runMepDemandBenchmark,
  runMepCircuitBenchmark,
  runReviewBenchmark,
  runReviewBadBenchmark,
  runReviewGoodBenchmark,
  runDeliveryBenchmark,
  runDeliverySignoffBenchmark,
  runDeliveryRegisterBenchmark,
  runAllBenchmarks,
  runFullValidation,
} from '@/lib/validation/benchmarkRunner';
import { getBenchmarks, generateValidationReport, getKnownWeaknesses } from '@/lib/validation/validationEngine';

describe('benchmarkRunner — P14-P20 wired to validationEngine', () => {
  it('all 18 benchmark references exist in the validation engine', () => {
    const all = getBenchmarks();
    const ids = all.map(b => b.id);
    expect(ids).toContain('bm-site-1');
    expect(ids).toContain('bm-interior-1');
    expect(ids).toContain('bm-structural-1');
    expect(ids).toContain('bm-mep-1');
    expect(ids).toContain('bm-review-1');
    expect(ids).toContain('bm-delivery-1');
    expect(ids).toContain('bm-site-terrain');
    expect(ids).toContain('bm-site-adjacent');
    expect(ids).toContain('bm-interior-wardrobe');
    expect(ids).toContain('bm-interior-export');
    expect(ids).toContain('bm-structural-slab');
    expect(ids).toContain('bm-structural-loading');
    expect(ids).toContain('bm-mep-demand');
    expect(ids).toContain('bm-mep-circuit');
    expect(ids).toContain('bm-review-bad');
    expect(ids).toContain('bm-review-good');
    expect(ids).toContain('bm-delivery-signoff');
    expect(ids).toContain('bm-delivery-register');
    expect(all.length).toBe(23);
  });

  describe('runSiteBenchmark', () => {
    it('calibrates site analysis output against expected metrics', async () => {
      const scorecard = await runSiteBenchmark();
      expect(scorecard.benchmarkId).toBe('bm-site-1');
      expect(scorecard.metrics.length).toBeGreaterThanOrEqual(3);
      const orient = scorecard.metrics.find(m => m.name === 'orientationScore');
      expect(orient).toBeDefined();
      expect(orient!.actual).toBeGreaterThanOrEqual(0);
      expect(orient!.actual).toBeLessThanOrEqual(100);
      const diagramCount = scorecard.metrics.find(m => m.name === 'diagramCount');
      expect(diagramCount).toBeDefined();
      expect(diagramCount!.actual).toBe(6);
    });
  });

  describe('runInteriorBenchmark', () => {
    it('calibrates interior documentation output', async () => {
      const scorecard = await runInteriorBenchmark();
      expect(scorecard.benchmarkId).toBe('bm-interior-1');
      const finish = scorecard.metrics.find(m => m.name === 'finishScheduleEntries');
      expect(finish).toBeDefined();
      expect(finish!.actual).toBe(3);
      const wet = scorecard.metrics.find(m => m.name === 'wetAreaElevation');
      expect(wet).toBeDefined();
      expect(wet!.actual).toBe(1);
    });
  });

  describe('runStructuralBenchmark', () => {
    it('calibrates structural pre-design output', async () => {
      const scorecard = await runStructuralBenchmark();
      expect(scorecard.benchmarkId).toBe('bm-structural-1');
      const slab = scorecard.metrics.find(m => m.name === 'slabThicknessMm');
      expect(slab).toBeDefined();
      expect(slab!.actual).toBeGreaterThan(100);
      expect(slab!.actual).toBeLessThan(300);
      const concrete = scorecard.metrics.find(m => m.name === 'concreteM3');
      expect(concrete).toBeDefined();
      expect(concrete!.actual).toBeGreaterThan(0);
    });
  });

  describe('runMepBenchmark', () => {
    it('calibrates MEP pre-design output', async () => {
      const scorecard = await runMepBenchmark();
      expect(scorecard.benchmarkId).toBe('bm-mep-1');
      const plumb = scorecard.metrics.find(m => m.name === 'plumbingFixtures');
      expect(plumb).toBeDefined();
      expect(plumb!.actual).toBeGreaterThanOrEqual(4);
      const elec = scorecard.metrics.find(m => m.name === 'electricalPoints');
      expect(elec).toBeDefined();
      expect(elec!.actual).toBeGreaterThan(0);
    });
  });

  describe('runReviewBenchmark', () => {
    it('calibrates code review engine output', async () => {
      const scorecard = await runReviewBenchmark();
      expect(scorecard.benchmarkId).toBe('bm-review-1');
      const issues = scorecard.metrics.find(m => m.name === 'totalIssues');
      expect(issues).toBeDefined();
      expect(issues!.actual).toBeGreaterThanOrEqual(3);
      const score = scorecard.metrics.find(m => m.name === 'score');
      expect(score).toBeDefined();
      expect(score!.actual).toBeGreaterThanOrEqual(0);
      expect(score!.actual).toBeLessThanOrEqual(100);
    });
  });

  describe('runDeliveryBenchmark', () => {
    it('calibrates delivery workflow output', async () => {
      const scorecard = await runDeliveryBenchmark();
      expect(scorecard.benchmarkId).toBe('bm-delivery-1');
      const sheets = scorecard.metrics.find(m => m.name === 'sheetCount');
      expect(sheets).toBeDefined();
      expect(sheets!.actual).toBe(2);
      const revisions = scorecard.metrics.find(m => m.name === 'revisionCount');
      expect(revisions).toBeDefined();
      expect(revisions!.actual).toBe(1);
    });
  });

  describe('runSiteTerrainBenchmark', () => {
    it('detects steep terrain', async () => {
      const sc = await runSiteTerrainBenchmark();
      expect(sc.benchmarkId).toBe('bm-site-terrain');
      const t = sc.metrics.find(m => m.name === 'terrainChallenge');
      expect(t).toBeDefined();
      expect(t!.actual).toBe(1);
    });
  });

  describe('runSiteAdjacentBenchmark', () => {
    it('computes adjacent building impact', async () => {
      const sc = await runSiteAdjacentBenchmark();
      expect(sc.benchmarkId).toBe('bm-site-adjacent');
      const impact = sc.metrics.find(m => m.name === 'adjacentImpact');
      expect(impact).toBeDefined();
      expect(impact!.actual).toBe(1);
    });
  });

  describe('runInteriorWardrobeBenchmark', () => {
    it('generates wardrobe elevation', async () => {
      const sc = await runInteriorWardrobeBenchmark();
      expect(sc.benchmarkId).toBe('bm-interior-wardrobe');
      const wc = sc.metrics.find(m => m.name === 'wardrobeCount');
      expect(wc).toBeDefined();
      expect(wc!.actual).toBe(1);
    });
  });

  describe('runInteriorExportBenchmark', () => {
    it('generates CSV and HTML exports', async () => {
      const sc = await runInteriorExportBenchmark();
      expect(sc.benchmarkId).toBe('bm-interior-export');
      const csv = sc.metrics.find(m => m.name === 'csvContainsHeader');
      expect(csv).toBeDefined();
      expect(csv!.actual).toBe(1);
    });
  });

  describe('runStructuralSlabBenchmark', () => {
    it('verifies slab thickness in range', async () => {
      const sc = await runStructuralSlabBenchmark();
      expect(sc.benchmarkId).toBe('bm-structural-slab');
      const t = sc.metrics.find(m => m.name === 'thicknessMm');
      expect(t).toBeDefined();
      expect(t!.actual).toBeGreaterThan(100);
      expect(t!.actual).toBeLessThan(300);
    });
  });

  describe('runStructuralLoadingBenchmark', () => {
    it('all column loads are positive', async () => {
      const sc = await runStructuralLoadingBenchmark();
      expect(sc.benchmarkId).toBe('bm-structural-loading');
      const loads = sc.metrics.find(m => m.name === 'allLoadsPositive');
      expect(loads).toBeDefined();
      expect(loads!.actual).toBe(1);
    });
  });

  describe('runMepDemandBenchmark', () => {
    it('computes water demand', async () => {
      const sc = await runMepDemandBenchmark();
      expect(sc.benchmarkId).toBe('bm-mep-demand');
      const demand = sc.metrics.find(m => m.name === 'totalWaterDemandLmin');
      expect(demand).toBeDefined();
      expect(demand!.actual).toBeGreaterThan(0);
    });
  });

  describe('runMepCircuitBenchmark', () => {
    it('all circuits within breaker rating', async () => {
      const sc = await runMepCircuitBenchmark();
      expect(sc.benchmarkId).toBe('bm-mep-circuit');
      const safe = sc.metrics.find(m => m.name === 'allCircuitsSafe');
      expect(safe).toBeDefined();
      expect(safe!.actual).toBe(1);
    });
  });

  describe('runReviewBadBenchmark', () => {
    it('detects critical issues in bad design', async () => {
      const sc = await runReviewBadBenchmark();
      expect(sc.benchmarkId).toBe('bm-review-bad');
      const critical = sc.metrics.find(m => m.name === 'hasCritical');
      expect(critical).toBeDefined();
      expect(critical!.actual).toBe(1);
      const decision = sc.metrics.find(m => m.name === 'decisionIsFail');
      expect(decision).toBeDefined();
      expect(decision!.actual).toBe(1);
    });
  });

  describe('runReviewGoodBenchmark', () => {
    it('passes compliant design with fewer issues than bad design', async () => {
      const good = await runReviewGoodBenchmark();
      const bad = await runReviewBadBenchmark();
      expect(good.benchmarkId).toBe('bm-review-good');
      const goodTotal = good.metrics.find(m => m.name === 'totalIssues');
      const badTotal = bad.metrics.find(m => m.name === 'totalIssues');
      expect(goodTotal).toBeDefined();
      expect(badTotal).toBeDefined();
      expect(goodTotal!.actual).toBeLessThanOrEqual(badTotal!.actual);
    });
  });

  describe('runDeliverySignoffBenchmark', () => {
    it('tracks checker and approver sign-off', async () => {
      const sc = await runDeliverySignoffBenchmark();
      expect(sc.benchmarkId).toBe('bm-delivery-signoff');
      const checked = sc.metrics.find(m => m.name === 'isChecked');
      expect(checked).toBeDefined();
      expect(checked!.actual).toBe(1);
      const approved = sc.metrics.find(m => m.name === 'isApproved');
      expect(approved).toBeDefined();
      expect(approved!.actual).toBe(1);
    });
  });

  describe('runDeliveryRegisterBenchmark', () => {
    it('generates drawing register for all sheets', async () => {
      const sc = await runDeliveryRegisterBenchmark();
      expect(sc.benchmarkId).toBe('bm-delivery-register');
      const count = sc.metrics.find(m => m.name === 'registerCount');
      expect(count).toBeDefined();
      expect(count!.actual).toBe(3);
    });
  });

  describe('runAllBenchmarks', () => {
    it('returns scorecards for all 18 P14-P20 benchmarks', async () => {
      const scorecards = await runAllBenchmarks();
      expect(scorecards.length).toBe(18);
      const ids = scorecards.map(s => s.benchmarkId);
      expect(ids).toContain('bm-site-1');
      expect(ids).toContain('bm-interior-1');
      expect(ids).toContain('bm-structural-1');
      expect(ids).toContain('bm-mep-1');
      expect(ids).toContain('bm-review-1');
      expect(ids).toContain('bm-delivery-1');
      expect(ids).toContain('bm-site-terrain');
      expect(ids).toContain('bm-site-adjacent');
      expect(ids).toContain('bm-interior-wardrobe');
      expect(ids).toContain('bm-interior-export');
      expect(ids).toContain('bm-structural-slab');
      expect(ids).toContain('bm-structural-loading');
      expect(ids).toContain('bm-mep-demand');
      expect(ids).toContain('bm-mep-circuit');
      expect(ids).toContain('bm-review-bad');
      expect(ids).toContain('bm-review-good');
      expect(ids).toContain('bm-delivery-signoff');
      expect(ids).toContain('bm-delivery-register');
    });

    it('all benchmarks produce valid acceptance levels', async () => {
      const scorecards = await runAllBenchmarks();
      for (const s of scorecards) {
        expect(['pass', 'marginal', 'fail']).toContain(s.overallAcceptance);
        expect(s.overallScore).toBeGreaterThanOrEqual(0);
        expect(s.overallScore).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('runFullValidation', () => {
    it('generates a complete validation report with 18 benchmarks', async () => {
      const report = await runFullValidation();
      expect(report.totalBenchmarks).toBe(18);
      expect(report.scorecards.length).toBe(18);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.length).toBeGreaterThan(0);
    });

    it('report HTML is well-formed', async () => {
      const report = await runFullValidation();
      const { generateValidationReportHtml } = await import('@/lib/validation/validationEngine');
      const html = generateValidationReportHtml(report);
      expect(html).toContain('<div');
      expect(html).toContain('Score');
      expect(html).toContain('Validation');
    });

    it('detects regressions when previous scorecards are provided', async () => {
      const fresh = await runAllBenchmarks();
      const improved = fresh.map(s => ({
        ...s,
        overallScore: 100,
        metrics: s.metrics.map(m => ({ ...m, actual: typeof m.actual === 'number' ? m.actual + 1000 : m.actual })),
      }));
      const report = generateValidationReport(fresh, improved, getKnownWeaknesses());
      expect(report.regressionRecords.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('benchmark runner edge cases', () => {
    it('handles empty site gracefully', async () => {
      const { computeFullSiteAnalysis, createDefaultSiteContext } = await import('@/engine/analysis/siteAnalysisEngine');
      const site = createDefaultSiteContext('edge-' + Date.now());
      const output = computeFullSiteAnalysis(site);
      expect(output.diagrams.length).toBe(6);
      expect(output.summary.orientationScore).toBeGreaterThanOrEqual(0);
    });
  });
});
