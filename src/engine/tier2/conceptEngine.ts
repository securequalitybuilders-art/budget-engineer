import type { Tier1ParsedBrief, Typology, ClimateZone, HeritagePattern } from '../tier1-types'

export interface DesignConcept {
  philosophy: {
    statement: string
    aaltoPrinciple: string
    andoPrinciple: string
    chipperfieldPrinciple: string
    africanPrinciple: string
  }
  strategy: {
    spatialOrganization: string
    privacyGradient: string
    circulationPattern: string
    climateResponse: string
    heritageIntegration: string
  }
  siteAnalysis: {
    orientation: string
    solarResponse: string
    windResponse: string
    topographyResponse: string
  }
  circulation: {
    publicPath: string
    privatePath: string
    servicePath: string
    emergencyPath: string
  }
  massing: {
    primaryForm: string
    height: string
    roofStrategy: string
    facadeStrategy: string
    materialPalette: string[]
    colorPalette: string[]
  }
  precedents: {
    african: string[]
    modern: string[]
    local: string[]
    climate: string[]
  }
  qualityMetrics: {
    daylightTarget: string
    ventilationTarget: string
    thermalComfortTarget: string
  }
}

// ── Typology form tables ──

function formForTypology(t: Typology): string {
  const map: Record<string, string> = {
    'house-residential': 'Detached or semi-detached rectangular plan with veranda wrap on north facade. U-shape or L-shape around a courtyard or garden terrace.',
    'apartment-multi': 'Rectilinear block, 4-storey walk-up or with lift core. Double-loaded corridor with units on both sides; or point-block with central core.',
    'clinic-health': 'Linear bar with a central waiting spine; consultation rooms off corridor. Expandable wing plan for future wards.',
    'school-classroom': 'Linear classroom block with veranda-access corridor (external). Single banked for cross-ventilation; admin block perpendicular.',
    'hotel-fullservice': 'Courtyard or U-shape plan wrapping pool/garden. Guest rooms on upper floors, public functions (lobby, restaurant) on ground floor.',
    'office-commercial': 'Rectangular or L-shape plan with central core (services, stairs, lift). Open-plan floor plates 12–15 m deep for daylight penetration.',
    'retail-shop': 'Deep rectangular sales floor with street frontage; stock room and office at rear. Minimum column grid 6 x 6 m for flexible merchandising.',
    'restaurant': 'Rectangular dining hall with open kitchen visible; terrace/courtyard dining extension. Clear-span roof for flexible seating.',
    'church-worship': 'Wide-span rectangular or cruciform hall with raised platform/apse. Nave width 10–15 m clear-span; side aisles for circulation.',
    'warehouse-industrial': 'Large clear-span rectangle with 6–8 m eaves. Portal frame or truss roof. Loading bay on one short side; admin mezzanine.',
    'community-hall': 'Single-span rectangular hall with stage at one end. Side rooms for kitchen/storage. Veranda wrap for outdoor spill-out.',
    'market': 'Covered linear or courtyard layout with vendor stalls along aisles. Central water point and ablution block. Canopy roof with ventilation ridge.',
    'petrol-station': 'Canopy-covered forecourt with convenience shop + office on one side. Separate wash bay and underground tank zone with set-back compliance.',
    'mixed-use': 'Ground floor retail/commercial with 2–3 storeys of apartments above. Separate street entrances for residential and commercial; fire separation slab.',
  }
  return map[t.id] ?? 'Rectilinear plan arranged around a central circulation spine. Compact rectangular footprint.'
}

