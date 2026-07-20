import { describe, it, expect } from 'vitest';
import { getReferenceCases, getReferenceCaseById, getCoverageSummary } from '@/lib/reference/referenceProjectPack';
import { buildReportData, formatReferenceCaseHtml, formatReferenceCaseJson, formatReferenceCaseText } from '@/lib/reference/referenceCaseReport';
import { CALIBRATION_MARKER_ANNOTATIONS } from '@/lib/reference/referenceCaseModel';
import type { CalibrationMarker } from '@/lib/reference/referenceCaseModel';

describe('P29 — Reference Case Pack Integrity', () => {
  describe('Reference Case Model', () => {
    it('defines all 4 calibration markers with prefixes', () => {
      const markers: CalibrationMarker[] = ['confirmed-behavior', 'heuristic-output', 'assumed-value', 'unverified-before-construction'];
      for (const m of markers) {
        const ann = CALIBRATION_MARKER_ANNOTATIONS[m];
        expect(ann).toBeDefined();
        expect(ann.prefix).toMatch(/^\[.*\]$/);
        expect(ann.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Reference Project Pack', () => {
    it('contains at least 5 reference cases', () => {
      const cases = getReferenceCases();
      expect(cases.length).toBeGreaterThanOrEqual(5);
    });

    it('each case has a unique id', () => {
      const cases = getReferenceCases();
      const ids = cases.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('each case has non-empty fields', () => {
      const cases = getReferenceCases();
      for (const c of cases) {
        expect(c.name.length).toBeGreaterThan(0);
        expect(c.description.length).toBeGreaterThan(0);
        expect(c.projectIntent.length).toBeGreaterThan(0);
        expect(c.workflowScope.length).toBeGreaterThan(0);
        expect(c.expectedOutputs.length).toBeGreaterThan(0);
        expect(c.validationLinks.length).toBeGreaterThan(0);
        expect(c.humanReviewAreas.length).toBeGreaterThan(0);
      }
    });

    it('each case has valid typology and storey profile', () => {
      const validTypologies = ['house', 'villa', 'duplex', 'townhouse', 'apartment', 'mixed-use', 'clinic', 'school', 'worship', 'warehouse', 'commercial-office', 'retail'];
      const validProfiles = ['single-storey', 'two-storey', 'multi-storey-3-5', 'multi-storey-6-plus'];
      const cases = getReferenceCases();
      for (const c of cases) {
        expect(validTypologies).toContain(c.typology);
        expect(validProfiles).toContain(c.storeyProfile);
      }
    });

    it('each expected output has a valid calibration marker', () => {
      const validMarkers: CalibrationMarker[] = ['confirmed-behavior', 'heuristic-output', 'assumed-value', 'unverified-before-construction'];
      const cases = getReferenceCases();
      for (const c of cases) {
        for (const o of c.expectedOutputs) {
          expect(validMarkers).toContain(o.calibration);
        }
      }
    });

    it('each case has a pilot readiness expectation with supervision context', () => {
      const cases = getReferenceCases();
      for (const c of cases) {
        expect(c.pilotReadiness.supervisionContext.length).toBeGreaterThan(0);
        expect(c.pilotReadiness.supervisionRequirements.length).toBeGreaterThan(0);
        expect(c.pilotReadiness.knownRisks.length).toBeGreaterThan(0);
      }
    });

    it('each validation link references valid domains', () => {
      const validDomains = [
        'geometry-validity', 'programme-layout-validity', 'drawing-documentation-completeness',
        'package-completeness', 'boq-procurement-linkage-integrity', 'lifecycle-workflow-continuity',
        'export-import-integrity', 'human-review-required',
      ];
      const cases = getReferenceCases();
      for (const c of cases) {
        for (const link of c.validationLinks) {
          expect(validDomains).toContain(link.domain);
          expect(link.benchmarkRefs.length).toBeGreaterThan(0);
        }
      }
    });

    it('getReferenceCaseById returns the correct case', () => {
      const c = getReferenceCaseById('ref-single-house');
      expect(c).toBeDefined();
      expect(c!.name).toContain('Single-Storey');
    });

    it('getReferenceCaseById returns undefined for unknown id', () => {
      expect(getReferenceCaseById('non-existent')).toBeUndefined();
    });
  });

  describe('Coverage Summary', () => {
    it('produces a summary for each case', () => {
      const cases = getReferenceCases();
      const summaries = getCoverageSummary();
      expect(summaries.length).toBe(cases.length);
    });

    it('each summary has coverage score between 0 and 100', () => {
      const summaries = getCoverageSummary();
      for (const s of summaries) {
        expect(s.coverageScore).toBeGreaterThanOrEqual(0);
        expect(s.coverageScore).toBeLessThanOrEqual(100);
      }
    });

    it('each summary has recommendedFor and notRecommendedFor arrays', () => {
      const summaries = getCoverageSummary();
      for (const s of summaries) {
        expect(Array.isArray(s.recommendedFor)).toBe(true);
        expect(Array.isArray(s.notRecommendedFor)).toBe(true);
      }
    });

    it('summaries have unique case IDs', () => {
      const summaries = getCoverageSummary();
      const ids = summaries.map(s => s.caseId);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('Report Generation', () => {
    it('buildReportData returns all required fields', () => {
      const report = buildReportData();
      expect(report.caseCount).toBeGreaterThanOrEqual(5);
      expect(report.cases.length).toBe(report.caseCount);
      expect(report.coverageSummary.length).toBe(report.caseCount);
      expect(report.generatedAt.length).toBeGreaterThan(0);
    });

    it('weakDomains aggregates correctly', () => {
      const report = buildReportData();
      if (report.weakDomains.length > 0) {
        for (const d of report.weakDomains) {
          expect(d.caseCount).toBeGreaterThan(0);
          expect(d.cases.length).toBe(d.caseCount);
        }
      }
    });

    it('humanReviewHotspots aggregates correctly', () => {
      const report = buildReportData();
      if (report.humanReviewHotspots.length > 0) {
        for (const h of report.humanReviewHotspots) {
          expect(h.caseCount).toBeGreaterThan(0);
          expect(h.cases.length).toBeGreaterThan(0);
        }
      }
    });

    it('readinessDistribution covers all cases', () => {
      const report = buildReportData();
      const totalInDistribution = Object.values(report.readinessDistribution).reduce((s, v) => s + v, 0);
      expect(totalInDistribution).toBe(report.caseCount);
    });

    it('formatReferenceCaseHtml generates valid HTML', () => {
      const report = buildReportData();
      const html = formatReferenceCaseHtml(report);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Reference Case Coverage');
      expect(html).toContain('Arial,Helvetica,sans-serif');
      expect(html).toContain(report.cases[0].name);
    });

    it('formatReferenceCaseJson generates valid JSON', () => {
      const report = buildReportData();
      const json = formatReferenceCaseJson(report);
      const parsed = JSON.parse(json);
      expect(parsed.caseCount).toBe(report.caseCount);
      expect(parsed.cases).toHaveLength(report.caseCount);
    });

    it('formatReferenceCaseText generates readable text', () => {
      const report = buildReportData();
      const text = formatReferenceCaseText(report);
      expect(text).toContain('REFERENCE CASE COVERAGE REPORT');
      expect(text).toContain(report.cases[0].name);
      expect(text).toContain('CASE DETAILS');
    });
  });

  describe('Calibration Marker Distribution', () => {
    it('all 4 calibration markers are used across the pack', () => {
      const cases = getReferenceCases();
      const usedMarkers = new Set<string>();
      for (const c of cases) {
        for (const o of c.expectedOutputs) {
          usedMarkers.add(o.calibration);
        }
      }
      expect(usedMarkers.has('confirmed-behavior')).toBe(true);
      expect(usedMarkers.has('heuristic-output')).toBe(true);
      expect(usedMarkers.has('assumed-value')).toBe(true);
      expect(usedMarkers.has('unverified-before-construction')).toBe(true);
    });
  });

  describe('Human Review Severity Distribution', () => {
    it('each case has at least one mandatory review area', () => {
      const cases = getReferenceCases();
      for (const c of cases) {
        const mandatory = c.humanReviewAreas.filter(h => h.severity === 'mandatory');
        expect(mandatory.length).toBeGreaterThan(0);
      }
    });

    it('all human review areas have valid severity', () => {
      const valid = ['mandatory', 'recommended', 'informational'];
      const cases = getReferenceCases();
      for (const c of cases) {
        for (const h of c.humanReviewAreas) {
          expect(valid).toContain(h.severity);
          expect(h.why.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Known Limitations', () => {
    it('each case has at least one known limitation', () => {
      const cases = getReferenceCases();
      for (const c of cases) {
        expect(c.knownLimitations.length).toBeGreaterThan(0);
      }
    });

    it('limitations have valid impact and status', () => {
      const validImpacts = ['low', 'medium', 'high'];
      const validStatuses = ['open', 'mitigated', 'workaround-available'];
      const cases = getReferenceCases();
      for (const c of cases) {
        for (const l of c.knownLimitations) {
          expect(validImpacts).toContain(l.impact);
          expect(validStatuses).toContain(l.status);
          expect(l.description.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Typology Coverage', () => {
    it('covers residential, semi-detached, apartment, mixed-use, and institutional typologies', () => {
      const cases = getReferenceCases();
      const typologies = cases.map(c => c.typology);
      expect(typologies).toContain('house');
      expect(typologies).toContain('villa');
      expect(typologies).toContain('duplex');
      expect(typologies).toContain('apartment');
      expect(typologies).toContain('mixed-use');
      expect(typologies).toContain('clinic');
    });

    it('covers single-storey, two-storey, and multi-storey profiles', () => {
      const cases = getReferenceCases();
      const profiles = cases.map(c => c.storeyProfile);
      expect(profiles).toContain('single-storey');
      expect(profiles).toContain('two-storey');
      expect(profiles).toContain('multi-storey-3-5');
    });
  });

  describe('Regression Protection — Existing Assets Unchanged', () => {
    it('case ids are stable and semantic', () => {
      const cases = getReferenceCases();
      for (const c of cases) {
        expect(c.id).toMatch(/^ref-/);
        expect(c.id).not.toContain(' ');
      }
    });

    it('all reports reference HTTP-free local resources only', () => {
      const report = buildReportData();
      const html = formatReferenceCaseHtml(report);
      expect(html).not.toContain('http://');
      expect(html).not.toContain('https://');
    });

    it('readiness tiers are valid PilotDeploymentTier values', () => {
      const validTiers = ['blocked', 'internal-only', 'supervised-professional', 'pilot-deployment'];
      const cases = getReferenceCases();
      for (const c of cases) {
        expect(validTiers).toContain(c.pilotReadiness.expectedTier);
      }
    });

    it('workflow scopes are valid', () => {
      const validScopes = [
        'brief-to-plan', 'multi-storey-planning', 'drawing-pack', 'structural-pre-design',
        'mep-pre-design', 'code-compliance-check', 'boq-cost-estimation', 'site-analysis',
        'interior-documentation', 'delivery-workflow', 'lifecycle-management', 'package-export',
      ];
      const cases = getReferenceCases();
      for (const c of cases) {
        for (const scope of c.workflowScope) {
          expect(validScopes).toContain(scope);
        }
      }
    });
  });
});
