import { generateSiteContext, detectClimateZone, generateDefaultAccessEdges, generateDefaultNoiseSources, calculateOptimalOrientation, generateSunPath, generateWindRose } from './locationIntelligence'
import type { SiteContext, WindRose } from '@/domain/site'

export interface LandUseZone {
  direction: string
  type: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'recreational' | 'institutional'
  distanceM: number
}

export interface PublicTransportStop {
  type: 'bus' | 'train' | 'taxi'
  distanceM: number
  direction: string
}

export interface ParkingAvailability {
  onStreet: boolean
  offStreetSpots: number
  bicycleRacks: boolean
}

export interface ClimateDetail {
  zoneName: string
  avgTempC: number
  minTempC: number
  maxTempC: number
  annualRainfallMm: number
  humidityPct: number
  dominantWindDir: string
  avgWindSpeedMs: number
}

export interface NearbyLandmark {
  name: string
  direction: string
  distanceM: number
  type: 'park' | 'school' | 'hospital' | 'shopping' | 'religious' | 'sport' | 'transit'
}

export interface ViewCorridor {
  direction: string
  description: string
  quality: 'excellent' | 'good' | 'moderate' | 'poor'
}

export interface NaturalFeature {
  type: 'watercourse' | 'wetland' | 'woodland' | 'rock-outcrop' | 'riparian' | 'conservation'
  direction: string
  distanceM: number
  constraint: string
}

export interface SoilCondition {
  type: 'sand' | 'clay' | 'loam' | 'rock' | 'laterite'
  bearingCapacityKpa: number
  drainage: 'good' | 'moderate' | 'poor'
}

export interface SWOTItem {
  category: 'strength' | 'weakness' | 'opportunity' | 'threat'
  description: string
}

export interface DesignInterpretation {
  orientationAdvice: string
  entryAdvice: string
  climateStrategy: string
  viewStrategy: string
  setbackAdvice: string
  landscapeAdvice: string
}

export interface EnhancedSiteAnalysis {
  siteContext: SiteContext
  landUse: LandUseZone[]
  publicTransport: PublicTransportStop[]
  parking: ParkingAvailability
  climate: ClimateDetail
  surroundingContext: {
    landmarks: NearbyLandmark[]
    views: ViewCorridor[]
    activities: string[]
  }
  siteConditions: {
    soil: SoilCondition
    naturalFeatures: NaturalFeature[]
    drainage: 'good' | 'moderate' | 'poor'
    floodRisk: 'none' | 'low' | 'moderate' | 'high'
  }
  swot: SWOTItem[]
  designInterpretation: DesignInterpretation
}

// ── Climate presets for SADC cities ──
const CLIMATE_PRESETS: Record<string, { avg: number; min: number; max: number; rain: number; humidity: number }> = {
  'HARARE_Highveld':      { avg: 20, min: 7,  max: 29, rain: 850,  humidity: 55 },
  'VICFALLS_Lowveld':     { avg: 24, min: 10, max: 34, rain: 600,  humidity: 50 },
  'BULAWAYO_Middleveld':  { avg: 21, min: 8,  max: 30, rain: 550,  humidity: 50 },
  'MUTARE_EasternHigh':   { avg: 22, min: 10, max: 28, rain: 1100, humidity: 65 },
  'GWERU_Middleveld':     { avg: 20, min: 6,  max: 29, rain: 650,  humidity: 50 },
  'JOHANNESBURG_High':    { avg: 19, min: 5,  max: 28, rain: 700,  humidity: 50 },
  'CAPETOWN_Mediterr':    { avg: 18, min: 8,  max: 28, rain: 550,  humidity: 65 },
  'LUSAKA_Highveld':      { avg: 21, min: 8,  max: 30, rain: 800,  humidity: 55 },
  'GABORONE_Semiarid':    { avg: 23, min: 8,  max: 33, rain: 450,  humidity: 45 },
  'GENERIC_Zimbabwe':     { avg: 22, min: 8,  max: 30, rain: 700,  humidity: 50 },
}

