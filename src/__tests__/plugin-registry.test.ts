import { describe, it, expect, vi } from 'vitest'
import { createPluginRegistry } from '../lib/plugin/plugin-registry'
import type { BuildingGraph } from '../domain/building'
import type { PluginRegistration, PluginHookHandler, PluginContext } from '../lib/plugin/plugin-types'

const sampleGraph: BuildingGraph = {
  meta: { id: 'proj-p', projectId: 'proj-p', name: 'Plugin Test', category: 'residential' as const, description: '', createdAt: '', updatedAt: '' },
  site: null,
  levels: [{ id: 'l1', name: 'Ground', number: 0, elevation: 0, floorHeight: 3 }],
  walls: [], slabs: [], openings: [], spaces: [],
  columns: [], beams: [], stairs: [], roof: null,
  structural: null,
  serviceZones: [],
}

describe('plugin-registry', () => {
  function createRegistry() {
    let currentGraph: BuildingGraph | null = sampleGraph
    return {
      registry: createPluginRegistry(
        () => 'proj-p',
        () => currentGraph,
        (g: BuildingGraph) => { currentGraph = g },
        () => ({ total: 1000 }),
      ),
      setGraph: (g: BuildingGraph | null) => { currentGraph = g },
    }
  }

  it('registers a plugin', () => {
    const { registry } = createRegistry()
    const reg: PluginRegistration = {
      manifest: { id: 'test-p1', name: 'Test Plugin', version: '1.0', description: '', author: 'test', hooks: ['onProjectOpen'], permissions: ['read:project'], entrypoint: 'plugin.js' },
      handlers: {},
    }
    registry.register(reg)
    expect(registry.isRegistered('test-p1')).toBe(true)
    expect(registry.getPlugins()).toHaveLength(1)
  })

  it('does not register duplicate ids', () => {
    const { registry } = createRegistry()
    const reg: PluginRegistration = {
      manifest: { id: 'dup', name: 'Dup', version: '1.0', description: '', author: '', hooks: [], permissions: [], entrypoint: '' },
      handlers: {},
    }
    registry.register(reg)
    registry.register(reg)
    expect(registry.getPlugins()).toHaveLength(1)
  })

  it('unregisters a plugin', () => {
    const { registry } = createRegistry()
    registry.register({ manifest: { id: 'p1', name: 'P1', version: '1.0', description: '', author: '', hooks: [], permissions: [], entrypoint: '' }, handlers: {} })
    registry.unregister('p1')
    expect(registry.isRegistered('p1')).toBe(false)
  })

  it('loads and unloads a plugin', () => {
    const { registry } = createRegistry()
    registry.register({ manifest: { id: 'p1', name: 'P1', version: '1.0', description: '', author: '', hooks: [], permissions: [], entrypoint: '' }, handlers: {} })
    registry.loadPlugin('p1')
    expect(registry.getLoadedPlugins()).toHaveLength(1)
    registry.unloadPlugin('p1')
    expect(registry.getLoadedPlugins()).toHaveLength(0)
  })

  it('triggers hooks on loaded plugins', () => {
    const { registry } = createRegistry()
    const handler = vi.fn()
    registry.register({
      manifest: { id: 'p1', name: 'P1', version: '1.0', description: '', author: '', hooks: ['onProjectOpen', 'onBuildingGraphChange'], permissions: ['read:project'], entrypoint: '' },
      handlers: { onProjectOpen: handler as unknown as PluginHookHandler },
    })
    registry.loadPlugin('p1')
    registry.triggerHook('onProjectOpen', 'some-data')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not trigger hooks for unregistered hooks', () => {
    const { registry } = createRegistry()
    const handler = vi.fn()
    registry.register({
      manifest: { id: 'p1', name: 'P1', version: '1.0', description: '', author: '', hooks: ['onProjectOpen'], permissions: [], entrypoint: '' },
      handlers: { onExport: handler as unknown as PluginHookHandler },
    })
    registry.loadPlugin('p1')
    registry.triggerHook('onExport', 'data')
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not trigger hooks on unloaded plugins', () => {
    const { registry } = createRegistry()
    const handler = vi.fn()
    registry.register({
      manifest: { id: 'p1', name: 'P1', version: '1.0', description: '', author: '', hooks: ['onProjectOpen'], permissions: [], entrypoint: '' },
      handlers: { onProjectOpen: handler as unknown as PluginHookHandler },
    })
    registry.triggerHook('onProjectOpen', 'data')
    expect(handler).not.toHaveBeenCalled()
  })

  it('enforces permissions on API read/write', () => {
    const { registry } = createRegistry()
    const handler = vi.fn()
    registry.register({
      manifest: { id: 'p1', name: 'P1', version: '1.0', description: '', author: '', hooks: ['onProjectOpen'], permissions: [], entrypoint: '' },
      handlers: {
        onProjectOpen: ((ctx: PluginContext) => {
          const projectId = ctx.api.getProjectId()
          const graph = ctx.api.readBuildingGraph()
          handler(projectId, graph)
        }) as unknown as PluginHookHandler,
      },
    })
    registry.loadPlugin('p1')
    registry.triggerHook('onProjectOpen')
    expect(handler).toHaveBeenCalledWith(null, null)
  })

  it('enforces permissions — write:buildingGraph works when granted', () => {
    const { registry } = createRegistry()
    let written = false
    registry.register({
      manifest: { id: 'p1', name: 'P1', version: '1.0', description: '', author: '', hooks: ['onBuildingGraphChange'], permissions: ['read:buildingGraph', 'write:buildingGraph'], entrypoint: '' },
      handlers: {
        onBuildingGraphChange: ((ctx: PluginContext) => {
          const g = ctx.api.readBuildingGraph() as BuildingGraph
          expect(g).toBeTruthy()
          g.meta.name = 'Updated'
          ctx.api.writeBuildingGraph(g)
          written = true
        }) as unknown as PluginHookHandler,
      },
    })
    registry.loadPlugin('p1')
    registry.triggerHook('onBuildingGraphChange')
    expect(written).toBe(true)
  })

  it('getPlugin returns plugin by id', () => {
    const { registry } = createRegistry()
    registry.register({ manifest: { id: 'p1', name: 'P1', version: '1.0', description: '', author: '', hooks: [], permissions: [], entrypoint: '' }, handlers: {} })
    const p = registry.getPlugin('p1')
    expect(p?.manifest.name).toBe('P1')
    expect(registry.getPlugin('nope')).toBeUndefined()
  })

  it('multiple plugins can register same hook', () => {
    const { registry } = createRegistry()
    const calls: number[] = []
    registry.register({
      manifest: { id: 'p1', name: 'P1', version: '1.0', description: '', author: '', hooks: ['onExport'], permissions: [], entrypoint: '' },
      handlers: { onExport: (() => { calls.push(1) }) as unknown as PluginHookHandler },
    })
    registry.register({
      manifest: { id: 'p2', name: 'P2', version: '1.0', description: '', author: '', hooks: ['onExport'], permissions: [], entrypoint: '' },
      handlers: { onExport: (() => { calls.push(2) }) as unknown as PluginHookHandler },
    })
    registry.loadPlugin('p1')
    registry.loadPlugin('p2')
    registry.triggerHook('onExport', 'data')
    expect(calls).toEqual([1, 2])
  })

  it('logs via API', () => {
    const { registry } = createRegistry()
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    registry.register({
      manifest: { id: 'p1', name: 'Logger', version: '1.0', description: '', author: '', hooks: ['onAppStart'], permissions: [], entrypoint: '' },
      handlers: { onAppStart: ((ctx: PluginContext) => { ctx.api.log('started') }) as unknown as PluginHookHandler },
    })
    registry.loadPlugin('p1')
    registry.triggerHook('onAppStart')
    expect(spy).toHaveBeenCalledWith('[Plugin:Logger] started')
    spy.mockRestore()
  })
})
