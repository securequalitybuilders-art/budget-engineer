export function BoqCategoryComparePanel({ left, right }: { left: Record<string, number>; right: Record<string, number> }) {
  const categories = Array.from(new Set([...Object.keys(left), ...Object.keys(right)]));
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Cross-Project BOQ Category Comparison</h3>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Left</th>
            <th style={thStyle}>Right</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c}>
              <td style={tdStyle}>{c}</td>
              <td style={tdStyle}>{(left[c] ?? 0).toFixed(2)} USD</td>
              <td style={tdStyle}>{(right[c] ?? 0).toFixed(2)} USD</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const thStyle: React.CSSProperties = { textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #24324b', padding: '8px 6px' };
const tdStyle: React.CSSProperties = { color: '#f8fafc', borderBottom: '1px solid #1e293b', padding: '8px 6px' };
