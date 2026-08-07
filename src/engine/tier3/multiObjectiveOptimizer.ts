import type { Tier1ParsedBrief } from '../tier1-types'
import type { SpatialConstraint } from '../tier1/briefEnhancer'
import type { LayoutParameters, FloorPlan, PlacedRoom, Topology } from './tier3-types'
import type { DesignOption } from '../../domain/boq'
import type { PlanModel, RoomRect } from '../../domain/plan'
import { analyzeCirculation } from './circulationEngine'
import { classifyRoom } from './roomClassifier'
import { getMinimumDimensions } from '../standards/roomStandards'

export interface ObjectiveScores {
  efficiency: number
  wetCoreClustering: number
  structuralEfficiency: number
  circulation: number
  daylightAccess: number
  overall: number
}

export type WeightProfileId = 'balanced' | 'cost-effective' | 'comfort' | 'construction-ease'

export interface WeightProfile {
  id: WeightProfileId
  label: string
  weights: {
    efficiency: number
    wetCoreClustering: number
    structuralEfficiency: number
    circulation: number
    daylightAccess: number
  }
}

export const WEIGHT_PROFILES: WeightProfile[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    weights: { efficiency: 0.25, wetCoreClustering: 0.2, structuralEfficiency: 0.2, circulation: 0.2, daylightAccess: 0.15 },
  },
  {
    id: 'cost-effective',
    label: 'Cost-Effective',
    weights: { efficiency: 0.35, wetCoreClustering: 0.25, structuralEfficiency: 0.25, circulation: 0.1, daylightAccess: 0.05 },
  },
  {
    id: 'comfort',
    label: 'Comfort-Focused',
    weights: { efficiency: 0.1, wetCoreClustering: 0.15, structuralEfficiency: 0.1, circulation: 0.25, daylightAccess: 0.4 },
  },
  {
    id: 'construction-ease',
    label: 'Construction-Ease',
    weights: { efficiency: 0.25, wetCoreClustering: 0.15, structuralEfficiency: 0.4, circulation: 0.15, daylightAccess: 0.05 },
  },
]

export interface TopologyCandidate {
  topology: Topology
  seed: number
  floorPlan: FloorPlan
  planModel: PlanModel
  scores: ObjectiveScores
  rankByProfile: Partial<Record<WeightProfileId, number>>
}

export interface OptimizerResult {
  candidates: TopologyCandidate[]
  paretoFront: TopologyCandidate[]
  topByProfile: Record<WeightProfileId, TopologyCandidate[]>
}

const TOPOLOGIES: Topology[] = ['rectangle', 'l-shape', 'split-wing', 'courtyard']
const SEEDS = [42, 137, 271]

function computeEfficiency(rooms: PlacedRoom[], buildingW: number, buildingD: number): number {
  const totalArea = buildingW * buildingD
  if (totalArea <= 0) return 0
  const usedArea = rooms.reduce((s, r) => s + r.width * r.height, 0)
  const ratio = usedArea / totalArea
  return Math.min(1, Math.max(0, ratio))
}

function computeWetCoreClustering(rooms: PlacedRoom[]): number {
  const wetCores = rooms.filter((r) => classifyRoom(r.name).isWetCore)
  if (wetCores.length < 2) return 1
  let pairCount = 0
  let closePairs = 0
  for (let i = 0; i < wetCores.length; i++) {
    for (let j = i + 1; j < wetCores.length; j++) {
      pairCount++
      const cx1 = wetCores[i].x + wetCores[i].width / 2
      const cy1 = wetCores[i].y + wetCores[i].height / 2
      const cx2 = wetCores[j].x + wetCores[j].width / 2
      const cy2 = wetCores[j].y + wetCores[j].height / 2
      const dist = Math.hypot(cx2 - cx1, cy2 - cy1)
      if (dist <= 6) closePairs++
    }
  }
  return pairCount > 0 ? closePairs / pairCount : 1
}

function computeStructuralEfficiency(rooms: PlacedRoom[]): number {
  let spanScore = 0
  let count = 0
  for (const r of rooms) {
    count++
    const maxSpan = Math.max(r.width, r.height)
    if (maxSpan <= 5) spanScore += 1
    else if (maxSpan <= 7) spanScore += 0.6
    else if (maxSpan <= 9) spanScore += 0.3
  }
  return count > 0 ? spanScore / count : 0
}

function computeCirculationScore(rooms: PlacedRoom[], buildingW: number, buildingD: number): number {
  const circResult = analyzeCirculation(rooms, buildingW, buildingD)
  let score = 0
  if (circResult.compliant) score += 0.4
  score += Math.max(0, 1 - (circResult.maxTravelDistance - 6) / 12) * 0.3
  if (circResult.egressPoints.length >= 2) score += 0.2
  if (circResult.adjacencyWarnings.length === 0) score += 0.1
  return Math.min(1, score)
}

