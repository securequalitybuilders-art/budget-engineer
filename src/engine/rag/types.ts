export interface TableData {
  headers: string[]
  rows: string[][]
  caption?: string
}

export interface CodeSection {
  id: string
  heading: string
  level: number
  text: string
  tables?: TableData[]
  parentId?: string
}

export interface CodeDocument {
  id: string
  title: string
  jurisdiction?: string
  code?: string
  sections: CodeSection[]
}

export interface TextChunk {
  id: string
  docId: string
  sectionId: string
  heading: string
  path: string[]
  text: string
  tables?: TableData[]
  parentId?: string
  docTitle?: string
  docCode?: string
  parentChunkId?: string
  parentText?: string
  chapter?: string
  grade?: string
  embedding?: number[]
}

export interface SearchResult {
  chunkId: string
  docId: string
  sectionId: string
  heading: string
  text: string
  score: number
  path?: string[]
  chapter?: string
  docTitle?: string
  citation?: string
  parentText?: string
  rerankScore?: number
  denseScore?: number
  sparseScore?: number
  grade?: string
}

export type ConstraintOperator = 'min' | 'max' | 'eq'

export interface ConstraintRule {
  id: string
  category: string
  operator: ConstraintOperator
  value: number
  unit: string
  source: string
}

export interface ExtractedConstraint {
  id: string
  clauseRef: string
  rule: ConstraintRule
  sourceText: string
}

export interface CrossReference {
  from: string
  to: string
  context: string
}

export type RagFindingStatus = 'pass' | 'warn' | 'fail'

export interface RagComplianceFinding {
  ruleId: string
  title: string
  status: RagFindingStatus
  actual: string
  required: string
  note: string
  sources: string[]
}

export interface RagComplianceReport {
  query: string
  jurisdiction: string
  findings: RagComplianceFinding[]
  score: number
  totalRules: number
  passedRules: number
  warnings: string[]
  engineUsed: string
  fellBack?: boolean
  fallbackReason?: string
  sources: SearchResult[]
  confidence?: number
  needsClarification?: boolean
}