const DIR_LABELS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
function dirLabel(deg: number): string {
  const i = Math.round(deg / 45) % 8
  return DIR_LABELS[i]
}

function generateLandUse(lat: number, lng: number): LandUseZone[] {
  return [
    { direction: 'N', type: 'residential', distanceM: 20 + Math.abs(lat * 2) % 50 },
    { direction: 'NE', type: 'commercial', distanceM: 100 + Math.abs(lng * 3) % 200 },
    { direction: 'E', type: 'residential', distanceM: 30 + Math.abs(lat) % 40 },
    { direction: 'SE', type: 'agricultural', distanceM: 200 + Math.abs(lng) % 300 },
    { direction: 'S', type: 'institutional', distanceM: 150 + Math.abs(lat * 2) % 100 },
    { direction: 'W', type: 'industrial', distanceM: 300 + Math.abs(lng * 2) % 400 },
  ]
}

function generatePublicTransport(lat: number, lng: number): PublicTransportStop[] {
  return [
    { type: 'bus', distanceM: 50 + Math.abs(lat * 3) % 200, direction: 'N' },
    { type: 'taxi', distanceM: 20 + Math.abs(lng * 2) % 100, direction: 'S' },
  ]
}

function generateParking(): ParkingAvailability {
  return { onStreet: true, offStreetSpots: 2, bicycleRacks: false }
}

function generateClimate(lat: number, lng: number, windRose: WindRose): ClimateDetail {
  const zone = detectClimateZone(lat, lng)
  const preset = CLIMATE_PRESETS[zone.id] || CLIMATE_PRESETS['GENERIC_Zimbabwe']
  const dominantSector = windRose.sectors.reduce((a, b) => a.frequency > b.frequency ? a : b)
  return {
    zoneName: zone.name,
    avgTempC: preset.avg,
    minTempC: preset.min,
    maxTempC: preset.max,
    annualRainfallMm: preset.rain,
    humidityPct: preset.humidity,
    dominantWindDir: dirLabel(dominantSector.direction),
    avgWindSpeedMs: Math.round(dominantSector.speed * 10) / 10,
  }
}

function generateLandmarks(lat: number, lng: number): NearbyLandmark[] {
  const base = Math.abs(lat) * 5 + Math.abs(lng) * 3
  return [
    { name: 'Local Park', direction: dirLabel(base * 7), distanceM: 100 + base % 300, type: 'park' },
    { name: 'Primary School', direction: dirLabel(base * 13), distanceM: 200 + base % 500, type: 'school' },
    { name: 'Shopping Centre', direction: dirLabel(base * 3), distanceM: 300 + base % 700, type: 'shopping' },
    { name: 'Clinic', direction: dirLabel(base * 11), distanceM: 500 + base % 1000, type: 'hospital' },
  ]
}

function generateViews(terrain: string): ViewCorridor[] {
  if (terrain === 'steep') {
    return [
      { direction: 'E', description: 'Panoramic valley views towards sunrise', quality: 'excellent' },
      { direction: 'N', description: 'Hillside vista overlooking terrain', quality: 'good' },
    ]
  }
  if (terrain === 'sloping') {
    return [
      { direction: 'S', description: 'Gentle slope towards lower ground', quality: 'good' },
    ]
  }
  return [
    { direction: 'N', description: 'Level site — views determined by building height and landscaping', quality: 'moderate' },
  ]
}

function generateNaturalFeatures(): NaturalFeature[] {
  return [
    { type: 'woodland', direction: 'E', distanceM: 80, constraint: 'Root protection zones may apply' },
    { type: 'watercourse', direction: 'SE', distanceM: 200, constraint: '50m riparian buffer required if within 100m' },
  ]
}

