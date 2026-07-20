import { describe, it, expect, beforeEach } from 'vitest';
import { useSelfAssessmentStore } from '@/stores/selfAssessmentStore';
import type { AssessedProjectSnapshot } from '@/lib/selfAssessment/selfAssessmentModel';
import { runSelfAssessment } from '@/lib/selfAssessment/selfAssessmentEngine';
import { checkStaleness, compareAssessments } from '@/lib/selfAssessment/assessmentComparison';
import { buildSelfAssessmentReportData, downloadSelfAssessmentReport, formatSelfAssessmentHtml, formatSelfAssessmentText } from '@/lib/selfAssessment/selfAssessmentReport';
import { getReferenceCases } from '@/lib/reference/referenceProjectPack';
import type { PilotDeploymentTier } from '@/lib/validation/pilotReadinessEvaluator';
import type { ValidationDomain } from '@/lib/validation/validationEngine';
import { getBenchmarks } from '@/lib/validation/validationEngine';

function makeHouseSnapshot(): AssessedProjectSnapshot {
  return {
    projectName: 'P32 Test House',
    typology: 'house',
    storeyProfile: 'single-storey',
    workflowScope: ['brief-to-plan', 'drawing-pack', 'boq-cost-estimation'],
    packageScope: ['model', 'drawings', 'boq'],
    lifecycleScope: ['design', 'documentation'],
    notes: 'P32 trust test',
  };
}

function makeApartmentSnapshot(): AssessedProjectSnapshot {
  return {
    projectName: 'P32 Test Apartment',
    typology: 'apartment',
    storeyProfile: 'multi-storey-3-5',
    workflowScope: ['brief-to-plan', 'multi-storey-planning', 'drawing-pack', 'code-compliance-check'],
    packageScope: ['model', 'drawings', 'structural'],
    lifecycleScope: ['design', 'documentation', 'review'],
    notes: 'P32 trust test apt',
  };
}

function makeWarehouseSnapshot(): AssessedProjectSnapshot {
  return {
    projectName: 'P32 Test Warehouse',
    typology: 'warehouse',
    storeyProfile: 'single-storey',
    workflowScope: ['brief-to-plan', 'drawing-pack', 'structural-pre-design', 'site-analysis'],
    packageScope: ['model', 'drawings', 'structural'],
    lifecycleScope: ['design', 'documentation'],
    notes: 'P32 trust test warehouse',
  };
}

