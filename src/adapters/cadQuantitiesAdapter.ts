import type { CadDocument } from '@/domain/cad'

export interface CadQuantities {
  floors: number
  externalWallLength: number
  internalWallLength: number
  externalWallArea: number
  internalWallArea: number
  doorCount: number
  windowCount: number
  openingArea: number
  warnings: string[]
}

const WALL_HEIGHT = 3

function clampFinite(n: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0
  return Math.max(0, n)
}

function wallLen(
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  return Math.hypot(end.x - start.x, end.y - start.y)
}

export function extractCadDocumentQuantities(
  cad: CadDocument | null,
): CadQuantities {
  if (!cad) {
    return {
      floors: 0,
      externalWallLength: 0,
      internalWallLength: 0,
      externalWallArea: 0,
      internalWallArea: 0,
      doorCount: 0,
      windowCount: 0,
      openingArea: 0,
      warnings: ['No CadDocument provided'],
    }
  }

  const warnings: string[] = []
  const floorCount = cad.floors.length

  let externalLength = 0
  let internalLength = 0
  for (const wall of cad.walls) {
    const len = wallLen(wall.start, wall.end)
    if (wall.structuralRole === 'external') externalLength += len
    else internalLength += len
  }
  externalLength = clampFinite(externalLength)
  internalLength = clampFinite(internalLength)

  const externalArea = clampFinite(externalLength * WALL_HEIGHT)
  const internalArea = clampFinite(internalLength * WALL_HEIGHT)

  let doorCount = 0
  let windowCount = 0
  let openingArea = 0
  for (const opening of cad.openings) {
    const w = clampFinite(opening.width)
    const h = clampFinite(opening.headHeight ?? WALL_HEIGHT)
    if (opening.kind === 'door') {
      doorCount++
      openingArea += w * h
    } else {
      windowCount++
      openingArea += w * h
    }
  }
  openingArea = clampFinite(openingArea)

  if (cad.walls.length === 0) {
    warnings.push('CadDocument has no walls; quantities may be zero')
  }

  return {
    floors: floorCount,
    externalWallLength: externalLength,
    internalWallLength: internalLength,
    externalWallArea: externalArea,
    internalWallArea: internalArea,
    doorCount,
    windowCount,
    openingArea,
    warnings,
  }
}
