import { BOQ, CadDocument, ProjectRecord } from '@/domain/ws6-types';
import { currencySymbol } from '@/lib/utils/currency';
import { buildPlanSvg } from '@/lib/drawings/plan-svg';
import { buildSectionSvg, SectionConfig } from '@/lib/drawings/section-svg';
import { buildElevationSvg } from '@/lib/drawings/elevation-svg';
import { buildScheduleSvg } from '@/lib/drawings/disciplines/schedule-svg';
import { buildPresentationSvg } from '@/lib/drawings/disciplines/presentation-svg';
import { buildDrawingRegister, type DrawingRegisterSheet } from '@/lib/drawings/drawing-register';

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildBoqCsv(boq: BOQ): string {
  const lines: string[] = [];
  lines.push(['Category', 'Description', 'Quantity', 'Unit', `Rate (${boq.currency})`, `Total (${boq.currency})`].map(csvCell).join(','));
  for (const it of boq.items) {
    lines.push([it.category, it.description, it.quantity, it.unit, it.rate.toFixed(2), it.total.toFixed(2)].map(csvCell).join(','));
  }
  lines.push('');
  lines.push(['', '', '', '', 'Subtotal', boq.summary.subtotal.toFixed(2)].map(csvCell).join(','));
  lines.push(['', '', '', '', 'Contingency', boq.summary.contingency.toFixed(2)].map(csvCell).join(','));
  lines.push(['', '', '', '', 'Professional fees', boq.summary.fees.toFixed(2)].map(csvCell).join(','));
  lines.push(['', '', '', '', 'VAT', boq.summary.vat.toFixed(2)].map(csvCell).join(','));
  lines.push(['', '', '', '', 'Grand Total', boq.summary.grandTotal.toFixed(2)].map(csvCell).join(','));
  return lines.join('\n');
}

