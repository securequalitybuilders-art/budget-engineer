import { describe, it, expect } from 'vitest';
import {
  applyReviewToDelivery, suggestPackageTypeForReview, getReviewSummaryForTransmittal,
} from '@/engine/integration/reviewDeliveryIntegration';
import type { ReviewReport, ReviewDecision, ReviewIssue } from '@/engine/review/reviewEngine';
import { createDeliveryProject, createPackage } from '@/engine/delivery/deliveryWorkflowEngine';
import { createReviewReport } from '@/engine/review/reviewEngine';

function makeReviewReport(
  decision: ReviewDecision,
  critical = 0,
  major = 0,
  minor = 0,
  info = 0
): ReviewReport {
  const issues: ReviewIssue[] = [
    ...Array.from({ length: critical }, (_, i) => ({
      id: `iss-crit-${i}`, ruleId: 'test', category: 'general' as const,
      severity: 'critical' as const, title: 'Critical issue', description: 'Test',
      location: 'Test', requirement: 'Req', actual: 'Act',
      status: 'fail' as const, state: 'open' as const, assignee: '', comments: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })),
    ...Array.from({ length: major }, (_, i) => ({
      id: `iss-maj-${i}`, ruleId: 'test', category: 'general' as const,
      severity: 'major' as const, title: 'Major issue', description: 'Test',
      location: 'Test', requirement: 'Req', actual: 'Act',
      status: 'warn' as const, state: 'open' as const, assignee: '', comments: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })),
    ...Array.from({ length: minor }, (_, i) => ({
      id: `iss-min-${i}`, ruleId: 'test', category: 'general' as const,
      severity: 'minor' as const, title: 'Minor issue', description: 'Test',
      location: 'Test', requirement: 'Req', actual: 'Act',
      status: 'warn' as const, state: 'open' as const, assignee: '', comments: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })),
    ...Array.from({ length: info }, (_, i) => ({
      id: `iss-inf-${i}`, ruleId: 'test', category: 'general' as const,
      severity: 'info' as const, title: 'Info issue', description: 'Test',
      location: 'Test', requirement: 'Req', actual: 'Act',
      status: 'pass' as const, state: 'closed' as const, assignee: '', comments: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })),
  ];
  const report = createReviewReport('p1', 'test', issues, 'Test Reviewer', 'Integration test notes');
  return { ...report, decision };
}

