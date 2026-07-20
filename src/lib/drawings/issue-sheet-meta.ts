export type IssueStage = 'design-development' | 'technical-submission' | 'contractor-review' | 'for-construction' | 'as-built';

export type SheetMode = 'technical' | 'presentation';

export interface IssueMeta {
  issueDate: string;
  stage: IssueStage;
  issueNumber: string;
  notes?: string;
}

export interface SheetSetMeta {
  projectName: string;
  projectNumber: string;
  client?: string;
  architect?: string;
  issue: IssueMeta;
  mode: SheetMode;
  sheets: SheetMeta[];
}

export interface SheetMeta {
  sheetId: string;
  sheetNumber: string;
  sheetTitle: string;
  drawingNumber: string;
  revision: string;
  scale?: string;
  date?: string;
  drawnBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  description?: string;
  templateId: string;
  views: ViewSlotAssignment[];
}

export interface ViewSlotAssignment {
  slotId: string;
  viewId: string;
  label: string;
  floorId?: string;
  config?: Record<string, unknown>;
}
