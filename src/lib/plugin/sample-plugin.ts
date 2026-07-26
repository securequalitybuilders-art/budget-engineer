import type { PluginRegistration, PluginContext, PluginHook, PluginPermission } from './plugin-types'

const SAMPLE_HOOKS: PluginHook[] = ['onProjectOpen', 'onProjectSave', 'onBuildingGraphChange', 'onExport']
const SAMPLE_PERMS: PluginPermission[] = ['read:project', 'read:buildingGraph']

export const SAMPLE_PLUGIN_MANIFEST = {
  id: 'budget-engineer.sample-logger',
  name: 'Event Logger',
  version: '1.0.0',
  description: 'Logs key project events to the console. Demonstrates the plugin API.',
  author: 'Budget Engineer SDK',
  hooks: SAMPLE_HOOKS,
  permissions: SAMPLE_PERMS,
  entrypoint: 'sample-plugin.ts',
}

export const samplePlugin: PluginRegistration = {
  manifest: SAMPLE_PLUGIN_MANIFEST,
  handlers: {
    onProjectOpen: (ctx: PluginContext, ...args: unknown[]) => {
      ctx.api.log(`Project opened: ${args[0] as string}`)
    },
    onProjectSave: (ctx: PluginContext, ...args: unknown[]) => {
      ctx.api.log(`Project saved: ${args[0] as string}`)
    },
    onBuildingGraphChange: (ctx: PluginContext) => {
      ctx.api.log('Building graph changed')
    },
    onExport: (ctx: PluginContext, ...args: unknown[]) => {
      ctx.api.log(`Export triggered: ${args[0] as string}`)
    },
  },
}