function roofForTypology(t: Typology, climate: ClimateZone | null): string {
  const climateRoof: Record<string, string> = {
    HARARE_Highveld: 'Pitched corrugated iron roof (25°–30°) with ventilated ridge. Deep eaves 600–900 mm. Ceiling insulation R-value >=3.5.',
    VICFALLS_Lowveld: 'Pitched galvanised iron roof (30°–35°) with reflective foil sarking. Deep eaves 1200 mm with veranda overhang. Ridge ventilation essential.',
    MUTARE_EasternHighlands: 'Pitched roof (30°–35°) with sealed ridge to resist mist penetration. Heavy-gauge galvanised sheets; gutters and downpipes for high rainfall.',
    BULAWAYO_Midlands: 'Pitched corrugated iron or concrete tile (25°–30°). Eaves 800–1000 mm wide. Insulated ceiling; north roof plane may host solar panels.',
  }
  if (climate && climateRoof[climate.id]) return climateRoof[climate.id]

  const map: Record<string, string> = {
    'hotel-fullservice': 'Pitched thatch or corrugated iron for main roof; flat concrete slab for service areas. Deep eaves with gutter detail.',
    'church-worship': 'Pitched corrugated iron or concrete tile (30°) with ventilated ridge. High ceiling (4–5 m) for thermal buffer.',
    'warehouse-industrial': 'Curved or pitched truss roof, galvanised steel sheet. Roof lights (10% of area) for daylight. Ridge ventilator.',
    'market': 'Monitor roof with raised clerestory for natural ventilation and daylight. Deep overhang shading the stall circulation aisles.',
  }
  return map[t.id] ?? 'Pitched corrugated iron roof (25°–30°) with eave overhang and insulated ceiling. Ridge ventilation for hot air escape.'
}

function facadeForTypology(t: Typology, _climate: ClimateZone | null): string {
  const map: Record<string, string> = {
    'house-residential': 'Fair-face brickwork with plaster accents. Deep north veranda with circular columns. Opaque east/west walls to minimise solar gain. Small high-level windows on south facade.',
    'apartment-multi': 'Rendered masonry with horizontal banding. Deep balcony overhangs on north/south faces. East/west facades minimal glazing with sun screens.',
    'clinic-health': 'Painted plaster on brick. Wide overhangs on north waiting areas. Veranda walkway along consultation wing. Bright accent colour on entrance canopy.',
    'school-classroom': 'Face-brick with veranda columns. Blackboard walls opaque east/west; north wall high-level windows for glare-free daylight. Deep eaves protect openings.',
    'hotel-fullservice': 'Stone cladding at podium level; rendered upper floors. Continuous balcony/veranda on all guest floors. Landscaped courtyard visible through full-height lobby glazing (north-facing, shaded).',
    'office-commercial': 'Curtain wall or punched openings with horizontal aluminium louvers. North facade deep horizontal shading; east/west vertical fins or fixed screens. Recessed glazing.',
    'retail-shop': 'Full-height glazed street frontage with recessed entrance. Solid party walls. Bold signage zone above glazing. Light-coloured render finish.',
    'restaurant': 'Large glazed openings on north/east for natural light. Veranda dining terrace shaded with pergola or sail. Textured plaster or stone feature wall at entrance.',
    'church-worship': 'Monumental west or east facade with large rose window or cross motif. Side walls have high-level stained glass. Stone or face-brick finish.',
    'warehouse-industrial': 'Pre-cast concrete panels or profiled metal cladding. Minimal openings; high-level daylight louvers. Truck-height dock doors on service side.',
    'community-hall': 'Fair-face brick with bold painted trim. Veranda on entrance facade. High-level windows for ventilation; stage wall opaque.',
    'market': 'Open-sided with steel columns and trusses. Stall fronts open. Parapet walls at ends for signage. Bright painted stall fascias.',
    'petrol-station': 'Canopy structure minimal enclosure. Shop facade glazed front; tile splash-back on pump islands. Brand colour bands.',
    'mixed-use': 'Ground floor glazed retail frontage; upper floor rendered or brick with balcony detailing. Clear horizontal band separates commercial from residential. Separate entries.',
  }
  return map[t.id] ?? 'Rendered masonry facade with punched window openings. Horizontal banding at floor levels. Simple rectangular massing.'
}

// ── Spatial organization per typology ──