describe('P21 — Review + Delivery Integration', () => {
  describe('applyReviewToDelivery', () => {
    it('advances delivery to for-construction on pass review', () => {
      const delivery = createDeliveryProject('p1', 'PROJ-001', 'Client', 'Address');
      delivery.currentIssueState = 'for-review';
      const pkg = createPackage('p1', 'Architectural Set', 'issue-for-review', 'Engineer');
      delivery.packages = [pkg];

      const report = makeReviewReport('pass', 0, 0, 1, 2);
      const result = applyReviewToDelivery(report, delivery);

      expect(result.delivery.currentIssueState).toBe('for-construction');
      expect(result.updatedPackage?.status).toBe('issued');
      expect(result.packageNotes).toContain('issued');
    });

    it('advances delivery on conditional-pass review', () => {
      const delivery = createDeliveryProject('p1', 'PROJ-002', 'Client', 'Address');
      delivery.currentIssueState = 'for-review';
      const pkg = createPackage('p1', 'Structural Set', 'issue-for-review', 'Engineer');
      delivery.packages = [pkg];

      const report = makeReviewReport('conditional-pass', 0, 2, 3, 1);
      const result = applyReviewToDelivery(report, delivery);

      expect(result.delivery.currentIssueState).toBe('for-construction');
      expect(result.updatedPackage?.status).toBe('issued');
      expect(result.packageNotes).toContain('Conditions');
    });

    it('reverts delivery to in-progress on revise review', () => {
      const delivery = createDeliveryProject('p1', 'PROJ-003', 'Client', 'Address');
      delivery.currentIssueState = 'for-review';
      const pkg = createPackage('p1', 'MEP Set', 'issue-for-review', 'Engineer');
      delivery.packages = [pkg];

      const report = makeReviewReport('revise', 1, 3, 2, 0);
      const result = applyReviewToDelivery(report, delivery);

      expect(result.delivery.currentIssueState).toBe('in-progress');
      expect(result.updatedPackage?.status).toBe('revised');
      expect(result.packageNotes).toContain('revised');
    });

    it('reverts delivery to draft on fail review', () => {
      const delivery = createDeliveryProject('p1', 'PROJ-004', 'Client', 'Address');
      delivery.currentIssueState = 'for-review';
      const pkg = createPackage('p1', 'All Sets', 'issue-for-review', 'Engineer');
      delivery.packages = [pkg];

      const report = makeReviewReport('fail', 3, 5, 2, 0);
      const result = applyReviewToDelivery(report, delivery);

      expect(result.delivery.currentIssueState).toBe('draft');
      expect(result.packageNotes).toContain('blocked');
    });

    it('handles no suitable package gracefully', () => {
      const delivery = createDeliveryProject('p1', 'PROJ-005', 'Client', 'Address');
      delivery.currentIssueState = 'for-review';

      const report = makeReviewReport('pass', 0, 0, 0, 1);
      const result = applyReviewToDelivery(report, delivery);

      expect(result.packageNotes).toContain('No suitable package');
      expect(result.updatedPackage).toBeNull();
    });

    it('targets a specific package by ID', () => {
      const delivery = createDeliveryProject('p1', 'PROJ-006', 'Client', 'Address');
      delivery.currentIssueState = 'for-review';
      const pkgA = { ...createPackage('p1', 'Set A', 'issue-for-review', 'Eng'), id: 'pkg-a-001' };
      const pkgB = { ...createPackage('p1', 'Set B', 'issue-for-review', 'Eng'), id: 'pkg-b-002' };
      delivery.packages = [pkgA, pkgB];

      const report = makeReviewReport('pass', 0, 0, 1, 1);
      const result = applyReviewToDelivery(report, delivery, pkgB.id);

      expect(result.updatedPackage?.name).toBe('Set B');
      expect(result.updatedPackage?.status).toBe('issued');
    });

    it('does not change state if already beyond for-review on pass', () => {
      const delivery = createDeliveryProject('p1', 'PROJ-007', 'Client', 'Address');
      delivery.currentIssueState = 'for-construction';
      const pkg = { ...createPackage('p1', 'Final Set', 'issue-for-construction', 'Eng'), id: 'pkg-final' };
      pkg.status = 'issued';
      delivery.packages = [pkg];

      const report = makeReviewReport('pass', 0, 0, 0, 0);
      const result = applyReviewToDelivery(report, delivery);

      expect(result.delivery.currentIssueState).toBe('for-construction');
    });

    it('updates drawing register after review', () => {
      const delivery = createDeliveryProject('p1', 'PROJ-008', 'Client', 'Address');
      delivery.currentIssueState = 'for-review';
      delivery.sheets = [
        { id: 's1', sheetNumber: 'A001', sheetTitle: 'Ground Floor', discipline: 'A', scale: '1:100', size: 'A1', status: 'for-review', revisions: [], currentRevision: 'P01', createdBy: 'Eng', checkedBy: '', approvedBy: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];
      const pkg = createPackage('p1', 'Arch Set', 'issue-for-review', 'Eng');
      delivery.packages = [pkg];

      const report = makeReviewReport('pass', 0, 0, 1, 0);
      const result = applyReviewToDelivery(report, delivery);

      expect(result.delivery.drawingRegister.length).toBeGreaterThanOrEqual(1);
      expect(result.delivery.drawingRegister[0].sheetNumber).toBe('A001');
    });
  });

  describe('suggestPackageTypeForReview', () => {
    it('returns issue-for-review when critical issues exist', () => {
      const report = makeReviewReport('revise', 2, 0, 0, 0);
      expect(suggestPackageTypeForReview(report)).toBe('issue-for-review');
    });

    it('returns issue-for-construction for clean pass', () => {
      const report = makeReviewReport('pass', 0, 0, 0, 1);
      expect(suggestPackageTypeForReview(report)).toBe('issue-for-construction');
    });
  });

  describe('getReviewSummaryForTransmittal', () => {
    it('produces summary string with key fields', () => {
      const report = makeReviewReport('conditional-pass', 0, 1, 2, 3);
      const summary = getReviewSummaryForTransmittal(report);
      expect(summary).toContain('conditional-pass');
      expect(summary).toContain('Score:');
      expect(summary).toContain('Issues:');
      expect(summary).toContain('major');
    });
  });
});
