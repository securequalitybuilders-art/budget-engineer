export interface TypologySite {
  minPlotM2?: number
  maxCoveragePct?: number
  far?: number
  frontSetbackM?: number
  sideSetbackM?: number
}

export interface TypologyStructure {
  wallSystem?: string
  roofSystem?: string
  foundation?: string
  floorHeightM?: number
  structuralFrame?: string
}

export interface Typology {
  id: string
  displayName: string
  aliases: string[]
  sans10400Class: string
  zbcClass: string
  defaultStoreys: number
  defaultProgram: ProgramItem[]
  minRoomDimensions: Record<string, { minWidth: number; minDepth: number }>
  notes: string
  maxStructuralSpan: number
  site?: TypologySite
  structure?: TypologyStructure
  fireResistanceMin?: number
  maxTravelDistanceM?: number
  adjacencyRules?: AdjacencyRule[]
  structuralGrid?: StructuralGrid
  coreType?: CoreType
  floorPlateEfficiency?: number
}

export interface ProgramItem {
  name: string
  count: number
  areaM2: number
  zone?: 'public' | 'private' | 'service' | 'circulation'
  isWetCore?: boolean
}

export interface ClimateZone {
  id: string
  name: string
  cities: string[]
  altitudeM: number
  tempRange: string
  strategy: {
    orientation: string
    shadingDepth: string
    thermalMass: string
    ventilation: string
  }
}

export interface HeritagePattern {
  id: string
  name: string
  keywords: string[]
  culturalContext: string
  designImplications: string[]
}

export interface SiteInfo {
  widthM: number | null
  depthM: number | null
  areaM2: number | null
  aspect: string | null
}

export interface Constraints {
  budgetCents: number | null
  budgetUsd: number | null
  timeline: string | null
  materials: string[]
}

export interface QualityGate {
  passed: boolean
  score: number
  issues: QualityIssue[]
  recommendations: string[]
}

export interface QualityIssue {
  severity: 'error' | 'warning' | 'info'
  message: string
}

export interface AdjacencyRule {
  from: string
  to: string
  weight: number
  must?: boolean
}

export interface StructuralGrid {
  spanX: number
  spanY: number
  offsetX?: number
  offsetY?: number
}

export type CoreType = 'central' | 'side' | 'dual'

export interface CoreBlock {
  roomIds: string[]
  x: number
  y: number
  width: number
  height: number
}

export interface CoreLayout {
  coreType: CoreType
  blocks: CoreBlock[]
  x: number
  y: number
}

export interface FloorPlateMetrics {
  totalAreaM2: number
  programAreaM2: number
  circulationAreaM2: number
  coreAreaM2: number
  efficiency: number
  grid: StructuralGrid
  columns: number
  rows: number
}

export interface AdjacencyGraphModel {
  rules: AdjacencyRule[]
  satisfiedWeight: number
  totalWeight: number
  score: number
  satisfied: AdjacencyRule[]
  violated: AdjacencyRule[]
  edges: Array<{ from: string; to: string; weight: number; satisfied: boolean }>
}

export interface Tier1ParsedBrief {
  rawText: string
  typology: Typology | null
  typologyConfidence: number
  climateZone: ClimateZone | null
  heritagePattern: HeritagePattern | null
  siteInfo: SiteInfo
  program: ProgramItem[]
  constraints: Constraints
  qualityGate: QualityGate | null
}