function determineSoil(terrain: string): SoilCondition {
  if (terrain === 'steep') return { type: 'rock', bearingCapacityKpa: 300, drainage: 'good' }
  if (terrain === 'sloping') return { type: 'laterite', bearingCapacityKpa: 180, drainage: 'moderate' }
  return { type: 'clay', bearingCapacityKpa: 120, drainage: 'poor' }
}

function determineDrainage(terrain: string, soil: SoilCondition): 'good' | 'moderate' | 'poor' {
  if (soil.drainage === 'good') return 'good'
  if (terrain === 'steep') return 'good'
  if (terrain === 'sloping') return 'moderate'
  return 'poor'
}

function determineFloodRisk(terrain: string, annualRainfallMm: number): 'none' | 'low' | 'moderate' | 'high' {
  if (terrain === 'steep') return 'none'
  if (annualRainfallMm > 1000) return 'moderate'
  if (annualRainfallMm > 700) return 'low'
  return 'none'
}

function generateSWOT(
  siteContext: SiteContext,
  climate: ClimateDetail,
  landUse: LandUseZone[],
): SWOTItem[] {
  const items: SWOTItem[] = []

  // Strengths
  items.push({ category: 'strength', description: 'Good road access with defined access edges' })
  if (siteContext.terrain === 'flat' || siteContext.terrain === 'sloping') {
    items.push({ category: 'strength', description: `${siteContext.terrain === 'flat' ? 'Flat terrain — easy and cost-effective construction' : 'Sloping terrain — good drainage and views possible'}` })
  }
  if (climate.avgTempC >= 18 && climate.avgTempC <= 26) {
    items.push({ category: 'strength', description: `Mild climate (avg ${climate.avgTempC}°C) — suitable for passive design` })
  }
  if (siteContext.adjacentBuildings.length > 0) {
    items.push({ category: 'strength', description: 'Established neighborhood with existing infrastructure' })
  }

  // Weaknesses
  if (siteContext.noiseSources && siteContext.noiseSources.some(n => n.levelDba > 55)) {
    items.push({ category: 'weakness', description: 'Traffic noise from nearby roads — acoustic treatment needed' })
  }
  if (siteContext.adjacentBuildings.length > 0) {
    items.push({ category: 'weakness', description: 'Close neighboring buildings — privacy and overlooking considerations' })
  }
  if (climate.humidityPct > 60) {
    items.push({ category: 'weakness', description: `High humidity (${climate.humidityPct}%) — requires ventilation strategy` })
  }
  if (determineSoil(siteContext.terrain).bearingCapacityKpa < 150) {
    items.push({ category: 'weakness', description: 'Lower bearing capacity soil —可能需要 deep foundations or ground improvement' })
  }

  // Opportunities
  items.push({ category: 'opportunity', description: `Solar energy potential — orientation ${calculateOptimalOrientation(siteContext.lat)}° is optimal` })
  items.push({ category: 'opportunity', description: 'Rainwater harvesting to supplement mains supply' })
  if (siteContext.terrain === 'flat' || siteContext.terrain === 'sloping') {
    items.push({ category: 'opportunity', description: 'Outdoor living potential with covered patios and verandahs' })
  }
  const goodView = generateViews(siteContext.terrain).find(v => v.quality === 'excellent' || v.quality === 'good')
  if (goodView) {
    items.push({ category: 'opportunity', description: `Frame ${goodView.direction} views with room orientation and glazing` })
  }

  // Threats
  if (climate.annualRainfallMm > 700) {
    items.push({ category: 'threat', description: `Heavy rainfall (${climate.annualRainfallMm}mm/year) — drainage and stormwater management required` })
  }
  if (siteContext.noiseSources && siteContext.noiseSources.length > 0) {
    items.push({ category: 'threat', description: 'Noise pollution — may require acoustic glazing and buffer planting' })
  }
  items.push({ category: 'threat', description: 'Climate change — increasing temperatures and storm intensity expected' })
  const industrial = landUse.find(z => z.type === 'industrial')
  if (industrial && industrial.distanceM < 500) {
    items.push({ category: 'threat', description: `Industrial zone ${industrial.direction} — potential air quality and noise concerns` })
  }

  return items
}

