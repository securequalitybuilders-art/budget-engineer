// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  useScene,
  createNode,
  type AnyNode,
  type WallNode,
} from '@/engine/bim/sceneStore'
import { useViewer } from '@/engine/bim/viewerStore'
import { useEditor } from '@/engine/bim/editorStore'
import {
  DEFAULT_SYSTEM_PROMPT,
  SITE_PLAN_PROMPT,
  FLOOR_PLAN_PROMPT,
  XML_GUIDE,
} from '@/engine/bim/drawioSystemPrompts'

afterEach(() => {
  useScene.setState({ nodes: {}, rootNodeIds: [], dirtyNodes: new Set() })
})

beforeEach(() => {
  useScene.setState({ nodes: {}, rootNodeIds: [], dirtyNodes: new Set() })
  useViewer.setState({
    selection: { buildingId: null, levelId: null, zoneId: null, wallId: null, itemId: null },
    levelDisplayMode: 'stacked',
    cameraMode: 'perspective',
    explodedOffset: 3.0,
  })
  useEditor.setState({
    activeTool: 'select',
    layers: { walls: true, slabs: true, ceilings: true, roofs: true, zones: true, items: true },
    panels: { toolsOpen: true, layersOpen: true, propertiesOpen: false },
    hoveredNodeId: null,
  })
})

describe('sceneStore', () => {
  it('createNode and retrieve via getNode', () => {
    const wall = createNode('wall', {
      id: 'w1',
      width: 3.0,
      height: 2.7,
      thickness: 0.23,
      startX: 0,
      startY: 0,
      endX: 5,
      endY: 0,
      material: 'masonry',
      fireRating: 'Grade A',
    }) as WallNode

    useScene.getState().createNode(wall)

    const retrieved = useScene.getState().getNode('w1')
    expect(retrieved).toBeDefined()
    expect(retrieved!.type).toBe('wall')
    expect((retrieved as WallNode).thickness).toBe(0.23)
  })

  it('deleteNode removes descendants', () => {
    const site = createNode('site', { id: 'site1' })
    const building = createNode('building', { id: 'bld1' }, 'site1')
    useScene.getState().createNode(site)
    useScene.getState().createNode(building, 'site1')

    useScene.getState().deleteNode('site1')

    expect(useScene.getState().getNode('site1')).toBeUndefined()
    expect(useScene.getState().getNode('bld1')).toBeUndefined()
    expect(useScene.getState().rootNodeIds).not.toContain('site1')
  })

  it('markDirty tracks dirty nodes', () => {
    const wall = createNode('wall', { id: 'w1' } as Partial<AnyNode>)
    useScene.getState().createNode(wall)
    useScene.getState().markDirty('w1')

    expect(useScene.getState().dirtyNodes.has('w1')).toBe(true)

    useScene.getState().clearDirty()
    expect(useScene.getState().dirtyNodes.size).toBe(0)
  })

  it('undo reverses last createNode', () => {
    const wall = createNode('wall', { id: 'w1' } as Partial<AnyNode>)
    useScene.getState().createNode(wall)
    expect(useScene.getState().getNode('w1')).toBeDefined()

    const temporalApi = (useScene as any).temporal
    if (temporalApi?.getState) {
      temporalApi.getState().undo()
      expect(useScene.getState().getNode('w1')).toBeUndefined()
    }
  })
})

describe('viewerStore', () => {
  it('setSelection updates selection fields', () => {
    useViewer.getState().setSelection({ wallId: 'wall-99', buildingId: 'bld-1' })
    expect(useViewer.getState().selection.wallId).toBe('wall-99')
    expect(useViewer.getState().selection.buildingId).toBe('bld-1')
    expect(useViewer.getState().selection.zoneId).toBeNull()
  })

  it('clearSelection resets all fields', () => {
    useViewer.getState().setSelection({ wallId: 'w1', levelId: 'l1' })
    useViewer.getState().clearSelection()
    const sel = useViewer.getState().selection
    expect(sel.wallId).toBeNull()
    expect(sel.levelId).toBeNull()
    expect(sel.buildingId).toBeNull()
  })
})

describe('editorStore', () => {
  it('setActiveTool and toggleLayer', () => {
    useEditor.getState().setActiveTool('wall')
    expect(useEditor.getState().activeTool).toBe('wall')

    useEditor.getState().toggleLayer('zones')
    expect(useEditor.getState().layers.zones).toBe(false)

    useEditor.getState().toggleLayer('zones')
    expect(useEditor.getState().layers.zones).toBe(true)
  })
})

describe('systemPrompts', () => {
  it('DEFAULT_SYSTEM_PROMPT references DzeNhare brand colors', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#1a365d')
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#d4a574')
  })

  it('XML_GUIDE contains valid mxGraphModel skeleton', () => {
    expect(XML_GUIDE).toContain('<mxGraphModel>')
    expect(XML_GUIDE).toContain('</mxGraphModel>')
    expect(XML_GUIDE).toContain('mxCell')
  })

  it('SITE_PLAN_PROMPT references Zimbabwe setback distances', () => {
    expect(SITE_PLAN_PROMPT).toContain('6m')
    expect(SITE_PLAN_PROMPT).toContain('3m')
  })

  it('FLOOR_PLAN_PROMPT requests room areas in m²', () => {
    expect(FLOOR_PLAN_PROMPT).toContain('m²')
    expect(FLOOR_PLAN_PROMPT).toContain('1:100')
  })
})
