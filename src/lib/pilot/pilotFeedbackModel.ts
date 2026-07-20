export type PilotSeverity = 'blocker' | 'major' | 'minor' | 'observation' | 'enhancement';

export type PilotStatus =
  | 'new'
  | 'under-review'
  | 'action-planned'
  | 'resolved'
  | 'accepted-limitation'
  | 'deferred';

export type PilotDomain =
  | 'geometry-generation'
  | 'drawings-package'
  | 'boq-procurement'
  | 'delivery-lifecycle'
  | 'validation-reporting'
  | 'deployment-evaluation-ux';

export type PilotSessionStatus = 'active' | 'paused' | 'closed';

export type PilotDeploymentTier = 'blocked' | 'internal-only' | 'supervised-professional' | 'pilot-deployment';

export interface PilotAttachmentRef {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  description: string;
  storedAt: string;
}

export interface PilotReadinessContext {
  tier: PilotDeploymentTier;
  tierLabel: string;
  tierDescription: string;
  benchmarkScore: number;
  totalBenchmarks: number;
  passedBenchmarks: number;
  failedBenchmarks: number;
  validationFailures: number;
  validationWarnings: number;
  openWeaknesses: number;
  regressionsDetected: number;
  readinessReason: string;
  readinessBlockers: string[];
  readinessWarnings: string[];
  evaluationRef: string;
}

export interface PilotObservation {
  id: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
  severity: PilotSeverity;
  domain: PilotDomain;
  status: PilotStatus;
  evidenceRef: string;
  recommendation: string;
  reviewerName: string;
  reviewerRole: string;
  followUpAction: string;
  followUpAssignee: string;
  resolutionNotes: string;
  tags: string[];
  recurringIssueKey: string;
  attachments: PilotAttachmentRef[];
}

export interface PilotSession {
  id: string;
  projectId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string | null;
  status: PilotSessionStatus;
  leadReviewer: string;
  teamMembers: string[];
  notes: string;
  readinessContext: PilotReadinessContext | null;
}

export type PilotCloseoutRecommendation =
  | 'continue'
  | 'pause'
  | 'close-with-followups'
  | 'close-resolved';

export const SEVERITY_LABELS: Record<PilotSeverity, string> = {
  blocker: 'Blocker',
  major: 'Major',
  minor: 'Minor',
  observation: 'Observation',
  enhancement: 'Enhancement',
};

export const SEVERITY_ORDER: PilotSeverity[] = [
  'blocker', 'major', 'minor', 'observation', 'enhancement',
];

export const STATUS_LABELS: Record<PilotStatus, string> = {
  'new': 'New',
  'under-review': 'Under Review',
  'action-planned': 'Action Planned',
  'resolved': 'Resolved',
  'accepted-limitation': 'Accepted Limitation',
  'deferred': 'Deferred',
};

export const DOMAIN_LABELS: Record<PilotDomain, string> = {
  'geometry-generation': 'Geometry / Generation',
  'drawings-package': 'Drawings / Package',
  'boq-procurement': 'BOQ / Procurement',
  'delivery-lifecycle': 'Delivery / Lifecycle',
  'validation-reporting': 'Validation / Reporting',
  'deployment-evaluation-ux': 'Deployment / Evaluation UX',
};

export function generateId(): string {
  return `pilot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
