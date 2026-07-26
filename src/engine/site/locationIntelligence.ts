import type { SiteContext, WindRose, AccessEdge, NoiseSource, Point2D } from '@/domain/site'

export interface ClimateZone {
  id: string
  name: string
  description: string
  latRange: [number, number]
  lngRange: [number, number]
  altitudeM: number
  annualRainfallMm: number
  prevailingWindDeg: number
  avgWindSpeed: number
}

const CLIMATE_ZONES: ClimateZone[] = [
  {
    id: 'harare-highveld', name: 'Harare Highveld',
    description: 'High altitude, moderate climate — warm summers, mild winters',
    latRange: [-18.5, -17.5], lngRange: [30.5, 31.5],
    altitudeM: 1500, annualRainfallMm: 850,
    prevailingWindDeg: 180, avgWindSpeed: 4.2,
  },
  {
    id: 'bulawayo-midlands', name: 'Bulawayo Midlands',
    description: 'Semi-arid, moderate — hot summers, cool winters',
    latRange: [-20.5, -19.5], lngRange: [28.0, 29.0],
    altitudeM: 1350, annualRainfallMm: 600,
    prevailingWindDeg: 135, avgWindSpeed: 4.8,
  },
  {
    id: 'victoria-falls', name: 'Victoria Falls Basin',
    description: 'Hot low-lying — high temperatures, distinct wet/dry seasons',
    latRange: [-18.5, -17.5], lngRange: [25.0, 26.5],
    altitudeM: 900, annualRainfallMm: 700,
    prevailingWindDeg: 90, avgWindSpeed: 3.5,
  },
  {
    id: 'mutare-highlands', name: 'Mutare Highlands',
    description: 'Temperate highland — cooler, higher rainfall, mist',
    latRange: [-19.5, -18.5], lngRange: [32.0, 33.0],
    altitudeM: 1600, annualRainfallMm: 1100,
    prevailingWindDeg: 225, avgWindSpeed: 3.8,
  },
  {
    id: 'gweru-midlands', name: 'Gweru Midlands',
    description: 'Central plateau — moderate temperatures, reliable rainfall',
    latRange: [-20.0, -19.0], lngRange: [29.0, 30.5],
    altitudeM: 1400, annualRainfallMm: 650,
    prevailingWindDeg: 180, avgWindSpeed: 4.5,
  },
  {
    id: 'joburg-highveld', name: 'Johannesburg Highveld',
    description: 'High altitude — cool winters, summer rainfall, thin air',
    latRange: [-27.0, -25.5], lngRange: [27.0, 28.5],
    altitudeM: 1750, annualRainfallMm: 750,
    prevailingWindDeg: 180, avgWindSpeed: 5.0,
  },
  {
    id: 'cape-town-mediterranean', name: 'Cape Town Mediterranean',
    description: 'Mediterranean — winter rainfall, moderate year-round',
    latRange: [-34.5, -33.5], lngRange: [18.0, 19.0],
    altitudeM: 50, annualRainfallMm: 500,
    prevailingWindDeg: 315, avgWindSpeed: 6.5,
  },
  {
    id: 'lusaka-plateau', name: 'Lusaka Plateau',
    description: 'High plateau — subtropical, wet summers, dry winters',
    latRange: [-16.0, -14.5], lngRange: [27.5, 29.0],
    altitudeM: 1300, annualRainfallMm: 800,
    prevailingWindDeg: 135, avgWindSpeed: 3.8,
  },
  {
    id: 'gaborone-kalahari', name: 'Gaborone Kalahari Fringe',
    description: 'Semi-arid — hot summers, mild winters, low rainfall',
    latRange: [-25.0, -24.0], lngRange: [25.0, 26.5],
    altitudeM: 1000, annualRainfallMm: 450,
    prevailingWindDeg: 135, avgWindSpeed: 4.0,
  },
]

export function detectClimateZone(lat: number, lng: number): ClimateZone {
  let best = CLIMATE_ZONES[0]
  let bestDist = Infinity
  for (const zone of CLIMATE_ZONES) {
    const cLat = (zone.latRange[0] + zone.latRange[1]) / 2
    const cLng = (zone.lngRange[0] + zone.lngRange[1]) / 2
    const dist = Math.sqrt((lat - cLat) ** 2 + (lng - cLng) ** 2)
    if (dist < bestDist) {
      bestDist = dist
      best = zone
    }
  }
  return best
}

