import type { BimElement } from '../../domain/bim';

export function RoomProgramPanel({
  element,
  onRename,
  onProgram,
}: {
  element?: BimElement;
  onRename: (name: string) => void;
  onProgram: (program: string) => void;
}) {
  if (!element || element.type !== 'roomZone') {
    return (
      <div style={panelStyle}>
        <h3 style={titleStyle}>Room Program</h3>
        <p style={mutedStyle}>Select a room zone to edit its name and assign a program.</p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Room Program</h3>
      <label style={labelStyle}>Room Name</label>
      <input defaultValue={element.name} onBlur={(e) => onRename(e.target.value)} style={inputStyle} />
      <label style={labelStyle}>Program</label>
      <select defaultValue={String(element.properties.program ?? 'Unassigned')} onChange={(e) => onProgram(e.target.value)} style={inputStyle}>
        <option>Unassigned</option>
        <option>Living Room</option>
        <option>Bedroom</option>
        <option>Kitchen</option>
        <option>Bathroom</option>
        <option>Office</option>
        <option>Circulation</option>
      </select>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8', lineHeight: 1.5 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, marginTop: 10 };
const inputStyle: React.CSSProperties = { width: '100%', background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', padding: '10px 12px', borderRadius: 10 };
