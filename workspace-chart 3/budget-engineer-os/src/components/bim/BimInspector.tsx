import type { BimElement } from '../../domain/bim';
import type { BOQLineItem } from '../../domain/boq';

export function BimInspector({ element, linkedItems = [] }: { element?: BimElement; linkedItems?: BOQLineItem[] }) {
  if (!element) {
    return <div style={panelStyle}><h3 style={titleStyle}>BIM Inspector</h3><p style={mutedStyle}>Select an element in the 3D model to inspect its metadata, floor, material, IFC class, and quantity links.</p></div>;
  }

  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>BIM Inspector</h3>
      <div style={gridStyle}>
        <Row k="Name" v={element.name} />
        <Row k="Type" v={element.type} />
        <Row k="IFC Class" v={element.ifcClass} />
        <Row k="Floor" v={element.floorId} />
        <Row k="Material" v={element.material} />
        <Row k="Source CAD ID" v={element.sourceCadId ?? '—'} />
        <Row k="Quantity Refs" v={element.quantityRefs?.join(', ') ?? '—'} />
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ ...labelStyle, marginBottom: 6 }}>Properties</div>
        <pre style={preStyle}>{JSON.stringify(element.properties, null, 2)}</pre>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ ...labelStyle, marginBottom: 6 }}>Linked BOQ Items</div>
        {linkedItems.length === 0 ? <div style={mutedStyle}>No linked cost items.</div> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {linkedItems.map((item) => (
              <div key={item.id} style={boqCardStyle}>
                <div style={{ fontSize: 13, color: '#f8fafc' }}>{item.description}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{item.category} · {item.quantity} {item.unit} × {item.rate} = {item.total} USD</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <><div style={labelStyle}>{k}</div><div style={valueStyle}>{v}</div></>;
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8', lineHeight: 1.5 };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 };
const labelStyle: React.CSSProperties = { color: '#94a3b8', fontSize: 12 };
const valueStyle: React.CSSProperties = { color: '#f8fafc', fontSize: 13, wordBreak: 'break-word' };
const preStyle: React.CSSProperties = { background: '#0b1220', borderRadius: 12, padding: 12, overflow: 'auto', fontSize: 12, color: '#cbd5e1' };
const boqCardStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 12, padding: 10 };
