export interface RoomAreaInput {
  area: number
  name?: string
  type?: string
}

export interface AreaScheduleResult {
  grossFloorArea: number
  netUsableArea: number
  circulationArea: number
  circulationPercent: number
  roomCount: number
  areaPerRoom: { name: string; area: number }[]
  efficiencyRatio: number
  warnings: string[]
}

const DEFAULT_CIRCULATION_PCT = 0.25

export function computeAreaSchedule(
  rooms: RoomAreaInput[],
  grossFloorArea?: number,
  circulationPct?: number,
): AreaScheduleResult {
  const warnings: string[] = []

  if (!rooms || rooms.length === 0) {
    return {
      grossFloorArea: 0,
      netUsableArea: 0,
      circulationArea: 0,
      circulationPercent: 0,
      roomCount: 0,
      areaPerRoom: [],
      efficiencyRatio: 0,
      warnings: ['No rooms provided'],
    }
  }

  const validRooms = rooms.filter((r) => r.area >= 0)
  const netUsableArea = Number(validRooms.reduce((s, r) => s + r.area, 0).toFixed(2))

  const circPct = circulationPct ?? DEFAULT_CIRCULATION_PCT
  const gfa = grossFloorArea ?? (netUsableArea > 0 ? Number((netUsableArea / (1 - circPct)).toFixed(2)) : 0)
  const circulationArea = Number((gfa - netUsableArea).toFixed(2))

  if (circulationArea < 0) {
    warnings.push('Gross floor area is less than net usable area; check inputs')
  }

  const areaPerRoom = validRooms
    .filter((r) => r.area > 0)
    .map((r) => ({
      name: r.name ?? r.type ?? 'Unnamed',
      area: Number(r.area.toFixed(2)),
    }))

  const efficiencyRatio = gfa > 0 ? Number((netUsableArea / gfa).toFixed(4)) : 0

  if (rooms.some((r) => r.area < 0)) {
    warnings.push('Some rooms have negative area; they were excluded')
  }

  return {
    grossFloorArea: gfa,
    netUsableArea,
    circulationArea: Math.max(0, circulationArea),
    circulationPercent: gfa > 0 ? Number(((circulationArea / gfa) * 100).toFixed(1)) : 0,
    roomCount: validRooms.length,
    areaPerRoom,
    efficiencyRatio,
    warnings,
  }
}

export const DEFAULTS = { DEFAULT_CIRCULATION_PCT } as const
