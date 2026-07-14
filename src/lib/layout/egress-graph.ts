import { classifyRoom, type RoomRole } from '../geometry/plan-intelligence'
import type { AdjacencyMap } from '../geometry/polygon-adjacency'

export interface EgressNode {
  roomId: string
  roomName: string
  role: RoomRole
  hasDoor: boolean
  hasWindow: boolean
  isExit: boolean
  isCirculation: boolean
}

export interface EgressEdge {
  fromId: string
  toId: string
  wallId: string
  hasDoor: boolean
}

export interface EgressGraph {
  nodes: Map<string, EgressNode>
  edges: EgressEdge[]
}

export function buildEgressGraph(
  roomIds: string[],
  roomNames: Record<string, string>,
  adjacencyMap: AdjacencyMap,
  doorWallIds: Set<string>,
): EgressGraph {
  const nodes = new Map<string, EgressNode>()
  const edges: EgressEdge[] = []

  for (const id of roomIds) {
    const name = roomNames[id] || 'Unknown'
    const role = classifyRoom(name)
    nodes.set(id, {
      roomId: id,
      roomName: name,
      role,
      hasDoor: false,
      hasWindow: false,
      isExit: role === 'circulation' || role === 'public',
      isCirculation: role === 'circulation',
    })
  }

  for (const [id, neighbors] of Object.entries(adjacencyMap)) {
    for (const n of neighbors) {
      const hasDoor = doorWallIds.has(n.wallId)
      edges.push({
        fromId: id,
        toId: n.roomId,
        wallId: n.wallId,
        hasDoor,
      })
    }
  }

  // Mark doors on nodes
  for (const edge of edges) {
    if (edge.hasDoor) {
      const fromNode = nodes.get(edge.fromId)
      const toNode = nodes.get(edge.toId)
      if (fromNode) fromNode.hasDoor = true
      if (toNode) toNode.hasDoor = true
    }
  }

  return { nodes, edges }
}

export interface EgressValidation {
  passed: boolean
  warnings: string[]
  pathLengths: Map<string, number>
}

export function validateEgress(graph: EgressGraph): EgressValidation {
  const warnings: string[] = []
  const pathLengths = new Map<string, number>()

  // Find all exit nodes (circulation or public rooms with doors)
  const exitIds = new Set<string>()
  for (const [id, node] of graph.nodes) {
    if (node.isExit && node.hasDoor) {
      exitIds.add(id)
    }
  }

  // If no exits found, use any public/circulation node
  if (exitIds.size === 0) {
    for (const [id, node] of graph.nodes) {
      if (node.isExit) exitIds.add(id)
    }
  }

  // BFS from each room to nearest exit
  for (const [startId, node] of graph.nodes) {
    if (exitIds.has(startId)) {
      pathLengths.set(startId, 0)
      continue
    }

    // BFS
    const visited = new Set<string>()
    const queue: { id: string; dist: number }[] = [{ id: startId, dist: 0 }]
    let found = false

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current.id)) continue
      visited.add(current.id)

      if (exitIds.has(current.id)) {
        pathLengths.set(startId, current.dist)
        found = true
        break
      }

      // Follow edges that have doors
      const doorEdges = graph.edges.filter(e => e.fromId === current.id && e.hasDoor)
      for (const e of doorEdges) {
        if (!visited.has(e.toId)) {
          queue.push({ id: e.toId, dist: current.dist + 1 })
        }
      }
    }

    if (!found) {
      // Try without door constraint (maybe validation hasn't placed doors yet)
      const fallbackQueue: { id: string; dist: number }[] = [{ id: startId, dist: 0 }]
      const fallbackVisited = new Set<string>()
      while (fallbackQueue.length > 0) {
        const current = fallbackQueue.shift()!
        if (fallbackVisited.has(current.id)) continue
        fallbackVisited.add(current.id)

        if (exitIds.has(current.id)) {
          pathLengths.set(startId, current.dist)
          found = true
          break
        }

        const allEdges = graph.edges.filter(e => e.fromId === current.id)
        for (const e of allEdges) {
          if (!fallbackVisited.has(e.toId)) {
            fallbackQueue.push({ id: e.toId, dist: current.dist + 1 })
          }
        }
      }

      if (!found) {
        warnings.push(`Room "${node.roomName}" has no path to any exit`)
      }
    }
  }

  // Check bedroom-to-bedroom access
  const privateIds = new Set<string>()
  for (const [id, node] of graph.nodes) {
    if (node.role === 'private') privateIds.add(id)
  }
  for (const id of privateIds) {
    const doorEdges = graph.edges.filter(e => e.fromId === id && e.hasDoor)
    const doorNeighbors = doorEdges.map(e => graph.nodes.get(e.toId))
    const onlyBedrooms = doorNeighbors.every(n => n?.role === 'private')
    if (onlyBedrooms && doorNeighbors.length > 0) {
      const node = graph.nodes.get(id)
      warnings.push(`Room "${node?.roomName}" can only be accessed through other bedrooms`)
    }
  }

  // Check trapped circulation
  for (const [id, node] of graph.nodes) {
    if (!node.isCirculation) continue
    const doorEdges = graph.edges.filter(e => e.fromId === id && e.hasDoor)
    if (doorEdges.length === 0) {
      warnings.push(`Circulation room "${node.roomName}" has no doors — potentially trapped`)
    }
  }

  return {
    passed: warnings.length === 0,
    warnings,
    pathLengths,
  }
}
