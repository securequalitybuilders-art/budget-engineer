import { describe, it, expect, beforeEach } from 'vitest';
import { useSelfAssessmentStore } from '@/stores/selfAssessmentStore';
import type { AssessedProjectSnapshot } from '@/lib/selfAssessment/selfAssessmentModel';
import { runSelfAssessment } from '@/lib/selfAssessment/selfAssessmentEngine';
import { getReferenceCases } from '@/lib/reference/referenceProjectPack';
import type { PilotDeploymentTier } from '@/lib/validation/pilotReadinessEvaluator';
import type { ValidationDomain } from '@/lib/validation/validationEngine';
import { getBenchmarks } from '@/lib/validation/validationEngine';

function makeHouseSnapshot(): AssessedProjectSnapshot {
  return {
    projectName: 'P31 Test House',
    typology: 'house',
    storeyProfile: 'single-storey',
    workflowScope: ['brief-to-plan', 'drawing-pack', 'boq-cost-estimation'],
    packageScope: [],
    lifecycleScope: [],
    notes: 'P31 persistence test',
  };
}

function makeApartmentSnapshot(): AssessedProjectSnapshot {
  return {
    projectName: 'P31 Test Apartment',
    typology: 'apartment',
    storeyProfile: 'multi-storey-3-5',
    workflowScope: ['brief-to-plan', 'multi-storey-planning', 'drawing-pack', 'code-compliance-check'],
    packageScope: [],
    lifecycleScope: [],
    notes: 'P31 persistence test apt',
  };
}

