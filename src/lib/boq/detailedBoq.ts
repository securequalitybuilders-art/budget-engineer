import type { DesignOption } from '@/domain/boq'
import type { BOQ, BOQLineItem, EstimateDepth } from './boq-types'
import { extractGeometryQuantities, type GeometryQuantities } from '@/adapters/geometryQuantitiesAdapter'
import { resolveBoqRate, getContingencyRate, getFeesRate, getVatRate, getRegionRateCard } from '@/adapters/rateCardAdapter'
import type { RateAssumption } from '@/adapters/rateCardAdapter'
import { buildDesignGeometry } from '@/adapters/designGeometryAdapter'
import type { RoofType } from '@/adapters/designToBoq'
import { generateProgramme, dayToDate } from '@/lib/planning/gantt'
import { computeCashflow } from '@/lib/planning/cashflow'

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
    add('pre-site', 'Preliminaries', 'Site establishment (office, stores, ablutions)', 'lump', 1, 'p-siteEstablishment', p.siteEstablishment, 'prelims')
    add('pre-security', 'Preliminaries', 'Site security (night watch + fencing)', 'lump', 1, 'p-security', p.security, 'prelims')
    add('pre-temp', 'Preliminaries', 'Temporary services (power, lighting, comms)', 'lump', 1, 'p-temporaryServices', p.temporaryServices, 'prelims')
    add('pre-water', 'Preliminaries', 'Construction water supply allowance', 'lump', 1, 'p-temporaryServices', 400, 'prelims')
    add('pre-toilet', 'Preliminaries', 'Temporary chemical toilet (monthly rental)', 'lump', 1, 'p-temporaryServices', 300, 'prelims')
    add('pre-insurance', 'Preliminaries', 'Contractor all-risk & public liability insurance', 'lump', 1, 'p-temporaryServices', 600, 'prelims')
    add('pre-survey', 'Preliminaries', 'Survey & setting out', 'lump', 1, 'p-survey', p.survey, 'prelims')
    add('pre-testing', 'Preliminaries', 'Materials testing (cubes, steel, water)', 'lump', 1, 'p-testing', p.testing, 'prelims')
    add('pre-cleanup', 'Preliminaries', 'Final clean & snagging', 'lump', 1, 'p-siteCleanup', p.siteCleanup, 'prelims')
    add('pre-labour', 'Preliminaries', 'Extra general labour (clearing, loading)', 'hours', 80, 'p-siteCleanup', 8, 'prelims')
    add('pre-asbuilt', 'Preliminaries', 'As-built documentation & O&M manuals', 'lump', 1, 'p-asBuiltDocs', p.asBuiltDocs, 'prelims')
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
    add('super-lintel', 'Superstructure', `Precast concrete lintels (${doorCount + windowCount} nr)`, 'each', doorCount + windowCount, 'wall', 18, 'walls')
    add('super-wall-ties', 'Superstructure', `Hoop-iron wall ties (${Math.round(extWallArea / 0.45)} nr)`, 'each', Math.round(extWallArea / 0.45), 'wall', 2, 'walls')
    add('super-dpc', 'Superstructure', `DPC mortar bed over lintels`, 'm', Math.round(extWallArea / 3) * 0.3, 'wall', 6, 'walls')
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
      add('roof-gutter', 'Roofing', 'PVC gutters (eaves)', 'm', Math.sqrt(roofArea) * 2, 'cgi-truss', 6, 'roof')
      add('roof-gutter-bracket', 'Roofing', 'Gutter brackets & clips', 'each', Math.round(Math.sqrt(roofArea) * 2 / 0.6), 'cgi-truss', 1.5, 'roof')
      add('roof-gutter-stop', 'Roofing', 'Gutter stop-ends', 'each', 4, 'cgi-truss', 2, 'roof')
      add('roof-downpipe', 'Roofing', 'PVC downpipes', 'm', 8, 'cgi-truss', 5, 'roof')
      add('roof-downpipe-shoe', 'Roofing', 'Downpipe shoes', 'each', 4, 'cgi-truss', 2.5, 'roof')
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
    add('fin-wall-tile-adh', 'Finishes', 'Wall tile adhesive & grout (wet areas)', 'm²', wetRooms * 18, 'wallTilesM2', 3.5, 'finishes')
    add('fin-ceiling', 'Finishes', `Ceilings (${finishArea.toFixed(0)} m²)`, 'm²', finishArea, 'ceilingM2', f.ceilingM2, 'finishes')
    add('fin-cornice', 'Finishes', 'Cornices/coving', 'm', Math.sqrt(finishArea) * 6, 'corniceM', f.corniceM, 'finishes')
    add('fin-architrave', 'Finishes', `Door architrave sets (${doorCount} sets)`, 'set', doorCount, 'finishes', 15, 'finishes')
    add('fin-window-sill', 'Finishes', `Concrete window sills (${windowCount} nr)`, 'each', windowCount, 'finishes', 22, 'finishes')
    add('fin-primer', 'Finishes', `Primer (${(finishArea * 1.5).toFixed(0)} m²)`, 'm²', finishArea * 1.5, 'primerM2', f.primerM2, 'finishes')
    add('fin-paint-int', 'Finishes', `Internal paint (${(finishArea * 1.5).toFixed(0)} m²)`, 'm²', finishArea * 1.5, 'internalPaintM2', f.internalPaintM2, 'finishes')
    add('fin-paint-ext', 'Finishes', `External paint (${extWallArea.toFixed(0)} m²)`, 'm²', extWallArea, 'externalPaintM2', f.externalPaintM2, 'finishes')
    add('fin-waterproof', 'Finishes', `Waterproofing to wet areas`, 'm²', wetRooms * 12, 'waterproofingM2', f.waterproofingM2, 'finishes')
    add('fin-skirting', 'Finishes', 'Skirtings (75mm pine, primed)', 'm', Math.sqrt(finishArea) * 5, 'skirtingM', f.skirtingM, 'finishes')
    add('fin-counter-top', 'Finishes', 'Kitchen counter top (melamine, 3 m run)', 'm', 3, 'finishes', 180, 'finishes')
    add('fin-cupboard-base', 'Finishes', 'Kitchen base cupboards (melamine, 3 m run)', 'm', 3, 'finishes', 220, 'finishes')
    add('fin-cupboard-wall', 'Finishes', 'Kitchen wall cupboards (melamine, 3 m run)', 'm', 3, 'finishes', 180, 'finishes')
    add('fin-curtain-rail', 'Finishes', `Curtain rails (${windowCount} sets)`, 'set', windowCount, 'finishes', 12, 'finishes')
    add('fin-bath-mirror', 'Finishes', `Bathroom mirrors (${wetRooms} nr)`, 'each', wetRooms, 'finishes', 35, 'finishes')
    add('fin-bath-acc', 'Finishes', `Bathroom accessory set (towel rail, TP holder, robe hook, soap dish) (${wetRooms} sets)`, 'set', wetRooms, 'finishes', 60, 'finishes')
    add('fin-extra-tiler', 'Finishes', 'Extra tiler labour', 'hours', 24, 'finishes', 12, 'finishes')
    add('fin-extra-gen', 'Finishes', 'Extra general labour (finishes)', 'hours', 40, 'finishes', 8, 'finishes')
  } else if (config.depth === 'shell-with-allowances') {
    add('fin-combined', 'Finishes', `Floor, wall & ceiling finishes (${finishArea.toFixed(0)} m²)`, 'm²', finishArea, 'finishes', 35, 'finishes')
  }

  // ── 7. PLUMBING ──
  if (isDetailed) {
    const p = card.plumbing
    const totalPoints = wetRooms * 4 + kitchens * 2
    add('plumb-cold', 'Plumbing', `Cold water HDPE/PEX pipework (${wetRooms * 15} m)`, 'm', wetRooms * 15, 'coldWaterPipeM', p.coldWaterPipeM, 'plumbing')
    add('plumb-hot', 'Plumbing', `Hot water HDPE/PEX pipework (${wetRooms * 10} m)`, 'm', wetRooms * 10, 'hotWaterPipeM', p.hotWaterPipeM, 'plumbing')
    add('plumb-waste', 'Plumbing', `PVC waste/soil pipework (${wetRooms * 8} m)`, 'm', wetRooms * 8, 'wastePipeM', p.wastePipeM, 'plumbing')
    add('plumb-soil', 'Plumbing', `PVC soil & vent pipework (${wetRooms * 6} m)`, 'm', wetRooms * 6, 'soilVentPipeM', p.soilVentPipeM, 'plumbing')
    add('plumb-sewer', 'Plumbing', `PVC sewer drainage (${(wetRooms + 1) * 5} m)`, 'm', (wetRooms + 1) * 5, 'wastePipeM', 14, 'plumbing')
    add('plumb-sewer-branch', 'Plumbing', `PVC sewer branch fittings (${wetRooms * 3} nr)`, 'each', wetRooms * 3, 'wastePipeM', 8, 'plumbing')
    add('plumb-trap', 'Plumbing', `P-traps / bottle traps (${wetRooms * 3} nr)`, 'each', wetRooms * 3, 'floorDrainEach', 12, 'plumbing')
    add('plumb-gully', 'Plumbing', `Floor gulleys / shower drains (${wetRooms * 2} nr)`, 'each', wetRooms * 2, 'floorDrainEach', p.floorDrainEach, 'plumbing')
    add('plumb-wc', 'Plumbing', `WC suites (${wetRooms} nr)`, 'each', wetRooms, 'wcPanEach', p.wcPanEach, 'plumbing')
    add('plumb-wc-seat', 'Plumbing', `WC soft-close seats (${wetRooms} nr)`, 'each', wetRooms, 'wcPanEach', 25, 'plumbing')
    add('plumb-basin', 'Plumbing', `Basins (${wetRooms} nr)`, 'each', wetRooms, 'basinEach', p.basinEach, 'plumbing')
    add('plumb-shower', 'Plumbing', `Showers (${wetRooms} nr)`, 'each', wetRooms, 'showerEach', p.showerEach, 'plumbing')
    add('plumb-shower-encl', 'Plumbing', `Shower enclosure (curtain rod + curtain) (${wetRooms} nr)`, 'each', wetRooms, 'showerEach', 45, 'plumbing')
    add('plumb-sink', 'Plumbing', `Kitchen sinks (${kitchens} nr)`, 'each', kitchens || 1, 'sinkEach', p.sinkEach, 'plumbing')
    add('plumb-drain', 'Plumbing', `Floor drains (${wetRooms * 2} nr)`, 'each', wetRooms * 2, 'floorDrainEach', p.floorDrainEach, 'plumbing')
    add('plumb-stopcock', 'Plumbing', `Brass stopcocks (${2} nr)`, 'each', 2, 'valveEach', 18, 'plumbing')
    add('plumb-gate-valve', 'Plumbing', `Brass gate valves (${4} nr)`, 'each', 4, 'valveEach', 22, 'plumbing')
    add('plumb-bib-tap', 'Plumbing', `Outside bib taps (${2} nr)`, 'each', 2, 'valveEach', 15, 'plumbing')
    add('plumb-yard-tap', 'Plumbing', `Yard tap with concrete stand`, 'each', 1, 'valveEach', 45, 'plumbing')
    add('plumb-inspect', 'Plumbing', `Inspection chambers (${wetRooms} nr)`, 'each', wetRooms, 'inspectionChamberEach', p.inspectionChamberEach, 'plumbing')
    add('plumb-valve', 'Plumbing', `Isolating valves (${totalPoints} nr)`, 'each', totalPoints, 'valveEach', p.valveEach, 'plumbing')
    add('plumb-geyser', 'Plumbing', `Geyser (${wetRooms > 0 ? 1 : 0} nr)`, 'each', wetRooms > 0 ? 1 : 0, 'geyserEach', p.geyserEach, 'plumbing')
    add('plumb-geyser-prv', 'Plumbing', 'Geyser pressure relief valve (PRV)', 'each', 1, 'geyserEach', 25, 'plumbing')
    add('plumb-geyser-vac', 'Plumbing', 'Geyser vacuum breaker', 'each', 1, 'geyserEach', 18, 'plumbing')
    add('plumb-geyser-tray', 'Plumbing', 'Geyser drip tray', 'each', 1, 'geyserEach', 30, 'plumbing')
    add('plumb-geyser-over', 'Plumbing', 'Geyser overflow pipe', 'm', 3, 'wastePipeM', 8, 'plumbing')
    add('plumb-geyser-iso', 'Plumbing', 'Geyser isolator valve', 'each', 1, 'valveEach', 20, 'plumbing')
    add('plumb-cons', 'Plumbing', 'Plumbing consumables (PVC cement, PTFE tape, silicone, pipe saddles)', 'lump', 1, 'plumbing', 60, 'plumbing')
    add('plumb-2fix-labour', 'Plumbing', 'Second-fix plumber labour (fit-off & commissioning)', 'hours', 40, 'labourPerPoint', 12, 'plumbing')
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

    add('elec-conduit', 'Electrical', `PVC conduit (${(gfa * 2.5).toFixed(0)} m)`, 'm', gfa * 2.5, 'conduitM', e.conduitM, 'electrical')
    add('elec-conduit-saddle', 'Electrical', 'Conduit saddles & clips', 'pkt', Math.round(gfa * 2.5 / 0.5), 'conduitM', 1.5, 'electrical')
    add('elec-conduit-bend', 'Electrical', 'Conduit bends & couplers', 'each', Math.round(gfa * 2.5 / 3), 'conduitM', 2, 'electrical')
    add('elec-wiring', 'Electrical', `T&E wiring (${(gfa * 3).toFixed(0)} m)`, 'm', gfa * 3, 'wiringM', e.wiringM, 'electrical')
    add('elec-socket', 'Electrical', `Socket outlets (${sockets} nr)`, 'each', sockets, 'socketEach', e.socketEach, 'electrical')
    add('elec-switch', 'Electrical', `Switches (${switches} nr)`, 'each', switches, 'switchEach', e.switchEach, 'electrical')
    add('elec-light-pt', 'Electrical', `Light points (${lightPoints} nr)`, 'each', lightPoints, 'lightPointEach', e.lightPointEach, 'electrical')
    add('elec-light-fit', 'Electrical', `Light fittings (${lightPoints} nr)`, 'each', lightPoints, 'lightFittingEach', e.lightFittingEach, 'electrical')
    add('elec-globe', 'Electrical', `LED globes (${lightPoints + 2} nr)`, 'each', lightPoints + 2, 'lightFittingEach', 8, 'electrical')
    add('elec-db', 'Electrical', `Distribution board (8-way)`, 'each', 1, 'dbBoardEach', e.dbBoardEach, 'electrical')
    add('elec-breaker', 'Electrical', `Circuit breakers (${8} nr)`, 'each', 8, 'breakerEach', e.breakerEach, 'electrical')
    add('elec-elcb', 'Electrical', 'Earth leakage unit (ELCB)', 'each', 1, 'breakerEach', 45, 'electrical')
    add('elec-jbox', 'Electrical', `Junction boxes (${Math.round(lightPoints * 0.5)} nr)`, 'each', Math.round(lightPoints * 0.5), 'socketEach', 4, 'electrical')
    add('elec-iso-geyser', 'Electrical', 'Geyser isolator switch (20 A)', 'each', 1, 'switchEach', 18, 'electrical')
    add('elec-iso-stove', 'Electrical', 'Stove isolator switch (45 A)', 'each', 1, 'specialOutletEach', 25, 'electrical')
    add('elec-earth-spike', 'Electrical', 'Copper earth spike + clamp', 'each', 1, 'earthingEach', 35, 'electrical')
    add('elec-earth-wire', 'Electrical', 'Earth wire', 'm', 20, 'wiringM', 4, 'electrical')
    add('elec-earth-clamp', 'Electrical', 'Earth clamps', 'each', 3, 'earthingEach', 3, 'electrical')
    add('elec-security', 'Electrical', 'Exterior PIR security light (front)', 'each', 1, 'lightFittingEach', 45, 'electrical')
    add('elec-security2', 'Electrical', 'Exterior PIR security light (back)', 'each', 1, 'lightFittingEach', 45, 'electrical')
    add('elec-exhaust', 'Electrical', 'Bathroom exhaust fans', 'each', wetRooms, 'extractFanEach', 55, 'electrical')
    add('elec-smoke', 'Electrical', 'Smoke detectors', 'each', 2, 'specialOutletEach', 25, 'electrical')
    add('elec-tv', 'Electrical', 'TV point (coax cable)', 'each', 1, 'specialOutletEach', 35, 'electrical')
    add('elec-data', 'Electrical', 'Cat6 data point', 'each', 2, 'specialOutletEach', 35, 'electrical')
    add('elec-coc', 'Electrical', 'Certificate of Compliance (COC) — ZETDC registered electrician', 'each', 1, 'testingCommission', 150, 'electrical')
    add('elec-cons', 'Electrical', 'Electrical consumables (cable ties, tape, connectors, screws)', 'lump', 1, 'electrical', 50, 'electrical')
    add('elec-2fix-labour', 'Electrical', 'Second-fix electrician labour (fit-off, testing, COC inspection)', 'hours', 32, 'labourPerPoint', 15, 'electrical')
    add('elec-test', 'Electrical', 'Testing & commissioning', 'lump', 1, 'testingCommission', e.testingCommission, 'electrical')
  } else {
    add('elec-allowance', 'Electrical', `Electrical allowance (${gfa.toFixed(0)} m²)`, 'm²', gfa, 'services', 45, 'services')
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

  // ── 11. PROVISIONAL SUMS ──
  if (isDetailed) {
    add('ps-zesa', 'Provisional Sums', 'ZESA connection & meter (PC — client to confirm actual quote)', 'lump', 1, 'services_m2', 350, 'provisional')
    add('ps-zinwa', 'Provisional Sums', 'ZINWA water connection & meter (PC — client to confirm actual quote)', 'lump', 1, 'services_m2', 250, 'provisional')
  }

  // ── 12. FEES, CONTINGENCY, TAX ──
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

export interface MaterialScheduleItem {
  category: string
  material: string
  spec: string
  quantity: number
  unit: string
}

export function buildMaterialSchedule(items: BOQLineItem[]): MaterialScheduleItem[] {
  const schedule: MaterialScheduleItem[] = []

  // Concrete & Substructure
  const concreteItems = items.filter((i) => i.category === 'Substructure')
  const concQty = concreteItems.reduce((s, i) => s + i.quantity, 0)
  if (concQty > 0) schedule.push({ category: 'Concrete / Substructure', material: 'Concrete (strip footings, blinding, slab)', spec: '20 MPa mix', quantity: round2(concQty), unit: 'm³' })
  const rebarItems = items.filter((i) => i.id.includes('rebar'))
  const rebarQty = rebarItems.reduce((s, i) => s + i.quantity, 0)
  if (rebarQty > 0) schedule.push({ category: 'Concrete / Substructure', material: 'Reinforcement steel (Y12 / Y16)', spec: 'High-yield deformed bars', quantity: round2(rebarQty), unit: 'tonne' })

  // Masonry
  const wallItems = items.filter((i) => i.id.includes('wall') && !i.id.includes('tie') && !i.id.includes('dpc') && !i.id.includes('tile'))
  const wallQty = wallItems.reduce((s, i) => s + i.quantity, 0)
  if (wallQty > 0) schedule.push({ category: 'Masonry', material: 'Concrete blocks / bricks', spec: '190×190×390 mm / 225×112×75 face bricks', quantity: round2(wallQty), unit: 'm²' })
  const lintelItems = items.filter((i) => i.id.includes('lintel') && i.category === 'Superstructure')
  const lintelQty = lintelItems.reduce((s, i) => s + i.quantity, 0)
  if (lintelQty > 0) schedule.push({ category: 'Masonry', material: 'Precast concrete lintels', spec: '150×75 mm reinforced', quantity: Math.round(lintelQty), unit: 'each' })
  const tieItems = items.filter((i) => i.id.includes('wall-ties'))
  const tieQty = tieItems.reduce((s, i) => s + i.quantity, 0)
  if (tieQty > 0) schedule.push({ category: 'Masonry', material: 'Hoop-iron wall ties', spec: 'Galvanised 200×30×3 mm', quantity: Math.round(tieQty), unit: 'each' })

  // Roof
  const roofItems = items.filter((i) => i.category === 'Roofing')
  for (const ri of roofItems) {
    if (ri.id === 'roof-truss') schedule.push({ category: 'Roof', material: 'Timber trusses', spec: 'Fink trusses @ 600 c/c', quantity: ri.quantity, unit: 'm²' })
    if (ri.id === 'roof-covering') schedule.push({ category: 'Roof', material: 'CGI sheet roofing', spec: '0.47 mm×28 gauge, IBR profile', quantity: ri.quantity, unit: 'm²' })
    if (ri.id === 'roof-insulation') schedule.push({ category: 'Roof', material: 'Roof insulation', spec: 'Aluminium foil / isotherm 6 mm', quantity: ri.quantity, unit: 'm²' })
    if (ri.id === 'roof-slab') schedule.push({ category: 'Roof', material: 'Concrete roof slab', spec: '20 MPa reinforced, 150 mm thick', quantity: ri.quantity, unit: 'm²' })
    if (ri.id === 'roof-gutter') schedule.push({ category: 'Roof', material: 'PVC gutters', spec: '110 mm half-round', quantity: ri.quantity, unit: 'm' })
    if (ri.id === 'roof-downpipe') schedule.push({ category: 'Roof', material: 'PVC downpipes', spec: '75 mm round, with clips', quantity: ri.quantity, unit: 'm' })
  }

  // Windows & Doors
  const doorQty = items.find((i) => i.id === 'open-door')?.quantity ?? 0
  const winQty = items.find((i) => i.id === 'open-window')?.quantity ?? 0
  if (doorQty > 0) schedule.push({ category: 'Windows / Doors', material: 'Internal / external doors', spec: 'Solid core hollow 813×2032×40 mm / 44 mm', quantity: Math.round(doorQty), unit: 'each' })
  if (winQty > 0) schedule.push({ category: 'Windows / Doors', material: 'Aluminium / steel windows with glazing', spec: '4 mm float glass in powder-coated frames', quantity: Math.round(winQty), unit: 'each' })
  const ironItems = items.filter((i) => i.id.includes('ironmongery'))
  const ironQty = ironItems.reduce((s, i) => s + i.quantity, 0)
  if (ironQty > 0) schedule.push({ category: 'Windows / Doors', material: 'Door ironmongery sets', spec: 'Lever handles, hinges, lock set, door stop', quantity: Math.round(ironQty), unit: 'set' })

  // Finishes
  const finishCat = items.filter((i) => i.category === 'Finishes')
  for (const fi of finishCat) {
    if (fi.id === 'fin-tiles') schedule.push({ category: 'Finishes', material: 'Floor tiles', spec: 'Ceramic 400×400 mm non-slip', quantity: fi.quantity, unit: 'm²' })
    if (fi.id === 'fin-wall-tiles') schedule.push({ category: 'Finishes', material: 'Ceramic wall tiles (wet areas + kitchen splash)', spec: '200×300 mm white', quantity: fi.quantity, unit: 'm²' })
    if (fi.id === 'fin-ceiling') schedule.push({ category: 'Finishes', material: 'Ceiling boards', spec: '6 mm rhinolite / gypsum board on pine grid', quantity: fi.quantity, unit: 'm²' })
    if (fi.id === 'fin-skirting') schedule.push({ category: 'Finishes', material: 'Skirting (75 mm pine)', spec: 'Primed pine, mitred corners', quantity: fi.quantity, unit: 'm' })
    if (fi.id === 'fin-cornice') schedule.push({ category: 'Finishes', material: 'Cornice / coving', spec: 'Plaster / polyurethane profiles', quantity: fi.quantity, unit: 'm' })
    if (fi.id === 'fin-architrave') schedule.push({ category: 'Finishes', material: 'Door architrave sets', spec: 'Primed pine', quantity: Math.round(fi.quantity), unit: 'set' })
    if (fi.id === 'fin-paint-int') schedule.push({ category: 'Finishes', material: 'Interior emulsion paint', spec: 'Dulux / Plascon washable matt', quantity: fi.quantity, unit: 'm²' })
    if (fi.id === 'fin-paint-ext') schedule.push({ category: 'Finishes', material: 'Exterior masonry paint', spec: 'Weatherguard / equivalent', quantity: fi.quantity, unit: 'm²' })
  }

  // Joinery / Kitchen
  const counterTop = items.find((i) => i.id === 'fin-counter-top')
  if (counterTop) schedule.push({ category: 'Joinery / Kitchen', material: 'Kitchen counter top', spec: 'Melamine 18 mm, post-formed edge, 3 m run', quantity: counterTop.quantity, unit: 'm' })
  const baseCup = items.find((i) => i.id === 'fin-cupboard-base')
  if (baseCup) schedule.push({ category: 'Joinery / Kitchen', material: 'Kitchen base cupboards', spec: 'Melamine board 18 mm, 3 m run', quantity: baseCup.quantity, unit: 'm' })
  const wallCup = items.find((i) => i.id === 'fin-cupboard-wall')
  if (wallCup) schedule.push({ category: 'Joinery / Kitchen', material: 'Kitchen wall cupboards', spec: 'Melamine board 18 mm, 3 m run', quantity: wallCup.quantity, unit: 'm' })
  const curtain = items.find((i) => i.id === 'fin-curtain-rail')
  if (curtain) schedule.push({ category: 'Joinery / Kitchen', material: 'Curtain rails', spec: 'Aluminium / steel, with brackets & finials', quantity: Math.round(curtain.quantity), unit: 'set' })

  // Plumbing
  const plumbCat = items.filter((i) => i.category === 'Plumbing')
  for (const pi of plumbCat) {
    if (pi.id.includes('cold') || pi.id.includes('hot')) schedule.push({ category: 'Plumbing', material: 'HDPE / PEX pipe', spec: '20 mm (cold) / 15 mm (hot) class 10', quantity: pi.quantity, unit: 'm' })
    if (pi.id.includes('waste') || pi.id.includes('sewer')) schedule.push({ category: 'Plumbing', material: 'PVC pipe (waste / sewer)', spec: '75 mm (waste) / 110 mm (sewer)', quantity: pi.quantity, unit: 'm' })
    if (pi.id.includes('wc-pan') || pi.id === 'plumb-wc') schedule.push({ category: 'Plumbing', material: 'WC suite', spec: 'Close-coupled 6 L dual flush', quantity: Math.round(pi.quantity), unit: 'each' })
    if (pi.id.includes('basin')) schedule.push({ category: 'Plumbing', material: 'Basin', spec: 'White vitreous china 500×400 mm', quantity: Math.round(pi.quantity), unit: 'each' })
    if (pi.id.includes('geyser')) schedule.push({ category: 'Plumbing', material: 'Geyser', spec: '150 L electric, Kwikot / equivalent', quantity: Math.round(pi.quantity), unit: 'each' })
  }

  // Electrical
  const elecCat = items.filter((i) => i.category === 'Electrical')
  for (const ei of elecCat) {
    if (ei.id.includes('conduit') && !ei.id.includes('bend') && !ei.id.includes('saddle')) schedule.push({ category: 'Electrical', material: 'PVC conduit', spec: '20 mm / 25 mm heavy duty', quantity: ei.quantity, unit: 'm' })
    if (ei.id.includes('wiring') && !ei.id.includes('earth')) schedule.push({ category: 'Electrical', material: 'T&E cable', spec: '1.5 mm² (lighting) / 2.5 mm² (sockets) / 4 mm² (appliances)', quantity: ei.quantity, unit: 'm' })
    if (ei.id.includes('socket')) schedule.push({ category: 'Electrical', material: 'Socket outlets', spec: 'White 3-pin 15 A switched', quantity: Math.round(ei.quantity), unit: 'each' })
    if (ei.id.includes('switch') && !ei.id.includes('iso')) schedule.push({ category: 'Electrical', material: 'Light switches', spec: 'White 1/2-gang 10 A', quantity: Math.round(ei.quantity), unit: 'each' })
    if (ei.id.includes('db')) schedule.push({ category: 'Electrical', material: 'Distribution board', spec: '8-way, DIN rail, with main switch', quantity: Math.round(ei.quantity), unit: 'each' })
    if (ei.id.includes('breaker') && !ei.id.includes('elcb')) schedule.push({ category: 'Electrical', material: 'MCB circuit breakers', spec: '6 A / 16 A / 32 A', quantity: Math.round(ei.quantity), unit: 'each' })
  }

  // Prelims & General
  const prelimCat = items.filter((i) => i.category === 'Preliminaries')
  const prelimTotal = prelimCat.reduce((s, i) => s + i.total, 0)
  if (prelimTotal > 0) schedule.push({ category: 'Preliminaries / General', material: 'Preliminary items (site establishment, security, insurance, testing, docs)', spec: 'As per preliminaries section', quantity: 1, unit: 'lump sum' })

  return schedule
}

export interface FormalBOQSection {
  title: string
  html: string
}

export interface FormalBOQPage {
  title: string
  project: string
  date: string
  currency: string
  sections: FormalBOQSection[]
}

function escHtml(text: string | number): string {
  const s = String(text)
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function buildFormalBOQ(
  result: DetailedBoqResult,
  design: DesignOption,
  regionLabel: string,
  config: DetailedBoqConfig,
): string {
  const { boq, assumptions } = result
  const currency = boq.currency
  const money = (n: number) => `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Group items by category
  const TRADE_ORDER = ['Preliminaries', 'Substructure', 'Superstructure', 'Roofing', 'Openings', 'Finishes', 'Plumbing', 'Electrical', 'Mechanical', 'External Works', 'Provisional Sums']
  const grouped = new Map<string, BOQLineItem[]>()
  for (const item of boq.items) {
    const cat = item.category || 'Other'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(item)
  }

  // ── §1 ITEMIZED BOQ ──
  let boqHtml = '<table class="boq-table">'
  boqHtml += '<thead><tr><th style="width:40px">#</th><th>Item Description</th><th style="width:60px">Qty</th><th style="width:50px">Unit</th><th style="width:80px">Rate</th><th style="width:90px">Total</th></tr></thead><tbody>'
  let rowNum = 0
  for (const cat of TRADE_ORDER) {
    const items = grouped.get(cat)
    if (!items || items.length === 0) continue
    boqHtml += `<tr class="cat-header"><td colspan="6">${escHtml(cat)}</td></tr>`
    for (const item of items) {
      rowNum++
      boqHtml += `<tr class="item-row"><td class="num">${rowNum}</td><td>${escHtml(item.description)}</td><td class="num">${item.quantity.toLocaleString()}</td><td class="num">${escHtml(item.unit)}</td><td class="num">${money(item.rate)}</td><td class="num">${money(item.total)}</td></tr>`
    }
    const sub = items.reduce((s, i) => s + i.total, 0)
    boqHtml += `<tr class="subtotal-row"><td colspan="5">${escHtml(cat)} subtotal</td><td class="num">${money(sub)}</td></tr>`
  }
  boqHtml += '</tbody></table>'

  // ── §2 COST BREAKDOWN ──
  const summary = boq.summary
  let breakdownHtml = '<table class="summary-table">'
  breakdownHtml += `<tr><td>Subtotal (all trades)</td><td class="num">${money(summary.subtotal)}</td></tr>`
  breakdownHtml += `<tr><td>Contingency (${(summary.contingency / summary.subtotal * 100).toFixed(1)}%)</td><td class="num">${money(summary.contingency)}</td></tr>`
  breakdownHtml += `<tr><td>Professional Fees (${(summary.professionalFees / summary.subtotal * 100).toFixed(1)}%)</td><td class="num">${money(summary.professionalFees)}</td></tr>`
  breakdownHtml += `<tr><td>VAT (${(summary.vat / (summary.subtotal + summary.contingency + summary.professionalFees) * 100).toFixed(0)}%)</td><td class="num">${money(summary.vat)}</td></tr>`
  breakdownHtml += `<tr class="grand-total"><td>GRAND TOTAL</td><td class="num">${money(summary.grandTotal)}</td></tr>`
  breakdownHtml += '</table>'

  breakdownHtml += `<p style="margin-top:8px;font-size:11px;color:#555;">Cost per m²: ${money(summary.grandTotal / (config.areaM2 ?? 1))} / m² on ${(config.areaM2 ?? 0).toFixed(0)} m²</p>`

  // Rate assumptions table
  if (assumptions.length > 0) {
    breakdownHtml += '<h4 style="margin-top:16px;margin-bottom:4px;">Rate Assumptions</h4>'
    breakdownHtml += '<table class="assumptions-table"><thead><tr><th>Item</th><th>Rate</th><th>Source</th></tr></thead><tbody>'
    for (const a of assumptions) {
      breakdownHtml += `<tr><td>${escHtml(a.label)}</td><td class="num">${money(a.rate)}</td><td>${escHtml(a.source)}${a.warning ? ` — <span style="color:#c44">${escHtml(a.warning)}</span>` : ''}</td></tr>`
    }
    breakdownHtml += '</tbody></table>'
  }

  // ── §3 MATERIAL SCHEDULE ──
  const matSchedule = buildMaterialSchedule(boq.items)
  let matHtml = '<table class="mat-table"><thead><tr><th>Category</th><th>Material</th><th>Specification</th><th style="width:60px">Qty</th><th style="width:50px">Unit</th></tr></thead><tbody>'
  let currentCat = ''
  for (const m of matSchedule) {
    if (m.category !== currentCat) {
      currentCat = m.category
      matHtml += `<tr class="cat-header"><td colspan="5">${escHtml(m.category)}</td></tr>`
    }
    matHtml += `<tr><td></td><td>${escHtml(m.material)}</td><td style="font-size:10px;color:#666">${escHtml(m.spec)}</td><td class="num">${m.quantity.toLocaleString()}</td><td class="num">${escHtml(m.unit)}</td></tr>`
  }
  matHtml += '</tbody></table>'

  // ── §4 CONSTRUCTION PROGRAMME & CASH FLOW (GANTT) ──
  const areaM2 = config.areaM2 ?? design.grossFloorArea
  const floors = config.floorCount ?? design.floors ?? 1
  const programme = generateProgramme(summary.subtotal, areaM2, floors, result.quantities.roomCount, true, new Date().toISOString().split('T')[0])
  const cashflow = computeCashflow(programme.tasks, programme.totalDurationDays, programme.startDate)

  let ganttHtml = ''
  ganttHtml += `<p style="font-size:11px;color:#333;margin-bottom:8px;">Project duration: <strong>${programme.totalDurationDays} days</strong> (~${Math.round(programme.totalDurationDays / 7)} weeks) from ${formatDate(programme.startDate)}. Crew of 4–6. Critical path highlighted in production.</p>`

  // Gantt table
  ganttHtml += '<table class="gantt-table"><thead><tr><th>Code</th><th>Trade</th><th>Duration</th><th>Start</th><th>Finish</th><th>Labour</th><th>Material</th><th>Equip.</th><th>Total</th></tr></thead><tbody>'
  for (const t of programme.tasks) {
    ganttHtml += `<tr><td>${escHtml(t.code)}</td><td>${escHtml(t.trade)}</td><td class="num">${t.durationDays} d</td><td class="num">${formatDate(dayToDate(programme.startDate, t.startDay))}</td><td class="num">${formatDate(dayToDate(programme.startDate, t.finishDay))}</td><td class="num">${money(t.labourCost)}</td><td class="num">${money(t.materialCost)}</td><td class="num">${money(t.equipmentCost)}</td><td class="num">${money(t.totalCost)}</td></tr>`
  }
  ganttHtml += '</tbody></table>'

  // Weekly cashflow table
  ganttHtml += '<h4 style="margin:12px 0 4px;">Weekly Cashflow</h4>'
  ganttHtml += '<table class="cashflow-table"><thead><tr><th>Week</th><th>Period</th><th>Labour</th><th>Material</th><th>Equipment</th><th>Week Total</th><th>Cumulative</th></tr></thead><tbody>'
  for (const w of cashflow.weekly) {
    ganttHtml += `<tr><td class="num">W${w.period + 1}</td><td class="num">${formatDate(w.startDate)}–${formatDate(w.endDate)}</td><td class="num">${money(w.labourCost)}</td><td class="num">${money(w.materialCost)}</td><td class="num">${money(w.equipmentCost)}</td><td class="num">${money(w.periodCost)}</td><td class="num">${money(w.cumulativeCost)}</td></tr>`
  }
  ganttHtml += '</tbody></table>'

  ganttHtml += `<p style="font-size:11px;color:#555;margin-top:8px;">Peak weekly spend: ${money(cashflow.peakCost)} in ${formatDate(cashflow.weekly[cashflow.peakPeriod]?.startDate ?? cashflow.startDate)} | Total project cost: ${money(cashflow.totalCost)} | Average weekly: ${money(cashflow.avgWeeklyCost)}</p>`

  // ── §5 APPROVALS ──
  const approvalsHtml = `
  <div class="approvals">
    <p>This Bill of Quantities has been prepared based on the design option "<strong>${escHtml(design.name)}</strong>" using ${escHtml(regionLabel)} rate data and is intended for budgeting and procurement purposes.</p>
    <h4 style="margin-top:12px;">Important Notes</h4>
    <ul>
      <li><strong>Council fees</strong> (building plan approval): approximately <strong>USD 500</strong> — verify with City of ${escHtml(config.region.charAt(0).toUpperCase() + config.region.slice(1))} Director of Works.</li>
      <li><strong>ZESA connection</strong> and <strong>ZINWA connection</strong> are listed as Provisional Sums (PC amounts). These vary with distance from nearest pole/main — obtain actual quotes from ZETDC and ZINWA.</li>
      <li><strong>Kitchen budget</strong> is for entry-level melamine. Upgrade to solid wood / granite tops will increase costs.</li>
      <li><strong>Shower enclosures</strong> are budgeted at curtain-rod level. Frameless glass will add cost.</li>
      <li><strong>Programme</strong> assumes a crew of 4–6 starting in dry season. Wet-season (Nov–Mar) builds may add 2–3 weeks.</li>
      <li>All rates are current as of ${formatDate(boq.id.includes('boq') ? new Date().toISOString() : boq.id)} and may vary with market conditions.</li>
    </ul>
    <div style="margin-top:20px;border-top:2px solid #333;padding-top:10px;font-size:12px;">
      <div style="display:flex;justify-content:space-between;">
        <div>Prepared by: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div>
        <div>Date: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:20px;">
        <div>Checked by: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div>
        <div>Date: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:20px;">
        <div>Client approval: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div>
        <div>Date: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div>
      </div>
    </div>
  </div>`

  // ══════════════ FULL HTML DOCUMENT ══════════════
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Formal Bill of Quantities — ${escHtml(design.name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 12px; color: #222; background: #fff; padding: 30px; }
  .cover { text-align: center; margin-bottom: 30px; padding: 40px 20px; border-bottom: 3px double #333; }
  .cover h1 { font-size: 22px; letter-spacing: 2px; margin-bottom: 4px; }
  .cover h2 { font-size: 16px; font-weight: normal; color: #555; }
  .cover p { font-size: 11px; color: #888; margin-top: 8px; }
  h3.section { font-size: 14px; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ccc; color: #1a5276; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { padding: 4px 6px; border: 1px solid #ddd; text-align: left; font-size: 11px; }
  th { background: #1a5276; color: #fff; font-weight: 600; }
  .num { text-align: right; font-family: 'Consolas', 'Courier New', monospace; }
  .cat-header td { background: #e8edf2; font-weight: 700; color: #1a5276; font-size: 11px; padding: 5px 6px; }
  .subtotal-row td { background: #f0f4f8; font-weight: 600; border-top: 2px solid #1a5276; }
  .grand-total td { background: #d4edda; font-weight: 700; font-size: 13px; border: 2px solid #28a745; }
  .item-row td { font-size: 10px; }
  .summary-table td, .assumptions-table td { padding: 5px 8px; }
  .mat-table td { font-size: 10px; }
  .gantt-table td, .cashflow-table td { font-size: 10px; }
  .approvals { margin-top: 12px; font-size: 11px; line-height: 1.6; }
  .approvals ul { margin-left: 20px; }
  .approvals li { margin-bottom: 4px; }
  .page-break { page-break-before: always; }
  @media print {
    body { padding: 15px; }
    .page-break { page-break-before: always; }
  }
</style>
</head>
<body>
<div class="cover">
  <h1>FORMAL BILL OF QUANTITIES</h1>
  <h2>${escHtml(design.name)}</h2>
  <p>${escHtml(regionLabel)} | ${(config.areaM2 ?? 0).toFixed(0)} m² | ${floors} floor(s) | ${escHtml(design.buildingType ?? 'house')}</p>
  <p>Date: ${formatDate(new Date().toISOString())} | Currency: ${currency}</p>
</div>

<h3 class="section">§1 — Itemized Bill of Quantities</h3>
${boqHtml}

<h3 class="section">§2 — Cost Breakdown</h3>
${breakdownHtml}

<h3 class="section page-break">§3 — Material Schedule</h3>
<p style="font-size:11px;color:#555;margin-bottom:8px;">Consolidated material order list — take to suppliers for quotations.</p>
${matHtml}

<h3 class="section page-break">§4 — Construction Programme &amp; Cash Flow</h3>
${ganttHtml}

<h3 class="section page-break">§5 — Approvals &amp; Sign-off</h3>
${approvalsHtml}

<p style="margin-top:30px;font-size:10px;color:#999;text-align:center;">Generated by Budget Engineer OS · ${formatDate(new Date().toISOString())}</p>
</body>
</html>`
}
