import { create } from 'zustand'

export type EditorTool = 'select' | 'wall' | 'slab' | 'door' | 'window' | 'item' | 'zone'

export interface LayerVisibility {
  walls: boolean
  slabs: boolean
  ceilings: boolean
  roofs: boolean
  zones: boolean
  items: boolean
}

export interface EditorPanelState {
  toolsOpen: boolean
  layersOpen: boolean
  propertiesOpen: boolean
}

export interface EditorState {
  activeTool: EditorTool
  layers: LayerVisibility
  panels: EditorPanelState
  hoveredNodeId: string | null

  setActiveTool: (tool: EditorTool) => void
  toggleLayer: (layer: keyof LayerVisibility) => void
  setLayer: (layer: keyof LayerVisibility, visible: boolean) => void
  setPanel: (panel: keyof EditorPanelState, open: boolean) => void
  setHoveredNode: (id: string | null) => void
}

export const useEditor = create<EditorState>()((set) => ({
  activeTool: 'select',
  layers: {
    walls: true,
    slabs: true,
    ceilings: true,
    roofs: true,
    zones: true,
    items: true,
  },
  panels: {
    toolsOpen: true,
    layersOpen: true,
    propertiesOpen: false,
  },
  hoveredNodeId: null,

  setActiveTool: (tool) => set({ activeTool: tool }),
  toggleLayer: (layer) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: !state.layers[layer] },
    })),
  setLayer: (layer, visible) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: visible },
    })),
  setPanel: (panel, open) =>
    set((state) => ({
      panels: { ...state.panels, [panel]: open },
    })),
  setHoveredNode: (id) => set({ hoveredNodeId: id }),
}))
