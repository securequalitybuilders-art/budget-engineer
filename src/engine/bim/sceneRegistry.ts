import { useRef, useEffect } from 'react'
import type { Mesh, Group, Object3D } from 'three'

export type RegistryType = 'wall' | 'slab' | 'ceiling' | 'roof' | 'item' | 'zone'

class SceneRegistryImpl {
  nodes = new Map<string, Object3D>()
  byType: Record<RegistryType, Set<string>> = {
    wall: new Set(),
    slab: new Set(),
    ceiling: new Set(),
    roof: new Set(),
    item: new Set(),
    zone: new Set(),
  }

  register(id: string, type: RegistryType, obj: Object3D) {
    this.nodes.set(id, obj)
    this.byType[type].add(id)
  }

  unregister(id: string, type: RegistryType) {
    this.nodes.delete(id)
    this.byType[type].delete(id)
  }

  getObject(id: string): Object3D | undefined {
    return this.nodes.get(id)
  }

  getIdsByType(type: RegistryType): string[] {
    return Array.from(this.byType[type])
  }

  clear() {
    this.nodes.clear()
    for (const s of Object.values(this.byType)) s.clear()
  }
}

export const sceneRegistry = new SceneRegistryImpl()

export function useRegistry(
  nodeId: string,
  type: RegistryType,
  ref: React.RefObject<Mesh | Group | null>,
) {
  const registeredRef = useRef<string | null>(null)

  useEffect(() => {
    const obj = ref.current
    if (!obj) return

    if (registeredRef.current) {
      sceneRegistry.unregister(registeredRef.current, type)
    }

    sceneRegistry.register(nodeId, type, obj)
    registeredRef.current = nodeId

    return () => {
      sceneRegistry.unregister(nodeId, type)
      registeredRef.current = null
    }
  }, [nodeId, type, ref])
}

export function useRegistrySelector(type: RegistryType): string[] {
  const ids = sceneRegistry.getIdsByType(type)
  return ids
}
