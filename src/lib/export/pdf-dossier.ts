import type { CadDocument } from '../../domain/cad';
import type { GovernanceRecord } from '../../domain/governance';
import type { BOQ } from '../boq/boq-types';

function buildCadSvg(cad: CadDocument, floorId: string): string {
  const floor = cad.floors.find(f => f.id === floorId) || cad.floors[0];
  const walls = cad.walls.filter(w => w.floorId === floor.id);
  const blocks = cad.blocks.filter(b => b.floorId === floor.id);

  let paths = '';
  for (const w of walls) {
    const color = w.structuralRole === 'external' ? '#1a365d' : '#d4a574';
    paths += `<line x1="${w.start.x}" y1="${w.start.y}" x2="${w.end.x}" y2="${w.end.y}" stroke="${color}" stroke-width="${w.thickness * 5}" stroke-linecap="square"/>\n`;
  }
  for (const b of blocks) {
    paths += `<rect x="${b.position.x}" y="${b.position.y}" width="${b.width}" height="${b.height}" fill="#8B5CF6" opacity="0.7" rx="0.1"/>\n`;
    paths += `<text x="${b.position.x + b.width / 2}" y="${b.position.y + b.height / 2 + 0.1}" fill="#f8fafc" font-size="0.3" text-anchor="middle" font-family="monospace">${b.blockType}</text>\n`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 18 14" width="900" height="700" style="background:#0b1220;">
  <rect x="-2" y="-2" width="18" height="14" fill="#0b1220"/>
  <g transform="scale(1, -1) translate(0, -10)">
    ${paths}
  </g>
</svg>`;
}

export function generatePdfDossierHtml(
  cad: CadDocument,
  _bim: unknown,
  boq: BOQ,
  gov: GovernanceRecord,
  _snapshots: unknown[]
): string {
  const dt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let boqRows = '';
  for (const item of boq.items) {
    boqRows += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1a365d;">${item.category}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.unit}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">$${item.rate.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: bold; color: #0f172a;">$${item.total.toFixed(2)}</td>
      </tr>
    `;
  }

  let commRows = '';
  for (const c of gov.comments) {
    commRows += `
      <div style="background: #f8fafc; border-left: 4px solid #06B6D4; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 4px;">
          <strong style="color: #1a365d;">${c.author} (${c.role || 'Stakeholder'})</strong>
          <span>${new Date(c.timestamp).toLocaleTimeString()}</span>
        </div>
        <p style="margin: 0; font-size: 13px; color: #1e293b;">${c.message}</p>
      </div>
    `;
  }

  let planSections = '';
  for (const f of cad.floors) {
    const svg = buildCadSvg(cad, f.id);
    planSections += `
      <div style="page-break-before: always; padding-top: 20px;">
        <div style="border-bottom: 2px solid #1a365d; padding-bottom: 8px; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 20px; color: #1a365d;">Architectural CAD Floor Plan — ${f.name}</h2>
          <span style="font-size: 12px; color: #64748b;">Elevation: ${f.elevation.toFixed(2)}m</span>
        </div>
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; padding: 10px; background: #0b1220; text-align: center;">
          ${svg}
        </div>
      </div>
    `;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${cad.id} — Executive Dossier Package</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Space+Grotesk:wght@700&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      line-height: 1.5;
    }
    @page {
      size: A4 portrait;
      margin: 20mm;
    }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .header-banner {
      background: linear-gradient(135deg, #1a365d, #0f172a);
      color: #ffffff; padding: 40px; border-radius: 16px; margin-bottom: 40px;
    }
    .badge {
      display: inline-block; padding: 4px 12px; border-radius: 9999px;
      font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .badge-approved { background: #22c55e; color: #022c22; }
    .badge-review { background: #06B6D4; color: #083344; }
    .badge-draft { background: #f59e0b; color: #451a03; }
    .badge-rejected { background: #ef4444; color: #ffffff; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .card label { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; display: block; margin-bottom: 4px; }
    .card span { font-size: 18px; font-weight: 800; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f1f5f9; padding: 12px 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
    .summary-box { background: #0f172a; color: #ffffff; padding: 30px; border-radius: 12px; margin-top: 30px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #334155; font-size: 14px; }
    .summary-row-total { display: flex; justify-content: space-between; padding-top: 16px; font-size: 22px; font-weight: 800; color: #22c55e; }
    @media print {
      .no-print { display: none !important; }
      body { background: white; }
      .page { padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #1a365d; color: white; padding: 12px 24px; text-align: center; position: sticky; top: 0; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
    <span style="margin-right: 16px; font-size: 14px;">Executive PDF Dossier Ready</span>
    <button onclick="window.print()" style="background: #06B6D4; color: #0f172a; border: none; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨 Print / Save as PDF Dialog</button>
  </div>

  <div class="page">
    <div class="header-banner">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <span style="font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">Budget Engineer Studio</span>
        <span class="badge ${gov.approvalState === 'approved' ? 'badge-approved' : gov.approvalState === 'in_review' ? 'badge-review' : gov.approvalState === 'rejected' ? 'badge-rejected' : 'badge-draft'}">${gov.approvalState}</span>
      </div>
      <h1 style="font-size: 36px; margin: 0 0 10px 0; font-weight: 900;">${cad.id}</h1>
      <p style="margin: 0; font-size: 14px; color: #94a3b8; font-family: monospace;">DZENHARE OS — Making Construction Affordable for Everyone</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 40px; font-size: 13px; color: #cbd5e1;">
        <div><span>Version: </span><strong style="color: #7dd3fc;">${gov.versionLabel}</strong></div>
        <div><span>Date: </span><strong style="color: white;">${dt}</strong></div>
        <div><span>Project ID: </span><strong style="color: #d4a574;">${cad.projectId}</strong></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <label>Executive Owner</label>
        <span>${gov.owner}</span>
      </div>
      <div class="card">
        <label>Reviewers & Compliance</label>
        <span>${gov.reviewers.join(', ')}</span>
      </div>
    </div>

    <h2 style="font-size: 22px; color: #1a365d; margin-bottom: 16px; border-bottom: 2px solid #1a365d; padding-bottom: 8px;">Engineering BOQ Cost Breakdown Schedule</h2>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Description</th>
          <th style="text-align: right;">Quantity</th>
          <th style="text-align: center;">Unit</th>
          <th style="text-align: right;">Unit Rate</th>
          <th style="text-align: right;">Total Valuation</th>
        </tr>
      </thead>
      <tbody>
        ${boqRows}
      </tbody>
    </table>

    <div class="summary-box">
      <h3 style="margin: 0 0 20px 0; color: #ffffff; font-size: 18px; border-bottom: 1px solid #334155; padding-bottom: 10px;">Enterprise Financial Takeoff Summary</h3>
      <div class="summary-row"><span>Takeoff Subtotal Valuation:</span><span style="font-family: monospace;">$${boq.summary.subtotal.toFixed(2)}</span></div>
      <div class="summary-row"><span>Contingency Markup Allowance (5%):</span><span style="font-family: monospace;">$${boq.summary.contingency.toFixed(2)}</span></div>
      <div class="summary-row"><span>Professional Engineering Fees (7%):</span><span style="font-family: monospace;">$${boq.summary.professionalFees.toFixed(2)}</span></div>
      <div class="summary-row"><span>Value Added Tax VAT (15%):</span><span style="font-family: monospace;">$${boq.summary.vat.toFixed(2)}</span></div>
      <div class="summary-row-total"><span>Grand Total Enterprise Valuation:</span><span style="font-family: monospace;">$${boq.summary.grandTotal.toFixed(2)}</span></div>
    </div>

    <div style="page-break-before: always; padding-top: 20px;">
      <h2 style="font-size: 22px; color: #1a365d; margin-bottom: 16px; border-bottom: 2px solid #1a365d; padding-bottom: 8px;">Governance Signoff Audit Dossier</h2>
      ${gov.comments.length === 0 ? '<p style="color: #64748b; font-style: italic;">No signoff audit notes recorded.</p>' : commRows}
    </div>

    ${planSections}
  </div>
</body>
</html>`;
}
