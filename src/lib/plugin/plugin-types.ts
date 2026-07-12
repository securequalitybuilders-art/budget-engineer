export type PluginHook =
  | 'onProjectOpen'
  | 'onProjectSave'
  | 'onBuildingGraphChange'
  | 'onBoqGenerate'
  | 'onExport'
  | 'onImport'
  | 'onCanvasRender'
  | 'onAppStart'

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  hooks: PluginHook[]
  permissions: PluginPermission[]
  entrypoint: string
}

export type PluginPermission =
  | 'read:project'
  | 'write:project'
  | 'read:buildingGraph'
  | 'write:buildingGraph'
  | 'read:boq'
  | 'write:boq'
  | 'export:file'
  | 'ui:addPanel'

export interface PluginContext {
  manifest: PluginManifest
  api: PluginAPI
}

export interface PluginAPI {
  getProjectId: () => string | null
  readBuildingGraph: () => unknown
  writeBuildingGraph: (graph: unknown) => void
  readBoq: () => unknown
  addPanel: (panelId: string, title: string, component: unknown) => void
  log: (message: string) => void
}

export interface PluginInstance {
  manifest: PluginManifest
  api: PluginAPI
  loaded: boolean
  hooks: Record<PluginHook, PluginHookHandler[]>
}

export type PluginHookHandler = (context: PluginContext, ...args: unknown[]) => unknown

export interface PluginRegistration {
  manifest: PluginManifest
  handlers: Partial<Record<PluginHook, PluginHookHandler>>
}
