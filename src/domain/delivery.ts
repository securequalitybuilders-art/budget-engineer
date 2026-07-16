export type IssueState = 'draft' | 'in-progress' | 'for-review' | 'for-construction' | 'as-built' | 'archived';
export type SheetStatus = 'preliminary' | 'for-review' | 'revised' | 'for-construction' | 'as-built' | 'superseded';
export type PackageType = 'issue-for-review' | 'issue-for-construction' | 'as-built' | 'transmittal' | 'tender';

export interface RevisionEntry {
  id: string;
  revisionNumber: string;
  date: string;
  description: string;
  author: string;
  checker: string;
  approver: string;
  status: SheetStatus;
}

export interface SheetInfo {
  id: string;
  sheetNumber: string;
  sheetTitle: string;
  discipline: string;
  scale: string;
  size: string;
  status: SheetStatus;
  revisions: RevisionEntry[];
  currentRevision: string;
  createdBy: string;
  checkedBy: string;
  approvedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DrawingRegisterEntry {
  sheetId: string;
  sheetNumber: string;
  sheetTitle: string;
  discipline: string;
  status: SheetStatus;
  revision: string;
  date: string;
  fileRef: string;
}

export interface PackageContent {
  type: 'sheet' | 'schedule' | 'boq' | 'report' | 'model' | 'file';
  id: string;
  name: string;
  ref: string;
}

export interface ReleasePackage {
  id: string;
  projectId: string;
  name: string;
  packageType: PackageType;
  description: string;
  contents: PackageContent[];
  revision: string;
  issueDate: string;
  issuedBy: string;
  checkedBy: string;
  approvedBy: string;
  status: 'draft' | 'issued' | 'revised' | 'superseded';
  transmittalNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryProject {
  id: string;
  projectId: string;
  sheets: SheetInfo[];
  packages: ReleasePackage[];
  drawingRegister: DrawingRegisterEntry[];
  currentIssueState: IssueState;
  projectNumber: string;
  clientName: string;
  projectAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureField {
  role: 'prepared' | 'checked' | 'approved' | 'reviewed';
  name: string;
  date: string;
  signature: string;
}
