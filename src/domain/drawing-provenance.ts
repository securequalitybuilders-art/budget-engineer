export type ProvenanceSource = 'user' | 'imported' | 'derived' | 'assumed';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface DrawingProvenance {
  source: ProvenanceSource;
  confidence: ConfidenceLevel;
  note?: string;
}

export type SiteBoundaryMode = 'verified' | 'assumed' | 'none';

export const USER_PROVENANCE: DrawingProvenance = {
  source: 'user',
  confidence: 'high',
};

export const DERIVED_PROVENANCE: DrawingProvenance = {
  source: 'derived',
  confidence: 'medium',
  note: 'Procedurally inferred from building model — verify before use',
};

export const ASSUMED_PROVENANCE: DrawingProvenance = {
  source: 'assumed',
  confidence: 'low',
  note: 'Assumed from rules-based logic — not survey-grade',
};

export const SITE_ASSUMED_PROVENANCE: DrawingProvenance = {
  source: 'assumed',
  confidence: 'low',
  note: 'Site boundary assumed from setback logic — not survey-grade',
};

export const STRUCTURAL_DERIVED_PROVENANCE: DrawingProvenance = {
  source: 'derived',
  confidence: 'medium',
  note: 'Foundation/structure inferred from wall data — structural review required',
};

export const MEP_PRE_DESIGN_PROVENANCE: DrawingProvenance = {
  source: 'derived',
  confidence: 'low',
  note: 'Pre-design MEP layout — not final circuit/pipe engineering',
};

export const CEILING_ASSUMED_PROVENANCE: DrawingProvenance = {
  source: 'assumed',
  confidence: 'low',
  note: 'Ceiling grid and fixture placement are rules-based — not coordination-grade',
};

export const ROOF_DERIVED_PROVENANCE: DrawingProvenance = {
  source: 'derived',
  confidence: 'medium',
  note: 'Roof geometry inferred from footprint — verify roof type with designer',
};

export const ROOF_ASSUMED_PROVENANCE: DrawingProvenance = {
  source: 'assumed',
  confidence: 'low',
  note: 'Roof pitch and structure assumed — not engineered',
};

export const ELEVATION_DERIVED_PROVENANCE: DrawingProvenance = {
  source: 'derived',
  confidence: 'medium',
  note: 'Elevation derived from plan geometry — verify with survey',
};

export const SECTION_DERIVED_PROVENANCE: DrawingProvenance = {
  source: 'derived',
  confidence: 'medium',
  note: 'Section derived from plan and structural assumptions',
};

export const SCHEDULE_DERIVED_PROVENANCE: DrawingProvenance = {
  source: 'derived',
  confidence: 'medium',
  note: 'Schedule data from canonical building model — verify quantities',
};

export function provenanceLabel(prov: DrawingProvenance | undefined): string {
  if (!prov || prov.source === 'user') return '';
  return prov.source === 'assumed' ? 'ASSUMED'
    : prov.source === 'derived' ? 'DERIVED'
    : 'IMPORTED';
}

export function provenanceConfidenceColor(prov: DrawingProvenance | undefined): string {
  if (!prov || prov.source === 'user') return '#22c55e';
  return prov.confidence === 'low' ? '#ef4444'
    : prov.confidence === 'medium' ? '#f59e0b'
    : '#22c55e';
}
