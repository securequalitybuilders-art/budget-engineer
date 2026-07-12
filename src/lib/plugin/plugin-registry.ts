import type { BuildingGraph } from '../../domain/building'
import type {
  PluginAPI,
  PluginHook,
  PluginHookHandler,
  PluginInstance,
  PluginManifest,
  PluginPermission,
  PluginRegistration,
} from './plugin-types'

function checkPermission(manifest: PluginManifest, required: PluginPermission): boolean {
  return manifest.permissions.includes(required)
}

export function createPluginAPI(
  manifest: PluginManifest,
  getProjectId: () => string | null,
  getBuildingGraph: () => BuildingGraph | null,
  setBuildingGraph: (graph: BuildingGraph) => void,
  getBoq: () => unknown,
  addPanel: (panelId: string, title: string, component: unknown) => void,
): PluginAPI {
  return {
    getProjectId() {
      if (!checkPermission(manifest, 'read:project')) return null
      return getProjectId()
    },
    readBuildingGraph() {
      if (!checkPermission(manifest, 'read:buildingGraph')) return null
      return getBuildingGraph()
    },
    writeBuildingGraph(graph: unknown) {
      if (!checkPermission(manifest, 'write:buildingGraph')) return
      setBuildingGraph(graph as BuildingGraph)
    },
    readBoq() {
      if (!checkPermission(manifest, 'read:boq')) return null
      return getBoq()
    },
    addPanel(panelId: string, title: string, component: unknown) {
      if (!checkPermission(manifest, 'ui:addPanel')) return
      addPanel(panelId, title, component)
    },
    log(message: string) {
      console.log(`[Plugin:${manifest.name}] ${message}`)
    },
  }
}

export interface PluginRegistry {
  getPlugins: () => PluginInstance[]
  getPlugin: (id: string) => PluginInstance | undefined
  register: (registration: PluginRegistration) => void
  unregister: (id: string) => void
  isRegistered: (id: string) => boolean
  loadPlugin: (id: string) => void
  unloadPlugin: (id: string) => void
  triggerHook: (hook: PluginHook, ...args: unknown[]) => unknown[]
  getLoadedPlugins: () => PluginInstance[]
}

export function createPluginRegistry(
  getProjectId: () => string | null,
  getBuildingGraph: () => BuildingGraph | null,
  setBuildingGraph: (graph: BuildingGraph) => void,
  getBoq: () => unknown,
): PluginRegistry {
  const plugins: Map<string, PluginInstance> = new Map()
  const panelCallbacks: Array<(panelId: string, title: string, component: unknown) => void> = []

  function createApi(manifest: PluginManifest): PluginAPI {
    return createPluginAPI(
      manifest,
      getProjectId,
      getBuildingGraph,
      setBuildingGraph,
      getBoq,
      (panelId: string, title: string, component: unknown) => {
        for (const cb of panelCallbacks) cb(panelId, title, component)
      },
    )
  }

  return {
    getPlugins() {
      return Array.from(plugins.values())
    },

    getPlugin(id: string) {
      return plugins.get(id)
    },

    register(registration: PluginRegistration) {
      if (plugins.has(registration.manifest.id)) return
      const manifest = registration.manifest
      const api = createApi(manifest)

      const hooks = {} as Record<PluginHook, Array<(...args: unknown[]) => unknown>>
      for (const hookName of manifest.hooks) {
        hooks[hookName] = []
      }

      for (const [hook, handler] of Object.entries(registration.handlers) as [PluginHook, PluginHookHandler][]) {
        if (!hooks[hook]) hooks[hook] = []
        if (manifest.hooks.includes(hook)) {
          hooks[hook].push(handler)
        }
      }

      plugins.set(manifest.id, {
        manifest,
        api,
        loaded: false,
        hooks,
      })
    },

    unregister(id: string) {
      plugins.delete(id)
    },

    isRegistered(id: string) {
      return plugins.has(id)
    },

    loadPlugin(id: string) {
      const plugin = plugins.get(id)
      if (!plugin || plugin.loaded) return
      plugin.loaded = true
    },

    unloadPlugin(id: string) {
      const plugin = plugins.get(id)
      if (!plugin || !plugin.loaded) return
      plugins.delete(id)
    },

    triggerHook(hook: PluginHook, ...args: unknown[]) {
      const results: unknown[] = []
      for (const plugin of plugins.values()) {
        if (!plugin.loaded) continue
        if (!plugin.manifest.hooks.includes(hook)) continue
        const handlers = plugin.hooks[hook]
        if (!handlers) continue
        for (const handler of handlers) {
          const ctx = { manifest: plugin.manifest, api: plugin.api }
          results.push(handler(ctx, ...args))
        }
      }
      return results
    },

    getLoadedPlugins() {
      return Array.from(plugins.values()).filter((p) => p.loaded)
    },
  }
}

export function subscribeToPluginPanels(
  registry: PluginRegistry,
  callback: (panelId: string, title: string, component: unknown) => void,
): () => void {
  const native = (registry as unknown as { panelCallbacks: Array<(panelId: string, title: string, component: unknown) => void> })
  if (native.panelCallbacks) {
    native.panelCallbacks.push(callback)
    return () => {
      const idx = native.panelCallbacks.indexOf(callback)
      if (idx >= 0) native.panelCallbacks.splice(idx, 1)
    }
  }
  return () => {}
}
