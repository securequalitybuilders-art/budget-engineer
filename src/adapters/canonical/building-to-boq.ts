import type { BuildingGraph } from '../../domain/building'
import type { BOQ, EstimateDepth } from '../../lib/boq/boq-types'
import type { RateAssumption } from '../rateCardAdapter'
import { getRegionRateCard } from '../rateCardAdapter'
import { generateDetailedBoq, type DetailedBoqConfig, type DetailedBoqResult } from '../../lib/boq/detailedBoq'
import type { GeometryQuantities } from '../geometryQuantitiesAdapter'
import { extractGraphQuantities } from './buildingGraphQuantityAdapter'
import type { RoofType } from '../designToBoq'

export type GeometrySource = 'canonical-graph' | 'unknown'

export interface GraphBoqSourceMetadata {
  geometrySource: GeometrySource
  quantitySourceLabel: string
  sourceWarnings?: string[]
  computedAt: string
  projectId?: string
  graphId?: string
}

export interface GraphBoqResult extends BOQ {
  assumptions: RateAssumption[]
  quantities?: GeometryQuantities
  sourceMetadata?: GraphBoqSourceMetadata
  estimateDepth: EstimateDepth
}

function estimateDepthFromGraph(graph: BuildingGraph): EstimateDepth {
  if (graph.walls.length > 0 && graph.spaces.length > 0) return 'detailed'
  if (graph.spaces.length > 0) return 'shell-with-allowances'
  return 'shell'
}

export function buildBoqFromBuildingGraph(
  graph: BuildingGraph | null,
  region = 'zimbabwe',
  roofType: RoofType = 'concrete-slab',
  sourceMetadata?: GraphBoqSourceMetadata,
  overriddenQty?: GeometryQuantities,
): GraphBoqResult | null {
  if (!graph || graph.levels.length === 0 || graph.spaces.length === 0) return null

  const qty = overriddenQty ?? extractGraphQuantities(graph)
  const estimateDepth = estimateDepthFromGraph(graph)
  const depth: DetailedBoqConfig['depth'] = estimateDepth === 'detailed' ? 'trade-detailed' : estimateDepth

  const floorCount = graph.levels.length
  const gfa = qty.grossFloorArea

  const fakeDesign = {
    id: graph.meta.id,
    name: graph.meta.name,
    grossFloorArea: gfa,
    floors: floorCount,
    buildingType: graph.meta.category,
    elements: graph.spaces.map((s) => ({
      id: s.id,
      type: s.programme,
      category: 'room',
      name: s.name,
      unit: 'm2' as const,
      quantity: s.areaM2,
    })),
  }

  const detailedResult: DetailedBoqResult = generateDetailedBoq(fakeDesign, {
    region,
    roofType,
    depth,
    floorCount,
    areaM2: gfa,
  }, qty)

  const card = getRegionRateCard(region)
  const result: GraphBoqResult = {
    ...detailedResult.boq,
    currency: card.currency,
    assumptions: detailedResult.assumptions,
    quantities: detailedResult.quantities,
    estimateDepth: detailedResult.depth,
  }

  if (sourceMetadata) {
    result.sourceMetadata = sourceMetadata
  }

  return result
}
