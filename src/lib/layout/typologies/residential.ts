import { getMinimumDimensions, classifyRoom } from '../../geometry/plan-intelligence'

export interface RoomSpec {
  name: string
  ratio: number
  minWidth: number
  minDepth: number
  role: 'public' | 'private' | 'wet' | 'circulation' | 'service'
}

const uid = () => Math.random().toString(36).slice(2, 10)

function classifyProgram(items: { name: string; ratio: number }[]): RoomSpec[] {
  return items.map(p => {
    const dims = getMinimumDimensions(p.name)
    return {
      name: p.name,
      ratio: p.ratio,
      minWidth: dims.minWidth,
      minDepth: dims.minDepth,
      role: classifyRoom(p.name),
    }
  })
}

function placeBand(
  specs: RoomSpec[],
  bandY: number,
  bandDepth: number,
  buildingWidth: number,
): { x: number; name: string; width: number; height: number; y: number }[] {
  const result: { x: number; name: string; width: number; height: number; y: number }[] = []
  let x = 0
  const ratioSum = specs.reduce((s, r) => s + r.ratio, 0) || 1

  for (let i = 0; i < specs.length; i++) {
    const r = specs[i]
    const isLast = i === specs.length - 1
    const remainingW = Math.max(0, buildingWidth - x)

    if (isLast) {
      result.push({ x: Number(x.toFixed(2)), name: r.name, width: Number(Math.max(r.minWidth, remainingW).toFixed(2)), height: Number(bandDepth.toFixed(2)), y: Number(bandY.toFixed(2)) })
      break
    }

    const minArea = r.minWidth * r.minDepth
    const ratioW = buildingWidth * (r.ratio / ratioSum)
    const areaW = bandDepth > 0.01 ? minArea / bandDepth : minArea
    const desiredW = Math.max(ratioW, areaW, r.minWidth, 1.5)
    const w = Math.min(desiredW, remainingW)

    if (w <= 0) break

    result.push({ x: Number(x.toFixed(2)), name: r.name, width: Number(w.toFixed(2)), height: Number(bandDepth.toFixed(2)), y: Number(bandY.toFixed(2)) })
    x += w
  }

  return result
}

export function generateResidentialCompact(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const specs = classifyProgram(program)
  const circItems = specs.filter(r => r.role === 'circulation')
  const publicItems = specs.filter(r => r.role === 'public')
  const privateItems = specs.filter(r => r.role === 'private' || r.role === 'wet')
  const serviceItems = specs.filter(r => r.role === 'service')

  const corridorDepth = Math.max(1.2, height * 0.12)
  const corridorY = height * 0.38
  const frontDepth = corridorY
  const rearDepth = height - corridorY - corridorDepth

  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  // Circulation band
  if (circItems.length > 0) {
    const circRooms = placeBand(circItems, corridorY, corridorDepth, width)
    for (const r of circRooms) {
      rooms.push({ id: uid(), name: r.name, x: r.x, y: r.y, width: r.width, height: r.height })
    }
  } else {
    rooms.push({ id: uid(), name: 'Circulation', x: 0, y: Number(corridorY.toFixed(2)), width: Number(width.toFixed(2)), height: Number(corridorDepth.toFixed(2)) })
  }

  // Public front band
  const frontRooms = [...publicItems, ...serviceItems]
  if (frontRooms.length > 0) {
    const fRooms = placeBand(frontRooms, 0, frontDepth, width)
    for (const r of fRooms) {
      rooms.push({ id: uid(), name: r.name, x: r.x, y: r.y, width: r.width, height: r.height })
    }
  }

  // Private rear band
  if (privateItems.length > 0) {
    const pRooms = placeBand(privateItems, corridorY + corridorDepth, rearDepth, width)
    // Sort wet rooms together
    const wetItems = pRooms.filter(r => classifyRoom(r.name) === 'wet')
    const dryItems = pRooms.filter(r => classifyRoom(r.name) !== 'wet')
    const rearranged = [...wetItems, ...dryItems]
    let x = 0
    for (const r of rearranged) {
      const w = Math.max(getMinimumDimensions(r.name).minWidth, (width * r.width) / Math.max(width, 0.01))
      rooms.push({ id: uid(), name: r.name, x: Number(x.toFixed(2)), y: Number((corridorY + corridorDepth).toFixed(2)), width: Number(Math.min(w, width - x).toFixed(2)), height: Number(rearDepth.toFixed(2)) })
      x += w
    }
  }

  return rooms
}

