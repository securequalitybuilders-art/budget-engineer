import type { ValidationDomain } from '@/lib/validation/validationEngine';
import type { PilotDeploymentTier } from '@/lib/pilot/pilotFeedbackModel';

export type WorkflowScope =
  | 'brief-to-plan'
  | 'multi-storey-planning'
  | 'drawing-pack'
  | 'structural-pre-design'
  | 'mep-pre-design'
  | 'code-compliance-check'
  | 'boq-cost-estimation'
  | 'site-analysis'
  | 'interior-documentation'
  | 'delivery-workflow'
  | 'lifecycle-management'
  | 'package-export';

export type StoreyProfile =
  | 'single-storey'
  | 'two-storey'
  | 'multi-storey-3-5'
  | 'multi-storey-6-plus';

export type ReferenceTypology =
  | 'house'
  | 'villa'
  | 'duplex'
  | 'townhouse'
  | 'apartment'
  | 'mixed-use'
  | 'clinic'
  | 'school'
  | 'worship'
  | 'warehouse'
  | 'commercial-office'
  | 'retail';

export type CalibrationMarker =
  | 'confirmed-behavior'
  | 'heuristic-output'
  | 'assumed-value'
  | 'unverified-before-construction';

export interface CalibrationMarkerAnnotation {
  marker: CalibrationMarker;
  label: string;
  description: string;
  prefix: string;
}

export const CALIBRATION_MARKER_ANNOTATIONS: Record<CalibrationMarker, CalibrationMarkerAnnotation> = {
  'confirmed-behavior': {
    marker: 'confirmed-behavior',
    label: 'Confirmed Behavior',
    description: 'This behavior has been consistently verified through benchmark tests and reference case validation.',
    prefix: '[CONFIRMED]',
  },
  'heuristic-output': {
    marker: 'heuristic-output',
    label: 'Heuristic Output',
    description: 'Output is derived from heuristic rules and empirical formulas. Accuracy depends on typology match and input quality.',
    prefix: '[HEURISTIC]',
  },
  'assumed-value': {
    marker: 'assumed-value',
    label: 'Assumed / Project-Specific',
    description: 'Value is assumed based on typical industry defaults or project-specific configuration. Confirm with actual data.',
    prefix: '[ASSUMED]',
  },
  'unverified-before-construction': {
    marker: 'unverified-before-construction',
    label: 'Unverified Before Construction',
    description: 'Output must be independently verified by a qualified professional before construction use.',
    prefix: '[UNVERIFIED-BEFORE-CONSTRUCTION]',
  },
};

export interface CaseOutputExpectation {
  output: string;
  calibration: CalibrationMarker;
  note: string;
}

export interface ValidationLink {
  domain: ValidationDomain;
  benchmarkRefs: string[];
  expectedOutcome: string;
  calibration: CalibrationMarker;
}

export interface HumanReviewArea {
  area: string;
  why: string;
  severity: 'mandatory' | 'recommended' | 'informational';
}

export interface KnownLimitation {
  area: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  status: 'open' | 'mitigated' | 'workaround-available';
}

export interface PilotReadinessExpectation {
  expectedTier: PilotDeploymentTier;
  supervisionContext: string;
  knownRisks: string[];
  supervisionRequirements: string[];
}

export interface ReferenceCase {
  id: string;
  name: string;
  typology: ReferenceTypology;
  storeyProfile: StoreyProfile;
  workflowScope: WorkflowScope[];
  description: string;
  projectIntent: string;
  expectedOutputs: CaseOutputExpectation[];
  validationLinks: ValidationLink[];
  pilotReadiness: PilotReadinessExpectation;
  humanReviewAreas: HumanReviewArea[];
  knownLimitations: KnownLimitation[];
  notes: string;
}

export interface ReferenceCaseSummary {
  caseId: string;
  caseName: string;
  typology: ReferenceTypology;
  storeyProfile: StoreyProfile;
  coverageScore: number;
  readinessTier: PilotDeploymentTier | null;
  humanReviewCount: number;
  limitationCount: number;
  weakDomains: ValidationDomain[];
  recommendedFor: string[];
  notRecommendedFor: string[];
}
