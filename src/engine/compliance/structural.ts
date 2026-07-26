import type { ComplianceInput, ComplianceResult, ComplianceStatus } from './types'

function r(ruleId: string, title: string, status: ComplianceStatus, actual: string, required: string, note: string): ComplianceResult {
  return { ruleId, category: 'Structural', title, status, actual, required, note }
}

function getIsNonResidential(bt: string): boolean {
  return !['house', 'apartment', 'townhouse', 'dwelling'].includes(bt)
}

function getGfa(input: ComplianceInput): number {
  return input.design?.grossFloorArea ?? input.analysis?.areaSchedule?.grossFloorArea ?? 0
}

function countStoreys(_input: ComplianceInput): number {
  return 1
}

export function evaluateStructuralRules(input: ComplianceInput, prefix: string, jurisdictionLabel: string): ComplianceResult[] {
  const bt = input.buildingType || 'house'
  const isNonRes = getIsNonResidential(bt)
  const gfa = getGfa(input)
  const storeys = countStoreys(input)
  const suffix = `. Approximate — verify with local authority (${jurisdictionLabel}).`

  const results: ComplianceResult[] = []

  // STRUC-01: Minimum slab thickness
  const minSlab = isNonRes ? 200 : 150
  const walls = input.plan?.walls ?? []
  const openings = input.plan?.openings ?? []
  const maxOpeningWidth = openings.length > 0 ? Math.max(...openings.map((o) => o.width)) : 0

  results.push(r(
    `${prefix}-struc-01`, 'Minimum slab thickness',
    'warn', `${isNonRes ? 'Non-residential' : 'Residential'} (est.)`, `≥ ${minSlab} mm`,
    `Assume ${minSlab}mm slab for ${isNonRes ? 'commercial' : 'residential'} typology. Verify actual slab thickness with structural engineer — depends on span, loading, and fire rating${suffix}`
  ))

  // STRUC-02: Concrete cover
  results.push(r(
    `${prefix}-struc-02`, 'Concrete cover to reinforcement',
    'warn', 'Not verified from plan data', 'Foundations ≥ 40mm, slabs ≥ 25mm, external ≥ 40mm',
    `Minimum concrete cover depends on exposure class (XC1-XC4). Assume 25mm for internal slabs, 40mm for external and foundations. Verify with structural engineer${suffix}`
  ))

  // STRUC-03: Minimum column size
  results.push(r(
    `${prefix}-struc-03`, 'Minimum column size',
    'warn', 'Column sizes not in plan data', '≥ 230 mm (225 mm masonry)',
    `Minimum practical column size is 230mm (concrete) or 225mm (masonry). Smaller sections may be acceptable for steel (UC 152×152). Verify with structural engineer${suffix}`
  ))

  // STRUC-04: Minimum beam depth
  results.push(r(
    `${prefix}-struc-04`, 'Minimum beam depth (span/12)',
    'warn', 'Beam spans not in plan data', 'Depth ≥ span/12',
    `Reinforced concrete beams: depth ≈ span/12 (simply supported) or span/14 (continuous). Minimum practical depth is 300mm. Verify with structural engineer${suffix}`
  ))

  // STRUC-05: Minimum footing depth
  const isMultiStorey = storeys > 1
  results.push(r(
    `${prefix}-struc-05`, 'Minimum footing depth',
    'warn', isMultiStorey ? 'Multi-storey (est.)' : 'Single storey (est.)',
    'Strip ≥ 450mm deep, pad ≥ 200mm',
    isMultiStorey
      ? `Multi-storey building. Strip footings minimum 450mm depth, pad footings minimum 200mm. Depth depends on load and soil bearing capacity. Verify with structural engineer${suffix}`
      : `Single storey. Strip footings minimum 450mm depth. Verify with structural engineer${suffix}`
  ))

  // STRUC-06: DPC provision
  results.push(r(
    `${prefix}-struc-06`, 'Damp-proof course (DPC) provision',
    'warn', 'DPC not in plan data', 'DPC at 150mm above ground level',
    `DPC required at minimum 150mm above finished ground level in all external walls. Cavity trays at openings. Verify compliance with building code${suffix}`
  ))

  // STRUC-07: Lintel provision for openings > 1.2m
  if (maxOpeningWidth > 1.2) {
    results.push(r(
      `${prefix}-struc-07`, 'Lintel provision for openings > 1.2m',
      'warn', `${openings.filter((o) => o.width > 1.2).length} opening(s) > 1.2m`,
      'Provide reinforced concrete or steel lintels',
      `${openings.filter((o) => o.width > 1.2).length} opening(s) exceed 1.2m width. Provide RC or steel lintels with minimum 150mm bearing each side. Verify with structural engineer${suffix}`
    ))
  } else {
    results.push(r(`${prefix}-struc-07`, 'Lintel provision for openings > 1.2m', 'pass', maxOpeningWidth > 0 ? `Max opening ${(maxOpeningWidth * 1000).toFixed(0)}mm` : 'No openings', 'Lintels for openings > 1.2m', `No openings exceed 1.2m — standard lintels adequate${suffix}`))
  }

  // STRUC-08: Wall slenderness (load-bearing)
  if (walls.length > 0) {
    const wallThicknesses = walls.map((w) => w.thickness)
    const avgThickness = wallThicknesses.reduce((a, b) => a + b, 0) / wallThicknesses.length
    const hOverT = 3.0 / avgThickness
    results.push(r(
      `${prefix}-struc-08`, 'Wall slenderness (load-bearing)',
      hOverT <= 12 ? 'pass' : 'warn',
      `H/t ≈ ${hOverT.toFixed(1)} (avg thickness ${(avgThickness * 1000).toFixed(0)}mm)`,
      'H/t ≤ 12 for load-bearing walls',
      hOverT <= 12 ? `Wall slenderness ratio ${hOverT.toFixed(1)} within limit${suffix}` : `Wall slenderness ratio ${hOverT.toFixed(1)} exceeds 12 — consider thicker walls or intermediate lateral support${suffix}`
    ))
  } else {
    results.push(r(`${prefix}-struc-08`, 'Wall slenderness (load-bearing)', 'warn', 'No wall data', 'H/t ≤ 12', `Add walls to the plan for slenderness check${suffix}`))
  }

  // STRUC-09: Roof truss spacing
  results.push(r(
    `${prefix}-struc-09`, 'Roof truss spacing',
    'warn', 'Truss spacing not in plan data', 'Timber ≤ 800mm c/c, Steel ≤ 1200mm c/c',
    `Timber trusses typically at 600-800mm centers. Steel trusses up to 1200mm. Spacing depends on roof covering, span, and loading. Verify with structural engineer${suffix}`
  ))

  // STRUC-10: Rebar grade
  results.push(r(
    `${prefix}-struc-10`, 'Reinforcement grade',
    'warn', 'Rebar grade not specified', 'Minimum Y300 (300 MPa) per SANS 920',
    `Minimum reinforcement grade is usually 300 MPa (Y300) or 450 MPa (Y450). Higher grades reduce steel area. Specify grade on structural drawings. Verify with structural engineer${suffix}`
  ))

  // STRUC-11: Soil bearing capacity (geotechnical)
  if (storeys > 2 || isNonRes) {
    results.push(r(
      `${prefix}-struc-11`, 'Geotechnical investigation',
      'warn', isNonRes ? 'Non-residential building' : `${storeys}-storey building`,
      'Geotechnical report required for >2 storeys or non-residential',
      `Geotechnical investigation recommended for this building type. Soil bearing capacity typically 100-300 kPa depending on soil class. Verify with geotechnical engineer${suffix}`
    ))
  } else {
    results.push(r(`${prefix}-struc-11`, 'Geotechnical investigation', 'pass', 'Single-storey residential', 'Required for >2 storeys or non-residential', `Single-storey residential — prescriptive foundations may be acceptable, but geotech still recommended${suffix}`))
  }

  // STRUC-12: Wind uplift tie-down
  if (gfa > 0) {
    results.push(r(
      `${prefix}-struc-12`, 'Wind uplift / tie-down restraint',
      'warn', `${gfa.toFixed(0)} m² building`, 'Hold-down ties per SANS 10160 Part 3',
      `Roof structure requires tie-down restraint against wind uplift. Straps at max 1.2m spacing connecting trusses to wall plates and wall plates to foundations. Verify with structural engineer${suffix}`
    ))
  }

  // STRUC-13: Expansion joints
  const buildingLength = gfa > 0 ? Math.sqrt(gfa) * 2 : 0
  if (buildingLength > 30) {
    results.push(r(
      `${prefix}-struc-13`, 'Expansion / movement joints',
      'warn', `Est. building length ~${buildingLength.toFixed(0)}m`, 'Movement joints at max 30m spacing',
      `Estimated building length ${buildingLength.toFixed(0)}m exceeds 30m. Provide movement joints to accommodate thermal and moisture movement. Typical spacing 20-30m. Verify with structural engineer${suffix}`
    ))
  } else {
    results.push(r(`${prefix}-struc-13`, 'Expansion / movement joints', 'pass', `Est. building length ~${buildingLength.toFixed(0)}m`, 'Joints for >30m length', `Estimated building length ${buildingLength.toFixed(0)}m within 30m limit — movement joints not critical${suffix}`))
  }

  return results
}