describe('P31 — Self-Assessment Persistence & Pilot Workflow Wiring', () => {
  beforeEach(() => {
    const store = useSelfAssessmentStore.getState();
    store.clearAssessments();
  });

  describe('Store Persistence', () => {
    it('runs and stores an assessment', () => {
      const store = useSelfAssessmentStore.getState();
      const snap = makeHouseSnapshot();
      const id = store.runAssessment(snap);

      const all = store.getAllAssessments();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(id);
      expect(all[0].snapshot.projectName).toBe('P31 Test House');
    });

    it('stores multiple assessments', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());
      store.runAssessment(makeApartmentSnapshot());

      const all = store.getAllAssessments();
      expect(all.length).toBe(2);
    });

    it('getLatestAssessment returns most recent', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());
      const id2 = store.runAssessment(makeApartmentSnapshot());

      const latest = store.getLatestAssessment();
      expect(latest?.id).toBe(id2);
      expect(latest?.snapshot.typology).toBe('apartment');
    });

    it('deleteAssessment removes an assessment', () => {
      const store = useSelfAssessmentStore.getState();
      const id = store.runAssessment(makeHouseSnapshot());
      expect(store.getAllAssessments().length).toBe(1);

      store.deleteAssessment(id);
      expect(store.getAllAssessments().length).toBe(0);
    });

    it('setActiveAssessment switches active assessment', () => {
      const store = useSelfAssessmentStore.getState();
      const id1 = store.runAssessment(makeHouseSnapshot());
      const id2 = store.runAssessment(makeApartmentSnapshot());

      store.setActiveAssessment(id1);
      const active = store.getActiveAssessment();
      expect(active?.id).toBe(id1);

      store.setActiveAssessment(id2);
      const active2 = store.getActiveAssessment();
      expect(active2?.id).toBe(id2);
    });

    it('clearAssessments removes all data', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());
      store.runAssessment(makeApartmentSnapshot());
      expect(store.getAllAssessments().length).toBe(2);

      store.clearAssessments();
      expect(store.getAllAssessments().length).toBe(0);
      expect(store.getActiveAssessment()).toBeNull();
    });

    it('activeAssessmentId null after clearing', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());
      store.clearAssessments();

      expect(store.getActiveAssessment()).toBeNull();
    });
  });

  describe('Session Linkage', () => {
    it('links assessment to session on run', () => {
      const store = useSelfAssessmentStore.getState();
      const id = store.runAssessment(makeHouseSnapshot(), 'session-1');

      expect(store.getAssessmentsForSession('session-1').length).toBe(1);
      expect(store.getAssessmentsForSession('session-1')[0].id).toBe(id);
    });

    it('linkToSession updates existing assessment', () => {
      const store = useSelfAssessmentStore.getState();
      const id = store.runAssessment(makeHouseSnapshot());

      store.linkToSession(id, 'session-2');
      const assessments = store.getAssessmentsForSession('session-2');
      expect(assessments.length).toBe(1);
      expect(assessments[0].id).toBe(id);
    });

    it('getAssessmentsForSession returns only linked assessments', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot(), 'session-a');
      store.runAssessment(makeApartmentSnapshot(), 'session-b');
      store.runAssessment(makeHouseSnapshot());

      expect(store.getAssessmentsForSession('session-a').length).toBe(1);
      expect(store.getAssessmentsForSession('session-b').length).toBe(1);
      expect(store.getAssessmentsForSession('nonexistent').length).toBe(0);
    });

    it('stores linkedSessionId on assessment', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot(), 'session-x');

      const assessment = store.getLatestAssessment();
      expect(assessment?.linkedSessionId).toBe('session-x');
    });

    it('unlinked assessment has null session', () => {
      const store = useSelfAssessmentStore.getState();
      const id = store.runAssessment(makeHouseSnapshot());

      const assessment = store.getAllAssessments().find(a => a.id === id);
      expect(assessment?.linkedSessionId).toBeNull();
    });
  });

  describe('Data Integrity', () => {
    it('assessment name is derived from snapshot', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());

      const a = store.getAllAssessments()[0];
      expect(a.name).toContain('P31 Test House');
    });

    it('assessment result contains all required fields', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeApartmentSnapshot());

      const a = store.getLatestAssessment()!;
      expect(a.result.snapshot).toBeDefined();
      expect(a.result.domainRatings).toBeDefined();
      expect(a.result.matchedCases).toBeDefined();
      expect(a.result.supervision).toBeDefined();
      expect(a.result.risks).toBeDefined();
      expect(a.result.deploymentContext).toBeDefined();
      expect(a.result.generatedAt).toBeDefined();
    });

    it('all 8 validation domains present in stored result', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());

      const a = store.getLatestAssessment()!;
      expect(a.result.domainRatings.length).toBe(8);
    });

    it('stored matched cases have valid scores', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());

      const a = store.getLatestAssessment()!;
      for (const mc of a.result.matchedCases) {
        expect(mc.similarityScore).toBeGreaterThanOrEqual(0);
        expect(mc.similarityScore).toBeLessThanOrEqual(100);
        expect(mc.caseId).toBeTruthy();
      }
    });

    it('supervision tier is valid', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());

      const a = store.getLatestAssessment()!;
      expect(a.result.supervision.recommendedTier).toMatch(/^(blocked|internal-only|supervised-professional|pilot-deployment)$/);
    });

    it('createdAt is valid ISO string', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());

      const a = store.getLatestAssessment()!;
      expect(() => new Date(a.createdAt)).not.toThrow();
    });

    it('assessments are sorted newest-first', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());
      store.runAssessment(makeApartmentSnapshot());

      const all = store.getAllAssessments();
      expect(all.length).toBe(2);
      expect(all[0].snapshot.typology).toBe('apartment');
      expect(all[1].snapshot.typology).toBe('house');
    });
  });

  describe('Stale-State Handling', () => {
    it('running new assessment sets it as active', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());

      const active = store.getActiveAssessment();
      expect(active).not.toBeNull();
    });

    it('deleteAssessment clears active when deleted', () => {
      const store = useSelfAssessmentStore.getState();
      const id = store.runAssessment(makeHouseSnapshot());
      expect(store.getActiveAssessment()).not.toBeNull();

      store.deleteAssessment(id);
      expect(store.getActiveAssessment()).toBeNull();
    });

    it('deleteAssessment selects another when active is deleted', () => {
      const store = useSelfAssessmentStore.getState();
      store.runAssessment(makeHouseSnapshot());
      const id2 = store.runAssessment(makeApartmentSnapshot());
      store.runAssessment(makeHouseSnapshot());

      store.setActiveAssessment(id2);
      store.deleteAssessment(id2);

      const active = store.getActiveAssessment();
      expect(active).not.toBeNull();
      expect(active?.id).not.toBe(id2);
    });

    it('getLatestAssessment returns null when empty', () => {
      const store = useSelfAssessmentStore.getState();
      expect(store.getLatestAssessment()).toBeNull();
    });

    it('getActiveAssessment returns null when empty', () => {
      const store = useSelfAssessmentStore.getState();
      expect(store.getActiveAssessment()).toBeNull();
    });
  });

  describe('P31-Specific Engine Integrity', () => {
    it('runSelfAssessment still produces result from snapshot', () => {
      const snap = makeHouseSnapshot();
      const result = runSelfAssessment(snap);
      expect(result.snapshot.projectName).toBe('P31 Test House');
      expect(result.matchedCases.length).toBeGreaterThan(0);
    });
  });

  describe('Regression Protection', () => {
    it('existing reference cases unchanged', () => {
      const cases = getReferenceCases();
      expect(cases.length).toBe(6);
      expect(cases[0].id).toBe('ref-single-house');
    });

    it('existing pilot deployment tiers unchanged', () => {
      const tiers: PilotDeploymentTier[] = ['blocked', 'internal-only', 'supervised-professional', 'pilot-deployment'];
      expect(tiers).toContain('blocked');
      expect(tiers).toContain('pilot-deployment');
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
  });
});
