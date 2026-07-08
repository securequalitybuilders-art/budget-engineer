import type { BoqLineComparison } from '../../lib/boqCompare';

export function BoqLineComparisonPanel({ items }: { items: BoqLineComparison[] }) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>BOQ Line-Item Comparison</h3>
      {items.length === 0 ? <p style={mutedStyle}>Select two snapshots to compare BOQ line items.</p> : (
        <div style={{ overflow: 'auto', maxHeight: 300 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Before Qty</th>
                <th style={thStyle}>After Qty</th>
                <th style={thStyle}>Before Total</th>
                <th style={thStyle}>After Total</th>
                <th style={thStyle}>Delta</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.key}>
                  <td style={tdStyle}>{item.description}</td>
                  <td style={tdStyle}>{item.beforeQuantity.toFixed(2)}</td>
                  <td style={tdStyle}>{item.afterQuantity.toFixed(2)}</td>
                  <td style={tdStyle}>{item.beforeTotal.toFixed(2)} USD</td>
                  <td style={tdStyle}>{item.afterTotal.toFixed(2)} USD</td>
                  <td style={tdStyle}>{item.deltaTotal.toFixed(2)} USD</td>
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