function computeDaylightAccess(rooms: PlacedRoom[], buildingW: number): number {
  const habitable = rooms.filter((r) => {
    const c = classifyRoom(r.name)
    return c.zone === 'public' || c.zone === 'private'
  })
  if (habitable.length === 0) return 0
  let score = 0
  for (const r of habitable) {
    const depth = r.height
    const roomDepthRatio = buildingW > 0 ? depth / buildingW : 1
    if (roomDepthRatio <= 0.35) score += 1
    else if (roomDepthRatio <= 0.5) score += 0.7
    else if (roomDepthRatio <= 0.65) score += 0.4
    else score += 0.15
  }
  return score / habitable.length
}

function computeOverall(scores: ObjectiveScores, weights: { efficiency: number; wetCoreClustering: number; structuralEfficiency: number; circulation: number; daylightAccess: number }): number {
  return (
    scores.efficiency * weights.efficiency +
    scores.wetCoreClustering * weights.wetCoreClustering +
    scores.structuralEfficiency * weights.structuralEfficiency +
    scores.circulation * weights.circulation +
    scores.daylightAccess * weights.daylightAccess
  )
}

function floorPlanToPlanModel(floorPlan: FloorPlan, designOptionId: string): PlanModel {
  const rooms: RoomRect[] = floorPlan.rooms.map((r, i) => ({
    id: `room-${i}`,
    name: r.name,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
  }))
  const walls = extractWallsFromRooms(rooms, 0.23)
  return {
    id: `plan-${designOptionId}-${floorPlan.id}`,
    designOptionId,
    width: floorPlan.width,
    height: floorPlan.height,
    wallThickness: 0.23,
    rooms,
    walls,
    openings: [],
    scaleLabel: '1:100',
  }
}

function extractWallsFromRooms(rooms: RoomRect[], thickness: number): { id: string; start: { x: number; y: number }; end: { x: number; y: number }; thickness: number; type: 'external' | 'internal' }[] {
  const walls: { id: string; start: { x: number; y: number }; end: { x: number; y: number }; thickness: number; type: 'external' | 'internal' }[] = []
  let wallId = 0
  const edgeCount = new Map<string, number>()
  const edgeKey = (x1: number, y1: number, x2: number, y2: number) => {
    const a = `${Math.round(x1 * 100)},${Math.round(y1 * 100)}`
    const b = `${Math.round(x2 * 100)},${Math.round(y2 * 100)}`
    return a < b ? `${a}-${b}` : `${b}-${a}`
  }
  for (const r of rooms) {
    const edges: [{ x: number; y: number }, { x: number; y: number }][] = [
      [{ x: r.x, y: r.y }, { x: r.x + r.width, y: r.y }],
      [{ x: r.x + r.width, y: r.y }, { x: r.x + r.width, y: r.y + r.height }],
      [{ x: r.x + r.width, y: r.y + r.height }, { x: r.x, y: r.y + r.height }],
      [{ x: r.x, y: r.y + r.height }, { x: r.x, y: r.y }],
    ]
    for (const [s, e] of edges) {
      const key = edgeKey(s.x, s.y, e.x, e.y)
      edgeCount.set(key, (edgeCount.get(key) || 0) + 1)
    }
  }
  const eps = 0.01
  for (const r of rooms) {
    const edges: [{ x: number; y: number }, { x: number; y: number }][] = [
      [{ x: r.x, y: r.y }, { x: r.x + r.width, y: r.y }],
      [{ x: r.x + r.width, y: r.y }, { x: r.x + r.width, y: r.y + r.height }],
      [{ x: r.x + r.width, y: r.y + r.height }, { x: r.x, y: r.y + r.height }],
      [{ x: r.x, y: r.y + r.height }, { x: r.x, y: r.y }],
    ]
    for (const [s, e] of edges) {
      const key = edgeKey(s.x, s.y, e.x, e.y)
      const count = edgeCount.get(key) || 0
      if (Math.abs(s.x - e.x) < eps) {
        if (e.y > s.y) {
          walls.push({ id: `w-${wallId++}`, start: { x: s.x - thickness / 2, y: s.y }, end: { x: s.x + thickness / 2, y: e.y }, thickness, type: count >= 2 ? 'internal' : 'external' })
        } else {
          walls.push({ id: `w-${wallId++}`, start: { x: s.x - thickness / 2, y: e.y }, end: { x: s.x + thickness / 2, y: s.y }, thickness, type: count >= 2 ? 'internal' : 'external' })
        }
      } else {
        if (e.x > s.x) {
          walls.push({ id: `w-${wallId++}`, start: { x: s.x, y: s.y - thickness / 2 }, end: { x: e.x, y: s.y + thickness / 2 }, thickness, type: count >= 2 ? 'internal' : 'external' })
        } else {
          walls.push({ id: `w-${wallId++}`, start: { x: e.x, y: s.y - thickness / 2 }, end: { x: s.x, y: s.y + thickness / 2 }, thickness, type: count >= 2 ? 'internal' : 'external' })
        }
      }
    }
  }
  return walls
}

