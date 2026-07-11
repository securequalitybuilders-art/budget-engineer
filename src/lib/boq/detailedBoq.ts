import type { DesignOption } from '@/domain/boq'
import type { BOQ, BOQLineItem, EstimateDepth } from './boq-types'
import { extractGeometryQuantities, type GeometryQuantities } from '@/adapters/geometryQuantitiesAdapter'
import { resolveBoqRate, getContingencyRate, getFeesRate, getVatRate, getRegionRateCard } from '@/adapters/rateCardAdapter'
import type { RateAssumption } from '@/adapters/rateCardAdapter'
import { buildDesignGeometry } from '@/adapters/designGeometryAdapter'
import type { RoofType } from '@/adapters/designToBoq'

export interface DetailedBoqConfig {
  region: string
  roofType: RoofType
  depth: 'shell' | 'shell-with-allowances' | 'trade-detailed'
  floorCount?: number
  areaM2?: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function addItem(items: BOQLineItem[], id: string, cat: string, desc: string, unit: string, qty: number, rate: number, ref: string) {
  items.push({ id, quantityRef: ref, category: cat, description: desc, unit, quantity: round2(qty), rate, total: round2(qty * rate) })
}

export interface DetailedBoqResult {
  boq: BOQ
  assumptions: RateAssumption[]
  quantities: GeometryQuantities
  depth: EstimateDepth
}

export function generateDetailedBoq(design: DesignOption, config: DetailedBoqConfig, overriddenQty?: GeometryQuantities): DetailedBoqResult {
  const qty = overriddenQty ?? extractGeometryQuantities(design)
  const region = config.region
  const card = getRegionRateCard(region)

  const items: BOQLineItem[] = []
  const assumptions: RateAssumption[] = []

  function r(key: string, fb: number) {
    const resolved = resolveBoqRate(region, key, fb)
    return resolved
  }

  function pushAssumption(key: string, label: string, fb: number) {
    const resolved = r(key, fb)
    assumptions.push({ itemKey: key, label, rate: resolved.rate, currency: card.currency, source: resolved.source, warning: resolved.warning })
    return resolved
  }

  const add = (id: string, cat: string, desc: string, unit: string, qty: number, key: string, fb: number, ref: string) => {
    const resolved = pushAssumption(key, desc, fb)
    addItem(items, id, cat, desc, unit, qty, resolved.rate, ref)
  }

  const isDetailed = config.depth === 'trade-detailed'
  const floors = config.floorCount ?? design.floors ?? 1
  const gfa = config.areaM2 ?? qty.grossFloorArea

  const geo = buildDesignGeometry(design)
  const roomTypes = new Map<string, number>()
  for (const room of geo.rooms) {
    roomTypes.set(room.type, (roomTypes.get(room.type) ?? 0) + 1)
  }
  const wetRooms = qty.wetRoomCount
  const kitchens = qty.kitchenCount
  const bedrooms = qty.bedroomCount
  const doorCount = qty.doorCount || Math.max(1, Math.round(gfa / 25))
  const windowCount = qty.windowCount || Math.max(1, Math.round(gfa / 20))
  const roomCount = qty.roomCount || Math.max(1, Math.round(gfa / 30))

  // ── 1. PRELIMINARIES ──
  if (isDetailed) {
    const p = card.prelims
    add('pre-site', 'Preliminaries', 'Site establishment', 'lump', 1, 'p-siteEstablishment', p.siteEstablishment, 'prelims')
    add('pre-security', 'Preliminaries', 'Site security', 'lump', 1, 'p-security', p.security, 'prelims')
    add('pre-temp', 'Preliminaries', 'Temporary services', 'lump', 1, 'p-temporaryServices', p.temporaryServices, 'prelims')
    add('pre-survey', 'Preliminaries', 'Survey & setting out', 'lump', 1, 'p-survey', p.survey, 'prelims')
    add('pre-testing', 'Preliminaries', 'Materials testing', 'lump', 1, 'p-testing', p.testing, 'prelims')
    add('pre-cleanup', 'Preliminaries', 'Site cleanup & demobilisation', 'lump', 1, 'p-siteCleanup', p.siteCleanup, 'prelims')
    add('pre-asbuilt', 'Preliminaries', 'As-built documentation', 'lump', 1, 'p-asBuiltDocs', p.asBuiltDocs, 'prelims')
  } else {
    add('pre-general', 'Preliminaries', 'General preliminaries (lump)', 'lump', 1, 'p-siteEstablishment', 2500, 'prelims')
  }

  // ── 2. SUBSTRUCTURE ──
  const footprint = qty.footprintArea || gfa / floors
  const footingVol = footprint * 0.3 * 0.6
  if (isDetailed) {
    const e = card.earthworks
    const c = card.concrete
    add('sub-excavate', 'Substructure', `Bulk excavation (${footprint.toFixed(0)} m² × 0.5 m)`, 'm³', footprint * 0.5, 'bulkExcavationM3', e.bulkExcavationM3, 'earthworks')
    add('sub-hardcore', 'Substructure', `Hardcore fill (${footprint.toFixed(0)} m² × 0.15 m)`, 'm³', footprint * 0.15, 'hardcoreM3', e.hardcoreM3, 'earthworks')
    add('sub-blinding', 'Substructure', `Blinding concrete (${footprint.toFixed(0)} m² × 0.05 m)`, 'm³', footprint * 0.05, 'blindingM3', c.blindingM3, 'concrete')
    add('sub-footing', 'Substructure', `Strip footings (${footingVol.toFixed(1)} m³)`, 'm³', footingVol, 'stripFootingM3', c.stripFootingM3, 'concrete')
    add('sub-rebar', 'Substructure', 'Reinforcement to strip footings', 'tonne', 0.12 * footprint / 100, 'rebarTonne', c.rebarTonne, 'concrete')
    add('sub-formwork', 'Substructure', 'Formwork to footings', 'm²', footprint * 0.6, 'formworkM2', c.formworkM2, 'concrete')
  } else {
    const c = card.concrete
    add('sub-footing', 'Substructure', `Strip footings & blinding (${footingVol.toFixed(1)} m³)`, 'm³', footingVol, 'stripFootingM3', c.stripFootingM3, 'concrete')
  }

  // ── 3. SUPERSTRUCTURE ──
  const slabArea = qty.slabArea || gfa
  const extWallArea = qty.externalWallArea || Math.sqrt(gfa) * 3 * 4 * floors
  const partArea = qty.partitionArea || extWallArea * 0.6
  if (isDetailed) {
    const c = card.concrete
    const s = card.steel
    add('super-slab', 'Superstructure', `Ground & upper floor slabs (${slabArea.toFixed(0)} m²)`, 'm²', slabArea, 'reinforcedSlabM3', c.reinforcedSlabM3 * 0.15, 'concrete')
    add('super-slab-rebar', 'Superstructure', 'Slab reinforcement', 'tonne', 0.08 * slabArea / 100, 'rebarTonne', c.rebarTonne, 'concrete')
    add('super-slab-form', 'Superstructure', 'Slab formwork', 'm²', slabArea, 'formworkM2', c.formworkM2, 'concrete')
    add('super-column', 'Superstructure', `Reinforced concrete columns (${Math.round(gfa / 30)} nr × 3 m)`, 'm³', Math.round(gfa / 30) * 3 * 0.12, 'reinforcedColumnM3', c.reinforcedColumnM3, 'concrete')
    add('super-beam', 'Superstructure', `Ring beams & lintels`, 'm³', extWallArea * 0.05, 'reinforcedBeamM3', c.reinforcedBeamM3, 'concrete')
    add('super-ext-wall', 'Superstructure', `External walls (${extWallArea.toFixed(0)} m²)`, 'm²', extWallArea, 'wall', 85, 'walls')
    add('super-partition', 'Superstructure', `Internal partitions (${partArea.toFixed(0)} m²)`, 'm²', partArea, 'partition', 65, 'walls')
    if (s) {
      add('super-steel', 'Superstructure', 'Structural steel (lintels, beams)', 'tonne', 0.05 * gfa / 100, 'structuralSteelTonne', s.structuralSteelTonne, 'steel')
    }
  } else {
    add('super-slab', 'Superstructure', `Floor slabs (${slabArea.toFixed(0)} m²)`, 'm²', slabArea, 'slab', 110, 'slabs')
    add('super-ext-wall', 'Superstructure', `External walls (${extWallArea.toFixed(0)} m²)`, 'm²', extWallArea, 'wall', 85, 'walls')
    add('super-partition', 'Superstructure', `Internal partitions (${partArea.toFixed(0)} m²)`, 'm²', partArea, 'partition', 65, 'walls')
  }

  // ── 4. ROOFING ──
  const roofArea = qty.roofArea || footprint
  const roofRate = config.roofType === 'cgi-truss' ? 55 : 75
  const roofLabel = config.roofType === 'concrete-slab' ? 'Concrete roof slab' : 'CGI/truss roof'
  if (isDetailed) {
    if (config.roofType === 'cgi-truss') {
      add('roof-truss', 'Roofing', `Timber trusses (${roofArea.toFixed(0)} m²)`, 'm²', roofArea, 'cgi-truss', roofRate, 'roof')
      add('roof-covering', 'Roofing', `CGI sheet covering (${roofArea.toFixed(0)} m²)`, 'm²', roofArea, 'cgi-truss', roofRate, 'roof')
      add('roof-insulation', 'Roofing', `Roof insulation (${roofArea.toFixed(0)} m²)`, 'm²', roofArea, 'cgi-truss', roofRate * 0.15, 'roof')
      add('roof-gutter', 'Roofing', 'Gutters & downpipes', 'm', Math.sqrt(roofArea) * 2, 'cgi-truss', roofRate * 0.1, 'roof')
    } else {
      add('roof-slab', 'Roofing', `Concrete roof slab (${roofArea.toFixed(0)} m²)`, 'm²', roofArea, 'concrete-slab', 75, 'roof')
      add('roof-waterproof', 'Roofing', `Roof waterproofing (${roofArea.toFixed(0)} m²)`, 'm²', roofArea, 'finishes', 15, 'roof')
    }
  } else {
    add('roof-main', 'Roofing', `${roofLabel} (${roofArea.toFixed(0)} m²)`, 'm²', roofArea, config.roofType, roofRate, 'roof')
  }

  // ── 5. OPENINGS / JOINERY ──
  add('open-door', 'Openings', `Doors (${doorCount} nr)`, 'each', doorCount, 'door', 180, 'doors')
  add('open-window', 'Openings', `Windows with glazing (${windowCount} nr)`, 'each', windowCount, 'window', 320, 'windows')
  if (isDetailed) {
    add('open-ironmongery', 'Openings', 'Door ironmongery sets', 'each', doorCount, 'opening', 25, 'doors')
    add('open-frame', 'Openings', 'Door frames', 'each', doorCount, 'opening', 45, 'doors')
  }

  // ── 6. FINISHES ──
  const finishArea = qty.finishFloorArea || gfa * 0.9
  if (isDetailed) {
    const f = card.finishes
    add('fin-plaster-int', 'Finishes', `Internal plaster (${finishArea.toFixed(0)} m²)`, 'm²', finishArea, 'internalPlasterM2', f.internalPlasterM2, 'finishes')
    add('fin-plaster-ext', 'Finishes', `External plaster (${extWallArea.toFixed(0)} m²)`, 'm²', extWallArea, 'externalPlasterM2', f.externalPlasterM2, 'finishes')
    add('fin-screed', 'Finishes', `Floor screed (${finishArea.toFixed(0)} m²)`, 'm²', finishArea, 'screedM2', f.screedM2, 'finishes')
    add('fin-tiles', 'Finishes', `Floor tiling (${(finishArea * 0.6).toFixed(0)} m²)`, 'm²', finishArea * 0.6, 'floorTilesM2', f.floorTilesM2, 'finishes')
    add('fin-wall-tiles', 'Finishes', `Wall tiling to wet areas (${wetRooms * 18} m²)`, 'm²', wetRooms * 18, 'wallTilesM2', f.wallTilesM2, 'finishes')
    add('fin-ceiling', 'Finishes', `Ceilings (${finishArea.toFixed(0)} m²)`, 'm²', finishArea, 'ceilingM2', f.ceilingM2, 'finishes')
    add('fin-cornice', 'Finishes', 'Cornices', 'm', Math.sqrt(finishArea) * 6, 'corniceM', f.corniceM, 'finishes')
    add('fin-primer', 'Finishes', `Primer (${(finishArea * 1.5).toFixed(0)} m²)`, 'm²', finishArea * 1.5, 'primerM2', f.primerM2, 'finishes')
    add('fin-paint-int', 'Finishes', `Internal paint (${(finishArea * 1.5).toFixed(0)} m²)`, 'm²', finishArea * 1.5, 'internalPaintM2', f.internalPaintM2, 'finishes')
    add('fin-paint-ext', 'Finishes', `External paint (${extWallArea.toFixed(0)} m²)`, 'm²', extWallArea, 'externalPaintM2', f.externalPaintM2, 'finishes')
    add('fin-waterproof', 'Finishes', `Waterproofing to wet areas`, 'm²', wetRooms * 12, 'waterproofingM2', f.waterproofingM2, 'finishes')
    add('fin-skirting', 'Finishes', 'Skirtings', 'm', Math.sqrt(finishArea) * 5, 'skirtingM', f.skirtingM, 'finishes')
  } else if (config.depth === 'shell-with-allowances') {
    add('fin-combined', 'Finishes', `Floor, wall & ceiling finishes (${finishArea.toFixed(0)} m²)`, 'm²', finishArea, 'finishes', 35, 'finishes')
  }

  // ── 7. PLUMBING ──
  if (isDetailed) {
    const p = card.plumbing
    const totalPoints = wetRooms * 4 + kitchens * 2
    add('plumb-cold', 'Plumbing', `Cold water pipework (${wetRooms * 15} m)`, 'm', wetRooms * 15, 'coldWaterPipeM', p.coldWaterPipeM, 'plumbing')
    add('plumb-hot', 'Plumbing', `Hot water pipework (${wetRooms * 10} m)`, 'm', wetRooms * 10, 'hotWaterPipeM', p.hotWaterPipeM, 'plumbing')
    add('plumb-waste', 'Plumbing', `Waste/soil pipework (${wetRooms * 8} m)`, 'm', wetRooms * 8, 'wastePipeM', p.wastePipeM, 'plumbing')
    add('plumb-soil', 'Plumbing', `Soil & vent pipework (${wetRooms * 6} m)`, 'm', wetRooms * 6, 'soilVentPipeM', p.soilVentPipeM, 'plumbing')
    add('plumb-wc', 'Plumbing', `WC suites (${wetRooms} nr)`, 'each', wetRooms, 'wcPanEach', p.wcPanEach, 'plumbing')
    add('plumb-basin', 'Plumbing', `Basins (${wetRooms} nr)`, 'each', wetRooms, 'basinEach', p.basinEach, 'plumbing')
    add('plumb-shower', 'Plumbing', `Showers (${wetRooms} nr)`, 'each', wetRooms, 'showerEach', p.showerEach, 'plumbing')
    add('plumb-sink', 'Plumbing', `Kitchen sinks (${kitchens} nr)`, 'each', kitchens || 1, 'sinkEach', p.sinkEach, 'plumbing')
    add('plumb-drain', 'Plumbing', `Floor drains (${wetRooms * 2} nr)`, 'each', wetRooms * 2, 'floorDrainEach', p.floorDrainEach, 'plumbing')
    add('plumb-inspect', 'Plumbing', `Inspection chambers (${wetRooms} nr)`, 'each', wetRooms, 'inspectionChamberEach', p.inspectionChamberEach, 'plumbing')
    add('plumb-valve', 'Plumbing', `Isolating valves (${totalPoints} nr)`, 'each', totalPoints, 'valveEach', p.valveEach, 'plumbing')
    add('plumb-geyser', 'Plumbing', `Geyser (${wetRooms > 0 ? 1 : 0} nr)`, 'each', wetRooms > 0 ? 1 : 0, 'geyserEach', p.geyserEach, 'plumbing')
    add('plumb-labour', 'Plumbing', `Plumber labour (${totalPoints} points)`, 'each', totalPoints, 'labourPerPoint', p.labourPerPoint, 'plumbing')
    add('plumb-test', 'Plumbing', 'Testing & commissioning', 'lump', 1, 'testingCommission', p.testingCommission, 'plumbing')
  } else {
    const serviceArea = qty.serviceZoneArea || gfa * 0.75
    add('plumb-allowance', 'Plumbing', `Plumbing & drainage allowance (${serviceArea.toFixed(0)} m²)`, 'm²', serviceArea, 'services', 45, 'services')
  }

  // ── 8. ELECTRICAL ──
  if (isDetailed) {
    const e = card.electrical
    const lightPoints = roomCount + 2
    const sockets = roomCount * 2 + 2
    const switches = lightPoints
    const totalElPoints = lightPoints + sockets + switches

    add('elec-conduit', 'Electrical', `Conduits (${(gfa * 2.5).toFixed(0)} m)`, 'm', gfa * 2.5, 'conduitM', e.conduitM, 'electrical')
    add('elec-wiring', 'Electrical', `Wiring (${(gfa * 3).toFixed(0)} m)`, 'm', gfa * 3, 'wiringM', e.wiringM, 'electrical')
    add('elec-socket', 'Electrical', `Socket outlets (${sockets} nr)`, 'each', sockets, 'socketEach', e.socketEach, 'electrical')
    add('elec-switch', 'Electrical', `Switches (${switches} nr)`, 'each', switches, 'switchEach', e.switchEach, 'electrical')
    add('elec-light-pt', 'Electrical', `Light points (${lightPoints} nr)`, 'each', lightPoints, 'lightPointEach', e.lightPointEach, 'electrical')
    add('elec-light-fit', 'Electrical', `Light fittings (${lightPoints} nr)`, 'each', lightPoints, 'lightFittingEach', e.lightFittingEach, 'electrical')
    add('elec-db', 'Electrical', `Distribution board`, 'each', 1, 'dbBoardEach', e.dbBoardEach, 'electrical')
    add('elec-breaker', 'Electrical', `Circuit breakers (${8} nr)`, 'each', 8, 'breakerEach', e.breakerEach, 'electrical')
    add('elec-earthing', 'Electrical', `Earthing system`, 'each', 1, 'earthingEach', e.earthingEach, 'electrical')
    add('elec-labour', 'Electrical', `Electrician labour (${totalElPoints} points)`, 'each', totalElPoints, 'labourPerPoint', e.labourPerPoint, 'electrical')
    add('elec-test', 'Electrical', 'Testing & commissioning', 'lump', 1, 'testingCommission', e.testingCommission, 'electrical')
  }

  // ── 9. MECHANICAL / HVAC ──
  if (isDetailed) {
    const h = card.hvac
    const bedroomsCount = bedrooms || Math.max(1, Math.round(roomCount * 0.4))
    const splitUnits = Math.max(1, bedroomsCount)
    add('hvac-split', 'Mechanical', `Split air-conditioning units (${splitUnits} nr)`, 'each', splitUnits, 'splitUnitEach', h.splitUnitEach, 'hvac')
    add('hvac-bracket', 'Mechanical', `Bracket supports (${splitUnits} nr)`, 'each', splitUnits, 'bracketEach', h.bracketEach, 'hvac')
    add('hvac-refrig', 'Mechanical', `Refrigerant pipework (${splitUnits * 15} m)`, 'm', splitUnits * 15, 'refrigerantLineM', h.refrigerantLineM, 'hvac')
    add('hvac-condens', 'Mechanical', `Condensate drains (${splitUnits * 5} m)`, 'm', splitUnits * 5, 'condensateDrainM', h.condensateDrainM, 'hvac')
    add('hvac-fan', 'Mechanical', `Extract fans (${wetRooms} nr)`, 'each', wetRooms, 'extractFanEach', h.extractFanEach, 'hvac')
    add('hvac-duct', 'Mechanical', `Ducting (${(gfa * 0.1).toFixed(0)} m²)`, 'm²', gfa * 0.1, 'ductM2', h.ductM2, 'hvac')
    add('hvac-diff', 'Mechanical', `Diffusers (${splitUnits * 2} nr)`, 'each', splitUnits * 2, 'diffuserEach', h.diffuserEach, 'hvac')
    add('hvac-labour', 'Mechanical', `Mechanical labour (${splitUnits} units)`, 'each', splitUnits, 'labourPerUnit', h.labourPerUnit, 'hvac')
    add('hvac-comm', 'Mechanical', 'Commissioning', 'lump', 1, 'commissioning', h.commissioning, 'hvac')
  }

  // ── 10. EXTERNAL WORKS ──
  if (isDetailed) {
    add('ext-paving', 'External Works', `Paving & walkways (${(gfa * 0.2).toFixed(0)} m²)`, 'm²', gfa * 0.2, 'slab', 110, 'external')
    add('ext-drainage', 'External Works', 'External drainage', 'lump', 1, 'excavation', 18, 'external')
    add('ext-water-tank', 'External Works', 'Water storage tank', 'each', 1, 'geyserEach', 350, 'external')
    add('ext-tank-stand', 'External Works', 'Tank stand', 'each', 1, 'tankStandEach', 120, 'external')
  } else {
    add('ext-general', 'External Works', 'External works allowance', 'lump', 1, 'object', 1200, 'external')
  }

  // ── 11. FEES, CONTINGENCY, TAX ──
  const subtotal = round2(items.reduce((sum, item) => sum + item.total, 0))
  const contingencyPct = getContingencyRate(region)
  const feesPct = getFeesRate(region)
  const vatPct = getVatRate(region)
  const contingency = round2(subtotal * contingencyPct)
  const professionalFees = round2(subtotal * feesPct)
  const vat = round2((subtotal + contingency + professionalFees) * vatPct)
  const grandTotal = round2(subtotal + contingency + professionalFees + vat)

  const depth: EstimateDepth = isDetailed ? 'detailed' : config.depth === 'shell-with-allowances' ? 'shell-with-allowances' : 'shell'

  const boq: BOQ = {
    id: `boq-${design.id}`,
    projectId: design.id,
    currency: card.currency,
    items,
    summary: { subtotal, contingency, professionalFees, vat, grandTotal },
    estimateDepth: depth,
  }

  return { boq, assumptions, quantities: qty, depth }
}

export function buildDetailedBoqCsv(boq: BOQ, currency: string): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines: string[] = [
    ['Category', 'Description', 'Quantity', 'Unit', `Rate (${currency})`, `Total (${currency})`].map(esc).join(','),
  ]
  for (const it of boq.items) {
    lines.push([it.category, it.description, it.quantity, it.unit, it.rate.toFixed(2), it.total.toFixed(2)].map(esc).join(','))
  }
  lines.push('')
  lines.push(['', '', '', '', 'Subtotal', boq.summary.subtotal.toFixed(2)].map(esc).join(','))
  lines.push(['', '', '', '', 'Contingency', boq.summary.contingency.toFixed(2)].map(esc).join(','))
  lines.push(['', '', '', '', 'Professional Fees', boq.summary.professionalFees.toFixed(2)].map(esc).join(','))
  lines.push(['', '', '', '', 'VAT', boq.summary.vat.toFixed(2)].map(esc).join(','))
  lines.push(['', '', '', '', 'Grand Total', boq.summary.grandTotal.toFixed(2)].map(esc).join(','))
  return lines.join('\n')
}