export function buildBoqDossierHtml(boq: BOQ, cad: CadDocument, project: ProjectRecord | null, revision = 'A', sectionConfig?: SectionConfig): string {
  const sym = currencySymbol(boq.currency);
  const money = (n: number) => sym + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const now = new Date().toLocaleString();
  const pct = (part: number) => boq.summary.subtotal > 0 ? Math.round((part / boq.summary.subtotal) * 100) : 0;
  const projName = project?.name ?? cad.id;
  const dateStr = new Date().toISOString().slice(0, 10);
  const register = buildDrawingRegister(cad as unknown as import('@/domain/cad').CadDocument, revision, dateStr);
  
  const registerRows = register.map((s) => `
    <tr>
      <td><b>${s.sheetNumber}</b></td>
      <td>${s.title}</td>
      <td>${s.disciplineLabel ?? s.discipline}</td>
      <td>${s.scale}</td>
      <td class="num">${s.revision}</td>
    </tr>`).join('');
    
  const revisionRows = register.flatMap((s: DrawingRegisterSheet) =>
    s.revisions.map((r) => `
    <tr>
      <td><b>${s.sheetNumber}</b></td>
      <td class="num">${r.rev}</td>
      <td>${r.date}</td>
      <td>${r.note}</td>
      <td>${r.by ?? ''}</td>
    </tr>`)).join('');
    
  const sheetSections = register.map((s) => {
    let svgContent = '';
    const floorId = s.floorIndex !== undefined && cad.floors[s.floorIndex] ? cad.floors[s.floorIndex].id : cad.floors[0]?.id;
    
    // Determine drawing type label for title block
    let dType = 'ARCHITECTURAL';
    if (s.discipline === 'S') dType = 'STRUCTURAL';
    if (s.discipline === 'E') dType = 'ELECTRICAL';
    if (s.discipline === 'M') dType = 'MECHANICAL';
    if (s.discipline === 'P') dType = 'PLUMBING';

    const meta = { 
      project: projName, 
      drawing: s.title, 
      sheet: s.sheetNumber, 
      date: dateStr, 
      revision,
      drawingType: dType,
      provenanceSummary: s.viewId?.startsWith('schedule') ? undefined : (s.discipline !== 'A' ? 'Pre-design assumptions' : undefined)
    };

    if (s.viewId === 'section') {
      svgContent = buildSectionSvg(cad, meta, sectionConfig);
    } else if (s.viewId === 'front' || s.viewId === 'side') {
      svgContent = buildElevationSvg(cad, s.viewId, meta);
    } else if (s.viewId === 'schedule-door') {
      svgContent = buildScheduleSvg(cad, 'door', meta);
    } else if (s.viewId === 'schedule-window') {
      svgContent = buildScheduleSvg(cad, 'window', meta);
    } else if (s.viewId === 'schedule-structural') {
      svgContent = buildScheduleSvg(cad, 'structural', meta);
    } else if (s.viewId === 'presentation') {
      svgContent = buildPresentationSvg(cad, meta);
    } else if (['plan', 'site-plan', 'foundation', 'roof', 'ceiling', 'electrical', 'plumbing', 'hvac'].includes(s.viewId || '')) {
      svgContent = buildPlanSvg(cad, floorId, meta, sectionConfig, s.viewId || 'plan');
    } else {
      svgContent = `<svg width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#0b1220"/><text x="400" y="300" fill="#94a3b8" text-anchor="middle">Drawing generation for ${s.viewId} coming soon</text></svg>`;
    }

    return `
    <div class="plan">
      <h2>${s.sheetNumber} · ${s.title}</h2>
      <div class="planbox">${svgContent}</div>
    </div>`;
  }).join('');

  const rows = boq.items.map((it) => `
    <tr>
      <td><span class="tag">${it.category}</span></td>
      <td>${it.description}</td>
      <td class="num">${it.quantity.toLocaleString()}</td>
      <td>${it.unit}</td>
      <td class="num">${money(it.rate)}</td>
      <td class="num">${money(it.total)}</td>
    </tr>`).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>BOQ — ${project?.name ?? cad.id}</title>
<style>
  @page { size: A4 portrait; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Inter, Arial, sans-serif; color: #0f172a; margin: 0; }
  .cover { background: linear-gradient(135deg, #1a365d, #d4a574); color: #fff; padding: 28px 24px; border-radius: 12px; }
  .cover h1 { font-family: 'Space Grotesk', Arial, sans-serif; margin: 0 0 6px; font-size: 26px; }
  .cover p { margin: 2px 0; opacity: .92; font-size: 13px; }
  .meta { display: flex; gap: 24px; margin: 18px 0; flex-wrap: wrap; }
  .meta div { font-size: 12px; color: #475569; }
  .meta b { display: block; color: #0f172a; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
  th, td { text-align: left; padding: 7px 9px; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .tag { font-size: 10px; padding: 2px 7px; border-radius: 999px; background: #e0f2fe; color: #0369a1; }
  .summary { margin-top: 14px; margin-left: auto; width: 320px; }
  .summary tr td { border: none; padding: 5px 9px; }
  .summary tr.total td { border-top: 2px solid #1a365d; font-weight: 700; font-size: 15px; color: #1a365d; }
  h2 { font-family: 'Space Grotesk', Arial, sans-serif; font-size: 16px; color: #1a365d; margin: 20px 0 8px; }
  .plan { margin-top: 14px; }
  .planbox { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #0b1220; padding: 8px; text-align: center; page-break-inside: avoid; }
  .planbox svg { max-width: 100%; height: auto; }
  table { page-break-before: auto; }
  .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  .printbar { position: sticky; top: 0; background: #0b1220; padding: 10px; text-align: center; }
  .printbar button { background: #06b6d4; color: #04202a; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
  @media print { .printbar { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
  <div class="printbar"><button onclick="window.print()">🖨 Print / Save as PDF</button></div>
  <div style="padding: 18mm;">
    <div class="cover">
      <h1>Bill of Quantities</h1>
      <p>${project?.name ?? cad.id}</p>
      <p>Budget Engineer Studio — DZENHARE OS · Construction Affordable for Everyone</p>
    </div>
    <div class="meta">
      <div><b>${cad.id}</b>Scheme</div>
      <div><b>${boq.currency}</b>Currency</div>
      <div><b>${boq.items.length}</b>Line items</div>
      <div><b>${now}</b>Generated</div>
    </div>
    <h2>Drawing Register</h2>
    <table>
      <thead><tr><th>Sheet</th><th>Title</th><th>Discipline</th><th>Scale</th><th class="num">Rev</th></tr></thead>
      <tbody>${registerRows}</tbody>
    </table>
    <h2>Revision History</h2>
    <table>
      <thead><tr><th>Sheet</th><th class="num">Rev</th><th>Date</th><th>Description</th><th>By</th></tr></thead>
      <tbody>${revisionRows}</tbody>
    </table>
    ${sheetSections}
    <h2>Bill of Quantities</h2>
    <table>
      <thead><tr>
        <th>Category</th><th>Description</th><th class="num">Qty</th><th>Unit</th>
        <th class="num">Rate</th><th class="num">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="summary">
      <tr><td>Subtotal</td><td class="num">${money(boq.summary.subtotal)}</td></tr>
      <tr><td>Contingency (${pct(boq.summary.contingency)}%)</td><td class="num">${money(boq.summary.contingency)}</td></tr>
      <tr><td>Professional fees (${pct(boq.summary.fees)}%)</td><td class="num">${money(boq.summary.fees)}</td></tr>
      <tr><td>VAT</td><td class="num">${money(boq.summary.vat)}</td></tr>
      <tr class="total"><td>Grand Total</td><td class="num">${money(boq.summary.grandTotal)}</td></tr>
    </table>
    <div class="footer">
      Generated by Budget Engineer Studio. Quantities are derived from the parametric BIM model;
      rates are early-stage estimates from the active regional rate card and are fully editable.
      This document is a budgeting aid, not a tendered contract sum.
    </div>
  </div>
</body></html>`;
}

export function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function openDossierForPrint(html: string) {
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
