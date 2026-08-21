import { create } from 'zustand'
import { temporal } from 'zundo'

export type NodeType =
  | 'site' | 'building' | 'level'
  | 'wall' | 'slab' | 'ceiling' | 'roof'
  | 'item' | 'zone' | 'scan' | 'guide'

export interface BaseNode {
  id: string
  type: NodeType
  parentId: string | null
  children: string[]
  visible: boolean
  metadata: Record<string, unknown>
}

export interface WallNode extends BaseNode {
  type: 'wall'
  width: number
  height: number
  thickness: number
  startX: number
  startY: number
  endX: number
  endY: number
  material: string
  fireRating: string
}

export interface SlabNode extends BaseNode {
  type: 'slab'
  elevation: number
  polygon: Array<{ x: number; y: number }>
  thickness: number
}

export interface CeilingNode extends BaseNode {
  type: 'ceiling'
  elevation: number
  polygon: Array<{ x: number; y: number }>
}

export interface RoofNode extends BaseNode {
  type: 'roof'
  pitch: number
  polygon: Array<{ x: number; y: number }>
}

export interface ItemNode extends BaseNode {
  type: 'item'
  itemType: 'door' | 'window' | 'light'
  width: number
  height: number
  parentWallId: string | null
  offsetAlongWall: number
}

export interface ZoneNode extends BaseNode {
  type: 'zone'
  label: string
  polygon: Array<{ x: number; y: number }>
}

export interface SiteNode extends BaseNode {
  type: 'site'
}

export interface BuildingNode extends BaseNode {
  type: 'building'
}

export interface LevelNode extends BaseNode {
  type: 'level'
  elevation: number
}

export interface ScanNode extends BaseNode {
  type: 'scan'
}

export interface GuideNode extends BaseNode {
  type: 'guide'
}

export type AnyNode =
  | SiteNode | BuildingNode | LevelNode
  | WallNode | SlabNode | CeilingNode | RoofNode
  | ItemNode | ZoneNode | ScanNode | GuideNode

let _nextId = 0
export function generateNodeId(type: NodeType): string {
  _nextId++
  return `${type}_${String(_nextId).padStart(6, '0')}`
}

export function createNode(
  type: NodeType,
  overrides: Partial<AnyNode> = {},
  parentId: string | null = null,
): AnyNode {
  const id = overrides.id ?? generateNodeId(type)
  const base: BaseNode = {
    id,
    type,
    parentId,
    children: [],
    visible: true,
    metadata: {},
  }
  return { ...base, ...overrides, id, type, parentId } as AnyNode
}

export interface SceneState {
  nodes: Record<string, AnyNode>
  rootNodeIds: string[]
  dirtyNodes: Set<string>

  createNode: (node: AnyNode, parentId?: string | null) => void
  updateNode: (id: string, updates: Partial<AnyNode>) => void
  deleteNode: (id: string) => void
  markDirty: (id: string) => void
  clearDirty: () => void
  getNode: (id: string) => AnyNode | undefined
  getChildren: (id: string) => AnyNode[]
  getAncestors: (id: string) => AnyNode[]
}

export const useScene = create<SceneState>()(
  temporal(
    (set, get) => ({
      nodes: {},
      rootNodeIds: [],
      dirtyNodes: new Set<string>(),

      createNode: (node, parentId = null) =>
        set((state) => {
          const nodes = { ...state.nodes, [node.id]: { ...node, parentId } }
          const rootNodeIds = parentId == null
            ? [...state.rootNodeIds, node.id]
            : (() => {
                const parent = nodes[parentId]
                if (parent) {
                  nodes[parentId] = { ...parent, children: [...parent.children, node.id] }
                }
                return state.rootNodeIds
              })()
          return { nodes, rootNodeIds }
        }),

      updateNode: (id, updates) =>
        set((state) => {
          const existing = state.nodes[id]
          if (!existing) return state
          const merged = { ...existing, ...updates } as AnyNode
          return {
            nodes: { ...state.nodes, [id]: merged },
          }
        }),

      deleteNode: (id) =>
        set((state) => {
          const nodes = { ...state.nodes }
          const node = nodes[id]
          if (!node) return state

          const removeDescendants = (nid: string) => {
            const n = nodes[nid]
            if (n) {
              n.children.forEach(removeDescendants)
              delete nodes[nid]
            }
          }
          removeDescendants(id)

          if (node.parentId) {
            const parent = nodes[node.parentId]
            if (parent) {
              nodes[node.parentId] = {
                ...parent,
                children: parent.children.filter((c) => c !== id),
              }
            }
          }

          const rootNodeIds = state.rootNodeIds.filter((r) => r !== id)
          return { nodes, rootNodeIds }
        }),

      markDirty: (id) =>
        set((state) => {
          const next = new Set(state.dirtyNodes)
          next.add(id)
          return { dirtyNodes: next }
        }),

      clearDirty: () => set({ dirtyNodes: new Set<string>() }),

      getNode: (id) => get().nodes[id],

      getChildren: (id) => {
        const node = get().nodes[id]
        if (!node) return []
        return node.children.map((c) => get().nodes[c]).filter(Boolean) as AnyNode[]
      },

      getAncestors: (id) => {
        const ancestors: AnyNode[] = []
        let current = get().nodes[id]
        while (current?.parentId) {
          const parent = get().nodes[current.parentId]
          if (parent) ancestors.push(parent)
          current = parent
        }
        return ancestors
      },
    }),
    {
      limit: 50,
      partialize: (state) => ({
        nodes: Object.fromEntries(
          Object.entries(state.nodes).filter(
            ([, n]) => !(n.metadata && n.metadata.isTransient === true),
          ),
        ),
        rootNodeIds: state.rootNodeIds,
      }),
    },
  ),
)
