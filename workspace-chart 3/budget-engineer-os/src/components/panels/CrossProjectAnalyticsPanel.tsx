import type { PortfolioMetric } from '../../lib/portfolioMetrics';

export function CrossProjectAnalyticsPanel({ left, right }: { left: PortfolioMetric[]; right: PortfolioMetric[] }) {
  const leftAvg = avg(left.map((x) => x.grandTotal));
  const rightAvg = avg(right.map((x) => x.grandTotal));
  const leftZones = avg(left.map((x) => x.zoneCount));
  const rightZones = avg(right.map((x) => x.zoneCount));
  const leftWalls = avg(left.map((x) => x.wallCount));
  const rightWalls = avg(right.map((x) => x.wallCount));

  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Cross-Project Analytics</h3>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Metric</th>
            <th style={thStyle}>Left</th>
            <th style={thStyle}>Right</th>
          </tr>
        </thead>
        <tbody>
          <Row label="Avg Grand Total" left={`${leftAvg.toFixed(2)} USD`} right={`${rightAvg.toFixed(2)} USD`} />
          <Row label="Avg Zones" left={leftZones.toFixed(2)} right={rightZones.toFixed(2)} />
          <Row label="Avg Walls" left={leftWalls.toFixed(2)} right={rightWalls.toFixed(2)} />
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, left, right }: { label: string; left: string; right: string }) {
  return <tr><td style={tdStyle}>{label}</td><td style={tdStyle}>{left}</td><td style={tdStyle}>{right}</td></tr>;
}
function avg(values: number[]) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }
const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const thStyle: React.CSSProperties = { textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #24324b', padding: '8px 6px' };
const tdStyle: React.CSSProperties = { color: '#f8fafc', borderBottom: '1px solid #1e293b', padding: '8px 6px' };
