import type { CadDocument, CadWall } from '../../domain/cad'

function near(a: number, b: number, tolerance = 0.15) {
  return Math.abs(a - b) <= tolerance
}

export function healCadDocument(doc: CadDocument): CadDocument {
  const walls = doc.walls.map((wall) => ({ ...wall }))

  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      snapEndpointsTogether(walls[i], walls[j])
    }
  }

  return { ...doc, walls }
}

function snapEndpointsTogether(a: CadWall, b: CadWall) {
  if (near(a.end.x, b.start.x) && near(a.end.y, b.start.y)) {
    b.start = { ...a.end }
  }
  if (near(a.start.x, b.end.x) && near(a.start.y, b.end.y)) {
    b.end = { ...a.start }
  }
  if (near(a.start.x, b.start.x) && near(a.start.y, b.start.y)) {
    b.start = { ...a.start }
  }
  if (near(a.end.x, b.end.x) && near(a.end.y, b.end.y)) {
    b.end = { ...a.end }
  }
}
