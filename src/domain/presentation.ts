export type BoardCellType = 'drawing' | 'snapshot' | 'text' | 'legend' | 'title-block'

export interface BoardCell {
  id: string
  type: BoardCellType
  x: number
  y: number
  w: number
  h: number
  label: string
  contentId?: string
  snapshotRefId?: string
}

export type AnnotationKind = 'textbox' | 'callout' | 'dimension' | 'freehand'

export interface BoardAnnotation {
  id: string
  kind: AnnotationKind
  x: number
  y: number
  w?: number
  h?: number
  text?: string
  color: string
  strokeWidth: number
  points?: Array<{ x: number; y: number }>
}

export interface BoardSnapshotRef {
  id: string
  name: string
  dataUrl: string
  width: number
  height: number
  capturedAt: number
}

export interface PresentationBoard {
  id: string
  projectId: string
  name: string
  sheetSize: 'A1' | 'A0'
  landscape: boolean
  cells: BoardCell[]
  annotations: BoardAnnotation[]
  snapshots: BoardSnapshotRef[]
  templateId: string
  createdAt: number
  updatedAt: number
}

export type BoardTemplateId = 'concept' | 'design-development' | 'planning'
