import type { ValidationDomain, ValidationResultStatus } from '@/lib/validation/validationEngine';
import type { PilotDeploymentTier } from '@/lib/validation/pilotReadinessEvaluator';
import type { ReferenceTypology, StoreyProfile, WorkflowScope, CalibrationMarker } from '@/lib/reference/referenceCaseModel';

export interface AssessedProjectSnapshot {
  projectName: string;
  typology: ReferenceTypology;
  storeyProfile: StoreyProfile;
  workflowScope: WorkflowScope[];
  packageScope: string[];
  lifecycleScope: string[];
  notes: string;
}

export interface SelfAssessedDomainRating {
  domain: ValidationDomain;
  rating: 'strong' | 'adequate' | 'weak' | 'not-rated';
  status: ValidationResultStatus;
  reason: string;
  calibration: CalibrationMarker;
}

export interface MatchedReferenceCase {
  caseId: string;
  caseName: string;
  similarityScore: number;
  typologyMatch: boolean;
  storeyMatch: boolean;
  workflowMatch: number;
  gaps: string[];
  strengths: string[];
}

export interface SelfAssessmentSupervisionSummary {
  recommendedTier: PilotDeploymentTier;
  tierLabel: string;
  tierDescription: string;
  rationale: string;
  supervisionRequirements: string[];
  humanReviewCount: number;
  mandatoryReviewAreas: string[];
}

export interface SelfAssessmentRiskArea {
  area: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  calibration: CalibrationMarker;
  recommendation: string;
}

export interface SelfAssessmentDeploymentContext {
  recommendedFor: string[];
  notRecommendedFor: string[];
  limitations: string[];
}

export interface SelfAssessmentResult {
  snapshot: AssessedProjectSnapshot;
  domainRatings: SelfAssessedDomainRating[];
  matchedCases: MatchedReferenceCase[];
  supervision: SelfAssessmentSupervisionSummary;
  risks: SelfAssessmentRiskArea[];
  deploymentContext: SelfAssessmentDeploymentContext;
  generatedAt: string;
}

export const SELF_ASSESSMENT_CALIBRATION_ORDER: CalibrationMarker[] = [
  'confirmed-behavior',
  'heuristic-output',
  'assumed-value',
  'unverified-before-construction',
];
