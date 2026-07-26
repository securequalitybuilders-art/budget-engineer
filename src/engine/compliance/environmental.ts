import type { ComplianceInput, ComplianceResult, ComplianceStatus } from './types'

function r(ruleId: string, title: string, status: ComplianceStatus, actual: string, required: string, note: string): ComplianceResult {
  return { ruleId, category: 'Environmental / Energy', title, status, actual, required, note }
}

function getGfa(input: ComplianceInput): number {
  return input.design?.grossFloorArea ?? input.analysis?.areaSchedule?.grossFloorArea ?? 0
}

export function evaluateEnvironmentalRules(input: ComplianceInput, prefix: string, jurisdictionLabel: string): ComplianceResult[] {
  const suffix = `. Approximate — verify with local authority (${jurisdictionLabel}).`
  const gfa = getGfa(input)
  const analysis = input.analysis
  const daylight = analysis?.daylight
  const envelope = analysis?.envelope
  const results: ComplianceResult[] = []

  // ENV-01: Minimum wall insulation
  const wallTarget = envelope?.wall?.targetUValue ?? null
  const wallU = envelope?.wall?.uValue
  if (wallU != null && wallU > 0) {
    const target = wallTarget ?? 0.57
    results.push(r(
      `${prefix}-env-01`, 'Wall insulation / thermal resistance',
      wallU <= target ? 'pass' : 'fail',
      `U = ${wallU.toFixed(3)} W/m²K`, `≤ ${target.toFixed(2)} W/m²K`,
      wallU <= target ? `Wall U-value ${wallU.toFixed(3)} within limit${suffix}` : `Wall U-value ${wallU.toFixed(3)} exceeds ${target.toFixed(2)} — improve insulation or specify insulated wall panels${suffix}`
    ))
  } else {
    results.push(r(`${prefix}-env-01`, 'Wall insulation / thermal resistance', 'warn', 'Not computed', `≤ ${(wallTarget ?? 0.57).toFixed(2)} W/m²K`, `Specify wall construction to verify thermal performance. Typical target U-value ${(wallTarget ?? 0.57).toFixed(2)} W/m²K${suffix}`))
  }

  // ENV-02: Roof insulation
  const roofTarget = envelope?.roof?.targetUValue ?? null
  const roofU = envelope?.roof?.uValue
  if (roofU != null && roofU > 0) {
    const target = roofTarget ?? 0.35
    results.push(r(
      `${prefix}-env-02`, 'Roof insulation / thermal resistance',
      roofU <= target ? 'pass' : 'fail',
      `U = ${roofU.toFixed(3)} W/m²K`, `≤ ${target.toFixed(2)} W/m²K`,
      roofU <= target ? `Roof U-value ${roofU.toFixed(3)} within limit${suffix}` : `Roof U-value ${roofU.toFixed(3)} exceeds ${target.toFixed(2)} — increase ceiling/roof insulation${suffix}`
    ))
  } else {
    results.push(r(`${prefix}-env-02`, 'Roof insulation / thermal resistance', 'warn', 'Not computed', `≤ ${(roofTarget ?? 0.35).toFixed(2)} W/m²K`, `Specify roof construction to verify thermal performance. Target U-value ${(roofTarget ?? 0.35).toFixed(2)} W/m²K${suffix}`))
  }

  // ENV-03: Daylight factor
  if (daylight?.averageDaylightFactor != null) {
    results.push(r(
      `${prefix}-env-03`, 'Minimum daylight factor (habitable rooms)',
      daylight.passes ? 'pass' : 'fail',
      `${daylight.averageDaylightFactor.toFixed(1)}% average`, '≥ 2% (habitable rooms)',
      daylight.passes ? `Average daylight factor ${daylight.averageDaylightFactor.toFixed(1)}% meets 2% target${suffix}` : `Average daylight factor ${daylight.averageDaylightFactor.toFixed(1)}% below 2% — increase window area or light wells${suffix}`
    ))
  } else {
    results.push(r(`${prefix}-env-03`, 'Minimum daylight factor (habitable rooms)', 'warn', 'Not computed', '≥ 2% average', `Run design with window openings to compute daylight factor${suffix}`))
  }

  // ENV-04: Natural ventilation
  if (daylight?.glazingToFloorRatio != null) {
    const ventRatio = daylight.glazingToFloorRatio * 0.5
    results.push(r(
      `${prefix}-env-04`, 'Natural ventilation (operable openings)',
      ventRatio >= 0.05 ? 'pass' : 'warn',
      `Est. ${(ventRatio * 100).toFixed(1)}% vent/floor ratio`, '≥ 5% openable area',
      ventRatio >= 0.05 ? `Estimated operable area ${(ventRatio * 100).toFixed(1)}% meets 5% minimum${suffix}` : `Estimated operable area ${(ventRatio * 100).toFixed(1)}% below 5% — increase openable window area${suffix}`
    ))
  }

  // ENV-05: Energy demand (heating/cooling estimate)
  if (analysis?.energy) {
    const totalEnergy = analysis.energy.annualHeatingDemandKwh + analysis.energy.annualCoolingDemandKwh
    const perM2 = gfa > 0 ? totalEnergy / gfa : 0
    results.push(r(
      `${prefix}-env-05`, 'Estimated energy demand',
      'warn',
      `${totalEnergy.toFixed(0)} kWh/yr (${perM2.toFixed(1)} kWh/m²/yr)`,
      'Varies by climate zone — < 100 kWh/m²/yr target',
      `Estimated annual energy demand ${totalEnergy.toFixed(0)} kWh. Passive design measures (orientation, insulation, shading) can reduce loads. Verify with energy model${suffix}`
    ))
  }

  // ENV-06: Solar orientation / passive design
  results.push(r(
    `${prefix}-env-06`, 'Solar orientation / passive design',
    'warn', gfa > 0 ? `${gfa.toFixed(0)} m² building` : 'Not specified',
    'Main glazing oriented north (S. Hemisphere) within 20°',
    `Maximise north-facing glazing (within 20° of true north in Southern Hemisphere) for passive solar gain. Minimise east/west glazing. Provide shading to north glazing. Verify with energy consultant${suffix}`
  ))

  // ENV-07: Rainwater harvesting provision
  const roofArea = gfa * 0.7
  if (gfa > 0) {
    results.push(r(
      `${prefix}-env-07`, 'Rainwater harvesting provision',
      'warn',
      `Est. ${roofArea.toFixed(0)} m² roof catchment`,
      'Rainwater tank recommended (min 2500L residential)',
      `Estimated roof catchment area ${roofArea.toFixed(0)}m². Rainwater harvesting recommended: minimum 2500L tank for residential, larger for commercial. Water for garden/flushing. Verify with local by-laws${suffix}`
    ))
  }

  return results
}
