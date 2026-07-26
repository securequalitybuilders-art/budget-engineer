export interface EnergyDemandInput {
  grossFloorArea: number
  envelopeUValue: number
  envelopeArea: number
  heatingDegreeDays?: number
  coolingDegreeDays?: number
  infiltrationRate?: number
  ventilationRate?: number
  internalGains?: number
  efficiencyFactor?: number
}

export interface EnergyDemandResult {
  annualHeatingDemandKwh: number
  annualCoolingDemandKwh: number
  annualHeatingDemandKwhM2: number
  annualCoolingDemandKwhM2: number
  method: 'degree-day-envelope'
  warnings: string[]
}

export const DEFAULT_INFILTRATION_RATE = 0.5
export const DEFAULT_VENTILATION_RATE = 0.5
export const DEFAULT_INTERNAL_GAINS = 5
export const DEFAULT_EFFICIENCY_FACTOR = 0.7
export const DEFAULT_HDD = 1000
export const DEFAULT_CDD = 500

export function estimateEnergyDemand(input: EnergyDemandInput): EnergyDemandResult {
  const warnings: string[] = []

  if (input.grossFloorArea <= 0) {
    return {
      annualHeatingDemandKwh: 0, annualCoolingDemandKwh: 0,
      annualHeatingDemandKwhM2: 0, annualCoolingDemandKwhM2: 0,
      method: 'degree-day-envelope', warnings: ['Gross floor area must be positive'],
    }
  }

  if (input.envelopeArea <= 0) {
    warnings.push('Envelope area must be positive; using floor area as fallback')
  }
  if (input.envelopeUValue <= 0) {
    warnings.push('Envelope U-value must be positive; using 0.5 as fallback')
  }

  const aEnv = input.envelopeArea > 0 ? input.envelopeArea : input.grossFloorArea
  const uVal = input.envelopeUValue > 0 ? input.envelopeUValue : 0.5
  const hdd = input.heatingDegreeDays ?? DEFAULT_HDD
  const cdd = input.coolingDegreeDays ?? DEFAULT_CDD
  const infil = input.infiltrationRate ?? DEFAULT_INFILTRATION_RATE
  const vent = input.ventilationRate ?? DEFAULT_VENTILATION_RATE
  const iGains = input.internalGains ?? DEFAULT_INTERNAL_GAINS
  const eff = input.efficiencyFactor ?? DEFAULT_EFFICIENCY_FACTOR

  if (hdd < 0 || cdd < 0) {
    warnings.push('Degree days values are negative; using defaults')
  }
  if (infil < 0 || vent < 0) {
    warnings.push('Infiltration/ventilation rates are negative; using defaults')
  }

  const safeHdd = hdd >= 0 ? hdd : DEFAULT_HDD
  const safeCdd = cdd >= 0 ? cdd : DEFAULT_CDD
  const safeInfil = infil >= 0 ? infil : DEFAULT_INFILTRATION_RATE
  const safeVent = vent >= 0 ? vent : DEFAULT_VENTILATION_RATE
  const safeEff = eff > 0 ? eff : DEFAULT_EFFICIENCY_FACTOR

  // Envelope conduction loss: Q_cond = U × A_env × DD × 24 / 1000 (kWh)
  const heatCond = Number(((uVal * aEnv * safeHdd * 24) / 1000).toFixed(1))
  const coolCond = Number(((uVal * aEnv * safeCdd * 24) / 1000).toFixed(1))

  // Infiltration/ventilation loss: Q_inf = 0.33 × n × V × DD × 24 / 1000
  //   where 0.33 = ρ × cp (kJ/m³K), n = air changes per hour, V = volume = floor area × 2.7m
  const volume = input.grossFloorArea * 2.7
  const heatInf = Number(((0.33 * safeInfil * volume * safeHdd * 24) / 1000).toFixed(1))
  const coolInf = Number(((0.33 * safeVent * volume * safeCdd * 24) / 1000).toFixed(1))

  // Internal gains offset (subtract from heating, add to cooling)
  const heatGains = Number((iGains * input.grossFloorArea * 24 * 365 / 1000 * safeEff).toFixed(1))

  const annualHeatingDemandKwh = Math.max(0, Number((heatCond + heatInf - heatGains).toFixed(1)))
  const annualCoolingDemandKwh = Number((coolCond + coolInf + heatGains).toFixed(1))

  const flr = input.grossFloorArea
  const annualHeatingDemandKwhM2 = Number((annualHeatingDemandKwh / flr).toFixed(1))
  const annualCoolingDemandKwhM2 = Number((annualCoolingDemandKwh / flr).toFixed(1))

  warnings.push('This is a simplified degree-day envelope estimate — not a detailed energy model')

  return {
    annualHeatingDemandKwh, annualCoolingDemandKwh,
    annualHeatingDemandKwhM2, annualCoolingDemandKwhM2,
    method: 'degree-day-envelope',
    warnings,
  }
}

export const DEFAULTS = { DEFAULT_INFILTRATION_RATE, DEFAULT_VENTILATION_RATE, DEFAULT_INTERNAL_GAINS, DEFAULT_EFFICIENCY_FACTOR, DEFAULT_HDD, DEFAULT_CDD } as const
