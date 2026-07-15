import { pickHouseTemplate } from '../layout-templates'
import { packTemplate } from '../grid-packer'

const uid = () => Math.random().toString(36).slice(2, 10)

export function generateResidentialCompact(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  seed = 0,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const template = pickHouseTemplate(width * height, seed || 1)
  return packTemplate(template, program, width, height, seed).rooms
}

export function generateResidentialFamily(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  seed = 0,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const template = pickHouseTemplate(width * height, seed || 1)
  return packTemplate(template, program, width, height, seed).rooms
}

export function generateResidentialVilla(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  seed = 0,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const template = pickHouseTemplate(width * height, seed || 1)
  return packTemplate(template, program, width, height, seed).rooms
}

export function generateDuplexLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  seed = 0,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const halfW = width / 2
  const halfProgram = program.map(p => ({
    ...p,
    ratio: p.ratio * 0.5,
  }))

  const template = pickHouseTemplate(halfW * height, seed || 1)
  const unitResult = packTemplate(template, halfProgram, halfW, height, seed)
  const unitRooms = unitResult.rooms
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  for (const r of unitRooms) {
    rooms.push({ ...r, id: uid(), name: `${r.name} (Unit A)` })
  }

  const partyX = halfW
  rooms.push({ id: uid(), name: 'Party Wall', x: Number((partyX - 0.1).toFixed(2)), y: 0, width: 0.2, height: Number(height.toFixed(2)) })

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