function spatialForTypology(t: Typology, heritage: HeritagePattern | null): string {
  const base: Record<string, string> = {
    'house-residential': 'Zoned by privacy: communal (living/dining/kitchen) along north, sleeping (bedrooms) along east/west wings. Veranda mediates indoor-outdoor.',
    'clinic-health': 'Front-to-back: public (waiting/reception) at entrance, semi-public (consultation) mid-block, private (treatment/sterilisation) rear. Clean/dirty separation.',
    'hotel-fullservice': 'Public ground floor lobby-restaurant-pool terrace. Guest rooms stacked above on double-loaded corridors. Service core (laundry/kitchen/staff) at rear ground level.',
    'school-classroom': 'Classroom wing separated from admin block. Veranda circulation along the classroom edge. Playground / assembly area adjacent. Toilet block as separate wing.',
    'office-commercial': 'Front-of-house (reception, meeting rooms) at ground floor entry. Open-plan offices on upper floors. Secure back-of-house (admin, server, staff facilities) at rear.',
    'church-worship': 'Axial progression from narthex (entry) -> nave (congregation) -> sanctuary (altar/pulpit). Side aisles for circulation. Sunday school and offices as orthogonal wing.',
    'warehouse-industrial': 'Service zones: loading bay + goods receipt -> bulk storage -> packing/dispatch. Admin mezzanine overlooking floor. Separate staff facilities.',
    'market': 'Linear stall rows with central or side aisles. Water/ablution core at mid-point for equal access. Admin and storage at one end.',
    'petrol-station': 'Forecourt with pump islands -> shop entry -> back office. Car wash bay separate from fuelling area. Tank farm at rear with safety setback.',
    'mixed-use': 'Stacked: ground floor commercial (public), upper floors residential (private). Separate vertical circulation cores. Acoustic and fire separation between uses.',
    'restaurant': 'Entry -> host station -> dining floor. Open kitchen visible as theatre. Bar/service counter on one side. Outdoor terrace as seasonal extension.',
    'apartment-multi': 'Multiple units accessed from central corridor. Lift/stair core at centre or ends. Ground floor lobby and possibly retail. Roof terrace communal.',
    'community-hall': 'Entry foyer -> main hall -> stage. Side wings for kitchen, store, toilets. Veranda wrap for outdoor gathering spill-out.',
    'retail-shop': 'Street entrance -> sales floor (front) -> stock room (rear) -> staff office. Clear sight lines from entrance to rear for security.',
  }
  let result = base[t.id] ?? 'Simple front-to-back zonal organisation with public spaces at entry and private spaces at rear.'

  if (heritage) {
    if (heritage.id === 'kraal' || heritage.id === 'courtyard-hearth') {
      result += ' Organised as a courtyard sequence: entry threshold -> semi-public forecourt -> private inner courtyard -> individual rooms opening onto the yard.'
    } else if (heritage.id === 'veranda') {
      result += ' Deep veranda at the public-to-private transition zone, wrapping the north and east sides as an outdoor living layer.'
    }
  }
  return result
}

// ── Privacy gradient ──

function privacyForTypology(t: Typology): string {
  const map: Record<string, string> = {
    'house-residential': 'Public (street/veranda) -> semi-public (living/dining) -> semi-private (kitchen/family room) -> private (bedrooms) -> intimate (master ensuite).',
    'clinic-health': 'Public (waiting/reception) -> semi-public (consultation) -> private (treatment) -> restricted (sterilisation/records).',
    'hotel-fullservice': 'Public (lobby/restaurant) -> semi-public (bars/circulation) -> semi-private (guest corridors) -> private (guest rooms).',
    'school-classroom': 'Public (entrance/admin) -> semi-public (veranda corridors) -> semi-private (classrooms) -> private (staff room/offices).',
    'office-commercial': 'Public (lobby/reception) -> semi-public (meeting rooms) -> semi-private (open plan) -> private (executive offices/server rooms).',
  }
  return map[t.id] ?? 'Public (street/entrance) -> semi-public (common areas) -> semi-private (work zones) -> private (restricted areas).'
}

// ── Circulation patterns ──