export function generateResidentialFamily(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  // Family layout: larger front zone, central hall spine, deeper private zone
  const specs = classifyProgram(program)
  const circItems = specs.filter(r => r.role === 'circulation')
  const publicItems = specs.filter(r => r.role === 'public')
  const privateItems = specs.filter(r => r.role === 'private' || r.role === 'wet')
  const serviceItems = specs.filter(r => r.role === 'service')

  const corridorDepth = Math.max(1.5, height * 0.14)
  const corridorY = height * 0.42
  const frontDepth = corridorY
  const rearDepth = height - corridorY - corridorDepth

  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  if (circItems.length > 0) {
    const circRooms = placeBand(circItems, corridorY, corridorDepth, width)
    for (const r of circRooms) rooms.push({ id: uid(), name: r.name, x: r.x, y: r.y, width: r.width, height: r.height })
  } else {
    rooms.push({ id: uid(), name: 'Circulation', x: 0, y: Number(corridorY.toFixed(2)), width: Number(width.toFixed(2)), height: Number(corridorDepth.toFixed(2)) })
  }

  const frontRooms = [...publicItems, ...serviceItems]
  if (frontRooms.length > 0) {
    for (const r of placeBand(frontRooms, 0, frontDepth, width)) {
      rooms.push({ id: uid(), name: r.name, x: r.x, y: r.y, width: r.width, height: r.height })
    }
  }

  if (privateItems.length > 0) {
    for (const r of placeBand(privateItems, corridorY + corridorDepth, rearDepth, width)) {
      rooms.push({ id: uid(), name: r.name, x: r.x, y: r.y, width: r.width, height: r.height })
    }
  }

  return rooms
}

export function generateResidentialVilla(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  // Villa: larger public rooms, entry hall, guest/private separation, formal spine
  const specs = classifyProgram(program)
  const circItems = specs.filter(r => r.role === 'circulation')
  const publicItems = specs.filter(r => r.role === 'public')
  const privateItems = specs.filter(r => r.role === 'private' || r.role === 'wet')
  const serviceItems = specs.filter(r => r.role === 'service')

  const corridorDepth = Math.max(1.8, height * 0.15)
  const corridorY = height * 0.45
  const frontDepth = corridorY
  const rearDepth = height - corridorY - corridorDepth

  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  // Larger hall/entry
  const entryHall = circItems.find(r => r.name === 'Circulation' || r.name.includes('Hall') || r.name.includes('Lobby'))
  if (entryHall) {
    const hallW = Math.max(2.0, width * 0.15)
    rooms.push({ id: uid(), name: entryHall.name, x: 0, y: Number(corridorY.toFixed(2)), width: Number(hallW.toFixed(2)), height: Number(corridorDepth.toFixed(2)) })
  }

  // Remaining circulation as side corridor
  const otherCirc = circItems.filter(r => r !== entryHall)
  if (otherCirc.length > 0) {
    const circW = Math.max(1.2, width * 0.12)
    const circX = entryHall ? Math.max(0, width - circW) : 0
    rooms.push({ id: uid(), name: 'Circulation', x: Number(circX.toFixed(2)), y: Number(corridorY.toFixed(2)), width: Number(Math.min(circW, width - circX).toFixed(2)), height: Number(corridorDepth.toFixed(2)) })
  }

  // Public zone — larger, with veranda
  const veranda = publicItems.find(r => r.name.includes('Veranda') || r.name.includes('Verandah'))
  const otherPublic = publicItems.filter(r => r !== veranda)

  let frontX = 0
  for (const r of placeBand(otherPublic, 0, frontDepth * 0.85, width)) {
    rooms.push({ id: uid(), name: r.name, x: r.x, y: r.y, width: r.width, height: r.height })
    frontX = Math.max(frontX, r.x + r.width)
  }

  if (veranda && frontX < width) {
    rooms.push({ id: uid(), name: 'Veranda', x: Number(frontX.toFixed(2)), y: 0, width: Number((width - frontX).toFixed(2)), height: Number(frontDepth.toFixed(2)) })
  }

  if (serviceItems.length > 0) {
    for (const r of placeBand(serviceItems, frontDepth * 0.3, frontDepth * 0.7, width)) {
      rooms.push({ id: uid(), name: r.name, x: r.x, y: r.y, width: r.width, height: r.height })
    }
  }

  // Private rear zone
  if (privateItems.length > 0) {
    for (const r of placeBand(privateItems, corridorY + corridorDepth, rearDepth, width)) {
      rooms.push({ id: uid(), name: r.name, x: r.x, y: r.y, width: r.width, height: r.height })
    }
  }

  return rooms
}

export function generateDuplexLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  // Duplex: mirror two units around a party wall
  const halfW = width / 2
  const halfProgram = program.map(p => ({
    ...p,
    ratio: p.ratio * 0.5,
  }))

  const unitRooms = generateResidentialFamily(halfProgram, halfW, height)
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  // Unit A (left)
  for (const r of unitRooms) {
    rooms.push({ ...r, id: uid(), name: `${r.name} (Unit A)` })
  }

  // Party wall
  const partyX = halfW
  rooms.push({ id: uid(), name: 'Party Wall', x: Number((partyX - 0.1).toFixed(2)), y: 0, width: 0.2, height: Number(height.toFixed(2)) })

  // Unit B (right — mirrored)
  for (const r of unitRooms) {
    rooms.push({
      id: uid(),
      name: `${r.name} (Unit B)`,
      x: Number((width - r.x - r.width).toFixed(2)),
      y: r.y,
      width: r.width,
      height: r.height,
    })
  }

  return rooms
}
