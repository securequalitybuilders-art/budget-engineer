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

export interface Tier1ParsedBrief {
  rawText: string
  typology: Typology | null
  typologyConfidence: number
  climateZone: ClimateZone | null
  heritagePattern: HeritagePattern | null
  siteInfo: SiteInfo
  program: ProgramItem[]
  constraints: Constraints
  qualityGate: QualityGate
}
