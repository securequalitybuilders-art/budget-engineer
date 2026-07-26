# Plugin SDK — Budget Engineer OS

## Overview

Budget Engineer supports a lightweight, local-first plugin system. Plugins are TypeScript modules
that register handlers for lifecycle hooks. No remote marketplace, no runtime code download — all
plugins are bundled at build time.

## Manifest Format

Every plugin must export a `PluginManifest`:

```ts
interface PluginManifest {
  id: string                   // unique ID, e.g. 'com.example.my-plugin'
  name: string                 // human-readable name
  version: string              // semver
  description: string
  author: string
  hooks: PluginHook[]          // lifecycle hooks to listen for
  permissions: PluginPermission[]  // permissions the plugin requests
  entrypoint: string           // path to the plugin module
}
```

## Hooks

Available lifecycle hooks:

| Hook | Arguments | Description |
|------|-----------|-------------|
| `onProjectOpen` | `projectId: string` | Fired when a project is loaded |
| `onProjectSave` | `projectId: string` | Fired when a project is saved |
| `onBuildingGraphChange` | *(none)* | Fired when the building graph is modified |
| `onBoqGenerate` | `boqId: string` | Fired when a BOQ is generated |
| `onExport` | `format: string` | Fired when an export is triggered |
| `onImport` | `format: string` | Fired when an import completes |
| `onCanvasRender` | *(none)* | Fired when the CAD canvas re-renders |
| `onAppStart` | *(none)* | Fired once when the app starts |

## Permissions

| Permission | Description |
|------------|-------------|
| `read:project` | Read project metadata |
| `write:project` | Modify project metadata |
| `read:buildingGraph` | Read building graph data |
| `write:buildingGraph` | Modify building graph data |
| `read:boq` | Read BOQ data |
| `write:boq` | Modify BOQ data |
| `export:file` | Trigger file exports |
| `ui:addPanel` | Add custom panels to the UI |

## Plugin API

Handlers receive a `PluginContext` with:

```ts
interface PluginAPI {
  readProject: (id: string) => Promise<Project | null>
  readBuildingGraph: () => BuildingGraph | null
  readBOQ: () => BOQ | null
  log: (message: string) => void
  addPanel: (panel: { id: string; label: string; component: React.ComponentType }) => void
}
```

## Sample Plugin

See `src/lib/plugin/sample-plugin.ts` for a working example.

```ts
import type { PluginRegistration, PluginContext } from './plugin-types'

export const myPlugin: PluginRegistration = {
  manifest: {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Does something useful',
    author: 'Me',
    hooks: ['onProjectOpen'],
    permissions: ['read:project'],
    entrypoint: 'my-plugin.ts',
  },
  handlers: {
    onProjectOpen: (ctx: PluginContext, projectId: string) => {
      ctx.api.log(`Project opened: ${projectId}`)
    },
  },
}
```

## Registration

```ts
import { createPluginRegistry, createPluginAPI } from './plugin-registry'
import { myPlugin } from './my-plugin'

const api = createPluginAPI(myPlugin.manifest, {/* data accessors */})
const registry = createPluginRegistry(api, (panels) => { /* render panels */ })

registry.register(myPlugin)
registry.loadPlugin(myPlugin.manifest.id)
```
