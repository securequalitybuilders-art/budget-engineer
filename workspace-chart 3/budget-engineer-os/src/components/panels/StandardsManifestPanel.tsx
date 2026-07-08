import type { StandardsManifest } from '../../lib/standardsManifest';

export function StandardsManifestPanel({ manifest }: { manifest: StandardsManifest }) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Standards Mapping / Export Manifest</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        <Group title="Schema" items={[manifest.schema]} />
        <Group title="IFC Mapping" items={manifest.ifcMapping} />
        <Group title="COBie Mapping" items={manifest.cobieMapping} />
        <Group title="BOQ Mapping" items={manifest.boqMapping} />
      </div>
    </div>
  );
}

function Group({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={groupStyle}>
      <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((item) => <span key={item} style={chipStyle}>{item}</span>)}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const groupStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 10, padding: 10 };
const chipStyle: React.CSSProperties = { background: '#0f172a', border: '1px solid #24324b', borderRadius: 999, padding: '6px 8px', fontSize: 11, color: '#cbd5e1' };
