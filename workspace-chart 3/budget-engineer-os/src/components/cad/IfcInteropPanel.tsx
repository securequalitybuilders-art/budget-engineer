import { useRef, useState } from 'react';
import type { CadDocument } from '../../domain/cad';
import { buildIfcStep } from '../../lib/ifc/ifcExport';
import { downloadTextFile } from '../../lib/exporters';

type Props = {
  cad: CadDocument;
  onImport: (ifcText: string) => Promise<{ ok: boolean; message: string }>;
};

export function IfcInteropPanel({ cad, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus(null);
    try {
      const text = await file.text();
      const result = await onImport(text);
      setStatus(result);
    } catch {
      setStatus({ ok: false, message: 'Failed to read or parse the IFC file.' });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>IFC Interoperability</h3>
      <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5, marginTop: 0 }}>
        Open IFC4 (ISO-10303-21) round-trip — no library, no paid API. Export a standards-compliant
        <code style={code}> .ifc</code> with real swept-solid 3D geometry (walls, slabs, roofs,
        openings, objects) for Revit / ArchiCAD / BlenderBIM, or import one back. Files produced
        here re-import losslessly into the editable plan.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={primary} onClick={() => downloadTextFile(`${cad.name.replace(/\s+/g, '-').toLowerCase()}.ifc`, buildIfcStep(cad), 'application/x-step')}>Export IFC</button>
        <button style={secondary} onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Importing…' : 'Import IFC'}</button>
        <input ref={fileRef} type="file" accept=".ifc,.step,.stp,text/plain" style={{ display: 'none' }} onChange={(e) => void handleFile(e)} />
      </div>
      {status && (
        <div style={{ marginTop: 10, fontSize: 12, padding: '8px 10px', borderRadius: 10, color: status.ok ? '#bbf7d0' : '#fecaca', background: status.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${status.ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}` }}>
          {status.message}
        </div>
      )}
      <div style={{ color: '#64748b', fontSize: 11, marginTop: 10 }}>
        Importing replaces the active project's plan and regenerates the BIM model + BOQ.
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 8px', fontSize: 16 };
const code: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 6, padding: '1px 5px', color: '#7dd3fc' };
const primary: React.CSSProperties = { background: 'linear-gradient(135deg,#06b6d4,#22d3ee)', color: '#06283a', border: 'none', padding: '10px 14px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13 };
const secondary: React.CSSProperties = { background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', padding: '10px 14px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 };
