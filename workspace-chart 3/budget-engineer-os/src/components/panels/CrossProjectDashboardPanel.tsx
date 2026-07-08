import type { CrossProjectMetric } from '../../lib/crossProjectMetrics';

export function CrossProjectDashboardPanel({ metric }: { metric?: CrossProjectMetric }) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Cross-Project Comparison</h3>
      {!metric ? <p style={mutedStyle}>Select two projects to compare portfolio averages.</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          <Card label="Left Snapshots" value={String(metric.leftCount)} color="#06b6d4" />
          <Card label="Right Snapshots" value={String(metric.rightCount)} color="#8b5cf6" />
          <Card label="Left Avg Grand Total" value={`${metric.leftAverageGrandTotal.toFixed(2)} USD`} color="#1a365d" />
          <Card label="Right Avg Grand Total" value={`${metric.rightAverageGrandTotal.toFixed(2)} USD`} color="#d4a574" />
        </div>
      )}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return <div style={{ background: '#0b1220', border: `1px solid ${color}55`, borderRadius: 10, padding: 10 }}><div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div><div style={{ color: '#f8fafc', fontSize: 18, fontWeight: 700 }}>{value}</div></div>;
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8' };
