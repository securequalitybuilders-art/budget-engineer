import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei'
import * as THREE from 'three'
import { useScene } from '@/engine/bim/sceneStore'
import { useViewer } from '@/engine/bim/viewerStore'
import { useEditor } from '@/engine/bim/editorStore'
import { WallSystem } from '@/engine/bim/systems/WallSystem'
import { SlabSystem } from '@/engine/bim/systems/SlabSystem'
import { CeilingSystem } from '@/engine/bim/systems/CeilingSystem'
import { RoofSystem } from '@/engine/bim/systems/RoofSystem'
import { ItemSystem } from '@/engine/bim/systems/ItemSystem'
import { ZoneSystem } from '@/engine/bim/systems/ZoneSystem'
import type { WallNode, SlabNode, CeilingNode, RoofNode, ItemNode, ZoneNode } from '@/engine/bim/sceneStore'

interface PascalViewerProps {
  height?: number
}

export function PascalViewer({ height = 500 }: PascalViewerProps) {
  const nodes = useScene((s) => s.nodes)
  const levelMode = useViewer((s) => s.levelDisplayMode)
  const explodedOffset = useViewer((s) => s.explodedOffset)
  const layers = useEditor((s) => s.layers)

  const classified = useMemo(() => {
    const walls: WallNode[] = []
    const slabs: SlabNode[] = []
    const ceilings: CeilingNode[] = []
    const roofs: RoofNode[] = []
    const items: ItemNode[] = []
    const zones: ZoneNode[] = []

    for (const node of Object.values(nodes)) {
      if (!node.visible) continue
      switch (node.type) {
        case 'wall': walls.push(node as WallNode); break
        case 'slab': slabs.push(node as SlabNode); break
        case 'ceiling': ceilings.push(node as CeilingNode); break
        case 'roof': roofs.push(node as RoofNode); break
        case 'item': items.push(node as ItemNode); break
        case 'zone': zones.push(node as ZoneNode); break
      }
    }

    return { walls, slabs, ceilings, roofs, items, zones }
  }, [nodes])

  const adjustedSlabs = useMemo(() => {
    if (levelMode === 'exploded') {
      return classified.slabs.map((s, i) => ({
        ...s,
        elevation: s.elevation + i * explodedOffset,
      }))
    }
    return classified.slabs
  }, [classified.slabs, levelMode, explodedOffset])

  const nodeCount = Object.keys(nodes).length

  return (
    <div
      className="relative rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden"
      style={{ height }}
      data-component="pascal-viewer"
    >
      {nodeCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <p className="text-sm text-slate-400">No scene data. Create walls and slabs to begin.</p>
        </div>
      )}

      <Canvas
        camera={{ position: [10, 10, 10], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        data-testid="pascal-canvas"
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 15, 10]} intensity={0.8} />
        <pointLight position={[-5, 8, -5]} intensity={0.3} />

        <Grid
          infiniteGrid
          cellSize={1}
          sectionSize={10}
          cellColor="#1e293b"
          sectionColor="#334155"
          fadeDistance={60}
          position={[0, -0.01, 0]}
        />

        <Suspense fallback={null}>
          <group data-component="scene-root">
            <WallSystem walls={classified.walls} visible={layers.walls} />
            <SlabSystem slabs={adjustedSlabs} visible={layers.slabs} />
            <CeilingSystem ceilings={classified.ceilings} visible={layers.ceilings} />
            <RoofSystem roofs={classified.roofs} visible={layers.roofs} />
            <ItemSystem items={classified.items} visible={layers.items} />
            <ZoneSystem zones={classified.zones} visible={layers.zones} />
          </group>
        </Suspense>

        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport />
        </GizmoHelper>
      </Canvas>

      <div className="absolute bottom-2 left-2 flex gap-1 text-[10px] text-slate-400 bg-black/40 rounded px-2 py-1">
        <span>{nodeCount} nodes</span>
        <span>{levelMode}</span>
      </div>
    </div>
  )
}
