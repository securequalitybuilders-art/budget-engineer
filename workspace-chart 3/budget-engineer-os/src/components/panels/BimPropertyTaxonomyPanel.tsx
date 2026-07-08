import type { BimElement } from '../../domain/bim';

export function BimPropertyTaxonomyPanel({ element }: { element?: BimElement }) {
  if (!element) {
    return (
      <div style={panelStyle}>
        <h3 style={titleStyle}>BIM Property Taxonomy</h3>
        <p style={mutedStyle}>Select a BIM element to inspect semantic classification, property groups, and quantity/cost relevance.</p>
      </div>
    );
  }

  const taxonomy = buildTaxonomy(element);

  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>BIM Property Taxonomy</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {taxonomy.map((group) => (
          <div key={group.title} style={groupStyle}>
            <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{group.title}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 6 }}>
              {group.rows.map((row) => (
                <>
                  <div key={`${group.title}-${row.k}-k`} style={labelStyle}>{row.k}</div>
                  <div key={`${group.title}-${row.k}-v`} style={valueStyle}>{row.v}</div>
                </>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildTaxonomy(element: BimElement) {
  return [
    {
      title: 'Classification',
      rows: [
        { k: 'IFC Class', v: element.ifcClass },
        { k: 'Element Type', v: element.type },
        { k: 'Floor', v: element.floorId },
      ],
    },
    {
      title: 'Commercial Relevance',
      rows: [
        { k: 'Material', v: element.material },
        { k: 'Quantity Refs', v: element.quantityRefs?.join(', ') ?? '—' },
        { k: 'Source CAD', v: element.sourceCadId ?? '—' },
      ],
    },
    {
      title: 'Property Set',
      rows: Object.entries(element.properties).map(([k, v]) => ({ k, v: String(v) })),
    },
  ];
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8', lineHeight: 1.5 };
const groupStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 12, padding: 10 };
const labelStyle: React.CSSProperties = { color: '#94a3b8', fontSize: 12 };
const valueStyle: React.CSSProperties = { color: '#f8fafc', fontSize: 12, wordBreak: 'break-word' };
