import type { ClimateZone } from './tier1-types'

const ZONES: ClimateZone[] = [
  {
    id: 'HARARE_Highveld',
    name: 'Harare Highveld',
    cities: ['harare', 'chitungwiza', 'epworth', 'norton', 'marondera', 'rusape', 'nyanga', 'murewa'],
    altitudeM: 1480,
    tempRange: '5–32°C',
    strategy: {
      orientation: 'North-facing main living areas; long axis east–west to minimise east/west solar gain',
      shadingDepth: 'Moderate — eaves 0.6–0.9 m or fixed horizontal louvers on north facade',
      thermalMass: 'High — brick cavity walls or concrete floors to absorb daytime heat and release at night',
      ventilation: 'Cross-ventilation via operable windows; high-level vents for hot air escape',
    },
  },
  {
    id: 'VICFALLS_Lowveld',
    name: 'Victoria Falls Lowveld',
    cities: ['victoria falls', 'hwange', 'kariba', 'binga', 'mwenezi', 'chiredzi', 'chipinge lowveld', 'beitbridge'],
    altitudeM: 900,
    tempRange: '10–40°C',
    strategy: {
      orientation: 'Minimise east/west glazing; shade all windows; long axis north–south preferred',
      shadingDepth: 'Deep — eaves 1.2–1.5 m, verandas, covered walkways, external shade screens',
      thermalMass: 'Medium — lightweight structure with reflective roof; thermal mass in floor only',
      ventilation: 'Deep cross-ventilation essential; high roof ventilators; stack-effect chimneys; insect screening',
    },
  },
  {
    id: 'MUTARE_EasternHighlands',
    name: 'Mutare Eastern Highlands',
    cities: ['mutare', 'penhalonga', 'chimanimani', 'chipinge', 'honde valley', 'nyanga highlands'],
    altitudeM: 1120,
    tempRange: '8–28°C',
    strategy: {
      orientation: 'North-east orientation to capture morning sun; protect from prevailing south-east mist',
      shadingDepth: 'Moderate — eaves 0.6 m; additional protection on windward (south-east) side',
      thermalMass: 'Medium — brick cavity walls; raised timber floors in high-rainfall areas',
      ventilation: 'Cross-ventilation; mist protection on south-east facade; low-level vents for cool air intake',
    },
  },
  {
    id: 'BULAWAYO_Midlands',
    name: 'Bulawayo Midlands',
    cities: ['bulawayo', 'gwanda', 'filabusi', 'plumtree', 'gweru', 'kwekwe', 'kadoma', 'chegutu', 'masvingo'],
    altitudeM: 1350,
    tempRange: '6–33°C',
    strategy: {
      orientation: 'North-facing living areas; protect from hot north-west afternoon sun',
      shadingDepth: 'Moderate-to-deep — eaves 0.8–1.0 m; verandas on north-west side',
      thermalMass: 'High — dense brick or concrete construction; insulated roof',
      ventilation: 'Cross-ventilation; night-purging in summer; winter sun passive heating via north windows',
    },
  },
  {
    id: 'GENERIC_Zimbabwe',
    name: 'Generic Zimbabwe',
    cities: ['zimbabwe', 'zimbabwean'],
    altitudeM: 1200,
    tempRange: '5–35°C',
    strategy: {
      orientation: 'North-facing main spaces; minimise east/west exposure',
      shadingDepth: 'Moderate — eaves 0.6 m minimum on all facades',
      thermalMass: 'Medium — standard brick-and-block construction with insulated roof',
      ventilation: 'Cross-ventilation through all habitable rooms; high-level roof vents',
    },
  },
]

function detectClimate(text: string): ClimateZone {
  const lower = text.toLowerCase()
  let best: ClimateZone | null = null
  let maxMatches = 0

  for (const zone of ZONES) {
    let matches = 0
    for (const city of zone.cities) {
      if (lower.includes(city)) matches++
    }
    if (matches > maxMatches) {
      maxMatches = matches
      best = zone
    }
  }

  return best ?? ZONES[ZONES.length - 1] // fallback to GENERIC
}

export { ZONES, detectClimate }
