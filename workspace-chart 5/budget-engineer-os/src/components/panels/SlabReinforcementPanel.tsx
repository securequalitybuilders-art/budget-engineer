import React from 'react';
import type { BOQ } from '../../domain/boq';
import type { RebarSpec } from '../../domain/cad';
interface Props { boq: BOQ | null; rebarSpec?: RebarSpec; onSetRebarSpec?: (spec: RebarSpec) => void; }
export default function SlabReinforcementPanel({ boq, rebarSpec, onSetRebarSpec }: Props) {
  if (!boq) return <div style={{ padding: 12, border: '1px solid #24324b', borderRadius: 8, background: '#111c31', color: '#94a3b8', fontSize: 12 }}>SlabReinforcementPanel</div>;
  const slabItem = boq.items.find(i => i.category === 'Slabs');
  const rebarItem = boq.items.find(i => i.category === 'Rebar');
  if (!slabItem) return <div style={{ padding: 12, border: '1px solid #24324b', borderRadius: 8, background: '#111c31', color: '#94a3b8', fontSize: 12 }}>SlabReinforcementPanel</div>;
  return (
    <div style={{ padding: 12, border: '1px solid #24324b', borderRadius: 8, background: '#111c31' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 8 }}>🦴 Slab Reinforcement</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div style={{ padding: 8, borderRadius: 6, background: '#0b1220', border: '1px solid #24324b' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Slab Area</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#7dd3fc', marginTop: 2 }}>{slabItem.quantity.toFixed(2)} m²</div>
        </div>
        <div style={{ padding: 8, borderRadius: 6, background: '#0b1220', border: '1px solid #24324b' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rebar Spec</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc', marginTop: 2 }}>Y12 @ 200 c/c</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div style={{ padding: 8, borderRadius: 6, background: '#0b1220', border: '1px solid #24324b' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mesh Density</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#d4a574', marginTop: 2 }}>18 kg/m²</div>
        </div>
        <div style={{ padding: 8, borderRadius: 6, background: '#0b1220', border: '1px solid #24324b' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tonnage</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e', marginTop: 2 }}>{rebarItem ? rebarItem.quantity.toFixed(2) : '0.00'} t</div>
        </div>
      </div>
      <div style={{ padding: 8, borderRadius: 6, background: '#0b1220', border: '1px solid #24324b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10, color: '#94a3b8' }}>Rebar Supply & Fix</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{rebarItem ? `$${rebarItem.total.toFixed(2)}` : '$0.00'}</div>
      </div>
    </div>
  );
}