function circulationForTypology(t: Typology): string {
  const map: Record<string, string> = {
    'house-residential': 'Single-loaded veranda corridor along the north facade connects all rooms. Centrally located entrance leads into living/dining, with bedrooms accessed via a short hall.',
    'clinic-health': 'Central corridor spine with consultation rooms on both sides. Waiting area at entrance, treatment rooms at far end. Separate staff corridor behind treatment rooms.',
    'hotel-fullservice': 'Double-loaded corridor on guest floors. Lobby core with grand staircase and lift. Ground floor: lobby -> restaurant -> pool terrace circulation loop.',
    'school-classroom': 'External veranda corridor along classroom block. Direct access from classrooms to playground. Admin block connected by covered walkway.',
    'office-commercial': 'Central core with lift/stairs. Open floors with clear circulation paths to exits. Perimeter circulation allows daylight access to all workstations.',
  }
  return map[t.id] ?? 'Single- or double-loaded corridor spine with clear entrance-to-exit sight lines. Central lobby or hall as distribution node.'
}

// ── Climate response ──

function climateResponseText(climate: ClimateZone | null): string {
  if (!climate || climate.id === 'GENERIC_Zimbabwe') {
    return 'North-facing orientation, eaves 600 mm minimum, cross-ventilation through all habitable rooms.'
  }
  const c = climate.strategy
  return `${c.orientation}. ${c.shadingDepth}. ${c.thermalMass}. ${c.ventilation}.`
}

// ── Heritage integration ──

function heritageIntegrationText(heritage: HeritagePattern | null): string {
  if (!heritage) return 'No specific heritage pattern detected. Standard modern approach.'
  const di = heritage.designImplications.slice(0, 2).join(' ')
  return `${heritage.culturalContext} ${di}`
}

// ── Orientation text ──

function orientationText(climate: ClimateZone | null): string {
  if (!climate || climate.id === 'GENERIC_Zimbabwe') {
    return 'North-facing primary elevation. Long axis east-west to minimise east/west solar gain.'
  }
  return climate.strategy.orientation
}

// ── Site analysis helpers ──

function solarResponseText(climate: ClimateZone | null): string {
  if (!climate) return 'Standard 600 mm eaves on north facade. East/west walls minimal glazing.'
  if (climate.id === 'VICFALLS_Lowveld') return 'Deep solar shading on ALL facades. N/NE overhangs 1200 mm, external shade screens on east/west. Light-coloured walls and reflective roof to reduce heat gain. Solar panels on north roof plane.'
  if (climate.id === 'HARARE_Highveld') return 'North overhangs 600–900 mm. East/west walls with minimal openings or vertical fins. South facade high-level openings for borrowed light without direct gain.'
  if (climate.id === 'BULAWAYO_Midlands') return 'North overhangs 800–1000 mm. Veranda or trellis shading on west facade for afternoon sun. Solar panels optimised on north roof plane.'
  return 'Standard shading on north facade. Manage east/west solar gain with screens or reduced glazing.'
}

function windResponseText(climate: ClimateZone | null): string {
  const map: Record<string, string> = {
    HARARE_Highveld: 'Predominant winds from east/south-east. Position openings on north and east facades for positive pressure; south facade high-level vents for negative pressure extraction.',
    VICFALLS_Lowveld: 'Hot winds from north and west. Use deep veranda as wind buffer. Cross-ventilation at body height on north/south. High-level ridge vents for stack-effect exhaust. Insect screening on all openings.',
    MUTARE_EasternHighlands: 'Moist prevailing winds from south-east. Protected veranda on SE facade. Openings concentrated on NE and NW for cross-ventilation while avoiding direct mist ingress.',
    BULAWAYO_Midlands: 'Hygienic breezes from south-east. Main openings on north, high-level on south for cross-ventilation. Minimise west openings due to hot afternoon winds.',
  }
  return map[climate?.id ?? ''] ?? 'Cross-ventilation via high and low openings on opposite walls. Operable windows in all habitable rooms.'
}

