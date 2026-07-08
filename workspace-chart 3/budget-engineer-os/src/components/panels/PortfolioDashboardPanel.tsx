import type { PortfolioMetric } from '../../lib/portfolioMetrics';

export function PortfolioDashboardPanel({ items }: { items: PortfolioMetric[] }) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Portfolio Comparison Dashboard</h3>
      {items.length === 0 ? <p style={mutedStyle}>Create snapshots to compare schemes across cost and geometry.</p> : (
        <div style={{ overflow: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Snapshot</th>
                <th style={thStyle}>Grand Total</th>
                <th style={thStyle}>Subtotal</th>
                <th style={thStyle}>Zones</th>
                <th style={thStyle}>Walls</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.snapshotId}>
                  <td style={tdStyle}>{item.name}</td>
                  <td style={tdStyle}>{item.grandTotal.toFixed(2)} USD</td>
                  <td style={tdStyle}>{item.subtotal.toFixed(2)} USD</td>
                  <td style={tdStyle}>{item.zoneCount}</td>
                  <td style={tdStyle}>{item.wallCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const thStyle: React.CSSProperties = { textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #24324b', padding: '8px 6px' };
const tdStyle: React.CSSProperties = { color: '#f8fafc', borderBottom: '1px solid #1e293b', padding: '8px 6px' };
