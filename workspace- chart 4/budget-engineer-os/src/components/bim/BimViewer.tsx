import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAppStore } from '../../store/appStore';

export default function BimViewer() {
  const state = useAppStore();
  const elements = state.bimModel.elements;
  const selectedIds = state.selectedElementIds;

  return (
    <div className="bg-[#0b1220] border border-[#24324b] rounded-xl h-[450px] overflow-hidden relative shadow-inner">
      <Canvas camera={{ position: [16, 16, 16], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[20, 30, 20]} intensity={1.2} />
        <OrbitControls makeDefault />

        <group position={[-6, 0, -4]}>
          {/* Slabs */}
          <mesh position={[6, -0.15, 4]}>
            <boxGeometry args={[12.4, 0.3, 8.4]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>

          {/* Walls */}
          {elements.filter(e => e.type === 'wall').map(w => {
            const isSel = selectedIds.includes(w.id);
            const cadW = state.cadDoc.walls.find(wa => wa.id === w.cadId);
            if (!cadW) return null;
            const len = Math.hypot(cadW.end.x - cadW.start.x, cadW.end.y - cadW.start.y);
            const mx = (cadW.start.x + cadW.end.x) / 2;
            const mz = (cadW.start.y + cadW.end.y) / 2;
            const angle = Math.atan2(cadW.end.y - cadW.start.y, cadW.end.x - cadW.start.x);

            return (
              <mesh
                key={w.id}
                position={[mx, cadW.height / 2, mz]}
                rotation={[0, -angle, 0]}
                onClick={e => { e.stopPropagation(); state.setSelectedElements([w.id]); }}
              >
                <boxGeometry args={[len, cadW.height, cadW.thickness]} />
                <meshStandardMaterial color={isSel ? '#f59e0b' : cadW.structural ? '#1a365d' : '#d4a574'} roughness={0.4} />
              </mesh>
            );
          })}

          {/* Blocks */}
          {elements.filter(e => e.type === 'block').map(b => {
            const isSel = selectedIds.includes(b.id);
            const cadB = state.cadDoc.blocks.find(bl => bl.id === b.cadId);
            if (!cadB) return null;
            return (
              <mesh
                key={b.id}
                position={[cadB.position.x + cadB.width/2, 0.5, cadB.position.y + cadB.depth/2]}
                onClick={e => { e.stopPropagation(); state.setSelectedElements([b.id]); }}
              >
                <boxGeometry args={[cadB.width, 1.0, cadB.depth]} />
                <meshStandardMaterial color={isSel ? '#f59e0b' : '#8B5CF6'} roughness={0.5} />
              </mesh>
            );
          })}
        </group>
      </Canvas>
      <div className="absolute top-3 left-3 bg-[#111c31]/80 backdrop-blur border border-[#24324b] px-3 py-1 rounded text-xs text-[#f8fafc] font-medium pointer-events-none">
        3D BIM Swept-Solid Viewer (Orbit · Zoom · Pan)
      </div>
    </div>
  );
}