function topographyResponseText(siteInfo: { widthM: number | null; depthM: number | null; aspect: string | null }): string {
  if (siteInfo.aspect) {
    const ratio = parseFloat(siteInfo.aspect)
    if (ratio > 1.8) return 'Site is significantly wider than deep. Orient building east-west along the width to maximise north facade. Leave side setbacks for drainage and access.'
    if (ratio < 0.6) return 'Site is significantly deeper than wide. Consider a pavilion or courtyard layout. Separate wings connected by covered walkways.'
    return 'Site aspect close to square. Compact rectangular or U-shape plan fits well. Central courtyard option viable.'
  }
  return 'Flat site assumed. Use orientation and climate strategy for placement. Consider gentle mounding for drainage.'
}

// ── Material palettes ──

function materialPalette(t: Typology, climate: ClimateZone | null): string[] {
  const common = ['Mild steel reinforcement', 'Reinforced concrete']
  const climateMaterials: Record<string, string[]> = {
    HARARE_Highveld: ['Face-brick (common clay)', 'Concrete roof tiles or CGI', 'Plaster and paint', 'Aluminium windows'],
    VICFALLS_Lowveld: ['Light-coloured rendered brick', 'Reflective galvanised steel roof', 'Timber or steel shade screens', 'Insect mesh on all openings'],
    MUTARE_EasternHighlands: ['Face-brick or stone cladding', 'Heavy-gauge CGI roofing', 'Timber deck / raised floor', 'Pressure-treated joinery'],
    BULAWAYO_Midlands: ['Stabilised earth block or brick', 'Concrete or clay roof tiles', 'Stone plinth cladding', 'Solar PV roof integration'],
  }
  const typologyMaterials: Record<string, string[]> = {
    'hotel-fullservice': ['Local stone', 'Timber decking', 'Thatch or CGI', 'Natural slate flooring'],
    'church-worship': ['Stone plinth', 'Fair-face brick', 'Stained glass', 'Timber roof trusses'],
    'warehouse-industrial': ['Precast concrete panels', 'Profiled steel cladding', 'Steel portal frame', 'Polished concrete floor'],
    'market': ['Steel columns', 'CGI roof sheeting', 'Painted masonry stalls', 'Concrete paving'],
    'petrol-station': ['Steel canopy structure', 'Tile finishes on shop', 'Concrete forecourt', 'Brand colour cladding panels'],
  }
  const palette = [...common]
  if (climate && climateMaterials[climate.id]) palette.push(...climateMaterials[climate.id])
  else palette.push('Face-brick', 'Plaster and paint', 'Concrete roof tiles')
  if (typologyMaterials[t.id]) palette.push(...typologyMaterials[t.id])
  return [...new Set(palette)]
}

function colorPalette(t: Typology): string[] {
  const map: Record<string, string[]> = {
    'house-residential': ['Warm cream #F5E6D0', 'Terracotta #C04040', 'Slate grey #4A4A4A', 'Deep navy #1B2A4A'],
    'clinic-health': ['White #FFFFFF', 'Sky blue #87CEEB', 'Soft grey #B0B0B0', 'Teal accent #008080'],
    'hotel-fullservice': ['Safari beige #D4B896', 'Stone grey #8B8682', 'Rust #8B4513', 'Olive #556B2F'],
    'school-classroom': ['Warm white #FFF8DC', 'Bright blue #4169E1', 'Sunny yellow #FFD700', 'Brick red #B22222'],
    'office-commercial': ['Cool grey #C0C0C0', 'Navy #1B2A4A', 'White #FFFFFF', 'Teal accent #008080'],
    'church-worship': ['Stone #A0926B', 'White #F5F5F5', 'Deep red #8B0000', 'Gold #DAA520'],
    'warehouse-industrial': ['Grey #808080', 'Galvanised silver #C0C0C0', 'Safety yellow #FFD700', 'Blue #00008B'],
    'market': ['Bright yellow #FFD700', 'Red #DC143C', 'Blue #4169E1', 'White #FFFFFF'],
  }
  return map[t.id] ?? ['Warm cream #F5E6D0', 'Slate grey #4A4A4A', 'White #FFFFFF', 'Terracotta #C04040']
}

// ── Precedents ──

