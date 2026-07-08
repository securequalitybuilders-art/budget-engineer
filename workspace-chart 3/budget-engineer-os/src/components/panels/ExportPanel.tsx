import type { BimModel } from '../../domain/bim';
import type { BOQ } from '../../domain/boq';
import { buildBoqCsv, buildIfcLikeJson, downloadTextFile } from '../../lib/exporters';

export function ExportPanel({ bim, boq, onExport }: { bim: BimModel; boq: BOQ; onExport: (kind: 'IFC_JSON' | 'BOQ_CSV') => void }) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Export Panel</h3>
      <p style={mutedStyle}>Download BIM data as IFC-like JSON or BOQ line items as CSV. These are open, inspectable exports aligned with your no-paid-API rule.</p>
      <div style={{ display: 'grid', gap: 10 }}>
        <button style={buttonPrimary} onClick={() => { downloadTextFile('budget-engineer-model.ifc.json', buildIfcLikeJson(bim), 'application/json'); onExport('IFC_JSON'); }}>Export IFC-like JSON</button>
        <button style={buttonSecondary} onClick={() => { downloadTextFile('budget-engineer-boq.csv', buildBoqCsv(boq), 'text/csv'); onExport('BOQ_CSV'); }}>Export BOQ CSV</button>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: '0 0 12px', color: '#94a3b8', lineHeight: 1.5 };
const buttonPrimary: React.CSSProperties = { background: 'linear-gradient(135deg,#d4a574,#f1d2a7)', color: '#111827', border: 'none', padding: '12px 14px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' };
const buttonSecondary: React.CSSProperties = { background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', padding: '12px 14px', borderRadius: 12, fontWeight: 600, cursor: 'pointer' };
