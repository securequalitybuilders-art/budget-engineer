import { describe, it, expect } from 'vitest';
import {
  runExpandedCodeRules, createReviewReport, resolveIssue, generateReviewSummaryHtml,
} from '@/engine/review/reviewEngine';
import type { ComplianceInput } from '@/engine/compliance/types';
import type { PlanModel, RoomRect } from '@/domain/plan';
import type { AnalysisResult } from '@/engine/calculators/analysisAssembly';

function makePlanModel(overrides?: Record<string, unknown>): PlanModel {
  return {
    id: 'plan-1', width: 20, height: 15, wallThickness: 0.23,
    rooms: [], walls: [], openings: [], scaleLabel: '1:100',
    ...overrides,
  } as unknown as PlanModel;
}

type RoomInput = RoomRect & Record<string, unknown>;

function makeComplianceInput(overrides?: Partial<ComplianceInput>): ComplianceInput {
  return {
    plan: makePlanModel(),
    design: { id: 'd1', name: 'Test', grossFloorArea: 150, floors: 2, buildingType: 'house', elements: [] },
    analysis: { egressStatus: 'pass', fireRatingStatus: 'pass' } as unknown as AnalysisResult,
    buildingType: 'residential',
    ...overrides,
  };
}

describe('P18 — Code & Review Engine', () => {
  describe('runExpandedCodeRules', () => {
    it('checks room minimums', () => {
      const input = makeComplianceInput({
        plan: makePlanModel({
          rooms: [
            { id: 'r1', name: 'Tiny Bedroom', x: 0, y: 0, width: 1.5, height: 2 } as RoomInput,
            { id: 'r2', name: 'Living', x: 0, y: 0, width: 4, height: 4 } as RoomInput,
          ],
        }),
      });
      const issues = runExpandedCodeRules(input, 'test');
      const roomIssues = issues.filter(i => i.category === 'room-minimums');
      expect(roomIssues.length).toBeGreaterThanOrEqual(1);
      expect(roomIssues[0].severity).toBe('critical');
    });

    it('checks corridor widths', () => {
      const input = makeComplianceInput({
        plan: makePlanModel({
          rooms: [{ id: 'c1', name: 'Hallway', x: 0, y: 0, width: 0.7, height: 3 } as RoomInput],
        }),
      });
      const issues = runExpandedCodeRules(input, 'test');
      const corridorIssues = issues.filter(i => i.category === 'corridor-width');
      expect(corridorIssues.length).toBeGreaterThanOrEqual(1);
    });

    it('checks stair geometry', () => {
      const input = makeComplianceInput({
        plan: makePlanModel({
          stairs: [{ id: 'st1', rise: 0.2, going: 0.2, width: 0.9 } as Record<string, unknown>],
        }),
      });
      const issues = runExpandedCodeRules(input, 'test');
      const stairIssues = issues.filter(i => i.category === 'stair-geometry');
      expect(stairIssues.length).toBeGreaterThanOrEqual(2);
    });

    it('checks sanitary counts', () => {
      const input = makeComplianceInput();
      const issues = runExpandedCodeRules(input, 'test');
      const sanitaryIssues = issues.filter(i => i.category === 'sanitary-counts');
      expect(sanitaryIssues.length).toBeGreaterThanOrEqual(1);
    });

    it('covers all expected categories', () => {
      const input = makeComplianceInput({
        plan: makePlanModel({
          rooms: [
            { id: 'r1', name: 'Bedroom', x: 0, y: 0, width: 2, height: 2 } as RoomInput,
            { id: 'h1', name: 'Hallway', x: 0, y: 0, width: 0.7, height: 3 } as RoomInput,
          ],
          stairs: [{ id: 'st1', rise: 0.18, going: 0.22, width: 0.9 } as Record<string, unknown>],
        }),
      });
      const issues = runExpandedCodeRules(input, 'test');
      const categories = new Set(issues.map(i => i.category));
      expect(categories.has('room-minimums')).toBe(true);
      expect(categories.has('egress')).toBe(true);
      expect(categories.has('corridor-width')).toBe(true);
      expect(categories.has('stair-geometry')).toBe(true);
      expect(categories.has('accessibility')).toBe(true);
      expect(categories.has('daylight-ventilation')).toBe(true);
      expect(categories.has('sanitary-counts')).toBe(true);
      expect(categories.has('occupancy')).toBe(true);
      expect(categories.has('setbacks')).toBe(true);
      expect(categories.has('fire-separation')).toBe(true);
    });

    it('generates issues with all required fields', () => {
      const input = makeComplianceInput();
      const issues = runExpandedCodeRules(input, 'test');
      for (const issue of issues) {
        expect(issue.id).toBeTruthy();
        expect(issue.ruleId).toBeTruthy();
        expect(issue.category).toBeTruthy();
        expect(issue.severity).toBeTruthy();
        expect(issue.title).toBeTruthy();
        expect(issue.state).toBeTruthy();
        expect(issue.createdAt).toBeTruthy();
      }
    });
  });

  describe('createReviewReport', () => {
    it('creates report with correct summary', () => {
      const input = makeComplianceInput();
      const issues = runExpandedCodeRules(input, 'test');
      const report = createReviewReport('p1', 'test', issues, 'Test Reviewer');
      expect(report.projectId).toBe('p1');
      expect(report.summary.totalIssues).toBe(issues.length);
      expect(report.summary.critical + report.summary.major + report.summary.minor + report.summary.info).toBe(issues.length);
      expect(report.decision).toBeDefined();
    });

    it('sets decision to revise when critical issues exist', () => {
      const input = makeComplianceInput({
        plan: makePlanModel({
          rooms: [{ id: 'r1', name: 'Tiny', x: 0, y: 0, width: 1, height: 1 } as RoomInput],
        }),
      });
      const issues = runExpandedCodeRules(input, 'test');
      const report = createReviewReport('p1', 'test', issues, 'Reviewer');
      expect(report.decision).toBe('revise');
    });

    it('collects findings for non-pass issues', () => {
      const input = makeComplianceInput();
      const issues = runExpandedCodeRules(input, 'test');
      const report = createReviewReport('p1', 'test', issues, 'Reviewer');
      expect(report.findings.length).toBeGreaterThanOrEqual(1);
      for (const f of report.findings) {
        expect(f.finding).toBeTruthy();
        expect(f.recommendation).toBeTruthy();
      }
    });
  });

  describe('resolveIssue', () => {
    it('marks issue as resolved and adds comment', () => {
      const input = makeComplianceInput();
      const issues = runExpandedCodeRules(input, 'test');
      const resolved = resolveIssue(issues[0], 'Addressed in revision', 'Reviewer');
      expect(resolved.state).toBe('resolved');
      expect(resolved.comments.length).toBe(1);
      expect(resolved.comments[0].message).toContain('Resolved');
    });
  });

  describe('generateReviewSummaryHtml', () => {
    it('generates review summary HTML', () => {
      const input = makeComplianceInput();
      const issues = runExpandedCodeRules(input, 'test');
      const report = createReviewReport('p1', 'test', issues, 'Reviewer');
      const html = generateReviewSummaryHtml(report);
      expect(html).toContain('Code Review Report');
      expect(html).toContain(report.decision);
      expect(html).toContain('code-assisted review');
    });
  });
});