function generateDesignInterpretation(
  siteContext: SiteContext,
  climate: ClimateDetail,
  landUse: LandUseZone[],
): DesignInterpretation {
  const optimalOrientation = calculateOptimalOrientation(siteContext.lat)
  const commercialZone = landUse.find(z => z.type === 'commercial')
  const residentialZone = landUse.find(z => z.type === 'residential')
  const roadDir = 'S'
  const goodView = generateViews(siteContext.terrain).find(v => v.quality === 'excellent' || v.quality === 'good')
  const soil = determineSoil(siteContext.terrain)
  const floodRisk = determineFloodRisk(siteContext.terrain, climate.annualRainfallMm)

  return {
    orientationAdvice: `Long axis E-W to maximize north-facing glazing at ${optimalOrientation}° (Southern Hemisphere). Minimize west-facing openings to reduce afternoon heat gain.`,
    entryAdvice: `Main entry facing ${roadDir} towards road access. Consider a covered porch or porte-cochère for weather protection.`,
    climateStrategy: climate.avgTempC > 22
      ? `Focus on natural cross-ventilation, deep roof overhangs for shading, and thermal mass for night cooling. ${climate.humidityPct > 60 ? 'High humidity requires raised floor and breathable wall construction.' : ''}`
      : `Balance solar access for winter warmth with ventilation. ${climate.annualRainfallMm > 700 ? 'Generous roof overhangs (600mm+) for rain protection.' : ''}`,
    viewStrategy: goodView
      ? `Orient main living spaces to frame ${goodView.direction} views (${goodView.description}). Use large openings with shading to capture outlook while controlling glare.`
      : `Courtyard or garden outlook — orient rooms inward to landscaped spaces for privacy and climate control.`,
    setbackAdvice: `Front setback 5m from road, rear 3m, sides 3m minimum. ${siteContext.terrain === 'steep' ? 'Increased side setbacks for retaining walls.' : ''}`,
    landscapeAdvice: `Use indigenous drought-tolerant planting. ${climate.annualRainfallMm > 700 ? 'Rain garden and bio-swales for stormwater management.' : 'Drip irrigation and shade trees for microclimate.'} ${soil.drainage !== 'good' ? 'French drains and raised beds for drainage.' : ''}${floodRisk !== 'none' ? ` Flood risk: ${floodRisk} — ensure finished floor level 300mm+ above surrounding grade.` : ''}`,
  }
}

export function generateEnhancedSiteAnalysis(
  projectId: string,
  lat: number,
  lng: number,
  siteWidth: number,
  siteDepth: number,
): EnhancedSiteAnalysis {
  const siteContext = generateSiteContext(projectId, lat, lng, siteWidth, siteDepth)
  const windRose = siteContext.windRose
  const climate = generateClimate(lat, lng, windRose)
  const landUse = generateLandUse(lat, lng)
  const soil = determineSoil(siteContext.terrain)
  const drainage = determineDrainage(siteContext.terrain, soil)
  const floodRisk = determineFloodRisk(siteContext.terrain, climate.annualRainfallMm)
  const views = generateViews(siteContext.terrain)
  const naturalFeatures = generateNaturalFeatures()

  return {
    siteContext,
    landUse,
    publicTransport: generatePublicTransport(lat, lng),
    parking: generateParking(),
    climate,
    surroundingContext: {
      landmarks: generateLandmarks(lat, lng),
      views,
      activities: ['Walking', 'Cycling', 'Local shopping', 'Community events'],
    },
    siteConditions: {
      soil,
      naturalFeatures,
      drainage,
      floodRisk,
    },
    swot: generateSWOT(siteContext, climate, landUse),
    designInterpretation: generateDesignInterpretation(siteContext, climate, landUse),
  }
}
