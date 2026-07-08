import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';
import { useMemo } from 'react';
import type { BimElement } from '../../domain/bim';

type Props = {
  elements: BimElement[];
  ghostElements?: BimElement[];
  activeFloorId: string | 'all';
  selectedElementId?: string;
  highlightIds?: string[];
  removedIds?: string[];
  modifiedIds?: string[];
  onSelect: (id?: string) => void;
};

function elementColor(element: BimElement, selected: boolean, added: boolean, removed: boolean, modified: boolean, ghost = false): string {
  if (ghost) return '#fca5a5';
  if (selected) return '#f59e0b';
  if (removed) return '#ef4444';
  if (added) return '#22c55e';
  if (modified) return '#eab308';
  switch (element.type) {
    case 'wall': return '#1a365d';
    case 'slab': return '#d4a574';
    case 'roof': return '#8b5cf6';
    case 'opening': return '#06b6d4';
    case 'block': return '#64748b';
    case 'roomZone': return '#22c55e';
    default: return '#94a3b8';
  }
}

function renderElement(element: BimElement, selected: boolean, added: boolean, removed: boolean, modified: boolean, onSelect: () => void, ghost = false) {
  if (element.type === 'wall') {
    const dx = element.end.x - element.start.x;
    const dz = element.end.z - element.start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    const centerX = (element.start.x + element.end.x) / 2;
    const centerZ = (element.start.z + element.end.z) / 2;
    return <mesh key={(ghost ? 'ghost-' : '') + element.id} position={[centerX, element.start.y + element.height / 2, centerZ]} rotation={[0, -angle, 0]} onClick={(e) => { e.stopPropagation(); onSelect(); }}><boxGeometry args={[length, element.height, element.thickness]} /><meshStandardMaterial color={elementColor(element, selected, added, removed, modified, ghost)} transparent={ghost} opacity={ghost ? 0.25 : 1} /></mesh>;
  }
  if (element.type === 'slab' || element.type === 'roof') {
    return <mesh key={(ghost ? 'ghost-' : '') + element.id} position={[element.origin.x + element.width / 2, element.origin.y + element.thickness / 2, element.origin.z + element.depth / 2]} onClick={(e) => { e.stopPropagation(); onSelect(); }}><boxGeometry args={[element.width, element.thickness, element.depth]} /><meshStandardMaterial color={elementColor(element, selected, added, removed, modified, ghost)} transparent opacity={ghost ? 0.18 : (element.type === 'roof' ? 0.7 : 1)} /></mesh>;
  }
  if (element.type === 'opening') {
    return <mesh key={(ghost ? 'ghost-' : '') + element.id} position={[element.center.x, element.center.y, element.center.z]} onClick={(e) => { e.stopPropagation(); onSelect(); }}><boxGeometry args={[element.width, element.height, 0.12]} /><meshStandardMaterial color={elementColor(element, selected, added, removed, modified, ghost)} transparent opacity={ghost ? 0.18 : 0.85} /></mesh>;
  }
  if (element.type === 'block') {
    return <group key={(ghost ? 'ghost-' : '') + element.id} position={[element.position.x, element.position.y + element.height / 2, element.position.z]} rotation={[0, element.rotation ?? 0, 0]} onClick={(e) => { e.stopPropagation(); onSelect(); }}><mesh><boxGeometry args={[element.width, element.height, element.depth]} /><meshStandardMaterial color={elementColor(element, selected, added, removed, modified, ghost)} transparent={ghost} opacity={ghost ? 0.25 : 1} /></mesh>{!ghost && <Html distanceFactor={12}><div style={{ background: '#0f172acc', color: 'white', padding: '2px 6px', borderRadius: 6, fontSize: 10 }}>{element.name}</div></Html>}</group>;
  }
  if (element.type === 'roomZone') {
    return <mesh key={(ghost ? 'ghost-' : '') + element.id} position={[element.origin.x + element.width / 2, element.origin.y + element.height / 2, element.origin.z + element.depth / 2]} onClick={(e) => { e.stopPropagation(); onSelect(); }}><boxGeometry args={[element.width, element.height, element.depth]} /><meshStandardMaterial color={elementColor(element, selected, added, removed, modified, ghost)} transparent opacity={ghost ? 0.12 : (added || removed || modified ? 0.3 : 0.14)} /></mesh>;
  }
  return null;
}

export function BimViewer({ elements, ghostElements = [], activeFloorId, selectedElementId, highlightIds = [], removedIds = [], modifiedIds = [], onSelect }: Props) {
  const filtered = useMemo(() => elements.filter((e) => activeFloorId === 'all' || e.floorId === activeFloorId), [elements, activeFloorId]);
  const ghostFiltered = useMemo(() => ghostElements.filter((e) => activeFloorId === 'all' || e.floorId === activeFloorId), [ghostElements, activeFloorId]);
  const addedSet = new Set(highlightIds);
  const removedSet = new Set(removedIds);
  const modifiedSet = new Set(modifiedIds);

  return (
    <div style={{ height: 620, borderRadius: 20, overflow: 'hidden', border: '1px solid #24324b', background: 'linear-gradient(180deg,#07111f,#0f172a)' }}>
      <Canvas camera={{ position: [16, 12, 16], fov: 45 }} onPointerMissed={() => onSelect(undefined)}>
        <color attach="background" args={['#0b1220']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 12, 8]} intensity={1.1} castShadow />
        <Grid args={[40, 40]} cellColor="#23324d" sectionColor="#31466a" fadeDistance={50} fadeStrength={1} infiniteGrid />
        <axesHelper args={[2]} />
        {ghostFiltered.map((element) => renderElement(element, false, false, true, false, () => onSelect(element.id), true))}
        {filtered.map((element) => renderElement(element, element.id === selectedElementId, addedSet.has(element.id), removedSet.has(element.id), modifiedSet.has(element.id), () => onSelect(element.id), false))}
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
