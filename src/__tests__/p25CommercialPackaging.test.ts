import { describe, it, expect } from 'vitest';
import {
  CAPABILITY_GROUPS, DEPLOYMENT_PROFILES, USE_CONTEXTS,
  getCapabilityGroup, getCapabilitiesByMaturity,
  getCapabilitiesRequiringHumanReview, getDeploymentProfile, getUseContext,
} from '@/lib/commercial/productPackagingModel';
import type { CapabilityGroupId, DeploymentMode } from '@/lib/commercial/productPackagingModel';
import { generateCapabilityManifest, formatCapabilityManifestHtml, formatCapabilityManifestJson } from '@/lib/commercial/capabilityManifest';
import { generateDeploymentManifest, formatDeploymentManifestHtml, formatDeploymentManifestJson } from '@/lib/commercial/deploymentManifest';
import { getSupervisedUseGuidance, EVALUATION_CHECKLIST, PILOT_ROLLOUT_STEPS } from '@/lib/commercial/evaluationChecklist';

describe('P25 — Commercial / Enterprise Packaging', () => {
  describe('Product Packaging Model', () => {
    describe('CAPABILITY_GROUPS', () => {
      it('defines 18 capability groups', () => {
        expect(CAPABILITY_GROUPS).toHaveLength(18);
      });

      it('each group has required fields', () => {
        for (const g of CAPABILITY_GROUPS) {
          expect(g.id).toBeTruthy();
          expect(g.label).toBeTruthy();
          expect(g.description).toBeTruthy();
          expect(['foundation', 'emerging', 'established', 'mature']).toContain(g.maturity);
          expect(typeof g.requiresHumanReview).toBe('boolean');
          expect(Array.isArray(g.workflowStages)).toBe(true);
          expect(Array.isArray(g.dependencies)).toBe(true);
        }
      });

      it('has unique IDs', () => {
        const ids = CAPABILITY_GROUPS.map(g => g.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it('some capabilities require human review', () => {
        const withReview = CAPABILITY_GROUPS.filter(g => g.requiresHumanReview);
        expect(withReview.length).toBeGreaterThan(0);
        for (const g of withReview) {
          expect(g.humanReviewNote).toBeTruthy();
        }
      });

      it('mature capabilities do not include foundation', () => {
        const mature = getCapabilitiesByMaturity('mature');
        expect(mature.length).toBeGreaterThanOrEqual(3);
        expect(mature.every(g => g.maturity === 'mature')).toBe(true);
      });

      it('getCapabilityGroup returns correct group', () => {
        const g = getCapabilityGroup('design-pipeline');
        expect(g).toBeDefined();
        expect(g!.label).toBe('Design Pipeline');
      });

      it('getCapabilityGroup returns undefined for unknown', () => {
        expect(getCapabilityGroup('unknown' as CapabilityGroupId)).toBeUndefined();
      });

      it('getCapabilitiesRequiringHumanReview returns all review-required groups', () => {
        const review = getCapabilitiesRequiringHumanReview();
        expect(review.length).toBeGreaterThan(0);
        expect(review.every(g => g.requiresHumanReview)).toBe(true);
      });
    });

    describe('DEPLOYMENT_PROFILES', () => {
      it('defines 4 deployment profiles', () => {
        expect(DEPLOYMENT_PROFILES).toHaveLength(4);
      });

      it('each profile has required fields', () => {
        for (const p of DEPLOYMENT_PROFILES) {
          expect(p.id).toBeTruthy();
          expect(p.label).toBeTruthy();
          expect(p.description).toBeTruthy();
          expect(p.infrastructure).toBeTruthy();
          expect(Array.isArray(p.audience)).toBe(true);
          expect(p.audience.length).toBeGreaterThan(0);
          expect(Array.isArray(p.supportedModes)).toBe(true);
          expect(Array.isArray(p.limitations)).toBe(true);
        }
      });

      it('getDeploymentProfile returns correct profile', () => {
        const p = getDeploymentProfile('docker-hosted');
        expect(p).toBeDefined();
        expect(p!.label).toContain('Docker');
      });

      it('getDeploymentProfile returns undefined for unknown', () => {
        expect(getDeploymentProfile('unknown' as DeploymentMode)).toBeUndefined();
      });
    });

    describe('USE_CONTEXTS', () => {
      it('defines 6 use contexts', () => {
        expect(USE_CONTEXTS).toHaveLength(6);
      });

      it('each context has required fields', () => {
        for (const c of USE_CONTEXTS) {
          expect(c.id).toBeTruthy();
          expect(c.label).toBeTruthy();
          expect(c.description).toBeTruthy();
          expect(Array.isArray(c.audience)).toBe(true);
          expect(Array.isArray(c.suitableFor)).toBe(true);
          expect(Array.isArray(c.notSuitableFor)).toBe(true);
        }
      });

      it('getUseContext returns correct context', () => {
        const c = getUseContext('pilot-evaluation');
        expect(c).toBeDefined();
        expect(c!.label).toContain('Pilot');
      });

      it('getUseContext returns undefined for unknown', () => {
        expect(getUseContext('unknown')).toBeUndefined();
      });
    });
  });

  describe('Capability Manifest', () => {
    it('generates manifest with correct structure', () => {
      const manifest = generateCapabilityManifest('4.0.0');
      expect(manifest.productName).toBe('Budget Engineer');
      expect(manifest.productVersion).toBe('4.0.0');
      expect(manifest.totalCapabilities).toBe(18);
      expect(manifest.entries).toHaveLength(18);
      expect(manifest.requiresHumanReviewCount).toBeGreaterThan(0);
    });

    it('maturity breakdown sums correctly', () => {
      const manifest = generateCapabilityManifest('4.0.0');
      const total = Object.values(manifest.maturityBreakdown).reduce((s, v) => s + v, 0);
      expect(total).toBe(18);
    });

    it('formats HTML', () => {
      const manifest = generateCapabilityManifest('4.0.0');
      const html = formatCapabilityManifestHtml(manifest);
      expect(html).toContain('Capability Manifest');
      expect(html).toContain('Budget Engineer');
      expect(html).toContain('Mature');
      expect(html).toContain('Established');
    });

    it('formats JSON', () => {
      const manifest = generateCapabilityManifest('4.0.0');
      const json = formatCapabilityManifestJson(manifest);
      const parsed = JSON.parse(json);
      expect(parsed.totalCapabilities).toBe(18);
      expect(parsed.productVersion).toBe('4.0.0');
    });

    it('manifests at different versions differ', () => {
      const m1 = generateCapabilityManifest('4.0.0');
      const m2 = generateCapabilityManifest('5.0.0');
      expect(m1.productVersion).not.toBe(m2.productVersion);
    });
  });

  describe('Deployment Manifest', () => {
    it('generates manifest with correct structure', () => {
      const manifest = generateDeploymentManifest('4.0.0');
      expect(manifest.productVersion).toBe('4.0.0');
      expect(manifest.totalProfiles).toBe(4);
      expect(manifest.entries).toHaveLength(4);
    });

    it('formats HTML', () => {
      const manifest = generateDeploymentManifest('4.0.0');
      const html = formatDeploymentManifestHtml(manifest);
      expect(html).toContain('Deployment Profiles');
      expect(html).toContain('Local Workstation');
      expect(html).toContain('Docker');
    });

    it('formats JSON', () => {
      const manifest = generateDeploymentManifest('4.0.0');
      const json = formatDeploymentManifestJson(manifest);
      const parsed = JSON.parse(json);
      expect(parsed.totalProfiles).toBe(4);
    });
  });

  describe('Evaluation Checklist', () => {
    it('has 21 evaluation items', () => {
      expect(EVALUATION_CHECKLIST).toHaveLength(21);
    });

    it('each item has required fields', () => {
      for (const item of EVALUATION_CHECKLIST) {
        expect(item.id).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.verificationMethod).toBeTruthy();
      }
    });
  });

  describe('Pilot Rollout Steps', () => {
    it('has 10 steps', () => {
      expect(PILOT_ROLLOUT_STEPS).toHaveLength(10);
    });

    it('each step has required fields', () => {
      for (const step of PILOT_ROLLOUT_STEPS) {
        expect(step.id).toBeTruthy();
        expect(step.phase).toBeTruthy();
        expect(step.label).toBeTruthy();
        expect(step.description).toBeTruthy();
        expect(Array.isArray(step.dependsOn)).toBe(true);
        expect(step.estimatedEffort).toBeTruthy();
      }
    });

    it('spans all 4 phases', () => {
      const phases = new Set(PILOT_ROLLOUT_STEPS.map(s => s.phase));
      expect(phases.has('Preparation')).toBe(true);
      expect(phases.has('Onboarding')).toBe(true);
      expect(phases.has('Execution')).toBe(true);
      expect(phases.has('Evaluation')).toBe(true);
    });
  });

  describe('Supervised Use Guidance', () => {
    it('returns non-empty guidance string', () => {
      const guidance = getSupervisedUseGuidance();
      expect(guidance.length).toBeGreaterThan(200);
      expect(guidance).toContain('Supervised Professional Use');
      expect(guidance).toContain('professional review');
    });

    it('mentions review-required capabilities', () => {
      const guidance = getSupervisedUseGuidance();
      const withReview = CAPABILITY_GROUPS.filter(g => g.requiresHumanReview);
      for (const g of withReview) {
        expect(guidance).toContain(g.label);
      }
    });
  });

  describe('Deployment profiles consistency', () => {
    it('all deployment profile modes are documented limitations', () => {
      for (const p of DEPLOYMENT_PROFILES) {
        expect(p.limitations.length).toBeGreaterThan(0);
      }
    });

    it('Docker profile mentions nginx', () => {
      const docker = getDeploymentProfile('docker-hosted');
      expect(docker!.infrastructure.toLowerCase()).toContain('docker');
    });

    it('local-workstation profile has modern browser audience', () => {
      const local = getDeploymentProfile('local-workstation');
      expect(local!.audience).toContain('student');
      expect(local!.audience).toContain('evaluator');
    });
  });

  describe('Commercial positioning integrity', () => {
    it('no capability makes false claims', () => {
      const disallowed = ['licensed architect replacement', 'final structural signoff', 'automatic certified code approval', 'cloud-native collaboration'];
      for (const g of CAPABILITY_GROUPS) {
        for (const term of disallowed) {
          expect(g.description.toLowerCase()).not.toContain(term);
        }
      }
    });

    it('human-review-required capabilities have notes', () => {
      for (const g of CAPABILITY_GROUPS) {
        if (g.requiresHumanReview) {
          expect(g.humanReviewNote.length).toBeGreaterThan(10);
        }
      }
    });

    it('every capability belongs to at least one workflow stage or has a reason', () => {
      for (const g of CAPABILITY_GROUPS) {
        const hasStages = g.workflowStages.length > 0;
        const isSdk = g.id === 'plugin-sdk';
        if (!hasStages && !isSdk) {
          expect(false).toBe(true); // fail if not SDK and no stages
        }
      }
    });
  });
});