export function calculateSunPosition(
  lat: number,
  _lng: number,
  date: Date = new Date(),
): { azimuth: number; elevation: number } {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)
  const declination = 23.44 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180))
  const hourAngle = 15 * (date.getHours() - 12 + date.getMinutes() / 60 - 0.5)
  const latRad = lat * (Math.PI / 180)
  const decRad = declination * (Math.PI / 180)
  const haRad = hourAngle * (Math.PI / 180)

  const elevationRad = Math.asin(
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad),
  )
  const elevation = elevationRad * (180 / Math.PI)

  const cosAzimuth = (Math.sin(decRad) - Math.sin(latRad) * Math.sin(elevationRad)) /
    (Math.cos(latRad) * Math.cos(elevationRad))
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) * (180 / Math.PI)
  if (hourAngle > 0) azimuth = 360 - azimuth

  return { azimuth: Math.round(azimuth * 10) / 10, elevation: Math.round(elevation * 10) / 10 }
}

export function generateSunPath(lat: number): { time: string; azimuth: number; elevation: number }[] {
  const points: { time: string; azimuth: number; elevation: number }[] = []
  const summerSolstice = new Date(2024, 5, 21)
  const winterSolstice = new Date(2024, 11, 21)
  for (const solstice of [summerSolstice, winterSolstice]) {
    for (let h = 5; h <= 19; h++) {
      const d = new Date(solstice)
      d.setHours(h, 0, 0, 0)
      const pos = calculateSunPosition(lat, 0, d)
      if (pos.elevation > 0) {
        points.push({ time: `${h}:00`, azimuth: pos.azimuth, elevation: pos.elevation })
      }
    }
  }
  return points
}

export function calculateOptimalOrientation(lat: number): number {
  if (lat < 0) {
    return 90
  }
  return 0
}

export function generateWindRose(climate: ClimateZone): WindRose {
  const base = climate.prevailingWindDeg
  const speed = climate.avgWindSpeed
  return {
    sectors: [
      { direction: 0, speed: speed * 0.7, frequency: 0.08 },
      { direction: 45, speed: speed * 0.8, frequency: 0.10 },
      { direction: 90, speed: speed * 0.9, frequency: 0.12 },
      { direction: 135, speed: speed * 1.1, frequency: 0.15 },
      { direction: 180, speed: speed * 1.0, frequency: 0.18 },
      { direction: 225, speed: speed * 0.9, frequency: 0.14 },
      { direction: 270, speed: speed * 0.7, frequency: 0.10 },
      { direction: 315, speed: speed * 0.6, frequency: 0.13 },
    ].map(s => ({
      direction: (s.direction + base) % 360,
      speed: Math.round(s.speed * 10) / 10,
      frequency: Math.round(s.frequency * 100) / 100,
    })),
  }
}

export function generateDefaultAccessEdges(siteDepth: number = 25): AccessEdge[] {
  return [
    { type: 'vehicle', location: [{ x: 0, y: 0 }, { x: 5, y: 0 }], width: 6 },
    { type: 'pedestrian', location: [{ x: 0, y: siteDepth * 0.2 }, { x: 3, y: siteDepth * 0.2 }], width: 1.5 },
  ]
}

export function generateDefaultNoiseSources(): NoiseSource[] {
  return [
    { type: 'road', location: [{ x: 0, y: 0 }, { x: 50, y: 0 }], levelDba: 65 },
  ]
}

export function generateSiteContext(
  projectId: string,
  lat: number,
  lng: number,
  plotWidth: number = 30,
  plotDepth: number = 25,
): SiteContext {
  const climate = detectClimateZone(lat, lng)
  const optimal = calculateOptimalOrientation(lat)

  const now = new Date().toISOString()

  return {
    projectId,
    lat,
    lng,
    orientation: optimal,
    terrain: 'flat',
    adjacentBuildings: [],
    windRose: generateWindRose(climate),
    accessEdges: generateDefaultAccessEdges(plotDepth),
    noiseSources: generateDefaultNoiseSources(),
    plotBoundary: [
      { x: 0, y: 0 },
      { x: plotWidth, y: 0 },
      { x: plotWidth, y: plotDepth },
      { x: 0, y: plotDepth },
    ],
    setbacks: { front: 5, rear: 3, sides: [3, 3] },
    createdAt: now,
    updatedAt: now,
  }
}