function precedents(t: Typology): DesignConcept['precedents'] {
  const africanByType: Record<string, string[]> = {
    'house-residential': ['Vernacular Zimbabwean farmhouse', 'Mukwa House by Peter Rich', 'Mapungubwe Interpretation Centre'],
    'clinic-health': ['Rural health clinic typology — Zimbabwe MoHCC', 'Butaro District Hospital, Rwanda (MASS Design)'],
    'hotel-fullservice': ['Victoria Falls Hotel (colonial)', 'Singita Pamushana Lodge', 'Zimbabwean game lodge vernacular'],
    'school-classroom': ['SMA school programme — Zimbabwe', 'Bridge International classrooms prototype', 'Open-air school pavilions — East Africa'],
    'office-commercial': ['Eastgate Centre Harare (passive ventilation)', 'Borrowdale office park typology'],
  }
  const modernByType: Record<string, string[]> = {
    'house-residential': ['Case Study Houses (neutral plan)', 'Kooper House by Glenn Murcutt', 'Fallingwater by F.L. Wright'],
    'clinic-health': ['Maggie\'s Centres by various architects', 'Primary health clinic typology — global standards'],
    'hotel-fullservice': ['Aman Resorts design principles', 'Boutique hotel — single-loaded corridor maximising views'],
    'school-classroom': ['Open-plan schools — Hertzberger', 'Hellerup School, Denmark'],
  }
  const localByType: Record<string, string[]> = {
    'house-residential': ['Low-cost housing prototypes — Zim', 'IDBZ housing schemes', 'Zimbabwe Green Building Council case studies'],
    'clinic-health': ['Rural Health Centre — Zimbabwe standard plan', 'Ministry of Health clinic type designs'],
    'hotel-fullservice': ['Meikles Hotel, Harare', 'Holiday Inn Bulawayo refurbishment'],
    'school-classroom': ['BEP school programme Zimbabwe', 'Rural school infrastructure programme'],
  }
  const climateByType: Record<string, string[]> = {
    'house-residential': ['Passive house tropical', 'Bioclimatic design — Szokolay', 'Barrier-free passive cooling — Givoni'],
    'hotel-fullservice': ['Tropical resort passive design', 'Deep-overhang shading strategies'],
    'office-commercial': ['Eastgate Centre Harare — passive ventilation benchmark', 'Termodeck activated slab cooling'],
  }
  const african = africanByType[t.id] ?? ['Zimbabwean vernacular precedents', 'Contemporary African architecture']
  const modern = modernByType[t.id] ?? ['Modernist universal space', 'Critical regionalism — Kenneth Frampton']
  const local = localByType[t.id] ?? ['Local best practice guidelines', 'ZBC 1996 compliance precedents']
  const climate = climateByType[t.id] ?? ['Bioclimatic design principles', 'Passive solar heating and cooling']
  return { african, modern, local, climate }
}

// ── Quality targets ──

function qualityTargets(t: Typology): DesignConcept['qualityMetrics'] {
  const map: Record<string, { daylight: number; ventilation: number; thermal: number }> = {
    'house-residential': { daylight: 0.02, ventilation: 0.8, thermal: 0.75 },
    'clinic-health': { daylight: 0.03, ventilation: 0.9, thermal: 0.85 },
    'school-classroom': { daylight: 0.03, ventilation: 0.9, thermal: 0.8 },
    'hotel-fullservice': { daylight: 0.02, ventilation: 0.8, thermal: 0.85 },
    'office-commercial': { daylight: 0.025, ventilation: 0.85, thermal: 0.8 },
    'warehouse-industrial': { daylight: 0.01, ventilation: 0.7, thermal: 0.6 },
  }
  const v = map[t.id] ?? { daylight: 0.02, ventilation: 0.8, thermal: 0.75 }
  return {
    daylightTarget: `Daylight factor >=${(v.daylight * 100).toFixed(0)}% in 80% of occupied spaces`,
    ventilationTarget: `Natural ventilation in >=${(v.ventilation * 100).toFixed(0)}% of occupied rooms`,
    thermalComfortTarget: `Thermal comfort (adaptive model) >=${(v.thermal * 100).toFixed(0)}% of occupied hours annually`,
  }
}