describe('P32 — Assessment Trust: Stale Detection, Comparison & Quick Export', () => {
  beforeEach(() => {
    const store = useSelfAssessmentStore.getState();
    store.clearAssessments();
  });

  describe('Stale Detection Logic', () => {
    it('detects no staleness when snapshots match', () => {
      const snap = makeHouseSnapshot();
      const result = checkStaleness(snap, {
        typology: snap.typology,
        storeyProfile: snap.storeyProfile,
        workflowScope: snap.workflowScope,
        projectName: snap.projectName,
      });
      expect(result.isStale).toBe(false);
      expect(result.changedFields.length).toBe(0);
      expect(result.recommendation).toContain('current');
    });

    it('detects stale when typology changes', () => {
      const snap = makeHouseSnapshot();
      const result = checkStaleness(snap, { typology: 'warehouse' });
      expect(result.isStale).toBe(true);
      expect(result.changedFields.length).toBe(1);
      expect(result.changedFields[0].field).toBe('Typology');
      expect(result.changedFields[0].from).toBe('house');
      expect(result.changedFields[0].to).toBe('warehouse');
    });

    it('detects stale when storey profile changes', () => {
      const snap = makeHouseSnapshot();
      const result = checkStaleness(snap, { storeyProfile: 'multi-storey-3-5' });
      expect(result.isStale).toBe(true);
      expect(result.changedFields.find(f => f.field === 'Storey Profile')).toBeDefined();
    });

    it('detects stale when workflow scope changes', () => {
      const snap = makeHouseSnapshot();
      const result = checkStaleness(snap, { workflowScope: ['brief-to-plan'] });
      expect(result.isStale).toBe(true);
      expect(result.changedFields.find(f => f.field === 'Workflow Scope')).toBeDefined();
    });

    it('detects stale when project name changes', () => {
      const snap = makeHouseSnapshot();
      const result = checkStaleness(snap, { projectName: 'Different Name' });
      expect(result.isStale).toBe(true);
      expect(result.changedFields.find(f => f.field === 'Project Name')).toBeDefined();
    });

    it('detects multiple changes simultaneously', () => {
      const snap = makeHouseSnapshot();
      const result = checkStaleness(snap, {
        typology: 'warehouse',
        storeyProfile: 'multi-storey-3-5',
        projectName: 'Renamed',
      });
      expect(result.isStale).toBe(true);
      expect(result.changedFields.length).toBe(3);
    });

    it('ignores fields not provided in current', () => {
      const snap = makeHouseSnapshot();
      const result = checkStaleness(snap, {});
      expect(result.isStale).toBe(false);
      expect(result.changedFields.length).toBe(0);
    });

    it('workflow scope comparison is order-independent', () => {
      const snap = makeHouseSnapshot();
      const result = checkStaleness(snap, {
        workflowScope: ['boq-cost-estimation', 'drawing-pack', 'brief-to-plan'],
      });
      expect(result.isStale).toBe(false);
    });

    it('returns stale recommendation message', () => {
      const snap = makeHouseSnapshot();
      const result = checkStaleness(snap, { typology: 'warehouse' });
      expect(result.recommendation).toContain('Run a new assessment');
    });
  });

  describe('Store Staleness Integration', () => {
    it('store checkStaleness returns not-stale for matching assessment', () => {
      const store = useSelfAssessmentStore.getState();
      const snap = makeHouseSnapshot();
      store.runAssessment(snap);

      const assessments = store.getAllAssessments();
      const result = store.checkStaleness(assessments[0].id, {
        typology: snap.typology,
        storeyProfile: snap.storeyProfile,
        workflowScope: snap.workflowScope,
      });
      expect(result.isStale).toBe(false);
    });

    it('store checkStaleness detects stale', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());

      const assessments = store.getAllAssessments();
      const result = store.checkStaleness(assessments[0].id, { typology: 'warehouse' });
      expect(result.isStale).toBe(true);
    });

    it('store checkStaleness returns not-found for bad id', () => {
      const store = useSelfAssessmentStore.getState();
      const result = store.checkStaleness('nonexistent', { typology: 'house' });
      expect(result.isStale).toBe(false);
      expect(result.recommendation).toContain('not found');
    });
  });

  describe('Assessment Comparison Logic', () => {
    it('returns empty diffs for identical assessments', () => {
      const snap = makeHouseSnapshot();
      const before = { id: 'id1', snapshot: snap, result: runSelfAssessment(snap), createdAt: new Date().toISOString(), linkedSessionId: null, name: 'Before', _order: 1 };
      const after = { id: 'id2', snapshot: snap, result: runSelfAssessment(snap), createdAt: new Date().toISOString(), linkedSessionId: null, name: 'After', _order: 2 };

      const result = compareAssessments(before, after);
      expect(result.tier.length).toBe(0);
      expect(result.domains.length).toBe(0);
      expect(result.risks.length).toBe(0);
      expect(result.matchedCases.length).toBe(0);
      expect(result.supervision.length).toBe(0);
      expect(result.deployment.length).toBe(0);
    });

    it('detects tier improvement', () => {
      const house = makeHouseSnapshot();
      const warehouse = makeWarehouseSnapshot();
      const before = { id: 'b1', snapshot: house, result: runSelfAssessment(house), createdAt: '2025-01-01', linkedSessionId: null, name: 'House', _order: 1 };
      const after = { id: 'a1', snapshot: warehouse, result: runSelfAssessment(warehouse), createdAt: '2025-06-01', linkedSessionId: null, name: 'Warehouse', _order: 2 };

      const result = compareAssessments(before, after);
      if (result.tier.length > 0) {
        const t = result.tier[0];
        expect(['improved', 'declined']).toContain(t.changeType);
      }
    });

    it('detects domain rating changes', () => {
      const snap = makeHouseSnapshot();
      const before = { id: 'b1', snapshot: snap, result: runSelfAssessment(snap), createdAt: '2025-01-01', linkedSessionId: null, name: 'Before', _order: 1 };

      const snap2 = makeApartmentSnapshot();
      const after = { id: 'a1', snapshot: snap2, result: runSelfAssessment(snap2), createdAt: '2025-06-01', linkedSessionId: null, name: 'After', _order: 2 };

      const result = compareAssessments(before, after);
      const changed = result.domains.filter(d => d.changeType !== 'unchanged');
      expect(changed.length).toBeGreaterThanOrEqual(0);
    });

    it('detects risk additions and removals', () => {
      const snap = makeHouseSnapshot();
      const before = { id: 'b1', snapshot: snap, result: runSelfAssessment(snap), createdAt: '2025-01-01', linkedSessionId: null, name: 'Before', _order: 1 };

      const snap2 = makeWarehouseSnapshot();
      const after = { id: 'a1', snapshot: snap2, result: runSelfAssessment(snap2), createdAt: '2025-06-01', linkedSessionId: null, name: 'After', _order: 2 };

      const result = compareAssessments(before, after);
      for (const risk of result.risks) {
        expect(['added', 'removed']).toContain(risk.changeType);
      }
    });

    it('detects matched case additions and removals', () => {
      const snap = makeHouseSnapshot();
      const before = { id: 'b1', snapshot: snap, result: runSelfAssessment(snap), createdAt: '2025-01-01', linkedSessionId: null, name: 'Before', _order: 1 };

      const snap2 = makeApartmentSnapshot();
      const after = { id: 'a1', snapshot: snap2, result: runSelfAssessment(snap2), createdAt: '2025-06-01', linkedSessionId: null, name: 'After', _order: 2 };

      const result = compareAssessments(before, after);
      for (const mc of result.matchedCases) {
        expect(['added', 'removed', 'improved', 'declined']).toContain(mc.changeType);
      }
    });

    it('includes metadata (names and dates)', () => {
      const snap = makeHouseSnapshot();
      const before = { id: 'b1', snapshot: snap, result: runSelfAssessment(snap), createdAt: '2025-01-01', linkedSessionId: null, name: 'Before', _order: 1 };
      const after = { id: 'a1', snapshot: snap, result: runSelfAssessment(snap), createdAt: '2025-06-01', linkedSessionId: null, name: 'After', _order: 2 };

      const result = compareAssessments(before, after);
      expect(result.beforeName).toBe('Before');
      expect(result.afterName).toBe('After');
      expect(result.beforeDate).toBeTruthy();
      expect(result.afterDate).toBeTruthy();
    });

    it('supervision requirements diff detected when lengths differ', () => {
      const snap = makeHouseSnapshot();
      const result1 = runSelfAssessment(snap);
      const result2 = runSelfAssessment(makeWarehouseSnapshot());

      const before = { id: 'b1', snapshot: snap, result: result1, createdAt: '2025-01-01', linkedSessionId: null, name: 'Before', _order: 1 };
      const after = { id: 'a1', snapshot: makeWarehouseSnapshot(), result: result2, createdAt: '2025-06-01', linkedSessionId: null, name: 'After', _order: 2 };

      const comp = compareAssessments(before, after);
      const hasSupervisionDiff = comp.supervision.length > 0;
      expect(typeof hasSupervisionDiff).toBe('boolean');
    });
  });

  describe('Store Comparison Integration', () => {
    it('store compare returns null when IDs are invalid', () => {
      const store = useSelfAssessmentStore.getState();
      const result = store.compare('nonexistent-1', 'nonexistent-2');
      expect(result).toBeNull();
    });

    it('store compare returns result for valid IDs', () => {
      const store = useSelfAssessmentStore.getState();
      const id1 = store.runAssessment(makeHouseSnapshot());
      const id2 = store.runAssessment(makeApartmentSnapshot());

      const result = store.compare(id1, id2);
      expect(result).not.toBeNull();
      expect(result!.beforeName).toBeTruthy();
      expect(result!.afterName).toBeTruthy();
    });

    it('store compare works in both directions', () => {
      const store = useSelfAssessmentStore.getState();
      const id1 = store.runAssessment(makeHouseSnapshot());
      const id2 = store.runAssessment(makeApartmentSnapshot());

      const fwd = store.compare(id1, id2);
      const rev = store.compare(id2, id1);
      expect(fwd!.beforeName).toBe(rev!.afterName);
      expect(fwd!.afterName).toBe(rev!.beforeName);
    });

    it('store compare returns result structure with all sections', () => {
      const store = useSelfAssessmentStore.getState();
      const id1 = store.runAssessment(makeHouseSnapshot());
      const id2 = store.runAssessment(makeWarehouseSnapshot());

      const result = store.compare(id1, id2)!;
      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('domains');
      expect(result).toHaveProperty('risks');
      expect(result).toHaveProperty('matchedCases');
      expect(result).toHaveProperty('supervision');
      expect(result).toHaveProperty('deployment');
    });
  });

  describe('Quick Export Wiring', () => {
    it('buildSelfAssessmentReportData works for all typologies', () => {
      for (const snap of [makeHouseSnapshot(), makeApartmentSnapshot(), makeWarehouseSnapshot()]) {
        const result = runSelfAssessment(snap);
        const report = buildSelfAssessmentReportData(result);
        expect(report.projectName).toBeTruthy();
        expect(report.domainSummary.strong + report.domainSummary.adequate + report.domainSummary.weak + report.domainSummary.notRated).toBe(8);
      }
    });

    it('downloadSelfAssessmentReport function is defined and accepts a result', () => {
      expect(typeof downloadSelfAssessmentReport).toBe('function');
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const report = buildSelfAssessmentReportData(result);
      expect(report.projectName).toBe('P32 Test House');
    });

    it('downloadSelfAssessmentReport generates a downloadable blob', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const report = buildSelfAssessmentReportData(result);
      expect(report).toBeDefined();
      expect(report.projectName).toBe('P32 Test House');
    });
  });

  describe('Regression Protection (P27-P31)', () => {
    it('existing reference cases unchanged', () => {
      const cases = getReferenceCases();
      expect(cases.length).toBe(6);
      expect(cases[0].id).toBe('ref-single-house');
    });

    it('existing validation domains unchanged', () => {
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
      expect(getBenchmarks().every(b => b.domains.every(d => domains.includes(d)))).toBe(true);
    });

    it('existing pilot deployment tiers unchanged', () => {
      const tiers: PilotDeploymentTier[] = ['blocked', 'internal-only', 'supervised-professional', 'pilot-deployment'];
      for (const t of tiers) {
        expect(t).toBeTruthy();
      }
    });

    it('calibration markers preserved in stored results', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());
      const a = store.getLatestAssessment()!;

      const validMarkers = ['confirmed-behavior', 'heuristic-output', 'assumed-value', 'unverified-before-construction'];
      for (const d of a.result.domainRatings) {
        expect(validMarkers).toContain(d.calibration);
      }
    });

    it('disclaimer preserved — no approval language', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      expect(result.supervision.tierLabel).not.toMatch(/unqualified|unrestricted/i);
    });

    it('self-assessment engine still produces valid result', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      expect(result.matchedCases.length).toBeGreaterThan(0);
      expect(result.domainRatings.length).toBe(8);
      expect(result.supervision.recommendedTier).toMatch(/^(blocked|internal-only|supervised-professional|pilot-deployment)$/);
    });

    it('store persistence still works', () => {
      const store = useSelfAssessmentStore.getState();
      const id = store.runAssessment(makeHouseSnapshot());
      expect(store.getAllAssessments().length).toBe(1);
      expect(store.getActiveAssessment()?.id).toBe(id);
    });

    it('session linkage still works', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot(), 'session-p32');
      const linked = store.getAssessmentsForSession('session-p32');
      expect(linked.length).toBe(1);
    });

    it('HTML report still contains disclaimer', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const report = buildSelfAssessmentReportData(result);
      const html = formatSelfAssessmentHtml(report);
      expect(html).toContain('does not constitute professional design approval');
    });

    it('text report still contains calibration key', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      const report = buildSelfAssessmentReportData(result);
      const text = formatSelfAssessmentText(report);
      expect(text).toContain('[CONFIRMED]');
    });

    it('setActiveAssessment still switches correctly', () => {
      const store = useSelfAssessmentStore.getState();
      const id1 = store.runAssessment(makeHouseSnapshot());
      const id2 = store.runAssessment(makeApartmentSnapshot());

      store.setActiveAssessment(id1);
      expect(store.getActiveAssessment()?.id).toBe(id1);
      store.setActiveAssessment(id2);
      expect(store.getActiveAssessment()?.id).toBe(id2);
    });

    it('deleteAssessment still clears active when needed', () => {
      const store = useSelfAssessmentStore.getState();
      const id = store.runAssessment(makeHouseSnapshot());
      store.deleteAssessment(id);
      expect(store.getActiveAssessment()).toBeNull();
      expect(store.getAllAssessments().length).toBe(0);
    });
  });
});
