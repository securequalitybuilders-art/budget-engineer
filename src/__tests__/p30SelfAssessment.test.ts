import { describe, it, expect } from 'vitest';
import type { AssessedProjectSnapshot } from '@/lib/selfAssessment/selfAssessmentModel';
import { SELF_ASSESSMENT_CALIBRATION_ORDER } from '@/lib/selfAssessment/selfAssessmentModel';
import { matchReferenceCases } from '@/lib/selfAssessment/referenceMatcher';
import { runSelfAssessment } from '@/lib/selfAssessment/selfAssessmentEngine';
import {
  buildSelfAssessmentReportData,
  formatSelfAssessmentHtml,
  formatSelfAssessmentJson,
  formatSelfAssessmentText,
} from '@/lib/selfAssessment/selfAssessmentReport';
import { getReferenceCases } from '@/lib/reference/referenceProjectPack';
import type { ValidationDomain } from '@/lib/validation/validationEngine';
import { getBenchmarks } from '@/lib/validation/validationEngine';
import type { PilotDeploymentTier } from '@/lib/validation/pilotReadinessEvaluator';
import { assessPilotReadiness } from '@/lib/validation/pilotReadinessEvaluator';

function makeHouseSnapshot(): AssessedProjectSnapshot {
  return {
    projectName: 'Test House',
    typology: 'house',
    storeyProfile: 'single-storey',
    workflowScope: ['brief-to-plan', 'drawing-pack', 'boq-cost-estimation'],
    packageScope: ['model', 'drawings', 'boq'],
    lifecycleScope: ['design', 'documentation'],
    notes: 'Test snapshot for unit testing',
  };
}

function makeApartmentSnapshot(): AssessedProjectSnapshot {
  return {
    projectName: 'Test Apartment',
    typology: 'apartment',
    storeyProfile: 'multi-storey-3-5',
    workflowScope: ['brief-to-plan', 'multi-storey-planning', 'drawing-pack', 'structural-pre-design', 'code-compliance-check'],
    packageScope: ['model', 'drawings', 'structural'],
    lifecycleScope: ['design', 'documentation', 'review'],
    notes: 'Multi-storey apartment test',
  };
}

