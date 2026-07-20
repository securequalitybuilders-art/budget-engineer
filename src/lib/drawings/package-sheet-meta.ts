export type PackageDiscipline = 'architectural' | 'structural' | 'mep' | 'interior' | 'site' | 'all';

export type PackageIssueType =
  | 'client-presentation'
  | 'contractor-issue'
  | 'submission-support'
  | 'drawing-review'
  | 'for-construction'
  | 'as-built';

export type PackageSubmissionCategory =
  | 'design-progress'
  | 'tender'
  | 'construction'
  | 'record'
  | 'review';

export const PACKAGE_ISSUE_LABELS: Record<PackageIssueType, string> = {
  'client-presentation': 'Client Presentation',
  'contractor-issue': 'Contractor Issue',
  'submission-support': 'Submission Support',
  'drawing-review': 'Drawing Review',
  'for-construction': 'For Construction',
  'as-built': 'As-Built',
};

export const PACKAGE_SUBMISSION_LABELS: Record<PackageSubmissionCategory, string> = {
  'design-progress': 'Design Progress',
  tender: 'Tender',
  construction: 'Construction',
  record: 'Record',
  review: 'Review',
};

export const PACKAGE_ISSUE_TO_STAGE: Record<PackageIssueType, string> = {
  'client-presentation': 'design-development',
  'contractor-issue': 'for-construction',
  'submission-support': 'technical-submission',
  'drawing-review': 'contractor-review',
  'for-construction': 'for-construction',
  'as-built': 'as-built',
};

export interface PackageIdentity {
  packageId: string;
  packageTitle: string;
  issueType: PackageIssueType;
  submissionCategory: PackageSubmissionCategory;
  packageDiscipline: PackageDiscipline;
  issueNumber: string;
  revision: string;
}

export interface PackageSheetMeta {
  packageId: string;
  packageTitle: string;
  packageDiscipline: PackageDiscipline;
  issueType: PackageIssueType;
  submissionCategory: PackageSubmissionCategory;
  issueDate: string;
  issueStage: string;
  issueNumber: string;
  revision: string;
  projectName: string;
  projectNumber: string;
  client?: string;
  architect?: string;
  generalNotes?: string[];
  packageDescription?: string;
}

export interface DrawingRegisterEntry {
  drawingNumber: string;
  title: string;
  revision: string;
  scale: string;
  status: string;
  discipline: string;
  sheetNumber: string;
}

export interface RevisionEntry {
  revision: string;
  purpose: string;
  date: string;
  description: string;
  author?: string;
}

export interface ApprovalSignature {
  role: string;
  name: string;
  date: string;
  signed: boolean;
}

export interface CoverBranding {
  logoPlaceholder?: string;
  firmName?: string;
  firmAddress?: string;
}

export interface CoverSheetContent {
  projectName: string;
  projectNumber: string;
  client?: string;
  architect?: string;
  issueDate: string;
  issueStage: string;
  issueNumber: string;
  packageTitle: string;
  packageDescription?: string;
  sheetList: { sheetNumber: string; title: string }[];
  generalNotes: string[];
  revisionHistory: RevisionEntry[];
  branding?: CoverBranding;
  approvals?: ApprovalSignature[];
  disclaimer?: string;
  projectAddress?: string;
}

export interface DrawingRegisterContent {
  projectName: string;
  projectNumber: string;
  entries: DrawingRegisterEntry[];
  revisionHistory: RevisionEntry[];
}
