import type { ZoneCostSummary } from '../../lib/zoneCost';

export function RoomSchedulePanel({ items }: { items: ZoneCostSummary[] }) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Room Schedule</h3>
      <div style={{ overflow: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Room</th>
              <th style={thStyle}>Program</th>
              <th style={thStyle}>Area (m²)</th>
              <th style={thStyle}>Est. Cost</th>
              <th style={thStyle}>Cost / m²</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.zoneId}>
                <td style={tdStyle}>{item.name}</td>
                <td style={tdStyle}>{item.program}</td>
                <td style={tdStyle}>{item.area.toFixed(2)}</td>
                <td style={tdStyle}>{item.estimatedCost.toFixed(2)} USD</td>
                <td style={tdStyle}>{item.costPerM2.toFixed(2)} USD</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const thStyle: React.CSSProperties = { textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #24324b', padding: '8px 6px' };
const tdStyle: React.CSSProperties = { color: '#f8fafc', borderBottom: '1px solid #1e293b', padding: '8px 6px' };
