import React, { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box } from '@react-three/drei';
import type { BimModel, BimElement } from '../../domain/bim';
interface Props { bim: BimModel | null; selectedId: string | null; onSelect: (id: string) => void; highlightIds?: string[]; removedIds?: string[]; modifiedIds?: string[]; }
function ElementMesh({ el, selected, onSelect, highlight, removed, modified }: { el: BimElement; selected: boolean; onSelect: (id: string) => void; highlight?: boolean; removed?: boolean; modified?: boolean }) {
  const color = removed ? '#ef4444' : modified ? '#f59e0b' : highlight ? '#22c55e' : selected ? '#7dd3fc' : el.type === 'wall' ? '#d4a574' : el.type === 'slab' ? '#1a365d' : el.type === 'roof' ? '#475569' : el.type === 'opening' ? '#06B6D4' : el.type === 'column' ? '#1a365d' : el.type === 'beam' ? '#06B6D4' : '#64748b';
  return (
    <Box position={el.position} rotation={el.rotation} scale={el.scale} onClick={(e) => { e.stopPropagation(); onSelect(el.id); }}>
      <meshStandardMaterial color={color} transparent opacity={removed ? 0.25 : 0.85} />
    </Box>
  );
}
export default function BimViewer({ bim, selectedId, onSelect, highlightIds, removedIds, modifiedIds }: Props) {
  if (!bim) return <div style={{ padding: 40, color: '#94a3b8' }}>No BIM model</div>;
  return (
    <div style={{ width: '100%', height: 360, background: '#0b1220', borderRadius: 8, border: '1px solid #24324b' }}>
      <Canvas camera={{ position: [20, 20, 20], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} />
        <OrbitControls />
        {bim.elements.map(el => (
          <ElementMesh key={el.id} el={el} selected={selectedId === el.id} onSelect={onSelect} highlight={highlightIds?.includes(el.id)} removed={removedIds?.includes(el.id)} modified={modifiedIds?.includes(el.id)} />
        ))}
      </Canvas>
    </div>
  );
}