// ── Philosophy principles ──

function philosophyStatement(t: Typology, climate: ClimateZone | null, heritage: HeritagePattern | null, site: { widthM: number | null; depthM: number | null; areaM2: number | null }): string {
  const areaText = site.areaM2 ? `${site.areaM2.toFixed(0)} m²` : 'the site'
  const climateName = climate && climate.id !== 'GENERIC_Zimbabwe' ? ` for the ${climate.name} climate` : ''
  const heritageText = heritage ? `, referencing ${heritage.name} traditions` : ''
  return `A ${t.displayName.toLowerCase()} concept on ${areaText}${climateName}${heritageText}. The design resolves ${t.defaultStoreys}-storey ${t.sans10400Class} requirements with ${t.defaultProgram.length} programmed spaces arranged for optimal solar orientation, natural ventilation, and cultural appropriateness.`
}

function aaltoPrinciple(): string {
  return 'Buildings must engage all senses — materiality, texture, and natural light define spatial experience. Form is shaped by human use, not dogma.'
}

function andoPrinciple(): string {
  return 'Architecture is the tension between exterior and interior. Use procession through light and shadow — entry, compression, release — to create emotional resonance.'
}

function chipperfieldPrinciple(): string {
  return 'Design is an act of subtraction — find the essential form. Structure is articulation. Material honesty and tectonic clarity produce architecture that endures.'
}

function africanPrinciple(heritage: HeritagePattern | null): string {
  const h = heritage?.name ?? 'Zimbabwean'
  return `${h} spatial logic: building as enclosure AND connection — the threshold, the courtyard, the veranda. Architecture that responds to sun, wind, and community.`
}

// ── Main export ──

export function generateDesignConcept(parsedBrief: Tier1ParsedBrief): DesignConcept {
  const { typology, climateZone, heritagePattern, siteInfo } = parsedBrief
  const t = typology ?? {
    id: 'house-residential', displayName: 'House / Residential', sans10400Class: 'Class 1',
    defaultStoreys: 1, defaultProgram: [], aliases: [], zbcClass: '', minRoomDimensions: {}, notes: '',
    maxStructuralSpan: 5.0,
  } as Typology
  const c = climateZone

  return {
    philosophy: {
      statement: philosophyStatement(t, c, heritagePattern, siteInfo),
      aaltoPrinciple: aaltoPrinciple(),
      andoPrinciple: andoPrinciple(),
      chipperfieldPrinciple: chipperfieldPrinciple(),
      africanPrinciple: africanPrinciple(heritagePattern),
    },
    strategy: {
      spatialOrganization: spatialForTypology(t, heritagePattern),
      privacyGradient: privacyForTypology(t),
      circulationPattern: circulationForTypology(t),
      climateResponse: climateResponseText(c),
      heritageIntegration: heritageIntegrationText(heritagePattern),
    },
    siteAnalysis: {
      orientation: orientationText(c),
      solarResponse: solarResponseText(c),
      windResponse: windResponseText(c),
      topographyResponse: topographyResponseText(siteInfo),
    },
    circulation: {
      publicPath: 'Main entrance from street/approach side. Visitor parking off public access. Direct path to reception/lobby.',
      privatePath: 'Separate resident/staff entrance with screened access. Secure route from parking to private zones.',
      servicePath: 'Rear or side service entrance for goods, deliveries, waste. Screened from public view. Service yard for deliveries and refuse.',
      emergencyPath: 'Fire escape routes from all occupied floors to assembly points. Min 2 exits per floor per ZBC. Emergency vehicle access to main entry point.',
    },
    massing: {
      primaryForm: formForTypology(t),
      height: `${t.defaultStoreys}-storey structure with clear ceiling heights: ground floor 2.7–3.0 m, upper floors 2.4–2.7 m.`,
      roofStrategy: roofForTypology(t, c),
      facadeStrategy: facadeForTypology(t, c),
      materialPalette: materialPalette(t, c),
      colorPalette: colorPalette(t),
    },
    precedents: precedents(t),
    qualityMetrics: qualityTargets(t),
  }
}
