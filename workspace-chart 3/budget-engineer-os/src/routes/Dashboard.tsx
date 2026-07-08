import { BimViewer } from '../components/bim/BimViewer';
import { BimInspector } from '../components/bim/BimInspector';
import { FloorVisibilityPanel } from '../components/bim/FloorVisibilityPanel';
import { BimLegend } from '../components/bim/BimLegend';
import { useAppStore } from '../store/appStore';

export function Dashboard() {
  const { bim, activeFloorId, setActiveFloor, selectedElementId, setSelectedElement, regenerateBim } = useAppStore();
  const selected = bim.elements.find((e) => e.id === selectedElementId);
  const counts = {
    walls: bim.elements.filter((e) => e.type === 'wall').length,
    slabs: bim.elements.filter((e) => e.type === 'slab').length,
    openings: bim.elements.filter((e) => e.type === 'opening').length,
    blocks: bim.elements.filter((e) => e.type === 'block').length,
  };

  return (
    <div style={pageStyle}>
      <header style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>DZENHARE OS · STEP 3</div>
          <h1 style={titleStyle}>3D BIM Viewer</h1>
          <p style={subtitleStyle}>Wall-first CAD document projected into a local, open-source BIM model with floor slabs, walls, openings, blocks, floor switching, and metadata inspection.</p>
        </div>
        <button onClick={regenerateBim} style={primaryButton}>Regenerate BIM</button>
      </header>

      <section style={statsRow}>
        <StatCard label="Floors" value={String(bim.floors.length)} accent="#8b5cf6" />
        <StatCard label="Walls" value={String(counts.walls)} accent="#1a365d" />
        <StatCard label="Openings" value={String(counts.openings)} accent="#06b6d4" />
        <StatCard label="Objects" value={String(counts.blocks)} accent="#d4a574" />
      </section>

      <section style={gridStyle}>
        <div style={{ display: 'grid', gap: 16 }}>
          <FloorVisibilityPanel floors={bim.floors} activeFloorId={activeFloorId} onChange={setActiveFloor} />
          <BimLegend />
          <BimInspector element={selected} />
        </div>
        <BimViewer elements={bim.elements} activeFloorId={activeFloorId} selectedElementId={selectedElementId} onSelect={setSelectedElement} />
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ ...cardStyle, borderTop: `3px solid ${accent}` }}>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
      <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { minHeight: '100vh', background: 'radial-gradient(circle at top, #12213b, #0b1220 55%)', color: '#e2e8f0', padding: 24, fontFamily: 'Inter, Arial, sans-serif' };
const heroStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 20 };
const eyebrowStyle: React.CSSProperties = { color: '#d4a574', fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 };
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 36, lineHeight: 1.05 };
const subtitleStyle: React.CSSProperties = { maxWidth: 760, color: '#94a3b8', lineHeight: 1.6, marginTop: 10 };
const primaryButton: React.CSSProperties = { background: 'linear-gradient(135deg,#d4a574,#f1d2a7)', color: '#111827', border: 'none', padding: '12px 16px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' };
const statsRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 16 };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' };
const cardStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16 };