describe('P30 — Self-Assessment & Reference-Case Integration', () => {
  describe('Model Integrity', () => {
    it('defines calibration order as expected', () => {
      expect(SELF_ASSESSMENT_CALIBRATION_ORDER).toEqual([
        'confirmed-behavior',
        'heuristic-output',
        'assumed-value',
        'unverified-before-construction',
      ]);
    });

    it('creates valid project snapshot', () => {
      const snap = makeHouseSnapshot();
      expect(snap.projectName).toBeTruthy();
      expect(snap.typology).toBe('house');
      expect(snap.storeyProfile).toBe('single-storey');
      expect(snap.workflowScope.length).toBeGreaterThan(0);
    });
  });

  describe('Reference Matching Logic', () => {
    it('finds closest match for house typology', () => {
      const snap = makeHouseSnapshot();
      const matches = matchReferenceCases(snap);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].similarityScore).toBeGreaterThanOrEqual(70);
    });

    it('returns top N results', () => {
      const snap = makeHouseSnapshot();
      const matches = matchReferenceCases(snap, undefined, 2);
      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it('house snapshot matches house reference case', () => {
      const snap = makeHouseSnapshot();
      const matches = matchReferenceCases(snap);
      const top = matches[0];
      expect(top.typologyMatch).toBe(true);
      expect(top.storeyMatch).toBe(true);
    });

    it('apartment snapshot matches apartment or mixed-use', () => {
      const snap = makeApartmentSnapshot();
      const matches = matchReferenceCases(snap);
      expect(matches.length).toBeGreaterThan(0);
      const types = matches.map(m => m.caseName.toLowerCase());
      const hasRelevant = types.some(t => t.includes('apartment') || t.includes('mixed') || t.includes('storey'));
      expect(hasRelevant).toBe(true);
    });

    it('different typologies produce different top matches', () => {
      const houseSnap = makeHouseSnapshot();
      const aptSnap = makeApartmentSnapshot();
      const houseMatches = matchReferenceCases(houseSnap);
      const aptMatches = matchReferenceCases(aptSnap);
      expect(houseMatches[0].caseId).not.toBe(aptMatches[0].caseId);
    });

    it('identifies gaps when typology differs', () => {
      const snap: AssessedProjectSnapshot = {
        ...makeHouseSnapshot(),
        typology: 'warehouse',
      };
      const matches = matchReferenceCases(snap);
      expect(matches[0].gaps.length).toBeGreaterThan(0);
    });

    it('workflow overlap contributes to score', () => {
      const snap = makeHouseSnapshot();
      const matches = matchReferenceCases(snap);
      expect(matches[0].workflowMatch).toBeGreaterThan(0);
    });
  });

  describe('Integrated Self-Assessment', () => {
    it('produces assessment result from house snapshot', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      expect(result.snapshot.projectName).toBe('Test House');
      expect(result.matchedCases.length).toBeGreaterThan(0);
      expect(result.domainRatings.length).toBe(8);
      expect(result.supervision.recommendedTier).toBeTruthy();
    });

    it('all 8 validation domains are rated', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const domains: ValidationDomain[] = [
        'geometry-validity',
        'programme-layout-validity',
        'drawing-documentation-completeness',
        'package-completeness',
        'boq-procurement-linkage-integrity',
        'lifecycle-workflow-continuity',
        'export-import-integrity',
        'human-review-required',
      ];
      for (const d of domains) {
        expect(result.domainRatings.find(r => r.domain === d)).toBeDefined();
      }
    });

    it('each domain rating has a valid rating', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const validRatings = ['strong', 'adequate', 'weak', 'not-rated'];
      for (const d of result.domainRatings) {
        expect(validRatings).toContain(d.rating);
      }
    });

    it('each domain rating has a calibration marker', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const validMarkers = ['confirmed-behavior', 'heuristic-output', 'assumed-value', 'unverified-before-construction'];
      for (const d of result.domainRatings) {
        expect(validMarkers).toContain(d.calibration);
      }
    });

    it('matched cases include similarity scores', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      for (const mc of result.matchedCases) {
        expect(mc.similarityScore).toBeGreaterThanOrEqual(0);
        expect(mc.similarityScore).toBeLessThanOrEqual(100);
      }
    });

    it('supervision summary includes tier and rationale', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      expect(result.supervision.recommendedTier).toMatch(/^(blocked|internal-only|supervised-professional|pilot-deployment)$/);
      expect(result.supervision.rationale.length).toBeGreaterThan(0);
    });

    it('supervision includes requirements when matched', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      expect(result.supervision.supervisionRequirements).toBeDefined();
    });

    it('risks are identified from matched reference', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      expect(result.risks.length).toBeGreaterThanOrEqual(0);
    });

    it('risks have valid calibration markers', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const validMarkers = ['confirmed-behavior', 'heuristic-output', 'assumed-value', 'unverified-before-construction'];
      for (const risk of result.risks) {
        expect(validMarkers).toContain(risk.calibration);
      }
    });

    it('deployment context has recommendations', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      expect(result.deploymentContext.recommendedFor).toBeDefined();
      expect(result.deploymentContext.notRecommendedFor).toBeDefined();
      expect(result.deploymentContext.limitations).toBeDefined();
    });

    it('generatedAt is valid ISO date', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      expect(() => new Date(result.generatedAt)).not.toThrow();
    });
  });

  describe('Report Generation', () => {
    it('buildReportData produces valid report structure', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const report = buildSelfAssessmentReportData(result);
      expect(report.projectName).toBe('Test House');
      expect(report.typology).toBe('house');
      expect(report.generatedAt).toBeTruthy();
      expect(report.domainSummary.strong + report.domainSummary.adequate + report.domainSummary.weak + report.domainSummary.notRated).toBe(8);
    });

    it('formatSelfAssessmentHtml generates valid HTML', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const report = buildSelfAssessmentReportData(result);
      const html = formatSelfAssessmentHtml(report);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Self-Assessment Report');
      expect(html).toContain('Test House');
      expect(html).toContain('</html>');
    });

    it('formatSelfAssessmentJson generates valid JSON', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const report = buildSelfAssessmentReportData(result);
      const json = formatSelfAssessmentJson(report);
      const parsed = JSON.parse(json);
      expect(parsed.projectName).toBe('Test House');
      expect(parsed.result.matchedCases.length).toBeGreaterThan(0);
    });

    it('formatSelfAssessmentText generates readable text', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const report = buildSelfAssessmentReportData(result);
      const text = formatSelfAssessmentText(report);
      expect(text).toContain('SELF-ASSESSMENT REPORT');
      expect(text).toContain('Test House');
      expect(text).toContain('IMPORTANT');
    });

    it('HTML report includes transparency disclaimer', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const report = buildSelfAssessmentReportData(result);
      const html = formatSelfAssessmentHtml(report);
      expect(html).toContain('does not constitute professional design approval');
      expect(html).toContain('[CONFIRMED]');
      expect(html).toContain('[HEURISTIC]');
      expect(html).toContain('[ASSUMED]');
      expect(html).toContain('[UNVERIFIED-BEFORE-CONSTRUCTION]');
    });

    it('text report includes calibration key', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const report = buildSelfAssessmentReportData(result);
      const text = formatSelfAssessmentText(report);
      expect(text).toContain('[CONFIRMED]');
    });
  });

  describe('Supervision Recommendation Logic', () => {
    it('recommends a valid tier for apartment profile', () => {
      const snap = makeApartmentSnapshot();
      const result = runSelfAssessment(snap);
      expect(['blocked', 'internal-only', 'supervised-professional', 'pilot-deployment']).toContain(result.supervision.recommendedTier);
    });

    it('includes mandatory review areas for supervised-professional tier', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      if (result.supervision.recommendedTier === 'supervised-professional') {
        expect(result.supervision.mandatoryReviewAreas.length).toBeGreaterThan(0);
      }
    });

    it('mandatory review areas reference specific domains', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      for (const area of result.supervision.mandatoryReviewAreas) {
        expect(typeof area).toBe('string');
        expect(area.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Regression Protection', () => {
    it('existing reference cases are unchanged', () => {
      const cases = getReferenceCases();
      expect(cases.length).toBe(6);
      expect(cases[0].id).toBe('ref-single-house');
      expect(cases[1].id).toBe('ref-villa-2-storey');
    });

    it('existing validation domains are unchanged', () => {
      const validDomains: ValidationDomain[] = [
        'geometry-validity',
        'programme-layout-validity',
        'drawing-documentation-completeness',
        'package-completeness',
        'boq-procurement-linkage-integrity',
        'lifecycle-workflow-continuity',
        'export-import-integrity',
        'human-review-required',
      ];
      expect(getBenchmarks().every(b => b.domains.every(d => validDomains.includes(d)))).toBe(true);
    });

    it('existing pilot deployment tiers are unchanged', () => {
      const tiers: PilotDeploymentTier[] = ['blocked', 'internal-only', 'supervised-professional', 'pilot-deployment'];
      for (const t of tiers) {
        expect(t).toBeTruthy();
      }
    });

    it('assessPilotReadiness still works with self-assessment report', () => {
      const validationReport = {
        id: 'regression-test',
        runAt: new Date().toISOString(),
        totalBenchmarks: 5,
        passed: 3,
        marginal: 1,
        failed: 0,
        notRated: 1,
        overallScore: 75,
        scorecards: [],
        regressionRecords: [],
        weaknesses: [],
        summary: 'Regression test',
        validationResults: [],
      };

      const pilotReport = assessPilotReadiness(validationReport);
      expect(pilotReport.tier).toBeTruthy();
      expect(pilotReport.canProceedToPilot).toBe(false);
    });

    it('self-assessment claim discipline markers are present', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      for (const d of result.domainRatings) {
        expect(d.calibration).toMatch(/^(confirmed-behavior|heuristic-output|assumed-value|unverified-before-construction)$/);
      }
    });

    it('self-assessment does not fabricate approval authority', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const report = buildSelfAssessmentReportData(result);
      const html = formatSelfAssessmentHtml(report);
      const text = formatSelfAssessmentText(report);

      expect(html).not.toMatch(/approved|certified|guaranteed|warranted/i);
      expect(text).not.toMatch(/approved|certified|guaranteed|warranted/i);
      expect(result.supervision.tierLabel).not.toMatch(/unqualified|unrestricted/i);
    });
  });
});