function computeScores(floorPlan: FloorPlan): ObjectiveScores {
  const efficiency = computeEfficiency(floorPlan.rooms, floorPlan.width, floorPlan.height)
  const wetCoreClustering = computeWetCoreClustering(floorPlan.rooms)
  const structuralEfficiency = computeStructuralEfficiency(floorPlan.rooms)
  const circulation = computeCirculationScore(floorPlan.rooms, floorPlan.width, floorPlan.height)
  const daylightAccess = computeDaylightAccess(floorPlan.rooms, floorPlan.width)
  return {
    efficiency,
    wetCoreClustering,
    structuralEfficiency,
    circulation,
    daylightAccess,
    overall: 0,
  }
}

function isDominated(a: ObjectiveScores, b: ObjectiveScores): boolean {
  const objectives: (keyof ObjectiveScores)[] = ['efficiency', 'wetCoreClustering', 'structuralEfficiency', 'circulation', 'daylightAccess']
  let strictlyBetter = false
  let noWorse = true
  for (const obj of objectives) {
    if (a[obj] > b[obj]) strictlyBetter = true
    if (a[obj] < b[obj]) noWorse = false
  }
  return strictlyBetter && noWorse
}

function computeParetoFront(candidates: TopologyCandidate[]): TopologyCandidate[] {
  return candidates.filter((c) => !candidates.some((other) => other !== c && isDominated(other.scores, c.scores)))
}

function rankByWeights(candidates: TopologyCandidate[], weights: { efficiency: number; wetCoreClustering: number; structuralEfficiency: number; circulation: number; daylightAccess: number }): TopologyCandidate[] {
  return [...candidates]
    .map((c) => ({ ...c, scores: { ...c.scores, overall: computeOverall(c.scores, weights) } }))
    .sort((a, b) => b.scores.overall - a.scores.overall)
}

export async function optimize(brief: Tier1ParsedBrief, designOption: DesignOption, _constraints?: { spatialConstraints?: SpatialConstraint[] }): Promise<OptimizerResult> {
  const candidates: TopologyCandidate[] = []
  const siteW = brief.siteInfo.widthM ?? 20
  const siteD = brief.siteInfo.depthM ?? 25
  const { generateFloorPlans } = await import('./layoutEngine')

  for (const topology of TOPOLOGIES) {
    for (const seed of SEEDS) {
      const params: LayoutParameters = {
        topologies: [topology],
        siteWidth: siteW,
        siteDepth: siteD,
        wallThickness: 0.23,
        corridorWidth: 1.2,
        minRoomDimensions: Object.fromEntries(
          ['Living Room', 'Master Bedroom', 'Bedroom', 'Kitchen', 'Bathroom'].map((name) => [name, getMinimumDimensions(name)]),
        ),
        floorCount: 1,
        floorHeight: 3,
      }

      try {
        const seedRandom = seed
        const seededBrief = {
          ...brief,
          rawText: `${brief.rawText} seed=${seedRandom}`,
        }
        const floorPlans = generateFloorPlans(params, seededBrief as Tier1ParsedBrief)
        if (!floorPlans || floorPlans.length === 0) continue
        const fp = floorPlans[0]
        const scores = computeScores(fp)
        const planModel = floorPlanToPlanModel(fp, designOption.id)
        candidates.push({ topology, seed, floorPlan: fp, planModel, scores, rankByProfile: {} })
      } catch {
        continue
      }
    }
  }

  const paretoFront = computeParetoFront(candidates)
  const topByProfile: Record<WeightProfileId, TopologyCandidate[]> = {} as Record<WeightProfileId, TopologyCandidate[]>

  for (const profile of WEIGHT_PROFILES) {
    const ranked = rankByWeights(candidates, profile.weights)
    topByProfile[profile.id] = ranked.slice(0, 4)
    for (let i = 0; i < ranked.length; i++) {
      ranked[i].rankByProfile[profile.id] = i + 1
    }
  }

  return { candidates, paretoFront, topByProfile }
}

export function selectByProfile(result: OptimizerResult, profileId: WeightProfileId, count: number = 3): TopologyCandidate[] {
  return result.topByProfile[profileId]?.slice(0, count) ?? []
}

export function selectParetoTop(result: OptimizerResult, count: number = 3): TopologyCandidate[] {
  return result.paretoFront.slice(0, count)
}
