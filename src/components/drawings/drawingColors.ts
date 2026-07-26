/**
 * Construction drawing colour system — material fills and discipline annotation colours.
 *
 * Colours follow common architectural/engineering drawing convention
 * (BS 1192 / ISO 13567-2 inspired). Values are indicative — confirm
 * with local authority / by-laws for formal submissions.
 */

// ── Material colours (for poché fills — semi-transparent so linework stays readable) ──
export const MATERIAL = {
  concrete:    { fill: '#c7ccd1', label: 'Concrete',  hatch: 'stipple' },
  brick:       { fill: '#c56a4a', label: 'Brick',     hatch: 'diagonal' },
  earth:       { fill: '#8a6d3b', label: 'Earth',     hatch: 'earth' },
  insulation:  { fill: '#f2d24b', label: 'Insulation',hatch: 'crosshatch' },
  steel:       { fill: '#4a6fa5', label: 'Steel',     hatch: 'solid' },
  glass:       { fill: '#7fd3e0', label: 'Glass',     hatch: 'none' },
  blockwork:   { fill: '#b8bfc6', label: 'Blockwork', hatch: 'diagonal' },
} as const

// ── Discipline colours (for later services layers — defined now for extensibility) ──
export const DISCIPLINE = {
  structural:   { color: '#d94141', label: 'Structural' },
  electrical:   { color: '#e6b800', label: 'Electrical' },
  plumbing:     { color: '#2f6fd1', label: 'Plumbing' },
  hvac:        { color: '#2fae66', label: 'HVAC' },
  architectural: { color: '#1a1a1a', label: 'Architectural' },
  dimensions:   { color: '#6b7280', label: 'Dimensions' },
} as const

// ── Legend arrays (for rendering legend boxes) ──
export type MaterialKey = keyof typeof MATERIAL
export type DisciplineKey = keyof typeof DISCIPLINE

export const MATERIAL_LEGEND: { key: MaterialKey; label: string; color: string }[] =
  Object.entries(MATERIAL).map(([k, v]) => ({ key: k as MaterialKey, label: v.label, color: v.fill }))

export const DISCIPLINE_LEGEND: { key: DisciplineKey; label: string; color: string }[] =
  Object.entries(DISCIPLINE).map(([k, v]) => ({ key: k as DisciplineKey, label: v.label, color: v.color }))
